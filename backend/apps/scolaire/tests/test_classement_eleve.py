"""Classement de la classe pour l'élève connecté (T14) et parcours effectif de l'élève d'école.

Classement : sa classe uniquement (jamais une autre classe ni une autre école), prénom et initiale, XP des 7 derniers jours
à l'heure de Dakar, même rang pour les ex æquo, sa ligne marquée, 403 avec « qui » quand le classement est fermé.
Première version des tests d'isolation : OpenCode (travail non poussé), reprise et complétée par Claude.
"""
import json
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from django.db import connection
from django.test.utils import CaptureQueriesContext
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from apps.accounts.models import User
from apps.learners.models import LearnerProfile
from apps.progress.models import Progress

from .. import views
from ..models import RestrictionPolicy
from ..services import classement
from .helpers import PASSWORD, build_school, make_student

URL = '/api/eleve/classement'
DAKAR = ZoneInfo('Africa/Dakar')


def give_xp(profile, xp, lesson='p1-1', when=None, days_ago=0):
    Progress.objects.create(user=profile.user, owner_email=profile.user.email, lesson_id=lesson, age_track='7-9', xp=xp,
                            completed_at=when or timezone.now() - timedelta(days=days_ago))


class ClassementEleveTestCase(APITestCase):
    def setUp(self):
        self.data = build_school()
        self.school = self.data['school']
        self.student = self.data['students'][0]            # Awa Diop — CE1 A
        self.mate = self.data['students'][1]               # Modou Sy — CE1 A
        self.other_class = self.data['students'][2]        # Adja Ba — CE1 B

    def board(self, user=None):
        self.client.force_login(user or self.student.user)
        return self.client.get(URL)


class IsolationTests(ClassementEleveTestCase):
    def test_only_my_class_is_ranked_with_first_name_and_initial(self):
        give_xp(self.student, 30, 'p1-1')
        give_xp(self.mate, 50, 'p1-2')
        give_xp(self.other_class, 90, 'p1-3')                       # CE1 B : jamais visible depuis CE1 A
        other_school = build_school(slug='ecole-b')
        intruder = make_student(other_school['school'], other_school['ce1a'], 'Ibra', 'Mbaye')
        give_xp(intruder, 99, 'p1-1')                               # même niveau « CE1 A », autre école : jamais là

        response = self.board()
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.data
        self.assertEqual([e['displayName'] for e in data['entries']], ['Modou S.', 'Awa D.'])
        self.assertEqual([e['xp'] for e in data['entries']], [50, 30])
        self.assertEqual([e['rank'] for e in data['entries']], [1, 2])
        self.assertEqual([e['isMe'] for e in data['entries']], [False, True])
        self.assertEqual(data['me'], {'rank': 2, 'xp': 30, 'lessons': 1})
        self.assertEqual((data['classSize'], data['participants']), (2, 2))
        self.assertEqual((data['scopeLabel'], data['classroom']), ('Classement de la classe', 'CE1 A'))

    def test_no_personal_or_technical_data_of_other_students(self):
        give_xp(self.mate, 50)
        body = json.dumps(self.board().data, ensure_ascii=False)
        for secret in (self.mate.user.email, self.mate.matricule, 'Sy"', self.student.user.email, self.student.matricule):
            self.assertNotIn(secret, body)
        self.assertEqual(set(self.board().data['entries'][0]), {'rank', 'displayName', 'xp', 'lessons', 'isMe'})

    def test_closed_by_the_school_then_by_the_class_with_the_who(self):
        restrictions_url = '/api/eleve/restrictions'
        policy = RestrictionPolicy.objects.create(school=self.school, classroom=None, rules={'leaderboard': False},
                                                  updated_by=self.data['admin'])
        response = self.board()
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(response.data['error'], "Le classement : coupé par la direction de l'école.")
        self.assertEqual((response.data['reason'], response.data['by']), ('closed', 'school'))
        self.assertIn(response.data['error'], self.client.get(restrictions_url).data['messages'])   # même phrase

        policy.rules = {}
        policy.save()
        self.assertEqual(self.board().status_code, status.HTTP_200_OK)                           # rouvert par l'école

        # La classe d'à côté ferme son tableau : ma classe n'est pas concernée.
        RestrictionPolicy.objects.create(school=self.school, classroom=self.data['ce1b'], rules={'leaderboard': False},
                                         updated_by=self.data['other_teacher'])
        self.assertEqual(self.board().status_code, status.HTTP_200_OK)
        # Ma propre classe ferme le sien : 403, avec qui l'a fermé.
        RestrictionPolicy.objects.create(school=self.school, classroom=self.data['ce1a'], rules={'leaderboard': False},
                                         updated_by=self.data['teacher'])
        response = self.board()
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(response.data['error'], 'Le classement : coupé par ton enseignant.')
        self.assertEqual(response.data['by'], 'class')
        self.assertIn(response.data['error'], self.client.get(restrictions_url).data['messages'])

    def test_family_child_is_403_with_a_clear_message(self):
        child = User.objects.create_user('enfant.famille@example.com', PASSWORD, display_name='Enfant', role='enfant')
        response = self.board(child)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(response.data['error'], classement.NOT_IN_A_CLASS)
        self.assertEqual(response.data['reason'], 'no_class')

    def test_school_student_without_class_is_403(self):
        orphan = make_student(self.school, None, 'Fatou', 'Ndiaye')
        response = self.board(orphan.user)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(response.data['error'], classement.NOT_IN_A_CLASS)

    def test_staff_and_anonymous_are_refused(self):
        for adult in (self.data['teacher'], self.data['admin']):
            self.assertEqual(self.board(adult).status_code, status.HTTP_403_FORBIDDEN)
        self.client.logout()
        self.assertIn(self.client.get(URL).status_code, (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN))

    def test_disabled_or_departed_classmates_are_excluded(self):
        give_xp(self.student, 10, 'p1-1')
        give_xp(self.mate, 20, 'p1-2')
        self.assertEqual(len(self.board().data['entries']), 2)

        self.mate.left_in_year = '2025-2026'
        self.mate.save(update_fields=['left_in_year'])
        self.assertEqual([e['displayName'] for e in self.board().data['entries']], ['Awa D.'])

        self.mate.left_in_year = ''
        self.mate.save(update_fields=['left_in_year'])
        self.mate.user.is_active = False                        # « désactivé » par l'école (set_student_status)
        self.mate.user.save(update_fields=['is_active'])
        data = self.board().data
        self.assertEqual([e['displayName'] for e in data['entries']], ['Awa D.'])
        self.assertEqual(data['classSize'], 1)


class RankingTests(ClassementEleveTestCase):
    def test_ties_share_the_same_rank_and_are_listed_alphabetically(self):
        zoe = make_student(self.school, self.data['ce1a'], 'Zoé', 'Ndao')
        bintou = make_student(self.school, self.data['ce1a'], 'Bintou', 'Gaye')
        for profile, xp in ((self.student, 40), (self.mate, 40), (zoe, 70), (bintou, 10)):
            give_xp(profile, xp)
        entries = self.board().data['entries']
        self.assertEqual([(e['rank'], e['displayName']) for e in entries],
                         [(1, 'Zoé N.'), (2, 'Awa D.'), (2, 'Modou S.'), (4, 'Bintou G.')])

    def test_empty_class_and_student_absent_from_the_board(self):
        data = self.board().data                                 # personne n'a d'XP cette semaine
        self.assertEqual((data['entries'], data['me'], data['participants'], data['classSize']), ([], None, 0, 2))
        give_xp(self.mate, 15)
        data = self.board().data                                 # un camarade a des XP, pas moi
        self.assertEqual([e['displayName'] for e in data['entries']], ['Modou S.'])
        self.assertIsNone(data['me'])

    def test_names_with_accents(self):
        elodie = make_student(self.school, self.data['ce1a'], 'Élodie', 'Ébou')
        ndeye = make_student(self.school, self.data['ce1a'], '  Ndèye   Coumba ', 'ñiang')
        for profile in (elodie, ndeye, self.student):
            give_xp(profile, 25)
        names = [e['displayName'] for e in self.board().data['entries']]
        self.assertEqual(names, ['Awa D.', 'Élodie É.', 'Ndèye Coumba Ñ.'])   # « É » se range avec « E », pas après « Z »

    def test_daily_challenge_and_riddle_give_xp_but_are_not_lessons(self):
        give_xp(self.student, 10, 'p1-1')
        give_xp(self.student, 5, 'dc:2026-10-16')
        give_xp(self.student, 5, 'rd:2026-10-16')
        self.assertEqual(self.board().data['me'], {'rank': 1, 'xp': 20, 'lessons': 1})


class WeekTests(ClassementEleveTestCase):
    def test_the_week_is_the_last_7_days_in_dakar_time(self):
        now = datetime(2026, 10, 16, 10, 0, tzinfo=DAKAR)
        start, end = classement.week_window(now)
        self.assertEqual(start, datetime(2026, 10, 10, 0, 0, tzinfo=DAKAR))
        self.assertEqual(end, now)
        self.assertEqual(classement._range_label(start, end), 'du 10 au 16 octobre')
        self.assertEqual(classement._range_label(*classement.week_window(datetime(2026, 10, 2, 9, 0, tzinfo=DAKAR))),
                         'du 26 septembre au 2 octobre')

    def test_xp_at_the_edges_of_the_week(self):
        now = datetime(2026, 10, 16, 10, 0, tzinfo=DAKAR)
        give_xp(self.student, 30, 'p1-1', when=datetime(2026, 10, 10, 0, 5, tzinfo=DAKAR))     # 1er jour : compte
        give_xp(self.student, 50, 'p1-2', when=datetime(2026, 10, 9, 23, 55, tzinfo=DAKAR))    # la veille : non
        give_xp(self.mate, 20, 'p1-1', when=datetime(2026, 10, 16, 9, 59, tzinfo=DAKAR))
        data = classement.student_class_leaderboard(self.student.user, now=now)
        self.assertEqual([(e['displayName'], e['xp']) for e in data['entries']], [('Awa D.', 30), ('Modou S.', 20)])
        self.assertEqual(data['period']['range'], 'du 10 au 16 octobre')
        self.assertEqual(data['period']['timezone'], 'Africa/Dakar')

    def test_response_states_the_period(self):
        period = self.board().data['period']
        self.assertEqual(period['label'], '7 derniers jours')
        self.assertTrue(period['start'].endswith('T00:00:00+00:00'))   # minuit à Dakar (UTC+0, sans heure d'été)


class PerformanceTests(ClassementEleveTestCase):
    def test_the_class_is_read_in_a_single_aggregated_query(self):
        for i in range(10):
            give_xp(make_student(self.school, self.data['ce1a'], f'Eleve{i}', 'Test'), 10 + i)
        start, end = classement.week_window()
        with self.assertNumQueries(1):
            rows = classement._class_rows(self.student, start, end)
        self.assertEqual(len(rows), 12)

    def test_the_number_of_queries_does_not_grow_with_the_class(self):
        self.client.force_login(self.student.user)
        self.client.get(URL)                                     # 1re requête : la session est enregistrée (3 requêtes de plus)

        def count():
            with CaptureQueriesContext(connection) as queries:
                self.assertEqual(self.client.get(URL).status_code, 200)
            return len(queries)
        small = count()
        for i in range(15):
            give_xp(make_student(self.school, self.data['ce1a'], f'Eleve{i}', 'Test'), 5)
        self.assertEqual(count(), small)

    def test_same_throttling_as_the_other_student_routes(self):
        mine = [type(t) for t in views.StudentClassLeaderboardView().get_throttles()]
        self.assertEqual(mine, [type(t) for t in views.StudentTodayView().get_throttles()])
        self.assertTrue(mine)                                    # une limite existe bien (UserRateThrottle par défaut)


class EffectiveTrackTests(ClassementEleveTestCase):
    """« Mon parcours » suit le parcours effectif : exception de l'enseignant, sinon niveau de la classe (T14, point 2)."""

    def profile_age_group(self, user):
        self.client.force_login(user)
        return self.client.get('/api/profile').data['profile']['ageGroup']

    def test_school_student_follows_the_teacher_override_then_the_class_level(self):
        self.assertEqual(self.profile_age_group(self.student.user), '7-9')                    # CE1 → 7-9
        self.client.force_login(self.data['teacher'])
        self.client.put(f'/api/enseignant/students/{self.student.id}/parcours', {'track': '10-12'}, format='json')
        self.assertEqual(self.profile_age_group(self.student.user), '10-12')
        self.assertEqual(self.client.get('/api/eleve/aujourdhui').data['track'], '10-12')
        self.assertEqual(LearnerProfile.objects.get(learner=self.student.user).age_track, '10-12')   # sync_learner_track

        self.client.force_login(self.data['teacher'])
        self.client.put(f'/api/enseignant/students/{self.student.id}/parcours', {'track': ''}, format='json')
        self.assertEqual(self.profile_age_group(self.student.user), '7-9')
        self.assertEqual(LearnerProfile.objects.get(learner=self.student.user).age_track, '7-9')

    def test_a_3e_class_gives_13_15(self):
        cheikh = self.data['students'][3]                                                     # 3e → 13-15
        self.assertEqual(self.profile_age_group(cheikh.user), '13-15')

    def test_family_child_keeps_its_own_age_group(self):
        child = User.objects.create_user('enfant2@example.com', PASSWORD, display_name='Enfant', role='enfant')
        child.age_group = '10-12'
        child.save(update_fields=['age_group'])
        self.assertEqual(self.profile_age_group(child), '10-12')
