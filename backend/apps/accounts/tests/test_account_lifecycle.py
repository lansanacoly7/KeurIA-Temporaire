"""Désactivation / réactivation d'un compte parent et retrait d'un enfant.

Ces routes ne doivent jamais permettre à un compte désactivé par son école ou par l'équipe kEur IA de se
réactiver seul, ni laisser un enfant orphelin (sans parent ni école).
"""
import re
import unittest
from pathlib import Path

from django.core.cache import cache
from rest_framework import status
from rest_framework.test import APIClient, APITestCase

from apps.accounts.models import EmailVerificationCode, User
from apps.progress.models import ParentalLimits
from apps.schools.models import School
ROLES_TS = Path(__file__).resolve().parents[4] / "frontend" / "app" / "connexion" / "roles.ts"

PASSWORD = "motdepasse123"


def login(email, password=PASSWORD):
    client = APIClient()
    return client, client.post("/api/auth/login", {"email": email, "password": password}, format="json")


class DeactivateAccountTests(APITestCase):
    def setUp(self):
        cache.clear()
        self.parent = User.objects.create_user(email="parent@example.com", password=PASSWORD, role=User.ROLE_PARENT)
        self.client, _ = login("parent@example.com")

    def test_password_is_required_to_deactivate(self):
        for body in ({}, {"password": "mauvais"}):
            response = self.client.post("/api/auth/deactivate", body, format="json")
            self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.parent.refresh_from_db()
        self.assertTrue(self.parent.is_active)

    def test_wrong_passwords_are_locked_out(self):
        for _ in range(5):
            self.client.post("/api/auth/deactivate", {"password": "mauvais"}, format="json")

        response = self.client.post("/api/auth/deactivate", {"password": PASSWORD}, format="json")

        self.assertEqual(response.status_code, status.HTTP_429_TOO_MANY_REQUESTS)

    def test_right_password_deactivates_and_ends_the_session(self):
        response = self.client.post("/api/auth/deactivate", {"password": PASSWORD}, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.parent.refresh_from_db()
        self.assertFalse(self.parent.is_active)
        self.assertEqual(self.client.get("/api/profile").status_code, status.HTTP_401_UNAUTHORIZED)

    def test_a_deactivated_parent_can_reactivate_with_the_emailed_code(self):
        self.client.post("/api/auth/deactivate", {"password": PASSWORD}, format="json")
        anonymous = APIClient()

        self.assertEqual(anonymous.post("/api/auth/login", {"email": "parent@example.com", "password": PASSWORD},
                                        format="json").data["accountDeactivated"], True)
        self.assertEqual(anonymous.post("/api/auth/request-reactivation",
                                        {"email": "parent@example.com", "password": PASSWORD}, format="json").status_code, 200)
        code = "123456"
        EmailVerificationCode.objects.filter(user=self.parent).delete()
        from django.contrib.auth.hashers import make_password
        EmailVerificationCode.objects.create(user=self.parent, code=make_password(code))
        response = anonymous.post("/api/auth/reactivate", {"email": "parent@example.com", "code": code}, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.parent.refresh_from_db()
        self.assertTrue(self.parent.is_active)


class OnlyParentsCanReactivateThemselvesTests(APITestCase):
    """Un compte désactivé par l'école ou par kEur IA reste désactivé, même avec le bon mot de passe."""

    def setUp(self):
        cache.clear()
        school = School.objects.create(name="École", slug="ecole")
        self.blocked = [
            User.objects.create_user(email="prof@example.com", password=PASSWORD, role=User.ROLE_TEACHER,
                                     school=school, is_active=False),
            User.objects.create_user(email="direction@example.com", password=PASSWORD, role=User.ROLE_SCHOOL_ADMIN,
                                     school=school, is_active=False),
            User.objects.create_user(email="eleve@example.com", password=PASSWORD, role=User.ROLE_STUDENT,
                                     school=school, is_active=False),
        ]

    def test_login_gives_the_generic_answer(self):
        for user in self.blocked:
            response = APIClient().post("/api/auth/login", {"email": user.email, "password": PASSWORD}, format="json")

            self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED, user.role)
            self.assertNotIn("accountDeactivated", response.data)

    def test_request_reactivation_is_refused(self):
        for user in self.blocked:
            response = APIClient().post("/api/auth/request-reactivation",
                                        {"email": user.email, "password": PASSWORD}, format="json")

            self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED, user.role)

    def test_a_valid_code_does_not_reactivate_them(self):
        from django.contrib.auth.hashers import make_password
        for user in self.blocked:
            EmailVerificationCode.objects.create(user=user, code=make_password("123456"))

            response = APIClient().post("/api/auth/reactivate", {"email": user.email, "code": "123456"}, format="json")

            self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST, user.role)
            user.refresh_from_db()
            self.assertFalse(user.is_active)

    def test_request_reactivation_password_guessing_is_locked(self):
        parent = User.objects.create_user(email="parent@example.com", password=PASSWORD, role=User.ROLE_PARENT,
                                          is_active=False)
        for _ in range(5):
            APIClient().post("/api/auth/request-reactivation", {"email": parent.email, "password": "mauvais"}, format="json")

        response = APIClient().post("/api/auth/request-reactivation",
                                    {"email": parent.email, "password": PASSWORD}, format="json")

        self.assertEqual(response.status_code, status.HTTP_429_TOO_MANY_REQUESTS)


class RemoveChildTests(APITestCase):
    def setUp(self):
        cache.clear()
        self.school = School.objects.create(name="École", slug="ecole")
        self.parent = User.objects.create_user(email="parent@example.com", password=PASSWORD, role=User.ROLE_PARENT)
        self.school_child = User.objects.create_user(email="awa@ecole.keuria.sn", password=PASSWORD, role=User.ROLE_STUDENT,
                                                     school=self.school, parent=self.parent)
        self.family_child = User.objects.create_user(email="moussa@keuria.sn", password=PASSWORD, role=User.ROLE_STUDENT,
                                                     parent=self.parent)
        self.client, _ = login("parent@example.com")

    def test_school_child_is_detached_and_its_limits_are_cleared(self):
        ParentalLimits.objects.create(parent=self.parent, child=self.school_child, strict_time_limit=True)

        response = self.client.delete(f"/api/parent/children/{self.school_child.id}")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.school_child.refresh_from_db()
        self.assertIsNone(self.school_child.parent_id)
        self.assertEqual(self.school_child.school_id, self.school.id)
        self.assertFalse(ParentalLimits.objects.filter(child=self.school_child).exists())

    def test_family_child_is_never_left_orphaned(self):
        response = self.client.delete(f"/api/parent/children/{self.family_child.id}")

        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)
        self.family_child.refresh_from_db()
        self.assertEqual(self.family_child.parent_id, self.parent.id)

    def test_family_child_deletion_fails_with_wrong_password(self):
        response = self.client.delete(
            f"/api/parent/children/{self.family_child.id}",
            {"password": "wrongpassword"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertTrue(User.objects.filter(id=self.family_child.id).exists())

    def test_family_child_can_be_deleted_with_parent_password(self):
        response = self.client.delete(
            f"/api/parent/children/{self.family_child.id}",
            {"password": PASSWORD},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.family_child.refresh_from_db()
        self.assertFalse(self.family_child.is_active)
        self.assertIsNotNone(self.family_child.deleted_at)

        # Récupération possible pendant le délai de grâce de 3 jours
        restore_res = self.client.post(f"/api/parent/children/{self.family_child.id}/restore")
        self.assertEqual(restore_res.status_code, status.HTTP_200_OK)
        self.family_child.refresh_from_db()
        self.assertTrue(self.family_child.is_active)
        self.assertIsNone(self.family_child.deleted_at)

        # Après expiration des 3 jours, la suppression est définitive
        self.client.delete(
            f"/api/parent/children/{self.family_child.id}",
            {"password": PASSWORD},
            format="json",
        )
        from datetime import timedelta
        from django.utils import timezone
        from apps.accounts.retention import purge_expired_child_deletions
        self.family_child.refresh_from_db()
        self.family_child.deleted_at = timezone.now() - timedelta(days=4)
        self.family_child.save(update_fields=['deleted_at'])
        purged = purge_expired_child_deletions()
        self.assertEqual(purged, 1)
        self.assertFalse(User.objects.filter(id=self.family_child.id).exists())

    def test_non_numeric_child_id_is_a_400_not_a_500(self):
        response = self.client.delete("/api/parent/children/", {"childId": "abc"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_another_parents_child_is_not_found(self):
        other = User.objects.create_user(email="autre@example.com", password=PASSWORD, role=User.ROLE_PARENT)
        stranger = User.objects.create_user(email="x@ecole.keuria.sn", password=PASSWORD, role=User.ROLE_STUDENT,
                                            school=self.school, parent=other)

        response = self.client.delete(f"/api/parent/children/{stranger.id}")

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        stranger.refresh_from_db()
        self.assertEqual(stranger.parent_id, other.id)


class ExpectedRoleTests(APITestCase):
    """Le profil choisi sur l'écran de connexion doit correspondre au vrai rôle, sans le révéler."""

    def setUp(self):
        cache.clear()
        User.objects.create_user(email="parent@example.com", password=PASSWORD, role=User.ROLE_PARENT)

    def _login(self, expected):
        return APIClient().post("/api/auth/login", {"email": "parent@example.com", "password": PASSWORD,
                                                    "expectedRole": expected}, format="json")

    def test_wrong_profile_is_refused_with_a_generic_message(self):
        response = self._login("enseignant")

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertNotIn("parent", response.data["error"].lower())

    def test_matching_or_absent_profile_is_accepted(self):
        self.assertEqual(self._login("parent").status_code, status.HTTP_200_OK)
        self.assertEqual(self._login("").status_code, status.HTTP_200_OK)

    @unittest.skipUnless(ROLES_TS.exists(), "sources du frontend absentes")
    def test_every_profile_the_login_page_can_send_is_known_to_the_server(self):
        """Contrat frontend/serveur : un profil inconnu du serveur ne serait vérifié par personne (connexion acceptée à tort)."""
        declared = re.search(r"export type LoginRole = ([^;]+);", ROLES_TS.read_text(encoding="utf-8")).group(1)
        profiles = re.findall(r'"(\w+)"', declared)
        self.assertEqual(set(profiles), {"eleve", "enseignant", "ecole", "parent", "admin"})
        for profile in profiles:
            if profile == "parent":
                continue  # l'utilisateur de ces tests est un parent : il passe
            self.assertEqual(self._login(profile).status_code, status.HTTP_403_FORBIDDEN, profile)

    def test_school_and_platform_logins_are_separate_entrances(self):
        """La page « École » n'ouvre que les directions d'école ; la page administration que l'équipe kEur IA."""
        school = School.objects.create(name="École", slug="ecole-entrees")
        User.objects.create_user(email="direction@example.com", password=PASSWORD, role=User.ROLE_SCHOOL_ADMIN, school=school)
        User.objects.create_user(email="admin@example.com", password=PASSWORD, role=User.ROLE_ADMIN)

        def login(email, expected):
            return APIClient().post("/api/auth/login", {"email": email, "password": PASSWORD, "expectedRole": expected}, format="json")

        self.assertEqual(login("direction@example.com", "ecole").status_code, status.HTTP_200_OK)
        self.assertEqual(login("admin@example.com", "admin").status_code, status.HTTP_200_OK)
        self.assertEqual(login("admin@example.com", "ecole").status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(login("direction@example.com", "admin").status_code, status.HTTP_403_FORBIDDEN)
        for other in ("parent", "enseignant", "eleve"):  # ni l'un ni l'autre n'entre par la porte d'un autre profil
            self.assertEqual(login("admin@example.com", other).status_code, status.HTTP_403_FORBIDDEN, other)
        # Un parent ne passe pas par la page administration.
        self.assertEqual(login("parent@example.com", "admin").status_code, status.HTTP_403_FORBIDDEN)

    def test_wrong_profile_counts_towards_lockout(self):
        for _ in range(5):
            self._login("enseignant")

        # Après 5 tentatives avec profil incorrect, le compte est verrouillé
        locked = self._login("parent")
        self.assertEqual(locked.status_code, status.HTTP_429_TOO_MANY_REQUESTS)


class ChildPasswordRecoveryTests(APITestCase):
    """Récupération et changement du mot de passe d'un enfant par son parent."""

    def setUp(self):
        cache.clear()
        self.parent = User.objects.create_user(email="parent@example.com", password=PASSWORD, role=User.ROLE_PARENT)
        self.child = User.objects.create_user(email="fatou@keuria.sn", password=PASSWORD, role=User.ROLE_STUDENT, parent=self.parent, display_name="Fatou")
        self.client, _ = login("parent@example.com")

    def test_child_forgot_password_sends_email_to_parent(self):
        from django.core import mail
        response = APIClient().post("/api/auth/forgot-password", {"email": self.child.email}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].to, [self.parent.email])
        self.assertIn("Fatou", mail.outbox[0].body)

    def test_parent_can_reset_child_password_directly(self):
        response = self.client.post(f"/api/parent/children/{self.child.id}/reset-password", {"password": "NewStrongPass1!"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.child.refresh_from_db()
        self.assertTrue(self.child.check_password("NewStrongPass1!"))

    def test_parent_cannot_reset_child_password_with_weak_password(self):
        response = self.client.post(f"/api/parent/children/{self.child.id}/reset-password", {"password": "123"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


    def test_parent_cannot_reset_password_of_a_school_managed_child(self):
        school = School.objects.create(name="École", slug="ecole-reset")
        self.child.school = school
        self.child.save(update_fields=["school"])
        response = self.client.post(f"/api/parent/children/{self.child.id}/reset-password", {"password": "NewStrongPass1!"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.child.refresh_from_db()
        self.assertTrue(self.child.check_password(PASSWORD))


class ChildAgeTrackTests(APITestCase):
    """L'âge saisi à l'inscription décide du parcours : il est déduit côté serveur."""

    def setUp(self):
        cache.clear()
        User.objects.create_user(email="parent@example.com", password=PASSWORD, role=User.ROLE_PARENT)
        self.client, _ = login("parent@example.com")

    def _create(self, **extra):
        return self.client.post("/api/parent/children", {"password": "kids2026ok", "displayName": "Awa Diop", **extra}, format="json")

    def test_age_picks_the_track(self):
        for age, track in ((7, "7-9"), (9, "7-9"), (10, "10-12"), (12, "10-12"), (13, "13-15"), (15, "13-15")):
            response = self._create(age=age, displayName=f"Enfant{age} Test")
            self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
            self.assertEqual(response.data["child"]["ageGroup"], track, age)

    def test_age_wins_over_a_chosen_track(self):
        response = self._create(age=8, ageGroup="13-15")
        self.assertEqual(response.data["child"]["ageGroup"], "7-9")

    def test_age_outside_the_range_lets_the_parent_pick_the_track(self):
        for age, chosen in ((6, "7-9"), (4, "7-9"), (17, "13-15"), (16, "10-12")):
            response = self._create(age=age, ageGroup=chosen, displayName=f"Hors{age} Tranche")
            self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
            self.assertEqual(response.data["child"]["ageGroup"], chosen, age)

    def test_age_outside_the_range_needs_a_track(self):
        for age in (6, 17):
            self.assertEqual(self._create(age=age).status_code, status.HTTP_400_BAD_REQUEST, age)
            self.assertEqual(self._create(age=age, ageGroup="n'importe quoi").status_code, status.HTTP_400_BAD_REQUEST, age)

    def test_absurd_age_is_refused(self):
        for age in (0, 1, 40, -1):
            self.assertEqual(self._create(age=age, ageGroup="7-9").status_code, status.HTTP_400_BAD_REQUEST, age)
        self.assertEqual(self._create(age="abc").status_code, status.HTTP_400_BAD_REQUEST)


class ChildRoutesShapeTests(APITestCase):
    """Chaque route n'accepte que ses méthodes : jamais de 500 sur une méthode inattendue."""

    def setUp(self):
        cache.clear()
        parent = User.objects.create_user(email="parent@example.com", password=PASSWORD, role=User.ROLE_PARENT)
        self.child = User.objects.create_user(email="awa@keuria.sn", password=PASSWORD, role=User.ROLE_STUDENT, parent=parent)
        self.client, _ = login("parent@example.com")

    def test_detail_route_only_supports_delete(self):
        for method in ("get", "post", "put", "patch"):
            response = getattr(self.client, method)(f"/api/parent/children/{self.child.id}", {}, format="json")
            self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED, method)

    def test_child_creation_generates_a_readable_login(self):
        response = self.client.post("/api/parent/children", {"password": "kids2026ok", "displayName": "Fatou Diallo"},
                                    format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["child"]["email"], "fatou.diallo@keuria.sn")


class BrowserIdParsingTests(APITestCase):
    """« ² » ou « ① » passent `str.isdigit()` mais font échouer `int()` : jamais de 500 sur un identifiant."""

    WEIRD = ("²", "①", "١٢٣", "9" * 40, "-1", " 1", "1e3", "0x10")

    def setUp(self):
        cache.clear()
        parent = User.objects.create_user(email="parent@example.com", password=PASSWORD, role=User.ROLE_PARENT)
        User.objects.create_user(email="awa@keuria.sn", password=PASSWORD, role=User.ROLE_STUDENT, parent=parent)
        self.client, _ = login("parent@example.com")

    def test_no_route_crashes_on_a_weird_id(self):
        for weird in self.WEIRD:
            for url in ("/api/progress?child_id=", "/api/charter?child_id=", "/api/progress/parental-limits?childId=",
                        "/api/famille/messages?after="):
                self.assertLess(self.client.get(url + weird).status_code, 500, url + weird)
            for url, body in (("/api/progress/tutorial-complete", {"child_id": weird}),
                              ("/api/progress/parental-limits/unlock", {"action": "unlock", "childId": weird}),
                              ("/api/progress/parental-limits/unlock", {"action": "respond_request", "notifId": weird,
                                                                        "decision": "approved"}),
                              ("/api/progress/parental-limits", {"childId": weird})):
                self.assertLess(self.client.post(url, body, format="json").status_code, 500, f"{url} {weird}")
            self.assertLess(self.client.delete("/api/parent/children/", {"childId": weird}, format="json").status_code, 500)

    def test_parse_id_accepts_only_plain_ascii_numbers(self):
        from apps.accounts.parsing import parse_id

        self.assertEqual([parse_id(v) for v in (5, "5", "007", 0)], [5, 5, 7, 0])
        self.assertEqual([parse_id(v) for v in (True, None, -1, "-1", "²", "١٢٣", "5.0", "", 10 ** 30, [], {})], [None] * 11)


class ChildrenPerHouseholdTests(APITestCase):
    """Un foyer a un nombre raisonnable d'enfants : pas de fabrique à comptes."""

    def setUp(self):
        cache.clear()
        from apps.accounts.serializers import MAX_CHILDREN_PER_PARENT
        self.max = MAX_CHILDREN_PER_PARENT
        self.parent = User.objects.create_user(email="parent@example.com", password=PASSWORD, role=User.ROLE_PARENT)
        self.client, _ = login("parent@example.com")

    def add(self, name):
        return self.client.post("/api/parent/children", {"password": "kids2026ok", "displayName": name}, format="json")

    def test_the_household_is_capped(self):
        for i in range(self.max):
            self.assertEqual(self.add(f"Enfant{chr(65 + i)}").status_code, status.HTTP_201_CREATED)

        response = self.add("Trop")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(self.parent.children.count(), self.max)

    def test_the_cap_also_applies_to_the_enrollment_route(self):
        students = [{"password": "kids2026ok", "displayName": f"Eleve{chr(65 + i)}", "ageTrack": "7-9"} for i in range(self.max + 1)]

        response = self.client.post("/api/profiles", {"students": students}, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(self.parent.children.count(), 0)  # tout ou rien
