"""Classements d'un établissement.

- Direction et enseignants (`build_leaderboard`) : QUE les élèves de l'école de l'utilisateur connecté, noms complets
  (ils les voient déjà dans leurs listes d'élèves).
- Élève (`student_class_leaderboard`, T14) : QUE les élèves de SA classe, prénom et initiale du nom (des mineurs entre eux),
  si l'école et la classe l'autorisent (règle `leaderboard`).
Seuls les élèves ayant gagné de l'XP sur la période sont classés.
"""
import unicodedata
from datetime import datetime, time, timedelta
from zoneinfo import ZoneInfo

from django.db.models import Count, Q, Sum
from django.db.models.functions import Coalesce
from django.utils import timezone
from rest_framework import status

from apps.accounts.models import User
from apps.progress.leaderboard import PERIOD_LABELS, get_rank_badge, parse_period, rank_students
from apps.progress.models import DAILY_CHALLENGE_PREFIX, RIDDLE_PREFIX

from .. import restrictions
from ..errors import ApiError
from ..levels import class_name, classroom_sort_key
from ..models import StudentProfile
from ..payloads import classroom_payload
from .eleve import get_school_student_profile

SCHOOL_TZ = ZoneInfo('Africa/Dakar')       # décision du 15/10 : l'école vit à l'heure de Dakar
WEEK_DAYS = 7


def build_leaderboard(school, period_raw, classrooms, *, classroom=None, restrict_to_classrooms=False) -> dict:
    """
    `classrooms` : classes proposées en filtre. `restrict_to_classrooms` limite aussi le
    classement aux élèves de ces classes (enseignant) ; sinon toute l'école est classée.
    `classroom` : classe choisie dans le filtre (déjà vérifiée par l'appelant).
    """
    period = parse_period(period_raw)
    if period is None:
        raise ApiError('Période invalide.')

    students = StudentProfile.objects.filter(school=school, user__is_active=True, left_in_year='').select_related('classroom')
    if restrict_to_classrooms:
        students = students.filter(classroom__in=classrooms)
    if classroom is not None:
        students = students.filter(classroom=classroom)
    profiles = {p.user_id: p for p in students}

    entries = rank_students(list(profiles), period)
    return {
        'period': period,
        'periodLabel': PERIOD_LABELS[period],
        'totalStudents': len(profiles),
        'participants': len(entries),
        'totalXp': sum(e['xp'] for e in entries),
        'classrooms': [classroom_payload(c) for c in sorted(classrooms, key=classroom_sort_key)],
        'entries': [
            {
                'rank': e['rank'],
                'student': {
                    'id': str(profiles[e['user_id']].id),
                    'firstName': profiles[e['user_id']].first_name,
                    'lastName': profiles[e['user_id']].last_name,
                },
                'classroom': classroom_payload(profiles[e['user_id']].classroom) if profiles[e['user_id']].classroom else None,
                'xp': e['xp'],
                'lessons': e['lessons'],
                'badge': get_rank_badge(e['rank']),
            }
            for e in entries
        ],
    }


# ── Élève : le classement de SA classe (T14) ────────────────────────────────────────────────────────────────

NOT_IN_A_CLASS = "Le classement de la classe est réservé aux élèves inscrits dans une classe d'école."
MONTHS = ('janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre')


def week_window(now=None) -> tuple[datetime, datetime]:
    """Les 7 derniers jours glissants à l'heure de Dakar : d'aujourd'hui moins 6 jours (minuit) jusqu'à maintenant."""
    end = timezone.localtime(now or timezone.now(), SCHOOL_TZ)
    start = datetime.combine(end.date() - timedelta(days=WEEK_DAYS - 1), time.min, tzinfo=SCHOOL_TZ)
    return start, end


def _range_label(start: datetime, end: datetime) -> str:
    """« du 10 au 16 octobre », « du 28 septembre au 4 octobre »."""
    first = str(start.day) if start.month == end.month else f'{start.day} {MONTHS[start.month - 1]}'
    return f'du {first} au {end.day} {MONTHS[end.month - 1]}'


def public_name(first_name: str, last_name: str) -> str:
    """Prénom et initiale du nom (« Ndèye F. ») : entre élèves, jamais le nom complet."""
    first = ' '.join((first_name or '').split()) or 'Élève'
    initial = next((char for char in (last_name or '') if char.isalpha()), '')
    return f'{first} {initial.upper()}.' if initial else first


def _sort_name(name: str) -> str:
    """Ordre alphabétique sans tenir compte des accents ni des majuscules (« Élodie » entre « Awa » et « Fatou »)."""
    return unicodedata.normalize('NFKD', name).encode('ascii', 'ignore').decode().casefold()


def _class_rows(profile: StudentProfile, start: datetime, end: datetime) -> list[dict]:
    """UNE requête : chaque élève actif de la classe avec ses XP et ses leçons de la période, agrégées par la base."""
    in_window = Q(user__progress_entries__completed_at__gte=start, user__progress_entries__completed_at__lte=end)
    is_lesson = (~Q(user__progress_entries__lesson_id__startswith=DAILY_CHALLENGE_PREFIX)
                 & ~Q(user__progress_entries__lesson_id__startswith=RIDDLE_PREFIX))
    return list(
        StudentProfile.objects
        .filter(school_id=profile.school_id, classroom_id=profile.classroom_id, left_in_year='',
                user__is_active=True, user__role=User.ROLE_STUDENT)
        .annotate(week_xp=Coalesce(Sum('user__progress_entries__xp', filter=in_window), 0),
                  week_lessons=Count('user__progress_entries', filter=in_window & is_lesson))
        .values('user_id', 'first_name', 'last_name', 'week_xp', 'week_lessons')
    )


def student_class_leaderboard(user, *, now=None) -> dict:
    """Le classement de la semaine de la classe de l'élève connecté.

    - uniquement les élèves actifs de SA classe (jamais une autre classe ni une autre école) ;
    - prénom et initiale du nom, XP et leçons des 7 derniers jours, même rang pour les ex æquo, sa ligne marquée `isMe` ;
    - 403 si la règle effective `leaderboard` est coupée, avec la phrase de /api/eleve/restrictions et `by` (qui l'a coupée) ;
    - 403 pour un enfant de famille ou un élève sans classe ;
    - aucun e-mail, matricule ni identifiant d'un autre élève.
    """
    profile = get_school_student_profile(user)
    if profile is None or profile.classroom_id is None:
        raise ApiError(NOT_IN_A_CLASS, status.HTTP_403_FORBIDDEN, extra={'reason': 'no_class'})
    gate = restrictions.effective(user, at=now)['leaderboard']
    if not gate['allowed']:
        raise ApiError(restrictions.rule_message('leaderboard', gate['by']), status.HTTP_403_FORBIDDEN,
                       extra={'reason': 'closed', 'by': gate['by']})

    start, end = week_window(now)
    rows = _class_rows(profile, start, end)
    for row in rows:
        row['name'] = public_name(row['first_name'], row['last_name'])
    ranked = sorted((r for r in rows if r['week_xp'] > 0), key=lambda r: (-r['week_xp'], _sort_name(r['name']), r['name'], r['user_id']))

    entries, rank, previous_xp = [], 0, None
    for position, row in enumerate(ranked, start=1):
        if row['week_xp'] != previous_xp:
            rank, previous_xp = position, row['week_xp']
        entries.append({'rank': rank, 'displayName': row['name'], 'xp': row['week_xp'], 'lessons': row['week_lessons'],
                        'isMe': row['user_id'] == user.id})
    me = next(({'rank': e['rank'], 'xp': e['xp'], 'lessons': e['lessons']} for e in entries if e['isMe']), None)
    return {
        'scopeLabel': 'Classement de la classe',
        'classroom': class_name(profile.classroom.level, profile.classroom.section),
        'period': {'label': PERIOD_LABELS['weekly'], 'range': _range_label(start, end), 'timezone': 'Africa/Dakar',
                   'start': start.isoformat(), 'end': end.isoformat()},
        'classSize': len(rows),
        'participants': len(entries),
        'entries': entries,
        'me': me,
    }
