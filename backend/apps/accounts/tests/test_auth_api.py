from rest_framework import status
from rest_framework.test import APITestCase

from apps.accounts.models import User


class RegisterViewTests(APITestCase):
    url = "/api/auth/register"

    def test_register_creates_unverified_parent_without_session(self):
        response = self.client.post(self.url, {
            "email": "nouveau@example.com",
            "password": "motdepasse123",
            "firstName": "Awa",
            "lastName": "Ndiaye",
            "phone": "77 123 45 67",
            "acceptTerms": True,
        })

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(response.data["verificationRequired"])
        self.assertNotIn("keur_ia_session", response.cookies)

        user = User.objects.get(email="nouveau@example.com")
        self.assertEqual(user.display_name, "Awa Ndiaye")
        self.assertEqual((user.parent_profile.first_name, user.parent_profile.phone), ("Awa", "77 123 45 67"))
        self.assertEqual(user.role, "parent")
        self.assertEqual(user.parent_profile.parent_role, "pere")
        self.assertFalse(user.email_verified)

    def test_register_with_parent_role_and_child(self):
        response = self.client.post(self.url, {
            "email": "mere-famille@example.com",
            "password": "motdepasse123",
            "firstName": "Fatou",
            "lastName": "Diallo",
            "phone": "77 222 33 44",
            "parentRole": "mere",
            "childFirstName": "Aminata",
            "childGender": "fille",
            "childAge": 8,
            "acceptTerms": True,
        })

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        parent = User.objects.get(email="mere-famille@example.com")
        self.assertEqual(parent.parent_profile.parent_role, "mere")
        self.assertEqual(parent.gender, "mere")

        # Vérification de l'enfant créé
        child = parent.children.first()
        self.assertIsNotNone(child)
        self.assertTrue(child.display_name.startswith("Aminata"))
        self.assertEqual(child.gender, "fille")
        self.assertEqual(child.age_group, "7-9")
        self.assertEqual(child.learner_profile.gender, "fille")
        self.assertEqual(child.learner_profile.avatar, "exploratrice-awa")

    def test_register_with_tuteur_and_garcon(self):
        response = self.client.post(self.url, {
            "email": "tuteur-famille@example.com",
            "password": "motdepasse123",
            "firstName": "Moussa",
            "lastName": "Ba",
            "phone": "77 333 44 55",
            "parentRole": "tuteur",
            "childFirstName": "Ibrahima",
            "childGender": "garcon",
            "childAge": 11,
            "acceptTerms": True,
        })

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        parent = User.objects.get(email="tuteur-famille@example.com")
        self.assertEqual(parent.parent_profile.parent_role, "tuteur")

        child = parent.children.first()
        self.assertIsNotNone(child)
        self.assertEqual(child.gender, "garcon")
        self.assertEqual(child.age_group, "10-12")
        self.assertEqual(child.learner_profile.avatar, "explorateur-moussa")

    def test_register_rejects_duplicate_email(self):
        User.objects.create_user(email="dupe@example.com", password="motdepasse123")

        response = self.client.post(self.url, {
            "email": "dupe@example.com",
            "password": "autremotdepasse1",
            "firstName": "Awa", "lastName": "Ndiaye", "phone": "77 123 45 67",
        })

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_register_rejects_password_too_short(self):
        response = self.client.post(self.url, {
            "email": "court@example.com",
            "password": "abc",
            "firstName": "Awa", "lastName": "Ndiaye", "phone": "77 123 45 67",
        })

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(User.objects.filter(email="court@example.com").exists())

    def test_register_cannot_self_assign_admin_role(self):
        response = self.client.post(self.url, {
            "email": "wannabe-admin@example.com",
            "password": "motdepasse123",
            "role": "admin",
            "firstName": "Awa", "lastName": "Ndiaye", "phone": "77 123 45 67",
        })

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(User.objects.filter(email="wannabe-admin@example.com").exists())

    def test_register_requires_valid_phone_and_names(self):
        base = {"email": "tel@example.com", "password": "motdepasse123", "firstName": "Awa", "lastName": "Ndiaye"}
        cases = [
            ({**base}, "Le téléphone est obligatoire."),
            ({**base, "phone": "abc"}, "Le numéro de téléphone n'est pas valide (ex. 77 123 45 67)."),
            ({**base, "phone": "77 12"}, "Le numéro de téléphone n'est pas valide (ex. 77 123 45 67)."),
            ({**base, "phone": "77 123 45 67", "firstName": ""}, "Le prénom est obligatoire."),
            ({**base, "phone": "77 123 45 67", "lastName": " "}, "Le nom est obligatoire."),
        ]
        for payload, message in cases:
            response = self.client.post(self.url, payload, format="json")
            self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST, payload)
            self.assertEqual(response.data["error"], message)
        self.assertFalse(User.objects.filter(email="tel@example.com").exists())


class LoginViewTests(APITestCase):
    url = "/api/auth/login"

    def setUp(self):
        self.user = User.objects.create_user(
            email="parent@example.com", password="motdepasse123", role="parent"
        )

    def test_login_success_sets_session_cookie_and_increments_login_count(self):
        response = self.client.post(self.url, {
            "email": "parent@example.com",
            "password": "motdepasse123",
        })

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["role"], "parent")
        self.assertIn("keur_ia_session", response.cookies)

        self.user.refresh_from_db()
        self.assertEqual(self.user.login_count, 1)

    def test_login_with_identifier_that_is_not_an_email_is_a_plain_failure(self):
        response = self.client.post(self.url, {"email": "adja.camara", "password": "motdepasse123"})

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(response.data["error"], "Identifiant ou mot de passe incorrect.")

    def test_login_wrong_password_returns_401(self):
        response = self.client.post(self.url, {
            "email": "parent@example.com",
            "password": "mauvais-mot-de-passe",
        })

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_login_unknown_email_returns_401(self):
        response = self.client.post(self.url, {
            "email": "inconnu@example.com",
            "password": "peu-importe",
        })

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class LogoutViewTests(APITestCase):
    def test_logout_post_clears_session_cookie(self):
        User.objects.create_user(email="parent@example.com", password="motdepasse123")
        self.client.post("/api/auth/login", {
            "email": "parent@example.com",
            "password": "motdepasse123",
        })

        response = self.client.post("/api/auth/logout")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.cookies["keur_ia_session"].value, "")

    def test_logout_does_not_accept_get(self):
        response = self.client.get("/api/auth/logout")

        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)


class ProfileViewTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="profil@example.com", password="motdepasse123", display_name="Ndeye"
        )

    def _login(self):
        self.client.post("/api/auth/login", {
            "email": "profil@example.com",
            "password": "motdepasse123",
        })

    def test_get_profile_without_session_is_refused(self):
        response = self.client.get("/api/profile")

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_get_profile_with_session_returns_user_data(self):
        self._login()

        response = self.client.get("/api/profile")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["profile"]["email"], "profil@example.com")
        self.assertEqual(response.data["profile"]["displayName"], "Ndeye")

    def test_put_profile_updates_display_name(self):
        self._login()

        response = self.client.put("/api/profile", {"displayName": "Nouveau Nom"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertEqual(self.user.display_name, "Nouveau Nom")

    def test_put_profile_saves_avatar_on_learner_profile(self):
        from apps.learners.models import LearnerProfile
        student = User.objects.create_user(
            email="eleve@example.com", password="motdepasse123", display_name="Awa", role="eleve"
        )
        LearnerProfile.objects.create(learner=student, owner_email="parent@example.com")
        self.client.post("/api/auth/login", {"email": "eleve@example.com", "password": "motdepasse123"})

        response = self.client.put("/api/profile", {"displayName": "Awa", "avatar": "robot-nova"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["profile"]["avatar"], "robot-nova")
        student.learner_profile.refresh_from_db()
        self.assertEqual(student.learner_profile.avatar, "robot-nova")

    def test_put_profile_refuses_unknown_avatar(self):
        self._login()

        response = self.client.put("/api/profile", {"displayName": "Ndeye", "avatar": "🦊"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_put_profile_without_session_returns_401(self):
        response = self.client.put("/api/profile", {"displayName": "X"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_put_profile_updates_email(self):
        self._login()
        response = self.client.put("/api/profile", {"email": "nouveau.email@example.com"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertEqual(self.user.email, "nouveau.email@example.com")
        self.assertEqual(response.data["profile"]["email"], "nouveau.email@example.com")

    def test_put_profile_refuses_duplicate_email(self):
        User.objects.create_user(email="existant@example.com", password="password123")
        self._login()
        response = self.client.put("/api/profile", {"email": "existant@example.com"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.user.refresh_from_db()
        self.assertEqual(self.user.email, "profil@example.com")

    def test_put_profile_refuses_student_email_change(self):
        User.objects.create_user(email="eleve2@example.com", password="motdepasse123", role="eleve")
        self.client.post("/api/auth/login", {"email": "eleve2@example.com", "password": "motdepasse123"})
        response = self.client.put("/api/profile", {"email": "autre@example.com"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_put_profile_updates_both_name_and_email(self):
        self._login()
        response = self.client.put(
            "/api/profile",
            {"displayName": "Aida Ndiaye", "email": "aida.ndiaye@example.com"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertEqual(self.user.display_name, "Aida Ndiaye")
        self.assertEqual(self.user.email, "aida.ndiaye@example.com")


class AdminUsersViewTests(APITestCase):
    """Gestion des comptes par l'équipe kEur IA (espace super admin)."""
    url = "/api/superadmin/accounts"

    def setUp(self):
        self.admin = User.objects.create_user(
            email="admin@example.com", password="motdepasse123", role="admin"
        )
        self.parent = User.objects.create_user(
            email="parent@example.com", password="motdepasse123", role="parent"
        )

    def test_anonymous_request_is_unauthorized(self):
        response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_non_admin_request_is_forbidden(self):
        self.client.post("/api/auth/login", {
            "email": "parent@example.com",
            "password": "motdepasse123",
        })

        response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_can_list_users(self):
        self.client.post("/api/auth/login", {
            "email": "admin@example.com",
            "password": "motdepasse123",
        })

        response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        emails = {u["email"] for u in response.data["results"]}
        self.assertIn("admin@example.com", emails)
        self.assertIn("parent@example.com", emails)

    def test_admin_can_create_user(self):
        self.client.post("/api/auth/login", {
            "email": "admin@example.com",
            "password": "motdepasse123",
        })

        response = self.client.post(self.url, {
            "email": "cree-par-admin@example.com",
            "password": "motdepasse123",
            "displayName": "Créé par admin",
            "role": "enseignant",
        }, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(User.objects.filter(email="cree-par-admin@example.com").exists())

    def test_admin_can_delete_user(self):
        self.client.post("/api/auth/login", {
            "email": "admin@example.com",
            "password": "motdepasse123",
        })

        response = self.client.delete(f"{self.url}/{self.parent.id}")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(User.objects.filter(id=self.parent.id).exists())

