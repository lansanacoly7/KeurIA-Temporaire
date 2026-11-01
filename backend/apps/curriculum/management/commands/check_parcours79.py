from pathlib import Path

from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone

from apps.curriculum import parcours79
from apps.curriculum.models import ContentVersion
from apps.curriculum.versions import live_version


class Command(BaseCommand):
    help = "Contrôle le contenu du parcours selon la tranche d'âge (règles narratives), liste les images et exporte le texte."

    def add_arguments(self, parser):
        parser.add_argument('--track', choices=list(parcours79.TRACK_CONFIGS), default='7-9',
                            help="Tranche d'âge à contrôler ('7-9' par défaut).")
        parser.add_argument('--from', dest='source', metavar='CHEMIN',
                            help='Dossier optionnel des fichiers JSON du contenu.')
        parser.add_argument('--export-md', metavar='CHEMIN', help='Écrit le texte du parcours (Markdown) dans ce fichier.')
        parser.add_argument('--db', action='store_true',
                            help='Contrôle aussi les versions EN LIGNE de la base (publiées depuis le studio) : mêmes règles '
                                 'que la publication (structure = erreur, style = avertissement) et voiceOff cohérent.')

    def check_database(self, track='7-9') -> list[str]:
        """Erreurs sur les versions en ligne : une leçon publiée depuis le studio doit rester jouable et sa voix juste."""
        from apps.superadmin import studio79

        cfg = parcours79.get_track_config(track)
        kind = cfg.get('kind', ContentVersion.KIND_LESSON79)
        now = timezone.now()
        errors = []
        keys = sorted(ContentVersion.objects.filter(kind=kind, publish_at__lte=now,
                                                    discarded_at__isnull=True).order_by('key')
                      .values_list('key', flat=True).distinct())
        for key in keys:
            live = live_version(kind, key, now)
            if live is None:
                continue
            if cfg.get('studio'):
                for issue in studio79.validate(key, live.content):
                    if issue['severity'] == 'error':
                        errors.append(f'{key} (version {live.number}, en ligne) : {issue["message"]}')
                muted = set(live.content.get('voiceOff') or [])
                expected = set(studio79._with_voice_off(key, live.content).get('voiceOff') or [])
                if muted != expected:
                    errors.append(f'{key} (version {live.number}, en ligne) : voiceOff incohérent '
                                  f'({len(muted)} passage(s) coupé(s) au lieu de {len(expected)}).')
        return errors

    def handle(self, *args, **options):
        track = options.get('track', '7-9')
        source = options.get('source')
        cfg = parcours79.get_track_config(track)

        chapters = parcours79.load_chapters(content_dir=source, track=track)
        report = parcours79.validate_all(content_dir=source, chapters=chapters, track=track)

        for line in report.warnings:
            self.stdout.write(self.style.WARNING('[!] ' + line))
        for line in report.errors:
            self.stdout.write(self.style.ERROR('[x] ' + line))
        if report.missing_images:
            self.stdout.write(f"\nImages à fournir ({len(report.missing_images)}) dans {cfg['lesson_images_dir']} :")
            for lesson_id, name, alt in report.missing_images:
                self.stdout.write(f'  {name}  ({lesson_id}) : {alt}')
        if report.no_pict:
            self.stdout.write(self.style.WARNING(f"⚠ {report.no_pict} choix sans pictogramme (l'enfant ne verrait que du texte)."))
        if report.missing_pictos:
            total = len(set(report.pictos))
            self.stdout.write(f'\nPictogrammes pas encore dessinés : {len(report.missing_pictos)} sur {total}.')
        self.stdout.write(f'\n{len(chapters)} chapitre(s) contrôlé(s) pour la tranche {track}.')

        if options['export_md']:
            path = Path(options['export_md'])
            path.write_text(parcours79.export_markdown(chapters, track=track), encoding='utf-8')
            self.stdout.write(f'Texte écrit dans {path}')

        db_errors = self.check_database(track=track) if options['db'] else []
        if options['db']:
            kind = cfg.get('kind', ContentVersion.KIND_LESSON79)
            live = ContentVersion.objects.filter(kind=kind, publish_at__lte=timezone.now(),
                                                 discarded_at__isnull=True).order_by('key') \
                .values_list('key', flat=True).distinct().count()
            self.stdout.write(f'\n{live} leçon(s) en ligne contrôlée(s) dans la base.')
        for line in db_errors:
            self.stdout.write(self.style.ERROR('[x] ' + line))

        if report.errors or db_errors:
            raise CommandError(f'{len(report.errors)} erreur(s) de contenu, {len(db_errors)} erreur(s) sur les versions en ligne.')
        if track == '7-9':
            self.stdout.write(self.style.SUCCESS('Contenu conforme.'))
        else:
            self.stdout.write(self.style.SUCCESS(f'Contenu du parcours {track} conforme.'))
