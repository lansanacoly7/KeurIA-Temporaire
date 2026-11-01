from rest_framework import status
from rest_framework.test import APITestCase

from apps.accounts.models import User
from apps.progress.models import Progress


class ProgressValidationTests(APITestCase):
    def setUp(self):
        User.objects.create_user(email="eleve@example.com", password="motdepasse123", role="eleve",
                                 display_name="Awa Ndiaye")
        self.client.post("/api/auth/login", {"email": "eleve@example.com", "password": "motdepasse123"})

    def test_missing_lesson_id_is_a_400_not_a_500(self):
        response = self.client.post("/api/progress", {"score": 80}, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_client_cannot_grant_itself_xp(self):
        response = self.client.post("/api/progress", {"lessonId": "jeux7-9-01", "xp": 1_000_000}, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["xp_gained"], 30)  # XP du catalogue serveur, pas celle du navigateur
        self.assertEqual(Progress.objects.get().xp, 30)
    def test_score_must_be_between_0_and_100(self):
        for score in (-5, 101):
            response = self.client.post("/api/progress", {"lessonId": "jeux7-9-01", "score": score}, format="json")
            self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST, score)


class DailyUsageReadTests(APITestCase):
    def setUp(self):
        User.objects.create_user(email="eleve@example.com", password="motdepasse123", role="eleve")
        self.client.post("/api/auth/login", {"email": "eleve@example.com", "password": "motdepasse123"})

    def test_get_returns_todays_counters(self):
        self.client.post("/api/daily-usage", {"kind": "lesson", "age": "7-9"}, format="json")
        self.client.post("/api/daily-usage", {"kind": "minute", "age": "7-9"}, format="json")

        response = self.client.get("/api/daily-usage?age=7-9")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["usage"], {"minutes": 11, "lessons": 1, "quizzes": 0, "games": 0})

    def test_unknown_kind_is_rejected(self):
        response = self.client.post("/api/daily-usage", {"kind": "hack", "age": "7-9"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
