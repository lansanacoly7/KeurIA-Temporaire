from rest_framework import status
from rest_framework.test import APITestCase

from apps.accounts.models import User
from apps.scolaire.models import ParentProfile, SchoolActivity
from apps.scolaire.tests.helpers import PASSWORD, build_school

from ..models import AuditLog


class SchoolSpaceTests(APITestCase):
    """Espace d'une école vu par le super admin : tout voir, ne rien modifier, ne rien mélanger."""

    def setUp(self):
        self.admin = User.objects.create_user('equipe@keuria.test', PASSWORD, role=User.ROLE_ADMIN)
        self.a = build_school('baobabs')
        self.b = build_school('filaos')
        self.url = f"/api/superadmin/schools/{self.a['school'].pk}"
        self.client.force_login(self.admin)

    def test_reserved_to_platform_admins(self):
        for user in (self.a['admin'], self.a['teacher'], self.b['admin']):
            self.client.force_login(user)
            for path in ('/overview', '/teachers', '/classes', '/students', '/parents', '/activity'):
                self.assertEqual(self.client.get(self.url + path).status_code, status.HTTP_403_FORBIDDEN, path)
            self.assertEqual(self.client.get('/api/superadmin/search', {'query': 'Awa'}).status_code, status.HTTP_403_FORBIDDEN)

    def test_unknown_school_is_404(self):
        self.assertEqual(self.client.get('/api/superadmin/schools/999999/students').status_code, status.HTTP_404_NOT_FOUND)

    def test_lists_only_contain_this_school(self):
        students = self.client.get(self.url + '/students').data
        logins = {s['student']['login'] for s in students}
        self.assertEqual(len(students), 4)
        self.assertTrue(all(login.endswith('baobabs.keuria.sn') for login in logins), logins)
        teachers = {t['teacher']['email'] for t in self.client.get(self.url + '/teachers').data}
        self.assertEqual(teachers, {'khady@baobabs.test', 'babacar@baobabs.test'})
        self.assertEqual(len(self.client.get(self.url + '/classes').data), 3)

    def test_other_school_items_are_not_reachable_through_this_school(self):
        other_student = self.b['students'][0]
        other_class = self.b['ce1a']
        self.assertEqual(self.client.get(f"{self.url}/students/{other_student.pk}").status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(self.client.get(f"{self.url}/classes/{other_class.pk}").status_code, status.HTTP_404_NOT_FOUND)
        own = self.client.get(f"{self.url}/students/{self.a['students'][0].pk}")
        self.assertEqual(own.status_code, status.HTTP_200_OK)
        self.assertNotIn('credentials', own.data)

    def test_school_space_is_read_only(self):
        for path in ('/teachers', '/classes', '/students', '/parents', '/activity', '/overview'):
            for method in ('post', 'patch', 'delete'):
                response = getattr(self.client, method)(self.url + path, {}, format='json')
                self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED, f'{method} {path}')

    def test_overview_has_health_indicators(self):
        data = self.client.get(self.url + '/overview').data
        self.assertEqual(data['school']['students'], 4)
        self.assertEqual(data['school']['classesWithoutTeacher'], 1)
        self.assertIn('activeStudentsWeek', data['school'])
        self.assertEqual(data['dashboard']['classes'], 3)
        self.assertEqual(data['linkedStudents'], 0)
        child = self.a['students'][0].user
        child.parent = User.objects.create_user('maman@example.com', PASSWORD, role=User.ROLE_PARENT)
        child.save(update_fields=['parent'])
        self.assertEqual(self.client.get(self.url + '/overview').data['linkedStudents'], 1)

    def test_activity_mixes_school_journal_and_keuria_actions_for_this_school_only(self):
        SchoolActivity.objects.create(school=self.a['school'], kind='x', label='Classe CE1 A créée')
        SchoolActivity.objects.create(school=self.b['school'], kind='x', label='Autre école')
        self.client.post(f"{self.url}/admins", {'firstName': 'Ada', 'lastName': 'Ba', 'email': 'ada@baobabs.test'}, format='json')
        labels = [e['label'] for e in self.client.get(self.url + '/activity').data['results']]
        self.assertIn('Classe CE1 A créée', labels)
        self.assertNotIn('Autre école', labels)
        self.assertTrue(any('Ada Ba' in label for label in labels))
        self.assertEqual(AuditLog.objects.get(action='direction_ajoutee').school, self.a['school'])

    def test_search_results_say_which_school(self):
        parent = User.objects.create_user('maman@example.com', PASSWORD, role=User.ROLE_PARENT, display_name='Maman Diop')
        ParentProfile.objects.create(user=parent, first_name='Mariama', last_name='Diop', phone='77 000 00 00')
        child = self.b['students'][0].user
        child.parent = parent
        child.save(update_fields=['parent'])

        results = self.client.get('/api/superadmin/search', {'query': 'Diop'}).data['results']
        awa = [r for r in results if r['kind'] == 'eleve']
        self.assertEqual({r['schoolName'] for r in awa}, {self.a['school'].name, self.b['school'].name})
        mariama = next(r for r in results if r['kind'] == 'parent')
        self.assertEqual(mariama['schoolName'], self.b['school'].name)
        self.assertEqual(self.client.get('/api/superadmin/search', {'query': 'D'}).data['results'], [])
