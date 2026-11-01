"""La classe au quotidien : séances, annonces et sondages, parcours d'un élève (docs/ECOLE_ELEVE_CONCEPTION.md, sections 8.2 à 8.4).

L'enseignant est toujours celui de la session et ne touche qu'à SES classes et SES élèves ; l'élève ne voit que sa propre classe.
Aucun texte libre côté élève : il répond à un sondage en touchant un choix.
"""
from datetime import timedelta

from django.db import transaction
from django.db.models import Count
from django.utils import timezone

from ..errors import ApiError, NotFound
from ..levels import effective_track
from ..models import Announcement, AnnouncementAnswer, ClassSession
from .common import parse_id, sync_learner_track
from .eleve import get_school_student_profile
from .enseignant import _owned_classroom, _owned_student

TRACKS = ('7-9', '10-12', '13-15')
MIN_SESSION_MINUTES, MAX_SESSION_MINUTES = 5, 120
MAX_ACTIVE_ANNOUNCEMENTS = 3
MAX_DAYS_AHEAD = 30
POLL_CHOICES = (2, 5)


def _text(data, key, label, *, maximum, required=False) -> str:
    value = (data or {}).get(key, '')
    value = value.strip() if isinstance(value, str) else ''
    if required and not value:
        raise ApiError(f'{label} est obligatoire.')
    if len(value) > maximum:
        raise ApiError(f'{label} : {maximum} caractères au plus.')
    return value


# ── Séances ────────────────────────────────────────────────────────────────────────────────────────────────────

def _active_session(classroom, now=None) -> ClassSession | None:
    now = now or timezone.now()
    return ClassSession.objects.filter(classroom=classroom, ended_at__isnull=True, started_at__lte=now, ends_at__gt=now).order_by('-started_at').first()


def session_payload(session: ClassSession | None, now=None) -> dict | None:
    if session is None:
        return None
    now = now or timezone.now()
    return {'id': session.id, 'title': session.title, 'lessonId': session.lesson_id, 'startedAt': session.started_at.isoformat(),
            'endsAt': session.ends_at.isoformat(), 'remainingSeconds': max(0, int((session.ends_at - now).total_seconds()))}


def current_session(teacher, class_id) -> dict:
    return {'session': session_payload(_active_session(_owned_classroom(teacher, class_id)))}


@transaction.atomic
def open_session(teacher, class_id, data) -> dict:
    classroom = _owned_classroom(teacher, class_id)
    title = _text(data, 'title', 'Le titre de la séance', maximum=80, required=True)
    lesson_id = _text(data, 'lessonId', 'La leçon', maximum=30)
    minutes = (data or {}).get('minutes')
    if isinstance(minutes, bool) or not isinstance(minutes, int) or not MIN_SESSION_MINUTES <= minutes <= MAX_SESSION_MINUTES:
        raise ApiError(f'La durée doit être comprise entre {MIN_SESSION_MINUTES} et {MAX_SESSION_MINUTES} minutes.')
    now = timezone.now()
    ClassSession.objects.filter(classroom=classroom, ended_at__isnull=True, ends_at__gt=now).update(ended_at=now)   # une seule séance à la fois
    session = ClassSession.objects.create(school=teacher.school, classroom=classroom, title=title, lesson_id=lesson_id,
                                          started_at=now, ends_at=now + timedelta(minutes=minutes), created_by=teacher)
    return {'session': session_payload(session, now)}


def end_session(teacher, class_id) -> dict:
    classroom = _owned_classroom(teacher, class_id)
    ClassSession.objects.filter(classroom=classroom, ended_at__isnull=True, ends_at__gt=timezone.now()).update(ended_at=timezone.now())
    return {'session': None}


# ── Annonces et sondages ───────────────────────────────────────────────────────────────────────────────────────

def _is_active(announcement: Announcement, now=None) -> bool:
    now = now or timezone.now()
    return announcement.closed_at is None and announcement.ends_at > now


def _teacher_announcement(teacher, announcement_id) -> Announcement:
    pk = parse_id(announcement_id)
    announcement = Announcement.objects.select_related('classroom').filter(pk=pk, school=teacher.school, classroom__teacher=teacher).first() if pk else None
    if announcement is None:
        raise ApiError("Cette annonce n'est pas dans l'une de vos classes.", 403)
    return announcement


def _counts(announcement: Announcement) -> list[int]:
    by_choice = dict(announcement.answers.values_list('choice').annotate(n=Count('id')))
    return [by_choice.get(i, 0) for i in range(len(announcement.options))]


def announcement_payload(announcement: Announcement, now=None) -> dict:
    return {'id': announcement.id, 'kind': announcement.kind, 'title': announcement.title, 'text': announcement.text,
            'options': announcement.options, 'createdAt': announcement.created_at.isoformat(), 'endsAt': announcement.ends_at.isoformat(),
            'closed': announcement.closed_at is not None, 'active': _is_active(announcement, now)}


def list_announcements(teacher, class_id) -> dict:
    classroom = _owned_classroom(teacher, class_id)
    now = timezone.now()
    items = list(Announcement.objects.filter(classroom=classroom).order_by('-created_at')[:30])
    return {'announcements': [announcement_payload(a, now) for a in items], 'maxActive': MAX_ACTIVE_ANNOUNCEMENTS}


@transaction.atomic
def create_announcement(teacher, class_id, data) -> dict:
    classroom = _owned_classroom(teacher, class_id)
    kind = (data or {}).get('kind')
    if kind not in (Announcement.KIND_TEXT, Announcement.KIND_POLL):
        raise ApiError("Le type d'annonce doit être « text » ou « poll ».")
    title = _text(data, 'title', 'Le titre', maximum=80)
    text = _text(data, 'text', 'Le texte' if kind == Announcement.KIND_TEXT else 'La question', maximum=300, required=True)
    options: list[str] = []
    if kind == Announcement.KIND_POLL:
        raw = (data or {}).get('options')
        if not isinstance(raw, list) or not POLL_CHOICES[0] <= len(raw) <= POLL_CHOICES[1]:
            raise ApiError(f'Un sondage propose de {POLL_CHOICES[0]} à {POLL_CHOICES[1]} réponses.')
        options = [o.strip() if isinstance(o, str) else '' for o in raw]
        if any(not o or len(o) > 60 for o in options) or len({o.lower() for o in options}) != len(options):
            raise ApiError('Chaque réponse est obligatoire (60 caractères au plus) et différente des autres.')
    days = (data or {}).get('endsInDays', 7)
    if isinstance(days, bool) or not isinstance(days, int) or not 1 <= days <= MAX_DAYS_AHEAD:
        raise ApiError(f'La durée de l\'annonce doit être comprise entre 1 et {MAX_DAYS_AHEAD} jours.')
    now = timezone.now()
    active = list(Announcement.objects.select_for_update().filter(classroom=classroom, closed_at__isnull=True, ends_at__gt=now))
    if len(active) >= MAX_ACTIVE_ANNOUNCEMENTS:
        raise ApiError(f'Au plus {MAX_ACTIVE_ANNOUNCEMENTS} annonces actives par classe : fermez-en une d\'abord.')
    announcement = Announcement.objects.create(school=teacher.school, classroom=classroom, kind=kind, title=title, text=text, options=options,
                                               created_at=now, ends_at=now + timedelta(days=days), created_by=teacher)
    return {'announcement': announcement_payload(announcement, now)}


def announcement_results(teacher, announcement_id) -> dict:
    announcement = _teacher_announcement(teacher, announcement_id)
    students = list(announcement.classroom.students.filter(user__is_active=True).order_by('last_name', 'first_name'))
    answers = {a.student_id: a.choice for a in announcement.answers.all()}
    return {
        'announcement': announcement_payload(announcement),
        'counts': _counts(announcement),
        'answered': [{'studentId': s.id, 'name': f'{s.first_name} {s.last_name}', 'choice': answers[s.id]} for s in students if s.id in answers],
        'notAnswered': [{'studentId': s.id, 'name': f'{s.first_name} {s.last_name}'} for s in students if s.id not in answers],
    }


def close_announcement(teacher, announcement_id) -> dict:
    announcement = _teacher_announcement(teacher, announcement_id)
    if announcement.closed_at is None:
        announcement.closed_at = timezone.now()
        announcement.save(update_fields=['closed_at'])
    return {'announcement': announcement_payload(announcement)}


# ── Parcours d'un élève ────────────────────────────────────────────────────────────────────────────────────────

def set_student_track(teacher, student_id, data) -> dict:
    """L'enseignant impose un parcours à UN de ses élèves (ou retire l'exception avec une valeur vide)."""
    profile = _owned_student(teacher, student_id)
    track = (data or {}).get('track') or ''
    if track not in ('', *TRACKS):
        raise ApiError('Parcours invalide (7-9, 10-12 ou 13-15).')
    profile.track_override = track
    profile.save(update_fields=['track_override'])
    sync_learner_track(profile)
    return {'studentId': profile.id, 'trackOverride': track or None}


# ── Élève ──────────────────────────────────────────────────────────────────────────────────────────────────────

def _student(user):
    profile = get_school_student_profile(user)
    if profile is None or profile.classroom_id is None:
        raise ApiError("Ce compte n'est pas rattaché à une classe.", 403)
    return profile


def student_today(user) -> dict:
    """L'accueil « Aujourd'hui » : la séance en cours et les annonces actives de SA classe."""
    profile = _student(user)
    now = timezone.now()
    answers = {a.announcement_id: a.choice for a in AnnouncementAnswer.objects.filter(student=profile)}
    items = []
    for announcement in Announcement.objects.filter(classroom=profile.classroom, closed_at__isnull=True, ends_at__gt=now).order_by('-created_at')[:MAX_ACTIVE_ANNOUNCEMENTS]:
        payload = announcement_payload(announcement, now)
        if announcement.kind == Announcement.KIND_POLL:
            payload['myChoice'] = answers.get(announcement.id)
            if announcement.id in answers:
                payload['counts'] = _counts(announcement)       # les résultats ne se montrent qu'après avoir répondu
        items.append(payload)
    from .. import restrictions
    return {'session': session_payload(_active_session(profile.classroom, now), now), 'announcements': items,
            'track': effective_track(profile),'restrictions': restrictions.effective(user, at=now)}


@transaction.atomic
def answer_poll(user, announcement_id, data) -> dict:
    profile = _student(user)
    pk = parse_id(announcement_id)
    announcement = Announcement.objects.filter(pk=pk, classroom=profile.classroom).first() if pk else None
    if announcement is None:
        raise NotFound('Annonce introuvable.')
    if announcement.kind != Announcement.KIND_POLL:
        raise ApiError("Cette annonce n'est pas un sondage.")
    if not _is_active(announcement):
        raise ApiError('Ce sondage est terminé.')
    choice = (data or {}).get('choice')
    if isinstance(choice, bool) or not isinstance(choice, int) or not 0 <= choice < len(announcement.options):
        raise ApiError('Choix invalide.')
    AnnouncementAnswer.objects.update_or_create(announcement=announcement, student=profile, defaults={'choice': choice})
    return {'myChoice': choice, 'counts': _counts(announcement)}
