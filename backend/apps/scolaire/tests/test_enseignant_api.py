from datetime import timedelta

from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from apps.accounts.models import User
from ..mission_quizzes import MISSION_QUIZZES
from ..models import Assignment, AssignmentCompletion
from .helpers import build_school


class TeacherTestCase(APITestCase):
    def setUp(self):
        self.data = build_school()
        self.teacher = self.data['teacher']
        self.client.force_login(self.teacher)

    def assign(self, **overrides):
        body = {'missionId': 'm2', 'classIds': [str(self.data['ce1a'].pk)],
                'dueDate': (timezone.localdate() + timedelta(days=5)).isoformat(), 'instructions': ''}
        body.update(overrides)
        return self.client.post('/api/enseignant/assignments', body, format='json')


class TeacherScopeTests(TeacherTestCase):
    def test_admin_and_parent_cannot_use_teacher_space(self):
        self.client.force_login(self.data['admin'])
        self.assertEqual(self.client.get('/api/enseignant/overview').status_code, status.HTTP_403_FORBIDDEN)

    def test_sees_only_own_classes_and_students(self):
        classes = self.client.get('/api/enseignant/classes').data
        self.assertEqual([c['classroom']['id'] for c in classes], [str(self.data['ce1a'].pk)])
        other_class = self.client.get(f"/api/enseignant/classes/{self.data['ce1b'].pk}")
        self.assertEqual(other_class.status_code, status.HTTP_403_FORBIDDEN)
        other_student = self.data['students'][2]
        for url in (f'/api/enseignant/students/{other_student.pk}', f'/api/enseignant/students/{other_student.pk}/parent-link'):
            self.assertEqual(self.client.get(url).status_code, status.HTTP_403_FORBIDDEN, url)
        reset = self.client.post(f'/api/enseignant/students/{other_student.pk}/password')
        self.assertEqual(reset.status_code, status.HTTP_403_FORBIDDEN)

    def test_other_school_teacher_is_isolated(self):
        other = build_school('autre')
        self.client.force_login(other['teacher'])
        response = self.client.get(f"/api/enseignant/classes/{self.data['ce1a'].pk}")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_overview_and_settings(self):
        overview = self.client.get('/api/enseignant/overview').data
        self.assertEqual(overview['students'], 2)
        self.assertEqual(overview['studentsToFollow'][0]['reasons'], ['Jamais connecté'])
        self.assertEqual(self.client.get('/api/enseignant/settings').data['teacher']['firstName'], 'Khady')

    def test_reset_password_and_credentials_for_own_students(self):
        student = self.data['students'][0]
        creds = self.client.post(f'/api/enseignant/students/{student.pk}/password').data
        student.user.refresh_from_db()
        self.assertTrue(student.user.check_password(creds['temporaryPassword']))
        sheet = self.client.post(f"/api/enseignant/classes/{self.data['ce1a'].pk}/credentials",
                                 {'studentIds': [str(student.pk)]}, format='json').data
        self.assertIn('parentCode', sheet[0]['credentials'])
        foreign = self.client.post(f"/api/enseignant/classes/{self.data['ce1a'].pk}/credentials",
                                   {'studentIds': [str(self.data['students'][2].pk)]}, format='json')
        self.assertEqual(foreign.status_code, status.HTTP_400_BAD_REQUEST)


class AssignmentTests(TeacherTestCase):
    def test_assign_validation(self):
        self.assertEqual(self.assign().status_code, status.HTTP_201_CREATED)
        self.assertIn('déjà un devoir en cours', self.assign().data['error'])
        past = self.assign(missionId='m3', dueDate=(timezone.localdate() - timedelta(days=1)).isoformat())
        self.assertEqual(past.status_code, status.HTTP_400_BAD_REQUEST)
        too_long = self.assign(missionId='m4', instructions='x' * 501)
        self.assertEqual(too_long.status_code, status.HTTP_400_BAD_REQUEST)
        foreign = self.assign(missionId='m5', classIds=[str(self.data['ce1b'].pk)])
        self.assertEqual(foreign.status_code, status.HTTP_403_FORBIDDEN)
        no_due = self.assign(missionId='m6', dueDate=None)
        self.assertIsNone(no_due.data[0]['assignment']['dueDate'])

    def test_detail_delete_and_analytics(self):
        created = self.assign().data[0]['assignment']
        detail = self.client.get(f"/api/enseignant/assignments/{created['id']}").data
        self.assertEqual(len(detail['pending']), 2)
        assignment = Assignment.objects.get(pk=created['id'])
        AssignmentCompletion.objects.create(assignment=assignment, student=self.data['students'][0], score=80)
        refused = self.client.delete(f"/api/enseignant/assignments/{created['id']}")
        self.assertEqual(refused.status_code, status.HTTP_400_BAD_REQUEST)
        analytics = self.client.get(f"/api/enseignant/classes/{self.data['ce1a'].pk}/analytics").data
        security = next(c for c in analytics['categories'] if c['category'] == 'Sécurité')
        self.assertEqual((security['averageScore'], security['completions']), (80, 1))
        second = self.assign(missionId='m5').data[0]['assignment']
        self.assertEqual(self.client.delete(f"/api/enseignant/assignments/{second['id']}").status_code, status.HTTP_200_OK)

    def test_other_teacher_cannot_read_assignment(self):
        created = self.assign().data[0]['assignment']
        self.client.force_login(self.data['other_teacher'])
        self.assertEqual(self.client.get(f"/api/enseignant/assignments/{created['id']}").status_code, status.HTTP_403_FORBIDDEN)

    def test_student_assignments_and_completion_loop(self):
        # 1. L'enseignant assigne une mission m2 à la classe ce1a
        created = self.assign(missionId='m2').data[0]['assignment']
        assignment_id = created['id']

        # 2. L'élève scolaire de ce1a consulte ses devoirs
        student_user = self.data['students'][0].user
        self.client.force_login(student_user)
        student_data = self.client.get('/api/student/assignments').data
        self.assertTrue(student_data['isSchoolStudent'])
        self.assertEqual(len(student_data['assignments']), 1)
        self.assertEqual(student_data['assignments'][0]['status'], 'a_faire')
        self.assertEqual(student_data['assignments'][0]['mission']['id'], 'm2')

        # 3. Un compte parent ou enfant famille sans école n'a pas accès aux devoirs d'école
        parent_user = User.objects.create_user('parent.solo@test.com', 'Pass-1234', role=User.ROLE_PARENT)
        self.client.force_login(parent_user)
        parent_data = self.client.get('/api/student/assignments').data
        self.assertFalse(parent_data['isSchoolStudent'])
        self.assertEqual(parent_data['assignments'], [])

        # Enfant famille (sans école)
        child_user = User.objects.create_user('enfant.famille@test.com', 'Pass-1234', role=User.ROLE_STUDENT, parent=parent_user)
        self.client.force_login(child_user)
        child_data = self.client.get('/api/student/assignments').data
        self.assertFalse(child_data['isSchoolStudent'])
        self.assertEqual(child_data['assignments'], [])

        # 4. L'élève scolaire répond aux questions, puis rend son devoir : la note est calculée par le serveur
        self.client.force_login(student_user)
        quiz = self.client.get(f'/api/student/assignments/{assignment_id}/quiz').data
        for index, mission_step in enumerate(MISSION_QUIZZES['m2']):
            correct = next(i for i, option in enumerate(mission_step['options']) if option['correct'])
            self.client.post(f'/api/student/assignments/{assignment_id}/answer', {'step': index, 'option': correct}, format='json')
        self.assertEqual(len(quiz['steps']), len(MISSION_QUIZZES['m2']))
        complete_res = self.client.post(f'/api/student/assignments/{assignment_id}/complete', {}, format='json')
        self.assertEqual(complete_res.status_code, status.HTTP_200_OK)
        self.assertEqual(complete_res.data['score'], 100)

        # Vérification côté élève : le devoir est marqué 'termine'
        student_data_after = self.client.get('/api/student/assignments').data
        self.assertEqual(student_data_after['assignments'][0]['status'], 'termine')
        self.assertEqual(student_data_after['assignments'][0]['completion']['score'], 100)

        # 5. L'enseignant consulte le devoir : l'élève est dans "done" avec 95 %
        self.client.force_login(self.teacher)
        detail = self.client.get(f"/api/enseignant/assignments/{assignment_id}").data
        self.assertEqual(len(detail['done']), 1)
        self.assertEqual(detail['done'][0]['completion']['score'], 100)
        self.assertEqual(detail['averageScore'], 100)
        self.assertEqual(len(detail['pending']), 1)
