"""Correctifs de l'audit du 8 octobre : essais de code atomiques et suspension administrative exacte."""
from django.test import TestCase

from apps.accounts.models import PasswordResetCode, User
from apps.accounts.views import suspended_by_administration
from apps.superadmin.models import AuditLog


class OneTimeCodeAttemptsTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(email="parent@example.com", password="motdepasse123", role=User.ROLE_PARENT)

    def test_five_wrong_tries_close_the_code_even_for_the_right_one(self):
        code = PasswordResetCode.issue(self.user)
        wrong = "000000" if code != "000000" else "111111"
        for _ in range(PasswordResetCode.MAX_ATTEMPTS):
            self.assertFalse(PasswordResetCode.consume(self.user, wrong))
        self.assertFalse(PasswordResetCode.consume(self.user, code))
        self.assertFalse(PasswordResetCode.objects.filter(user=self.user).exists())

    def test_the_right_code_still_works_on_the_last_allowed_try(self):
        code = PasswordResetCode.issue(self.user)
        wrong = "000000" if code != "000000" else "111111"
        for _ in range(PasswordResetCode.MAX_ATTEMPTS - 1):
            PasswordResetCode.consume(self.user, wrong)
        self.assertTrue(PasswordResetCode.consume(self.user, code))
        self.assertFalse(PasswordResetCode.consume(self.user, code))  # usage unique


class AdministrativeSuspensionTests(TestCase):
    def setUp(self):
        self.admin = User.objects.create_user(email="admin@example.com", password="motdepasse123", role=User.ROLE_ADMIN)
        self.parent = User.objects.create_user(email="a@x.com", password="motdepasse123", role=User.ROLE_PARENT)
        self.other = User.objects.create_user(email="ba@x.com", password="motdepasse123", role=User.ROLE_PARENT)

    def log(self, action, email, verb):
        AuditLog.objects.create(actor=self.admin, actor_email=self.admin.email, action=action, label=f"Compte {email} {verb}")

    def test_no_decision_means_not_suspended(self):
        self.assertFalse(suspended_by_administration(self.parent))

    def test_a_deactivation_suspends_only_that_account(self):
        self.log('compte_desactive', 'ba@x.com', 'désactivé')
        self.assertTrue(suspended_by_administration(self.other))
        self.assertFalse(suspended_by_administration(self.parent))  # « a@x.com » est contenu dans « ba@x.com » : pas de faux positif

    def test_a_later_reactivation_lifts_the_suspension(self):
        self.log('compte_desactive', 'a@x.com', 'désactivé')
        self.log('compte_reactive', 'a@x.com', 'réactivé')
        self.assertFalse(suspended_by_administration(self.parent))

    def test_a_new_deactivation_after_a_reactivation_suspends_again(self):
        self.log('compte_desactive', 'a@x.com', 'désactivé')
        self.log('compte_reactive', 'a@x.com', 'réactivé')
        self.log('compte_desactive', 'a@x.com', 'désactivé')
        self.assertTrue(suspended_by_administration(self.parent))
