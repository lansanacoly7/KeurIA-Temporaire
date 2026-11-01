import os
import json
from django.core.management.base import BaseCommand
from django.db import transaction
from apps.curriculum.models import AgeTrack, Module, Lesson, LessonContent


class Command(BaseCommand):
    help = "Initialise et synchronise l'ensemble des parcours, modules et leçons en base de données."

    def add_arguments(self, parser):
        parser.add_argument(
            '--clean',
            action='store_true',
            help='Supprime les données existantes avant de réinsérer.',
        )

    def handle(self, *args, **options):
        self.stdout.write(self.style.NOTICE("[INIT] Debut de l'initialisation du curriculum en base de donnees..."))

        json_path = os.path.join(
            os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
            'data',
            'curriculum_dump.json'
        )

        if not os.path.exists(json_path):
            self.stderr.write(self.style.ERROR(f"Fichier introuvable : {json_path}"))
            return

        with open(json_path, encoding='utf-8') as f:
            tracks_data = json.load(f)

        with transaction.atomic():
            if options.get('clean'):
                self.stdout.write(self.style.WARNING("Nettoyage des données existantes (--clean)..."))
                LessonContent.objects.all().delete()
                Lesson.objects.all().delete()
                Module.objects.all().delete()
                AgeTrack.objects.all().delete()

            tracks_count = 0
            modules_count = 0
            lessons_count = 0
            contents_count = 0

            for t_data in tracks_data:
                track, created = AgeTrack.objects.update_or_create(
                    key=t_data['key'],
                    defaults={
                        'label': t_data['label'],
                        'name': t_data['name'],
                        'tagline': t_data.get('tagline', ''),
                        'accent': t_data.get('accent', '#f4b942'),
                        'order': t_data.get('order', 1),
                    }
                )
                tracks_count += 1

                for m_data in t_data.get('worlds', []):
                    module, _ = Module.objects.update_or_create(
                        world_id=m_data['world_id'],
                        defaults={
                            'track': track,
                            'title': m_data['title'],
                            'icon': m_data.get('icon', '🤖'),
                            'description': m_data.get('description', ''),
                            'color': m_data.get('color', 'sun'),
                            'order': m_data.get('order', 1),
                        }
                    )
                    modules_count += 1

                    for l_data in m_data.get('lessons', []):
                        lesson, _ = Lesson.objects.update_or_create(
                            lesson_id=l_data['lesson_id'],
                            defaults={
                                'module': module,
                                'title': l_data['title'],
                                'lesson_type': l_data.get('lesson_type', 'histoire'),
                                'minutes': l_data.get('minutes', 5),
                                'xp': l_data.get('xp', 20),
                                'stars': l_data.get('stars', 3),
                                'order': l_data.get('order', 1),
                            }
                        )
                        lessons_count += 1

                        content_dict = l_data.get('content')
                        if content_dict:
                            LessonContent.objects.update_or_create(
                                lesson=lesson,
                                defaults={
                                    'mission': content_dict.get('mission', ''),
                                    'objectives': content_dict.get('objectives', []),
                                    'discover': content_dict.get('discover', ''),
                                    'example': content_dict.get('example', ''),
                                    'activity': content_dict.get('activity', {}),
                                    'remember': content_dict.get('remember', []),
                                    'vocabulary': content_dict.get('vocabulary', []),
                                    'challenge': content_dict.get('challenge', ''),
                                    'skill': content_dict.get('skill', ''),
                                    'questions': content_dict.get('questions', []),
                                    'steps': content_dict.get('steps', []),
                                }
                            )
                            contents_count += 1

        # La bibliothèque de devoirs des enseignants suit le programme.
        from apps.scolaire.services.programme import sync_programme_missions
        missions = sync_programme_missions()
        self.stdout.write(f"   - Devoirs du programme : {missions['created']} crees, {missions['updated']} mis a jour")

        self.stdout.write(self.style.SUCCESS(
            f"[SUCCES] Synchronisation reussie !\n"
            f"   - Parcours (AgeTracks) : {tracks_count}\n"
            f"   - Mondes/Modules : {modules_count}\n"
            f"   - Cours/Lecons : {lessons_count}\n"
            f"   - Contenus pedagogiques riches : {contents_count}"
        ))
