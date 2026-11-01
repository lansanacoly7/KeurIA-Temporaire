import importlib
from datetime import timedelta

from django.core.cache import cache
from django.db import IntegrityError, transaction
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient, APITestCase

from apps.accounts.models import User
from apps.schools.models import School
from apps.progress.models import DailyUsage, ParentalLimits, ParentNotification, ScreenTimeCredit

LIMITS = "/api/progress/parental-limits"
UNLOCK = "/api/progress/parental-limits/unlock"
PARENT_PASSWORD = "parent_password_123"


def session_client(email, password):
    """Client avec un vrai cookie de session (comme un navigateur) : jamais force_authenticate,
    qui contourne l'authentification et a déjà masqué un défaut grave de cette API."""
    client = APIClient()
    assert client.post("/api/auth/login", {"email": email, "password": password}, format="json").status_code == 200
    return client


class ParentalTestCase(APITestCase):
    def setUp(self):
        cache.clear()  # les compteurs de verrouillage vivent dans le cache
        self.parent = User.objects.create_user(email="parent@example.com", password=PARENT_PASSWORD, role="parent", display_name="Maman")
        self.child = User.objects.create_user(email="enfant@example.com", password="child_password_123", role="eleve",
                                              display_name="Awa Diop", parent=self.parent)
        self.parent_client = session_client("parent@example.com", PARENT_PASSWORD)
        self.child_client = session_client("enfant@example.com", "child_password_123")

    def limit_reached(self, minutes_used=45):
        DailyUsage.objects.create(user=self.child, owner_email=self.child.email, usage_date=timezone.localdate(),
                                  age_track="7-9", minutes=minutes_used)
        ParentalLimits.objects.create(parent=self.parent, child=self.child, strict_time_limit=True, daily_limit_minutes=45)


class LimitsTests(ParentalTestCase):
    def test_default_limits_are_disabled(self):
        res = self.child_client.get(LIMITS)

        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertFalse(res.data["limits"]["strictTimeLimit"])
        self.assertFalse(res.data["isLocked"])

    def test_parent_saves_limits_and_child_sees_them(self):
        res = self.parent_client.post(LIMITS, {
            "strictTimeLimit": True, "dailyLimitMinutes": 30, "bedtimeEnabled": True,
            "bedtimeStart": "21:00", "bedtimeEnd": "08:00", "childId": self.child.id,
        }, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        seen = self.child_client.get(LIMITS).data
        self.assertEqual(seen["limits"]["dailyLimitMinutes"], 30)
        self.assertEqual(seen["usageToday"], {"minutes": 0, "remainingMinutes": 30})

    def test_invalid_values_are_rejected_with_a_400_never_a_500(self):
        for body in ({"dailyLimitMinutes": "abc"}, {"dailyLimitMinutes": -50}, {"dailyLimitMinutes": 1441},
                     {"bedtimeStart": "25:99"}, {"bedtimeEnd": "7h"}, {"childId": "abc"}):
            res = self.parent_client.post(LIMITS, body, format="json")
            self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST, body)
        self.assertFalse(ParentalLimits.objects.exists())

    def test_boundary_values_are_accepted(self):
        for minutes in (0, 1440):
            res = self.parent_client.post(LIMITS, {"dailyLimitMinutes": minutes}, format="json")
            self.assertEqual(res.status_code, status.HTTP_200_OK, minutes)

    def test_a_parent_cannot_set_limits_for_someone_elses_child(self):
        stranger = User.objects.create_user(email="autre@example.com", password="autre_password_123", role="parent")
        other_child = User.objects.create_user(email="e2@example.com", password="x_password_123", role="eleve", parent=stranger)

        res = self.parent_client.post(LIMITS, {"childId": other_child.id}, format="json")

        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)

    def test_a_child_cannot_change_limits(self):
        res = self.child_client.post(LIMITS, {"dailyLimitMinutes": 999}, format="json")

        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_only_one_household_wide_rule_per_parent(self):
        ParentalLimits.objects.create(parent=self.parent, child=None)

        with self.assertRaises(IntegrityError), transaction.atomic():
            ParentalLimits.objects.create(parent=self.parent, child=None)


class UnlockWithPasswordTests(ParentalTestCase):
    def test_correct_password_grants_a_credit_and_never_touches_the_played_time(self):
        self.limit_reached(45)
        self.assertTrue(self.child_client.get(LIMITS).data["isLocked"])

        res = self.child_client.post(UNLOCK, {"parentPassword": PARENT_PASSWORD}, format="json")

        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(DailyUsage.objects.get(user=self.child).minutes, 45)  # jamais falsifié
        self.assertFalse(self.child_client.get(LIMITS).data["isLocked"])
        self.assertEqual(ScreenTimeCredit.objects.get().minutes, 15)

    def test_the_credit_expires(self):
        self.limit_reached(45)
        self.child_client.post(UNLOCK, {"parentPassword": PARENT_PASSWORD}, format="json")
        ScreenTimeCredit.objects.update(expires_at=timezone.now() - timedelta(seconds=1))

        self.assertTrue(self.child_client.get(LIMITS).data["isLocked"])

    def test_wrong_password_is_refused_and_grants_nothing(self):
        res = self.child_client.post(UNLOCK, {"parentPassword": "wrong"}, format="json")

        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertFalse(ScreenTimeCredit.objects.exists())

    def test_anonymous_visitors_cannot_try_passwords(self):
        anonymous = APIClient()

        res = anonymous.post(UNLOCK, {"parentPassword": PARENT_PASSWORD, "childId": self.child.id}, format="json")

        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertFalse(ScreenTimeCredit.objects.exists())

    def test_password_guessing_is_locked_out_even_for_the_right_password(self):
        for _ in range(5):
            self.child_client.post(UNLOCK, {"parentPassword": "mauvais"}, format="json")

        res = self.child_client.post(UNLOCK, {"parentPassword": PARENT_PASSWORD}, format="json")

        self.assertEqual(res.status_code, status.HTTP_429_TOO_MANY_REQUESTS)
        self.assertFalse(ScreenTimeCredit.objects.exists())

    def test_a_child_id_sent_by_the_browser_is_ignored(self):
        sibling = User.objects.create_user(email="frere@example.com", password="x_password_123", role="eleve", parent=self.parent)

        self.child_client.post(UNLOCK, {"parentPassword": PARENT_PASSWORD, "childId": sibling.id}, format="json")

        self.assertEqual(ScreenTimeCredit.objects.get().child_id, self.child.id)

    def test_password_is_required(self):
        self.assertEqual(self.child_client.post(UNLOCK, {}, format="json").status_code, status.HTTP_400_BAD_REQUEST)


class ParentDecisionTests(ParentalTestCase):
    def request_time(self):
        self.child_client.post(UNLOCK, {"action": "request_time"}, format="json")
        return ParentNotification.objects.get(parent=self.parent)

    def test_child_request_creates_one_pending_notification(self):
        res = self.child_client.post(UNLOCK, {"action": "request_time"}, format="json")

        self.assertEqual(res.status_code, status.HTTP_200_OK)
        notif = ParentNotification.objects.get()
        self.assertEqual((notif.notif_type, notif.payload["status"]), ("screen_time_request", "pending"))

    def test_requests_are_rate_limited(self):
        self.request_time()

        again = self.child_client.post(UNLOCK, {"action": "request_time"}, format="json")

        self.assertEqual(again.status_code, status.HTTP_429_TOO_MANY_REQUESTS)
        self.assertEqual(ParentNotification.objects.count(), 1)

    def test_anonymous_visitors_cannot_send_requests(self):
        res = APIClient().post(UNLOCK, {"action": "request_time", "childId": self.child.id}, format="json")

        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertFalse(ParentNotification.objects.exists())

    def test_a_logged_in_parent_can_approve_a_request(self):
        """Régression : avec un vrai cookie, cette action répondait « Compte enfant introuvable »."""
        notif = self.request_time()

        res = self.parent_client.post(UNLOCK, {"action": "respond_request", "notifId": notif.id, "decision": "approved"}, format="json")

        self.assertEqual(res.status_code, status.HTTP_200_OK)
        notif.refresh_from_db()
        self.assertEqual(notif.payload["status"], "approved")
        self.assertEqual(ScreenTimeCredit.objects.get().child_id, self.child.id)

    def test_declining_grants_nothing(self):
        notif = self.request_time()

        self.parent_client.post(UNLOCK, {"action": "respond_request", "notifId": notif.id, "decision": "declined"}, format="json")

        self.assertFalse(ScreenTimeCredit.objects.exists())
        notif.refresh_from_db()
        self.assertEqual(notif.payload["status"], "declined")

    def test_a_request_is_only_processed_once(self):
        notif = self.request_time()
        body = {"action": "respond_request", "notifId": notif.id, "decision": "approved"}
        self.parent_client.post(UNLOCK, body, format="json")

        self.parent_client.post(UNLOCK, body, format="json")

        self.assertEqual(ScreenTimeCredit.objects.count(), 1)

    def test_invalid_decision_and_unknown_request(self):
        notif = self.request_time()

        bad = self.parent_client.post(UNLOCK, {"action": "respond_request", "notifId": notif.id, "decision": "peut-être"}, format="json")
        unknown = self.parent_client.post(UNLOCK, {"action": "respond_request", "notifId": 99999, "decision": "approved"}, format="json")

        self.assertEqual(bad.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(unknown.status_code, status.HTTP_404_NOT_FOUND)

    def test_a_parent_cannot_answer_someone_elses_request(self):
        notif = self.request_time()
        stranger = User.objects.create_user(email="autre@example.com", password="autre_password_123", role="parent")
        stranger_client = session_client("autre@example.com", "autre_password_123")

        res = stranger_client.post(UNLOCK, {"action": "respond_request", "notifId": notif.id, "decision": "approved"}, format="json")

        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)
        self.assertFalse(ScreenTimeCredit.objects.exists())
        self.assertIsNotNone(stranger)

    def test_parent_grant_above_the_cap_is_refused_not_silently_changed(self):
        res = self.parent_client.post(UNLOCK, {"action": "unlock", "childId": self.child.id, "extraMinutes": 999}, format="json")
        ok = self.parent_client.post(UNLOCK, {"action": "unlock", "childId": self.child.id, "extraMinutes": 120}, format="json")

        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(ok.status_code, status.HTTP_200_OK)
        self.assertEqual(ScreenTimeCredit.objects.get().minutes, 120)

    def test_parent_cannot_grant_time_to_someone_elses_child(self):
        other = User.objects.create_user(email="e2@example.com", password="x_password_123", role="eleve")

        res = self.parent_client.post(UNLOCK, {"action": "unlock", "childId": other.id}, format="json")

        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)

    def test_other_roles_are_refused(self):
        User.objects.create_user(email="prof@example.com", password="prof_password_123", role="enseignant",
                                 school=School.objects.create(name="École", slug="ecole"))
        teacher = session_client("prof@example.com", "prof_password_123")

        self.assertEqual(teacher.post(UNLOCK, {"action": "unlock"}, format="json").status_code, status.HTTP_403_FORBIDDEN)


class NotificationsAreNeverInventedTests(ParentalTestCase):
    URL = "/api/progress/notifications"

    def test_a_parent_whose_child_did_nothing_sees_no_notifications(self):
        res = self.parent_client.get(self.URL)

        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["notifications"], [])
        self.assertEqual(ParentNotification.objects.count(), 0)  # et rien n'est écrit en base

    def test_a_real_level_up_uses_the_canonical_tier_name(self):
        ParentNotification.objects.create(parent=self.parent, child=self.child, notif_type="level_up",
                                          payload={"type": "level", "newLevel": 2})

        item = self.parent_client.get(self.URL).data["notifications"][0]

        self.assertIn("Explorateur débutant", item["title"])

    def test_missing_details_are_omitted_rather_than_replaced_by_examples(self):
        ParentNotification.objects.create(parent=self.parent, child=self.child, notif_type="streak", payload={"type": "streak"})
        ParentNotification.objects.create(parent=self.parent, child=self.child, notif_type="inactivity", payload={"type": "inactivity"})

        text = " ".join(n["title"] + n["message"] for n in self.parent_client.get(self.URL).data["notifications"])

        for invented in ("5 jours", "4 jours", "3e", "Réseau de neurones", "Explorateur des Étoiles"):
            self.assertNotIn(invented, text)

    def test_module_notification_uses_the_real_lesson_title(self):
        from apps.progress.tests.helpers import make_lesson
        make_lesson("p1-1", title="Ma vraie leçon")
        ParentNotification.objects.create(parent=self.parent, child=self.child, notif_type="lesson_done",
                                          payload={"lessonId": "p1-1", "score": 90, "xpGained": 20})

        item = self.parent_client.get(self.URL).data["notifications"][0]

        self.assertIn("Ma vraie leçon", item["message"])
        self.assertIn("90%", item["message"])

    def test_the_migration_purges_only_the_exact_fabricated_rows(self):
        migration = importlib.import_module("apps.progress.migrations.0013_purge_fabricated_notifications")
        from django.apps import apps as django_apps
        for kind, title in migration.FABRICATED.items():
            ParentNotification.objects.create(parent=self.parent, child=self.child, notif_type=kind, payload={"title": title})
        real = ParentNotification.objects.create(parent=self.parent, child=self.child, notif_type="level_up",
                                                 payload={"title": "Nouveau palier atteint : Explorateur débutant 🌟"})
        similar = ParentNotification.objects.create(parent=self.parent, child=self.child, notif_type="streak",
                                                    payload={"title": "Série de connexion : 7 jours consécutifs ! 🔥"})

        migration.purge(django_apps, None)

        self.assertEqual(set(ParentNotification.objects.values_list("pk", flat=True)), {real.pk, similar.pk})
