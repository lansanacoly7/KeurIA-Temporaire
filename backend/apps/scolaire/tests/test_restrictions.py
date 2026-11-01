"""Règles en couches école / classe / maison (docs/ECOLE_ELEVE_CONCEPTION.md)."""
from datetime import datetime
from unittest import mock
from zoneinfo import ZoneInfo

from django.test import SimpleTestCase
from rest_framework import status
from rest_framework.test import APITestCase

from apps.accounts.models import User
from apps.progress.parental import palou_allowed

from .. import restrictions
from ..models import RestrictionPolicy
from .helpers import PASSWORD, build_school

DAKAR = ZoneInfo('Africa/Dakar')
MONDAY_10H = datetime(2026, 10, 12, 10, 0, tzinfo=DAKAR)        # un lundi
MONDAY_18H = datetime(2026, 10, 12, 18, 0, tzinfo=DAKAR)
SATURDAY_10H = datetime(2026, 10, 17, 10, 0, tzinfo=DAKAR)
WEEK_8_16 = [{'days': [0, 1, 2, 3, 4], 'start': '08:00', 'end': '16:00'}]


class SettingsValidationTests(SimpleTestCase):
    def test_valid_settings_are_normalised(self):
        cleaned = restrictions.clean_settings({'palou': False, 'daily_limit_minutes': 30, 'windows': WEEK_8_16, 'games': None})
        self.assertEqual(cleaned, {'palou': False, 'daily_limit_minutes': 30, 'windows': WEEK_8_16})

    def test_invalid_settings_are_refused(self):
        for bad in ({'palou': 'non'}, {'daily_limit_minutes': 2}, {'daily_limit_minutes': True}, {'inconnu': True}, 'texte',
                    {'windows': [{'days': [9], 'start': '08:00', 'end': '10:00'}]},
                    {'windows': [{'days': [1], 'start': '10:00', 'end': '08:00'}]},
                    {'windows': [{'days': [1], 'start': '8h', 'end': '10:00'}]}):
            with self.assertRaises(restrictions.RestrictionError, msg=bad):
                restrictions.clean_settings(bad)


class LooseningTests(SimpleTestCase):
    def test_a_class_cannot_allow_what_the_school_forbids(self):
        self.assertTrue(restrictions.loosening_errors({'palou': False}, {'palou': True}))
        self.assertFalse(restrictions.loosening_errors({'palou': False}, {'palou': False}))
        self.assertFalse(restrictions.loosening_errors({'palou': False}, {}))
        self.assertFalse(restrictions.loosening_errors({}, {'palou': True}))

    def test_a_class_cannot_exceed_the_school_time_limit(self):
        self.assertTrue(restrictions.loosening_errors({'daily_limit_minutes': 30}, {'daily_limit_minutes': 45}))
        self.assertFalse(restrictions.loosening_errors({'daily_limit_minutes': 30}, {'daily_limit_minutes': 20}))

    def test_class_hours_must_stay_inside_school_hours(self):
        inside = [{'days': [0, 1], 'start': '09:00', 'end': '12:00'}]
        outside = [{'days': [0, 5], 'start': '09:00', 'end': '12:00'}]
        too_late = [{'days': [0], 'start': '15:00', 'end': '17:00'}]
        self.assertFalse(restrictions.loosening_errors({'windows': WEEK_8_16}, {'windows': inside}))
        self.assertTrue(restrictions.loosening_errors({'windows': WEEK_8_16}, {'windows': outside}))
        self.assertTrue(restrictions.loosening_errors({'windows': WEEK_8_16}, {'windows': too_late}))


class EffectiveRulesTests(APITestCase):
    def setUp(self):
        self.data = build_school()
        self.school = self.data['school']
        self.student = self.data['students'][0].user          # élève de CE1 A

    def policy(self, rules, classroom=None):
        RestrictionPolicy.objects.update_or_create(school=self.school, classroom=classroom, defaults={'rules': rules})

    def test_without_rules_everything_is_allowed(self):
        result = restrictions.effective(self.student, at=MONDAY_10H)
        self.assertTrue(all(result[k]['allowed'] for k in restrictions.BOOL_KEYS))
        self.assertTrue(result['access']['allowedNow'])
        self.assertIsNone(result['dailyLimitMinutes']['value'])

    def test_the_strictest_level_wins_and_is_named(self):
        self.policy({'games': False})
        self.policy({'palou': False, 'daily_limit_minutes': 20}, self.data['ce1a'])
        result = restrictions.effective(self.student, at=MONDAY_10H)
        self.assertEqual(result['games'], {'allowed': False, 'by': 'school'})
        self.assertEqual(result['palou'], {'allowed': False, 'by': 'class'})
        self.assertEqual(result['dailyLimitMinutes'], {'value': 20, 'by': 'class'})

    def test_a_loosening_class_rule_stored_anyway_cannot_win(self):
        self.policy({'palou': False})
        self.policy({'palou': True}, self.data['ce1a'])                  # impossible par l'API, mais le calcul doit tenir
        self.assertFalse(restrictions.effective(self.student, at=MONDAY_10H)['palou']['allowed'])

    def test_time_windows_follow_the_server_clock(self):
        self.policy({'windows': WEEK_8_16})
        self.assertTrue(restrictions.effective(self.student, at=MONDAY_10H)['access']['allowedNow'])
        evening = restrictions.effective(self.student, at=MONDAY_18H)['access']
        self.assertEqual(evening, {'allowedNow': False, 'by': 'school'})
        self.assertFalse(restrictions.effective(self.student, at=SATURDAY_10H)['access']['allowedNow'])

    def test_rules_of_another_school_or_class_never_apply(self):
        other = build_school('autre-ecole')
        RestrictionPolicy.objects.create(school=other['school'], rules={'palou': False})
        RestrictionPolicy.objects.create(school=self.school, classroom=self.data['ce1b'], rules={'palou': False})
        self.assertTrue(restrictions.effective(self.student, at=MONDAY_10H)['palou']['allowed'])

    def test_parent_can_only_tighten_and_does_not_count_in_a_class_session(self):
        parent = User.objects.create_user('parent@example.com', PASSWORD, display_name='Parent', role=User.ROLE_PARENT)
        self.student.parent = parent
        self.student.save(update_fields=['parent'])
        self.policy({})                                                   # l'école autorise tout
        at_home = restrictions.effective(self.student, at=MONDAY_10H)
        self.assertEqual(at_home['palou'], {'allowed': False, 'by': 'parent'})     # parent lié sans décision : Palou fermé à la maison
        with mock.patch.object(restrictions, 'class_session_active', return_value=True):
            in_class = restrictions.effective(self.student, at=MONDAY_10H)
        self.assertEqual(in_class['context'], 'class_session')
        self.assertTrue(in_class['palou']['allowed'])                      # pendant la séance, seule la classe compte

    def test_palou_chat_follows_the_school_rules(self):
        self.assertTrue(palou_allowed(self.student))
        self.policy({'palou': False})
        self.assertFalse(palou_allowed(self.student))


class RulesApiTests(APITestCase):
    def setUp(self):
        self.data = build_school()
        self.url_school = '/api/ecole/restrictions'
        self.url_class = f"/api/enseignant/classes/{self.data['ce1a'].pk}/restrictions"

    def test_school_admin_sets_and_reads_school_rules(self):
        self.client.force_login(self.data['admin'])
        put = self.client.put(self.url_school, {'rules': {'palou': False, 'windows': WEEK_8_16}}, format='json')
        self.assertEqual(put.status_code, status.HTTP_200_OK)
        self.assertEqual(self.client.get(self.url_school).data['rules'], {'palou': False, 'windows': WEEK_8_16})
        self.assertEqual(self.client.put(self.url_school, {'rules': {'palou': 'x'}}, format='json').status_code, status.HTTP_400_BAD_REQUEST)

    def test_teacher_cannot_use_the_school_rules_endpoint(self):
        self.client.force_login(self.data['teacher'])
        self.assertEqual(self.client.get(self.url_school).status_code, status.HTTP_403_FORBIDDEN)

    def test_teacher_sets_class_rules_within_school_rules(self):
        RestrictionPolicy.objects.create(school=self.data['school'], rules={'palou': False})
        self.client.force_login(self.data['teacher'])
        refused = self.client.put(self.url_class, {'rules': {'palou': True}}, format='json')
        self.assertEqual(refused.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('école', refused.data['error'])
        accepted = self.client.put(self.url_class, {'rules': {'games': False, 'daily_limit_minutes': 25}}, format='json')
        self.assertEqual(accepted.status_code, status.HTTP_200_OK)
        self.assertEqual(accepted.data['schoolRules'], {'palou': False})

    def test_a_teacher_cannot_touch_another_teachers_class(self):
        self.client.force_login(self.data['other_teacher'])
        self.assertEqual(self.client.get(self.url_class).status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(self.client.put(self.url_class, {'rules': {'games': False}}, format='json').status_code, status.HTTP_403_FORBIDDEN)
        self.assertFalse(RestrictionPolicy.objects.filter(classroom=self.data['ce1a']).exists())

    def test_student_sees_who_restricted_what(self):
        RestrictionPolicy.objects.create(school=self.data['school'], classroom=self.data['ce1a'], rules={'games': False})
        self.client.force_login(self.data['students'][0].user)
        data = self.client.get('/api/eleve/restrictions').data
        self.assertEqual(data['games'], {'allowed': False, 'by': 'class'})
        self.assertTrue(any('ton enseignant' in m for m in data['messages']))

    def test_family_child_has_no_school_rules(self):
        parent = User.objects.create_user('p@example.com', PASSWORD, display_name='P', role=User.ROLE_PARENT)
        child = User.objects.create_user('enfant@example.com', PASSWORD, display_name='E', role=User.ROLE_STUDENT, parent=parent)
        self.client.force_login(child)
        self.assertEqual(self.client.get('/api/eleve/restrictions').status_code, status.HTTP_403_FORBIDDEN)
