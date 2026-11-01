from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.curriculum.models import AgeTrack, Module, Lesson


class RewardsPersistenceTests(TestCase):
    """
    Vérifie la règle absolue :
    Toutes les récompenses, badges et paliers ne peuvent être reçus qu'une seule fois.
    Même si l'enfant change d'appareil, se déconnecte ou vide son cache,
    la progression est sauvegardée et rien de ce qui a été acquis ne peut être reçu à nouveau.
    """

    def setUp(self):
        self.child = User.objects.create_user(
            email="enfant_test_persistence@keuria.test",
            password="StrongPassword123!",
            role=User.ROLE_STUDENT,
            display_name="Khadija"
        )
        self.track = AgeTrack.objects.create(key="7-9", label="7-9 ans", name="Petits Explorateurs", order=1)
        self.module = Module.objects.create(track=self.track, world_id="p1", title="Bonjour l'IA", order=1)
        self.lesson = Lesson.objects.create(module=self.module, lesson_id="p1-1", title="C'est quoi une IA ?", xp=20, order=1)
        self.client = APIClient()
        self.client.force_authenticate(user=self.child)

    def test_tutorial_and_welcome_badge_awarded_only_once(self):
        # 1. Avant tutoriel : pas de badge
        resp = self.client.get(reverse('progress'))
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertFalse(resp.data['progress']['tutorialCompleted'])
        self.assertNotIn('b_tuto', resp.data['progress']['badges'])
        self.assertNotIn('tuto_done', resp.data['progress']['seenEvents'])

        # 2. Complétion du tutoriel
        resp = self.client.post(reverse('tutorial-complete'), {}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

        # 3. Connexion depuis un nouvel appareil (cache vierge)
        resp = self.client.get(reverse('progress'))
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertTrue(resp.data['progress']['tutorialCompleted'])
        self.assertIn('b_tuto', resp.data['progress']['badges'])
        self.assertIn('tuto_done', resp.data['progress']['seenEvents'])
        self.assertIn('badge_anim_b_tuto', resp.data['progress']['seenEvents'])

    def test_lesson_xp_cannot_be_received_twice(self):
        # 1. Première complétion : gagne 20 XP et débloque 'b_start' et 'b_contact'
        resp = self.client.post(reverse('progress'), {
            'lessonId': 'p1-1', 'score': 100, 'xp': 20, 'stars': 3, 'age': '7-9'
        }, format='json')
        if resp.status_code != status.HTTP_201_CREATED:
            print("POST /api/progress failed:", resp.data)
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(resp.data.get('xp_gained'), 20)

        # 2. Rejouer la même leçon ne doit rapporter AUCUN XP supplémentaire
        resp = self.client.post(reverse('progress'), {
            'lessonId': 'p1-1', 'score': 100, 'xp': 20, 'stars': 3, 'age': '7-9'
        }, format='json')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data.get('xp_gained'), 0)
        self.assertTrue(resp.data.get('already_completed'))

        # 3. Vérification du solde XP total côté serveur
        resp = self.client.get(reverse('progress'))
        self.assertEqual(resp.data['progress']['xp'], 20)
        self.assertEqual(resp.data['progress']['completedLessons'], ['p1-1'])
        self.assertIn('b_start', resp.data['progress']['badges'])
        self.assertIn('b_contact', resp.data['progress']['badges'])

    def test_seen_rewards_persist_across_devices(self):
        # Marquer un badge et un diplôme vus
        resp = self.client.post(reverse('mark-event-seen'), {'event': 'badge_anim_b_contact'}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        resp = self.client.post(reverse('mark-event-seen'), {'event': 'reward_b_module_p1'}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

        # Sur un nouvel appareil, l'API retourne ces événements dans seenEvents
        resp = self.client.get(reverse('progress'))
        seen = resp.data['progress']['seenEvents']
        self.assertIn('badge_anim_b_contact', seen)
        self.assertIn('reward_b_module_p1', seen)

    def test_games_tutorial_seen_persists_across_devices(self):
        resp = self.client.post(reverse('mark-event-seen'), {'event': 'games_tutorial'}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

        resp = self.client.get(reverse('progress'))
        self.assertIn('games_tutorial', resp.data['progress']['seenEvents'])

    def test_returning_learner_has_nothing_left_to_celebrate(self):
        """Un élève qui a déjà progressé ne doit revoir ni le tutoriel ni les animations de ses badges."""
        self.client.post(reverse('progress'), {
            'lessonId': 'p1-1', 'score': 100, 'xp': 20, 'stars': 3, 'age': '7-9'
        }, format='json')

        progress = self.client.get(reverse('progress')).data['progress']

        self.assertTrue(progress['tutorialCompleted'])
        self.assertIn('tuto_done', progress['seenEvents'])
        for badge_id in progress['badges']:
            self.assertIn(f'badge_anim_{badge_id}', progress['seenEvents'])

    def test_behavioral_badges_persisted(self):
        # 20 erreurs = badge 'b_persist'
        for _ in range(20):
            self.client.post(reverse('record-activity'), {'type': 'error'}, format='json')

        # 3 sans-faute = badge 'b_detective'
        for _ in range(3):
            self.client.post(reverse('record-activity'), {'type': 'quiz_result', 'isPerfect': True, 'errors': 0}, format='json')

        resp = self.client.get(reverse('progress'))
        badges = resp.data['progress']['badges']
        self.assertIn('b_persist', badges)
        self.assertIn('b_detective', badges)
        self.assertGreaterEqual(resp.data['progress']['errorCount'], 20)
        self.assertGreaterEqual(resp.data['progress']['perfectStreak'], 3)
