"""Inscription d'un parent : l'équipe kEur IA doit accepter la demande avant tout accès (apps/accounts/approval.py)."""
import re

from django.core import mail
from django.core.cache import cache
from django.test import override_settings
from rest_framework import status
from rest_framework.test import APIClient, APITestCase

from apps.accounts.models import User
from apps.schools.models import School
from apps.superadmin.models import AuditLog

PASSWORD = "Baobab-Dakar-2026"
EMAIL = "nouveau@example.com"


class RegistrationApprovalTests(APITestCase):
    def setUp(self):
        super().setUp()
        cache.clear()
        self.admin = User.objects.create_user(email="admin@keuria.sn", password=PASSWORD, role=User.ROLE_ADMIN, email_verified=True)

    def tearDown(self):
        cache.clear()
        super().tearDown()

    # ─── aides ────────────────────────────────────────────────────────────────

    def register(self, email=EMAIL, child=True):
        payload = {"email": email, "password": PASSWORD, "firstName": "Awa", "lastName": "Diop", "phone": "77 123 45 67",
                   "acceptTerms": True}
        if child:
            payload.update({"childFirstName": "Fatou", "childAge": 8, "childGender": "fille"})
        return self.client.post("/api/auth/register", payload, format="json")

    def verify(self, email=EMAIL):
        code = re.search(r"\b(\d{6})\b", mail.outbox[-1].body).group(1)
        return self.client.post("/api/auth/verify-email", {"email": email, "code": code}, format="json")

    def login(self, email=EMAIL, client=None, **extra):
        cache.clear()
        return (client or self.client).post("/api/auth/login", {"email": email, "password": PASSWORD, **extra}, format="json")

    def admin_client(self):
        client = APIClient()
        cache.clear()
        response = client.post("/api/auth/login", {"email": "admin@keuria.sn", "password": PASSWORD, "expectedRole": "admin"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        return client

    def pending_parent(self):
        self.register()
        self.verify()
        return User.objects.get(email=EMAIL)

    # ─── inscription et connexion d'un parent en attente ──────────────────────

    def test_new_parent_starts_pending_and_is_told_so(self):
        response = self.register()

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(response.data["approvalRequired"])
        self.assertEqual(User.objects.get(email=EMAIL).approval_status, User.APPROVAL_PENDING)

    def test_verifying_the_email_opens_no_session_while_pending(self):
        self.register()

        response = self.verify()

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["pendingApproval"])
        self.assertNotIn("keur_ia_session", response.cookies)
        self.assertEqual(self.client.get("/api/profile").status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertTrue(User.objects.get(email=EMAIL).email_verified)

    def test_pending_parent_cannot_log_in(self):
        self.pending_parent()

        response = self.login()

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertTrue(response.data["pendingApproval"])
        self.assertNotIn("keur_ia_session", response.cookies)

    def test_wrong_password_does_not_reveal_that_the_account_is_pending(self):
        self.pending_parent()
        cache.clear()

        response = self.client.post("/api/auth/login", {"email": EMAIL, "password": "mauvais-mdp-1"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertNotIn("pendingApproval", response.data)

    def test_children_of_a_pending_parent_cannot_log_in_either(self):
        self.pending_parent()
        child = User.objects.get(role=User.ROLE_STUDENT)

        response = self.login(child.email)

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertTrue(response.data["pendingApproval"])
        self.assertNotIn("email", response.data)

    def test_a_school_student_linked_to_a_pending_parent_is_not_blocked(self):
        parent = self.pending_parent()
        school = School.objects.create(name="École Test", slug="ecole-test")
        pupil = User.objects.create_user(email="eleve@ecole.keuria.sn", password=PASSWORD, role=User.ROLE_STUDENT,
                                         parent=parent, school=school, email_verified=True)

        self.assertEqual(self.login(pupil.email).status_code, status.HTTP_200_OK)

    # ─── décision de l'équipe ─────────────────────────────────────────────────

    def test_admin_lists_pending_requests_with_child_and_counts(self):
        self.pending_parent()
        client = self.admin_client()

        response = client.get("/api/superadmin/registrations")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["counts"], {"pending": 1, "approved": 0, "rejected": 0})
        row = response.data["results"][0]
        self.assertEqual((row["email"], row["firstName"], row["phone"], row["parentRole"]), (EMAIL, "Awa", "77 123 45 67", "pere"))
        self.assertEqual(row["child"]["name"], "Fatou Diop")
        self.assertTrue(row["emailVerified"])

    def test_grandfathered_and_team_created_parents_are_not_requests(self):
        User.objects.create_user(email="ancien@example.com", password=PASSWORD, role=User.ROLE_PARENT, email_verified=True)
        client = self.admin_client()

        data = client.get("/api/superadmin/registrations?status=approved").data

        self.assertEqual(data["total"], 0)
        self.assertEqual(data["counts"]["approved"], 0)

    def test_approving_lets_the_parent_and_the_children_in_and_emails_them(self):
        parent = self.pending_parent()
        client = self.admin_client()
        mail.outbox.clear()

        response = client.post(f"/api/superadmin/registrations/{parent.id}/approve")

        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        self.assertEqual(response.data["status"], "approved")
        self.assertTrue(response.data["emailSent"])
        self.assertEqual(mail.outbox[-1].to, [EMAIL])
        parent.refresh_from_db()
        self.assertEqual((parent.approval_decided_by_id, parent.approval_status), (self.admin.id, User.APPROVAL_APPROVED))
        self.assertIsNotNone(parent.approval_decided_at)
        self.assertTrue(AuditLog.objects.filter(action="inscription_parent_acceptee", label__contains=EMAIL).exists())
        self.assertEqual(self.login().status_code, status.HTTP_200_OK)
        child = User.objects.get(role=User.ROLE_STUDENT)
        self.assertEqual(self.login(child.email, client=APIClient()).status_code, status.HTTP_200_OK)

    def test_rejecting_blocks_the_parent_with_the_reason(self):
        parent = self.pending_parent()
        client = self.admin_client()
        mail.outbox.clear()

        response = client.post(f"/api/superadmin/registrations/{parent.id}/reject", {"note": "Numéro de téléphone injoignable"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        self.assertEqual(response.data["status"], "rejected")
        self.assertIn("injoignable", mail.outbox[-1].body)
        refused = self.login()
        self.assertEqual(refused.status_code, status.HTTP_403_FORBIDDEN)
        self.assertTrue(refused.data["registrationRejected"])
        self.assertIn("injoignable", refused.data["error"])
        self.assertTrue(AuditLog.objects.filter(action="inscription_parent_refusee").exists())

    def test_a_rejected_request_can_be_accepted_later_but_not_the_other_way_round(self):
        parent = self.pending_parent()
        client = self.admin_client()
        client.post(f"/api/superadmin/registrations/{parent.id}/reject", {"note": ""}, format="json")

        self.assertEqual(client.post(f"/api/superadmin/registrations/{parent.id}/reject", {}, format="json").status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(client.post(f"/api/superadmin/registrations/{parent.id}/approve").status_code, status.HTTP_200_OK)
        self.assertEqual(client.post(f"/api/superadmin/registrations/{parent.id}/approve").status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(client.post(f"/api/superadmin/registrations/{parent.id}/reject", {}, format="json").status_code, status.HTTP_400_BAD_REQUEST)

    def test_only_the_team_can_decide(self):
        parent = self.pending_parent()
        other = User.objects.create_user(email="autre@example.com", password=PASSWORD, role=User.ROLE_PARENT, email_verified=True)
        client = APIClient()
        client.force_authenticate(other)

        self.assertEqual(client.get("/api/superadmin/registrations").status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(client.post(f"/api/superadmin/registrations/{parent.id}/approve").status_code, status.HTTP_403_FORBIDDEN)
        parent.refresh_from_db()
        self.assertEqual(parent.approval_status, User.APPROVAL_PENDING)

    def test_dashboard_reminds_the_team_of_waiting_requests(self):
        self.pending_parent()

        todo = self.admin_client().get("/api/superadmin/dashboard").data["toHandle"]

        self.assertTrue(any(item["href"] == "/admin/inscriptions" for item in todo), todo)

    # ─── interrupteur ─────────────────────────────────────────────────────────

    @override_settings(PARENT_REGISTRATION_REQUIRES_APPROVAL=False)
    def test_switch_off_registers_parents_as_accepted(self):
        response = self.register()

        self.assertFalse(response.data["approvalRequired"])
        self.assertEqual(User.objects.get(email=EMAIL).approval_status, User.APPROVAL_APPROVED)
        self.verify()
        self.assertEqual(self.client.get("/api/profile").status_code, status.HTTP_200_OK)
