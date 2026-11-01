"""
Espace d'une école vu par le super admin : CONSULTATION SEULEMENT.

Chaque école gère son propre fonctionnement (enseignants, classes, élèves,
parents) ; l'équipe kEur IA voit tout mais n'y intervient pas. Ce module ne
contient donc que des lectures, qui réutilisent les fonctions de l'espace
école (apps.scolaire.services.ecole) pour montrer exactement les mêmes données.
"""
from django.db.models import Q

from apps.accounts.models import User
from apps.scolaire.identifiers import normalize_text
from apps.scolaire.levels import class_name
from apps.scolaire.models import ParentProfile, SchoolActivity, StaffProfile, StudentProfile
from apps.scolaire.payloads import iso
from apps.scolaire.services import ecole

from .models import AuditLog
from .services import PAGE_SIZE, _get_school, _page, _school_row

SEARCH_LIMIT = 20


def overview(school_id) -> dict:
    school = _get_school(school_id)
    linked = StudentProfile.objects.filter(school=school, user__is_active=True, user__parent__isnull=False).count()
    return {'school': _school_row(school), 'dashboard': ecole.get_dashboard(school), 'linkedStudents': linked}


def teachers(school_id) -> list:
    return ecole.list_teachers(_get_school(school_id))


def classes(school_id) -> list:
    return ecole.list_classrooms(_get_school(school_id), include_archived=True)


def classroom(school_id, class_id) -> dict:
    return ecole.get_classroom_detail(_get_school(school_id), class_id)


def students(school_id, params) -> list:
    return ecole.list_students(_get_school(school_id), params)


def student(school_id, student_id) -> dict:
    return ecole.get_student_detail(_get_school(school_id), student_id)


def parents(school_id) -> list:
    return ecole.list_parents(_get_school(school_id))


def activity(school_id, params) -> dict:
    """Journal de l'école (ce qu'elle fait) et actions de l'équipe kEur IA la concernant, mêlés par date."""
    school = _get_school(school_id)
    events = [{'id': f'e{a.id}', 'source': 'ecole', 'label': a.label, 'actor': None, 'at': a.at}
              for a in SchoolActivity.objects.filter(school=school)]
    events += [{'id': f'k{a.id}', 'source': 'keuria', 'label': a.label, 'actor': a.actor_email, 'at': a.at}
               for a in AuditLog.objects.filter(school=school)]
    events.sort(key=lambda e: e['at'], reverse=True)
    page = _page(params.get('page'))
    rows = events[(page - 1) * PAGE_SIZE: page * PAGE_SIZE]
    return {'results': [{**e, 'at': iso(e['at'])} for e in rows], 'total': len(events), 'page': page, 'pageSize': PAGE_SIZE}


# ─── Recherche générale ──────────────────────────────────────────────────────

def _hit(kind, label, sub, school=None, target=None) -> dict:
    return {'kind': kind, 'label': label, 'sub': sub,
            'schoolId': str(school.id) if school else None, 'schoolName': school.name if school else None,
            'target': target}


def search(params) -> dict:
    """
    Recherche dans toute la plateforme ; chaque résultat indique son école
    (ou « hors école ») pour ne jamais mélanger les personnes de deux écoles.
    """
    raw = str(params.get('query', '')).strip()
    if len(raw) < 2:
        return {'query': raw, 'results': []}
    q = normalize_text(raw)
    hits = []

    from apps.schools.models import School
    for school in School.objects.order_by('name'):
        if q in normalize_text(f'{school.name} {school.city} {school.slug}'):
            hits.append(_hit('ecole', school.name, school.city, school, {'tab': ''}))

    for p in (StudentProfile.objects.select_related('user', 'school', 'classroom')
              .filter(Q(first_name__icontains=raw) | Q(last_name__icontains=raw) | Q(matricule__icontains=raw)
                      | Q(user__email__icontains=raw))[:SEARCH_LIMIT]):
        room = class_name(p.classroom.level, p.classroom.section) if p.classroom else 'sans classe'
        hits.append(_hit('eleve', f'{p.first_name} {p.last_name}', f'Élève · {room}', p.school,
                         {'tab': 'eleves', 'id': str(p.id)}))

    for p in (StaffProfile.objects.select_related('user', 'school')
              .filter(Q(first_name__icontains=raw) | Q(last_name__icontains=raw) | Q(user__email__icontains=raw))[:SEARCH_LIMIT]):
        is_direction = p.user.role == User.ROLE_SCHOOL_ADMIN
        hits.append(_hit('direction' if is_direction else 'enseignant', f'{p.first_name} {p.last_name}',
                         'Direction' if is_direction else 'Enseignant', p.school,
                         {'tab': 'direction' if is_direction else 'enseignants'}))

    for p in (ParentProfile.objects.select_related('user')
              .filter(Q(first_name__icontains=raw) | Q(last_name__icontains=raw) | Q(user__email__icontains=raw))[:SEARCH_LIMIT]):
        child = StudentProfile.objects.select_related('school').filter(user__parent=p.user).first()
        hits.append(_hit('parent', f'{p.first_name} {p.last_name}',
                         f'Parent de {child.first_name}' if child else 'Parent', child.school if child else None,
                         {'tab': 'parents'} if child else {'account': str(p.user.id)}))

    seen = {h['label'] for h in hits}
    for u in (User.objects.filter(school__isnull=True).filter(Q(display_name__icontains=raw) | Q(email__icontains=raw))
              .exclude(role=User.ROLE_SCHOOL_ADMIN)[:SEARCH_LIMIT]):
        if u.display_name in seen:
            continue
        hits.append(_hit('compte', u.display_name or u.email, f'Hors école · {u.get_role_display()}', None,
                         {'account': str(u.id)}))

    return {'query': raw, 'results': hits[:50]}
