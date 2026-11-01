from datetime import timedelta

from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from apps.curriculum.models import AgeTrack, Lesson, Module
from apps.progress.models import Progress

from ..models import Classroom, Mission
from .helpers import build_school


def create_lessons(track_key='7-9', count=2):
    track, _ = AgeTrack.objects.get_or_create(key=track_key, defaults={'name': 'Petits Explorateurs', 'label': '7-9 ans'})
    module, _ = Module.objects.get_or_create(track=track, world_id='t4-test', defaults={'title': 'Module test', 'description': ''})
    created = []
    for order in range(1, count + 1):
        lesson, _ = Lesson.objects.get_or_create(
            lesson_id=f't4-l{order}', defaults={'title': f'Leçon {order}', 'module': module, 'order': order})
        mission, _ = Mission.objects.get_or_create(
            id=f't4-m{order}', defaults={'title': f'Mission {order}', 'description': '', 'category': 'Test',
                                          'difficulty': 'facile', 'duration_minutes': 10, 'xp': 10,
                                          'active': True, 'kind': Mission.KIND_LESSON, 'track': track_key,
                                          'module': module, 'lesson': lesson})
        created.append(mission)
    return created


class BlocagesTests(APITestCase):
    def setUp(self):
        self.data = build_school()
        self.teacher = self.data['teacher']
        self.client.force_login(self.teacher)
        self.lessons = create_lessons()
        self.classroom = self.data['ce1a']

    def url(self, classroom=None):
        classroom = classroom or self.classroom
        return f'/api/enseignant/classes/{classroom.pk}/blocages'

    def test_isolation_other_teacher_403(self):
        self.client.force_login(self.data['other_teacher'])
        self.assertEqual(self.client.get(self.url()).status_code, status.HTTP_403_FORBIDDEN)

    def test_stopped_appears_once_on_next_lesson(self):
        # Awa termine la première leçon récemment ; Modou n'a rien et est inactif.
        student = self.data['students'][0]
        Progress.objects.create(user=student.user, owner_email=student.user.email,
                                lesson_id='t4-l1', age_track='7-9', stars=3, score=90,
                                completed_at=timezone.now() - timedelta(days=1))
        # Un élève d'une autre classe avec la même leçon : jamais listé.
        other = self.data['students'][2]
        Progress.objects.create(user=other.user, owner_email=other.user.email,
                                lesson_id='t4-l1', age_track='7-9', stars=1, score=40,
                                completed_at=timezone.now() - timedelta(days=1))
        data = self.client.get(self.url()).data
        rows = data['lessons']
        self.assertEqual(len(rows), 2)
        stopped_ids = [s['id'] for row in rows for s in row['stopped']]
        self.assertEqual(stopped_ids.count(str(self.data['students'][1].pk)), 1)
        self.assertNotIn(str(other.pk), stopped_ids)
        # moyenne d'étoiles sur la leçon 1 : 3.0 (seul Awa de cette classe)
        self.assertEqual(rows[0]['averageStars'], 3.0)
        self.assertEqual(rows[0]['completed'], 1)
        self.assertIsNone(data['message'])

    def test_difficult_one_star(self):
        student = self.data['students'][0]
        Progress.objects.create(user=student.user, owner_email=student.user.email,
                                lesson_id='t4-l1', age_track='7-9', stars=1, score=40,
                                completed_at=timezone.now() - timedelta(days=1))
        data = self.client.get(self.url()).data
        self.assertEqual([s['id'] for s in data['lessons'][0]['difficult']], [str(student.pk)])
        self.assertIsNone(data['message'])  # message d'encouragement seulement si aucun blocage

    def test_class_without_students(self):
        empty = Classroom.objects.create(school=self.data['school'], level='CP', section='Z',
                                         teacher=self.teacher, academic_year=self.data['label'])
        data = self.client.get(self.url(empty)).data
        self.assertEqual(data['studentCount'], 0)
        self.assertEqual(data['message'], "Aucun élève n'est bloqué.")
        self.assertTrue(all(not row['difficult'] and not row['stopped'] for row in data['lessons']))

    def test_response_has_only_expected_fields(self):
        data = self.client.get(self.url()).data
        self.assertEqual(set(data.keys()), {'classroom', 'studentCount', 'lessons', 'message'})
        self.assertEqual(set(data['lessons'][0].keys()),
                         {'lessonId', 'lessonTitle', 'moduleTitle', 'completed', 'total',
                          'averageStars', 'difficult', 'stopped'})
