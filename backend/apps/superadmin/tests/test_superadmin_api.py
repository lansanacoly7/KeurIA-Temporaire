from rest_framework import status
from rest_framework.test import APIClient, APITestCase

from apps.accounts.models import User
from apps.schools.models import School
from apps.scolaire.models import AcademicYear, Classroom, Mission
from apps.scolaire.tests.helpers import PASSWORD, build_school

from ..models import AuditLog

THEME = {'primaryColor': '#0b3a5b', 'accentColor': '#7fd3f0'}


class SuperAdminTestCase(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user('equipe@keuria.test', PASSWORD, role=User.ROLE_ADMIN, display_name='Équipe')
        self.data = build_school()
        self.school = self.data['school']
        self.client.force_login(self.admin)

    def create_school(self, **overrides):
        body = {'name': 'École Les Filaos', 'city': 'Saint-Louis', **THEME,
                'admin': {'firstName': 'Fatou', 'lastName': 'Sow', 'email': 'direction@filaos.test', 'title': 'Directrice'}}
        body.update(overrides)
        return self.client.post('/api/superadmin/schools', body, format='json')


class AccessTests(SuperAdminTestCase):
    def test_only_platform_admins(self):
        for user in (self.data['admin'], self.data['teacher']):
            self.client.force_login(user)
            for url in ('/api/superadmin/dashboard', '/api/superadmin/schools', '/api/superadmin/accounts',
                        '/api/superadmin/missions', '/api/superadmin/audit'):
                self.assertEqual(self.client.get(url).status_code, status.HTTP_403_FORBIDDEN, url)


class SchoolTests(SuperAdminTestCase):
    def test_create_school_with_direction_in_one_step(self):
        response = self.create_school()
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        school = School.objects.get(slug='ecole-les-filaos')
        self.assertEqual(school.created_by_email, 'equipe@keuria.test')
        self.assertTrue(AcademicYear.objects.filter(school=school, status='en_cours').exists())
        direction = User.objects.get(email='direction@filaos.test')
        self.assertEqual((direction.role, direction.school), (User.ROLE_SCHOOL_ADMIN, school))
        self.assertTrue(direction.check_password(response.data['credentials']['temporaryPassword']))
        self.assertTrue(AuditLog.objects.filter(action='ecole_creee').exists())
        # Même nom : adresse suffixée automatiquement ; même e-mail de direction : refusé.
        second = self.create_school(admin={'firstName': 'A', 'lastName': 'B', 'email': 'autre@filaos.test'})
        self.assertEqual(second.data['school']['slug'], 'ecole-les-filaos-2')
        dup = self.create_school(name='Autre', admin={'firstName': 'A', 'lastName': 'B', 'email': 'direction@filaos.test'})
        self.assertEqual(dup.status_code, status.HTTP_400_BAD_REQUEST)

    def test_theme_and_slug_are_validated(self):
        self.assertEqual(self.create_school(primaryColor='#ffffff').status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(self.create_school(slug='Pas Valide!').status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(self.create_school(slug=self.school.slug).status_code, status.HTTP_400_BAD_REQUEST)

    def test_suspension_blocks_accounts_and_public_page_then_reactivation(self):
        url = f'/api/superadmin/schools/{self.school.pk}'
        wrong = self.client.post(f'{url}/suspend', {'confirmation': 'oui'}, format='json')
        self.assertEqual(wrong.status_code, status.HTTP_400_BAD_REQUEST)

        teacher_client = APIClient()
        teacher_client.force_login(self.data['teacher'])
        self.assertEqual(teacher_client.get('/api/enseignant/overview').status_code, status.HTTP_200_OK)

        done = self.client.post(f'{url}/suspend', {'confirmation': self.school.name}, format='json')
        self.assertTrue(done.data['suspended'])
        # Session déjà ouverte : refusée ; nouvelle connexion : refusée ; page publique : introuvable.
        self.assertIn(teacher_client.get('/api/enseignant/overview').status_code, (401, 403))
        login = APIClient().post('/api/auth/login', {'email': self.data['teacher'].email, 'password': PASSWORD})
        self.assertEqual(login.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn('suspendu', login.data['error'])
        self.assertEqual(APIClient().get(f'/api/schools/{self.school.slug}').status_code, status.HTTP_404_NOT_FOUND)

        self.client.post(f'{url}/reactivate')
        self.assertEqual(APIClient().post('/api/auth/login', {'email': self.data['teacher'].email, 'password': PASSWORD}).status_code,
                         status.HTTP_200_OK)
        self.assertEqual(AuditLog.objects.filter(action__in=['ecole_suspendue', 'ecole_reactivee']).count(), 2)

    def test_direction_management(self):
        url = f'/api/superadmin/schools/{self.school.pk}'
        old = self.data['admin']
        last = self.client.post(f'{url}/admins/{old.pk}/status', {'status': 'desactive'}, format='json')
        self.assertIn('seule direction', last.data['error'])
        new = self.client.post(f'{url}/admins', {'firstName': 'Ousmane', 'lastName': 'Ba', 'email': 'nouvelle@ecole.test'}, format='json')
        self.assertEqual(new.status_code, status.HTTP_201_CREATED)
        self.assertEqual(self.client.post(f'{url}/admins/{old.pk}/status', {'status': 'desactive'}, format='json').status_code, 200)
        reset = self.client.post(f"{url}/admins/{new.data['admin']['id']}/password").data
        self.assertTrue(User.objects.get(email='nouvelle@ecole.test').check_password(reset['temporaryPassword']))
        # Un enseignant n'est pas une direction : introuvable par cette route.
        self.assertEqual(self.client.post(f"{url}/admins/{self.data['teacher'].pk}/password").status_code, 404)

    def test_update_keeps_slug(self):
        response = self.client.patch(f'/api/superadmin/schools/{self.school.pk}', {'name': 'Nouveau nom', 'city': 'Thiès', 'slug': 'x', **THEME}, format='json')
        self.assertEqual((response.data['name'], response.data['slug']), ('Nouveau nom', self.school.slug))


class AccountTests(SuperAdminTestCase):
    def test_filters_and_pagination(self):
        data = self.client.get('/api/superadmin/accounts', {'role': 'eleve', 'schoolId': self.school.pk}).data
        self.assertEqual(data['total'], 4)
        self.assertTrue(all(a['managedBySchool'] for a in data['results']))
        none = self.client.get('/api/superadmin/accounts', {'schoolId': 'none'}).data
        self.assertEqual([a['email'] for a in none['results']], ['equipe@keuria.test'])

    def test_school_members_are_managed_by_their_school_only(self):
        # Le super admin voit tout mais n'intervient pas dans une école.
        for user in (self.data['students'][0].user, self.data['teacher'], self.data['admin']):
            self.assertEqual(self.client.delete(f'/api/superadmin/accounts/{user.pk}').status_code, 400)
            self.assertEqual(self.client.patch(f'/api/superadmin/accounts/{user.pk}', {'displayName': 'X', 'role': 'admin'},
                                               format='json').status_code, 403)
            self.assertEqual(self.client.post(f'/api/superadmin/accounts/{user.pk}/status', {'status': 'desactive'},
                                              format='json').status_code, 403)
            user.refresh_from_db()
            self.assertTrue(user.is_active)
            self.assertNotEqual(user.display_name, 'X')
        self.assertEqual(Classroom.objects.get(pk=self.data['ce1a'].pk).teacher, self.data['teacher'])

    def test_cannot_deactivate_own_account(self):
        self.assertEqual(self.client.post(f'/api/superadmin/accounts/{self.admin.pk}/status', {'status': 'desactive'}, format='json').status_code, 400)

    def test_create_account_with_generated_password(self):
        response = self.client.post('/api/superadmin/accounts', {'email': 'coll@keuria.test', 'displayName': 'Collègue', 'role': 'admin'}, format='json')
        self.assertTrue(User.objects.get(email='coll@keuria.test').check_password(response.data['credentials']['temporaryPassword']))
        refused = self.client.post('/api/superadmin/accounts', {'email': 'x@keuria.test', 'displayName': 'X', 'role': 'admin_ecole'}, format='json')
        self.assertEqual(refused.status_code, status.HTTP_400_BAD_REQUEST)


class MissionTests(SuperAdminTestCase):
    body = {'title': 'Reconnaître une arnaque', 'description': 'Repérer les messages trompeurs.', 'category': 'Sécurité',
            'difficulty': 'Débutant', 'durationMinutes': 15, 'xp': 40}

    def test_create_edit_and_retire_mission(self):
        created = self.client.post('/api/superadmin/missions', self.body, format='json')
        self.assertEqual(created.data['id'], 'm7')
        bad = self.client.post('/api/superadmin/missions', {**self.body, 'category': 'Cuisine'}, format='json')
        self.assertEqual(bad.status_code, status.HTTP_400_BAD_REQUEST)
        edited = self.client.patch('/api/superadmin/missions/m7', {**self.body, 'xp': 60}, format='json')
        self.assertEqual(edited.data['xp'], 60)

        self.client.post('/api/superadmin/missions/m2/status', {'active': False}, format='json')
        self.assertFalse(Mission.objects.get(pk='m2').active)
        teacher = APIClient()
        teacher.force_login(self.data['teacher'])
        library = [m['id'] for m in teacher.get('/api/enseignant/missions').data]
        self.assertNotIn('m2', library)
        self.assertIn('m7', library)
        assign = teacher.post('/api/enseignant/assignments', {'missionId': 'm2', 'classIds': [str(self.data['ce1a'].pk)],
                                                              'dueDate': None, 'instructions': ''}, format='json')
        self.assertEqual(assign.status_code, status.HTTP_400_BAD_REQUEST)


class DashboardAndAuditTests(SuperAdminTestCase):
    def test_dashboard_flags_school_without_direction(self):
        self.data['admin'].is_active = False
        self.data['admin'].save()
        data = self.client.get('/api/superadmin/dashboard').data
        self.assertEqual(data['kpis']['schools'], 1)
        self.assertTrue(any('aucune direction' in item['text'] for item in data['toHandle']))

    def test_audit_is_paginated_and_newest_first(self):
        self.create_school()
        self.client.post('/api/superadmin/missions/m1/status', {'active': False}, format='json')
        entries = self.client.get('/api/superadmin/audit').data
        self.assertEqual(entries['total'], 2)
        self.assertEqual(entries['results'][0]['action'], 'mission_retiree')


class TeacherSchoolRouteTests(APITestCase):
    def test_teacher_can_read_own_school(self):
        data = build_school()
        self.client.force_login(data['teacher'])
        self.assertEqual(self.client.get('/api/enseignant/school').data['name'], data['school'].name)
