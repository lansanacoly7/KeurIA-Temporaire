from rest_framework import status
from rest_framework.test import APITestCase

from apps.accounts.models import User
from apps.curriculum.models import AgeTrack, Lesson, Module
from apps.progress.models import Progress


class OfficialLessonXpTests(APITestCase):
    def setUp(self):
        track = AgeTrack.objects.create(key='10-12', name='Explorateurs')
        module = Module.objects.create(track=track, world_id='a1', title='Monde A1')
        Lesson.objects.create(module=module, lesson_id='a1-1', title='Leçon 1', xp=30)
        self.user = User.objects.create_user(email="eleve@example.com", password="motdepasse123", role="eleve")
        self.client.post("/api/auth/login", {"email": "eleve@example.com", "password": "motdepasse123"})

    def test_lesson_xp_comes_from_the_catalogue_not_the_browser(self):
        response = self.client.post("/api/progress", {"lessonId": "a1-1", "xp": 200}, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Progress.objects.get(user=self.user, lesson_id="a1-1").xp, 30)


class ParentalLimitsQueryTests(APITestCase):
    def test_non_numeric_child_id_is_ignored_not_a_500(self):
        User.objects.create_user(email="parent@example.com", password="motdepasse123", role="parent")
        self.client.post("/api/auth/login", {"email": "parent@example.com", "password": "motdepasse123"})

        response = self.client.get("/api/progress/parental-limits?childId=abc")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
