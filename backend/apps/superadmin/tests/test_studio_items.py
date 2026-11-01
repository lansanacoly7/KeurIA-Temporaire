"""Tests unitaires du studio des énigmes, défis du jour, devoirs et activités (T22)."""
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient, APITestCase

from apps.accounts.models import User
from apps.curriculum.models import Activity, ContentVersion, DailyChallenge, Riddle
from apps.scolaire.mission_quizzes import quiz_for
from apps.scolaire.models import Mission

BASE_ITEMS = '/api/superadmin/studio79/items'


class StudioItemsTestCase(APITestCase):
    def setUp(self):
        super().setUp()
        self.admin = User.objects.create_user(
            email='admin_studio@keuria.sn',
            password='Baobab-Dakar-2026',
            role=User.ROLE_ADMIN,
            email_verified=True,
        )
        self.client = APIClient()
        self.client.force_authenticate(self.admin)

        # Création d'une énigme de test
        self.riddle = Riddle.objects.create(
            lesson_id='p1-1',
            question="Qui a fabriqué les IA ?",
            options=["Des humains", "Elles sont nées toutes seules", "Les animaux"],
            correct_index=0,
            explanation="Une IA est un outil fabriqué par des humains.",
            is_active=True,
        )

        # Création d'un défi de test
        self.challenge = DailyChallenge.objects.create(
            theme="Découverte",
            question="Combien font 2 + 2 ?",
            options=["3", "4", "5"],
            correct_index=1,
            explanation="2 + 2 font 4 !",
            is_active=True,
            order=1,
        )

        # Création d'une mission de test
        self.mission = Mission.objects.create(
            id='m-test-1',
            title="Mission Secrète",
            description="Découvre les secrets du robot.",
            category="Algorithmes",
            difficulty="Facile",
            duration_minutes=15,
            xp=30,
            active=True,
            track='7-9',
        )

        # Création d'une activité de test
        self.activity = Activity.objects.create(
            activity_id='game-test-01',
            kind=Activity.KIND_ARCADE_GAME,
            title="Labyrinthe IA",
            xp=40,
            is_active=True,
        )

    # ─── Énigmes (Riddle) ────────────────────────────────────────────────────

    def test_list_riddles(self):
        resp = self.client.get(f'{BASE_ITEMS}/riddle')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        items = resp.data.get('items', [])
        self.assertGreaterEqual(len(items), 1)
        r_entry = next((i for i in items if i['id'] == str(self.riddle.id)), None)
        self.assertIsNotNone(r_entry)
        self.assertEqual(r_entry['title'], self.riddle.question)

    def test_get_riddle_detail_seeds_version_1(self):
        resp = self.client.get(f'{BASE_ITEMS}/riddle/{self.riddle.id}')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        data = resp.data
        self.assertIsNotNone(data.get('live'))
        self.assertEqual(data['live']['number'], 1)
        self.assertEqual(data['working']['content']['question'], self.riddle.question)

    def test_save_draft_riddle(self):
        content = {
            'id': str(self.riddle.id),
            'lessonId': 'p1-1',
            'question': "Question modifiée par le studio ?",
            'options': ["Réponse 1", "Réponse 2", "Réponse 3"],
            'correctIndex': 2,
            'explanation': "Explication mise à jour.",
            'isActive': True,
        }
        resp = self.client.put(f'{BASE_ITEMS}/riddle/{self.riddle.id}/draft', {'content': content, 'note': 'Test modif'}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

        # Vérification que le brouillon est bien enregistré
        draft_row = ContentVersion.objects.filter(kind='riddle', key=str(self.riddle.id), publish_at__isnull=True).first()
        self.assertIsNotNone(draft_row)
        self.assertEqual(draft_row.content['question'], "Question modifiée par le studio ?")

        # La base DB n'est pas encore touchée
        self.riddle.refresh_from_db()
        self.assertEqual(self.riddle.question, "Qui a fabriqué les IA ?")

    def test_validation_rejects_malformed_riddle(self):
        # 1. Options dupliquées
        bad_content = {
            'id': str(self.riddle.id),
            'lessonId': 'p1-1',
            'question': "Question valide ?",
            'options': ["Même réponse", "Même réponse"],
            'correctIndex': 0,
            'explanation': "Explication.",
            'isActive': True,
        }
        resp = self.client.post(f'{BASE_ITEMS}/riddle/{self.riddle.id}/validate', {'content': bad_content}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        issues = resp.data['issues']
        self.assertTrue(any(i['severity'] == 'error' and 'distinctes' in i['message'] for i in issues))

        # 2. correctIndex hors limites
        bad_content['options'] = ["A", "B", "C"]
        bad_content['correctIndex'] = 5
        resp = self.client.post(f'{BASE_ITEMS}/riddle/{self.riddle.id}/validate', {'content': bad_content}, format='json')
        issues = resp.data['issues']
        self.assertTrue(any(i['severity'] == 'error' and 'hors limites' in i['message'] for i in issues))

    def test_publish_with_delay_and_cancel(self):
        content = {
            'id': str(self.riddle.id),
            'lessonId': 'p1-1',
            'question': "Question en attente 15 min ?",
            'options': ["A", "B", "C"],
            'correctIndex': 0,
            'explanation': "Explication.",
            'isActive': True,
        }
        self.client.put(f'{BASE_ITEMS}/riddle/{self.riddle.id}/draft', {'content': content}, format='json')

        # Publication avec délai de 15 min
        resp = self.client.post(f'{BASE_ITEMS}/riddle/{self.riddle.id}/publish', {'delayMinutes': 15}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

        # Vérification état en attente
        pending_ver = ContentVersion.objects.get(kind='riddle', key=str(self.riddle.id), publish_at__gt=timezone.now())
        self.assertIsNotNone(pending_ver)

        # La base DB n'est toujours pas changée
        self.riddle.refresh_from_db()
        self.assertEqual(self.riddle.question, "Qui a fabriqué les IA ?")

        # Annulation
        resp_cancel = self.client.post(f'{BASE_ITEMS}/riddle/{self.riddle.id}/cancel', format='json')
        self.assertEqual(resp_cancel.status_code, status.HTTP_200_OK)

        # Le brouillon est revenu
        draft_row = ContentVersion.objects.filter(kind='riddle', key=str(self.riddle.id), publish_at__isnull=True).first()
        self.assertIsNotNone(draft_row)

    def test_publish_immediate_updates_db(self):
        content = {
            'id': str(self.riddle.id),
            'lessonId': 'p1-1',
            'question': "Question mise en ligne immédiate ?",
            'options': ["Option X", "Option Y", "Option Z"],
            'correctIndex': 1,
            'explanation': "Explication claire.",
            'isActive': True,
        }
        self.client.put(f'{BASE_ITEMS}/riddle/{self.riddle.id}/draft', {'content': content}, format='json')
        resp = self.client.post(f'{BASE_ITEMS}/riddle/{self.riddle.id}/publish', {'immediate': True}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

        # La table Riddle est directement mise à jour
        self.riddle.refresh_from_db()
        self.assertEqual(self.riddle.question, "Question mise en ligne immédiate ?")
        self.assertEqual(self.riddle.correct_index, 1)

    def test_rollback_riddle(self):
        # Création et mise en ligne v2
        content_v2 = {
            'id': str(self.riddle.id),
            'lessonId': 'p1-1',
            'question': "Question version 2 ?",
            'options': ["A", "B", "C"],
            'correctIndex': 0,
            'explanation': "V2.",
            'isActive': True,
        }
        self.client.put(f'{BASE_ITEMS}/riddle/{self.riddle.id}/draft', {'content': content_v2}, format='json')
        self.client.post(f'{BASE_ITEMS}/riddle/{self.riddle.id}/publish', {'immediate': True}, format='json')

        self.riddle.refresh_from_db()
        self.assertEqual(self.riddle.question, "Question version 2 ?")

        # Rollback vers la version 1 (origine)
        resp_rb = self.client.post(f'{BASE_ITEMS}/riddle/{self.riddle.id}/rollback', {'number': 1}, format='json')
        self.assertEqual(resp_rb.status_code, status.HTTP_200_OK)

        self.riddle.refresh_from_db()
        self.assertEqual(self.riddle.question, "Qui a fabriqué les IA ?")

    def test_create_new_riddle(self):
        initial = {
            'lessonId': 'p1-2',
            'question': "Nouvelle énigme créée ?",
            'options': ["Choix 1", "Choix 2", "Choix 3"],
            'correctIndex': 0,
            'explanation': "Explication nouvelle.",
        }
        resp = self.client.post(f'{BASE_ITEMS}/riddle/new', {'initialData': initial}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        new_id = resp.data['id']

        # Publication immédiate
        self.client.post(f'{BASE_ITEMS}/riddle/{new_id}/publish', {'immediate': True}, format='json')

        # Vérification en base Riddle
        r = Riddle.objects.filter(pk=int(new_id)).first()
        self.assertIsNotNone(r)
        self.assertEqual(r.question, "Nouvelle énigme créée ?")

    # ─── Défis du jour (DailyChallenge) ──────────────────────────────────────

    def test_daily_challenge_lifecycle(self):
        resp = self.client.get(f'{BASE_ITEMS}/daily_challenge/{self.challenge.id}')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

        content = {
            'id': str(self.challenge.id),
            'theme': "Robotique",
            'question': "Un robot peut-il avoir des sentiments ?",
            'options': ["Non, jamais", "Oui, comme un chien", "Seulement le soir"],
            'correctIndex': 0,
            'explanation': "Un robot suit des programmes, il n'éprouve pas d'émotions.",
            'isActive': True,
            'order': 2,
        }
        self.client.put(f'{BASE_ITEMS}/daily_challenge/{self.challenge.id}/draft', {'content': content}, format='json')
        self.client.post(f'{BASE_ITEMS}/daily_challenge/{self.challenge.id}/publish', {'immediate': True}, format='json')

        self.challenge.refresh_from_db()
        self.assertEqual(self.challenge.theme, "Robotique")
        self.assertEqual(self.challenge.question, "Un robot peut-il avoir des sentiments ?")

    # ─── Devoirs (Mission & Quiz personnalisé) ───────────────────────────────

    def test_mission_custom_quiz_integration(self):
        custom_questions = [
            {
                'prompt': "Quel composant traite les informations dans l'ordinateur ?",
                'options': ["Le processeur", "L'écran", "La souris"],
                'correctIndex': 0,
                'explain': "Le processeur est le cerveau électronique de la machine.",
            }
        ]
        content = {
            'id': self.mission.id,
            'title': "Devoir sur l'ordinateur",
            'description': "Comprendre le processeur.",
            'category': "Matériel",
            'difficulty': "Facile",
            'durationMinutes': 12,
            'xp': 25,
            'track': '7-9',
            'active': True,
            'questions': custom_questions,
        }

        self.client.put(f'{BASE_ITEMS}/mission/{self.mission.id}/draft', {'content': content}, format='json')
        self.client.post(f'{BASE_ITEMS}/mission/{self.mission.id}/publish', {'immediate': True}, format='json')

        # Vérification que quiz_for renvoie bien les questions du studio
        steps = quiz_for(self.mission)
        self.assertEqual(len(steps), 1)
        self.assertEqual(steps[0]['question'], "Quel composant traite les informations dans l'ordinateur ?")
        self.assertTrue(steps[0]['options'][0]['correct'])
        self.assertFalse(steps[0]['options'][1]['correct'])

    # ─── Activités / Jeux ────────────────────────────────────────────────────

    def test_activity_lifecycle(self):
        content = {
            'activityId': self.activity.activity_id,
            'kind': Activity.KIND_ARCADE_QUIZ,
            'title': "Quiz Rapide IA",
            'xp': 50,
            'isActive': True,
        }
        self.client.put(f'{BASE_ITEMS}/activity/{self.activity.activity_id}/draft', {'content': content}, format='json')
        self.client.post(f'{BASE_ITEMS}/activity/{self.activity.activity_id}/publish', {'immediate': True}, format='json')

        self.activity.refresh_from_db()
        self.assertEqual(self.activity.title, "Quiz Rapide IA")
        self.assertEqual(self.activity.xp, 50)
        self.assertEqual(self.activity.kind, Activity.KIND_ARCADE_QUIZ)
