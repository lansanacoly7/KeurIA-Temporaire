"""
Comptes FICTIFS et TEMPORAIRES pour la démonstration de la page Classement.

Crée des élèves sans école (donc visibles dans le classement général de leur parcours) avec de l'XP répartie sur 75 jours :
les périodes « 7 jours », « 30 jours » et « Depuis le début » donnent donc trois classements différents.
Ils n'ont pas de mot de passe utilisable, sauf un compte « spectateur » (parcours 7-9) dont le mot de passe, tiré au hasard,
est affiché une seule fois : il sert à montrer « ton rang » et « Proche de moi » à partir du milieu du classement.

Tous les comptes ont une adresse `lbdemo-…@keuria.sn` : `--clear` les retire (avec leur XP) en une commande.

Usage : python manage.py seed_leaderboard_demo [--clear] [--viewer-password MOT_DE_PASSE]
Refuse de tourner hors DEBUG (production) : ce sont de fausses données.
"""
import random
import secrets
from datetime import timedelta

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone

from apps.accounts.models import User
from apps.learners.models import LearnerProfile
from apps.progress.models import Progress

PREFIX = 'lbdemo-'
DOMAIN = 'keuria.sn'
VIEWER_EMAIL = f'{PREFIX}spectateur@{DOMAIN}'
POOLS = {'7-9': 48, '10-12': 24, '13-15': 24}
XP_STEPS = (20, 25, 30, 35, 40, 45, 50)

GIRLS = ["Awa", "Aminata", "Fatou", "Mariama", "Khady", "Ndèye", "Aïssatou", "Coumba", "Astou", "Bineta", "Rokhaya",
         "Seynabou", "Yacine", "Dieynaba", "Maïmouna", "Sokhna", "Oumy", "Adja"]
BOYS = ["Moussa", "Mamadou", "Ibrahima", "Cheikh", "Ousmane", "Abdoulaye", "Modou", "Babacar", "Pape", "Serigne",
        "Lamine", "Alioune", "Souleymane", "Malick", "Omar", "Assane", "Elhadji", "Idrissa"]
LASTS = ["Diop", "Ndiaye", "Fall", "Sow", "Ba", "Diallo", "Gueye", "Faye", "Sarr", "Mbaye", "Cissé", "Thiam", "Sy", "Kane",
         "Ndour", "Seck", "Diouf", "Camara", "Niang", "Wade"]


def demo_users():
    return User.objects.filter(email__startswith=PREFIX, email__endswith=f'@{DOMAIN}')


def _entries(rng: random.Random, strength: float, boost: int):
    """(jours écoulés, XP) de chaque activité terminée : les plus forts jouent aussi beaucoup cette semaine."""
    count = 3 + int(strength * 15)
    recent_share = 0.18 + 0.2 * strength
    entries = []
    for _ in range(count):
        roll = rng.random()
        days = rng.uniform(0, 6.8) if roll < recent_share else rng.uniform(7.2, 29) if roll < 0.7 else rng.uniform(31, 75)
        entries.append((days, rng.choice(XP_STEPS)))
    entries += [(rng.uniform(0, 6.5), rng.choice((35, 40, 45, 50))) for _ in range(boost)]  # le podium de la semaine
    return entries


class Command(BaseCommand):
    help = "Crée (ou retire avec --clear) des comptes fictifs temporaires pour démontrer le classement."

    def add_arguments(self, parser):
        parser.add_argument('--clear', action='store_true', help='Supprime les comptes de démonstration du classement et leur XP.')
        parser.add_argument('--viewer-password', default='', help='Mot de passe du compte spectateur (sinon tiré au hasard).')

    def handle(self, *args, **options):
        if not settings.DEBUG:
            raise CommandError('Ces comptes sont fictifs : cette commande refuse de tourner hors DEBUG.')
        with transaction.atomic():
            removed = demo_users().count()
            demo_users().delete()
            if options['clear']:
                self.stdout.write(self.style.SUCCESS(f'{removed} compte(s) de démonstration du classement supprimé(s).'))
                return
            created, viewer_password = self._create(options['viewer_password'] or secrets.token_urlsafe(9))
        self.stdout.write(self.style.SUCCESS(f'{created} élèves fictifs créés ({removed} ancien(s) remplacé(s)).'))
        self.stdout.write(f'Compte spectateur (parcours 7-9) : {VIEWER_EMAIL}  /  mot de passe : {viewer_password}')
        self.stdout.write('Pour tout retirer : python manage.py seed_leaderboard_demo --clear')

    def _create(self, viewer_password: str):
        rng = random.Random(2026)
        now = timezone.now()
        used_names, created, viewer_password_out = set(), 0, viewer_password

        def new_name():
            while True:
                first = rng.choice(GIRLS if rng.random() < 0.5 else BOYS)
                last = rng.choice(LASTS)
                if (first, last) not in used_names:
                    used_names.add((first, last))
                    return first, last

        for track, size in POOLS.items():
            slug = track.replace('-', '')
            for index in range(size):
                first, last = new_name()
                email = f'{PREFIX}{slug}-{index + 1:02d}@{DOMAIN}'
                self._student(email, f'{first} {last}', first, track, now, _entries(rng, (1 - index / size) ** 1.5, 5 - index if index < 3 else 0), rng)
                created += 1

        # Le spectateur : parcours 7-9, au milieu du classement de la semaine (il voit des voisins au-dessus et en dessous).
        user = self._student(VIEWER_EMAIL, 'Spectateur Démo', 'Spectateur', '7-9', now,
                             [(rng.uniform(0, 6.5), 35) for _ in range(6)] + [(rng.uniform(8, 28), 30) for _ in range(5)], rng)
        user.set_password(viewer_password)
        user.save(update_fields=['password'])
        return created + 1, viewer_password_out

    def _student(self, email, display_name, first, track, now, entries, rng):
        user = User.objects.create_user(email, None, display_name=display_name, role=User.ROLE_STUDENT)
        user.last_seen_at = now - timedelta(hours=rng.randint(1, 60))
        user.save(update_fields=['last_seen_at'])
        LearnerProfile.objects.create(learner=user, owner_email=email, learner_email=email, nickname=first, age_track=track)
        Progress.objects.bulk_create([
            Progress(user=user, owner_email=email, lesson_id=f'demo-lb-{n + 1}', age_track=track, xp=xp,
                     score=rng.randint(70, 100), stars=rng.randint(1, 3), completed_at=now - timedelta(days=days))
            for n, (days, xp) in enumerate(entries)
        ])
        return user
