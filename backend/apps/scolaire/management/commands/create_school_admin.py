"""
Crée le compte de la direction d'une école existante (rôle admin_ecole).
Le mot de passe provisoire est affiché une seule fois.

Usage :
  python manage.py create_school_admin --school les-baobabs --email directrice@ecole.sn \
      --first-name Aminata --last-name Sarr --title Directrice
"""
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from apps.accounts.models import User
from apps.schools.models import School

from ...identifiers import generate_temporary_password, is_reserved_login_email
from ...models import StaffProfile
from ...payloads import current_year


class Command(BaseCommand):
    help = "Crée le compte admin d'une école (espace /ecole)."

    def add_arguments(self, parser):
        parser.add_argument('--school', required=True, help="Slug de l'école (ex. les-baobabs).")
        parser.add_argument('--email', required=True)
        parser.add_argument('--first-name', required=True)
        parser.add_argument('--last-name', required=True)
        parser.add_argument('--title', default='Directeur·rice')

    @transaction.atomic
    def handle(self, *args, **options):
        school = School.objects.filter(slug=options['school']).first()
        if school is None:
            raise CommandError(f"École « {options['school']} » introuvable.")
        email = options['email'].strip().lower()
        if is_reserved_login_email(email):
            raise CommandError('Ce domaine est réservé aux identifiants élèves.')
        if User.objects.filter(email__iexact=email).exists():
            raise CommandError('Un compte utilise déjà cette adresse e-mail.')
        password = generate_temporary_password()
        first, last = options['first_name'].strip(), options['last_name'].strip()
        user = User.objects.create_user(email, password, display_name=f'{first} {last}',
                                        role=User.ROLE_SCHOOL_ADMIN, school=school)
        StaffProfile.objects.create(user=user, school=school, first_name=first, last_name=last, title=options['title'])
        current_year(school)  # l'école a toujours une année en cours
        self.stdout.write(self.style.SUCCESS(f'Compte admin créé pour « {school.name} ».'))
        self.stdout.write(f'Identifiant : {email}')
        self.stdout.write(f'Mot de passe provisoire (affiché une seule fois) : {password}')
