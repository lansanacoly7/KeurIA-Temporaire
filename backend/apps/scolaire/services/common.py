"""Outils communs aux services : identifiants, recherche dans l'école, dates, journal d'activité."""
import re
from datetime import date

from django.utils import timezone

from apps.accounts.models import User
from apps.accounts.parsing import parse_id as parse_browser_id
from apps.learners.models import LearnerProfile

from ..errors import ApiError, NotFound
from ..levels import effective_track
from ..models import Classroom, SchoolActivity
from ..payloads import students_qs, teachers_qs

ISO_DATE = re.compile(r'^\d{4}-\d{2}-\d{2}$')


# Même lecture sûre que partout ailleurs (chiffres ASCII seulement, borne haute).
parse_id = parse_browser_id


def today() -> date:
    return timezone.localdate()


def parse_iso_date(value):
    """« AAAA-MM-JJ » → date, ou None si absent ou impossible."""
    if not isinstance(value, str) or not ISO_DATE.match(value):
        return None
    try:
        return date.fromisoformat(value)
    except ValueError:
        return None


def age_from(birth: date, now: date | None = None) -> int:
    now = now or today()
    return now.year - birth.year - ((now.month, now.day) < (birth.month, birth.day))


def log_activity(school, kind: str, label: str):
    SchoolActivity.objects.create(school=school, kind=kind, label=label[:255])


# ─── Recherche limitée à l'école (jamais d'accès à une autre école) ──────────

def get_classroom(school, class_id, *, active=False) -> Classroom:
    pk = parse_id(class_id)
    classroom = Classroom.objects.filter(school=school, pk=pk).first() if pk else None
    if classroom is None or (active and classroom.archived):
        raise NotFound('Classe introuvable.')
    return classroom


def get_student(school, student_id):
    pk = parse_id(student_id)
    profile = students_qs(school).filter(pk=pk).first() if pk else None
    if profile is None:
        raise NotFound('Élève introuvable.')
    return profile


def get_teacher(school, teacher_id) -> User:
    pk = parse_id(teacher_id)
    user = teachers_qs(school).filter(pk=pk).first() if pk else None
    if user is None:
        raise NotFound('Enseignant introuvable.')
    return user


def sync_learner_track(profile):
    """Le parcours kEur IA de l'élève : celui que son enseignant lui a imposé, sinon celui du niveau de sa classe."""
    track = effective_track(profile)
    if track is None:
        return
    LearnerProfile.objects.filter(learner_id=profile.user_id).exclude(age_track=track).update(age_track=track)


def require_status(value) -> str:
    if value not in ('actif', 'desactive'):
        raise ApiError('Statut invalide.')
    return value
