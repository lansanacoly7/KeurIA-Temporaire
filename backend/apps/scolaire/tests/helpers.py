"""Petite école de test : admin, deux enseignants, trois classes, quelques élèves."""
from datetime import date, timedelta

from django.utils import timezone

from apps.accounts.models import User
from apps.learners.models import LearnerProfile
from apps.schools.models import School

from ..models import AcademicYear, Classroom, StaffProfile, StudentProfile

PASSWORD = 'MotDePasse-1234'


def make_school(slug='ecole-test', name='École Test'):
    school = School.objects.create(name=name, slug=slug, city='Dakar', created_by_email='super@keuria.test')
    today = timezone.localdate()
    start = today.year if today.month >= 8 else today.year - 1
    AcademicYear.objects.create(school=school, label=f'{start}-{start + 1}', status=AcademicYear.STATUS_CURRENT,
                                start_date=date(start, 10, 1), end_date=date(start + 1, 7, 31))
    return school


def make_staff(school, email, role, first='Awa', last='Diop', title=''):
    user = User.objects.create_user(email, PASSWORD, display_name=f'{first} {last}', role=role, school=school)
    StaffProfile.objects.create(user=user, school=school, first_name=first, last_name=last, phone='77 123 45 67', title=title)
    return user


def make_student(school, classroom, first='Moussa', last='Fall', matricule=None, active=True, seen=True):
    login = f'{first.lower()}.{last.lower()}{StudentProfile.objects.count()}@{school.slug}.keuria.sn'
    user = User.objects.create_user(login, PASSWORD, display_name=first, role=User.ROLE_STUDENT, school=school)
    user.is_active = active
    user.last_seen_at = timezone.now() - timedelta(days=1) if seen else None
    user.save(update_fields=['is_active', 'last_seen_at'])
    profile = StudentProfile.objects.create(
        user=user, school=school, matricule=matricule or f'M-{StudentProfile.objects.count() + 1:04d}',
        first_name=first, last_name=last, sexe='M', birth_date=date(timezone.localdate().year - 8, 5, 4), classroom=classroom)
    LearnerProfile.objects.create(learner=user, owner_email=login, learner_email=login, nickname=first, age_track='7-9')
    return profile


def build_school(slug='ecole-test'):
    """École complète : renvoie un dict des objets créés."""
    school = make_school(slug)
    label = AcademicYear.objects.get(school=school).label
    admin = make_staff(school, f'direction@{slug}.test', User.ROLE_SCHOOL_ADMIN, 'Aminata', 'Sarr', 'Directrice')
    teacher = make_staff(school, f'khady@{slug}.test', User.ROLE_TEACHER, 'Khady', 'Faye')
    other_teacher = make_staff(school, f'babacar@{slug}.test', User.ROLE_TEACHER, 'Babacar', 'Ndour')
    ce1a = Classroom.objects.create(school=school, level='CE1', section='A', teacher=teacher, academic_year=label)
    ce1b = Classroom.objects.create(school=school, level='CE1', section='B', teacher=other_teacher, academic_year=label)
    troisieme = Classroom.objects.create(school=school, level='3e', section='A', academic_year=label)
    students = [make_student(school, ce1a, 'Awa', 'Diop'), make_student(school, ce1a, 'Modou', 'Sy', seen=False),
                make_student(school, ce1b, 'Adja', 'Ba'), make_student(school, troisieme, 'Cheikh', 'Kane')]
    return {'school': school, 'admin': admin, 'teacher': teacher, 'other_teacher': other_teacher,
            'ce1a': ce1a, 'ce1b': ce1b, 'troisieme': troisieme, 'students': students, 'label': label}
