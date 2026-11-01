"""Durée des sessions : fin à la fermeture du navigateur, et expiration après inactivité des comptes d'administration."""
import time

from django.conf import settings
from django.core import mail
from django.test import override_settings
from rest_framework import status
from rest_framework.test import APIClient, APITestCase

from apps.accounts.authentication import LAST_ACTIVITY_KEY
from apps.accounts.models import User
from apps.schools.models import School

PASSWORD = "motdepasse123"
COOKIE = settings.SESSION_COOKIE_NAME


def cookie_lifetime(response):
    """Valeur « Max-Age » du cookie de session : vide pour un cookie qui disparaît à la fermeture du navigateur."""
    return response.cookies[COOKIE]["max-age"]


class SessionEndsWithTheBrowserTests(APITestCase):
    """Aucune option « rester connecté » : sur un ordinateur partagé, on ne reste jamais connecté par oubli."""

    def setUp(self):
        self.user = User.objects.create_user(email="parent@example.com", password=PASSWORD, role=User.ROLE_PARENT)

    def _login(self, **extra):
        return self.client.post("/api/auth/login", {"email": "parent@example.com", "password": PASSWORD, **extra}, format="json")

    def test_login_gives_a_cookie_that_ends_with_the_browser(self):
        response = self._login()
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(cookie_lifetime(response), "")  # pas de Max-Age : cookie de session
        self.assertTrue(self.client.session.get_expire_at_browser_close())

    def test_a_client_cannot_ask_for_a_longer_session(self):
        for flag in (True, "true", "on", 1):
            client = APIClient()
            response = client.post("/api/auth/login", {"email": "parent@example.com", "password": PASSWORD, "rememberMe": flag}, format="json")
            self.assertEqual(cookie_lifetime(response), "", flag)
            self.assertTrue(client.session.get_expire_at_browser_close(), flag)

    def test_two_factor_login_also_ends_with_the_browser(self):
        from apps.progress.models import ParentalLimits
        ParentalLimits.objects.create(parent=self.user, child=None, two_factor=True)
        first = self._login()
        self.assertEqual(first.status_code, status.HTTP_202_ACCEPTED)
        self.assertNotIn(COOKIE, first.cookies)  # pas de session avant le code
        code = next(line for line in mail.outbox[-1].body.split() if line.isdigit() and len(line) == 6)
        second = self.client.post("/api/auth/login-2fa", {"email": "parent@example.com", "code": code, "rememberMe": True}, format="json")
        self.assertEqual(second.status_code, status.HTTP_200_OK, second.data)
        self.assertEqual(cookie_lifetime(second), "")


@override_settings(ADMIN_IDLE_TIMEOUT_MINUTES=30, USER_IDLE_TIMEOUT_MINUTES=120)
class IdleTimeoutTests(APITestCase):
    def _login_as(self, role, email):
        # Un enseignant ou un administrateur d'école est toujours rattaché à une école (sinon la connexion est refusée).
        school = School.objects.create(name="École", slug=f"ecole-{email.split('@')[0]}") if role in (User.ROLE_TEACHER, User.ROLE_SCHOOL_ADMIN) else None
        User.objects.create_user(email=email, password=PASSWORD, role=role, school=school)
        client = APIClient()
        self.assertEqual(client.post("/api/auth/login", {"email": email, "password": PASSWORD}, format="json").status_code, 200)
        return client

    def _go_idle(self, client, minutes):
        """Simule `minutes` minutes sans aucune action."""
        session = client.session
        session[LAST_ACTIVITY_KEY] = int(time.time()) - minutes * 60
        session.save()

    def test_login_starts_the_countdown(self):
        client = self._login_as(User.ROLE_PARENT, "parent@example.com")
        self.assertLess(int(time.time()) - client.session[LAST_ACTIVITY_KEY], 5)

    def test_an_idle_admin_is_logged_out_and_the_session_is_destroyed(self):
        admin = self._login_as(User.ROLE_ADMIN, "admin@example.com")
        self.assertEqual(admin.get("/api/superadmin/dashboard").status_code, status.HTTP_200_OK)
        self._go_idle(admin, 31)

        response = admin.get("/api/superadmin/dashboard")

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertIn("inactivité", response.json()["detail"])
        # La session n'est pas seulement ignorée : elle n'existe plus.
        self.assertEqual(admin.get("/api/profile").status_code, status.HTTP_401_UNAUTHORIZED)

    def test_school_admin_is_limited_like_an_admin(self):
        direction = self._login_as(User.ROLE_SCHOOL_ADMIN, "direction@example.com")
        self._go_idle(direction, 45)
        self.assertEqual(direction.get("/api/profile").status_code, status.HTTP_401_UNAUTHORIZED)

    def test_parent_teacher_and_student_get_the_longer_limit(self):
        for role, email in ((User.ROLE_PARENT, "parent@example.com"), (User.ROLE_TEACHER, "prof@example.com"),
                            (User.ROLE_STUDENT, "eleve@example.com")):
            client = self._login_as(role, email)
            self._go_idle(client, 119)
            self.assertEqual(client.get("/api/profile").status_code, status.HTTP_200_OK, f"{role} à 119 min")
            self._go_idle(client, 121)
            self.assertEqual(client.get("/api/profile").status_code, status.HTTP_401_UNAUTHORIZED, f"{role} à 121 min")

    def test_the_activity_signal_keeps_the_session_alive(self):
        parent = self._login_as(User.ROLE_PARENT, "parent@example.com")
        for _ in range(3):  # trois pauses de 100 min : 5 h au total, mais jamais plus de 2 h sans action
            self._go_idle(parent, 100)
            ping = parent.post("/api/auth/activity")
            self.assertEqual(ping.status_code, status.HTTP_200_OK)
            self.assertEqual(ping.json(), {"active": True})
        self.assertEqual(parent.get("/api/profile").status_code, status.HTTP_200_OK)

    def test_background_requests_do_not_keep_the_session_alive(self):
        """Un onglet oublié ouvert qui interroge le serveur toutes les 10 s doit quand même finir par expirer."""
        parent = self._login_as(User.ROLE_PARENT, "parent@example.com")
        self._go_idle(parent, 90)
        before = parent.session[LAST_ACTIVITY_KEY]
        for _ in range(3):
            self.assertEqual(parent.get("/api/progress/notifications").status_code, status.HTTP_200_OK)
        self.assertEqual(parent.session[LAST_ACTIVITY_KEY], before)  # le compte à rebours n'a pas bougé

    def test_the_signal_works_under_csrf_protection_like_in_a_browser(self):
        """Le client de test saute le contrôle CSRF ; le navigateur, non : le frontend envoie le jeton dans X-CSRFToken."""
        User.objects.create_user(email="parent@example.com", password=PASSWORD, role=User.ROLE_PARENT)
        browser = APIClient(enforce_csrf_checks=True)
        token = browser.get("/api/auth/csrf").cookies["csrftoken"].value
        login = browser.post("/api/auth/login", {"email": "parent@example.com", "password": PASSWORD}, format="json", HTTP_X_CSRFTOKEN=token)
        self.assertEqual(login.status_code, status.HTTP_200_OK)
        token = browser.cookies["csrftoken"].value  # le jeton tourne à la connexion
        self.assertEqual(browser.post("/api/auth/activity").status_code, status.HTTP_403_FORBIDDEN)  # sans jeton : refusé
        ping = browser.post("/api/auth/activity", HTTP_X_CSRFTOKEN=token)
        self.assertEqual(ping.status_code, status.HTTP_200_OK)
        self.assertEqual(ping.json(), {"active": True})

    def test_the_signal_is_refused_once_the_session_has_expired(self):
        parent = self._login_as(User.ROLE_PARENT, "parent@example.com")
        self._go_idle(parent, 121)
        self.assertEqual(parent.post("/api/auth/activity").status_code, status.HTTP_401_UNAUTHORIZED)

    def test_the_signal_is_harmless_for_a_visitor(self):
        response = APIClient().post("/api/auth/activity")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.json(), {"active": False})

    @override_settings(ADMIN_IDLE_TIMEOUT_MINUTES=0, USER_IDLE_TIMEOUT_MINUTES=0)
    def test_zero_disables_the_limits(self):
        for role, email in ((User.ROLE_ADMIN, "admin@example.com"), (User.ROLE_PARENT, "parent@example.com")):
            client = self._login_as(role, email)
            self._go_idle(client, 24 * 60)
            self.assertEqual(client.get("/api/profile").status_code, status.HTTP_200_OK, role)

    def test_existing_session_without_a_timestamp_gets_one(self):
        parent = self._login_as(User.ROLE_PARENT, "parent@example.com")
        session = parent.session
        session.pop(LAST_ACTIVITY_KEY, None)
        session.save()
        self.assertEqual(parent.get("/api/profile").status_code, status.HTTP_200_OK)
        self.assertIn(LAST_ACTIVITY_KEY, parent.session)
