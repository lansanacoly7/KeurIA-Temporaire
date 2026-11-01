from datetime import timedelta

from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from apps.accounts.models import User

from ..models import ParentLinkCode, ParentProfile
from .helpers import PASSWORD, build_school


from django.core.cache import cache

class ParentLinkTests(APITestCase):
    def setUp(self):
        cache.clear()
        self.data = build_school()
        self.student = self.data['students'][0]
        self.parent = User.objects.create_user('maman@example.com', PASSWORD, role=User.ROLE_PARENT, display_name='Maman')
        self.client.force_login(self.data['admin'])
        self.code = self.client.post(f'/api/ecole/students/{self.student.pk}/parent-link').data['code']['code']

    def redeem(self, code, user=None):
        self.client.force_login(user or self.parent)
        return self.client.post('/api/parent/link-code', {'code': code, 'firstName': 'Fatou', 'lastName': 'Diop', 'phone': '77 000 00 00'}, format='json')

    def test_full_flow_then_unlink(self):
        response = self.redeem(self.code.replace('-', '').lower())
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        self.assertEqual(response.data['studentName'], 'Awa Diop')
        self.student.user.refresh_from_db()
        self.assertEqual(self.student.user.parent, self.parent)
        self.assertIn('INVALIDE', self.redeem(self.code).data['error'].upper())  # usage unique

        self.client.force_login(self.data['admin'])
        info = self.client.get(f'/api/ecole/students/{self.student.pk}/parent-link').data
        self.assertEqual(info['parent']['firstName'], 'Fatou')
        self.assertIsNone(info['code'])
        self.client.delete(f'/api/ecole/students/{self.student.pk}/parent-link')
        self.student.user.refresh_from_db()
        self.assertIsNone(self.student.user.parent)

    def test_regenerating_revokes_old_code_and_expired_is_refused(self):
        new = self.client.post(f'/api/ecole/students/{self.student.pk}/parent-link').data['code']['code']
        self.assertEqual(self.redeem(self.code).status_code, status.HTTP_400_BAD_REQUEST)
        ParentLinkCode.objects.filter(revoked_at__isnull=True).update(expires_at=timezone.now() - timedelta(seconds=1))
        self.assertEqual(self.redeem(new).status_code, status.HTTP_400_BAD_REQUEST)

    def test_only_parents_can_redeem_and_attempts_are_throttled(self):
        self.assertEqual(self.redeem(self.code, user=self.data['teacher']).status_code, status.HTTP_403_FORBIDDEN)
        codes = [self.redeem('AAA-AAA').status_code for _ in range(11)]
        self.assertEqual(codes[-1], status.HTTP_429_TOO_MANY_REQUESTS)

    def test_teacher_can_show_code_for_own_student_only(self):
        self.client.force_login(self.data['teacher'])
        info = self.client.get(f'/api/enseignant/students/{self.student.pk}/parent-link').data
        self.assertEqual(info['code']['code'], self.code)

    def test_code_alone_uses_parent_profile_from_registration(self):
        ParentProfile.objects.create(user=self.parent, first_name='Mariama', last_name='Sow', phone='77 555 44 33')
        self.client.force_login(self.parent)
        response = self.client.post('/api/parent/link-code', {'code': self.code}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        self.assertEqual(response.data['parentName'], 'Mariama Sow')
        self.parent.parent_profile.refresh_from_db()
        self.assertEqual(self.parent.parent_profile.phone, '77 555 44 33')

    def test_code_alone_for_older_account_without_profile_uses_display_name(self):
        self.parent.display_name = 'Aminata Fall'
        self.parent.save(update_fields=['display_name'])
        self.client.force_login(self.parent)
        response = self.client.post('/api/parent/link-code', {'code': self.code}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        profile = ParentProfile.objects.get(user=self.parent)
        self.assertEqual((profile.first_name, profile.last_name), ('Aminata', 'Fall'))
