from datetime import timedelta

from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from apps.progress.models import Progress

from .helpers import build_school


def earn(profile, xp, lesson_id="p1-1", days_ago=0):
    Progress.objects.create(
        user=profile.user, owner_email=profile.user.email, lesson_id=lesson_id, age_track="7-9", xp=xp, score=100,
        completed_at=timezone.now() - timedelta(days=days_ago),
    )


class SchoolLeaderboardTests(APITestCase):
    def setUp(self):
        self.data = build_school()
        self.awa, self.modou, self.adja, self.cheikh = self.data['students']  # CE1 A, CE1 A, CE1 B, 3e A

    def test_direction_ranks_only_its_own_school_with_full_names(self):
        earn(self.awa, 30)
        earn(self.adja, 50)
        other = build_school('autre-ecole')
        earn(other['students'][0], 999)
        self.client.force_login(self.data['admin'])

        response = self.client.get('/api/ecole/leaderboard')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        entries = response.data['entries']
        self.assertEqual([(e['rank'], e['student']['lastName'], e['xp']) for e in entries], [(1, 'Ba', 50), (2, 'Diop', 30)])
        self.assertEqual(entries[0]['student']['firstName'], 'Adja')
        self.assertEqual(entries[0]['classroom']['section'], 'B')
        self.assertEqual(response.data['totalStudents'], 4)
        self.assertEqual(response.data['participants'], 2)
        self.assertEqual(response.data['totalXp'], 80)

    def test_students_without_xp_and_disabled_accounts_are_not_ranked(self):
        earn(self.awa, 10)
        earn(self.modou, 70)
        self.modou.user.is_active = False
        self.modou.user.save(update_fields=['is_active'])
        self.client.force_login(self.data['admin'])

        response = self.client.get('/api/ecole/leaderboard')

        self.assertEqual([e['student']['firstName'] for e in response.data['entries']], ['Awa'])
        self.assertEqual(response.data['totalStudents'], 3)

    def test_students_who_left_are_not_ranked(self):
        earn(self.awa, 10)
        self.awa.left_in_year = '2025-2026'
        self.awa.save(update_fields=['left_in_year'])
        self.client.force_login(self.data['admin'])

        self.assertEqual(self.client.get('/api/ecole/leaderboard').data['entries'], [])

    def test_class_filter(self):
        earn(self.awa, 30)
        earn(self.adja, 50)
        self.client.force_login(self.data['admin'])

        response = self.client.get('/api/ecole/leaderboard', {'classId': str(self.data['ce1a'].pk)})

        self.assertEqual([e['student']['firstName'] for e in response.data['entries']], ['Awa'])

    def test_class_of_another_school_is_not_found(self):
        other = build_school('autre-ecole')
        self.client.force_login(self.data['admin'])

        response = self.client.get('/api/ecole/leaderboard', {'classId': str(other['ce1a'].pk)})

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_period_filter_and_validation(self):
        earn(self.awa, 90, days_ago=10)
        earn(self.awa, 5, lesson_id='p1-2', days_ago=1)
        self.client.force_login(self.data['admin'])

        self.assertEqual(self.client.get('/api/ecole/leaderboard').data['entries'][0]['xp'], 5)
        self.assertEqual(self.client.get('/api/ecole/leaderboard', {'period': 'all_time'}).data['entries'][0]['xp'], 95)
        self.assertEqual(self.client.get('/api/ecole/leaderboard', {'period': 'x'}).status_code, status.HTTP_400_BAD_REQUEST)

    def test_only_the_direction_can_use_the_school_endpoint(self):
        self.client.force_login(self.data['teacher'])

        self.assertEqual(self.client.get('/api/ecole/leaderboard').status_code, status.HTTP_403_FORBIDDEN)
        self.client.logout()
        self.assertIn(self.client.get('/api/ecole/leaderboard').status_code, (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN))


class TeacherLeaderboardTests(APITestCase):
    def setUp(self):
        self.data = build_school()
        self.awa, self.modou, self.adja, self.cheikh = self.data['students']
        earn(self.awa, 30)
        earn(self.adja, 80)  # élève d'une classe qui n'est pas celle de l'enseignante
        self.client.force_login(self.data['teacher'])  # Khady : CE1 A uniquement

    def test_teacher_only_ranks_pupils_of_her_own_classes(self):
        response = self.client.get('/api/enseignant/leaderboard')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual([e['student']['firstName'] for e in response.data['entries']], ['Awa'])
        self.assertEqual([c['id'] for c in response.data['classrooms']], [str(self.data['ce1a'].pk)])
        self.assertEqual(response.data['totalStudents'], 2)

    def test_teacher_cannot_filter_on_someone_elses_class(self):
        response = self.client.get('/api/enseignant/leaderboard', {'classId': str(self.data['ce1b'].pk)})

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_direction_cannot_use_the_teacher_endpoint(self):
        self.client.force_login(self.data['admin'])

        self.assertEqual(self.client.get('/api/enseignant/leaderboard').status_code, status.HTTP_403_FORBIDDEN)
