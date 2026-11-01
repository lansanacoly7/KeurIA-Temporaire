"""Bibliothèque de devoirs adaptée au programme : un devoir par leçon, un bilan par module, rangés par âge."""
from rest_framework import status

from apps.curriculum.models import AgeTrack, Lesson, LessonContent, Module

from ..mission_quizzes import quiz_for
from ..models import Mission
from ..services.programme import sync_programme_missions
from .test_enseignant_api import TeacherTestCase


def question(text, right, wrong=('Peut-être', 'Jamais'), explain='Parce que.'):
    return {'question': text, 'options': [right, *wrong], 'correct': 0, 'explain': explain}


def make_module(track_key, world_id, title, order, lessons):
    """lessons : liste de (titre, [questions]) ; une liste vide donne une leçon sans contenu de quiz."""
    track, _ = AgeTrack.objects.get_or_create(key=track_key, defaults={'label': track_key, 'name': f'Parcours {track_key}', 'order': 1})
    module = Module.objects.create(track=track, world_id=world_id, title=title, description='d', order=order)
    for number, (lesson_title, questions) in enumerate(lessons, start=1):
        lesson = Lesson.objects.create(module=module, lesson_id=f'{world_id}-{number}', title=lesson_title, order=number)
        LessonContent.objects.create(lesson=lesson, questions=questions, skill=f'Je sais : {lesson_title}')
    return module


class ProgrammeTestCase(TeacherTestCase):
    def setUp(self):
        super().setUp()
        # 7-9 ans : le module p1 (deux leçons) puis p2 ; 10-12 ans : le module a1.
        make_module('7-9', 'p1', 'Bonjour, l’IA !', 1, [
            ('C’est quoi une IA ?', [question('Qui fabrique l’IA ?', 'Des humains'), question('Une IA se trompe-t-elle ?', 'Oui'),
                                       question('Que lui faut-il ?', 'Des données')]),
            ('Où vit l’IA ?', [question('Dans un téléphone ?', 'Oui'), question('Dans un nuage ?', 'Non')]),
        ])
        make_module('7-9', 'p2', 'L’IA autour de moi', 2, [('Trouver l’IA', [question('Le GPS est-il une IA ?', 'Oui')])])
        make_module('10-12', 'a1', 'Bienvenue dans l’IA', 1, [('Programmes et robots', [question('Un robot est-il toujours une IA ?', 'Non')])])
        self.result = sync_programme_missions()

    def library(self):
        return self.client.get('/api/enseignant/missions').data


class SyncTests(ProgrammeTestCase):
    def test_one_homework_per_lesson_and_one_review_per_module(self):
        self.assertEqual(sorted(Mission.objects.exclude(kind='libre').values_list('id', flat=True)),
                         ['b-a1', 'b-p1', 'b-p2', 'l-a1-1', 'l-p1-1', 'l-p1-2', 'l-p2-1'])
        lesson = Mission.objects.get(pk='l-p1-1')
        self.assertEqual((lesson.track, lesson.kind, lesson.category, lesson.question_count), ('7-9', 'lecon', 'Bonjour, l’IA !', 3))
        self.assertIn('Compétence visée : Je sais : C’est quoi une IA ?', lesson.description)
        self.assertEqual(Mission.objects.get(pk='l-a1-1').track, '10-12')

    def test_review_covers_every_lesson_of_the_module(self):
        review = Mission.objects.get(pk='b-p1')
        # 2 questions au plus par leçon : 2 (première leçon) + 2 (seconde leçon) = 4
        self.assertEqual(review.question_count, 4)
        self.assertEqual(len(quiz_for(review)), 4)

    def test_sync_is_idempotent_and_keeps_a_manual_withdrawal(self):
        Mission.objects.filter(pk='l-p1-2').update(active=False)
        again = sync_programme_missions()
        self.assertEqual((again['created'], again['updated'], again['retired']), (0, 0, 0))
        self.assertFalse(Mission.objects.get(pk='l-p1-2').active)

    def test_lessons_without_valid_questions_give_no_homework(self):
        make_module('7-9', 'p3', 'Sans quiz', 3, [('Rien à demander', []), ('Question cassée', [{'question': 'Q ?', 'options': ['seule'], 'correct': 0}])])
        sync_programme_missions()
        self.assertFalse(Mission.objects.filter(module__world_id='p3').exists())

    def test_a_removed_lesson_leaves_the_library_but_not_the_given_homework(self):
        self.assertEqual(self.assign(missionId='l-p1-2').status_code, status.HTTP_201_CREATED)
        Lesson.objects.get(lesson_id='p1-2').delete()
        sync_programme_missions()
        self.assertNotIn('l-p1-2', [m['id'] for m in self.library()])

    def test_difficulty_follows_the_place_of_the_module_in_the_track(self):
        self.assertEqual(Mission.objects.get(pk='l-p1-1').difficulty, 'Débutant')
        self.assertEqual(Mission.objects.get(pk='l-p2-1').difficulty, 'Intermédiaire')

    def test_original_generic_missions_leave_the_library_once_the_programme_exists(self):
        self.assertEqual(self.result['legacyRetired'], 6)
        ids = [m['id'] for m in self.library()]
        self.assertFalse({'m1', 'm2', 'm3', 'm4', 'm5', 'm6'} & set(ids))
        Mission.objects.filter(pk='m2').update(active=True)  # l'équipe kEur IA peut en remettre une
        sync_programme_missions()
        self.assertIn('m2', [m['id'] for m in self.library()])


class LibraryTests(ProgrammeTestCase):
    def test_library_is_ordered_by_age_then_module_then_review_first(self):
        programme = [m for m in self.library() if m['moduleId']]
        self.assertEqual([m['id'] for m in programme], ['b-a1', 'l-a1-1', 'b-p1', 'l-p1-1', 'l-p1-2', 'b-p2', 'l-p2-1'])

    def test_each_card_says_where_it_sits_in_the_programme(self):
        card = next(m for m in self.library() if m['id'] == 'l-p1-2')
        self.assertEqual((card['track'], card['moduleId'], card['moduleTitle'], card['lessonTitle'], card['questionCount']),
                         ('7-9', 'p1', 'Bonjour, l’IA !', 'Où vit l’IA ?', 2))
        self.assertEqual(next(m for m in self.library() if m['id'] == 'b-p1')['kind'], 'bilan')

    def test_library_stays_usable_when_there_is_no_programme_yet(self):
        Module.objects.all().delete()
        Mission.objects.exclude(kind='libre').delete()
        Mission.objects.filter(pk__in=['m1', 'm2']).update(active=True)
        self.assertIn('m1', [m['id'] for m in self.library()])


class AgeAdaptationTests(ProgrammeTestCase):
    def test_a_class_only_receives_homework_of_its_age(self):
        # ce1a est une classe de CE1 : parcours 7-9 ans.
        ok = self.assign(missionId='l-p1-1')
        self.assertEqual(ok.status_code, status.HTTP_201_CREATED, ok.data)
        refused = self.assign(missionId='l-a1-1')
        self.assertEqual(refused.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('10–12 ans', refused.data['error'])
        self.assertIn('CE1 A', refused.data['error'])

    def test_a_homework_for_all_ages_fits_every_class(self):
        Mission.objects.create(id='m50', title='Libre', description='d', category='Sécurité', difficulty='Débutant',
                               duration_minutes=5, xp=10)  # mission libre : ni parcours, ni module
        self.assertEqual(self.assign(missionId='m50').status_code, status.HTTP_201_CREATED)


class QuizFromLessonsTests(ProgrammeTestCase):
    def test_the_student_answers_the_questions_of_the_lesson(self):
        assignment_id = self.assign(missionId='l-p1-1').data[0]['assignment']['id']
        self.client.force_login(self.data['students'][0].user)
        base = f'/api/student/assignments/{assignment_id}'
        quiz = self.client.get(f'{base}/quiz').data
        self.assertEqual([s['question'] for s in quiz['steps']], ['Qui fabrique l’IA ?', 'Une IA se trompe-t-elle ?', 'Que lui faut-il ?'])
        self.assertNotIn('correct', str(quiz))
        for step in range(3):
            answer = self.client.post(f'{base}/answer', {'step': step, 'option': 0}, format='json')
            self.assertTrue(answer.data['correct'])
            self.assertTrue(answer.data['explanation'].startswith('Bravo'))
        self.assertEqual(self.client.post(f'{base}/complete', {}, format='json').data['score'], 100)

    def test_a_wrong_answer_explains_the_lesson(self):
        assignment_id = self.assign(missionId='l-p1-1').data[0]['assignment']['id']
        self.client.force_login(self.data['students'][0].user)
        answer = self.client.post(f'/api/student/assignments/{assignment_id}/answer', {'step': 0, 'option': 1}, format='json').data
        self.assertFalse(answer['correct'])
        self.assertEqual(answer['correctOption'], 0)
        self.assertIn('Parce que.', answer['explanation'])

    def test_a_correction_made_in_the_lesson_reaches_the_homework_at_once(self):
        content = LessonContent.objects.get(lesson__lesson_id='p1-1')
        content.questions[0]['question'] = 'Question corrigée ?'
        content.save()
        self.assertEqual(quiz_for('l-p1-1')[0]['question'], 'Question corrigée ?')


class AdminAndAnalyticsTests(ProgrammeTestCase):
    def test_super_admin_cannot_edit_a_programme_homework_but_can_withdraw_it(self):
        from rest_framework.test import APIClient
        from apps.accounts.models import User
        User.objects.create_user('root@keuria.test', 'MotDePasse-1234', role=User.ROLE_ADMIN)
        admin = APIClient()
        admin.force_login(User.objects.get(email='root@keuria.test'))
        body = {'title': 'x', 'description': 'd', 'category': 'Sécurité', 'difficulty': 'Débutant', 'durationMinutes': 5, 'xp': 10}
        self.assertEqual(admin.patch('/api/superadmin/missions/l-p1-1', body, format='json').status_code, status.HTTP_400_BAD_REQUEST)
        withdrawn = admin.post('/api/superadmin/missions/l-p1-1/status', {'active': False}, format='json')
        self.assertEqual(withdrawn.status_code, status.HTTP_200_OK, withdrawn.data)
        self.assertNotIn('l-p1-1', [m['id'] for m in self.library()])

    def test_analytics_group_results_by_notion_once_the_class_has_programme_homework(self):
        self.assign(missionId='l-p1-1')
        analytics = self.client.get(f"/api/enseignant/classes/{self.data['ce1a'].pk}/analytics").data
        self.assertEqual([c['category'] for c in analytics['categories']], ['Bonjour, l’IA !'])

    def test_analytics_keep_the_original_themes_without_programme_homework(self):
        analytics = self.client.get(f"/api/enseignant/classes/{self.data['ce1a'].pk}/analytics").data
        self.assertEqual([c['category'] for c in analytics['categories']], ['Sécurité', 'IA Générative', 'Données', 'Programmation'])
