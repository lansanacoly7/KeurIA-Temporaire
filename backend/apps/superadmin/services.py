"""
Espace super admin (équipe kEur IA) : plateforme, écoles, comptes, missions, journal.

Règles :
  - une école n'est jamais supprimée : elle est suspendue (comptes bloqués, données gardées) ;
  - les comptes d'une école (direction, enseignants, élèves) sont gérés par l'école :
    le super admin peut les désactiver, pas les supprimer ni changer leur rôle ;
  - une mission déjà donnée en devoir n'est jamais supprimée : elle est retirée de la bibliothèque ;
  - chaque action est inscrite au journal (AuditLog).
"""
import re
from datetime import timedelta

from django.db import IntegrityError, transaction
from django.db.models import Count, ProtectedError, Q
from django.utils import timezone
from rest_framework import status

from apps.accounts.models import User
from apps.accounts.serializers import check_password_policy
from apps.schools.models import School
from apps.scolaire.errors import ApiError, NotFound, required
from apps.scolaire.identifiers import (
    generate_temporary_password,
    is_reserved_login_email,
    slugify_name,
)
from apps.scolaire.models import (
    Assignment,
    Classroom,
    Mission,
    SchoolActivity,
    StaffProfile,
    StudentProfile,
)
from apps.scolaire.payloads import account_status, current_year, iso, mission_payload
from apps.scolaire.services.common import parse_id
from apps.scolaire.services.programme import sync_programme_missions
from apps.scolaire.themes import THEMES, is_theme

from .models import AuditLog

EMAIL_RE = re.compile(r'^[^\s@]+@[^\s@]+\.[^\s@]+$')
SLUG_RE = re.compile(r'^[a-z0-9]+(?:-[a-z0-9]+)*$')
PAGE_SIZE = 25
# Comptes « hors école » que le super admin peut créer et dont il peut changer le rôle.
FREE_ROLES = (User.ROLE_ADMIN, User.ROLE_PARENT, User.ROLE_TEACHER)
MISSION_CATEGORIES = ('Sécurité', 'IA Générative', 'Données', 'Programmation')
MISSION_DIFFICULTIES = ('Débutant', 'Intermédiaire', 'Avancé')


def audit(actor, action: str, label: str, school=None):
    AuditLog.objects.create(actor=actor, actor_email=actor.email, action=action, label=label[:255], school=school)


def _page(value) -> int:
    page = parse_id(value) or 1
    return max(1, page)


# ─── Tableau de bord et apprenants ───────────────────────────────────────────

def stats_history() -> list:
    from apps.accounts.models import AccountStatsSnapshot

    return [{
        'month': row.month.isoformat(),
        'familyParents': row.family_parents, 'familyChildren': row.family_children,
        'schoolStudents': row.school_students, 'teachers': row.teachers, 'schoolAdmins': row.school_admins,
        'active30Days': row.active_30_days, 'totalXp': row.total_xp,
        'warned': row.warned, 'deactivated': row.deactivated, 'deleted': row.deleted,
    } for row in AccountStatsSnapshot.objects.all()]


def dashboard() -> dict:
    now = timezone.now()
    users = User.objects.all()
    schools = School.objects.all()
    active_schools = schools.filter(suspended_at__isnull=True)
    roles = {key: 0 for key, _ in User.ROLE_CHOICES}
    for row in users.values('role').annotate(n=Count('id')):
        roles[row['role']] = row['n']

    to_handle = []
    waiting_parents = User.objects.filter(role=User.ROLE_PARENT, school__isnull=True, approval_status=User.APPROVAL_PENDING,
                                          email_verified=True).count()
    if waiting_parents:
        to_handle.append({'key': 'inscriptions-parents',
                          'text': f"{waiting_parents} demande{'s' if waiting_parents > 1 else ''} d'inscription de parent attend{'ent' if waiting_parents > 1 else ''} votre réponse.",
                          'href': '/admin/inscriptions', 'cta': 'Traiter'})
    for school in active_schools.annotate(
            admins=Count('members', filter=Q(members__role=User.ROLE_SCHOOL_ADMIN, members__is_active=True)),
            admins_seen=Count('members', filter=Q(members__role=User.ROLE_SCHOOL_ADMIN, members__last_seen_at__isnull=False)),
            pupils=Count('students')):
        if school.admins == 0:
            to_handle.append({'key': f'sans-direction-{school.pk}', 'text': f'{school.name} n\'a aucune direction active.',
                              'href': f'/admin/ecoles/{school.pk}', 'cta': 'Ajouter'})
        elif school.admins_seen == 0:
            to_handle.append({'key': f'jamais-{school.pk}', 'text': f'La direction de {school.name} ne s\'est jamais connectée.',
                              'href': f'/admin/ecoles/{school.pk}', 'cta': 'Voir'})
        elif school.pupils == 0:
            to_handle.append({'key': f'vide-{school.pk}', 'text': f'{school.name} n\'a encore inscrit aucun élève.',
                              'href': f'/admin/ecoles/{school.pk}', 'cta': 'Voir'})

    activity = SchoolActivity.objects.select_related('school').order_by('-at')[:8]
    connections = users.filter(last_seen_at__isnull=False).select_related('school').order_by('-last_seen_at')[:6]

    # Progression réelle des enfants dans les parcours IA & Code
    from apps.progress.models import Progress, lesson_progress
    track_meta = {
        '7-9': {'label': '7–9 ans', 'name': 'Petits Explorateurs', 'tagline': 'Histoires, images & éveil à l’IA', 'tone': '#0d846e', 'fill': '#e8f6f1'},
        '10-12': {'label': '10–12 ans', 'name': 'Jeunes Aventuriers', 'tagline': 'Logique, défis & fonctionnement de l’IA', 'tone': '#185fa5', 'fill': '#e6f1fb'},
        '13-15': {'label': '13–15 ans', 'name': 'Jeunes Créateurs', 'tagline': 'Programmation, projets & esprit critique', 'tone': '#534ab7', 'fill': '#eeedfe'},
    }
    progress_counts = {r['age_track']: r['n'] for r in lesson_progress(Progress.objects).values('age_track').annotate(n=Count('id'))}
    total_completed = sum(progress_counts.values()) or 1

    tracks_progress = []
    for key, meta in track_meta.items():
        done = progress_counts.get(key, 0)
        tracks_progress.append({
            'key': key,
            'label': meta['label'],
            'name': meta['name'],
            'tagline': meta['tagline'],
            'tone': meta['tone'],
            'fill': meta['fill'],
            'completed': done,
            'share': round((done / total_completed) * 100),
        })

    # Réussites récentes des élèves
    recent_progress = lesson_progress(Progress.objects.select_related('user', 'user__school')).order_by('-completed_at')[:6]
    achievements = []
    for p in recent_progress:
        achievements.append({
            'id': str(p.id),
            'studentName': p.user.display_name if p.user else 'Jeune explorateur',
            'school': p.user.school.name if (p.user and p.user.school) else None,
            'lessonId': p.lesson_id,
            'ageTrack': p.age_track,
            'xp': p.xp,
            'completedAt': iso(p.completed_at),
        })

    # Palmarès des écoles partenaires les plus actives (cette semaine et au total)
    week_ago = now - timedelta(days=7)
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

    schools_leaderboard = []
    for s in active_schools:
        w_count = weekly_by_school.get(s.id, 0)
        t_count = total_by_school.get(s.id, 0)
        s_count = students_by_school.get(s.id, 0)
        schools_leaderboard.append({
            'id': str(s.id),
            'name': s.name,
            'city': s.city or 'Sénégal',
            'weeklyLessons': w_count,
            'totalLessons': t_count,
            'studentsCount': s_count,
        })

    schools_leaderboard.sort(key=lambda x: (-x['weeklyLessons'], -x['totalLessons'], x['name']))
    for idx, entry in enumerate(schools_leaderboard, 1):
        entry['rank'] = idx

    return {
        'kpis': {
            'schools': active_schools.count(),
            'suspendedSchools': schools.count() - active_schools.count(),
            'students': users.filter(role=User.ROLE_STUDENT, is_active=True).count(),
            'teachers': users.filter(role=User.ROLE_TEACHER, is_active=True).count(),
            'parents': users.filter(role=User.ROLE_PARENT, is_active=True).count(),
            'connectedToday': users.filter(last_seen_at__date=timezone.localdate()).count(),
            'activeWeek': users.filter(last_seen_at__gte=now - timedelta(days=7)).count(),
            'totalLessonsCompleted': sum(progress_counts.values()),
        },
        'roles': roles,
        'toHandle': to_handle,
        'tracksProgress': tracks_progress,
        'schoolsLeaderboard': schools_leaderboard[:6],
        'recentAchievements': achievements,
        'recentActivity': [{'id': str(a.id), 'school': a.school.name, 'label': a.label, 'at': iso(a.at)} for a in activity],
        'recentConnections': [{'id': str(u.id), 'displayName': u.display_name, 'email': u.email, 'role': u.role,
                               'school': u.school.name if u.school_id else None, 'lastSeenAt': iso(u.last_seen_at)}
                              for u in connections],
        'audit': [audit_payload(entry) for entry in AuditLog.objects.all()[:5]],
    }


def learners() -> dict:
    """Progression de tous les élèves (repris de l'ancien tableau de bord /admin)."""
    from apps.progress.services import build_admin_dashboard

    learner_rows, analytics = build_admin_dashboard(User.objects.all().order_by('-created_at'))
    schools = dict(StudentProfile.objects.select_related('school').values_list('user_id', 'school__name'))
    for row in learner_rows:
        row['school'] = schools.get(row['id'])
    return {'learners': learner_rows, 'analytics': analytics}


# ─── Écoles ──────────────────────────────────────────────────────────────────

def _admin_payload(user) -> dict:
    staff = getattr(user, 'staff_profile', None)
    return {'id': str(user.id), 'firstName': staff.first_name if staff else user.display_name, 'lastName': staff.last_name if staff else '',
            'email': user.email, 'title': staff.title if staff else '', 'status': account_status(user),
            'lastLoginAt': iso(user.last_seen_at)}


def _school_row(school) -> dict:
    admins = User.objects.filter(school=school, role=User.ROLE_SCHOOL_ADMIN).select_related('staff_profile').order_by('id')
    return {
        'id': str(school.id), 'name': school.name, 'slug': school.slug, 'city': school.city,
        'primaryColor': school.primary_color, 'accentColor': school.accent_color,
        'suspended': school.is_suspended, 'suspendedAt': iso(school.suspended_at), 'createdAt': iso(school.created_at),
        'academicYear': current_year(school).label,
        'classes': Classroom.objects.filter(school=school, archived=False).count(),
        'students': StudentProfile.objects.filter(school=school, user__is_active=True).count(),
        'teachers': User.objects.filter(school=school, role=User.ROLE_TEACHER, is_active=True).count(),
        'admins': [_admin_payload(a) for a in admins],
        # Indicateurs de santé (cartes d'écoles).
        'activeStudentsWeek': StudentProfile.objects.filter(
            school=school, user__is_active=True, user__last_seen_at__gte=timezone.now() - timedelta(days=7)).count(),
        'classesWithoutTeacher': Classroom.objects.filter(school=school, archived=False, teacher__isnull=True).count(),
        'directionLastSeen': iso(max((a.last_seen_at for a in admins if a.last_seen_at), default=None)),
    }


def _get_school(school_id) -> School:
    pk = parse_id(school_id)
    school = School.objects.filter(pk=pk).first() if pk else None
    if school is None:
        raise NotFound('École introuvable.')
    return school


def list_schools(params) -> list:
    query = str(params.get('query', '')).strip().lower()
    rows = [_school_row(s) for s in School.objects.order_by('name')]
    return [r for r in rows if not query or query in f"{r['name']} {r['city']} {r['slug']}".lower()]


def get_school(school_id) -> dict:
    school = _get_school(school_id)
    activity = SchoolActivity.objects.filter(school=school).order_by('-at')[:10]
    return {**_school_row(school),
            'recentActivity': [{'id': str(a.id), 'label': a.label, 'at': iso(a.at)} for a in activity]}


def _theme(data) -> tuple[str, str]:
    primary = str(data.get('primaryColor', '')).lower()
    accent = str(data.get('accentColor', '')).lower()
    if not primary or not accent:
        # Thème par défaut officiel de kEur IA (Baobab)
        return THEMES[0][2], THEMES[0][3]
    if not is_theme(primary, accent):
        raise ApiError("Choisissez l'un des thèmes proposés.")
    return primary, accent


def _free_slug(name: str, wanted: str | None) -> str:
    if wanted:
        slug = wanted.strip().lower()
        if not SLUG_RE.match(slug) or not 3 <= len(slug) <= 60:
            raise ApiError("Adresse invalide : lettres minuscules, chiffres et tirets (3 à 60 caractères).")
        if School.objects.filter(slug=slug).exists():
            raise ApiError(f'L\'adresse /school/{slug} est déjà utilisée.')
        return slug
    base = slugify_name(name)[:55] or 'ecole'
    slug, n = base, 2
    while School.objects.filter(slug=slug).exists():
        slug, n = f'{base}-{n}', n + 1
    return slug


def _admin_fields(data) -> dict:
    first = required(data.get('firstName'), 'Le prénom de la direction')[:100]
    last = required(data.get('lastName'), 'Le nom de la direction')[:100]
    email = str(data.get('email', '')).strip().lower()
    if not EMAIL_RE.match(email):
        raise ApiError("L'adresse e-mail de la direction n'est pas valide.")
    if is_reserved_login_email(email):
        raise ApiError('Cette adresse est réservée aux identifiants élèves.')
    if User.objects.filter(email__iexact=email).exists():
        raise ApiError('Un compte utilise déjà cette adresse e-mail.')
    title = str(data.get('title', '')).strip()[:80] or 'Directeur·rice'
    return {'first_name': first, 'last_name': last, 'email': email, 'title': title}


def _create_admin(school, fields) -> dict:
    password = generate_temporary_password()
    try:
        user = User.objects.create_user(fields['email'], password, display_name=f"{fields['first_name']} {fields['last_name']}",
                                        role=User.ROLE_SCHOOL_ADMIN, school=school)
    except IntegrityError:
        raise ApiError('Un compte utilise déjà cette adresse e-mail.') from None
    StaffProfile.objects.create(user=user, school=school, first_name=fields['first_name'], last_name=fields['last_name'],
                                title=fields['title'])
    return {'admin': _admin_payload(user), 'credentials': {'login': user.email, 'temporaryPassword': password}}


@transaction.atomic
def create_school(actor, data) -> dict:
    """Crée l'école, son année en cours et le compte de sa direction, en une fois."""
    name = required(data.get('name'), "Le nom de l'école")[:200]
    city = required(data.get('city'), 'La ville')[:120]
    primary, accent = _theme(data)
    admin_data = data.get('admin') if isinstance(data.get('admin'), dict) else {}
    fields = _admin_fields(admin_data)
    school = School.objects.create(name=name, slug=_free_slug(name, data.get('slug') or None), city=city,
                                   primary_color=primary, secondary_color=accent, accent_color=accent,
                                   created_by_email=actor.email)
    current_year(school)
    created = _create_admin(school, fields)
    audit(actor, 'ecole_creee', f'École « {name} » créée, direction : {fields["first_name"]} {fields["last_name"]}', school=school)
    return {'school': _school_row(school), 'credentials': created['credentials']}


def update_school(actor, school_id, data) -> dict:
    """Nom, ville et thème ; l'adresse (slug) ne change jamais : elle sert aux identifiants élèves."""
    school = _get_school(school_id)
    school.name = required(data.get('name'), "Le nom de l'école")[:200]
    school.city = required(data.get('city'), 'La ville')[:120]
    school.primary_color, school.accent_color = _theme(data)
    school.secondary_color = school.accent_color
    school.save(update_fields=['name', 'city', 'primary_color', 'secondary_color', 'accent_color'])
    audit(actor, 'ecole_modifiee', f'École « {school.name} » modifiée', school=school)
    return _school_row(school)


def suspend_school(actor, school_id, confirmation) -> dict:
    school = _get_school(school_id)
    if school.is_suspended:
        raise ApiError('Cette école est déjà suspendue.')
    if str(confirmation or '').strip() != school.name:
        raise ApiError(f'Pour confirmer, tapez exactement « {school.name} ».')
    school.suspended_at = timezone.now()
    school.save(update_fields=['suspended_at'])
    audit(actor, 'ecole_suspendue', f'École « {school.name} » suspendue', school=school)
    return _school_row(school)


def reactivate_school(actor, school_id) -> dict:
    school = _get_school(school_id)
    if not school.is_suspended:
        raise ApiError("Cette école n'est pas suspendue.")
    school.suspended_at = None
    school.save(update_fields=['suspended_at'])
    audit(actor, 'ecole_reactivee', f'École « {school.name} » réactivée', school=school)
    return _school_row(school)


@transaction.atomic
def add_school_admin(actor, school_id, data) -> dict:
    school = _get_school(school_id)
    created = _create_admin(school, _admin_fields(data))
    admin = created['admin']
    audit(actor, 'direction_ajoutee', f"{admin['firstName']} {admin['lastName']} ajouté(e) à la direction de « {school.name} »", school=school)
    return created


def _school_admin(school, admin_id) -> User:
    pk = parse_id(admin_id)
    user = (User.objects.filter(pk=pk, school=school, role=User.ROLE_SCHOOL_ADMIN).select_related('staff_profile').first()
            if pk else None)
    if user is None:
        raise NotFound('Compte de direction introuvable.')
    return user


def reset_school_admin_password(actor, school_id, admin_id) -> dict:
    school = _get_school(school_id)
    user = _school_admin(school, admin_id)
    password = generate_temporary_password()
    user.set_password(password)
    user.save(update_fields=['password'])
    audit(actor, 'mdp_direction', f'Nouveau mot de passe pour {user.email} (« {school.name} »)', school=school)
    return {'login': user.email, 'temporaryPassword': password}


def set_school_admin_status(actor, school_id, admin_id, value) -> dict:
    school = _get_school(school_id)
    user = _school_admin(school, admin_id)
    if value not in ('actif', 'desactive'):
        raise ApiError('Statut invalide.')
    active = value == 'actif'
    others = User.objects.filter(school=school, role=User.ROLE_SCHOOL_ADMIN, is_active=True).exclude(pk=user.pk)
    if not active and not others.exists():
        raise ApiError("C'est la seule direction active de l'école : ajoutez d'abord une autre direction.")
    user.is_active = active
    user.save(update_fields=['is_active'])
    audit(actor, 'direction_' + ('reactivee' if active else 'desactivee'), f"Direction {user.email} {'réactivée' if active else 'désactivée'} (« {school.name} »)", school=school)
    return _admin_payload(user)


# ─── Comptes ─────────────────────────────────────────────────────────────────

def _account_payload(user, actor) -> dict:
    return {
        'id': str(user.id), 'email': user.email, 'displayName': user.display_name, 'role': user.role,
        'schoolId': str(user.school_id) if user.school_id else None, 'schoolName': user.school.name if user.school_id else None,
        'status': account_status(user), 'lastSeenAt': iso(user.last_seen_at), 'createdAt': iso(user.created_at),
        'isSelf': user.pk == actor.pk,
        # Direction, enseignants et élèves d'une école : gérés par leur école.
        'managedBySchool': user.school_id is not None,
    }


def list_accounts(actor, params) -> dict:
    users = User.objects.select_related('school').order_by('-created_at')
    role = params.get('role')
    if role in dict(User.ROLE_CHOICES):
        users = users.filter(role=role)
    school = params.get('schoolId')
    if school == 'none':
        users = users.filter(school__isnull=True)
    elif school:
        users = users.filter(school_id=parse_id(school))
    status_filter = params.get('status')
    if status_filter == 'desactive':
        users = users.filter(is_active=False)
    elif status_filter == 'actif':
        users = users.filter(is_active=True, last_seen_at__isnull=False)
    elif status_filter == 'jamais_connecte':
        users = users.filter(is_active=True, last_seen_at__isnull=True)
    query = str(params.get('query', '')).strip()
    if query:
        users = users.filter(Q(email__icontains=query) | Q(display_name__icontains=query))
    total = users.count()
    page = _page(params.get('page'))
    rows = users[(page - 1) * PAGE_SIZE: page * PAGE_SIZE]
    return {'results': [_account_payload(u, actor) for u in rows], 'total': total, 'page': page, 'pageSize': PAGE_SIZE}


# ─── Demandes d'inscription des parents ──────────────────────────────────────

def _registration_payload(user) -> dict:
    profile = getattr(user, 'parent_profile', None)
    child = user.children.filter(role=User.ROLE_STUDENT).order_by('id').first()
    decided_by = user.approval_decided_by
    return {
        'id': str(user.id), 'email': user.email, 'displayName': user.display_name,
        'firstName': profile.first_name if profile else '', 'lastName': profile.last_name if profile else '',
        'phone': profile.phone if profile else '', 'parentRole': profile.parent_role if profile else '',
        'emailVerified': user.email_verified, 'status': user.approval_status,
        'requestedAt': iso(user.created_at), 'decidedAt': iso(user.approval_decided_at),
        'decidedBy': decided_by.display_name if decided_by else None, 'note': user.approval_note,
        'child': {'name': child.display_name, 'ageGroup': child.age_group} if child else None,
    }


def list_registrations(params) -> dict:
    """Demandes d'inscription de parents : en attente, puis décidées (acceptées ou refusées par l'équipe).

    Les parents créés avant la mise en place de la validation, ou par l'équipe ou une école, n'y figurent pas.
    """
    base = User.objects.filter(role=User.ROLE_PARENT, school__isnull=True).filter(
        Q(approval_status=User.APPROVAL_PENDING) | Q(approval_decided_at__isnull=False))
    counts = {key: base.filter(approval_status=key).count()
              for key in (User.APPROVAL_PENDING, User.APPROVAL_APPROVED, User.APPROVAL_REJECTED)}
    wanted = params.get('status') or User.APPROVAL_PENDING
    if wanted not in counts:
        raise ApiError('Statut invalide.')
    rows = base.filter(approval_status=wanted).select_related('parent_profile', 'approval_decided_by')
    query = str(params.get('query', '')).strip()
    if query:
        rows = rows.filter(Q(email__icontains=query) | Q(display_name__icontains=query))
    # À traiter : les plus anciennes d'abord. Déjà traitées : les plus récentes d'abord.
    rows = rows.order_by('created_at' if wanted == User.APPROVAL_PENDING else '-approval_decided_at')
    total = rows.count()
    page = _page(params.get('page'))
    page_rows = rows[(page - 1) * PAGE_SIZE: page * PAGE_SIZE]
    return {'results': [_registration_payload(u) for u in page_rows], 'total': total, 'page': page,
            'pageSize': PAGE_SIZE, 'counts': counts}


def decide_registration(actor, user_id, decision: str, note=None) -> dict:
    """Accepte ou refuse la demande d'un parent, l'inscrit au journal et le prévient par e-mail.

    Une demande refusée peut être acceptée plus tard (seconde chance) ; un parent déjà accepté ne se « refuse » pas ici :
    on désactive son compte depuis la page Comptes.
    """
    from apps.accounts import approval

    pk = parse_id(user_id)
    with transaction.atomic():
        user = (User.objects.select_for_update().filter(pk=pk, role=User.ROLE_PARENT, school__isnull=True).first()
                if pk else None)
        if user is None or (user.approval_status == User.APPROVAL_APPROVED and user.approval_decided_at is None):
            raise NotFound("Cette demande d'inscription est introuvable.")
        approving = decision == 'approve'
        if approving and user.approval_status == User.APPROVAL_APPROVED:
            raise ApiError('Cette demande est déjà acceptée.')
        if not approving and user.approval_status != User.APPROVAL_PENDING:
            raise ApiError("Seule une demande en attente peut être refusée.")
        reason = '' if approving else str(note or '').strip()[:300]
        user.approval_status = User.APPROVAL_APPROVED if approving else User.APPROVAL_REJECTED
        user.approval_decided_at = timezone.now()
        user.approval_decided_by = actor
        user.approval_note = reason
        user.save(update_fields=['approval_status', 'approval_decided_at', 'approval_decided_by', 'approval_note'])
        audit(actor, 'inscription_parent_' + ('acceptee' if approving else 'refusee'),
              f"Inscription du parent {user.email} {'acceptée' if approving else 'refusée'}")
    emailed = approval.send_decision_email(user, approving, reason)
    return {**_registration_payload(user), 'emailSent': emailed}


def _get_account(account_id) -> User:
    pk = parse_id(account_id)
    user = User.objects.select_related('school').filter(pk=pk).first() if pk else None
    if user is None:
        raise NotFound('Compte introuvable.')
    return user


def create_account(actor, data) -> dict:
    """Comptes hors école : équipe kEur IA (admin), parents, enseignants indépendants."""
    role = data.get('role')
    if role not in FREE_ROLES:
        raise ApiError("Rôle invalide : l'équipe kEur IA crée des comptes admin, parent ou enseignant (hors école).")
    display_name = required(data.get('displayName'), 'Le nom')[:150]
    email = str(data.get('email', '')).strip().lower()
    if not EMAIL_RE.match(email):
        raise ApiError("L'adresse e-mail n'est pas valide.")
    if is_reserved_login_email(email):
        raise ApiError('Cette adresse est réservée aux identifiants élèves.')
    if User.objects.filter(email__iexact=email).exists():
        raise ApiError('Un compte utilise déjà cette adresse e-mail.')
    password = str(data.get('password') or '')
    generated = not password
    if generated:
        password = generate_temporary_password()
    else:
        errors = check_password_policy(password)
        if errors:
            raise ApiError(errors[0])
    user = User.objects.create_user(email, password, display_name=display_name, role=role)
    audit(actor, 'compte_cree', f'Compte {role} créé : {email}')
    return {'account': _account_payload(user, actor),
            'credentials': {'login': email, 'temporaryPassword': password} if generated else None}


def update_account(actor, account_id, data) -> dict:
    user = _get_account(account_id)
    # Chaque école gère ses comptes ; la direction a ses propres actions (fiche de l'école).
    if user.school_id:
        raise ApiError("Ce compte appartient à une école : c'est l'école qui le gère (la direction se gère depuis la fiche de l'école).", status.HTTP_403_FORBIDDEN)
    if 'displayName' in data:
        user.display_name = required(data.get('displayName'), 'Le nom')[:150]
    if 'role' in data and data['role'] != user.role:
        if user.school_id:
            raise ApiError('Ce compte appartient à une école : son rôle est géré par l\'école.')
        if data['role'] not in FREE_ROLES:
            raise ApiError('Rôle invalide.')
        if user.pk == actor.pk:
            raise ApiError('Vous ne pouvez pas retirer votre propre rôle administrateur.')
        user.role = data['role']
        if user.role != User.ROLE_ADMIN and not user.is_superuser:
            user.is_staff = False
    user.save()
    audit(actor, 'compte_modifie', f'Compte {user.email} modifié')
    return _account_payload(user, actor)


def set_account_status(actor, account_id, value) -> dict:
    user = _get_account(account_id)
    if user.school_id:
        raise ApiError("Ce compte appartient à une école : c'est l'école qui le gère (la direction se gère depuis la fiche de l'école).", status.HTTP_403_FORBIDDEN)
    if value not in ('actif', 'desactive'):
        raise ApiError('Statut invalide.')
    if user.pk == actor.pk:
        raise ApiError('Vous ne pouvez pas désactiver votre propre compte.')
    user.is_active = value == 'actif'
    user.save(update_fields=['is_active'])
    audit(actor, 'compte_' + ('reactive' if user.is_active else 'desactive'), f"Compte {user.email} {'réactivé' if user.is_active else 'désactivé'}")
    return _account_payload(user, actor)


def delete_account(actor, account_id) -> None:
    user = _get_account(account_id)
    if user.pk == actor.pk:
        raise ApiError('Vous ne pouvez pas supprimer votre propre compte.')
    if user.school_id:
        raise ApiError("Ce compte appartient à une école : c'est l'école qui le gère (vous pouvez le désactiver).")
    email = user.email
    try:
        user.delete()
    except ProtectedError:
        raise ApiError('Ce parent est relié à des enfants : retirez d\'abord ces liens.', status.HTTP_409_CONFLICT) from None
    audit(actor, 'compte_supprime', f'Compte {email} supprimé')


# ─── Missions ────────────────────────────────────────────────────────────────

def list_missions() -> list:
    counts = dict(Assignment.objects.values('mission_id').annotate(n=Count('id')).values_list('mission_id', 'n'))
    sync_programme_missions()
    missions = sorted(Mission.objects.all(), key=lambda m: (not m.active, m.kind != Mission.KIND_LIBRE,
                                                           int(m.id[1:]) if m.kind == Mission.KIND_LIBRE and m.id[1:].isdigit() else 0, m.id))
    return [{**mission_payload(m), 'active': m.active, 'assignments': counts.get(m.id, 0)} for m in missions]


def _mission_fields(data) -> dict:
    category, difficulty = data.get('category'), data.get('difficulty')
    if category not in MISSION_CATEGORIES:
        raise ApiError('Catégorie invalide.')
    if difficulty not in MISSION_DIFFICULTIES:
        raise ApiError('Difficulté invalide.')
    minutes, xp = data.get('durationMinutes'), data.get('xp')
    if not isinstance(minutes, int) or not 1 <= minutes <= 240:
        raise ApiError('La durée doit être comprise entre 1 et 240 minutes.')
    if not isinstance(xp, int) or not 0 <= xp <= 1000:
        raise ApiError("L'XP doit être comprise entre 0 et 1000.")
    description = required(data.get('description'), 'La description')
    if len(description) > 600:
        raise ApiError('La description est trop longue (600 caractères maximum).')
    return {'title': required(data.get('title'), 'Le titre')[:150], 'description': description, 'category': category,
            'difficulty': difficulty, 'duration_minutes': minutes, 'xp': xp}


@transaction.atomic
def create_mission(actor, data) -> dict:
    fields = _mission_fields(data)
    numbers = [int(pk[1:]) for pk in Mission.objects.values_list('id', flat=True) if pk.startswith('m') and pk[1:].isdigit()]
    mission = Mission.objects.create(id=f'm{max(numbers, default=0) + 1}', **fields)
    audit(actor, 'mission_creee', f'Mission « {mission.title} » créée')
    return {**mission_payload(mission), 'active': True, 'assignments': 0}


def _get_mission(mission_id) -> Mission:
    mission = Mission.objects.filter(pk=str(mission_id)).first()
    if mission is None:
        raise NotFound('Mission introuvable.')
    return mission


def update_mission(actor, mission_id, data) -> dict:
    mission = _get_mission(mission_id)
    if mission.kind != Mission.KIND_LIBRE:
        raise ApiError('Ce devoir suit le programme : corrigez la leçon dans le Studio de contenu, le devoir se mettra à jour.')
    for key, value in _mission_fields(data).items():
        setattr(mission, key, value)
    mission.save()
    audit(actor, 'mission_modifiee', f'Mission « {mission.title} » modifiée')
    return {**mission_payload(mission), 'active': mission.active, 'assignments': mission.assignments.count()}


def set_mission_active(actor, mission_id, active) -> dict:
    """Retirer une mission : elle disparaît de la bibliothèque ; les devoirs déjà donnés restent."""
    mission = _get_mission(mission_id)
    if not isinstance(active, bool):
        raise ApiError('Valeur invalide.')
    mission.active = active
    mission.save(update_fields=['active'])
    audit(actor, 'mission_' + ('remise' if active else 'retiree'), f"Mission « {mission.title} » {'remise dans' if active else 'retirée de'} la bibliothèque")
    return {**mission_payload(mission), 'active': mission.active, 'assignments': mission.assignments.count()}


# ─── Journal ─────────────────────────────────────────────────────────────────

def audit_payload(entry) -> dict:
    return {'id': str(entry.id), 'actor': entry.actor_email, 'action': entry.action, 'label': entry.label, 'at': iso(entry.at)}


def list_audit(params) -> dict:
    entries = AuditLog.objects.all()
    total = entries.count()
    page = _page(params.get('page'))
    return {'results': [audit_payload(e) for e in entries[(page - 1) * PAGE_SIZE: page * PAGE_SIZE]],
            'total': total, 'page': page, 'pageSize': PAGE_SIZE}
