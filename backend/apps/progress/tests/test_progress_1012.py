from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.curriculum.models import AgeTrack, Module, Lesson, LessonContent
from apps.learners.models import LearnerProfile


class Progress1012TestCase(TestCase):
    def setUp(self):
        self.client = APIClient()

        # Track 10-12 and 4 example lessons
        self.track = AgeTrack.objects.create(key="10-12", label="10–12 ans", name="Jeunes Aventuriers", order=2)
        self.module = Module.objects.create(track=self.track, world_id="a1", title="Bienvenue dans l'IA", order=1)

        self.lessons = []
        for i, title in enumerate([
            "IA ou simple programme ?",
            "Robot = IA ?",
            "Les super-pouvoirs de l'IA",
            "Mission détective"
        ], 1):
            les = Lesson.objects.create(
                module=self.module,
                lesson_id=f"a1-{i}",
                title=title,
                xp=20,
                stars=3,
                order=i
            )
            LessonContent.objects.create(lesson=les, mission=f"Mission {i}")
            self.lessons.append(les)

        # Parent & Child 10-12
        self.parent = User.objects.create_user(
            email="parent1012@example.com",
            display_name="Papa Fall",
            role=User.ROLE_PARENT
        )
        self.child = User.objects.create_user(
            email="enfant1012@example.com",
            display_name="Aminata Fall",
            role=User.ROLE_STUDENT,
            age_group="10-12",
            parent=self.parent
        )
        self.profile = LearnerProfile.objects.create(
            learner=self.child,
            nickname="Aminata",
            age_track="10-12"
        )

    def test_complete_4_lessons_records_stars_xp_and_badges(self):
        self.client.force_authenticate(user=self.child)

        # 1. Complete lesson a1-1
        resp1 = self.client.post('/api/progress', {'lessonId': 'a1-1', 'score': 100, 'stars': 3, 'age': '10-12'}, format='json')
        self.assertIn(resp1.status_code, [status.HTTP_200_OK, status.HTTP_201_CREATED])
        self.assertEqual(resp1.data['progress']['xp'], 20)

        # Check badge b_contact ("Premier contact") is earned for a1-1
        resp_prog = self.client.get('/api/progress')
        self.assertIn('a1-1', resp_prog.data['progress']['completedLessons'])
        self.assertEqual(resp_prog.data['progress']['lessonStars'].get('a1-1'), 3)
        self.assertIn('b_contact', resp_prog.data['progress']['badges'])

        # 2. Complete remaining lessons a1-2, a1-3, a1-4
        for i in [2, 3, 4]:
            lid = f"a1-{i}"
            r = self.client.post('/api/progress', {'lessonId': lid, 'score': 100, 'stars': 3, 'age': '10-12'}, format='json')
            self.assertIn(r.status_code, [status.HTTP_200_OK, status.HTTP_201_CREATED])

        # Verify child sees all completed lessons, total stars, and badges
        final_prog = self.client.get('/api/progress').data['progress']
        self.assertEqual(final_prog['xp'], 80)
        self.assertEqual(final_prog['totalStars'], 12)
        self.assertCountEqual(final_prog['completedLessons'], ['a1-1', 'a1-2', 'a1-3', 'a1-4'])
        # 4 lessons badge (b_brain) and 2 lessons badge (b_eye)
        self.assertIn('b_eye', final_prog['badges'])
        self.assertIn('b_brain', final_prog['badges'])

        # 3. Verify parent dashboard reflects 10-12 child progress accurately
        self.client.force_authenticate(user=self.parent)
        parent_resp = self.client.get('/api/progress/tracking')
        self.assertEqual(parent_resp.status_code, status.HTTP_200_OK)
        tracking_list = parent_resp.data.get('tracking', [])
        self.assertEqual(len(tracking_list), 1)

        child_data = tracking_list[0]
        self.assertEqual(child_data['displayName'], "Aminata Fall")
        self.assertEqual(child_data['xp'], 80)
        self.assertEqual(child_data['totalLessons'], 4)
        self.assertCountEqual(child_data['completedLessons'], ['a1-1', 'a1-2', 'a1-3', 'a1-4'])
        self.assertEqual(child_data['lastLesson'], 'a1-4')

