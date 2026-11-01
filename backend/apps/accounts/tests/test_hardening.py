from django.core.cache import cache
from rest_framework.test import APIClient, APITestCase

from apps.accounts.models import User
from apps.schools.models import School


class TeacherSchoolTests(APITestCase):
    """Un enseignant n'est jamais rattaché automatiquement à une école au hasard."""

    def setUp(self):
        cache.clear()

    def _login(self, email):
        client = APIClient()
        return client, client.post("/api/auth/login", {"email": email, "password": "motdepasse123"}, format="json")

    def test_teacher_without_school_is_refused_and_not_attached(self):
        School.objects.create(name="École", slug="ecole")
        teacher = User.objects.create_user(email="p@example.com", password="motdepasse123", role=User.ROLE_TEACHER)

        _, response = self._login("p@example.com")

        self.assertEqual(response.status_code, 403)
        teacher.refresh_from_db()
        self.assertIsNone(teacher.school_id)

    def test_teacher_with_school_logs_in_and_keeps_it(self):
        school = School.objects.create(name="École", slug="ecole")
        User.objects.create_user(email="p@example.com", password="motdepasse123", role=User.ROLE_TEACHER, school=school)

        client, response = self._login("p@example.com")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(client.get("/api/profile").data["profile"]["email"], "p@example.com")
        self.assertEqual(User.objects.get(email="p@example.com").school_id, school.id)


class LockoutCannotBeUsedToLockOwnerOutTests(APITestCase):
    def setUp(self):
        cache.clear()
        User.objects.create_user(email="victime@example.com", password="motdepasse123", role=User.ROLE_PARENT)

    def _login(self, password, ip):
        return APIClient().post("/api/auth/login", {"email": "victime@example.com", "password": password},
                                format="json", HTTP_X_FORWARDED_FOR=ip)

    def test_failures_from_another_ip_do_not_lock_the_real_owner(self):
        for _ in range(8):
            self._login("mauvais", "203.0.113.9")
        self.assertEqual(self._login("mauvais", "203.0.113.9").status_code, 429)

        self.assertEqual(self._login("motdepasse123", "198.51.100.4").status_code, 200)

    def test_distributed_attack_on_one_account_is_still_stopped(self):
        for i in range(30):
            self._login("mauvais", f"203.0.113.{i + 10}")

        self.assertEqual(self._login("motdepasse123", "198.51.100.4").status_code, 429)


class RegistrationEmailHonestyTests(APITestCase):
    def test_register_reports_when_the_email_could_not_be_sent(self):
        from unittest import mock

        cache.clear()
        with mock.patch("django.core.mail.EmailMultiAlternatives.send", side_effect=OSError("smtp down")):
            response = APIClient().post("/api/auth/register", {
                "email": "nouveau@example.com", "password": "motdepasse123", "firstName": "Nouveau", "lastName": "Parent",
                "phone": "77 123 45 67", "role": "parent", "acceptTerms": True,
            }, format="json")

        self.assertEqual(response.status_code, 201, response.data)
        self.assertIs(response.data["emailSent"], False)
        self.assertIn("n'a pas pu être envoyé", response.data["message"])


class ProgressQueryBudgetTests(APITestCase):
    """GET /api/progress était à 66 requêtes SQL (une par badge/palier) : le budget évite la régression."""

    def test_get_progress_stays_cheap_with_lots_of_progress(self):
        from django.db import connection
        from django.test.utils import CaptureQueriesContext

        from apps.progress.models import Progress

        cache.clear()
        user = User.objects.create_user(email="e@example.com", password="motdepasse123", role=User.ROLE_PARENT)
        for i in range(15):
            Progress.objects.create(user=user, lesson_id=f"p1-{i}", xp=50, age_track="7-9")
        client = APIClient()
        assert client.post("/api/auth/login", {"email": "e@example.com", "password": "motdepasse123"}, format="json").status_code == 200

        client.get("/api/progress")  # 1re lecture : crée les récompenses
        with CaptureQueriesContext(connection) as queries:
            response = client.get("/api/progress")

        self.assertEqual(response.status_code, 200)
        self.assertLessEqual(len(queries), 15, [q["sql"][:80] for q in queries])


class ProgressStaysInAssignedTrackTests(APITestCase):
    """Le verrouillage des autres parcours est imposé par le serveur, pas seulement affiché."""

    def _student(self, track):
        from apps.learners.models import LearnerProfile

        cache.clear()
        student = User.objects.create_user(email=f"eleve{track}@example.com", password="motdepasse123", role=User.ROLE_STUDENT)
        LearnerProfile.objects.create(learner=student, owner_email="p@example.com", age_track=track)
        client = APIClient()
        assert client.post("/api/auth/login", {"email": student.email, "password": "motdepasse123"}, format="json").status_code == 200
        return student, client

    def test_student_cannot_earn_xp_on_another_track(self):
        from apps.progress.tests.helpers import make_lesson

        make_lesson("p1-1", xp=20)  # leçon du parcours 7-9
        student, client = self._student("10-12")

        response = client.post("/api/progress", {"lessonId": "p1-1", "age": "10-12"}, format="json")

        self.assertEqual(response.status_code, 403)
        from apps.progress.models import Progress

        self.assertFalse(Progress.objects.filter(user=student).exists())

    def test_student_earns_xp_on_own_track(self):
        from apps.progress.tests.helpers import make_lesson

        make_lesson("p1-1", xp=20)
        _, client = self._student("7-9")

        response = client.post("/api/progress", {"lessonId": "p1-1", "age": "7-9"}, format="json")

        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(response.data["xp_gained"], 20)


class ServerEnforcesScreenTimeTests(APITestCase):
    """La limite de temps n'est pas qu'un écran d'attente : l'API refuse aussi l'XP et Palou."""

    def setUp(self):
        from apps.learners.models import LearnerProfile
        from apps.progress.models import DailyUsage, ParentalLimits
        from apps.progress.tests.helpers import make_lesson
        from django.utils import timezone

        cache.clear()
        make_lesson("p1-1", xp=20)
        self.parent = User.objects.create_user(email="parent@example.com", password="motdepasse123", role=User.ROLE_PARENT)
        self.child = User.objects.create_user(email="enfant@example.com", password="motdepasse123",
                                              role=User.ROLE_STUDENT, parent=self.parent)
        LearnerProfile.objects.create(learner=self.child, owner_email=self.parent.email, age_track="7-9")
        ParentalLimits.objects.create(parent=self.parent, child=None, strict_time_limit=True, daily_limit_minutes=30)
        DailyUsage.objects.create(user=self.child, usage_date=timezone.localdate(), age_track="7-9", minutes=30)
        self.client = APIClient()
        assert self.client.post("/api/auth/login", {"email": self.child.email, "password": "motdepasse123"}, format="json").status_code == 200

    def test_progress_is_refused_once_the_daily_limit_is_reached(self):
        response = self.client.post("/api/progress", {"lessonId": "p1-1", "age": "7-9"}, format="json")

        self.assertEqual(response.status_code, 423)
        self.assertEqual(response.data["lockReason"], "limit_exceeded")

    def test_palou_and_daily_challenge_are_refused_too(self):
        self.assertEqual(self.client.post("/api/palou/chat", {"message": "Salut"}, format="json").status_code, 423)
        self.assertEqual(self.client.post("/api/daily-challenge", {"answer": 0}, format="json").status_code, 423)

    def test_a_parent_credit_lifts_the_block(self):
        from apps.progress.parental import grant_credit

        grant_credit(self.child, self.parent, 15)

        response = self.client.post("/api/progress", {"lessonId": "p1-1", "age": "7-9"}, format="json")

        self.assertEqual(response.status_code, 201, response.data)


class TwoFactorLoginTests(APITestCase):
    """Le réglage « double authentification » du parent est réellement appliqué à la connexion."""

    def setUp(self):
        from apps.progress.models import ParentalLimits

        cache.clear()
        self.parent = User.objects.create_user(email="parent2fa@example.com", password="motdepasse123", role=User.ROLE_PARENT)
        ParentalLimits.objects.create(parent=self.parent, child=None, two_factor=True)

    def _password_step(self, client):
        return client.post("/api/auth/login", {"email": self.parent.email, "password": "motdepasse123"}, format="json")

    def test_password_alone_opens_no_session(self):
        from django.core import mail

        client = APIClient()
        response = self._password_step(client)

        self.assertEqual(response.status_code, 202)
        self.assertTrue(response.data["twoFactorRequired"])
        self.assertEqual(client.get("/api/profile").status_code, 401)
        self.assertEqual(len(mail.outbox), 1)

    def test_the_emailed_code_opens_the_session_once(self):
        from django.core import mail
        import re

        client = APIClient()
        self._password_step(client)
        code = re.search(r"\b(\d{6})\b", mail.outbox[-1].body).group(1)

        wrong = client.post("/api/auth/login-2fa", {"email": self.parent.email, "code": "000000"}, format="json")
        good = client.post("/api/auth/login-2fa", {"email": self.parent.email, "code": code}, format="json")
        reuse = APIClient().post("/api/auth/login-2fa", {"email": self.parent.email, "code": code}, format="json")

        self.assertEqual(wrong.status_code, 400)
        self.assertEqual(good.status_code, 200)
        self.assertEqual(client.get("/api/profile").status_code, 200)
        self.assertEqual(reuse.status_code, 400)

    def test_without_the_setting_login_is_direct(self):
        from apps.progress.models import ParentalLimits

        ParentalLimits.objects.filter(parent=self.parent).update(two_factor=False)

        self.assertEqual(self._password_step(APIClient()).status_code, 200)


class ParentEmailSettingsAreRealTests(APITestCase):
    """« Alertes par e-mail » et « Bilan hebdomadaire » ne sont plus des cases décoratives."""

    def setUp(self):
        from apps.progress.models import ParentalLimits, Progress

        cache.clear()
        self.parent = User.objects.create_user(email="p@example.com", password="motdepasse123", role=User.ROLE_PARENT)
        self.child = User.objects.create_user(email="e@example.com", password="motdepasse123",
                                              role=User.ROLE_STUDENT, parent=self.parent, display_name="Awa")
        self.ParentalLimits = ParentalLimits
        Progress.objects.create(user=self.child, lesson_id="p1-1", xp=40, age_track="7-9")

    def test_important_event_is_emailed_when_enabled(self):
        from django.core import mail
        from apps.progress.views import create_notifications_for_event

        create_notifications_for_event(self.child, "level_up", {"title": "Nouveau palier", "message": "Awa a progressé."})

        self.assertEqual(len(mail.outbox), 1)
        self.assertIn("Nouveau palier", mail.outbox[0].subject)

    def test_no_email_when_disabled_or_for_minor_events(self):
        from django.core import mail
        from apps.progress.views import create_notifications_for_event

        create_notifications_for_event(self.child, "lesson_done", {"title": "Leçon", "message": "m"})
        self.ParentalLimits.objects.create(parent=self.parent, child=None, email_notifications=False)
        create_notifications_for_event(self.child, "level_up", {"title": "Palier", "message": "m"})

        self.assertEqual(len(mail.outbox), 0)

    def test_weekly_report_goes_only_to_parents_who_want_it(self):
        from django.core import mail
        from apps.progress.mailing import send_weekly_reports

        self.assertEqual(send_weekly_reports(), 1)
        self.assertIn("+40 XP", mail.outbox[0].body)

        self.ParentalLimits.objects.create(parent=self.parent, child=None, weekly_report=False)
        self.assertEqual(send_weekly_reports(), 1 - 1)


class RegistrationConsentTests(APITestCase):
    def _register(self, **extra):
        cache.clear()
        return APIClient().post("/api/auth/register", {
            "email": "consent@example.com", "password": "motdepasse123", "firstName": "Awa", "lastName": "Ndiaye",
            "phone": "77 123 45 67", **extra,
        }, format="json")

    def test_registration_without_consent_is_refused(self):
        self.assertEqual(self._register().status_code, 400)
        self.assertEqual(self._register(acceptTerms=False).status_code, 400)
        self.assertFalse(User.objects.filter(email="consent@example.com").exists())

    def test_consent_is_recorded_with_its_date(self):
        self.assertEqual(self._register(acceptTerms=True).status_code, 201)
        self.assertIsNotNone(User.objects.get(email="consent@example.com").terms_accepted_at)


class AccountRightsTests(APITestCase):
    """Export et suppression de compte (droits d'accès et d'effacement)."""

    def setUp(self):
        from apps.progress.models import Progress

        cache.clear()
        self.parent = User.objects.create_user(email="foyer@example.com", password="motdepasse123", role=User.ROLE_PARENT)
        self.child = User.objects.create_user(email="petit@example.com", password="motdepasse123",
                                              role=User.ROLE_STUDENT, parent=self.parent, display_name="Petit")
        Progress.objects.create(user=self.child, lesson_id="p1-1", xp=20, age_track="7-9")
        self.client = APIClient()
        assert self.client.post("/api/auth/login", {"email": self.parent.email, "password": "motdepasse123"}, format="json").status_code == 200

    def test_parent_exports_own_and_children_data(self):
        response = self.client.get("/api/account/export")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["account"]["email"], "foyer@example.com")
        self.assertEqual(response.data["children"][0]["progress"][0]["lessonId"], "p1-1")
        self.assertIn("attachment", response["Content-Disposition"])

    def test_export_requires_login(self):
        self.assertEqual(APIClient().get("/api/account/export").status_code, 401)

    def test_delete_needs_the_right_password(self):
        response = self.client.post("/api/account/delete", {"password": "faux"}, format="json")

        self.assertEqual(response.status_code, 403)
        self.assertTrue(User.objects.filter(email="foyer@example.com").exists())

    def test_delete_removes_the_parent_and_all_children(self):
        from apps.progress.models import Progress

        response = self.client.post("/api/account/delete", {"password": "motdepasse123"}, format="json")

        self.assertEqual(response.status_code, 200)
        self.assertFalse(User.objects.filter(email__in=["foyer@example.com", "petit@example.com"]).exists())
        self.assertFalse(Progress.objects.exists())
        self.assertEqual(self.client.get("/api/profile").status_code, 401)

    def test_parent_can_delete_one_child_only(self):
        other = User.objects.create_user(email="autre@example.com", password="motdepasse123", role=User.ROLE_STUDENT, parent=self.parent)

        response = self.client.post(f"/api/parent/children/{self.child.id}/delete", {"password": "motdepasse123"}, format="json")

        self.assertEqual(response.status_code, 200)
        self.child.refresh_from_db()
        self.assertFalse(self.child.is_active)
        self.assertIsNotNone(self.child.deleted_at)
        self.assertTrue(User.objects.filter(id=other.id).exists())

        # Purge définitive après expiration du délai de 3 jours
        from datetime import timedelta
        from django.utils import timezone
        from apps.accounts.retention import purge_expired_child_deletions
        self.child.deleted_at = timezone.now() - timedelta(days=4)
        self.child.save(update_fields=['deleted_at'])
        purge_expired_child_deletions()
        self.assertFalse(User.objects.filter(id=self.child.id).exists())

    def test_a_parent_cannot_delete_someone_elses_child(self):
        stranger = User.objects.create_user(email="etranger@example.com", password="motdepasse123", role=User.ROLE_PARENT)
        foreign_child = User.objects.create_user(email="e2@example.com", password="motdepasse123", role=User.ROLE_STUDENT, parent=stranger)

        response = self.client.post(f"/api/parent/children/{foreign_child.id}/delete", {"password": "motdepasse123"}, format="json")

        self.assertEqual(response.status_code, 404)
        self.assertTrue(User.objects.filter(id=foreign_child.id).exists())

    def test_a_child_cannot_delete_the_family(self):
        child_client = APIClient()
        assert child_client.post("/api/auth/login", {"email": self.child.email, "password": "motdepasse123"}, format="json").status_code == 200

        self.assertEqual(child_client.post("/api/account/delete", {"password": "motdepasse123"}, format="json").status_code, 403)


class PushAlertsTests(APITestCase):
    """Alertes push : abonnement réel, envoi réel (mocké au niveau réseau), jamais de faux « activé »."""

    def setUp(self):
        cache.clear()
        self.parent = User.objects.create_user(email="pp@example.com", password="motdepasse123", role=User.ROLE_PARENT)
        self.child = User.objects.create_user(email="pc@example.com", password="motdepasse123", role=User.ROLE_STUDENT,
                                             parent=self.parent, display_name="Awa")
        self.client = APIClient()
        assert self.client.post("/api/auth/login", {"email": self.parent.email, "password": "motdepasse123"}, format="json").status_code == 200
        self.sub = {"endpoint": "https://fcm.googleapis.com/fcm/send/abc", "keys": {"p256dh": "p", "auth": "a"}}

    def test_unavailable_without_vapid_keys(self):
        from django.test import override_settings

        # Le .env local peut contenir de vraies clés : le test impose leur absence.
        with override_settings(VAPID_PUBLIC_KEY="", VAPID_PRIVATE_KEY=""):
            self.assertFalse(self.client.get("/api/push/public-key").data["available"])
            self.assertEqual(self.client.post("/api/push/subscribe", self.sub, format="json").status_code, 503)

    def test_subscribe_and_receive_an_alert(self):
        from unittest import mock
        from django.test import override_settings
        from apps.progress.models import PushSubscription
        from apps.progress.views import create_notifications_for_event

        with override_settings(VAPID_PUBLIC_KEY="pub", VAPID_PRIVATE_KEY="priv"):
            self.assertEqual(self.client.post("/api/push/subscribe", self.sub, format="json").status_code, 200)
            with mock.patch("pywebpush.webpush") as sender:
                create_notifications_for_event(self.child, "level_up", {"title": "Palier", "message": "Bravo"})
                create_notifications_for_event(self.child, "lesson_done", {"title": "x", "message": "y"})

        self.assertEqual(PushSubscription.objects.filter(user=self.parent).count(), 1)
        self.assertEqual(sender.call_count, 1)  # seul l'événement important est poussé
        self.assertEqual(sender.call_args.kwargs["subscription_info"]["endpoint"], self.sub["endpoint"])

    def test_no_push_when_the_setting_is_off(self):
        from unittest import mock
        from django.test import override_settings
        from apps.progress.models import ParentalLimits
        from apps.progress.views import create_notifications_for_event

        ParentalLimits.objects.create(parent=self.parent, child=None, push_notifications=False)
        with override_settings(VAPID_PUBLIC_KEY="pub", VAPID_PRIVATE_KEY="priv"):
            self.client.post("/api/push/subscribe", self.sub, format="json")
            with mock.patch("pywebpush.webpush") as sender:
                create_notifications_for_event(self.child, "level_up", {"title": "Palier", "message": "Bravo"})

        sender.assert_not_called()

    def test_children_cannot_subscribe(self):
        from django.test import override_settings

        kid = APIClient()
        kid.post("/api/auth/login", {"email": self.child.email, "password": "motdepasse123"}, format="json")
        with override_settings(VAPID_PUBLIC_KEY="pub", VAPID_PRIVATE_KEY="priv"):
            self.assertEqual(kid.post("/api/push/subscribe", self.sub, format="json").status_code, 403)

    def test_generated_keys_have_the_expected_shape(self):
        from apps.progress.push import generate_vapid_keys

        public, private = generate_vapid_keys()

        self.assertEqual(len(public), 87)  # 65 octets en base64url sans remplissage
        self.assertTrue(private)
