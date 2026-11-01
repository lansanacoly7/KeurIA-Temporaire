"""Devoirs côté élève : la note est calculée par le serveur, la première remise fait foi, l'XP n'est gagnée qu'une fois."""
from datetime import timedelta

from django.utils import timezone
from rest_framework import status

from apps.progress.models import Progress

from ..mission_quizzes import MISSION_QUIZZES
from ..models import Assignment, AssignmentAnswer, AssignmentCompletion
from .test_enseignant_api import TeacherTestCase

QUIZ = MISSION_QUIZZES['m2']  # deux questions


def good(step):
    return next(i for i, option in enumerate(QUIZ[step]['options']) if option['correct'])


def bad(step):
    return next(i for i, option in enumerate(QUIZ[step]['options']) if not option['correct'])


class StudentAssignmentQuizTests(TeacherTestCase):
    def setUp(self):
        super().setUp()
        self.assignment_id = int(self.assign(missionId='m2').data[0]['assignment']['id'])
        self.student = self.data['students'][0]
        self.client.force_login(self.student.user)
        self.base = f'/api/student/assignments/{self.assignment_id}'

    def answer(self, step, option):
        return self.client.post(f'{self.base}/answer', {'step': step, 'option': option}, format='json')

    def complete(self, body=None):
        return self.client.post(f'{self.base}/complete', body or {}, format='json')

    def finish(self, options):
        for step, option in enumerate(options):
            self.answer(step, option)
        return self.complete()

    # ── la correction n'est pas dans le navigateur ────────────────────────────
    def test_the_quiz_never_ships_the_correct_answers(self):
        quiz = self.client.get(f'{self.base}/quiz').data

        self.assertEqual(len(quiz['steps']), len(QUIZ))
        text = str(quiz)
        self.assertNotIn('correct', text)
        self.assertNotIn('explanation', text)
        self.assertEqual(quiz['answers'], {})

    def test_the_correction_is_revealed_only_after_answering(self):
        response = self.answer(0, bad(0))

        self.assertFalse(response.data['correct'])
        self.assertEqual(response.data['correctOption'], good(0))
        self.assertTrue(response.data['explanation'])

    # ── la note vient du serveur ──────────────────────────────────────────────
    def test_a_perfect_run_scores_100(self):
        response = self.finish([good(0), good(1)])

        self.assertEqual(response.data['score'], 100)
        self.assertGreater(response.data['xpGained'], 0)

    def test_the_score_follows_the_real_answers(self):
        response = self.finish([good(0), bad(1)])

        self.assertEqual(response.data['score'], 50)

    def test_a_score_sent_by_the_browser_is_ignored(self):
        self.answer(0, bad(0))
        self.answer(1, bad(1))

        response = self.complete({'score': 100})

        self.assertEqual(response.data['score'], 0)

    def test_the_assignment_cannot_be_completed_with_unanswered_questions(self):
        self.answer(0, good(0))

        response = self.complete({'score': 100})

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(AssignmentCompletion.objects.exists())

    def test_the_first_answer_to_a_question_is_final(self):
        self.answer(0, bad(0))
        again = self.answer(0, good(0))

        self.assertFalse(again.data['correct'])
        self.assertEqual(AssignmentAnswer.objects.filter(student=self.student, step=0).count(), 1)

    def test_answers_must_point_to_real_questions_and_options(self):
        for step, option in ((99, 0), (0, 99), ('x', 0), (0, -1), (None, None)):
            self.assertEqual(self.answer(step, option).status_code, status.HTTP_400_BAD_REQUEST, (step, option))

    def test_the_quiz_resumes_where_the_student_stopped(self):
        self.answer(0, good(0))

        quiz = self.client.get(f'{self.base}/quiz').data

        self.assertEqual(list(quiz['answers']), ['0'])
        self.assertTrue(quiz['answers']['0']['correct'])

    # ── première remise = définitive ──────────────────────────────────────────
    def test_the_first_submission_is_final_and_gives_xp_once(self):
        first = self.finish([bad(0), bad(1)])

        self.client.post(f'{self.base}/restart')
        second = self.finish([good(0), good(1)])

        self.assertEqual(first.data['score'], 0)
        self.assertEqual(second.data['score'], 0)
        self.assertEqual(second.data['xpGained'], 0)
        self.assertEqual(AssignmentCompletion.objects.get(student=self.student).score, 0)
        rows = Progress.objects.filter(user=self.student.user, lesson_id=f'devoir:{self.assignment_id}')
        self.assertEqual(rows.count(), 1)

    def test_a_student_cannot_restart_before_the_first_submission(self):
        self.answer(0, good(0))
        self.answer(1, bad(1))

        response = self.client.post(f'{self.base}/restart')

        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)
        self.assertEqual(AssignmentAnswer.objects.filter(student=self.student).count(), 2)

    def test_practice_after_submission_starts_from_a_clean_quiz(self):
        self.finish([good(0), good(1)])

        quiz = self.client.post(f'{self.base}/restart').data

        self.assertEqual(quiz['answers'], {})
        self.assertTrue(quiz['completed'])

    # ── cloisonnement ─────────────────────────────────────────────────────────
    def test_a_student_cannot_touch_another_classes_assignment(self):
        self.client.force_login(self.data['students'][2].user)

        for method, suffix in (('get', 'quiz'), ('post', 'answer'), ('post', 'restart'), ('post', 'complete')):
            response = getattr(self.client, method)(f'{self.base}/{suffix}', {'step': 0, 'option': 0}, format='json')
            self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND, suffix)

    def test_teacher_and_direction_accounts_have_no_school_quiz(self):
        for user in (self.teacher, self.data['admin']):
            self.client.force_login(user)
            self.assertEqual(self.client.get(f'{self.base}/quiz').status_code, status.HTTP_403_FORBIDDEN)

    def test_late_assignments_are_flagged_and_still_completable(self):
        # L'API refuse une échéance passée : un devoir en retard est un devoir dont la date a fini par passer.
        Assignment.objects.filter(pk=self.assignment_id).update(due_date=timezone.localdate() - timedelta(days=2))

        listing = {a['id']: a for a in self.client.get('/api/student/assignments').data['assignments']}
        response = self.finish([good(0), good(1)])

        self.assertEqual(listing[self.assignment_id]['status'], 'en_retard')
        self.assertEqual(response.status_code, status.HTTP_200_OK)


class MissionsWithoutOwnQuizTests(TeacherTestCase):
    def test_a_mission_created_later_gets_the_default_quiz(self):
        from ..mission_quizzes import DEFAULT_QUIZ
        from ..models import Mission

        Mission.objects.create(id='m99', title='Nouvelle', description='d', category='c', difficulty='Facile',
                               duration_minutes=5, xp=10)
        assignment_id = self.assign(missionId='m99').data[0]['assignment']['id']
        self.client.force_login(self.data['students'][0].user)

        quiz = self.client.get(f'/api/student/assignments/{assignment_id}/quiz').data

        self.assertEqual(len(quiz['steps']), len(DEFAULT_QUIZ))
