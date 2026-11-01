from datetime import date
from io import BytesIO

from django.core.files.uploadedfile import SimpleUploadedFile
from openpyxl import Workbook
from rest_framework import status
from rest_framework.test import APITestCase

from apps.accounts.models import User
from apps.learners.models import LearnerProfile

from ..models import Classroom, ParentLinkCode, SchoolActivity, StudentProfile
from .helpers import PASSWORD, build_school, make_staff


class EcoleTestCase(APITestCase):
    def setUp(self):
        self.data = build_school()
        self.school = self.data['school']
        self.client.force_login(self.data['admin'])

    def student_input(self, **overrides):
        payload = {'matricule': 'LB-2026-9001', 'firstName': 'Ndèye', 'lastName': 'Sarr', 'sexe': 'F',
                   'birthDate': date(date.today().year - 8, 3, 14).isoformat(), 'classId': str(self.data['ce1a'].pk)}
        payload.update(overrides)
        return payload


class AccessTests(EcoleTestCase):
    def test_anonymous_gets_401(self):
        self.client.logout()
        self.assertEqual(self.client.get('/api/ecole/dashboard').status_code, status.HTTP_401_UNAUTHORIZED)

    def test_other_roles_are_refused(self):
        for user in (self.data['teacher'], User.objects.create_user('parent@x.test', PASSWORD, role=User.ROLE_PARENT)):
            self.client.force_login(user)
            self.assertEqual(self.client.get('/api/ecole/dashboard').status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_of_another_school_cannot_reach_this_school(self):
        other = build_school('autre-ecole')
        self.client.force_login(other['admin'])
        student = self.data['students'][0]
        for url in (f'/api/ecole/students/{student.pk}', f"/api/ecole/classes/{self.data['ce1a'].pk}",
                    f"/api/ecole/teachers/{self.data['teacher'].pk}"):
            self.assertEqual(self.client.get(url).status_code, status.HTTP_404_NOT_FOUND, url)
        response = self.client.post(f'/api/ecole/students/{student.pk}/move', {'classId': str(other['ce1a'].pk)}, format='json')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        ids = {row['student']['id'] for row in self.client.get('/api/ecole/students').data}
        self.assertNotIn(str(student.pk), ids)


class SchoolAndDashboardTests(EcoleTestCase):
    def test_school_payload_and_theme_restriction(self):
        data = self.client.get('/api/ecole/school').data
        self.assertEqual(data['admin']['title'], 'Directrice')
        self.assertEqual(data['academicYear'], self.data['label'])
        bad = self.client.patch('/api/ecole/school', {'name': 'X', 'city': 'Thiès', 'primaryColor': '#ffffff', 'accentColor': '#ffffff'}, format='json')
        self.assertEqual(bad.status_code, status.HTTP_400_BAD_REQUEST)
        good = self.client.patch('/api/ecole/school', {'name': 'Nouveau nom', 'city': 'Thiès', 'primaryColor': '#0b3a5b', 'accentColor': '#7fd3f0'}, format='json')
        self.assertEqual(good.status_code, status.HTTP_200_OK)
        self.assertEqual(good.data['name'], 'Nouveau nom')

    def test_chosen_theme_reaches_the_student_space(self):
        """Le thème choisi par la direction doit se retrouver, entier, dans l'habillage que lit l'espace élève."""
        from rest_framework.test import APIClient
        bleu = {'name': 'École Test', 'city': 'Dakar', 'primaryColor': '#0b3a5b', 'accentColor': '#7fd3f0'}
        self.assertEqual(self.client.patch('/api/ecole/school', bleu, format='json').status_code, status.HTTP_200_OK)

        brand = APIClient().get(f'/api/schools/{self.school.slug}').data['school']  # appel public, sans compte
        self.assertEqual((brand['primaryColor'], brand['secondaryColor'], brand['accentColor']), ('#0b3a5b', '#7fd3f0', '#7fd3f0'))

        # Un second changement remplace bien les trois couleurs (la secondaire ne garde pas l'ancien thème).
        rouge = {**bleu, 'primaryColor': '#7a2e14', 'accentColor': '#f6c9a8'}
        self.client.patch('/api/ecole/school', rouge, format='json')
        brand = APIClient().get(f'/api/schools/{self.school.slug}').data['school']
        self.assertEqual((brand['primaryColor'], brand['secondaryColor'], brand['accentColor']), ('#7a2e14', '#f6c9a8', '#f6c9a8'))

    def test_a_school_student_profile_gives_the_school_slug_for_its_branding(self):
        from rest_framework.test import APIClient
        student = self.data['students'][0].user
        client = APIClient()
        client.force_login(student)
        profile = client.get('/api/profile').data['profile']
        self.assertEqual(profile['schoolSlug'], self.school.slug)
        self.assertEqual(profile['schoolName'], self.school.name)

    def test_dashboard_counts(self):
        data = self.client.get('/api/ecole/dashboard').data
        self.assertEqual(data['students'], 4)
        self.assertEqual(data['neverLoggedIn'], 1)
        self.assertEqual(data['teachers'], 2)
        self.assertEqual([c['level'] for c in data['classesWithoutTeacher']], ['3e'])


class ClassroomTests(EcoleTestCase):
    def test_create_and_refuse_duplicate(self):
        created = self.client.post('/api/ecole/classes', {'level': 'CM1', 'section': 'a', 'teacherId': None}, format='json')
        self.assertEqual(created.status_code, status.HTTP_201_CREATED)
        self.assertEqual(created.data['section'], 'A')
        dup = self.client.post('/api/ecole/classes', {'level': 'CM1', 'section': 'A', 'teacherId': None}, format='json')
        self.assertEqual(dup.status_code, status.HTTP_400_BAD_REQUEST)

    def test_letter_is_optional_for_a_single_class_of_a_level(self):
        """Beaucoup d'écoles sénégalaises n'ont qu'une classe par niveau : « CI », « CP », sans lettre."""
        created = self.client.post('/api/ecole/classes', {'level': 'CI', 'section': '', 'teacherId': None}, format='json')
        self.assertEqual(created.status_code, status.HTTP_201_CREATED, created.data)
        self.assertEqual(created.data['section'], '')
        self.assertEqual(Classroom.objects.get(pk=created.data['id']).level, 'CI')
        # Même chose quand la lettre est absente du message, ou faite d'espaces.
        for body in ({'level': 'CP', 'teacherId': None}, {'level': 'CM2', 'section': '  ', 'teacherId': None}):
            self.assertEqual(self.client.post('/api/ecole/classes', body, format='json').status_code, status.HTTP_201_CREATED, body)

    def test_two_classes_of_the_same_level_need_letters(self):
        self.assertEqual(self.client.post('/api/ecole/classes', {'level': 'CI', 'section': ''}, format='json').status_code, 201)
        # Une seconde classe sans lettre dans le même niveau : refusée, avec une explication.
        second = self.client.post('/api/ecole/classes', {'level': 'CI', 'section': ''}, format='json')
        self.assertEqual(second.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('lettre', second.data['error'])
        # Ajouter une classe lettrée à côté d'une classe sans lettre est refusé aussi : on lettre d'abord la première.
        lettered = self.client.post('/api/ecole/classes', {'level': 'CI', 'section': 'B'}, format='json')
        self.assertEqual(lettered.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("n'a pas de lettre", lettered.data['error'])
        # Niveau déjà lettré (CE1 A, CE1 B) : une classe sans lettre y est refusée.
        self.assertEqual(self.client.post('/api/ecole/classes', {'level': 'CE1', 'section': ''}, format='json').status_code, 400)

    def test_a_class_without_letter_can_get_one_then_a_sibling_is_allowed(self):
        solo = self.client.post('/api/ecole/classes', {'level': 'CI', 'section': ''}, format='json').data
        patched = self.client.patch(f"/api/ecole/classes/{solo['id']}", {'level': 'CI', 'section': 'A', 'teacherId': None}, format='json')
        self.assertEqual(patched.status_code, status.HTTP_200_OK, patched.data)
        self.assertEqual(patched.data['section'], 'A')
        self.assertEqual(self.client.post('/api/ecole/classes', {'level': 'CI', 'section': 'B'}, format='json').status_code, 201)

    def test_a_lettered_class_can_lose_its_letter_only_when_alone(self):
        alone = self.client.post('/api/ecole/classes', {'level': 'CI', 'section': 'A'}, format='json').data
        ok = self.client.patch(f"/api/ecole/classes/{alone['id']}", {'level': 'CI', 'section': '', 'teacherId': None}, format='json')
        self.assertEqual(ok.status_code, status.HTTP_200_OK, ok.data)
        ce1a = self.data['ce1a']  # CE1 compte aussi B : la lettre de A est indispensable
        refused = self.client.patch(f'/api/ecole/classes/{ce1a.pk}', {'level': 'CE1', 'section': '', 'teacherId': None}, format='json')
        self.assertEqual(refused.status_code, status.HTTP_400_BAD_REQUEST)

    def test_class_name_has_no_trailing_space_without_letter(self):
        from ..levels import class_name
        self.assertEqual(class_name('CI', ''), 'CI')
        self.assertEqual(class_name('CE1', 'A'), 'CE1 A')

    def test_archive_keeps_accounts_and_records_students(self):
        ce1a = self.data['ce1a']
        response = self.client.post(f'/api/ecole/classes/{ce1a.pk}/archive')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['archivedStudentIds']), 2)
        self.assertFalse(StudentProfile.objects.filter(classroom=ce1a).exists())
        detail = self.client.get(f'/api/ecole/classes/{ce1a.pk}').data
        self.assertEqual(len(detail['students']), 2)

    def test_changing_level_updates_learner_track(self):
        ce1a = self.data['ce1a']
        self.client.patch(f'/api/ecole/classes/{ce1a.pk}', {'level': 'CM1', 'section': 'A', 'teacherId': str(self.data['teacher'].pk)}, format='json')
        student = self.data['students'][0]
        self.assertEqual(LearnerProfile.objects.get(learner=student.user).age_track, '10-12')


class TeacherTests(EcoleTestCase):
    def payload(self, **overrides):
        data = {'firstName': 'Lamine', 'lastName': 'Cissé', 'email': 'Lamine@Example.com', 'phone': '77 560 14 82',
                'classIds': [str(self.data['troisieme'].pk)]}
        data.update(overrides)
        return data

    def test_create_teacher_returns_working_temporary_password(self):
        response = self.client.post('/api/ecole/teachers', self.payload(), format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        user = User.objects.get(email='lamine@example.com')
        self.assertEqual((user.role, user.school), (User.ROLE_TEACHER, self.school))
        self.assertTrue(user.check_password(response.data['credentials']['temporaryPassword']))
        self.assertEqual(Classroom.objects.get(pk=self.data['troisieme'].pk).teacher, user)

    def test_refuses_reserved_domain_and_existing_account(self):
        reserved = self.client.post('/api/ecole/teachers', self.payload(email='x@ecole.keuria.sn'), format='json')
        self.assertEqual(reserved.status_code, status.HTTP_400_BAD_REQUEST)
        User.objects.create_user('pris@example.com', PASSWORD)
        taken = self.client.post('/api/ecole/teachers', self.payload(email='pris@example.com'), format='json')
        self.assertIn('déjà', taken.data['error'])

    def test_deactivate_removes_classes_and_blocks_login(self):
        teacher = self.data['teacher']
        response = self.client.post(f'/api/ecole/teachers/{teacher.pk}/status', {'status': 'desactive'}, format='json')
        self.assertEqual(response.data['status'], 'desactive')
        self.assertIsNone(Classroom.objects.get(pk=self.data['ce1a'].pk).teacher)
        self.client.logout()
        login = self.client.post('/api/auth/login', {'email': teacher.email, 'password': PASSWORD})
        self.assertNotEqual(login.status_code, status.HTTP_200_OK)

    def test_bulk_is_all_or_nothing(self):
        rows = [self.payload(email='a@example.com', classIds=[]), self.payload(email='invalide', classIds=[])]
        response = self.client.post('/api/ecole/teachers/bulk', {'teachers': rows}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertTrue(response.data['error'].startswith('Ligne 2'))
        self.assertFalse(User.objects.filter(email='a@example.com').exists())


class StudentFormChecksTests(EcoleTestCase):
    """Vérifications du formulaire d'inscription : matricule libre, téléphone du parent, sexe choisi."""

    def test_matricule_check_tells_whether_it_is_free(self):
        taken = self.data['students'][0].matricule
        busy = self.client.get('/api/ecole/students/matricule-check', {'matricule': taken.lower()}).data
        self.assertEqual((busy['available'], busy['matricule']), (False, taken))
        self.assertIn('déjà attribué', busy['problem'])
        free = self.client.get('/api/ecole/students/matricule-check', {'matricule': 'NOUVEAU-001'}).data
        self.assertEqual((free['available'], free['problem']), (True, None))
        self.assertFalse(self.client.get('/api/ecole/students/matricule-check', {'matricule': '  '}).data['available'])

    def test_matricule_check_ignores_the_student_being_edited(self):
        student = self.data['students'][0]
        own = self.client.get('/api/ecole/students/matricule-check', {'matricule': student.matricule, 'ignore': student.pk}).data
        self.assertTrue(own['available'])

    def test_matricule_check_is_limited_to_the_school_admin(self):
        self.client.logout()
        self.assertIn(self.client.get('/api/ecole/students/matricule-check', {'matricule': 'X'}).status_code, (401, 403))

    def test_parent_phone_must_be_a_real_number_when_given(self):
        for bad in ('abc', 'appeler papa', '12', '77 123 45 6a'):
            response = self.client.post('/api/ecole/students', self.student_input(parentPhone=bad), format='json')
            self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST, bad)
            self.assertIn('téléphone', response.data['error'])
        for good in ('', '77 123 45 67', '+221 77 123 45 67'):
            response = self.client.post('/api/ecole/students', self.student_input(parentPhone=good, matricule=f'LB-PH-{len(good)}'), format='json')
            self.assertEqual(response.status_code, status.HTTP_201_CREATED, (good, response.data))

    def test_sex_must_be_chosen(self):
        for sexe in (None, '', 'X'):
            response = self.client.post('/api/ecole/students', self.student_input(sexe=sexe), format='json')
            self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST, sexe)
            self.assertIn('Fille ou Garçon', response.data['error'])


class BirthDateTests(EcoleTestCase):
    """Une date de naissance impossible (année « 0210 », future, âge hors de 4 à 20 ans) est refusée avec une explication."""

    def _enroll(self, birth):
        return self.client.post('/api/ecole/students', self.student_input(birthDate=birth), format='json')

    def test_impossible_dates_are_refused_with_the_date_in_the_message(self):
        year = date.today().year
        for birth in ('0210-02-21', '1816-02-21', f'{year + 1}-01-01', f'{year - 3}-01-01', f'{year - 25}-06-01'):
            response = self._enroll(birth)
            self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST, birth)
            self.assertIn('date de naissance', response.data['error'], birth)
        self.assertIn('21/02/0210', self._enroll('0210-02-21').data['error'])
        self.assertIn('futur', self._enroll(f'{year + 1}-01-01').data['error'])

    def test_plausible_dates_at_the_limits_are_accepted(self):
        year = date.today().year
        for index, birth in enumerate((f'{year - 6}-01-01', f'{year - 19}-01-01')):
            response = self.client.post('/api/ecole/students', self.student_input(birthDate=birth, matricule=f'LB-2026-95{index}'), format='json')
            self.assertEqual(response.status_code, status.HTTP_201_CREATED, (birth, response.data))

    def test_import_flags_an_impossible_date_as_an_error_not_a_warning(self):
        record = {'line': 2, 'values': {'matricule': 'D-1', 'firstName': 'Awa', 'lastName': 'Ndiaye', 'sexe': 'F',
                                        'birthDate': '21/02/0210', 'className': 'CE1 A'}}
        row = self.client.post('/api/ecole/import/preview', {'kind': 'eleves', 'records': [record]}, format='json').data[0]
        self.assertIn('birthDate', row['errors'])
        self.assertIsNone(row['input'])

    def test_frontend_and_server_use_the_same_age_bounds(self):
        import re
        from pathlib import Path
        from ..services.ecole import STUDENT_MAX_AGE, STUDENT_MIN_AGE
        source = (Path(__file__).resolve().parents[4] / 'frontend' / 'app' / '_scolaire' / 'lib' / 'format.ts')
        if not source.exists():
            self.skipTest('sources du frontend absentes')
        text = source.read_text(encoding='utf-8')
        self.assertEqual(int(re.search(r'STUDENT_MIN_AGE = (\d+);', text).group(1)), STUDENT_MIN_AGE)
        self.assertEqual(int(re.search(r'STUDENT_MAX_AGE = (\d+);', text).group(1)), STUDENT_MAX_AGE)


class StudentTests(EcoleTestCase):
    def test_create_student_account_profile_and_parent_code(self):
        response = self.client.post('/api/ecole/students', self.student_input(), format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        login = response.data['student']['login']
        self.assertEqual(login, 'ndeye.sarr@ecole-test.keuria.sn')
        user = User.objects.get(email=login)
        self.assertTrue(user.check_password(response.data['credentials']['temporaryPassword']))
        self.assertEqual(LearnerProfile.objects.get(learner=user).age_track, '7-9')
        self.assertRegex(response.data['credentials']['parentCode'], r'^[A-Z0-9]{3}-[A-Z0-9]{3}$')
        self.assertEqual(response.data['student']['status'], 'jamais_connecte')

    def test_homonyms_get_numbered_logins(self):
        self.client.post('/api/ecole/students', self.student_input(), format='json')
        second = self.client.post('/api/ecole/students', self.student_input(matricule='LB-2026-9002'), format='json')
        self.assertEqual(second.data['student']['login'], 'ndeye.sarr2@ecole-test.keuria.sn')

    def test_validation_errors(self):
        cases = [self.student_input(birthDate='2025-01-01'), self.student_input(matricule=self.data['students'][0].matricule),
                 self.student_input(sexe='X'), self.student_input(classId='999999')]
        for payload in cases:
            response = self.client.post('/api/ecole/students', payload, format='json')
            self.assertIn(response.status_code, (400, 404), payload)

    def test_bulk_creation_is_atomic(self):
        rows = [self.student_input(matricule='B-1'), self.student_input(matricule='B-1')]
        response = self.client.post('/api/ecole/students/bulk', {'students': rows}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(StudentProfile.objects.filter(matricule='B-1').exists())

    def test_update_cannot_change_class(self):
        student = self.data['students'][0]
        payload = self.student_input(matricule=student.matricule, classId=str(self.data['ce1b'].pk))
        response = self.client.patch(f'/api/ecole/students/{student.pk}', payload, format='json')
        self.assertIn('Changer de classe', response.data['error'])

    def test_move_preview_and_move(self):
        student = self.data['students'][0]
        target = self.data['troisieme']
        preview = self.client.get(f'/api/ecole/students/{student.pk}/move-preview?classId={target.pk}').data
        self.assertTrue(preview['levelChanged'])
        self.assertEqual(preview['trackChange'], {'from': '7-9', 'to': '13-15'})
        moved = self.client.post(f'/api/ecole/students/{student.pk}/move', {'classId': str(target.pk), 'reason': "Erreur d'inscription"}, format='json')
        self.assertEqual(moved.data['previousClassId'], str(self.data['ce1a'].pk))
        self.assertEqual(LearnerProfile.objects.get(learner=student.user).age_track, '13-15')
        self.assertTrue(SchoolActivity.objects.filter(label__contains="motif : Erreur d'inscription").exists())
        same = self.client.post(f'/api/ecole/students/{student.pk}/move', {'classId': str(target.pk)}, format='json')
        self.assertEqual(same.status_code, status.HTTP_400_BAD_REQUEST)

    def test_cannot_move_to_archived_class(self):
        self.client.post(f"/api/ecole/classes/{self.data['ce1b'].pk}/archive")
        student = self.data['students'][0]
        response = self.client.post(f'/api/ecole/students/{student.pk}/move', {'classId': str(self.data['ce1b'].pk)}, format='json')
        self.assertIn('archivée', response.data['error'])

    def test_filters_and_accent_insensitive_search(self):
        rows = self.client.get('/api/ecole/students', {'status': 'jamais_connecte'}).data
        self.assertEqual([r['student']['firstName'] for r in rows], ['Modou'])
        self.client.post('/api/ecole/students', self.student_input(), format='json')
        found = self.client.get('/api/ecole/students', {'query': 'ndeye'}).data
        self.assertEqual(len(found), 1)

    def test_credentials_generate_new_passwords_and_codes(self):
        student = self.data['students'][0]
        response = self.client.post('/api/ecole/credentials', {'studentIds': [str(student.pk)]}, format='json')
        creds = response.data[0]['credentials']
        student.user.refresh_from_db()
        self.assertTrue(student.user.check_password(creds['temporaryPassword']))
        self.assertEqual(ParentLinkCode.objects.filter(student=student, revoked_at__isnull=True).count(), 1)

    def test_deactivated_student_cannot_login(self):
        student = self.data['students'][0]
        self.client.post(f'/api/ecole/students/{student.pk}/status', {'status': 'desactive'}, format='json')
        self.client.logout()
        login = self.client.post('/api/auth/login', {'email': student.user.email, 'password': PASSWORD})
        self.assertNotEqual(login.status_code, status.HTTP_200_OK)


class ImportTests(EcoleTestCase):
    def test_preview_students_reports_errors_per_column(self):
        records = [
            {'line': 2, 'values': {'matricule': 'I-1', 'firstName': 'Awa', 'lastName': 'Ndiaye', 'sexe': 'fille',
                                   'birthDate': '14/03/2018', 'className': 'ce1-a'}},
            {'line': 3, 'values': {'matricule': 'I-1', 'firstName': '', 'lastName': 'Fall', 'sexe': 'Z',
                                   'birthDate': '31/02/2018', 'className': 'CE9 Z'}},
        ]
        rows = self.client.post('/api/ecole/import/preview', {'kind': 'eleves', 'records': records}, format='json').data
        self.assertIn('plusieurs fois', rows[0]['errors']['matricule'])
        self.assertEqual(set(rows[1]['errors']), {'matricule', 'firstName', 'sexe', 'birthDate', 'className'})
        self.assertIsNone(rows[1]['input'])

    def test_import_finds_a_class_without_letter_by_its_level(self):
        Classroom.objects.create(school=self.school, level='CI', section='', academic_year=self.data['label'])
        record = {'line': 2, 'values': {'matricule': 'CI-1', 'firstName': 'Awa', 'lastName': 'Ndiaye', 'sexe': 'F',
                                        'birthDate': '14/03/2018', 'className': ' ci '}}
        rows = self.client.post('/api/ecole/import/preview', {'kind': 'eleves', 'records': [record]}, format='json').data
        self.assertNotIn('className', rows[0]['errors'])
        self.assertIsNotNone(rows[0]['input'])

    def test_read_excel(self):
        workbook = Workbook()
        sheet = workbook.active
        sheet.append(['Matricule', 'Prénom', 'Nom', 'Sexe', 'Date de naissance', 'Classe'])
        sheet.append(['X-1', 'Awa', 'Diop', 'F', date(2018, 3, 14), 'CE1 A'])
        buffer = BytesIO()
        workbook.save(buffer)
        upload = SimpleUploadedFile('liste.xlsx', buffer.getvalue())
        response = self.client.post('/api/ecole/import/read', {'file': upload}, format='multipart')
        self.assertEqual(response.data['table'][1], ['X-1', 'Awa', 'Diop', 'F', '14/03/2018', 'CE1 A'])

    def test_old_excel_and_garbage_are_refused(self):
        for name, content in (('liste.xls', b'abc'), ('liste.xlsx', b'pas un classeur')):
            response = self.client.post('/api/ecole/import/read', {'file': SimpleUploadedFile(name, content)}, format='multipart')
            self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST, name)


class ParentsListTests(EcoleTestCase):
    def test_only_parents_of_this_school(self):
        parent = User.objects.create_user('maman@example.com', PASSWORD, role=User.ROLE_PARENT, display_name='Fatou Diop')
        student = self.data['students'][0]
        student.user.parent = parent
        student.user.save()
        other = build_school('autre')
        other['students'][0].user.parent = User.objects.create_user('autre@example.com', PASSWORD, role=User.ROLE_PARENT)
        other['students'][0].user.save()
        rows = self.client.get('/api/ecole/parents').data
        self.assertEqual([r['parent']['email'] for r in rows], ['maman@example.com'])
        self.assertEqual(rows[0]['children'][0]['id'], str(student.pk))


class NextMatriculeTests(EcoleTestCase):
    def test_suggests_next_free_number(self):
        prefix = f"ET-{self.data['label'][:4]}-"
        self.client.post('/api/ecole/students', self.student_input(matricule=f'{prefix}0007'), format='json')
        self.assertEqual(self.client.get('/api/ecole/students/next-matricule').data['matricule'], f'{prefix}0008')


class StaffHelperTests(EcoleTestCase):
    def test_school_admin_payload_uses_staff_profile(self):
        make_staff(self.school, 'second@ecole.test', User.ROLE_SCHOOL_ADMIN, 'Zeta', 'Last', 'Référent')
        self.assertEqual(self.client.get('/api/ecole/school').data['admin']['firstName'], 'Aminata')
