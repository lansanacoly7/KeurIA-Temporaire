"""
Espace « Gestion de l'école » (miroir de frontend/app/_scolaire/lib/ecoleApi.ts).

Toutes les fonctions reçoivent l'école de l'admin connecté et n'accèdent qu'à
ses données. Les règles de validation sont celles du frontend, revérifiées ici.
"""
import base64
import binascii
import re
from io import BytesIO

from django.core.exceptions import ValidationError as DjangoValidationError
from django.core.files.base import ContentFile
from django.core.validators import URLValidator
from django.db import IntegrityError, transaction
from django.db.models import Count, Q
from PIL import Image

from apps.accounts.models import User
from apps.accounts.serializers import phone_problem
from apps.learners.models import LearnerProfile

from ..errors import ApiError, required
from ..identifiers import (
    generate_student_login,
    generate_temporary_password,
    is_reserved_login_email,
    normalize_text,
    slugify_name,
)
from ..levels import LEVEL_CODES, class_name, classroom_sort_key, level_info
from ..models import (
    Assignment,
    AssignmentCompletion,
    Classroom,
    StaffProfile,
    StudentProfile,
)
from ..payloads import (
    activity_payload,
    classroom_payload,
    current_year,
    parent_payload,
    school_payload,
    sort_students,
    sort_teachers,
    student_payload,
    students_qs,
    teacher_payload,
    teachers_qs,
)
from ..themes import is_theme
from . import classement
from .common import (
    age_from,
    get_classroom,
    get_student,
    get_teacher,
    log_activity,
    parse_id,
    parse_iso_date,
    require_status,
    sync_learner_track,
    today,
)
from .liens import credentials_with_code

EMAIL_RE = re.compile(r'^[^\s@]+@[^\s@]+\.[^\s@]+$')
MAX_BULK = 500


def plural(n: int, singular: str, plural_form: str | None = None) -> str:
    return f"{n} {singular if n <= 1 else (plural_form or singular + 's')}"


# ─── École ───────────────────────────────────────────────────────────────────

def get_school(school) -> dict:
    return school_payload(school)


MAX_LOGO_BYTES = 2 * 1024 * 1024
LOGO_FORMATS = {'PNG': 'png', 'JPEG': 'jpg', 'WEBP': 'webp'}


def _replace_logo(school, raw: bytes) -> None:
    """Enregistre le logo après vérification : taille, vrai format image (détecté, pas déclaré) et
    extension imposée par le serveur. Le SVG est refusé : il peut contenir du script."""
    if len(raw) > MAX_LOGO_BYTES:
        raise ApiError('Logo trop lourd (2 Mo maximum).')
    try:
        with Image.open(BytesIO(raw)) as image:
            detected = image.format
            image.verify()
    except Exception:
        raise ApiError('Logo illisible : envoyez une image PNG, JPEG ou WebP.') from None
    if detected not in LOGO_FORMATS:
        raise ApiError('Format de logo non pris en charge : utilisez PNG, JPEG ou WebP.')
    if school.logo:
        school.logo.delete(save=False)
    school.logo.save(f'{school.slug}-logo.{LOGO_FORMATS[detected]}', ContentFile(raw), save=False)


def _website(raw) -> str:
    """Adresse du site de l'école : http(s) uniquement (elle devient un lien cliquable : pas de « javascript: »)."""
    if raw is not None and not isinstance(raw, str):
        raise ApiError("L'adresse du site doit être un texte.")
    value = (raw or '').strip()
    if not value:
        return ''
    try:
        URLValidator(schemes=['http', 'https'])(value)
    except DjangoValidationError:
        raise ApiError("L'adresse du site doit commencer par http:// ou https:// et être valide.") from None
    if len(value) > 255:
        raise ApiError("L'adresse du site est trop longue (255 caractères maximum).")
    return value


def update_school(school, data, files=None) -> dict:
    name = required(data.get('name'), "Le nom de l'établissement")
    city = required(data.get('city'), 'La ville')
    primary, accent = str(data.get('primaryColor', '')), str(data.get('accentColor', ''))
    # Seuls les thèmes proposés sont acceptés : ils sont tous lisibles par les enfants.
    if not is_theme(primary, accent):
        raise ApiError("Choisissez l'un des thèmes proposés.")
    school.name, school.city = name[:200], city[:120]
    # Le thème fixe trois couleurs : la secondaire (celle que lit l'habillage de l'espace élève) suit l'accent, comme à la
    # création de l'école par l'équipe kEur IA. Sans cela elle gardait l'ancien thème.
    school.primary_color = primary.lower()
    school.secondary_color = school.accent_color = accent.lower()

    if 'website' in data:
        school.website = _website(data.get('website'))

    upload = files.get('logo') if files else None
    if upload:
        _replace_logo(school, upload.read(MAX_LOGO_BYTES + 1))
    elif data.get('removeLogo') is True:
        if school.logo:
            school.logo.delete(save=False)
        school.logo = None
    elif isinstance(data.get('logo'), str) and data.get('logo', '').startswith('data:image/'):
        try:
            _, encoded = data['logo'].split(';base64,', 1)
            raw_logo = base64.b64decode(encoded, validate=True)
        except (ValueError, binascii.Error):
            raise ApiError('Logo illisible.') from None
        _replace_logo(school, raw_logo)

    school.save()
    return school_payload(school)


def _build_classroom_leaderboard(school, week_ago) -> list:
    from django.core.cache import cache
    cache_key = f"classroom_leaderboard_{school.id}"
    cached = cache.get(cache_key)
    if cached is not None:
        return cached

    from apps.progress.models import Progress, lesson_progress

    active_classes = list(Classroom.objects.filter(school=school, archived=False))
    if not active_classes:
        return []

    students = StudentProfile.objects.filter(school=school, user__is_active=True, classroom__in=active_classes).select_related('classroom')
    students_by_class = {}
    for st in students:
        students_by_class.setdefault(st.classroom_id, []).append(st.user_id)

    all_user_ids = [uid for uids in students_by_class.values() for uid in uids]

    weekly_counts = dict(
        lesson_progress(Progress.objects.filter(user_id__in=all_user_ids, completed_at__gte=week_ago))
        .values('user__student_profile__classroom_id')
        .annotate(c=Count('id'))
        .values_list('user__student_profile__classroom_id', 'c')
    )
    total_counts = dict(
        lesson_progress(Progress.objects.filter(user_id__in=all_user_ids))
        .values('user__student_profile__classroom_id')
        .annotate(c=Count('id'))
        .values_list('user__student_profile__classroom_id', 'c')
    )

    items = []
    for c in active_classes:
        c_users = students_by_class.get(c.id, [])
        w_count = weekly_counts.get(c.id, 0)
        t_count = total_counts.get(c.id, 0)
        items.append({
            'id': str(c.id),
            'name': f"{c.level} {c.section}".strip(),
            'level': c.level,
            'studentsCount': len(c_users),
            'weeklyLessons': w_count,
            'totalLessons': t_count,
        })

    items.sort(key=lambda x: (-x['weeklyLessons'], -x['totalLessons'], x['name']))
    for idx, item in enumerate(items, 1):
        item['rank'] = idx

    cache.set(cache_key, items, timeout=600)  # Cache de 10 minutes
    return items


def _build_school_leaderboard(current_school, week_ago) -> dict:
    from django.core.cache import cache
    cache_key = f"school_leaderboard_{current_school.id}"
    cached = cache.get(cache_key)
    if cached is not None:
        return cached

    from apps.progress.models import Progress, lesson_progress
    from apps.schools.models import School

    all_schools = list(School.objects.filter(suspended_at__isnull=True))
    if not all_schools:
        return {'currentRank': 1, 'totalSchools': 1, 'weeklyLessons': 0, 'topSchools': []}

    weekly_by_school = dict(
        lesson_progress(Progress.objects.filter(completed_at__gte=week_ago, user__student_profile__isnull=False))
        .values('user__student_profile__school_id')
        .annotate(c=Count('id'))
        .values_list('user__student_profile__school_id', 'c')
    )
    total_by_school = dict(
        lesson_progress(Progress.objects.filter(user__student_profile__isnull=False))
        .values('user__student_profile__school_id')
        .annotate(c=Count('id'))
        .values_list('user__student_profile__school_id', 'c')
    )
    students_by_school = dict(
        StudentProfile.objects.filter(user__is_active=True)
        .values('school_id')
        .annotate(c=Count('id'))
        .values_list('school_id', 'c')
    )

    school_entries = []
    for s in all_schools:
        w_count = weekly_by_school.get(s.id, 0)
        t_count = total_by_school.get(s.id, 0)
        s_count = students_by_school.get(s.id, 0)
        school_entries.append({
            'id': str(s.id),
            'name': s.name,
            'city': s.city or 'Sénégal',
            'weeklyLessons': w_count,
            'totalLessons': t_count,
            'studentsCount': s_count,
            'isCurrent': (s.id == current_school.id),
        })

    school_entries.sort(key=lambda x: (-x['weeklyLessons'], -x['totalLessons'], x['name']))

    current_rank = 1
    for idx, entry in enumerate(school_entries, 1):
        entry['rank'] = idx
        if entry['isCurrent']:
            current_rank = idx

    current_weekly = weekly_by_school.get(current_school.id, 0)
    top_schools = school_entries[:5]
    if not any(e['isCurrent'] for e in top_schools):
        for e in school_entries:
            if e['isCurrent']:
                top_schools.append(e)
                break

    result = {
        'currentRank': current_rank,
        'totalSchools': len(school_entries),
        'weeklyLessons': current_weekly,
        'topSchools': top_schools,
    }
    cache.set(cache_key, result, timeout=3600)  # Cache de 1 heure pour le classement des écoles
    return result


def get_dashboard(school) -> dict:
    from datetime import timedelta
    from django.utils import timezone
    from apps.progress.models import Progress, lesson_progress

    students = StudentProfile.objects.filter(school=school, user__is_active=True)
    active = sorted(Classroom.objects.filter(school=school, archived=False), key=classroom_sort_key)
    student_user_ids = list(students.values_list('user_id', flat=True))

    week_ago = timezone.now() - timedelta(days=7)
    connected_this_week = students.filter(user__last_seen_at__gte=week_ago).count()
    total_lessons = lesson_progress(Progress.objects.filter(user_id__in=student_user_ids)).count()

    classroom_leaderboard = _build_classroom_leaderboard(school, week_ago)
    school_leaderboard = _build_school_leaderboard(school, week_ago)

    return {
        'teachers': teachers_qs(school).filter(is_active=True).count(),
        'classes': len(active),
        'students': students.count(),
        'neverLoggedIn': students.filter(user__last_seen_at__isnull=True).count(),
        'activeThisWeek': connected_this_week,
        'totalLessonsCompleted': total_lessons,
        'classroomLeaderboard': classroom_leaderboard,
        'schoolLeaderboard': school_leaderboard,
        'classesWithoutTeacher': [classroom_payload(c) for c in active if c.teacher_id is None],
        'studentsWithoutClass': students.filter(classroom__isnull=True).count(),
        'recentActivity': [activity_payload(a) for a in school.activity.all()[:6]],
        'school': {
            'name': school.name,
            'slug': school.slug,
            'city': school.city,
            'logoUrl': school.logo.url if school.logo else None,
            'website': getattr(school, 'website', '') or '',
        },
    }


# ─── Classes ─────────────────────────────────────────────────────────────────

def _classrooms_with_counts(school):
    return (Classroom.objects.filter(school=school).select_related('teacher__staff_profile')
            .annotate(active_students=Count('students', filter=Q(students__user__is_active=True))))


def _classroom_row(classroom) -> dict:
    teacher = classroom.teacher
    return {
        'classroom': classroom_payload(classroom),
        'teacher': teacher_payload(teacher) if teacher else None,
        'studentCount': getattr(classroom, 'active_students', 0),
    }


def list_classrooms(school, include_archived=False) -> list:
    rows = _classrooms_with_counts(school)
    if not include_archived:
        rows = rows.filter(archived=False)
    return [_classroom_row(c) for c in sorted(rows, key=classroom_sort_key)]


def get_classroom_detail(school, class_id) -> dict:
    classroom = get_classroom(school, class_id)
    classroom = _classrooms_with_counts(school).get(pk=classroom.pk)
    if classroom.archived:
        # Classe archivée : les élèves qu'elle avait, même s'ils ont changé de classe depuis.
        students = students_qs(school).filter(pk__in=classroom.archived_student_ids)
    else:
        students = students_qs(school).filter(classroom=classroom)
    return {**_classroom_row(classroom), 'students': [student_payload(s) for s in sort_students(students)]}


def _classroom_fields(school, data, ignore_id=None):
    level = data.get('level')
    if level not in LEVEL_CODES:
        raise ApiError('Niveau invalide.')
    # La lettre est facultative : beaucoup d'écoles n'ont qu'une classe par niveau (« CI », « CP »).
    section = str(data.get('section') or '').strip().upper()[:3]
    same_level = Classroom.objects.filter(school=school, archived=False, level=level).exclude(pk=ignore_id)
    if section:
        if same_level.filter(section=section).exists():
            raise ApiError(f'La classe {level} {section} existe déjà.')
        if same_level.filter(section='').exists():
            raise ApiError(f"La classe {level} n'a pas de lettre : ajoutez-lui d'abord une lettre (par exemple A) "
                           f"avant de créer une autre classe {level}.")
    elif same_level.exists():
        raise ApiError(f"Le niveau {level} compte déjà une classe : indiquez une lettre (par exemple A, B) "
                       f"pour les distinguer.")
    teacher = get_teacher(school, data['teacherId']) if data.get('teacherId') else None
    if teacher is not None and not teacher.is_active:
        raise ApiError('Cet enseignant est désactivé.')
    return level, section, teacher


def create_classroom(school, data) -> dict:
    level, section, teacher = _classroom_fields(school, data)
    classroom = Classroom.objects.create(school=school, level=level, section=section, teacher=teacher,
                                         academic_year=current_year(school).label)
    log_activity(school, 'classe_creee', f'Classe {class_name(level, section)} créée')
    return classroom_payload(classroom)


@transaction.atomic
def update_classroom(school, class_id, data) -> dict:
    classroom = get_classroom(school, class_id, active=True)
    level, section, teacher = _classroom_fields(school, data, ignore_id=classroom.pk)
    level_changed = level != classroom.level
    classroom.level, classroom.section, classroom.teacher = level, section, teacher
    classroom.save(update_fields=['level', 'section', 'teacher'])
    if level_changed:
        for profile in StudentProfile.objects.filter(classroom=classroom).select_related('classroom'):
            sync_learner_track(profile)
    return classroom_payload(classroom)


@transaction.atomic
def archive_classroom(school, class_id) -> dict:
    """Archiver ne supprime rien : les élèves gardent leur compte et leur progression."""
    classroom = get_classroom(school, class_id, active=True)
    members = StudentProfile.objects.filter(classroom=classroom)
    classroom.archived = True
    classroom.archived_student_ids = list(members.values_list('id', flat=True))
    classroom.save(update_fields=['archived', 'archived_student_ids'])
    members.update(classroom=None)
    log_activity(school, 'classe_archivee', f'Classe {class_name(classroom.level, classroom.section)} archivée')
    return classroom_payload(classroom)


@transaction.atomic
def delete_classroom(school, class_id) -> None:
    classroom = get_classroom(school, class_id)
    if StudentProfile.objects.filter(classroom=classroom).exists():
        raise ApiError("Impossible de supprimer une classe contenant des élèves. Déplacez d'abord les élèves.")
    label = class_name(classroom.level, classroom.section)
    classroom.delete()
    log_activity(school, 'classe_supprimee', f'Classe {label} supprimée')


# ─── Enseignants ─────────────────────────────────────────────────────────────

def _teacher_row(teacher, classrooms) -> dict:
    own = sorted((c for c in classrooms if c.teacher_id == teacher.id), key=classroom_sort_key)
    return {'teacher': teacher_payload(teacher), 'classrooms': [classroom_payload(c) for c in own]}


def list_teachers(school) -> list:
    classrooms = list(Classroom.objects.filter(school=school, archived=False))
    return [_teacher_row(t, classrooms) for t in sort_teachers(teachers_qs(school))]


def get_teacher_row(school, teacher_id) -> dict:
    teacher = get_teacher(school, teacher_id)
    return _teacher_row(teacher, Classroom.objects.filter(school=school, archived=False, teacher=teacher))


def _email_problem(email: str, ignore_user_id=None):
    if not email:
        return "L'adresse e-mail est obligatoire."
    if not EMAIL_RE.match(email):
        return "L'adresse e-mail n'est pas valide."
    # L'enseignant se connecte avec sa vraie adresse : le domaine des identifiants
    # élèves ne reçoit aucun e-mail, il ne pourrait pas récupérer son compte.
    if is_reserved_login_email(email):
        return "Cette adresse est réservée aux identifiants élèves : indiquez l'e-mail personnel de l'enseignant."
    if User.objects.filter(email__iexact=email).exclude(pk=ignore_user_id).exists():
        return 'Un compte utilise déjà cette adresse e-mail.'
    return None


def _teacher_fields(school, data, ignore_user_id=None) -> dict:
    first_name = required(data.get('firstName'), 'Le prénom')[:100]
    last_name = required(data.get('lastName'), 'Le nom')[:100]
    email = str(data.get('email', '')).strip().lower()
    phone = str(data.get('phone', '')).strip()[:30]
    problem = _email_problem(email, ignore_user_id) or phone_problem(phone)
    if problem:
        raise ApiError(problem)
    class_ids = data.get('classIds') or []
    if not isinstance(class_ids, list):
        raise ApiError('Classes invalides.')
    classrooms = [get_classroom(school, cid, active=True) for cid in class_ids]
    return {'first_name': first_name, 'last_name': last_name, 'email': email, 'phone': phone, 'classrooms': classrooms}


def _assign_classrooms(school, teacher, classrooms):
    """Les classes choisies sont confiées à l'enseignant ; ses autres classes actives lui sont retirées."""
    ids = [c.pk for c in classrooms]
    Classroom.objects.filter(school=school, archived=False, teacher=teacher).exclude(pk__in=ids).update(teacher=None)
    Classroom.objects.filter(school=school, pk__in=ids).update(teacher=teacher)


def _create_teacher(school, fields) -> dict:
    password = generate_temporary_password()
    try:
        user = User.objects.create_user(fields['email'], password, display_name=f"{fields['first_name']} {fields['last_name']}",
                                        role=User.ROLE_TEACHER, school=school)
    except IntegrityError:
        raise ApiError('Un compte utilise déjà cette adresse e-mail.') from None
    StaffProfile.objects.create(user=user, school=school, first_name=fields['first_name'],
                                last_name=fields['last_name'], phone=fields['phone'])
    _assign_classrooms(school, user, fields['classrooms'])
    user = teachers_qs(school).get(pk=user.pk)
    return {'teacher': teacher_payload(user), 'credentials': {'login': user.email, 'temporaryPassword': password}}


@transaction.atomic
def create_teacher(school, data) -> dict:
    """Les enseignants se connectent avec leur propre adresse e-mail."""
    created = _create_teacher(school, _teacher_fields(school, data))
    teacher = created['teacher']
    log_activity(school, 'enseignant_ajoute', f"{teacher['firstName']} {teacher['lastName']} ajouté(e) comme enseignant(e)")
    return created


@transaction.atomic
def create_teachers(school, rows) -> list:
    """Création en masse, tout ou rien : une ligne invalide annule tout."""
    if not isinstance(rows, list) or not 0 < len(rows) <= MAX_BULK:
        raise ApiError(f'Entre 1 et {MAX_BULK} lignes par import.')
    seen, validated = set(), []
    for index, data in enumerate(rows, start=1):
        try:
            fields = _teacher_fields(school, data)
            if fields['email'] in seen:
                raise ApiError(f"L'adresse {fields['email']} apparaît deux fois.")
        except ApiError as error:
            raise ApiError(f'Ligne {index} : {error.message}') from None
        seen.add(fields['email'])
        validated.append(fields)
    created = [_create_teacher(school, fields) for fields in validated]
    log_activity(school, 'enseignant_ajoute', f"{plural(len(created), 'enseignant')} importé{'s' if len(created) > 1 else ''}")
    return created


@transaction.atomic
def update_teacher(school, teacher_id, data) -> dict:
    teacher = get_teacher(school, teacher_id)
    fields = _teacher_fields(school, data, ignore_user_id=teacher.pk)
    staff = teacher.staff_profile
    staff.first_name, staff.last_name, staff.phone = fields['first_name'], fields['last_name'], fields['phone']
    staff.save(update_fields=['first_name', 'last_name', 'phone'])
    teacher.email = fields['email']
    teacher.display_name = f"{fields['first_name']} {fields['last_name']}"
    teacher.save(update_fields=['email', 'display_name'])
    _assign_classrooms(school, teacher, fields['classrooms'])
    return teacher_payload(teachers_qs(school).get(pk=teacher.pk))


@transaction.atomic
def set_teacher_status(school, teacher_id, status) -> dict:
    teacher = get_teacher(school, teacher_id)
    teacher.is_active = require_status(status) == 'actif'
    teacher.save(update_fields=['is_active'])
    if not teacher.is_active:
        # Un compte désactivé ne peut plus se connecter : ses classes se retrouvent sans enseignant.
        Classroom.objects.filter(school=school, archived=False, teacher=teacher).update(teacher=None)
    return teacher_payload(teacher)


def reset_teacher_password(school, teacher_id) -> dict:
    teacher = get_teacher(school, teacher_id)
    password = generate_temporary_password()
    teacher.set_password(password)
    teacher.save(update_fields=['password'])
    staff = teacher.staff_profile
    log_activity(school, 'mdp_reinitialise', f'Mot de passe réinitialisé pour {staff.first_name} {staff.last_name}')
    return {'login': teacher.email, 'temporaryPassword': password}


# ─── Élèves ──────────────────────────────────────────────────────────────────

def _student_row(profile) -> dict:
    classroom = profile.classroom
    return {'student': student_payload(profile), 'classroom': classroom_payload(classroom) if classroom else None}


def list_students(school, params) -> list:
    rows = students_qs(school)
    class_filter = params.get('classId')
    if class_filter == 'none':
        rows = rows.filter(classroom__isnull=True)
    elif class_filter:
        rows = rows.filter(classroom_id=parse_id(class_filter))
    status = params.get('status')
    if status == 'desactive':
        rows = rows.filter(user__is_active=False)
    elif status == 'actif':
        rows = rows.filter(user__is_active=True, user__last_seen_at__isnull=False)
    elif status == 'jamais_connecte':
        rows = rows.filter(user__is_active=True, user__last_seen_at__isnull=True)
    query = normalize_text(str(params.get('query', '')).strip())
    profiles = [p for p in rows if not query or query in normalize_text(f'{p.first_name} {p.last_name} {p.matricule} {p.user.email}')]
    return [_student_row(p) for p in sort_students(profiles)]


def get_student_detail(school, student_id) -> dict:
    profile = get_student(school, student_id)
    parent = User.objects.select_related('parent_profile').filter(pk=profile.user.parent_id).first() if profile.user.parent_id else None
    return {**_student_row(profile), 'parent': parent_payload(parent) if parent else None}


def _matricule_problem(school, matricule, ignore_id=None):
    if not matricule:
        return 'Le matricule est obligatoire.'
    if StudentProfile.objects.filter(school=school, matricule=matricule).exclude(pk=ignore_id).exists():
        return f'Le matricule {matricule} est déjà attribué.'
    return None


# Âges acceptés pour un élève (le formulaire de l'interface applique les mêmes bornes : _scolaire/lib/format.ts).
STUDENT_MIN_AGE, STUDENT_MAX_AGE = 4, 20


def _fr_date(value) -> str:
    """JJ/MM/AAAA avec l'année sur 4 chiffres (strftime('%Y') donne « 210 » sous Linux, « 0210 » sous Windows)."""
    return f'{value.day:02d}/{value.month:02d}/{value.year:04d}'


def _birth_date_problem(birth):
    if birth is None:
        return 'La date de naissance est obligatoire.'
    if birth > today():
        return f'La date de naissance ({_fr_date(birth)}) est dans le futur.'
    age = age_from(birth)
    if age < STUDENT_MIN_AGE or age > STUDENT_MAX_AGE:
        return (f"La date de naissance ({_fr_date(birth)}) est impossible : l'âge attendu est de "
                f"{STUDENT_MIN_AGE} à {STUDENT_MAX_AGE} ans. Vérifiez l'année.")
    return None


def check_matricule(school, raw, ignore_id=None) -> dict:
    """Vérification en direct dans le formulaire : le matricule est-il libre dans cette école ? (même règle que l'enregistrement)"""
    matricule = str(raw or '').strip().upper()[:30]
    problem = _matricule_problem(school, matricule, ignore_id)
    return {'matricule': matricule, 'available': problem is None, 'problem': problem}


def _parent_phone(data) -> str:
    """Téléphone du parent : facultatif, mais s'il est renseigné il doit être un vrai numéro (pas du texte libre)."""
    phone = str(data.get('parentPhone') or '').strip()[:30]
    if phone and (problem := phone_problem(phone)):
        raise ApiError(problem)
    return phone


def _student_fields(school, data, ignore_id=None) -> dict:
    matricule = str(data.get('matricule', '')).strip().upper()[:30]
    birth = parse_iso_date(data.get('birthDate'))
    problem = _matricule_problem(school, matricule, ignore_id) or _birth_date_problem(birth)
    if problem:
        raise ApiError(problem)
    sexe = data.get('sexe')
    if sexe not in ('F', 'M'):
        raise ApiError("Choisissez le sexe de l'élève : Fille ou Garçon.")
    classroom = get_classroom(school, data['classId'], active=True) if data.get('classId') else None
    return {
        'matricule': matricule,
        'first_name': required(data.get('firstName'), 'Le prénom')[:100],
        'last_name': required(data.get('lastName'), 'Le nom')[:100],
        'sexe': sexe,
        'birth_date': birth,
        'classroom': classroom,
        'parent_phone': _parent_phone(data),
    }


def _insert_student(school, fields) -> dict:
    base = f"{slugify_name(fields['first_name'])}.{slugify_name(fields['last_name'])}"
    taken = set(User.objects.filter(email__startswith=base).values_list('email', flat=True))
    login = generate_student_login(fields['first_name'], fields['last_name'], school.slug, taken)
    password = generate_temporary_password()
    user = User.objects.create_user(login, password, display_name=fields['first_name'], role=User.ROLE_STUDENT, school=school)
    profile = StudentProfile.objects.create(user=user, school=school, **fields)
    track = level_info(fields['classroom'].level).track if fields['classroom'] else '7-9'
    LearnerProfile.objects.create(learner=user, owner_email=login, learner_email=login,
                                  nickname=fields['first_name'], age_track=track)
    profile = students_qs(school).get(pk=profile.pk)
    return {'student': student_payload(profile), 'credentials': credentials_with_code(profile, password)}


def suggest_matricule(school) -> str:
    """Prochain matricule libre : initiales de l'école + année, par exemple LB-2026-0204."""
    initials = ''.join(part[0] for part in school.slug.split('-') if part).upper() or 'EL'
    prefix = f"{initials}-{current_year(school).label[:4]}-"
    numbers = [int(m[len(prefix):]) for m in StudentProfile.objects.filter(school=school, matricule__startswith=prefix)
               .values_list('matricule', flat=True) if m[len(prefix):].isascii() and m[len(prefix):].isdigit()]
    return f'{prefix}{max(numbers, default=0) + 1:04d}'


@transaction.atomic
def create_student(school, data) -> dict:
    return _insert_student(school, _student_fields(school, data))


@transaction.atomic
def create_students(school, rows) -> list:
    """Import en masse, tout ou rien : l'erreur indique la ligne concernée."""
    if not isinstance(rows, list) or not 0 < len(rows) <= MAX_BULK:
        raise ApiError(f'Entre 1 et {MAX_BULK} lignes par import.')
    seen, validated = set(), []
    for index, data in enumerate(rows, start=1):
        try:
            fields = _student_fields(school, data)
            if fields['matricule'] in seen:
                raise ApiError(f"Le matricule {fields['matricule']} apparaît deux fois.")
        except ApiError as error:
            raise ApiError(f'Ligne {index} : {error.message}') from None
        seen.add(fields['matricule'])
        validated.append(fields)
    created = [_insert_student(school, fields) for fields in validated]
    log_activity(school, 'eleves_importes', f"{plural(len(created), 'élève')} importé{'s' if len(created) > 1 else ''}")
    return created


@transaction.atomic
def update_student(school, student_id, data) -> dict:
    """Identité seulement : la classe ne change que par move_student (avec confirmation)."""
    profile = get_student(school, student_id)
    if str(data.get('classId') or '') != str(profile.classroom_id or ''):
        raise ApiError("Pour changer l'élève de classe, utilisez « Changer de classe ».")
    fields = _student_fields(school, {**data, 'classId': None}, ignore_id=profile.pk)
    for key in ('matricule', 'first_name', 'last_name', 'sexe', 'birth_date', 'parent_phone'):
        setattr(profile, key, fields[key])
    profile.save(update_fields=['matricule', 'first_name', 'last_name', 'sexe', 'birth_date', 'parent_phone'])
    profile.user.display_name = fields['first_name']
    profile.user.save(update_fields=['display_name'])
    return student_payload(get_student(school, profile.pk))


def _move_target(school, profile, class_id):
    target_id = parse_id(class_id) if class_id else None
    if class_id and target_id is None:
        raise ApiError('Classe introuvable.')
    if target_id == profile.classroom_id:
        raise ApiError("L'élève est déjà dans cette classe.")
    if target_id is None:
        return None
    target = get_classroom(school, target_id)
    if target.archived:
        raise ApiError("Impossible de déplacer un élève vers une classe archivée.")
    return target


def _open_assignments(classroom):
    return Assignment.objects.filter(classroom=classroom).filter(Q(due_date__isnull=True) | Q(due_date__gte=today()))


def preview_move(school, student_id, class_id) -> dict:
    profile = get_student(school, student_id)
    target = _move_target(school, profile, class_id)
    source = profile.classroom
    teacher_of = lambda c: teacher_payload(c.teacher) if c and c.teacher_id else None  # noqa: E731
    done = AssignmentCompletion.objects.filter(student=profile).values_list('assignment_id', flat=True)
    source_track = level_info(source.level).track if source else None
    target_track = level_info(target.level).track if target else None
    return {
        'student': student_payload(profile),
        'from': classroom_payload(source) if source else None,
        'to': classroom_payload(target) if target else None,
        'fromTeacher': teacher_of(source),
        'toTeacher': teacher_of(target),
        'levelChanged': bool(source and target and source.level != target.level),
        'trackChange': {'from': source_track, 'to': target_track} if source_track and target_track and source_track != target_track else None,
        'pendingLeft': _open_assignments(source).exclude(pk__in=done).count() if source else 0,
        'openReceived': _open_assignments(target).count() if target else 0,
    }


@transaction.atomic
def move_student(school, student_id, class_id, reason='') -> dict:
    """Compte, identifiant, matricule et progression conservés ; renvoie l'ancienne classe (annulation)."""
    profile = get_student(school, student_id)
    target = _move_target(school, profile, class_id)
    source = profile.classroom
    previous = profile.classroom_id
    profile.classroom = target
    profile.save(update_fields=['classroom'])
    sync_learner_track(profile)
    motif = f' (motif : {reason.strip()[:120]})' if isinstance(reason, str) and reason.strip() else ''
    label_from = class_name(source.level, source.section) if source else 'sans classe'
    label_to = class_name(target.level, target.section) if target else 'sans classe'
    log_activity(school, 'eleve_deplace', f'{profile.first_name} {profile.last_name} : {label_from} → {label_to}{motif}')
    return {'student': student_payload(get_student(school, profile.pk)), 'previousClassId': str(previous) if previous else None}


def set_student_status(school, student_id, status) -> dict:
    profile = get_student(school, student_id)
    profile.user.is_active = require_status(status) == 'actif'
    profile.user.save(update_fields=['is_active'])
    return student_payload(profile)


def reset_student_password(school, student_id) -> dict:
    profile = get_student(school, student_id)
    password = generate_temporary_password()
    profile.user.set_password(password)
    profile.user.save(update_fields=['password'])
    log_activity(school, 'mdp_reinitialise', f'Mot de passe réinitialisé pour {profile.first_name} {profile.last_name}')
    return {'login': profile.user.email, 'temporaryPassword': password}


@transaction.atomic
def issue_student_credentials(school, student_ids) -> list:
    """Les mots de passe ne sont jamais conservés en clair : imprimer une fiche = en générer un nouveau."""
    if not isinstance(student_ids, list) or not 0 < len(student_ids) <= MAX_BULK:
        raise ApiError('Sélectionnez au moins un élève.')
    issued = []
    for student_id in student_ids:
        profile = get_student(school, student_id)
        if not profile.user.is_active:
            raise ApiError(f'Le compte de {profile.first_name} {profile.last_name} est désactivé.')
        password = generate_temporary_password()
        profile.user.set_password(password)
        profile.user.save(update_fields=['password'])
        issued.append({**_student_row(profile), 'credentials': credentials_with_code(profile, password)})
    count = len(issued)
    log_activity(school, 'mdp_reinitialise', f"{plural(count, 'fiche')} de connexion générée{'s' if count > 1 else ''}")
    return issued


# ─── Parents ─────────────────────────────────────────────────────────────────

def list_parents(school) -> list:
    children = list(students_qs(school).filter(user__parent__isnull=False))
    parents = {p.pk: p for p in User.objects.filter(pk__in={c.user.parent_id for c in children}).select_related('parent_profile')}
    rows = [{'parent': parent_payload(parent),
             'children': [student_payload(c) for c in sort_students(c for c in children if c.user.parent_id == pk)]}
            for pk, parent in parents.items()]
    return sorted(rows, key=lambda r: (r['parent']['lastName'].lower(), r['parent']['firstName'].lower()))

def get_leaderboard(school, params) -> dict:
    """Classement des élèves de l'école, éventuellement limité à une classe (?classId=)."""
    classrooms = list(Classroom.objects.filter(school=school, archived=False))
    class_id = params.get('classId')
    classroom = get_classroom(school, class_id, active=True) if class_id else None
    return classement.build_leaderboard(school, params.get('period'), classrooms, classroom=classroom)
