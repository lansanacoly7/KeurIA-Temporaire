"""
Réponses JSON au format exact des types du frontend (frontend/app/_scolaire/lib/types.ts).
Les identifiants sont des chaînes, les dates au format ISO.
"""
from datetime import date

from django.db.models import Count, Sum, Value
from django.db.models.functions import Coalesce
from django.utils import timezone

from apps.accounts.models import User

from .models import AcademicYear, Assignment, Classroom, StudentProfile


def iso(value):
    return value.isoformat() if value else None


def sid(value):
    """Identifiant (int) → chaîne, None conservé."""
    return str(value) if value is not None else None


STATUS_LABELS = {'actif': 'Actif', 'jamais_connecte': 'Jamais connecté', 'desactive': 'Désactivé'}


def account_status(user) -> str:
    """désactivé : connexion refusée ; jamais connecté : identifiants jamais utilisés."""
    if not user.is_active:
        return 'desactive'
    return 'jamais_connecte' if user.last_seen_at is None else 'actif'


# ─── Élèves ──────────────────────────────────────────────────────────────────

def students_qs(school):
    """Élèves de l'école, avec compte, classe et progression agrégée (une seule requête)."""
    return (StudentProfile.objects.filter(school=school)
            .select_related('user', 'classroom')
            .annotate(xp_total=Coalesce(Sum('user__progress_entries__xp'), Value(0)),
                      lessons_total=Count('user__progress_entries')))


def student_payload(profile) -> dict:
    user = profile.user
    data = {
        'id': str(profile.id),
        'matricule': profile.matricule,
        'firstName': profile.first_name,
        'lastName': profile.last_name,
        'sexe': profile.sexe,
        'birthDate': profile.birth_date.isoformat(),
        'classId': sid(profile.classroom_id),
        'login': user.email,
        'status': account_status(user),
        'lastLoginAt': iso(user.last_seen_at),
        'xp': getattr(profile, 'xp_total', 0),
        'lessonsCompleted': getattr(profile, 'lessons_total', 0),
        'parentId': sid(user.parent_id),
        'parentPhone': profile.parent_phone or '',
        'createdAt': iso(profile.created_at),
        # Parcours impos� par l'enseignant (T10) : null = parcours par d�faut du niveau de la classe.
        'trackOverride': profile.track_override or None,
    }
    if profile.left_in_year:
        data['leftInYear'] = profile.left_in_year
    if profile.parent_linked_at and user.parent_id:
        data['parentLinkedAt'] = iso(profile.parent_linked_at)
    return data


def sort_students(profiles):
    return sorted(profiles, key=lambda p: (p.last_name.lower(), p.first_name.lower()))


# ─── Personnel ───────────────────────────────────────────────────────────────

def teachers_qs(school):
    return User.objects.filter(school=school, role=User.ROLE_TEACHER).select_related('staff_profile')


def teacher_payload(user) -> dict:
    staff = user.staff_profile
    return {
        'id': str(user.id),
        'firstName': staff.first_name,
        'lastName': staff.last_name,
        'email': user.email,
        'phone': staff.phone,
        'status': account_status(user),
        'lastLoginAt': iso(user.last_seen_at),
        'createdAt': iso(user.created_at),
    }


def sort_teachers(users):
    return sorted(users, key=lambda u: (u.staff_profile.last_name.lower(), u.staff_profile.first_name.lower()))


def parent_payload(user) -> dict:
    profile = getattr(user, 'parent_profile', None)
    if profile:
        first, last, phone = profile.first_name, profile.last_name, profile.phone
        parent_role = getattr(profile, 'parent_role', '')
    else:
        first, _, last = user.display_name.partition(' ')
        phone = ''
        parent_role = getattr(user, 'gender', '')
    return {'id': str(user.id), 'firstName': first, 'lastName': last, 'email': user.email, 'phone': phone, 'parentRole': parent_role}


# ─── Classes, école, années ──────────────────────────────────────────────────

def classroom_payload(classroom) -> dict:
    data = {
        'id': str(classroom.id),
        'level': classroom.level,
        'section': classroom.section,
        'teacherId': sid(classroom.teacher_id),
        'academicYear': classroom.academic_year,
        'archived': classroom.archived,
    }
    if classroom.archived:
        data['archivedStudentIds'] = [str(i) for i in classroom.archived_student_ids]
    return data


def default_year_label(day=None) -> str:
    """Année scolaire en cours à cette date (rentrée en octobre, fin en juillet)."""
    day = day or timezone.localdate()
    start = day.year if day.month >= 8 else day.year - 1
    return f'{start}-{start + 1}'


def current_year(school) -> AcademicYear:
    """Année en cours de l'école, créée au besoin (école créée depuis le panneau super-admin)."""
    year = AcademicYear.objects.filter(school=school, status=AcademicYear.STATUS_CURRENT).first()
    if year is None:
        label = default_year_label()
        year = AcademicYear.objects.create(school=school, label=label, status=AcademicYear.STATUS_CURRENT,
                                           start_date=date(int(label[:4]), 10, 1), end_date=date(int(label[5:]), 7, 31))
    return year


def school_payload(school) -> dict:
    admin = (User.objects.filter(school=school, role=User.ROLE_SCHOOL_ADMIN)
             .select_related('staff_profile').order_by('id').first())
    staff = getattr(admin, 'staff_profile', None) if admin else None
    logo_url = school.logo.url if school.logo else None
    return {
        'id': str(school.id),
        'name': school.name,
        'slug': school.slug,
        'city': school.city,
        'logoUrl': logo_url,
        'website': getattr(school, 'website', '') or '',
        'academicYear': current_year(school).label,
        'primaryColor': school.primary_color,
        'accentColor': school.accent_color,
        'admin': {
            'firstName': staff.first_name if staff else '',
            'lastName': staff.last_name if staff else '',
            'email': admin.email if admin else '',
            'title': staff.title if staff else '',
        },
    }


def year_payload(year) -> dict:
    return {
        'label': year.label,
        'startDate': year.start_date.isoformat(),
        'endDate': year.end_date.isoformat(),
        'status': year.status,
        'closedAt': iso(year.closed_at),
        'summary': year.summary,
    }


def activity_payload(item) -> dict:
    return {'id': str(item.id), 'kind': item.kind, 'label': item.label, 'at': iso(item.at)}


# ─── Missions et devoirs ─────────────────────────────────────────────────────

def mission_payload(mission) -> dict:
    return {
        'id': mission.id,
        'title': mission.title,
        'description': mission.description,
        'category': mission.category,
        'difficulty': mission.difficulty,
        'durationMinutes': mission.duration_minutes,
        'xp': mission.xp,
        # Parcours d'âge du devoir ("" = tous les âges), nature (« libre », « lecon », « bilan ») et nombre de questions.
        'track': mission.track,
        'kind': mission.kind,
        'questionCount': mission.question_count,
    }


def library_mission_payload(mission) -> dict:
    """Fiche de la bibliothèque des enseignants : la fiche du devoir + sa place dans le programme (module, leçon).
    `mission` doit venir d'un `select_related('module', 'lesson')`."""
    module, lesson = mission.module, mission.lesson
    return {
        **mission_payload(mission),
        'moduleId': module.world_id if module else None,
        'moduleTitle': module.title if module else None,
        'moduleOrder': module.order if module else None,
        'lessonId': lesson.lesson_id if lesson else None,
        'lessonTitle': lesson.title if lesson else None,
        'lessonOrder': lesson.order if lesson else None,
    }


def assignment_payload(assignment: Assignment) -> dict:
    return {
        'id': str(assignment.id),
        'missionId': assignment.mission_id,
        'classId': str(assignment.classroom_id),
        'teacherId': sid(assignment.teacher_id) or '',
        'dueDate': assignment.due_date.isoformat() if assignment.due_date else None,
        'instructions': assignment.instructions,
        'createdAt': iso(assignment.created_at),
    }


def completion_payload(completion) -> dict:
    return {
        'assignmentId': str(completion.assignment_id),
        'studentId': str(completion.student_id),
        'completedAt': iso(completion.completed_at),
        'score': completion.score,
    }


def active_classrooms(school):
    return Classroom.objects.filter(school=school, archived=False)
