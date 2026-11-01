from rest_framework import status
from rest_framework.test import APITestCase

from apps.accounts.models import User
from apps.curriculum.models import AgeTrack, Lesson, LessonContent, Module
from apps.scolaire.tests.helpers import PASSWORD, build_school

from ..models import AuditLog

BASE = '/api/superadmin/curriculum'


class StudioTestCase(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user('equipe@keuria.test', PASSWORD, role=User.ROLE_ADMIN, display_name='Équipe')
        self.track = AgeTrack.objects.create(key='7-9', label='7-9 ans', name='Petits Explorateurs')
        self.module = Module.objects.create(track=self.track, world_id='p1', title='Monde 1', description='Intro')
        self.client.force_login(self.admin)

    def lesson_body(self, **overrides):
        body = {'module_id': 'p1', 'title': 'Découvrir', 'type': 'quiz', 'minutes': 8, 'xp': 30, 'stars': 3,
                'content': {'mission': 'Explore', 'objectives': ['a', 'b'], 'activity': {'prompt': '?'}}}
        body.update(overrides)
        return body

    def create_lesson(self, **overrides):
        return self.client.post(f'{BASE}/lessons', self.lesson_body(**overrides), format='json')


class AccessTests(StudioTestCase):
    def test_anonymous_and_non_admin_are_refused(self):
        data = build_school()
        self.client.logout()
        self.assertEqual(self.client.get(f'{BASE}/tracks').status_code, status.HTTP_401_UNAUTHORIZED)
        for user in (data['admin'], data['teacher']):
            self.client.force_login(user)
            self.assertEqual(self.client.get(f'{BASE}/tracks').status_code, status.HTTP_403_FORBIDDEN)
            self.assertEqual(self.client.post(f'{BASE}/lessons', self.lesson_body(), format='json').status_code,
                             status.HTTP_403_FORBIDDEN)
            self.assertEqual(self.client.delete(f'{BASE}/lessons/x').status_code, status.HTTP_403_FORBIDDEN)


class LessonLifecycleTests(StudioTestCase):
    def test_create_edit_duplicate_reorder_delete(self):
        created = self.create_lesson()
        self.assertEqual(created.status_code, status.HTTP_201_CREATED, created.data)
        lesson_id = Lesson.objects.get(title='Découvrir').lesson_id
        self.assertEqual(LessonContent.objects.get(lesson__lesson_id=lesson_id).objectives, ['a', 'b'])

        edited = self.client.patch(f'{BASE}/lessons/{lesson_id}', self.lesson_body(title='Renommée', xp=40), format='json')
        self.assertEqual(edited.status_code, status.HTTP_200_OK)
        self.assertEqual(Lesson.objects.get(lesson_id=lesson_id).xp, 40)

        copy = self.client.post(f'{BASE}/lessons/{lesson_id}/duplicate')
        self.assertEqual(copy.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Lesson.objects.filter(module=self.module).count(), 2)

        for direction in ('up', 'down'):
            self.assertEqual(self.client.post(f'{BASE}/lessons/{lesson_id}/reorder', {'direction': direction}, format='json')
                             .status_code, status.HTTP_200_OK)

        deleted = self.client.delete(f'{BASE}/lessons/{lesson_id}')
        self.assertEqual(deleted.status_code, status.HTTP_200_OK)
        self.assertFalse(Lesson.objects.filter(lesson_id=lesson_id).exists())

    def test_every_change_is_written_to_the_audit_log(self):
        self.create_lesson()
        lesson_id = Lesson.objects.get(title='Découvrir').lesson_id
        self.client.post(f'{BASE}/lessons/{lesson_id}/duplicate')
        self.client.delete(f'{BASE}/lessons/{lesson_id}')
        self.client.post(f'{BASE}/modules', {'track_key': '7-9', 'title': 'Monde 2'}, format='json')

        actions = set(AuditLog.objects.values_list('action', flat=True))

        self.assertTrue({'lecon_creee', 'lecon_dupliquee', 'lecon_supprimee', 'module_cree'} <= actions)
        self.assertEqual(AuditLog.objects.first().actor_email, self.admin.email)

    def test_reorder_rejects_an_unknown_direction(self):
        self.create_lesson()
        lesson_id = Lesson.objects.get(title='Découvrir').lesson_id

        response = self.client.post(f'{BASE}/lessons/{lesson_id}/reorder', {'direction': 'sideways'}, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class ValidationTests(StudioTestCase):
    def assert_refused(self, **overrides):
        response = self.create_lesson(**overrides)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST, overrides)
        self.assertNotIn('literal', str(response.data), 'pas de message Python brut')
        self.assertFalse(Lesson.objects.exists(), overrides)

    def test_bad_numbers_are_a_clean_400_never_a_500(self):
        for bad in ('abc', None, [1], {'a': 1}, True, -1, 10**12):
            self.assert_refused(xp=bad)
        self.assert_refused(minutes=0)
        self.assert_refused(stars=99)

    def test_bad_texts_and_unknown_type_are_refused(self):
        self.assert_refused(title=None)
        self.assert_refused(title=123)
        self.assert_refused(title='   ')
        self.assert_refused(title='x' * 201)
        self.assert_refused(type='pirate')

    def test_lesson_id_must_be_a_progress_compatible_identifier(self):
        for bad in ('a b', '../x', 'é', 'x' * 101, '<b>'):
            self.assert_refused(id=bad)
        self.assertEqual(self.create_lesson(id='p1-9').status_code, status.HTTP_201_CREATED)

    def test_unknown_module_is_a_404(self):
        self.assertEqual(self.create_lesson(module_id='nope').status_code, status.HTTP_404_NOT_FOUND)

    def test_content_shape_and_size_are_checked(self):
        self.assert_refused(content='texte')
        self.assert_refused(content={'objectives': 'pas une liste'})
        self.assert_refused(content={'mission': ['pas un texte']})
        self.assert_refused(content={'activity': [1]})
        self.assert_refused(content={'remember': ['x' * 250_000]})

    def test_module_validation(self):
        for body in ({'track_key': '7-9', 'title': 'M', 'order': 'x'}, {'track_key': '7-9', 'title': None},
                     {'track_key': '7-9', 'title': 'M', 'id': 'a b'}, {'track_key': '7-9', 'title': 'M', 'id': 'x' * 51},
                     {'title': 'Sans parcours'}):
            response = self.client.post(f'{BASE}/modules', body, format='json')
            self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST, body)
        self.assertEqual(self.client.post(f'{BASE}/modules', {'track_key': 'zz', 'title': 'M'}, format='json').status_code,
                         status.HTTP_404_NOT_FOUND)
        self.assertEqual(Module.objects.count(), 1)
