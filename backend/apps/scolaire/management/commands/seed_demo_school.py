"""
Crée l'école de démonstration « Groupe Scolaire Les Baobabs » avec les mêmes données
que la maquette du frontend (même générateur pseudo-aléatoire, donc mêmes noms) :
11 classes, 9 enseignants, ~212 élèves, parents, devoirs et réalisations.

Comptes créés (mot de passe commun : variable DEMO_PASSWORD, sinon tiré au hasard et affiché à la fin) :
  - demo.ecole@keuria.test : admin de l'école (espace /ecole)
  - prenom.nom@example.com : les 9 enseignants (espace /enseignant)
Les élèves et parents fictifs n'ont pas de mot de passe utilisable : générez
une fiche de connexion depuis l'espace école pour tester un compte élève.

Usage : python manage.py seed_demo_school [--reset]
Refuse de tourner hors DEBUG (production).
"""
import os
import secrets
from datetime import date, datetime, timedelta
from datetime import UTC

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone

from apps.accounts.models import User
from apps.learners.models import LearnerProfile
from apps.progress.models import Progress
from apps.schools.models import School

from ...identifiers import generate_student_login, slugify_name
from ...levels import level_info
from ...models import (
    AcademicYear,
    Assignment,
    AssignmentCompletion,
    Classroom,
    ParentProfile,
    SchoolActivity,
    StaffProfile,
    StudentProfile,
)
from ...payloads import default_year_label

SLUG = 'les-baobabs'
ADMIN_EMAIL = 'demo.ecole@keuria.test'

def demo_password() -> str:
    """Mot de passe des comptes de démonstration : la variable d'environnement DEMO_PASSWORD, sinon un secret tiré au hasard
    (affiché une seule fois à la fin de la commande). Aucun mot de passe n'est écrit dans le dépôt."""
    return os.environ.get('DEMO_PASSWORD') or secrets.token_urlsafe(12)


GIRL_NAMES = ["Awa", "Aminata", "Fatou", "Mariama", "Khady", "Ndèye", "Aïssatou", "Coumba", "Astou", "Bineta", "Rokhaya",
              "Seynabou", "Yacine", "Dieynaba", "Maïmouna", "Sokhna", "Oumy", "Adja"]
BOY_NAMES = ["Moussa", "Mamadou", "Ibrahima", "Cheikh", "Ousmane", "Abdoulaye", "Modou", "Babacar", "Pape", "Serigne",
             "Lamine", "Alioune", "Souleymane", "Malick", "Omar", "Assane", "Elhadji", "Idrissa"]
LAST_NAMES = ["Diop", "Ndiaye", "Fall", "Sow", "Ba", "Diallo", "Gueye", "Faye", "Sarr", "Mbaye", "Cissé", "Thiam", "Sy",
              "Kane", "Ndour", "Seck", "Diouf", "Camara", "Niang", "Wade"]
TEACHERS = [("Fatou", "Mbaye", "77 412 38 90"), ("Ousmane", "Diallo", "78 220 45 13"), ("Khady", "Faye", "76 309 77 21"),
            ("Babacar", "Ndour", "77 845 02 66"), ("Rokhaya", "Thiam", "70 118 93 40"), ("Lamine", "Cissé", "77 560 14 82"),
            ("Mariama", "Kane", "78 903 26 57"), ("Alioune", "Seck", "76 471 88 05"), ("Seynabou", "Niang", "77 238 61 94")]
# (niveau, lettre, index de l'enseignant ou None)
CLASS_PLAN = [("CI", "A", 0), ("CP", "A", 1), ("CE1", "A", 2), ("CE1", "B", 3), ("CE2", "A", 4), ("CM1", "A", 5),
              ("CM2", "A", 6), ("6e", "A", 7), ("5e", "A", 8), ("4e", "A", None), ("3e", "A", 8)]
MISSION_IDS = ["m1", "m2", "m3", "m4", "m5", "m6"]
ASSIGNMENT_PLAN = [(-5, 12, 0.75), (3, 4, 0.4), (10, 1, 0.1)]  # (échéance en jours, créé il y a, taux de rendu)
MASK = 0xFFFFFFFF


def seeded_random(seed: int):
    """mulberry32, identique à la maquette (frontend/app/_scolaire/mocks/data.ts)."""
    state = seed

    def imul(a, b):
        return (a * b) & MASK

    def rnd():
        nonlocal state
        state = (state + 0x6D2B79F5) & MASK
        t = imul(state ^ (state >> 15), 1 | state)
        t = ((t + imul(t ^ (t >> 7), 61 | t)) & MASK) ^ t
        return ((t ^ (t >> 14)) & MASK) / 4294967296

    return rnd


class Command(BaseCommand):
    help = "Crée l'école de démonstration Les Baobabs (données identiques à la maquette)."

    def add_arguments(self, parser):
        parser.add_argument('--reset', action='store_true', help="Supprime d'abord l'école de démonstration existante.")

    @transaction.atomic
    def handle(self, *args, **options):
        if not settings.DEBUG:
            raise CommandError(
                "Refusé : cette commande crée des comptes de démonstration. "
                "Elle ne s'exécute qu'avec DEBUG=True, jamais en production."
            )
        password = demo_password()
        existing = School.objects.filter(slug=SLUG).first()
        if existing and not options['reset']:
            raise CommandError("L'école de démonstration existe déjà (utilisez --reset pour la recréer).")
        if existing:
            self._delete(existing)

        now = timezone.now()
        random = seeded_random(20260925)
        label = default_year_label()
        year = int(label[:4])

        school = School.objects.create(name='Groupe Scolaire Les Baobabs', slug=SLUG, city='Dakar',
                                       primary_color='#173e3c', accent_color='#d9ef59', created_by_email=ADMIN_EMAIL)
        AcademicYear.objects.create(school=school, label=label, status=AcademicYear.STATUS_CURRENT,
                                    start_date=date(year, 10, 1), end_date=date(year + 1, 7, 31))
        admin = User.objects.create_user(ADMIN_EMAIL, password, display_name='Aminata Sarr',
                                         role=User.ROLE_SCHOOL_ADMIN, school=school)
        StaffProfile.objects.create(user=admin, school=school, first_name='Aminata', last_name='Sarr', title='Directrice')

        teachers = []
        for i, (first, last, phone) in enumerate(TEACHERS):
            email = f'{slugify_name(first)}.{slugify_name(last)}@example.com'
            user = User.objects.create_user(email, password, display_name=f'{first} {last}',
                                            role=User.ROLE_TEACHER, school=school)
            # La dernière enseignante n'a encore jamais utilisé ses identifiants.
            user.last_seen_at = None if i == 8 else now - timedelta(hours=(i + 1) * 5)
            user.created_at = datetime(year, 9, 1, 8, tzinfo=UTC)
            user.save(update_fields=['last_seen_at', 'created_at'])
            StaffProfile.objects.create(user=user, school=school, first_name=first, last_name=last, phone=phone)
            teachers.append(user)

        classrooms = [Classroom.objects.create(school=school, level=lvl, section=sec, academic_year=label,
                                               teacher=teachers[t] if t is not None else None)
                      for lvl, sec, t in CLASS_PLAN]
        students = self._students(school, classrooms, random, now, year)
        parents = self._parents(students, random, now)
        assignments, completions = self._assignments(school, classrooms, students, random, now)
        self._activity(school, now)

        self.stdout.write(self.style.SUCCESS(
            f'École « {school.name} » créée : {len(classrooms)} classes, {len(teachers)} enseignants, '
            f'{len(students)} élèves, {parents} parents, {assignments} devoirs, {completions} réalisations.'))
        self.stdout.write(f'Mot de passe des comptes de démonstration (affiché une seule fois) : {password}')
        self.stdout.write(f'Admin école : {ADMIN_EMAIL}')
        self.stdout.write('Enseignante (exemple) : khady.faye@example.com')

    def _delete(self, school):
        users = User.objects.filter(school=school)
        parent_ids = set(users.exclude(parent__isnull=True).values_list('parent_id', flat=True))
        # Les enfants d'abord (User.parent est protégé), puis leurs parents fictifs.
        users.update(parent=None)
        Classroom.objects.filter(school=school).update(teacher=None)
        users.delete()
        User.objects.filter(pk__in=parent_ids, email__endswith='@example.com', role=User.ROLE_PARENT).delete()
        school.delete()

    def _students(self, school, classrooms, random, now, year):
        students, taken = [], set(User.objects.filter(email__endswith=f'@{SLUG}.keuria.sn').values_list('email', flat=True))

        def pick(items):
            return items[int(random() * len(items))]

        def add(classroom):
            sexe = 'F' if random() < 0.5 else 'M'
            first = pick(GIRL_NAMES if sexe == 'F' else BOY_NAMES)
            last = pick(LAST_NAMES)
            age = level_info(classroom.level).typical_age if classroom else 9
            roll = random()
            state = 'actif' if roll < 0.7 else ('jamais_connecte' if roll < 0.95 else 'desactive')
            last_seen = now - timedelta(hours=int(random() * 14 * 24)) if state == 'actif' else None
            lessons = int(random() * 18) if state == 'actif' else 0
            login = generate_student_login(first, last, SLUG, taken)
            taken.add(login)
            birth = date(year - age, 1 + int(random() * 12), 1 + int(random() * 28))

            user = User.objects.create_user(login, None, display_name=first, role=User.ROLE_STUDENT, school=school)
            user.last_seen_at, user.is_active = last_seen, state != 'desactive'
            user.save(update_fields=['last_seen_at', 'is_active'])
            profile = StudentProfile.objects.create(
                user=user, school=school, matricule=f'LB-{year}-{len(students) + 1:04d}', first_name=first,
                last_name=last, sexe=sexe, birth_date=birth, classroom=classroom,
                created_at=datetime(year, 9, 2, 9, tzinfo=UTC))
            track = level_info(classroom.level).track if classroom else '7-9'
            LearnerProfile.objects.create(learner=user, owner_email=login, learner_email=login, nickname=first, age_track=track)
            Progress.objects.bulk_create([Progress(user=user, owner_email=login, lesson_id=f'demo-{n + 1}', age_track=track, xp=35)
                                          for n in range(lessons)])
            profile.state = state
            students.append(profile)

        for classroom in classrooms:
            for _ in range(16 + int(random() * 8)):
                add(classroom)
        for _ in range(3):  # quelques élèves inscrits mais pas encore affectés
            add(None)
        return students

    def _parents(self, students, random, now):
        count = 0
        for student in students:
            if random() >= 0.1:
                continue
            sexe = 'F' if random() < 0.5 else 'M'
            names = GIRL_NAMES if sexe == 'F' else BOY_NAMES
            first = names[int(random() * len(names))]
            count += 1
            parent = User.objects.create_user(f'parent{count}.{SLUG}@example.com', None, display_name=f'{first} {student.last_name}',
                                              role=User.ROLE_PARENT)
            ParentProfile.objects.create(user=parent, first_name=first, last_name=student.last_name,
                                         phone=f'77 {100 + count - 1} {10 + count - 1:02d} 00')
            student.user.parent = parent
            student.user.save(update_fields=['parent'])
            student.parent_linked_at = now - timedelta(days=3 + ((count - 1) * 7) % 40)
            student.save(update_fields=['parent_linked_at'])
        return count

    def _assignments(self, school, classrooms, students, random, now):
        n_assignments = n_completions = 0
        for class_index, classroom in enumerate(c for c in classrooms if c.teacher_id):
            steps = ASSIGNMENT_PLAN if class_index % 2 == 0 else ASSIGNMENT_PLAN[:2]
            for i, (due_in, created_ago, done_rate) in enumerate(steps):
                created_at = now - timedelta(days=created_ago)
                assignment = Assignment.objects.create(
                    school=school, mission_id=MISSION_IDS[(class_index + i * 2) % len(MISSION_IDS)], classroom=classroom,
                    teacher_id=classroom.teacher_id, due_date=(now + timedelta(days=due_in)).date(), created_at=created_at)
                n_assignments += 1
                for student in students:
                    if student.classroom_id != classroom.id or student.state != 'actif' or random() >= done_rate:
                        continue
                    end = min(now, created_at + timedelta(days=created_ago + due_in))
                    span = max(0.0, (end - created_at).total_seconds())
                    AssignmentCompletion.objects.create(assignment=assignment, student=student,
                                                        completed_at=created_at + timedelta(seconds=random() * span),
                                                        score=40 + int(random() * 61))
                    n_completions += 1
        return n_assignments, n_completions

    def _activity(self, school, now):
        for hours, kind, label in [(74, 'classe_creee', 'Classe 4e A créée'),
                                   (50, 'enseignant_ajoute', 'Seynabou Niang ajoutée comme enseignante'),
                                   (26, 'eleve_deplace', 'Un élève déplacé de CE2 A vers CE1 B'),
                                   (7, 'mdp_reinitialise', 'Mot de passe réinitialisé pour un élève de CM1 A'),
                                   (3, 'eleves_importes', '22 élèves importés en CE1 B')]:
            SchoolActivity.objects.create(school=school, kind=kind, label=label, at=now - timedelta(hours=hours))
