"""Tests complets pour la gestion dynamique du catalogue 7-9 (T21)."""
from django.contrib.auth import get_user_model
from django.test import TestCase

from apps.curriculum import catalog, parcours79
from apps.curriculum.models import ContentVersion, Lesson, Module
from apps.progress.models import Progress
from apps.scolaire.errors import ApiError
from rest_framework.test import APIClient

User = get_user_model()


class CatalogServiceTests(TestCase):
    def setUp(self):
        self.admin = User.objects.create_superuser(
            email='admin-catalog@test.local',
            password='secret-pass-test',
        )

    def test_base_catalog_loads_from_tracks_data(self):
        cat = catalog.base_catalog('7-9')
        self.assertIn('modules', cat)
        self.assertIn('lessons', cat)
        self.assertGreaterEqual(len(cat['modules']), 10)
        self.assertGreaterEqual(len(cat['lessons']), 30)

    def test_create_module_generates_next_id_and_first_lesson(self):
        result = catalog.create_module(
            self.admin,
            title='L’éthique et l’IA',
            description='Comprendre le respect et l’IA.',
            color='coral',
            icon='⚖️',
        )
        self.assertTrue(result['ok'])
        mod = result['module']
        self.assertEqual(mod['id'], 'p11')
        self.assertEqual(mod['title'], 'L’éthique et l’IA')

        first_les = result['firstLesson']
        self.assertEqual(first_les['id'], 'p11-1')
        self.assertEqual(first_les['moduleId'], 'p11')

        # Vérifier que le brouillon a bien été créé
        draft = ContentVersion.objects.filter(kind=ContentVersion.KIND_CATALOG79, publish_at=None).first()
        self.assertIsNotNone(draft)
        self.assertIn('p11', [m['id'] for m in draft.content['modules']])
        self.assertIn('p11-1', [les['id'] for les in draft.content['lessons']])

    def test_create_lesson_in_existing_module_allocates_next_number(self):
        result = catalog.create_lesson(self.admin, 'p1', title='Une nouvelle aventure')
        self.assertTrue(result['ok'])
        new_id = result['lesson']['id']
        # p1 a initialement 4 leçons (p1-1 à p1-4), le nouvel ID doit être p1-5
        self.assertEqual(new_id, 'p1-5')
        self.assertEqual(result['lesson']['moduleId'], 'p1')

        # Et le contenu de la leçon a été initialisé
        les_version = ContentVersion.objects.filter(kind=ContentVersion.KIND_LESSON79, key=new_id).first()
        self.assertIsNotNone(les_version)
        self.assertEqual(len(les_version.content['screens']), 4)

    def test_cannot_delete_lesson_with_progress_raises_409(self):
        # Créer de la progression pour p1-1
        learner = User.objects.create_user(email='learner@test.local', password='password123')
        Progress.objects.create(
            user=learner,
            owner_email=learner.email,
            lesson_id='p1-1',
            age_track='7-9',
            xp=20,
        )

        with self.assertRaises(ApiError) as ctx:
            catalog.delete_or_hide_lesson(self.admin, 'p1-1')
        self.assertEqual(ctx.exception.status_code, 409)

    def test_can_delete_lesson_without_progress(self):
        # Créer une leçon sans progression puis la supprimer
        res = catalog.create_lesson(self.admin, 'p2', title='Leçon temporaire')
        created_id = res['lesson']['id']

        del_res = catalog.delete_or_hide_lesson(self.admin, created_id)
        self.assertTrue(del_res['ok'])
        self.assertTrue(del_res['deleted'])

        # Vérifier qu'elle n'est plus dans le working catalog
        working_cat, _ = catalog.get_working_catalog('7-9')
        self.assertNotIn(created_id, [les['id'] for les in working_cat['lessons']])

    def test_toggle_hide_lesson(self):
        res = catalog.toggle_hide_lesson(self.admin, 'p1-2')
        self.assertTrue(res['ok'])
        self.assertTrue(res['hidden'])

        working_cat, _ = catalog.get_working_catalog('7-9')
        hidden_lesson = next(les for les in working_cat['lessons'] if les['id'] == 'p1-2')
        self.assertTrue(hidden_lesson['hidden'])

        # Re-basculer
        res2 = catalog.toggle_hide_lesson(self.admin, 'p1-2')
        self.assertFalse(res2['hidden'])

    def test_duplicate_lesson(self):
        # Créer un contenu initial pour p1-1
        ContentVersion.objects.create(
            kind=ContentVersion.KIND_LESSON79,
            key='p1-1',
            number=1,
            content={'id': 'p1-1', 'title': 'Intro', 'screens': [{'kind': 'story', 'text': 'Bonjour'}]},
            source=ContentVersion.SOURCE_STUDIO,
            author=self.admin,
        )

        res = catalog.duplicate_lesson(self.admin, 'p1-1')
        self.assertTrue(res['ok'])
        new_id = res['lesson']['id']
        self.assertTrue(new_id.startswith('p1-'))
        self.assertNotEqual(new_id, 'p1-1')

        # Vérifier que le contenu a été dupliqué
        dup_ver = ContentVersion.objects.filter(kind=ContentVersion.KIND_LESSON79, key=new_id).first()
        self.assertIsNotNone(dup_ver)
        self.assertEqual(dup_ver.content['id'], new_id)

    def test_reorder_lessons(self):
        # Inverser l'ordre des 4 leçons de p1 (p1-1, p1-2, p1-3, p1-4)
        working_cat, _ = catalog.get_working_catalog('7-9')
        p1_ids = [les['id'] for les in working_cat['lessons'] if les['moduleId'] == 'p1']
        reversed_p1_ids = list(reversed(p1_ids))

        res = catalog.reorder_lessons(self.admin, 'p1', reversed_p1_ids)
        self.assertTrue(res['ok'])
        updated_cat, _ = catalog.get_working_catalog('7-9')
        p1_lessons = [les for les in updated_cat['lessons'] if les['moduleId'] == 'p1']
        p1_lessons.sort(key=lambda les: les['order'])
        self.assertEqual([les['id'] for les in p1_lessons], reversed_p1_ids)

    def test_reorder_modules(self):
        working_cat, _ = catalog.get_working_catalog('7-9')
        mod_ids = [m['id'] for m in working_cat['modules']]
        reversed_ids = list(reversed(mod_ids))
        res = catalog.reorder_modules(self.admin, reversed_ids)
        self.assertTrue(res['ok'])

        updated_cat, _ = catalog.get_working_catalog('7-9')
        updated_ids = [m['id'] for m in sorted(updated_cat['modules'], key=lambda m: m['order'])]
        self.assertEqual(updated_ids, reversed_ids)

    def test_publish_catalog_and_sync_db(self):
        # Créer un nouveau module et publier immédiatement
        catalog.create_module(self.admin, title='Module Douze', color='emerald', icon='🌿')
        pub_res = catalog.publish_catalog(self.admin, immediate=True)
        self.assertTrue(pub_res['ok'])
        self.assertEqual(pub_res['state'], 'live')

        # Vérifier que la synchronisation en base a bien créé les objets Module et Lesson
        db_mod = Module.objects.filter(world_id='p11').first()
        self.assertIsNotNone(db_mod)
        self.assertEqual(db_mod.title, 'Module Douze')

        db_lesson = Lesson.objects.filter(lesson_id='p11-1').first()
        self.assertIsNotNone(db_lesson)
        self.assertEqual(db_lesson.module, db_mod)

        # Vérifier que _catalog_worlds retourne bien le nouveau module
        worlds = parcours79._catalog_worlds()
        self.assertIn('p11', worlds)
        self.assertEqual(worlds['p11'][0]['id'], 'p11-1')


class CatalogApiTests(TestCase):
    def setUp(self):
        self.admin = User.objects.create_superuser(
            email='admin-api@test.local',
            password='secret-pass-test',
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.admin)

    def test_api_get_catalog_overview(self):
        res = self.client.get('/api/superadmin/studio79/catalog')
        self.assertEqual(res.status_code, 200)
        self.assertIn('working', res.data)
        self.assertIn('modules', res.data['working']['content'])
        self.assertIn('lessons', res.data['working']['content'])

    def test_api_create_module_and_lesson(self):
        # Créer module
        mod_res = self.client.post('/api/superadmin/studio79/catalog/modules/new', {
            'title': 'Module Futur',
            'description': 'Description du futur',
            'color': 'sky',
            'icon': '🚀',
        }, format='json')
        self.assertEqual(mod_res.status_code, 200)
        self.assertTrue(mod_res.data['ok'])
        mod_id = mod_res.data['module']['id']

        # Créer leçon
        les_res = self.client.post('/api/superadmin/studio79/catalog/lessons/new', {
            'moduleId': mod_id,
            'title': 'Vol spatial',
        }, format='json')
        self.assertEqual(les_res.status_code, 200)
        self.assertTrue(les_res.data['ok'])
        les_id = les_res.data['lesson']['id']
        self.assertEqual(les_id, f'{mod_id}-2')

        # Masquer leçon
        hide_res = self.client.post(f'/api/superadmin/studio79/catalog/lessons/{les_id}/toggle-hide')
        self.assertEqual(hide_res.status_code, 200)
        self.assertTrue(hide_res.data['hidden'])

        # Dupliquer leçon
        dup_res = self.client.post(f'/api/superadmin/studio79/catalog/lessons/{les_id}/duplicate')
        self.assertEqual(dup_res.status_code, 200)
        self.assertTrue(dup_res.data['ok'])

        # Supprimer la leçon dupliquée (sans progression)
        dup_id = dup_res.data['lesson']['id']
        del_res = self.client.delete(f'/api/superadmin/studio79/catalog/lessons/{dup_id}')
        self.assertEqual(del_res.status_code, 200)
        self.assertTrue(del_res.data['deleted'])

    def test_api_delete_lesson_with_progress_returns_409(self):
        learner = User.objects.create_user(email='student@test.local', password='pwd')
        Progress.objects.create(
            user=learner,
            owner_email=learner.email,
            lesson_id='p1-1',
            age_track='7-9',
            xp=10,
        )
        res = self.client.delete('/api/superadmin/studio79/catalog/lessons/p1-1')
        self.assertEqual(res.status_code, 409)
        self.assertIn('progressions', res.data.get('error', ''))

    def test_api_publish_and_cancel_catalog(self):
        # Publier avec délai
        pub_res = self.client.post('/api/superadmin/studio79/catalog/publish', {
            'note': 'Publication test',
            'delayMinutes': 15,
        }, format='json')
        self.assertEqual(pub_res.status_code, 200)
        self.assertEqual(pub_res.data['state'], 'pending')

        # Annuler
        cancel_res = self.client.post('/api/superadmin/studio79/catalog/cancel')
        self.assertEqual(cancel_res.status_code, 200)
        self.assertTrue(cancel_res.data['ok'])

    def test_api_anonymous_denied(self):
        anon = APIClient()
        self.assertEqual(anon.get('/api/superadmin/studio79/catalog').status_code, 401)

