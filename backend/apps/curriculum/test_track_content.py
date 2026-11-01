import io
from pathlib import Path
from unittest import mock
from django.core.management import call_command
from django.test import TestCase

from apps.curriculum import parcours79
from apps.curriculum.models import AgeTrack, ContentVersion

FIXTURES_1012 = Path(__file__).resolve().parent / "tests" / "fixtures" / "parcours1012"


class TrackContentTestCase(TestCase):
    def setUp(self):
        AgeTrack.objects.get_or_create(
            key="7-9",
            defaults={"label": "7–9 ans", "name": "Petits Explorateurs", "order": 1}
        )
        AgeTrack.objects.get_or_create(
            key="10-12",
            defaults={"label": "10–12 ans", "name": "Jeunes Aventuriers", "order": 2}
        )
        AgeTrack.objects.get_or_create(
            key="7-9-ecole",
            defaults={"label": "7–9 ans École", "name": "Explorateurs en Classe", "order": 3}
        )

    def test_parcours79_validation_is_clean(self):
        report = parcours79.validate_all(track='7-9')
        self.assertEqual(len(report.errors), 0, f"Erreurs inattendues sur 7-9: {report.errors}")

    def test_parcours1012_fixture_validation_is_clean(self):
        report = parcours79.validate_all(track='10-12', content_dir=FIXTURES_1012)
        self.assertEqual(len(report.errors), 0, f"Erreurs inattendues sur 10-12: {report.errors}")

    def test_check_parcours_command_default_79(self):
        out = io.StringIO()
        call_command('check_parcours79', stdout=out)
        output = out.getvalue()
        self.assertIn("Contenu conforme.", output)

    def test_check_parcours_command_track_1012(self):
        out = io.StringIO()
        call_command('check_parcours79', track='10-12', source=str(FIXTURES_1012), stdout=out)
        output = out.getvalue()
        self.assertIn("Contenu du parcours 10-12 conforme", output)

    def test_import_content_track_1012_and_idempotence(self):
        out = io.StringIO()
        # 1. Dry run
        call_command('import_content79', track='10-12', source=str(FIXTURES_1012), dry_run=True, stdout=out)
        self.assertIn("seraient créées", out.getvalue())
        self.assertEqual(ContentVersion.objects.filter(kind='lesson1012').count(), 0)

        # 2. Real import
        out_real = io.StringIO()
        call_command('import_content79', track='10-12', source=str(FIXTURES_1012), stdout=out_real)
        self.assertIn("importé avec succès", out_real.getvalue())
        self.assertEqual(ContentVersion.objects.filter(kind='lesson1012').count(), 4)

        # 3. Idempotent re-run
        out_again = io.StringIO()
        call_command('import_content79', track='10-12', source=str(FIXTURES_1012), stdout=out_again)
        self.assertIn("0 leçon(s) créées", out_again.getvalue())
        self.assertIn("4 déjà versionnée(s) laissée(s) intacte(s)", out_again.getvalue())

    def test_adding_new_track_only_requires_config_entry(self):
        """Ajouter un parcours fictif ne demande qu'une entrée dans TRACK_CONFIGS."""
        fake_cfg = dict(parcours79.TRACK_CONFIGS['7-9'])
        fake_cfg.update({
            'module_prefix': 'x',
            'file_glob': 'x*.json',
            'file_prefix': 'x',
            'lesson_id_re': r'^x[0-9]+-[0-9]+$',
            'content_dir': FIXTURES_1012,
            'kind': 'lesson_fake',
        })
        with mock.patch.dict(parcours79.TRACK_CONFIGS, {'fake-track': fake_cfg}):
            cfg = parcours79.get_track_config('fake-track')
            self.assertEqual(cfg['module_prefix'], 'x')
            self.assertEqual(cfg['kind'], 'lesson_fake')
