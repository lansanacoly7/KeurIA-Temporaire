"""
Liaison parent ↔ élève par code (miroir de frontend/app/_scolaire/lib/parentLinks.ts).

Usage unique, valable LINK_CODE_VALID_DAYS jours, un seul code actif par élève.
Côté parent, la saisie est limitée en débit (throttle) et le message est le même
pour un code inconnu, expiré ou déjà utilisé.
"""
import secrets
from datetime import timedelta

from django.db import transaction
from django.utils import timezone

from apps.accounts.models import User

from ..errors import ApiError
from ..levels import class_name
from ..models import ParentLinkCode, ParentProfile, StudentProfile
from ..payloads import iso, parent_payload
from .common import log_activity

LINK_CODE_VALID_DAYS = 30
# Sans caractères ambigus à l'écrit (0/O, 1/I/L).
ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
CODE_LENGTH = 6
INVALID_CODE = "Code invalide ou expiré. Vérifiez-le ou demandez-en un nouveau à l'école."


def normalize_code(raw) -> str:
    return ''.join(ch for ch in str(raw).upper() if ch.isalnum())


def format_code(code: str) -> str:
    return f'{code[:3]}-{code[3:]}'


def active_code(student: StudentProfile):
    now = timezone.now()
    return (ParentLinkCode.objects.filter(student=student, used_at__isnull=True, revoked_at__isnull=True, expires_at__gt=now)
            .order_by('-created_at').first())


def issue_link_code(student: StudentProfile):
    """Nouveau code (l'ancien est révoqué) ; None si un parent est relié ou le compte désactivé."""
    if student.user.parent_id or not student.user.is_active:
        return None
    now = timezone.now()
    ParentLinkCode.objects.filter(student=student, used_at__isnull=True, revoked_at__isnull=True).update(revoked_at=now)
    code = ''.join(secrets.choice(ALPHABET) for _ in range(CODE_LENGTH))
    while ParentLinkCode.objects.filter(code=code, used_at__isnull=True, revoked_at__isnull=True, expires_at__gt=now).exists():
        code = ''.join(secrets.choice(ALPHABET) for _ in range(CODE_LENGTH))
    return ParentLinkCode.objects.create(student=student, code=code, expires_at=now + timedelta(days=LINK_CODE_VALID_DAYS))


def credentials_with_code(student: StudentProfile, temporary_password: str) -> dict:
    """Identifiants d'une fiche élève, avec un nouveau code parent si aucun parent n'est relié."""
    data = {
        'login': student.user.email,
        'temporaryPassword': temporary_password,
        'parentPhone': student.parent_phone or '',
    }
    link = issue_link_code(student)
    if link:
        data.update(parentCode=format_code(link.code), parentCodeExpiresAt=iso(link.expires_at))
    return data


def link_info(student: StudentProfile) -> dict:
    user = student.user
    parent = User.objects.select_related('parent_profile').filter(pk=user.parent_id).first() if user.parent_id else None
    code = None if parent else active_code(student)
    return {
        'studentName': f'{student.first_name} {student.last_name}',
        'studentDisabled': not user.is_active,
        'parent': parent_payload(parent) if parent else None,
        'parentPhone': student.parent_phone or '',
        'linkedAt': iso(student.parent_linked_at) if parent else None,
        'code': {'code': format_code(code.code), 'expiresAt': iso(code.expires_at)} if code else None,
    }


def generate_code(student: StudentProfile) -> dict:
    if student.user.parent_id:
        raise ApiError("Un parent est déjà relié à cet élève : retirez d'abord le lien.")
    if not student.user.is_active:
        raise ApiError("Le compte de l'élève est désactivé.")
    issue_link_code(student)
    return link_info(student)


def unlink(student: StudentProfile) -> dict:
    user = student.user
    parent = User.objects.filter(pk=user.parent_id).first() if user.parent_id else None
    if parent is None:
        raise ApiError("Aucun parent n'est relié à cet élève.")
    user.parent = None
    user.save(update_fields=['parent'])
    student.parent_linked_at = None
    student.save(update_fields=['parent_linked_at'])
    name = parent_payload(parent)
    log_activity(student.school, 'parent_retire',
                 f"Lien retiré entre {name['firstName']} {name['lastName']} et {student.first_name} {student.last_name}")
    return link_info(student)


def _parent_identity(parent: User, data: dict):
    """Prénom, nom, téléphone du parent : sa fiche (créée à l'inscription), sinon
    les valeurs envoyées, sinon son nom affiché (comptes créés avant la fiche)."""
    profile = getattr(parent, 'parent_profile', None)
    first_name = str(data.get('firstName', '')).strip()[:100] or (profile.first_name if profile else '')
    last_name = str(data.get('lastName', '')).strip()[:100] or (profile.last_name if profile else '')
    phone = str(data.get('phone', '')).strip()[:30] or (profile.phone if profile else '')
    if not first_name and not last_name:
        first_name, _, last_name = parent.display_name.strip().partition(' ')
    return first_name[:100], last_name[:100], phone


@transaction.atomic
def redeem(parent: User, data: dict) -> dict:
    """Le parent connecté saisit le code reçu de l'école (le code suffit)."""
    first_name, last_name, phone = _parent_identity(parent, data)

    code = normalize_code(data.get('code', ''))
    # of=('self',) : PostgreSQL refuse de verrouiller le côté nullable d'une jointure (la classe de l'élève peut manquer).
    link = (ParentLinkCode.objects.select_for_update(of=('self',)).select_related('student__user', 'student__classroom', 'student__school')
            .filter(code=code).order_by('-created_at').first()) if len(code) == CODE_LENGTH else None
    student = link.student if link else None
    if (link is None or not link.is_active() or student.user.parent_id or not student.user.is_active):
        raise ApiError(INVALID_CODE)
    if student.user_id == parent.id:
        raise ApiError(INVALID_CODE)

    ParentProfile.objects.update_or_create(user=parent, defaults={'first_name': first_name, 'last_name': last_name, 'phone': phone})
    now = timezone.now()
    link.used_at = now
    link.save(update_fields=['used_at'])
    student.user.parent = parent
    student.user.save(update_fields=['parent'])
    student.parent_linked_at = now
    student.save(update_fields=['parent_linked_at'])
    log_activity(student.school, 'parent_relie', f'{first_name} {last_name} s\'est relié·e à {student.first_name} {student.last_name}')
    classroom = student.classroom
    return {
        'studentName': f'{student.first_name} {student.last_name}',
        'classroom': class_name(classroom.level, classroom.section) if classroom else None,
        'parentName': f'{first_name} {last_name}',
    }
