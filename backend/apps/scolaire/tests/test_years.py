from datetime import date, timedelta

from django.test import override_settings
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from apps.learners.models import LearnerProfile

from ..models import AcademicYear, Classroom, StudentProfile, YearClosure
from .helpers import build_school, make_student


class YearTestCase(APITestCase):
    def setUp(self):
        self.data = build_school()
        self.school = self.data['school']
        self.client.force_login(self.data['admin'])
        # Année terminée hier : la clôture est possible sans simulation.
        AcademicYear.objects.filter(school=self.school).update(end_date=timezone.localdate() - timedelta(days=1),
                                                               start_date=date(int(self.data['label'][:4]), 10, 1))

    def decisions(self, **overrides):
        plan = self.client.get('/api/ecole/years/promotion-plan').data
        decisions = {s['id']: ('passe' if row['nextClassName'] else 'sortant') for row in plan for s in row['students']}
        decisions.update(overrides)
        return decisions

    def close(self, **extra):
        self.client.post('/api/ecole/years/archive')
        body = {'decisions': self.decisions(), 'confirmation': self.data['label']}
        body.update(extra)
        return self.client.post('/api/ecole/years/close', body, format='json')


class CalendarTests(YearTestCase):
    def test_dates_must_match_the_year(self):
        start, end = self.data['label'][:4], self.data['label'][5:]
        bad = self.client.patch('/api/ecole/years/current', {'startDate': f'{end}-10-01', 'endDate': f'{end}-07-31'}, format='json')
        self.assertEqual(bad.status_code, status.HTTP_400_BAD_REQUEST)
        good = self.client.patch('/api/ecole/years/current', {'startDate': f'{start}-10-02', 'endDate': f'{end}-07-30'}, format='json')
        self.assertEqual(good.data['startDate'], f'{start}-10-02')


class ClosureGuardTests(YearTestCase):
    def test_blocked_before_end_date_and_demo_only_in_debug(self):
        AcademicYear.objects.filter(school=self.school).update(end_date=timezone.localdate() + timedelta(days=30))
        self.assertFalse(self.client.get('/api/ecole/years/closure-check?demo=1').data['endReached'])
        self.assertEqual(self.close(demoIgnoreDate=True).status_code, status.HTTP_400_BAD_REQUEST)
        with override_settings(DEBUG=True):
            self.assertTrue(self.client.get('/api/ecole/years/closure-check?demo=1').data['endReached'])
            self.assertEqual(self.close(demoIgnoreDate=True).status_code, status.HTTP_200_OK)

    def test_archive_confirmation_and_decisions_are_required(self):
        body = {'decisions': self.decisions(), 'confirmation': self.data['label']}
        no_archive = self.client.post('/api/ecole/years/close', body, format='json')
        self.assertIn('bilan', no_archive.data['error'])
        self.assertEqual(self.client.post('/api/ecole/years/archive').status_code, status.HTTP_200_OK)
        wrong = self.client.post('/api/ecole/years/close', {**body, 'confirmation': 'oui'}, format='json')
        self.assertIn('tapez', wrong.data['error'])
        missing = self.client.post('/api/ecole/years/close', {**body, 'decisions': {}}, format='json')
        self.assertIn('décision', missing.data['error'])
        troisieme = self.data['students'][3]
        impossible = self.client.post('/api/ecole/years/close', {**body, 'decisions': self.decisions(**{str(troisieme.pk): 'passe'})}, format='json')
        self.assertEqual(impossible.status_code, status.HTTP_400_BAD_REQUEST)

    def test_archive_csv_lists_every_student(self):
        data = self.client.post('/api/ecole/years/archive').data
        self.assertTrue(data['csv'].startswith('﻿Matricule;Nom'))
        self.assertEqual(data['csv'].count('\r\n'), 5)


class ClosureTests(YearTestCase):
    def test_close_then_undo_restores_everything(self):
        awa, modou, adja, cheikh = self.data['students']
        decisions = self.decisions(**{str(modou.pk): 'redouble'})
        self.client.post('/api/ecole/years/archive')
        response = self.client.post('/api/ecole/years/close', {'decisions': decisions, 'confirmation': self.data['label']}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        self.assertEqual(response.data, {'classesArchived': 3, 'classesCreated': 5, 'promoted': 2, 'repeating': 1, 'leaving': 1})

        new_label = AcademicYear.objects.get(school=self.school, status='en_cours').label
        awa.refresh_from_db()
        self.assertEqual((awa.classroom.level, awa.classroom.academic_year, awa.classroom.teacher), ('CE2', new_label, None))
        self.assertEqual(LearnerProfile.objects.get(learner=awa.user).age_track, '7-9')
        modou.refresh_from_db()
        self.assertEqual(modou.classroom.level, 'CE1')
        cheikh.refresh_from_db()
        self.assertEqual((cheikh.classroom, cheikh.left_in_year, cheikh.user.is_active), (None, self.data['label'], False))
        self.assertEqual(awa.matricule, StudentProfile.objects.get(pk=awa.pk).matricule)
        self.assertTrue(Classroom.objects.get(pk=self.data['ce1a'].pk).archived)

        # Un élève ajouté après la clôture dans une nouvelle classe se retrouvera sans classe.
        late = make_student(self.school, awa.classroom, 'Tardif', 'Diallo')
        pending = self.client.get('/api/ecole/years').data['pendingClosure']
        self.assertEqual(pending['fromYear'], self.data['label'])

        undo = self.client.post('/api/ecole/years/undo')
        self.assertEqual(undo.status_code, status.HTTP_200_OK)
        awa.refresh_from_db()
        cheikh.refresh_from_db()
        late.refresh_from_db()
        self.assertEqual(awa.classroom_id, self.data['ce1a'].pk)
        self.assertEqual((cheikh.classroom_id, cheikh.left_in_year, cheikh.user.is_active), (self.data['troisieme'].pk, '', True))
        self.assertIsNone(late.classroom)
        self.assertFalse(Classroom.objects.get(pk=self.data['ce1a'].pk).archived)
        self.assertEqual(AcademicYear.objects.get(school=self.school, status='en_cours').label, self.data['label'])
        self.assertEqual(Classroom.objects.filter(school=self.school).count(), 3)
        self.assertEqual(self.client.post('/api/ecole/years/undo').status_code, status.HTTP_400_BAD_REQUEST)

    def test_second_closure_waits_for_undo_window_and_past_year_is_readable(self):
        self.assertEqual(self.close().status_code, status.HTTP_200_OK)
        past = self.client.get(f"/api/ecole/years/{self.data['label']}").data
        self.assertEqual(len(past['classes']), 3)
        AcademicYear.objects.filter(school=self.school, status='en_cours').update(end_date=timezone.localdate() - timedelta(days=1))
        self.assertIn('annulable', self.close().data['error'])
        YearClosure.objects.update(undo_until=timezone.now() - timedelta(seconds=1))
        self.assertEqual(self.client.post('/api/ecole/years/undo').status_code, status.HTTP_400_BAD_REQUEST)


class SectionlessClassTests(YearTestCase):
    """Une école qui n'a qu'une classe par niveau (« CI », « CP ») n'a pas de lettres : le passage d'année doit suivre."""

    def test_promotion_moves_a_class_without_letter_to_the_next_level_without_letter(self):
        ci = Classroom.objects.create(school=self.school, level='CI', section='', academic_year=self.data['label'])
        kid = make_student(self.school, ci, 'Fatou', 'Gaye')
        row = next(r for r in self.client.get('/api/ecole/years/promotion-plan').data if r['classroom']['level'] == 'CI')
        self.assertEqual(row['nextClassName'], 'CP')  # pas « CP » suivi d'une espace ni d'une lettre inventée

        self.assertEqual(self.close().status_code, status.HTTP_200_OK)

        kid.refresh_from_db()
        self.assertEqual((kid.classroom.level, kid.classroom.section, kid.classroom.archived), ('CP', '', False))
