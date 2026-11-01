import base64
import shutil
import tempfile
from io import BytesIO

from django.core.files.uploadedfile import SimpleUploadedFile
from django.db import connection
from django.test import override_settings
from django.test.utils import CaptureQueriesContext
from PIL import Image
from rest_framework import status
from rest_framework.test import APITestCase

from apps.accounts.models import User
from apps.progress.models import Progress

from ..models import StudentProfile
from ..services.annee import safe_cell
from .helpers import PASSWORD, build_school

THEME = {'name': 'Nouveau nom', 'city': 'Thiès', 'primaryColor': '#0b3a5b', 'accentColor': '#7fd3f0'}


def image_bytes(fmt='PNG'):
    buffer = BytesIO()
    Image.new('RGB', (16, 16), (10, 120, 60)).save(buffer, fmt)
    return buffer.getvalue()


def data_uri(mime, raw):
    return f'data:{mime};base64,' + base64.b64encode(raw).decode()


class LogoValidationTests(APITestCase):
    def setUp(self):
        self.media = tempfile.mkdtemp()
        self.override = override_settings(MEDIA_ROOT=self.media)
        self.override.enable()
        self.data = build_school()
        self.school = self.data['school']
        self.client.force_login(self.data['admin'])

    def tearDown(self):
        self.override.disable()
        shutil.rmtree(self.media, ignore_errors=True)

    def patch_logo(self, logo):
        return self.client.patch('/api/ecole/school', {**THEME, 'logo': logo}, format='json')

    def test_valid_png_is_stored_with_a_server_chosen_extension(self):
        response = self.patch_logo(data_uri('image/png', image_bytes('PNG')))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.school.refresh_from_db()
        self.assertTrue(self.school.logo.name.endswith('-logo.png'))

    def test_real_format_wins_over_the_declared_one(self):
        response = self.patch_logo(data_uri('image/png', image_bytes('JPEG')))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.school.refresh_from_db()
        self.assertTrue(self.school.logo.name.endswith('-logo.jpg'))

    def test_svg_is_refused_because_it_can_carry_script(self):
        svg = b'<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'

        response = self.patch_logo(data_uri('image/svg+xml', svg))

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.school.refresh_from_db()
        self.assertFalse(self.school.logo)

    def test_html_disguised_as_an_image_is_refused(self):
        response = self.patch_logo(data_uri('image/png', b'<html><script>alert(1)</script></html>'))

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_oversized_logo_is_refused(self):
        response = self.patch_logo(data_uri('image/png', b'\x89PNG' + b'0' * (2 * 1024 * 1024 + 10)))

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('trop lourd', response.data['error'])

    def test_malformed_base64_is_a_400_not_a_500(self):
        for bad in ('data:image/png;base64,@@@not-base64@@@', 'data:image/png;no-marker'):
            self.assertEqual(self.patch_logo(bad).status_code, status.HTTP_400_BAD_REQUEST, bad)

    def test_multipart_upload_ignores_the_client_file_name(self):
        upload = SimpleUploadedFile('evil.html', image_bytes('PNG'), content_type='text/html')

        response = self.client.patch('/api/ecole/school', {**THEME, 'logo': upload}, format='multipart')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.school.refresh_from_db()
        self.assertTrue(self.school.logo.name.endswith('-logo.png'))
        self.assertNotIn('evil', self.school.logo.name)

    def test_multipart_non_image_is_refused(self):
        upload = SimpleUploadedFile('logo.png', b'MZ\x90\x00 not an image', content_type='image/png')

        response = self.client.patch('/api/ecole/school', {**THEME, 'logo': upload}, format='multipart')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class CsvFormulaInjectionTests(APITestCase):
    def test_safe_cell_neutralises_formula_prefixes_only(self):
        for danger in ('=1+1', '+33', '-2', '@SUM(A1)', '\tx', '\rx'):
            self.assertTrue(safe_cell(danger).startswith("'"), danger)
        for fine in ('Awa', '', 12, 3.5, None, "d'Ivoire"):
            self.assertEqual(safe_cell(fine), fine)

    def test_year_archive_export_neutralises_a_malicious_student_name(self):
        data = build_school()
        StudentProfile.objects.filter(pk=data['students'][0].pk).update(last_name="=HYPERLINK(\"http://x.test\")")
        self.client.force_login(data['admin'])

        response = self.client.post('/api/ecole/years/archive')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        csv_text = response.data['csv']
        self.assertIn("'=HYPERLINK", csv_text)
        self.assertNotIn(';=HYPERLINK', csv_text)
        self.assertNotIn(';"=HYPERLINK', csv_text)


class DependencyTests(APITestCase):
    def test_pypdf_is_installed_and_declared_in_requirements(self):
        import pathlib

        import pypdf  # noqa: F401  (le lecteur de PDF de l'import en dépend)

        requirements = (pathlib.Path(__file__).resolve().parents[3] / 'requirements.txt').read_text(encoding='utf-8')
        self.assertIn('pypdf==', requirements)


class WeeklyLeaderboardRobustnessTests(APITestCase):
    URL = '/api/progress/leaderboard/weekly'

    def _entry(self, index, name):
        user = User.objects.create_user(f'e{index}@x.test', PASSWORD, role=User.ROLE_STUDENT, display_name=name)
        Progress.objects.create(user=user, owner_email=user.email, lesson_id=f'p1-{index}', age_track='10-12', xp=10 + index)
        return user

    def test_blank_display_name_does_not_crash_the_ranking(self):
        me = self._entry(0, 'Awa Diop')
        self._entry(1, '')
        self._entry(2, '   ')
        self.client.force_authenticate(user=me)

        response = self.client.get(self.URL)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['leaderboard']), 3)

    def test_number_of_queries_does_not_grow_with_the_number_of_players(self):
        me = self._entry(0, 'Awa Diop')
        self.client.force_authenticate(user=me)
        self._entry(1, 'Moussa Fall')
        with CaptureQueriesContext(connection) as few:
            self.client.get(self.URL)
        for i in range(2, 30):
            self._entry(i, f'Enfant{i} Test')
        with CaptureQueriesContext(connection) as many:
            self.client.get(self.URL)

        self.assertEqual(len(few), len(many))
