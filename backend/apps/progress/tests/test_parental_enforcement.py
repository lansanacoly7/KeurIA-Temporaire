from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from apps.progress.models import DailyUsage, ParentalLimits, Progress, ScreenTimeCredit
from apps.progress.tests.helpers import make_lesson

User = get_user_model()
LIMITS = '/api/progress/parental-limits'
UNLOCK = '/api/progress/parental-limits/unlock'
LESSON = 'p1-1'


class ParentalEnforcementTests(APITestCase):
    """Le contrôle parental est appliqué par le serveur (l'interface seule ne suffit pas)."""

    def setUp(self):
        cache.clear()
        make_lesson(LESSON, xp=20)
        self.parent = User.objects.create_user(
            email='p@example.com', password='parent_password_123', role=User.ROLE_PARENT, display_name='Parent')
        self.child = User.objects.create_user(
            email='c@example.com', password='child_password_123', role=User.ROLE_STUDENT,
            display_name='Enfant', parent=self.parent)
        self.other_parent = User.objects.create_user(
            email='p2@example.com', password='parent_password_123', role=User.ROLE_PARENT, display_name='Autre')
        self.other_child = User.objects.create_user(
            email='c2@example.com', password='child_password_123', role=User.ROLE_STUDENT,
            display_name='Autre enfant', parent=self.other_parent)

    def _limit_reached(self, minutes_used=50, limit=30):
        ParentalLimits.objects.create(parent=self.parent, child=self.child, strict_time_limit=True, daily_limit_minutes=limit)
        DailyUsage.objects.create(user=self.child, owner_email=self.child.email, usage_date=timezone.localdate(),
                                  age_track='10-12', minutes=minutes_used)

    # -- Application côté serveur ---------------------------------------------
    def test_locked_child_cannot_record_progress(self):
        self._limit_reached()
        self.client.force_authenticate(user=self.child)

        res = self.client.post('/api/progress', {'lessonId': LESSON, 'score': 100}, format='json')

        self.assertEqual(res.status_code, status.HTTP_423_LOCKED)
        self.assertEqual(res.data['lockReason'], 'limit_exceeded')
        self.assertFalse(Progress.objects.filter(user=self.child).exists())

    def test_locked_child_cannot_add_usage_minutes(self):
        self._limit_reached()
        self.client.force_authenticate(user=self.child)

        res = self.client.post('/api/daily-usage', {'kind': 'minute'}, format='json')

        self.assertEqual(res.status_code, status.HTTP_423_LOCKED)
        self.assertEqual(DailyUsage.objects.get(user=self.child).minutes, 50)

    def test_unlimited_child_still_records_progress(self):
        self.client.force_authenticate(user=self.child)

        res = self.client.post('/api/progress', {'lessonId': LESSON, 'score': 100}, format='json')

        self.assertEqual(res.status_code, status.HTTP_201_CREATED)

    def test_child_under_the_limit_is_not_locked(self):
        self._limit_reached(minutes_used=10, limit=30)
        self.client.force_authenticate(user=self.child)

        res = self.client.post('/api/progress', {'lessonId': LESSON, 'score': 100}, format='json')

        self.assertEqual(res.status_code, status.HTTP_201_CREATED)

    # -- Octroi de temps par le parent ------------------------------------------
    def test_parent_grant_is_persisted_and_unlocks_child_without_rewriting_usage(self):
        self._limit_reached(minutes_used=50, limit=30)
        self.client.force_authenticate(user=self.parent)

        res = self.client.post(UNLOCK, {'childId': self.child.id, 'extraMinutes': 30}, format='json')

        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(ScreenTimeCredit.objects.get(child=self.child).minutes, 30)
        self.assertEqual(DailyUsage.objects.get(user=self.child).minutes, 50)  # l'historique réel n'est jamais falsifié
        self.client.force_authenticate(user=self.child)
        self.assertFalse(self.client.get(LIMITS).data['isLocked'])

    def test_parent_cannot_grant_time_to_a_child_of_another_household(self):
        self.client.force_authenticate(user=self.parent)

        res = self.client.post(UNLOCK, {'childId': self.other_child.id, 'extraMinutes': 15}, format='json')

        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)

    def test_grant_rejects_invalid_values_without_crashing(self):
        self.client.force_authenticate(user=self.parent)

        for bad in ('abc', -5, 0, 9999, None, [1]):
            res = self.client.post(UNLOCK, {'childId': self.child.id, 'extraMinutes': bad}, format='json')
            self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST, bad)
        res = self.client.post(UNLOCK, {'childId': 'x', 'extraMinutes': 15}, format='json')
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)

    # -- Mot de passe parent saisi par l'enfant ---------------------------------
    def test_child_unlock_with_right_password_grants_a_credit(self):
        self._limit_reached(minutes_used=50, limit=30)
        self.client.force_authenticate(user=self.child)

        res = self.client.post(UNLOCK, {'parentPassword': 'parent_password_123'}, format='json')

        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(ScreenTimeCredit.objects.get(child=self.child).minutes, 15)
        self.assertEqual(DailyUsage.objects.get(user=self.child).minutes, 50)
        self.assertFalse(self.client.get(LIMITS).data['isLocked'])

    def test_child_cannot_bruteforce_parent_password(self):
        self.client.force_authenticate(user=self.child)

        for _ in range(5):
            res = self.client.post(UNLOCK, {'parentPassword': 'faux'}, format='json')
            self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)
        blocked = self.client.post(UNLOCK, {'parentPassword': 'parent_password_123'}, format='json')

        self.assertEqual(blocked.status_code, status.HTTP_429_TOO_MANY_REQUESTS)

    def test_successful_unlock_resets_the_failure_counter(self):
        self.client.force_authenticate(user=self.child)
        for _ in range(4):
            self.client.post(UNLOCK, {'parentPassword': 'faux'}, format='json')

        ok = self.client.post(UNLOCK, {'parentPassword': 'parent_password_123'}, format='json')
        again = self.client.post(UNLOCK, {'parentPassword': 'faux'}, format='json')

        self.assertEqual(ok.status_code, status.HTTP_200_OK)
        self.assertEqual(again.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_non_string_password_is_rejected_cleanly(self):
        self.client.force_authenticate(user=self.child)

        res = self.client.post(UNLOCK, {'parentPassword': {'a': 1}}, format='json')

        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)  # requête mal formée, jamais une erreur 500
        self.assertFalse(ScreenTimeCredit.objects.exists())

    # -- Validation des réglages --------------------------------------------------
    def test_settings_reject_bad_values_with_400_not_500(self):
        self.client.force_authenticate(user=self.parent)

        for payload in ({'dailyLimitMinutes': 'abc'}, {'dailyLimitMinutes': -1}, {'dailyLimitMinutes': 99999},
                        {'bedtimeStart': '25:99'}, {'bedtimeEnd': 'minuit'}):
            res = self.client.post(LIMITS, payload, format='json')
            self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST, payload)
        res = self.client.post(LIMITS, {'childId': 'abc'}, format='json')
        self.assertIn(res.status_code, (status.HTTP_400_BAD_REQUEST, status.HTTP_404_NOT_FOUND))

    def test_two_factor_setting_is_stored(self):
        # La double authentification est réellement appliquée à la connexion (voir accounts/tests/test_hardening.py).
        self.client.force_authenticate(user=self.parent)

        res = self.client.post(LIMITS, {'twoFactor': True}, format='json')

        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertTrue(res.data['limits']['twoFactor'])
