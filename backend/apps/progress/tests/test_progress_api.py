from datetime import timedelta

from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from apps.accounts.models import User, UserConnectionDay
from apps.curriculum.models import AgeTrack, Lesson, Module
from apps.learners.models import LearnerProfile
from apps.progress.models import DailyUsage, Progress
from apps.progress.tests.helpers import make_lesson


class ProgressApiTestCase(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="eleve@example.com", password="motdepasse123", role="eleve"
        )

    def _login(self):
        self.client.post("/api/auth/login", {
            "email": "eleve@example.com",
            "password": "motdepasse123",
        })


class ProgressViewTests(ProgressApiTestCase):
    url = "/api/progress"

    def setUp(self):
        super().setUp()
        make_lesson("p1-1", xp=20)
        make_lesson("p1-2", xp=30)

    def test_get_progress_without_session_is_refused(self):
        response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_post_progress_without_session_returns_401(self):
        response = self.client.post(self.url, {"lessonId": "p1-1"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_xp_comes_from_the_server_catalog_not_from_the_score(self):
        self._login()

        response = self.client.post(self.url, {"lessonId": "p1-1", "age": "10-12", "score": 80}, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["xp_gained"], 20)  # Lesson.xp, quel que soit le score
        obj = Progress.objects.get(owner_email="eleve@example.com", lesson_id="p1-1")
        self.assertEqual((obj.score, obj.xp), (80, 20))
        self.assertEqual(response.data["progress"]["xp"], 20)
        self.assertEqual(response.data["progress"]["level"]["level"], 1)
        self.assertIsNone(response.data["progress"]["levelUp"])

    def test_activities_outside_the_lessons_use_the_activity_catalog(self):
        self._login()

        response = self.client.post(self.url, {"lessonId": "jeux7-9-02", "age": "7-9"}, format="json")

        self.assertEqual(response.data["xp_gained"], 40)

    def test_client_supplied_xp_is_ignored(self):
        self._login()

        response = self.client.post(self.url, {"lessonId": "jeux7-9-02", "age": "7-9", "xp": 999}, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["xp_gained"], 40)
        self.assertEqual(Progress.objects.get(lesson_id="jeux7-9-02").xp, 40)

    def test_unknown_activity_is_rejected_and_grants_nothing(self):
        self._login()

        response = self.client.post(self.url, {"lessonId": "inconnu-42", "score": 100}, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(Progress.objects.exists())

    def test_replaying_an_activity_never_grants_xp_again(self):
        self._login()
        self.client.post(self.url, {"lessonId": "p1-1", "score": 60}, format="json")

        again = self.client.post(self.url, {"lessonId": "p1-1", "score": 100}, format="json")

        self.assertEqual(again.status_code, status.HTTP_200_OK)
        self.assertEqual(again.data["xp_gained"], 0)
        self.assertTrue(again.data["already_completed"])
        self.assertEqual(again.data["progress"]["xp"], 20)
        self.assertEqual(Progress.objects.get(lesson_id="p1-1").xp, 20)

    def test_replaying_keeps_the_best_score(self):
        self._login()
        self.client.post(self.url, {"lessonId": "p1-1", "score": 50}, format="json")
        self.client.post(self.url, {"lessonId": "p1-1", "score": 90}, format="json")
        self.client.post(self.url, {"lessonId": "p1-1", "score": 40}, format="json")

        self.assertEqual(Progress.objects.get(lesson_id="p1-1").score, 90)

    def test_parent_viewing_a_child_does_not_record_a_connection_for_the_child(self):
        parent = User.objects.create_user(email="parent@example.com", password="motdepasse123", role="parent")
        self.user.parent = parent
        self.user.save(update_fields=["parent"])
        Progress.objects.create(user=self.user, owner_email=self.user.email, lesson_id="p1-1", age_track="10-12", xp=25, score=100)
        self.client.force_authenticate(parent)

        response = self.client.get(self.url, {"child_id": self.user.id})

        self.assertEqual(response.data["progress"]["xp"], 25)  # données de l'enfant, pas du parent
        self.assertEqual(response.data["progress"]["userId"], self.user.id)
        self.assertFalse(UserConnectionDay.objects.filter(user=self.user).exists())

    def test_learner_reading_own_progress_records_a_connection(self):
        self.client.force_authenticate(self.user)

        self.client.get(self.url)

        self.assertTrue(UserConnectionDay.objects.filter(user=self.user).exists())

    def test_get_progress_exposes_the_learner_age_track(self):
        self._login()
        self.assertIsNone(self.client.get(self.url).data["progress"]["ageTrack"])

        LearnerProfile.objects.create(learner=self.user, owner_email=self.user.email, age_track="7-9")

        self.assertEqual(self.client.get(self.url).data["progress"]["ageTrack"], "7-9")

    def test_get_progress_aggregates_xp_across_lessons_and_exposes_the_level(self):
        self._login()
        self.client.post(self.url, {"lessonId": "p1-1", "score": 80}, format="json")
        self.client.post(self.url, {"lessonId": "p1-2", "score": 100}, format="json")

        progress = self.client.get(self.url).data["progress"]

        self.assertEqual(progress["xp"], 20 + 30)
        self.assertCountEqual(progress["completedLessons"], ["p1-1", "p1-2"])
        self.assertEqual(progress["level"]["name"], "Explorateur débutant")  # 50 XP = palier 2, exactement


class DailyUsageViewTests(ProgressApiTestCase):
    url = "/api/daily-usage"

    def test_post_without_session_returns_401(self):
        response = self.client.post(self.url, {"kind": "lesson"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_post_lesson_increments_lessons_and_minutes(self):
        self._login()

        response = self.client.post(self.url, {"kind": "lesson", "age": "10-12"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["usage"]["lessons"], 1)
        self.assertEqual(response.data["usage"]["minutes"], 10)

    def test_post_quiz_then_game_accumulate_on_same_day(self):
        self._login()

        self.client.post(self.url, {"kind": "quiz", "age": "10-12"}, format="json")
        response = self.client.post(self.url, {"kind": "game", "age": "10-12"}, format="json")

        self.assertEqual(response.data["usage"]["quizzes"], 1)
        self.assertEqual(response.data["usage"]["games"], 1)
        self.assertEqual(response.data["usage"]["minutes"], 5 + 15)


class ParentTrackingPedagogyTests(ProgressApiTestCase):
    url = "/api/progress/tracking"

    def setUp(self):
        super().setUp()
        self.parent = User.objects.create_user(
            email="parent@example.com", password="motdepasse123", role="parent"
        )
        self.user.parent = self.parent
        self.user.save(update_fields=["parent"])
        self.client.post("/api/auth/login", {"email": "parent@example.com", "password": "motdepasse123"})

    def _tracked_child(self):
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        return response.data["tracking"][0]

    def test_time_spent_counts_real_presence_not_activity_bonuses(self):
        today = timezone.localdate()
        # Un jour de présence réelle + une leçon (forfait de 10 min qui ne doit PAS compter comme du temps passé).
        self.client.post("/api/auth/login", {"email": self.user.email, "password": "motdepasse123"})
        for _ in range(3):
            self.client.post("/api/daily-usage", {"kind": "minute", "age": "10-12"}, format="json")
        self.client.post("/api/daily-usage", {"kind": "lesson", "age": "10-12"}, format="json")
        # Des jours plus anciens : hier, la semaine dernière, et un jour plus lointain.
        for days_ago, minutes in ((1, 20), (8, 30), (40, 50)):
            DailyUsage.objects.create(user=self.user, owner_email=self.user.email, usage_date=today - timedelta(days=days_ago),
                                      age_track="10-12", minutes=minutes + 99, presence_minutes=minutes)
        self.client.post("/api/auth/login", {"email": "parent@example.com", "password": "motdepasse123"})

        spent = self._tracked_child()["timeSpent"]

        self.assertEqual(spent["todayMinutes"], 3)
        self.assertEqual(spent["totalMinutes"], 3 + 20 + 30 + 50)
        self.assertEqual(len(spent["days"]), 7)
        self.assertEqual(spent["days"][-1], {"date": today.isoformat(), "minutes": 3})
        self.assertEqual(len(spent["weeks"]), 4)
        week_start = today - timedelta(days=today.weekday())
        expected_week = 3 + (20 if today - timedelta(days=1) >= week_start else 0)
        self.assertEqual(spent["weekMinutes"], expected_week)
        self.assertEqual(spent["since"], (today - timedelta(days=40)).isoformat())

    def test_child_without_usage_has_zero_time_spent(self):
        spent = self._tracked_child()["timeSpent"]

        self.assertEqual(spent["totalMinutes"], 0)
        self.assertEqual(spent["weekMinutes"], 0)
        self.assertIsNone(spent["since"])

    def test_child_without_activity_has_empty_pedagogy(self):
        pedagogy = self._tracked_child()["pedagogy"]

        self.assertEqual(pedagogy["activeDays"], 0)
        self.assertIsNone(pedagogy["avgMinutesPerActiveDay"])
        self.assertIsNone(pedagogy["lastActivityAt"])
        self.assertEqual(pedagogy["modules"], [])

    def test_pedagogy_is_computed_from_recorded_progress_and_usage(self):
        track = AgeTrack.objects.create(key="10-12", label="10-12 ans", name="Explorateurs")
        module = Module.objects.create(track=track, world_id="p1", title="Comprendre l'IA", description="d")
        for lesson_id, title in (("p1-1", "Qu'est-ce que l'IA ?"), ("p1-2", "Apprendre avec des exemples")):
            Lesson.objects.create(module=module, lesson_id=lesson_id, title=title)
        Lesson.objects.create(module=module, lesson_id="p1-3", title="Limites de l'IA")
        Progress.objects.create(user=self.user, owner_email=self.user.email, lesson_id="p1-1", age_track="10-12", xp=20, score=80)
        Progress.objects.create(user=self.user, owner_email=self.user.email, lesson_id="p1-2", age_track="10-12", xp=20, score=100)
        DailyUsage.objects.create(
            user=self.user, owner_email=self.user.email, usage_date=timezone.now().date(),
            age_track="10-12", minutes=45, presence_minutes=30,
        )

        pedagogy = self._tracked_child()["pedagogy"]

        self.assertEqual(pedagogy["activeDays"], 1)
        self.assertEqual(pedagogy["avgMinutesPerActiveDay"], 30)
        self.assertIsNotNone(pedagogy["lastActivityAt"])
        self.assertEqual(len(pedagogy["modules"]), 1)
        self.assertEqual(pedagogy["modules"][0]["title"], "Comprendre l'IA")
        self.assertEqual(pedagogy["modules"][0]["avgScore"], 90)
        self.assertEqual(pedagogy["modules"][0]["done"], 2)
        self.assertEqual(pedagogy["modules"][0]["total"], 3)
