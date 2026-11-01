"""Règles en couches pour les élèves rattachés à une école (note de conception : docs/ECOLE_ELEVE_CONCEPTION.md).

Trois niveaux : l'école (direction), la classe (enseignant), la maison (parent lié). Le réglage effectif est **le plus strict** des niveaux
qui s'appliquent : une couche plus basse ne peut jamais assouplir une couche plus haute (décisions du 15/10/2026) :
  - l'enseignant ne peut pas assouplir ce que la direction a posé ;
  - le parent ne peut que resserrer (il peut couper Palou à la maison même si l'école l'autorise) ;
  - pendant une séance de classe, seules l'école et la classe comptent (pas le parent) ;
  - les créneaux horaires suivent l'heure du serveur.

Un réglage absent d'un niveau veut dire « ce niveau ne restreint pas ». Réglages :
  palou, games, scratch, free_path, leaderboard : booléens (False = interdit) ;
  daily_limit_minutes : entier (minutes) ;
  windows : créneaux AUTORISÉS [{"days": [0..6] (0 = lundi), "start": "08:00", "end": "16:00"}] ; absent = toujours autorisé.
"""
from __future__ import annotations

from datetime import datetime

from django.utils import timezone

BOOL_KEYS = ('palou', 'games', 'scratch', 'free_path', 'leaderboard')
INT_RANGES = {'daily_limit_minutes': (5, 600)}
LEVELS = ('school', 'class', 'parent')
LABELS = {
    'palou': 'Palou', 'games': 'Les jeux et défis', 'scratch': 'Le Studio Scratch', 'free_path': 'Le parcours libre',
    'leaderboard': 'Le classement', 'daily_limit_minutes': 'Le temps quotidien', 'windows': 'Les horaires',
}


WHO = {'school': "la direction de l'école", 'class': 'ton enseignant', 'parent': 'ton parent'}


def who_label(level) -> str:
    return WHO.get(level, 'ton école')


def rule_message(key: str, by) -> str:
    """La phrase montrée à l'élève pour une règle coupée (« Le classement : coupé par ton enseignant. ») : partout la même."""
    return f'{LABELS[key]} : coupé par {who_label(by)}.'


class RestrictionError(ValueError):
    """Réglages invalides, ou qui assouplissent une règle d'un niveau supérieur."""

    def __init__(self, errors: list[str]):
        super().__init__(' '.join(errors))
        self.errors = errors


# ── Validation ──────────────────────────────────────────────────────────────────────────────────────────────────

def _minutes(value) -> int | None:
    try:
        hours, minutes = str(value).split(':')
        h, m = int(hours), int(minutes)
    except (ValueError, TypeError):
        return None
    return h * 60 + m if 0 <= h <= 24 and 0 <= m < 60 and (h < 24 or m == 0) else None


def clean_settings(raw) -> dict:
    """Valide et normalise des réglages saisis (lève RestrictionError)."""
    if not isinstance(raw, dict):
        raise RestrictionError(['Les réglages doivent être un objet.'])
    errors: list[str] = []
    cleaned: dict = {}
    for key, value in raw.items():
        if value is None:
            continue                                   # « pas de restriction à ce niveau »
        if key in BOOL_KEYS:
            if not isinstance(value, bool):
                errors.append(f'{LABELS[key]} : oui ou non attendu.')
            else:
                cleaned[key] = value
        elif key in INT_RANGES:
            low, high = INT_RANGES[key]
            if isinstance(value, bool) or not isinstance(value, int) or not low <= value <= high:
                errors.append(f'{LABELS[key]} : un nombre de minutes entre {low} et {high} est attendu.')
            else:
                cleaned[key] = value
        elif key == 'windows':
            windows = _clean_windows(value, errors)
            if windows is not None:
                cleaned[key] = windows
        else:
            errors.append(f'Réglage inconnu : {key}.')
    if errors:
        raise RestrictionError(errors)
    return cleaned


def _clean_windows(value, errors: list[str]):
    if not isinstance(value, list) or len(value) > 21:
        errors.append('Les horaires doivent être une liste (21 créneaux au plus).')
        return None
    out = []
    for item in value:
        days = item.get('days') if isinstance(item, dict) else None
        start, end = (_minutes(item.get('start')), _minutes(item.get('end'))) if isinstance(item, dict) else (None, None)
        if (not isinstance(days, list) or not days or any(isinstance(d, bool) or not isinstance(d, int) or not 0 <= d <= 6 for d in days)
                or start is None or end is None or start >= end):
            errors.append('Chaque créneau demande des jours (0 = lundi … 6 = dimanche) et une heure de début avant l\'heure de fin.')
            return None
        out.append({'days': sorted(set(days)), 'start': item['start'], 'end': item['end']})
    return out


# ── Créneaux ────────────────────────────────────────────────────────────────────────────────────────────────────

def _intervals(windows: list[dict], day: int) -> list[tuple[int, int]]:
    merged: list[list[int]] = []
    for w in sorted((w for w in windows if day in w['days']), key=lambda w: _minutes(w['start'])):
        s, e = _minutes(w['start']), _minutes(w['end'])
        if merged and s <= merged[-1][1]:
            merged[-1][1] = max(merged[-1][1], e)
        else:
            merged.append([s, e])
    return list(map(tuple, merged))


def _inside(windows: list[dict], day: int, minute: int) -> bool:
    return any(a <= minute < b for a, b in _intervals(windows, day))


def _windows_within(inner: list[dict], outer: list[dict]) -> bool:
    """Chaque créneau de `inner` tient dans l'union des créneaux de `outer`, jour par jour."""
    for day in range(7):
        container = _intervals(outer, day)
        for a, b in _intervals(inner, day):
            if not any(x <= a and b <= y for x, y in container):
                return False
    return True


# ── Contrôle « on n'assouplit pas » ─────────────────────────────────────────────────────────────────────────────

def loosening_errors(upper: dict, lower: dict) -> list[str]:
    """Raisons pour lesquelles `lower` (ex. la classe) assouplirait `upper` (ex. l'école). Liste vide = acceptable."""
    problems: list[str] = []
    for key in BOOL_KEYS:
        if upper.get(key) is False and lower.get(key) is True:
            problems.append(f'{LABELS[key]} : l\'école l\'a interdit, la classe ne peut pas l\'autoriser.')
    cap = upper.get('daily_limit_minutes')
    if cap is not None and lower.get('daily_limit_minutes') is not None and lower['daily_limit_minutes'] > cap:
        problems.append(f'{LABELS["daily_limit_minutes"]} : l\'école limite à {cap} minutes, la classe ne peut pas dépasser.')
    if 'windows' in upper and 'windows' in lower and not _windows_within(lower['windows'], upper['windows']):
        problems.append(f'{LABELS["windows"]} : les créneaux de la classe doivent rester dans ceux de l\'école.')
    return problems


# ── Calcul du réglage effectif ──────────────────────────────────────────────────────────────────────────────────

def class_session_active(classroom, at) -> bool:
    """Une séance de classe est-elle ouverte à cet instant ? (ouverte par l'enseignant, elle s'arrête à l'heure prévue ou quand il la ferme)"""
    from .models import ClassSession

    return ClassSession.objects.filter(classroom=classroom, ended_at__isnull=True, started_at__lte=at, ends_at__gt=at).exists()


def layers_for(user, *, at=None) -> dict[str, dict]:
    """Les réglages bruts de chaque niveau qui s'appliquent à cet élève (un niveau absent = aucune restriction)."""
    from .models import RestrictionPolicy, StudentProfile

    layers: dict[str, dict] = {'school': {}, 'class': {}, 'parent': {}}
    profile = StudentProfile.objects.select_related('classroom').filter(user=user).first()
    if profile is None:
        return layers
    for policy in RestrictionPolicy.objects.filter(school_id=profile.school_id).filter(classroom__isnull=True):
        layers['school'] = policy.rules or {}
    if profile.classroom_id:
        for policy in RestrictionPolicy.objects.filter(school_id=profile.school_id, classroom_id=profile.classroom_id):
            layers['class'] = policy.rules or {}
    layers['parent'] = _parent_layer(user)
    return layers


def _parent_layer(user) -> dict:
    """La couche « maison » : ce que le parent lié a posé (il ne peut que resserrer). Sans parent lié : aucune."""
    if not getattr(user, 'parent_id', None):
        return {}
    from apps.progress.parental import limits_for

    limits = limits_for(user.parent, user)
    layer: dict = {}
    if limits is None:
        return {'palou': False}                         # le parent n'a encore rien décidé : Palou reste fermé à la maison
    if not limits.palou_enabled:
        layer['palou'] = False
    if limits.bedtime_enabled:
        start, end = _minutes(limits.bedtime_start), _minutes(limits.bedtime_end)
        if start is not None and end is not None:
            # Heure du coucher = créneau INTERDIT ; on le traduit en créneaux autorisés (le reste de la journée).
            if start > end:                              # ex. 20:00 → 07:00 : autorisé de 07:00 à 20:00
                layer['windows'] = [{'days': list(range(7)), 'start': limits.bedtime_end, 'end': limits.bedtime_start}]
            elif start < end:                            # ex. 13:00 → 15:00 : autorisé avant et après
                layer['windows'] = [{'days': list(range(7)), 'start': '00:00', 'end': limits.bedtime_start},
                                    {'days': list(range(7)), 'start': limits.bedtime_end, 'end': '24:00'}]
    return layer


def effective(user, *, at: datetime | None = None) -> dict:
    """Ce que cet élève a le droit de faire maintenant, avec pour chaque restriction « qui l'a posée »."""
    at = timezone.localtime(at or timezone.now())
    from .models import StudentProfile

    profile = StudentProfile.objects.select_related('classroom').filter(user=user).first()
    in_class = bool(profile and profile.classroom_id and class_session_active(profile.classroom, at))
    layers = layers_for(user, at=at)
    active = ('school', 'class') if in_class else LEVELS     # pendant une séance de classe, le parent ne compte pas

    result: dict = {'context': 'class_session' if in_class else 'home', 'serverTime': at.isoformat()}
    for key in BOOL_KEYS:
        by = next((lvl for lvl in active if layers[lvl].get(key) is False), None)
        result[key] = {'allowed': by is None, 'by': by}
    limits = [(layers[lvl]['daily_limit_minutes'], lvl) for lvl in active if layers[lvl].get('daily_limit_minutes') is not None]
    value, by = min(limits, default=(None, None))
    result['dailyLimitMinutes'] = {'value': value, 'by': by}
    blocked_by = None
    for lvl in active:
        windows = layers[lvl].get('windows')
        if windows is not None and not _inside(windows, at.weekday(), at.hour * 60 + at.minute):
            blocked_by = lvl
            break
    result['access'] = {'allowedNow': blocked_by is None, 'by': blocked_by}
    return result
