from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.accounts.serializers import age_group_for
from apps.curriculum.models import AgeTrack, Module, Lesson, LessonContent
from apps.learners.models import LearnerProfile


class TrackIsolationTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()

        # 1. Tracks & Modules & Lessons
        self.track79 = AgeTrack.objects.create(key="7-9", label="7–9 ans", name="Petits Explorateurs", order=1)
        self.mod_p1 = Module.objects.create(track=self.track79, world_id="p1", title="Bonjour l'IA", order=1)
        self.les_p1_1 = Lesson.objects.create(module=self.mod_p1, lesson_id="p1-1", title="C'est quoi une IA ?", xp=20, order=1)
        LessonContent.objects.create(lesson=self.les_p1_1, mission="Découvre l'IA")

        self.track1012 = AgeTrack.objects.create(key="10-12", label="10–12 ans", name="Jeunes Aventuriers", order=2)
        self.mod_a1 = Module.objects.create(track=self.track1012, world_id="a1", title="Bienvenue dans l'IA", order=1)
        self.les_a1_1 = Lesson.objects.create(module=self.mod_a1, lesson_id="a1-1", title="IA ou simple programme ?", xp=20, order=1)
        LessonContent.objects.create(lesson=self.les_a1_1, mission="Différencie IA et programme")

        # 2. Users
        self.parent = User.objects.create_user(
            email="parent_test@example.com",
            display_name="Parent Test",
            role=User.ROLE_PARENT
        )

        # Enfant de 8 ans (assigné 7-9)
        self.child8 = User.objects.create_user(
            email="enfant8@example.com",
            display_name="Moussa",
            role=User.ROLE_STUDENT,
            age_group=age_group_for(8),
            parent=self.parent
        )
        LearnerProfile.objects.create(learner=self.child8, nickname="Moussa", age_track=age_group_for(8))

        # Enfant de 11 ans (assigné 10-12)
        self.child11 = User.objects.create_user(
            email="enfant11@example.com",
            display_name="Aminata",
            role=User.ROLE_STUDENT,
            age_group=age_group_for(11),
            parent=self.parent
        )
        LearnerProfile.objects.create(learner=self.child11, nickname="Aminata", age_track=age_group_for(11))

    def test_age_group_attribution_by_age(self):
        """Un enfant de 8 ans reçoit 7-9, un enfant de 11 ans reçoit 10-12."""
        self.assertEqual(age_group_for(8), '7-9')
        self.assertEqual(age_group_for(11), '10-12')
        self.assertEqual(self.child8.age_group, '7-9')
        self.assertEqual(self.child11.age_group, '10-12')

    def test_child_8_cannot_access_or_validate_track_1012(self):
        """L'enfant de 8 ans accède au 7-9, mais est bloqué (403) sur le 10-12."""
        self.client.force_authenticate(user=self.child8)

        # Accès leçon de son parcours -> 200 OK
        resp_own = self.client.get('/api/curriculum/lessons/p1-1/')
        self.assertEqual(resp_own.status_code, status.HTTP_200_OK)

        # Tentative d'accès à une leçon 10-12 -> 403 Forbidden
        resp_other = self.client.get('/api/curriculum/lessons/a1-1/')
        self.assertEqual(resp_other.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn("Cette leçon n'appartient pas à ton parcours", resp_other.data.get('error', ''))

        # Tentative de validation d'une leçon 10-12 via l'API -> 403 Forbidden
        resp_post = self.client.post('/api/progress', {'lessonId': 'a1-1', 'score': 100, 'stars': 3}, format='json')
        self.assertEqual(resp_post.status_code, status.HTTP_403_FORBIDDEN)

        # Validation de sa propre leçon 7-9 -> 201 Created
        resp_post_own = self.client.post('/api/progress', {'lessonId': 'p1-1', 'score': 100, 'stars': 3}, format='json')
        self.assertIn(resp_post_own.status_code, [status.HTTP_200_OK, status.HTTP_201_CREATED])

    def test_child_11_cannot_access_or_validate_track_79(self):
        """L'enfant de 11 ans accède au 10-12, mais est bloqué (403) sur le 7-9."""
        self.client.force_authenticate(user=self.child11)

        # Accès leçon de son parcours -> 200 OK
        resp_own = self.client.get('/api/curriculum/lessons/a1-1/')
        self.assertEqual(resp_own.status_code, status.HTTP_200_OK)

        # Tentative d'accès à une leçon 7-9 -> 403 Forbidden
        resp_other = self.client.get('/api/curriculum/lessons/p1-1/')
        self.assertEqual(resp_other.status_code, status.HTTP_403_FORBIDDEN)

        # Tentative d'accès content79 d'une leçon 7-9 -> 403 Forbidden
        resp_c79 = self.client.get('/api/curriculum/content79/p1-1/')
        self.assertEqual(resp_c79.status_code, status.HTTP_403_FORBIDDEN)

        # Tentative de validation d'une leçon 7-9 via l'API -> 403 Forbidden
        resp_post = self.client.post('/api/progress', {'lessonId': 'p1-1', 'score': 100, 'stars': 3}, format='json')
        self.assertEqual(resp_post.status_code, status.HTTP_403_FORBIDDEN)

        # Validation de sa propre leçon 10-12 -> 201 Created
        resp_post_own = self.client.post('/api/progress', {'lessonId': 'a1-1', 'score': 100, 'stars': 3}, format='json')
        self.assertIn(resp_post_own.status_code, [status.HTTP_200_OK, status.HTTP_201_CREATED])

