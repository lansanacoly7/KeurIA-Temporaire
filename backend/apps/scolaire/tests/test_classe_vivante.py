"""Séances de classe, annonces et sondages, parcours d'un élève (docs/ECOLE_ELEVE_CONCEPTION.md, section 8)."""
from datetime import timedelta

from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from .. import restrictions
from ..models import Announcement, AnnouncementAnswer, ClassSession, RestrictionPolicy
from .helpers import build_school

POLL = {'kind': 'poll', 'text': 'Tu as compris ?', 'options': ['Oui', 'Un peu', 'Pas encore']}


class ClasseTestCase(APITestCase):
    def setUp(self):
        self.data = build_school()
        self.ce1a, self.ce1b = self.data['ce1a'], self.data['ce1b']
        self.url = f'/api/enseignant/classes/{self.ce1a.pk}'
        self.teacher, self.other_teacher = self.data['teacher'], self.data['other_teacher']
        self.student = self.data['students'][0]                 # CE1 A
        self.other_class_student = self.data['students'][2]     # CE1 B


class SessionTests(ClasseTestCase):
    def test_teacher_opens_and_ends_a_session(self):
        self.client.force_login(self.teacher)
        opened = self.client.post(f'{self.url}/seance', {'title': 'Les boucles', 'lessonId': 'p3-1', 'minutes': 40}, format='json')
        self.assertEqual(opened.status_code, status.HTTP_201_CREATED)
        self.assertGreater(opened.data['session']['remainingSeconds'], 39 * 60)
        self.assertTrue(restrictions.class_session_active(self.ce1a, timezone.now()))
        self.assertIsNotNone(self.client.get(f'{self.url}/seance').data['session'])
        self.assertIsNone(self.client.delete(f'{self.url}/seance').data['session'])
        self.assertFalse(restrictions.class_session_active(self.ce1a, timezone.now()))

    def test_opening_a_second_session_replaces_the_first(self):
        self.client.force_login(self.teacher)
        self.client.post(f'{self.url}/seance', {'title': 'A', 'minutes': 30}, format='json')
        self.client.post(f'{self.url}/seance', {'title': 'B', 'minutes': 30}, format='json')
        self.assertEqual(ClassSession.objects.filter(classroom=self.ce1a, ended_at__isnull=True).count(), 1)
        self.assertEqual(self.client.get(f'{self.url}/seance').data['session']['title'], 'B')

    def test_a_session_stops_by_itself(self):
        ClassSession.objects.create(school=self.data['school'], classroom=self.ce1a, title='Vieille',
                                    started_at=timezone.now() - timedelta(hours=2), ends_at=timezone.now() - timedelta(hours=1))
        self.assertFalse(restrictions.class_session_active(self.ce1a, timezone.now()))

    def test_invalid_sessions_are_refused(self):
        self.client.force_login(self.teacher)
        for body in ({'title': '', 'minutes': 30}, {'title': 'x', 'minutes': 2}, {'title': 'x', 'minutes': 500}, {'title': 'x', 'minutes': '30'}):
            self.assertEqual(self.client.post(f'{self.url}/seance', body, format='json').status_code, status.HTTP_400_BAD_REQUEST, body)

    def test_another_teacher_cannot_touch_the_class_session(self):
        self.client.force_login(self.other_teacher)
        self.assertEqual(self.client.post(f'{self.url}/seance', {'title': 'x', 'minutes': 30}, format='json').status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(self.client.get(f'{self.url}/seance').status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(self.client.delete(f'{self.url}/seance').status_code, status.HTTP_403_FORBIDDEN)

    def test_during_a_session_the_parent_rules_do_not_count(self):
        from apps.accounts.models import User
        from .helpers import PASSWORD
        parent = User.objects.create_user('parent@example.com', PASSWORD, display_name='Parent', role=User.ROLE_PARENT)
        self.student.user.parent = parent
        self.student.user.save(update_fields=['parent'])
        self.assertFalse(restrictions.effective(self.student.user)['palou']['allowed'])         # à la maison : Palou fermé par le parent
        self.client.force_login(self.teacher)
        self.client.post(f'{self.url}/seance', {'title': 'Séance', 'minutes': 30}, format='json')
        in_class = restrictions.effective(self.student.user)
        self.assertEqual(in_class['context'], 'class_session')
        self.assertTrue(in_class['palou']['allowed'])


class AnnouncementTests(ClasseTestCase):
    def post(self, body):
        return self.client.post(f'{self.url}/annonces', body, format='json')

    def test_teacher_publishes_a_word_and_a_poll(self):
        self.client.force_login(self.teacher)
        word = self.post({'kind': 'text', 'title': 'Bonjour', 'text': 'Bonne séance à tous !'})
        poll = self.post(POLL)
        self.assertEqual((word.status_code, poll.status_code), (status.HTTP_201_CREATED, status.HTTP_201_CREATED))
        self.assertEqual(len(self.client.get(f'{self.url}/annonces').data['announcements']), 2)

    def test_invalid_announcements_are_refused(self):
        self.client.force_login(self.teacher)
        for body in ({'kind': 'chat', 'text': 'x'}, {'kind': 'text', 'text': ''}, {'kind': 'text', 'text': 'x' * 301},
                     {'kind': 'poll', 'text': 'Q', 'options': ['Seul']}, {'kind': 'poll', 'text': 'Q', 'options': list('abcdef')},
                     {'kind': 'poll', 'text': 'Q', 'options': ['Oui', 'oui']}, {'kind': 'poll', 'text': 'Q', 'options': ['Oui', '']},
                     {'kind': 'text', 'text': 'x', 'endsInDays': 0}):
            self.assertEqual(self.post(body).status_code, status.HTTP_400_BAD_REQUEST, body)

    def test_at_most_three_active_announcements(self):
        self.client.force_login(self.teacher)
        for _ in range(3):
            self.assertEqual(self.post({'kind': 'text', 'text': 'Mot'}).status_code, status.HTTP_201_CREATED)
        self.assertEqual(self.post({'kind': 'text', 'text': 'Quatrième'}).status_code, status.HTTP_400_BAD_REQUEST)
        first = Announcement.objects.filter(classroom=self.ce1a).first()
        self.client.delete(f'/api/enseignant/annonces/{first.pk}')                  # la fermer libère une place
        self.assertEqual(self.post({'kind': 'text', 'text': 'Quatrième'}).status_code, status.HTTP_201_CREATED)

    def test_student_answers_a_poll_and_sees_results_only_after(self):
        self.client.force_login(self.teacher)
        poll_id = self.post(POLL).data['announcement']['id']
        self.client.force_login(self.student.user)
        before = self.client.get('/api/eleve/aujourdhui').data['announcements'][0]
        self.assertIsNone(before['myChoice'])
        self.assertNotIn('counts', before)                                          # pas de résultats avant d'avoir répondu
        answer = self.client.post(f'/api/eleve/annonces/{poll_id}/reponse', {'choice': 1}, format='json')
        self.assertEqual(answer.status_code, status.HTTP_200_OK)
        self.assertEqual(answer.data['counts'], [0, 1, 0])
        self.client.post(f'/api/eleve/annonces/{poll_id}/reponse', {'choice': 2}, format='json')      # il change d'avis
        after = self.client.get('/api/eleve/aujourdhui').data['announcements'][0]
        self.assertEqual((after['myChoice'], after['counts']), (2, [0, 0, 1]))
        self.assertEqual(AnnouncementAnswer.objects.filter(announcement_id=poll_id).count(), 1)

    def test_invalid_or_closed_answers_are_refused(self):
        self.client.force_login(self.teacher)
        poll_id = self.post(POLL).data['announcement']['id']
        self.client.force_login(self.student.user)
        url = f'/api/eleve/annonces/{poll_id}/reponse'
        for bad in (7, -1, 'Oui', None, True):
            self.assertEqual(self.client.post(url, {'choice': bad}, format='json').status_code, status.HTTP_400_BAD_REQUEST, bad)
        self.client.force_login(self.teacher)
        self.client.delete(f'/api/enseignant/annonces/{poll_id}')
        self.client.force_login(self.student.user)
        self.assertEqual(self.client.post(url, {'choice': 0}, format='json').status_code, status.HTTP_400_BAD_REQUEST)

    def test_a_text_announcement_is_not_a_poll(self):
        self.client.force_login(self.teacher)
        word_id = self.post({'kind': 'text', 'text': 'Mot'}).data['announcement']['id']
        self.client.force_login(self.student.user)
        self.assertEqual(self.client.post(f'/api/eleve/annonces/{word_id}/reponse', {'choice': 0}, format='json').status_code,
                         status.HTTP_400_BAD_REQUEST)

    def test_isolation_between_classes(self):
        self.client.force_login(self.teacher)
        poll_id = self.post(POLL).data['announcement']['id']
        self.client.force_login(self.other_class_student.user)                      # élève de CE1 B
        self.assertEqual(self.client.get('/api/eleve/aujourdhui').data['announcements'], [])
        self.assertEqual(self.client.post(f'/api/eleve/annonces/{poll_id}/reponse', {'choice': 0}, format='json').status_code,
                         status.HTTP_404_NOT_FOUND)
        self.client.force_login(self.other_teacher)                                 # enseignant de CE1 B
        for call in (self.client.get(f'/api/enseignant/annonces/{poll_id}'), self.client.delete(f'/api/enseignant/annonces/{poll_id}'),
                     self.client.get(f'{self.url}/annonces'), self.client.post(f'{self.url}/annonces', {'kind': 'text', 'text': 'x'}, format='json')):
            self.assertEqual(call.status_code, status.HTTP_403_FORBIDDEN)

    def test_results_list_who_answered_and_who_did_not(self):
        self.client.force_login(self.teacher)
        poll_id = self.post(POLL).data['announcement']['id']
        AnnouncementAnswer.objects.create(announcement_id=poll_id, student=self.student, choice=0)
        results = self.client.get(f'/api/enseignant/annonces/{poll_id}').data
        self.assertEqual(results['counts'], [1, 0, 0])
        self.assertEqual([a['studentId'] for a in results['answered']], [self.student.id])
        self.assertEqual(len(results['answered']) + len(results['notAnswered']), 2)           # les 2 élèves actifs de CE1 A

    def test_expired_announcements_are_not_shown_to_students(self):
        Announcement.objects.create(school=self.data['school'], classroom=self.ce1a, kind='text', text='Ancien',
                                    created_at=timezone.now() - timedelta(days=9), ends_at=timezone.now() - timedelta(days=2))
        self.client.force_login(self.student.user)
        self.assertEqual(self.client.get('/api/eleve/aujourdhui').data['announcements'], [])


class TrackTests(ClasseTestCase):
    def track(self, student, body):
        return self.client.put(f'/api/enseignant/students/{student.pk}/parcours', body, format='json')

    def learner_track(self, student):
        return student.user.learner_profile.age_track if hasattr(student.user, 'learner_profile') else None

    def test_default_track_follows_the_class_level_then_the_teacher_can_override(self):
        self.client.force_login(self.student.user)
        self.assertEqual(self.client.get('/api/eleve/aujourdhui').data['track'], '7-9')          # CE1 → 7-9
        self.client.force_login(self.teacher)
        self.assertEqual(self.track(self.student, {'track': '10-12'}).data['trackOverride'], '10-12')
        self.client.force_login(self.student.user)
        self.assertEqual(self.client.get('/api/eleve/aujourdhui').data['track'], '10-12')
        self.client.force_login(self.teacher)
        self.assertIsNone(self.track(self.student, {'track': ''}).data['trackOverride'])         # exception retirée
        self.client.force_login(self.student.user)
        self.assertEqual(self.client.get('/api/eleve/aujourdhui').data['track'], '7-9')

    def test_the_learner_profile_follows_the_override(self):
        from apps.learners.models import LearnerProfile
        self.client.force_login(self.teacher)
        self.track(self.student, {'track': '13-15'})
        self.assertEqual(LearnerProfile.objects.get(learner=self.student.user).age_track, '13-15')

    def test_invalid_track_is_refused(self):
        self.client.force_login(self.teacher)
        self.assertEqual(self.track(self.student, {'track': '3-5'}).status_code, status.HTTP_400_BAD_REQUEST)

    def test_a_teacher_cannot_change_a_student_of_another_class(self):
        self.client.force_login(self.teacher)
        self.assertEqual(self.track(self.other_class_student, {'track': '10-12'}).status_code, status.HTTP_403_FORBIDDEN)
        self.other_class_student.refresh_from_db()
        self.assertEqual(self.other_class_student.track_override, '')

    def test_a_student_cannot_set_a_track(self):
        self.client.force_login(self.student.user)
        self.assertEqual(self.track(self.student, {'track': '13-15'}).status_code, status.HTTP_403_FORBIDDEN)

    def test_the_student_card_exposes_the_track_override(self):
        """T10 : la fiche �l�ve de l'enseignant affiche le parcours effectif (null = niveau de la classe)."""
        self.client.force_login(self.teacher)
        self.assertIsNone(self.client.get(f'/api/enseignant/students/{self.student.pk}').data['student']['trackOverride'])
        self.track(self.student, {'track': '10-12'})
        self.assertEqual(self.client.get(f'/api/enseignant/students/{self.student.pk}').data['student']['trackOverride'], '10-12')


class TodayTests(ClasseTestCase):
    def test_today_shows_the_session_and_the_effective_rules(self):
        RestrictionPolicy.objects.create(school=self.data['school'], classroom=self.ce1a, rules={'games': False})
        self.client.force_login(self.teacher)
        self.client.post(f'{self.url}/seance', {'title': 'Séance du jour', 'minutes': 30}, format='json')
        self.client.force_login(self.student.user)
        data = self.client.get('/api/eleve/aujourdhui').data
        self.assertEqual(data['session']['title'], 'Séance du jour')
        self.assertEqual(data['restrictions']['games'], {'allowed': False, 'by': 'class'})
        self.assertEqual(data['restrictions']['context'], 'class_session')

    def test_a_family_child_has_no_today_page(self):
        from apps.accounts.models import User
        from .helpers import PASSWORD
        parent = User.objects.create_user('p@example.com', PASSWORD, display_name='P', role=User.ROLE_PARENT)
        child = User.objects.create_user('e@example.com', PASSWORD, display_name='E', role=User.ROLE_STUDENT, parent=parent)
        self.client.force_login(child)
        self.assertEqual(self.client.get('/api/eleve/aujourdhui').status_code, status.HTTP_403_FORBIDDEN)

    def test_anonymous_gets_nothing(self):
        self.assertIn(self.client.get('/api/eleve/aujourdhui').status_code, (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN))
