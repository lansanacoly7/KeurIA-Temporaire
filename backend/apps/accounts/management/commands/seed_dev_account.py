"""Crée (ou remet à jour) un compte de test « développeur » du parcours 7-9 : aucun parent, toutes les leçons déjà faites.

Toutes les leçons étant terminées, la carte les montre toutes comme débloquées et rejouables. À n'utiliser qu'en
développement : la commande refuse de tourner quand DEBUG est faux, sauf avec --allow-production.
"""
from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone

from apps.accounts.models import User
from apps.curriculum.models import Lesson
from apps.learners.models import LearnerProfile
from apps.progress.models import Progress

DEFAULT_EMAIL = 'dev.test@keria.dev'
TRACK = '7-9'


class Command(BaseCommand):
    help = "Crée un compte développeur 7-9 sans parent, avec toutes les leçons du parcours débloquées (faites)."

    def add_arguments(self, parser):
        parser.add_argument('--email', default=DEFAULT_EMAIL)
        parser.add_argument('--password', required=True, help='Mot de passe du compte de test (à choisir ; jamais écrit dans le dépôt).')
        parser.add_argument('--allow-production', action='store_true', help='Autorise la commande quand DEBUG est faux.')

    @transaction.atomic
    def handle(self, *args, **options):
        if not settings.DEBUG and not options['allow_production']:
            raise CommandError('Compte de test refusé : DEBUG est faux (utilise --allow-production en connaissance de cause).')

        email = options['email'].strip().lower()
        user = User.objects.filter(email=email).first()
        if user is None:
            user = User.objects.create_user(email, options['password'], display_name='Testeur Dev', role=User.ROLE_STUDENT)
            action = 'créé'
        else:
            if user.parent_id or user.role != User.ROLE_STUDENT:
                raise CommandError(f'« {email} » existe déjà et n\'est pas un compte de test sans parent : je n\'y touche pas.')
            user.set_password(options['password'])
            action = 'remis à jour'
        user.display_name = 'Testeur Dev'
        user.age_group = TRACK
        user.parent = None
        user.is_active = True
        user.email_verified = True
        user.tutorial_completed = True
        user.terms_accepted_at = user.terms_accepted_at or timezone.now()
        user.save()

        LearnerProfile.objects.update_or_create(
            learner=user,
            defaults={'owner_email': email, 'learner_email': email, 'nickname': 'Testeur Dev', 'age_track': TRACK},
        )

        lessons = list(Lesson.objects.filter(module__track__key=TRACK).order_by('module__order', 'order'))
        if not lessons:
            raise CommandError('Aucune leçon du parcours 7-9 en base : lance d\'abord seed_curriculum.')
        now = timezone.now()
        for lesson in lessons:
            Progress.objects.update_or_create(
                user=user, lesson_id=lesson.lesson_id,
                defaults={'owner_email': email, 'age_track': TRACK, 'xp': lesson.xp, 'score': 100, 'stars': 3, 'completed_at': now},
            )

        self.stdout.write(self.style.SUCCESS(
            f'Compte {action} : {email} (mot de passe : {options["password"]}) — parcours {TRACK}, '
            f'{len(lessons)} leçons débloquées, aucun parent rattaché.'))
