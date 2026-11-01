"""Le programme vu par l'enseignant : fiches de leçon, guide, accès limité à l'âge de ses classes, stats par question."""
from rest_framework import status

from apps.curriculum.models import LessonContent, TeacherGuide

from .test_programme_missions import ProgrammeTestCase


class ProgrammeAccessTests(ProgrammeTestCase):
    def test_programme_lists_only_the_age_tracks_of_the_teachers_classes(self):
        data = self.client.get('/api/enseignant/programme').data
        self.assertEqual([t['key'] for t in data['tracks']], ['7-9'])
        self.assertEqual(data['tracks'][0]['classes'], ['CE1 A'])
        self.assertEqual([m['id'] for m in data['tracks'][0]['modules']], ['p1', 'p2'])
        self.assertEqual([item['id'] for item in data['tracks'][0]['modules'][0]['lessons']], ['p1-1', 'p1-2'])

    def test_a_lesson_of_another_age_is_not_found(self):
        self.assertEqual(self.client.get('/api/enseignant/programme/lessons/a1-1').status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(self.client.get('/api/enseignant/programme/lessons/zzz').status_code, status.HTTP_404_NOT_FOUND)

    def test_students_cannot_read_the_teacher_programme(self):
        self.client.force_login(self.data['students'][0].user)
        self.assertEqual(self.client.get('/api/enseignant/programme').status_code, status.HTTP_403_FORBIDDEN)


class LessonSheetTests(ProgrammeTestCase):
    def sheet(self, lesson_id='p1-1'):
        return self.client.get(f'/api/enseignant/programme/lessons/{lesson_id}').data

    def test_sheet_has_the_lesson_the_correction_and_the_navigation(self):
        sheet = self.sheet('p1-1')
        self.assertEqual(sheet['module']['id'], 'p1')
        self.assertIsNone(sheet['previous'])
        self.assertEqual(sheet['next']['id'], 'p1-2')
        self.assertEqual(sheet['sheet']['questions'][0]['correct'], 0)
        self.assertEqual(sheet['homework'], {'lessonMissionId': 'l-p1-1', 'reviewMissionId': 'b-p1'})

    def test_an_automatic_guide_is_served_until_one_is_written(self):
        content = LessonContent.objects.get(lesson__lesson_id='p1-1')
        content.remember, content.discover = ['A', 'B', 'C', 'D'], 'Découverte.'
        content.save()
        guide = self.sheet('p1-1')['guide']
        self.assertEqual(guide['source'], 'auto')
        self.assertEqual(guide['essential'], ['A', 'B', 'C'])
        self.assertEqual(len(guide['askThem']), 3)

    def test_a_written_guide_replaces_the_automatic_one(self):
        TeacherGuide.objects.create(lesson=LessonContent.objects.get(lesson__lesson_id='p1-1').lesson, essential=['Une IA apprend.'],
                                    explain='Comparez avec un enfant.', ask_them=['Qui l’a fabriquée ?'],
                                    unplugged={'title': 'Le jeu du robot', 'minutes': 10, 'materials': ['Craie'], 'steps': ['Formez deux groupes.']})
        guide = self.sheet('p1-1')['guide']
        self.assertEqual(guide['source'], 'redige')
        self.assertEqual(guide['unplugged']['steps'], ['Formez deux groupes.'])

    def test_vocabulary_pairs_become_named_terms(self):
        content = LessonContent.objects.get(lesson__lesson_id='p1-1')
        content.vocabulary = [['Donnée', 'Information utilisée par un outil.']]
        content.save()
        self.assertEqual(self.sheet('p1-1')['sheet']['vocabulary'], [{'term': 'Donnée', 'definition': 'Information utilisée par un outil.'}])


class QuestionStatsTests(ProgrammeTestCase):
    def test_assignment_detail_tells_which_question_the_class_missed(self):
        assignment_id = self.assign(missionId='l-p1-2').data[0]['assignment']['id']
        base = f'/api/student/assignments/{assignment_id}'
        for index, option in enumerate((0, 1)):  # le premier élève réussit, le second se trompe
            self.client.force_login(self.data['students'][index].user)
            self.client.post(f'{base}/answer', {'step': 0, 'option': option}, format='json')
        self.client.force_login(self.teacher)
        detail = self.client.get(f'/api/enseignant/assignments/{assignment_id}').data
        stats = detail['questionStats']
        self.assertEqual([s['question'] for s in stats], ['Dans un téléphone ?', 'Dans un nuage ?'])
        self.assertEqual((stats[0]['answered'], stats[0]['correct'], stats[0]['successRate']), (2, 1, 50))
        self.assertIsNone(stats[1]['successRate'])
        self.assertEqual(detail['lessonId'], 'p1-2')
