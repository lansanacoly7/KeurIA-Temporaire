"""Tests de sécurité : authentification, autorisations et critères du plan
KEURIA_Plan_Taches_Auth_Autorisation (identifiants T01…T17 dans les noms)."""
import re

from django.core import mail
from django.core.cache import cache
from django.test import override_settings
from rest_framework import status
from rest_framework.test import APIClient, APITestCase

from apps.accounts.models import EmailVerificationCode, PasswordResetCode, User
from apps.learners.models import LearnerProfile
from apps.progress.models import Progress
from apps.progress.tests.helpers import make_lesson
from apps.schools.models import School

PASSWORD = "motdepasse123"


def make_user(email, role, parent=None, password=PASSWORD, school=None):
    # Un enseignant doit appartenir à une école pour se connecter : on lui en donne une par défaut.
    if role == User.ROLE_TEACHER and school is None:
        school, _ = School.objects.get_or_create(slug="ecole-defaut", defaults={"name": "École par défaut"})
    return User.objects.create_user(email=email, password=password, role=role, parent=parent, school=school,
                                    display_name=email.split("@")[0].title())


class AuthTestCase(APITestCase):
    def setUp(self):
        super().setUp()
        cache.clear()

    def tearDown(self):
        cache.clear()
        super().tearDown()

    def login(self, email, password=PASSWORD, client=None):
        client = client or self.client
        cache.clear()
        response = client.post("/api/auth/login", {"email": email, "password": password}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        return response


class SessionSecurityTests(AuthTestCase):
    def setUp(self):
        self.admin = make_user("admin@example.com", User.ROLE_ADMIN)

    def test_forged_cookie_with_user_id_is_not_authenticated(self):
        # Ancienne faille : keur_ia_session contenait l'id en clair.
        self.client.cookies["keur_ia_session"] = str(self.admin.id)

        self.assertEqual(self.client.get("/api/superadmin/dashboard").status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(self.client.get("/api/profile").status_code, status.HTTP_401_UNAUTHORIZED)

    def test_session_cookie_is_httponly(self):
        response = self.login("admin@example.com")

        cookie = response.cookies["keur_ia_session"]
        self.assertTrue(cookie["httponly"])
        self.assertNotEqual(cookie.value, str(self.admin.id))

    def test_logout_destroys_server_side_session(self):
        self.login("admin@example.com")
        stolen_session = self.client.cookies["keur_ia_session"].value

        self.client.post("/api/auth/logout")
        replay = APIClient()
        replay.cookies["keur_ia_session"] = stolen_session

        self.assertEqual(replay.get("/api/superadmin/dashboard").status_code, status.HTTP_401_UNAUTHORIZED)

    def test_authenticated_mutation_requires_csrf_token(self):
        client = APIClient(enforce_csrf_checks=True)
        response = self.login("admin@example.com", client=client)

        without_token = client.put("/api/profile", {"displayName": "Sans jeton"}, format="json")
        with_token = client.put("/api/profile", {"displayName": "Avec jeton"}, format="json",
                                HTTP_X_CSRFTOKEN=response.data["csrfToken"])

        self.assertEqual(without_token.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(with_token.status_code, status.HTTP_200_OK)

    def test_profile_exposes_user_id_for_ssr(self):
        self.login("admin@example.com")

        self.assertEqual(self.client.get("/api/profile").data["profile"]["id"], self.admin.id)


class ParentProfilesTests(AuthTestCase):
    """T01, T02, T03 : /api/profiles réservé aux parents, lien via User.parent."""

    def setUp(self):
        self.parent_a = make_user("parent-a@example.com", User.ROLE_PARENT)
        self.parent_b = make_user("parent-b@example.com", User.ROLE_PARENT)
        self.child_b = make_user("enfant-b@example.com", User.ROLE_STUDENT, parent=self.parent_b)

    def enroll(self, email, name="Awa Ndiaye", password="kids2026ok"):
        return self.client.post("/api/profiles", {"students": [
            {"email": email, "password": password, "displayName": name, "ageTrack": "7-9"},
        ]}, format="json")

    def test_T01_parent_can_create_and_list_own_child(self):
        self.login("parent-a@example.com")

        response = self.enroll("awa@example.com")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        # L'identifiant de l'enfant est généré par le serveur à partir de son nom : l'e-mail saisi est ignoré.
        child = User.objects.get(email="awa.ndiaye@keuria.sn")
        self.assertEqual(child.parent, self.parent_a)
        self.assertFalse(User.objects.filter(email="awa@example.com").exists())
        emails = [p["learnerEmail"] for p in self.client.get("/api/profiles").data["profiles"]]
        self.assertEqual(emails, ["awa.ndiaye@keuria.sn"])

    def test_homonym_children_get_distinct_logins(self):
        self.login("parent-a@example.com")
        self.enroll("x@example.com")
        self.enroll("y@example.com")

        logins = set(User.objects.filter(parent=self.parent_a).values_list("email", flat=True))
        self.assertEqual(logins, {"awa.ndiaye@keuria.sn", "awa.ndiaye2@keuria.sn"})

    def test_T01_parent_cannot_take_over_another_parents_child(self):
        self.login("parent-a@example.com")

        response = self.enroll("enfant-b@example.com", name="Pirate")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.child_b.refresh_from_db()
        self.assertEqual(self.child_b.parent, self.parent_b)
        self.assertFalse(LearnerProfile.objects.filter(owner_email="parent-a@example.com").exists())

    def test_T01_parent_can_update_own_child_profile(self):
        self.login("parent-a@example.com")
        login = self.enroll("awa@example.com").data["profiles"][0]["learnerEmail"]

        response = self.client.post("/api/profiles", {"students": [
            {"email": login, "displayName": "Awa Ndiaye", "ageTrack": "10-12", "avatar": "🦊"},
        ]}, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        profile = LearnerProfile.objects.get(learner__email=login)
        self.assertEqual((profile.age_track, profile.avatar), ("10-12", "🦊"))
        self.assertEqual(User.objects.filter(parent=self.parent_a).count(), 1)

    def test_T01_parent_does_not_see_other_parents_children(self):
        self.login("parent-a@example.com")

        self.assertEqual(self.client.get("/api/profiles").data["profiles"], [])

    def test_T01_student_and_teacher_are_refused(self):
        make_user("prof@example.com", User.ROLE_TEACHER)
        for email in ("enfant-b@example.com", "prof@example.com"):
            client = APIClient()
            self.login(email, client=client)
            self.assertEqual(client.get("/api/profiles").status_code, status.HTTP_403_FORBIDDEN)
            self.assertEqual(client.post("/api/profiles", {"students": []}, format="json").status_code,
                             status.HTTP_403_FORBIDDEN)

    def test_T03_enrolled_child_appears_in_parent_children_and_tracking(self):
        self.login("parent-a@example.com")
        self.enroll("awa@example.com")

        children = self.client.get("/api/parent/children").data["children"]
        tracking = self.client.get("/api/progress/tracking").data["tracking"]

        self.assertEqual([c["email"] for c in children], ["awa.ndiaye@keuria.sn"])
        self.assertEqual([t["email"] for t in tracking], ["awa.ndiaye@keuria.sn"])

    def test_T04_children_get_the_eleve_role(self):
        self.login("parent-a@example.com")
        self.enroll("awa@example.com")
        self.client.post("/api/parent/children", {
            "email": "moussa@example.com", "password": "kids2026ok", "displayName": "Moussa",
        }, format="json")

        roles = set(User.objects.filter(parent=self.parent_a).values_list("role", flat=True))
        self.assertEqual(roles, {User.ROLE_STUDENT})

    def test_enrollment_is_all_or_nothing(self):
        self.login("parent-a@example.com")

        response = self.client.post("/api/profiles", {"students": [
            {"email": "ok@example.com", "password": "kids2026ok", "displayName": "Valide"},
            {"email": "faible@example.com", "password": "123", "displayName": "Invalide"},
        ]}, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(User.objects.filter(email="ok@example.com").exists())


class SingleParentRelationTests(AuthTestCase):
    """T02 : les deux parcours de création d'enfant produisent la même relation User.parent."""

    def test_T02_both_creation_paths_use_user_parent(self):
        parent = make_user("parent@example.com", User.ROLE_PARENT)
        self.login("parent@example.com")
        self.client.post("/api/parent/children", {"email": "moussa@example.com", "password": "kids2026ok",
                                                  "displayName": "Moussa"}, format="json")
        self.client.post("/api/profiles", {"students": [
            {"email": "awa@example.com", "password": "kids2026ok", "displayName": "Awa"},
        ]}, format="json")

        expected = {"awa@keuria.sn", "moussa@keuria.sn"}
        self.assertEqual(set(parent.children.values_list("email", flat=True)), expected)
        for url, key, field in (("/api/parent/children", "children", "email"),
                                ("/api/profiles", "profiles", "learnerEmail"),
                                ("/api/progress/tracking", "tracking", "email")):
            self.assertEqual({item[field] for item in self.client.get(url).data[key]}, expected, url)

    def test_T02_email_fields_no_longer_grant_ownership(self):
        make_user("parent-a@example.com", User.ROLE_PARENT)
        parent_b = make_user("parent-b@example.com", User.ROLE_PARENT)
        child = make_user("enfant-b@example.com", User.ROLE_STUDENT, parent=parent_b)
        # Ancienne donnée qui désignait parent A comme « propriétaire » par e-mail.
        LearnerProfile.objects.create(learner=child, owner_email="parent-a@example.com",
                                      learner_email=child.email, nickname="Enfant B")
        self.login("parent-a@example.com")

        self.assertEqual(self.client.get("/api/profiles").data["profiles"], [])
        self.assertEqual(self.client.get("/api/progress/tracking").data["tracking"], [])


class CleanDependenciesTests(APITestCase):
    """T17 : plus de JWT, authentification par session uniquement."""

    def test_T17_no_jwt_dependency_or_setting(self):
        from pathlib import Path

        from django.conf import settings

        requirements = (Path(settings.BASE_DIR) / "requirements.txt").read_text().lower()
        self.assertNotIn("jwt", requirements)
        self.assertIn("python-dotenv", requirements)
        auth_classes = settings.REST_FRAMEWORK["DEFAULT_AUTHENTICATION_CLASSES"]
        self.assertEqual(auth_classes, ("apps.accounts.authentication.KeurSessionAuthentication",))


class ParentApiPermissionTests(AuthTestCase):
    """T06 : /api/parent/children et /api/progress/tracking réservés aux parents."""

    urls = ("/api/parent/children", "/api/progress/tracking")

    def test_T06_anonymous_is_unauthorized(self):
        for url in self.urls:
            self.assertEqual(self.client.get(url).status_code, status.HTTP_401_UNAUTHORIZED, url)

    def test_T06_student_and_teacher_are_forbidden(self):
        make_user("eleve@example.com", User.ROLE_STUDENT)
        make_user("prof@example.com", User.ROLE_TEACHER)
        for email in ("eleve@example.com", "prof@example.com"):
            client = APIClient()
            self.login(email, client=client)
            for url in self.urls:
                response = client.get(url)
                self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN, (email, url))
                self.assertIn("error", response.data)

    def test_T06_parent_is_allowed(self):
        make_user("parent@example.com", User.ROLE_PARENT)
        self.login("parent@example.com")
        for url in self.urls:
            self.assertEqual(self.client.get(url).status_code, status.HTTP_200_OK, url)


class OwnershipByForeignKeyTests(AuthTestCase):
    """T07 : la progression suit le compte, pas l'adresse e-mail."""

    def test_T07_progress_and_parent_link_survive_an_email_change(self):
        make_lesson("p1-1")
        parent = make_user("parent@example.com", User.ROLE_PARENT)
        child = make_user("enfant@example.com", User.ROLE_STUDENT, parent=parent)
        self.login("enfant@example.com")
        self.client.post("/api/progress", {"lessonId": "p1-1", "age": "7-9", "score": 90}, format="json")
        self.client.post("/api/auth/logout")

        child.email = "nouvel-email@example.com"
        child.save(update_fields=["email"])
        parent.email = "parent-nouveau@example.com"
        parent.save(update_fields=["email"])
        self.login("parent-nouveau@example.com")

        tracking = self.client.get("/api/progress/tracking").data["tracking"]
        self.assertEqual([t["email"] for t in tracking], ["nouvel-email@example.com"])
        self.assertEqual(tracking[0]["completedLessons"], ["p1-1"])

    def test_T07_new_account_reusing_an_email_does_not_inherit_progress(self):
        make_lesson("p1-1")
        old = make_user("recycle@example.com", User.ROLE_STUDENT)
        self.login("recycle@example.com")
        self.client.post("/api/progress", {"lessonId": "p1-1", "age": "7-9", "score": 90}, format="json")
        self.client.post("/api/auth/logout")
        old.delete()

        make_user("recycle@example.com", User.ROLE_STUDENT)
        self.login("recycle@example.com")

        progress = self.client.get("/api/progress").data["progress"]
        self.assertEqual(progress["xp"], 0)
        self.assertEqual(progress["completedLessons"], [])
        self.assertFalse(Progress.objects.exists())


class PasswordPolicyTests(AuthTestCase):
    """T08 : les validateurs Django sont réellement appliqués."""

    def register(self, password):
        return self.client.post("/api/auth/register", {
            "email": "nouveau@example.com", "password": password, "firstName": "Awa", "lastName": "Ndiaye", "phone": "77 123 45 67", "acceptTerms": True,
        }, format="json")

    def test_T08_weak_passwords_are_refused(self):
        for weak in ("123456", "12345678", "password1", "motdepasse"):
            response = self.register(weak)
            self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST, weak)
            self.assertTrue(response.data["error"])
        self.assertFalse(User.objects.filter(email="nouveau@example.com").exists())

    def test_T08_password_too_similar_to_email_is_refused(self):
        response = self.client.post("/api/auth/register", {
            "email": "fatoudiop2026@example.com", "password": "fatoudiop2026", "firstName": "Fatou", "lastName": "Diop", "phone": "77 123 45 67",
        }, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_T08_policy_applies_to_child_accounts(self):
        make_user("parent@example.com", User.ROLE_PARENT)
        self.login("parent@example.com")

        response = self.client.post("/api/parent/children", {
            "email": "enfant@example.com", "password": "12345678", "displayName": "Enfant",
        }, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class LoginLockoutTests(AuthTestCase):
    """T09 : après plusieurs échecs, la connexion est temporairement bloquée."""

    def setUp(self):
        make_user("parent@example.com", User.ROLE_PARENT)

    def test_T09_account_is_locked_after_five_failures(self):
        for _ in range(5):
            response = self.client.post("/api/auth/login", {"email": "parent@example.com", "password": "mauvais1"},
                                        format="json")
            self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

        locked = self.client.post("/api/auth/login", {"email": "parent@example.com", "password": PASSWORD},
                                  format="json")

        self.assertEqual(locked.status_code, status.HTTP_429_TOO_MANY_REQUESTS)
        self.assertNotIn("keur_ia_session", locked.cookies)

    def test_T09_successful_login_resets_the_counter(self):
        for _ in range(4):
            self.client.post("/api/auth/login", {"email": "parent@example.com", "password": "mauvais1"}, format="json")
        self.login("parent@example.com")
        self.client.post("/api/auth/logout")

        for _ in range(4):
            self.client.post("/api/auth/login", {"email": "parent@example.com", "password": "mauvais1"}, format="json")

        self.login("parent@example.com")


class SchoolAccessTests(AuthTestCase):
    """T12 : liste complète réservée à l'admin, pas d'e-mail interne en public."""

    def setUp(self):
        self.school = School.objects.create(name="École Test", slug="ecole-test", created_by_email="interne@keuria.sn")
        make_user("eleve@example.com", User.ROLE_STUDENT)
        make_user("admin@example.com", User.ROLE_ADMIN)

    def test_T12_student_cannot_list_schools(self):
        self.login("eleve@example.com")

        self.assertEqual(self.client.get("/api/superadmin/schools").status_code, status.HTTP_403_FORBIDDEN)

    def test_T12_anonymous_cannot_modify_schools(self):
        self.assertEqual(self.client.post("/api/superadmin/schools", {"name": "X", "slug": "x"}).status_code,
                         status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(self.client.post(f"/api/superadmin/schools/{self.school.id}/suspend",
                                          {"confirmation": "École Test"}, format="json").status_code,
                         status.HTTP_401_UNAUTHORIZED)
        self.assertFalse(School.objects.get(id=self.school.id).is_suspended)

    def test_T12_public_school_page_hides_internal_email(self):
        response = self.client.get("/api/schools/ecole-test")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["school"]["name"], "École Test")
        self.assertNotIn("interne@keuria.sn", str(response.data))

    def test_admin_creates_school_as_creator_and_invalid_colors_are_refused(self):
        self.login("admin@example.com")

        direction = {"firstName": "Awa", "lastName": "Ndiaye", "email": "direction@nouvelle.test"}
        created = self.client.post("/api/superadmin/schools", {
            "name": "Nouvelle", "slug": "nouvelle", "city": "Thiès", "primaryColor": "#173e3c",
            "accentColor": "#d9ef59", "admin": direction, "createdByEmail": "usurpe@example.com"}, format="json")
        bad_color = self.client.post("/api/superadmin/schools", {
            "name": "Couleur", "slug": "couleur", "city": "Thiès", "primaryColor": "red;background:url(x)",
            "accentColor": "#d9ef59", "admin": {**direction, "email": "autre@nouvelle.test"}}, format="json")

        self.assertEqual(created.status_code, status.HTTP_201_CREATED)
        self.assertEqual(School.objects.get(slug="nouvelle").created_by_email, "admin@example.com")
        self.assertEqual(bad_color.status_code, status.HTTP_400_BAD_REQUEST)


class RegistrationRoleTests(AuthTestCase):
    """T13 : l'inscription publique ne crée que des comptes parent."""

    def test_T13_public_registration_cannot_choose_teacher(self):
        response = self.client.post("/api/auth/register", {
            "email": "prof@example.com", "password": PASSWORD, "role": "enseignant",
            "firstName": "Awa", "lastName": "Ndiaye", "phone": "77 123 45 67",
        }, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(User.objects.filter(email="prof@example.com").exists())

    def test_T13_admin_can_still_create_a_teacher(self):
        make_user("admin@example.com", User.ROLE_ADMIN)
        self.login("admin@example.com")

        response = self.client.post("/api/superadmin/accounts", {
            "email": "prof@example.com", "password": PASSWORD, "displayName": "Prof", "role": "enseignant",
        }, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(User.objects.get(email="prof@example.com").role, User.ROLE_TEACHER)

    def test_admin_cannot_assign_an_unknown_role(self):
        make_user("admin@example.com", User.ROLE_ADMIN)
        target = make_user("parent@example.com", User.ROLE_PARENT)
        self.login("admin@example.com")

        response = self.client.patch(f"/api/superadmin/accounts/{target.id}", {"role": "superhero"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class PasswordResetTests(AuthTestCase):
    """T14 : mot de passe oublié, sans énumération ni bruteforce du code."""

    def setUp(self):
        self.user = make_user("parent@example.com", User.ROLE_PARENT)

    def request_code(self, email="parent@example.com"):
        response = self.client.post("/api/auth/forgot-password", {"email": email}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        return response

    def sent_code(self):
        return re.search(r"\b(\d{6})\b", mail.outbox[-1].body).group(1)

    def reset(self, code, password="nouveau2026ok"):
        return self.client.post("/api/auth/reset-password", {
            "email": "parent@example.com", "code": code, "password": password,
        }, format="json")

    def test_T14_full_reset_flow(self):
        self.request_code()

        response = self.reset(self.sent_code())

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.login("parent@example.com", password="nouveau2026ok")

    def test_T14_unknown_email_gets_the_same_answer(self):
        known = self.request_code().data
        unknown = self.request_code("inconnu@example.com").data

        self.assertEqual(known, unknown)
        self.assertEqual(len(mail.outbox), 1)

    def test_T14_code_is_stored_hashed_and_not_in_subject(self):
        self.request_code()

        code = self.sent_code()
        self.assertNotEqual(PasswordResetCode.objects.get(user=self.user).code, code)
        self.assertNotIn(code, mail.outbox[-1].subject)

    def test_T14_code_is_invalidated_after_five_wrong_attempts(self):
        self.request_code()
        code = self.sent_code()
        wrong = "000000" if code != "000000" else "111111"

        for _ in range(PasswordResetCode.MAX_ATTEMPTS):
            self.assertEqual(self.reset(wrong).status_code, status.HTTP_400_BAD_REQUEST)

        self.assertEqual(self.reset(code).status_code, status.HTTP_400_BAD_REQUEST)

    def test_T14_code_is_single_use_and_weak_password_refused(self):
        self.request_code()
        code = self.sent_code()

        self.assertEqual(self.reset(code, password="12345678").status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(self.reset(code).status_code, status.HTTP_200_OK)
        self.assertEqual(self.reset(code).status_code, status.HTTP_400_BAD_REQUEST)

    def test_T14_reset_invalidates_existing_sessions(self):
        self.login("parent@example.com")
        self.request_code()

        self.reset(self.sent_code())

        self.assertEqual(self.client.get("/api/profile").status_code, status.HTTP_401_UNAUTHORIZED)


class EmailVerificationTests(AuthTestCase):
    """T15 : une adresse non vérifiée ne peut pas se connecter."""

    def register(self, email="nouveau@example.com"):
        return self.client.post("/api/auth/register", {
            "email": email, "password": "Baobab-Dakar-2026", "firstName": "Awa", "lastName": "Diop", "phone": "77 123 45 67", "acceptTerms": True,
        }, format="json")

    def sent_code(self):
        return re.search(r"\b(\d{6})\b", mail.outbox[-1].body).group(1)

    def verify(self, code, email="nouveau@example.com"):
        return self.client.post("/api/auth/verify-email", {"email": email, "code": code}, format="json")

    def test_T15_registration_sends_a_code_and_opens_no_session(self):
        response = self.register()

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(len(mail.outbox), 1)
        self.assertNotIn(self.sent_code(), mail.outbox[-1].subject)
        self.assertEqual(self.client.get("/api/profile").status_code, status.HTTP_401_UNAUTHORIZED)

    def test_T15_unverified_account_cannot_log_in(self):
        self.register()

        response = self.client.post("/api/auth/login", {"email": "nouveau@example.com",
                                                        "password": "Baobab-Dakar-2026"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertTrue(response.data["verificationRequired"])
        self.assertNotIn("keur_ia_session", response.cookies)

    def test_T15_wrong_password_does_not_reveal_verification_status(self):
        self.register()

        response = self.client.post("/api/auth/login", {"email": "nouveau@example.com",
                                                        "password": "mauvais-mdp-1"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertNotIn("verificationRequired", response.data)

    # Validation des inscriptions coupée (interrupteur) : l'ancien parcours, accès direct après le code. Avec la règle active,
    # voir test_registration_approval.py.
    @override_settings(PARENT_REGISTRATION_REQUIRES_APPROVAL=False)
    def test_T15_valid_code_verifies_and_logs_in(self):
        self.register()

        response = self.verify(self.sent_code())

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(User.objects.get(email="nouveau@example.com").email_verified)
        self.assertEqual(self.client.get("/api/profile").data["profile"]["email"], "nouveau@example.com")
        self.client.post("/api/auth/logout")
        self.login("nouveau@example.com", password="Baobab-Dakar-2026")

    def test_T15_code_is_limited_to_five_attempts_and_single_use(self):
        self.register()
        code = self.sent_code()
        wrong = "000000" if code != "000000" else "111111"

        for _ in range(EmailVerificationCode.MAX_ATTEMPTS):
            self.assertEqual(self.verify(wrong).status_code, status.HTTP_400_BAD_REQUEST)

        self.assertEqual(self.verify(code).status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(User.objects.get(email="nouveau@example.com").email_verified)

    def test_T15_resend_gives_a_new_code_and_same_answer_for_unknown_email(self):
        self.register()
        first = self.sent_code()

        known = self.client.post("/api/auth/resend-verification", {"email": "nouveau@example.com"}, format="json")
        unknown = self.client.post("/api/auth/resend-verification", {"email": "inconnu@example.com"}, format="json")

        self.assertEqual(known.data, unknown.data)
        self.assertEqual(len(mail.outbox), 2)
        second = self.sent_code()
        if first != second:
            self.assertEqual(self.verify(first).status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(self.verify(second).status_code, status.HTTP_200_OK)

    def test_T15_accounts_created_by_parent_or_admin_are_trusted(self):
        parent = make_user("parent@example.com", User.ROLE_PARENT)
        self.login("parent@example.com")
        self.client.post("/api/parent/children", {"email": "enfant@example.com", "password": "kids2026ok",
                                                  "displayName": "Enfant"}, format="json")

        self.assertTrue(parent.email_verified)
        self.assertTrue(User.objects.get(email="enfant@keuria.sn").email_verified)


class ParentDeletionTests(AuthTestCase):
    """T16 : supprimer un parent ne supprime plus ses enfants en silence."""

    def test_T16_parent_with_children_cannot_be_deleted(self):
        make_user("admin@example.com", User.ROLE_ADMIN)
        parent = make_user("parent@example.com", User.ROLE_PARENT)
        child = make_user("enfant@example.com", User.ROLE_STUDENT, parent=parent)
        self.login("admin@example.com")

        response = self.client.delete(f"/api/superadmin/accounts/{parent.id}")

        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)
        self.assertTrue(User.objects.filter(id=child.id).exists())
        self.assertTrue(User.objects.filter(id=parent.id).exists())

    def test_admin_cannot_delete_or_demote_themselves(self):
        admin = make_user("admin@example.com", User.ROLE_ADMIN)
        self.login("admin@example.com")

        delete = self.client.delete(f"/api/superadmin/accounts/{admin.id}")
        demote = self.client.patch(f"/api/superadmin/accounts/{admin.id}", {"role": "parent"}, format="json")

        self.assertEqual(delete.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(demote.status_code, status.HTTP_400_BAD_REQUEST)
        admin.refresh_from_db()
        self.assertEqual(admin.role, User.ROLE_ADMIN)


class AdminDashboardContractTests(AuthTestCase):
    def test_analytics_match_the_admin_client_contract(self):
        make_user("admin@example.com", User.ROLE_ADMIN)
        parent = make_user("parent@example.com", User.ROLE_PARENT)
        make_user("enfant@example.com", User.ROLE_STUDENT, parent=parent)
        self.login("admin@example.com")

        data = self.client.get("/api/superadmin/learners").data

        analytics = data["analytics"]
        for key in ("connectedToday", "activeWeek", "lessonsCompleted", "averageProgress", "alerts",
                    "roles", "recentConnections"):
            self.assertIn(key, analytics)
        self.assertEqual(analytics["roles"]["eleve"], 1)
        self.assertEqual([learner["email"] for learner in data["learners"]], ["enfant@example.com"])
