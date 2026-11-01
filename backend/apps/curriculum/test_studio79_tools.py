"""Outils serveur du studio 7-9 : import du contenu d'origine et contrôle des versions en ligne (T17).

`manage.py import_content79` : le serveur de production n'a pas forcément le dossier `frontend/`, et le studio a besoin
du contenu d'origine (retour arrière, référence des voix). `manage.py check_parcours79 --db` : les leçons publiées
depuis le studio doivent rester jouables, avec un `voiceOff` exact.
"""
import io
import shutil
import tempfile
from datetime import timedelta
from pathlib import Path

from django.core.management import call_command
from django.core.management.base import CommandError
from django.test import TestCase
from django.utils import timezone

from apps.curriculum import parcours79
from apps.curriculum.models import ContentVersion
from apps.superadmin import studio79

LESSONS = [lesson['id'] for lesson in studio79._catalog(use_base=True)]


def run(*args):
    out = io.StringIO()
    call_command('import_content79', *args, stdout=out)
    return out.getvalue()


class ImportContent79Tests(TestCase):
    def live(self, key):
        return ContentVersion.objects.filter(kind=studio79.KIND, key=key, source=ContentVersion.SOURCE_IMPORT).first()

    def test_imports_every_lesson_as_live_version_one(self):
        output = run()

        self.assertEqual(ContentVersion.objects.filter(kind=studio79.KIND).count(), len(LESSONS))
        for key in LESSONS:
            version = self.live(key)
            self.assertIsNotNone(version, key)
            self.assertEqual(version.number, 1)
            self.assertLess(version.publish_at, timezone.now(), 'la version d\'origine doit être en ligne')
        self.assertIn(f'{len(LESSONS)} leçon(s) créées', output)

    def test_the_imported_content_is_the_official_recording_text(self):
        run()

        chapters = parcours79.load_chapters()
        original = next(lesson for _, chapter in chapters for lesson in chapter['lessons'] if lesson['id'] == 'p1-1')
        self.assertEqual(self.live('p1-1').content, original)
        self.assertEqual(studio79.spoken_clips(original), studio79.spoken_clips(self.live('p1-1').content))

    def test_the_import_is_idempotent_and_never_overwrites(self):
        run()
        edited = ContentVersion.objects.get(kind=studio79.KIND, key='p1-1')
        edited.content = {**edited.content, 'note': 'modifié après coup'}
        edited.save()

        output = run()

        self.assertEqual(ContentVersion.objects.filter(kind=studio79.KIND).count(), len(LESSONS))
        self.assertEqual(ContentVersion.objects.get(pk=edited.pk).content['note'], 'modifié après coup')
        self.assertIn('0 leçon(s) créées', output)
        self.assertIn(f'{len(LESSONS)} déjà versionnée(s)', output)

    def test_dry_run_writes_nothing(self):
        output = run('--dry-run')

        self.assertEqual(ContentVersion.objects.filter(kind=studio79.KIND).count(), 0)
        self.assertIn('seraient créées', output)

    def test_another_folder_can_be_imported(self):
        source = Path(tempfile.mkdtemp())
        try:
            shutil.copy(parcours79.CONTENT_DIR / 'm02.json', source / 'm02.json')

            output = run('--from', str(source))

            self.assertEqual(sorted(ContentVersion.objects.values_list('key', flat=True)),
                             sorted(key for key in LESSONS if key.startswith('p2-')))
            self.assertIn('36 leçon(s) sans contenu d\'origine', output)
        finally:
            shutil.rmtree(source)

    def test_an_empty_or_missing_folder_is_refused(self):
        missing = Path(tempfile.mkdtemp()) / 'vide'
        with self.assertRaises(CommandError):
            run('--from', str(missing))

        empty = Path(tempfile.mkdtemp())
        try:
            with self.assertRaises(CommandError):
                run('--from', str(empty))
        finally:
            shutil.rmtree(empty)


class CheckParcours79DbTests(TestCase):
    """Le contrôle `--db` doit voir ce qu'un enfant verrait : une version en ligne cassée passe par la base."""

    def check(self):
        out = io.StringIO()
        call_command('check_parcours79', '--db', stdout=out)
        return out.getvalue()

    def check_failing(self):
        """Contrôle attendu en échec : renvoie (texte affiché, message d'erreur)."""
        out = io.StringIO()
        with self.assertRaises(CommandError) as caught:
            call_command('check_parcours79', '--db', stdout=out)
        return out.getvalue() + str(caught.exception), str(caught.exception)

    def seed(self):
        call_command('import_content79', stdout=io.StringIO())

    def publish(self, content, number=2):
        ContentVersion.objects.create(kind=studio79.KIND, key=content['id'], number=number, content=content,
                                      source=ContentVersion.SOURCE_STUDIO, publish_at=timezone.now() - timedelta(seconds=1))

    def test_a_clean_database_passes(self):
        self.seed()

        self.assertIn('Contenu conforme.', self.check())

    def test_a_broken_live_version_is_an_error(self):
        self.seed()
        content = dict(self.live_content('p1-1'))
        play = next(s for s in content['screens'] if s['kind'] in ('play', 'why'))
        play['rounds'][0]['type'] = 'inventé'
        self.publish(content)

        output, message = self.check_failing()

        self.assertIn('[x] p1-1', output)
        self.assertIn('inventé', output)
        self.assertIn('1 erreur(s) sur les versions en ligne', message)

    def test_an_incoherent_voice_off_is_an_error(self):
        self.seed()
        content = dict(self.live_content('p1-1'))
        content['screens'][0]['text'] = 'Palou chuchote un tout nouveau texte.'
        self.publish(content)          # publié sans passer par le studio : `voiceOff` n'a pas été écrit

        output, message = self.check_failing()

        self.assertIn('voiceOff incohérent', output)
        self.assertIn('1 erreur(s) sur les versions en ligne', message)

    def test_the_voice_off_written_by_the_studio_is_accepted(self):
        self.seed()
        content = dict(self.live_content('p1-1'))
        content['screens'][0]['text'] = 'Palou chuchote un tout nouveau texte.'
        self.publish(studio79._with_voice_off('p1-1', content))

        self.assertIn('Contenu conforme.', self.check())

    def test_a_draft_or_a_scheduled_version_is_not_checked(self):
        self.seed()
        content = dict(self.live_content('p1-1'))
        content['screens'][0]['text'] = 'Encore un texte que personne ne voit.'
        ContentVersion.objects.create(kind=studio79.KIND, key='p1-1', number=2, content=content,
                                      source=ContentVersion.SOURCE_STUDIO)                       # brouillon
        ContentVersion.objects.create(kind=studio79.KIND, key='p1-1', number=3, content=content,
                                      source=ContentVersion.SOURCE_STUDIO,
                                      publish_at=timezone.now() + timedelta(minutes=15))         # publication différée

        self.assertIn('Contenu conforme.', self.check())

    def live_content(self, key):
        version = ContentVersion.objects.filter(kind=studio79.KIND, key=key).order_by('number').first()
        return version.content if version else None
