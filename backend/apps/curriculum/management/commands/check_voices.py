"""
Vérifie la présence des fichiers audio attendus pour chaque leçon d'un parcours.

    python manage.py check_voices --track 7-9
    python manage.py check_voices --track 7-9-ecole
    python manage.py check_voices --track 10-12 --from backend/apps/curriculum/tests/fixtures/parcours1012
"""

from django.core.management.base import BaseCommand, CommandError

from apps.curriculum.parcours79 import TRACK_CONFIGS, get_track_config, load_chapters

from apps.curriculum.voices import clips_of


class Command(BaseCommand):
    help = "Vérifie que tous les fichiers audio (mp3) attendus pour un parcours sont présents."

    def add_arguments(self, parser):
        parser.add_argument('--track', choices=list(TRACK_CONFIGS), default='7-9',
                            help="Tranche d'âge à contrôler ('7-9' par défaut).")
        parser.add_argument('--from', dest='source', metavar='CHEMIN',
                            help='Dossier optionnel des fichiers JSON du contenu.')
        parser.add_argument('--strict', action='store_true',
                            help='Lève une erreur si des fichiers audio manquent.')

    def handle(self, *args, **options):
        track = options.get('track', '7-9')
        source = options.get('source')
        cfg = get_track_config(track)

        chapters = load_chapters(content_dir=source, track=track)
        voices_dir = cfg['voices_dir']

        total_clips = 0
        missing_clips = []
        present_clips = 0

        for chapter_name, data in chapters:
            mod_id = data.get('module', {}).get('id', chapter_name)
            for lesson in data.get('lessons', []):
                lid = lesson.get('id')
                if not lid:
                    continue
                for key, _wave, _screen, _kind, _text in clips_of(lesson):
                    total_clips += 1
                    filename = f"{lid}_{key}.mp3"
                    # Structure: <voices_dir>/<chapter_or_module>/<lesson_id>/<filename>
                    # On teste avec chapter_name (ex: m01), mod_id (ex: p1), et directement lid
                    candidates = [
                        voices_dir / chapter_name / lid / filename,
                        voices_dir / mod_id / lid / filename,
                        voices_dir / lid / filename,
                    ]
                    if any(c.exists() for c in candidates):
                        present_clips += 1
                    else:
                        missing_clips.append((lid, filename, candidates[0]))

        self.stdout.write(f"Contrôle des voix pour le parcours {track} ({len(chapters)} chapitre(s)) :")
        self.stdout.write(f"  Total attendu : {total_clips} clip(s)")
        self.stdout.write(f"  Présents      : {present_clips}")
        self.stdout.write(f"  Manquants     : {len(missing_clips)}")

        if missing_clips:
            self.stdout.write(self.style.WARNING(f"Exemples de fichiers manquants dans {voices_dir} :"))
            for lid, fn, _path in missing_clips[:10]:
                self.stdout.write(f"    {lid} -> {fn}")
            if len(missing_clips) > 10:
                self.stdout.write(f"    ... et {len(missing_clips) - 10} autre(s).")
            if options.get('strict'):
                raise CommandError(f"{len(missing_clips)} fichier(s) audio manquant(s).")
        else:
            self.stdout.write(self.style.SUCCESS("Toutes les voix attendues sont présentes !"))
