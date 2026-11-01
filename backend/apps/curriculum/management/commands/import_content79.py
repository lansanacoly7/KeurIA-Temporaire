"""Enregistre le contenu d'origine des leçons comme version 1 du studio (source « import », en ligne).

Paramétrable par tranche d'âge (--track 7-9 par défaut, ou toute clé de TRACK_CONFIGS).
Idempotent : une leçon déjà versionnée n'est jamais écrasée. `--dry-run` montre ce qui serait fait sans rien écrire.
"""
from datetime import timedelta
import json
from pathlib import Path

from django.core.management.base import BaseCommand, CommandError
from django.db import IntegrityError, transaction
from django.utils import timezone

from apps.curriculum import parcours79
from apps.curriculum.models import AgeTrack, Character, ContentVersion
from apps.superadmin.studio79 import _base_content, _catalog, _ensure_seeded


class Command(BaseCommand):
    help = "Importe le contenu d'origine des leçons comme version 1 (en ligne) pour le studio selon la tranche d'âge."

    def add_arguments(self, parser):
        parser.add_argument('--track', choices=list(parcours79.TRACK_CONFIGS), default='7-9',
                            help="Tranche d'âge à importer ('7-9' par défaut).")
        parser.add_argument('--dry-run', action='store_true',
                            help='Dit ce qui serait fait sans rien écrire.')
        parser.add_argument('--from', dest='source', metavar='CHEMIN',
                            help='Dossier optionnel des fichiers JSON du contenu.')

    def import_characters(self, track_key: str, content_dir: Path, dry_run: bool):
        """Importe les personnages déclarés dans characters.json vers la table Character."""
        chars_file = content_dir / 'characters.json'
        if not chars_file.exists():
            return 0
        try:
            data = json.loads(chars_file.read_text(encoding='utf-8'))
        except Exception as e:
            self.stdout.write(self.style.WARNING(f"Impossible de lire {chars_file} : {e}"))
            return 0

        characters_data = data.get('characters', [])
        if dry_run or not characters_data:
            return len(characters_data)

        track_obj = AgeTrack.objects.filter(key=track_key).first()
        if not track_obj:
            return 0

        count = 0
        with transaction.atomic():
            for c in characters_data:
                cid = c.get('id')
                if not cid:
                    continue
                Character.objects.update_or_create(
                    track=track_obj,
                    character_id=cid,
                    defaults={
                        'name': c.get('name', cid.capitalize()),
                        'role': c.get('role', ''),
                        'avatar': c.get('avatar', ''),
                        'voice_id': c.get('voice_id', ''),
                        'order': c.get('order', count + 1),
                        'module': c.get('module') or '',
                    }
                )
                count += 1
        return count

    def handle(self, *args, **options):
        track = options.get('track', '7-9')
        source = options.get('source')
        cfg = parcours79.get_track_config(track)
        target_dir = Path(source or cfg['content_dir'])

        if source and not target_dir.is_dir():
            raise CommandError(f'Dossier introuvable : {source}')

        file_glob = cfg.get('file_glob', f"{cfg['module_prefix']}*.json")
        matching_files = list(target_dir.glob(file_glob))
        if not matching_files:
            raise CommandError(f'Contenu d\'origine {track} introuvable dans {target_dir} (fichiers {file_glob}).')

        kind = cfg.get('kind', ContentVersion.KIND_LESSON79)
        created, existing, missing = [], [], []

        if cfg.get('studio'):
            for lesson in _catalog(use_base=True):
                key = lesson['id']
                if ContentVersion.objects.filter(kind=kind, key=key).exists():
                    existing.append(key)
                    continue
                if _base_content(key, source) is None:
                    missing.append(key)
                    continue
                if not options['dry_run']:
                    _ensure_seeded(key, source)
                created.append(key)
        else:
            chapters = parcours79.load_chapters(content_dir=source, track=track)
            for _cname, data in chapters:
                for lesson in data.get('lessons', []):
                    key = lesson.get('id')
                    if not key:
                        continue
                    if ContentVersion.objects.filter(kind=kind, key=key).exists():
                        existing.append(key)
                        continue
                    if not options['dry_run']:
                        try:
                            with transaction.atomic():
                                ContentVersion.objects.create(
                                    kind=kind,
                                    key=key,
                                    number=1,
                                    content=lesson,
                                    source=ContentVersion.SOURCE_IMPORT,
                                    note=f"Contenu d'origine {track}",
                                    publish_at=timezone.now() - timedelta(seconds=1),
                                )
                        except IntegrityError:
                            existing.append(key)
                            continue
                    created.append(key)

        chars_count = self.import_characters(track, target_dir, options['dry_run'])

        verb = 'seraient créées' if options['dry_run'] else 'créées'
        self.stdout.write(f'{len(created)} leçon(s) {verb} comme version 1 (contenu d\'origine), '
                          f'{len(existing)} déjà versionnée(s) laissée(s) intacte(s).')
        if chars_count:
            self.stdout.write(f'{chars_count} personnage(s) {track} synchronisé(s).')
        if missing:
            self.stdout.write(self.style.WARNING(
                f'⚠ {len(missing)} leçon(s) sans contenu d\'origine dans ce dossier : {", ".join(missing[:5])}'
                f'{"…" if len(missing) > 5 else ""}'))
        if not options['dry_run'] and created:
            self.stdout.write(self.style.SUCCESS(f'Contenu d\'origine {track} importé avec succès.'))
