"""Règles de l'école et de la classe (service des vues /ecole/restrictions, /enseignant/classes/<id>/restrictions, /eleve/restrictions)."""
from .. import restrictions
from ..errors import ApiError
from ..models import RestrictionPolicy
from .enseignant import _owned_classroom

CATALOGUE = {key: restrictions.LABELS[key] for key in (*restrictions.BOOL_KEYS, 'daily_limit_minutes', 'windows')}


def _save(school, classroom, user, rules: dict) -> RestrictionPolicy:
    policy, _ = RestrictionPolicy.objects.update_or_create(
        school=school, classroom=classroom, defaults={'rules': rules, 'updated_by': user})
    return policy


def _clean(data) -> dict:
    try:
        return restrictions.clean_settings((data or {}).get('rules'))
    except restrictions.RestrictionError as error:
        raise ApiError(' '.join(error.errors)) from error


def _school_rules(school) -> dict:
    policy = RestrictionPolicy.objects.filter(school=school, classroom__isnull=True).first()
    return policy.rules if policy else {}


# ── Direction ──────────────────────────────────────────────────────────────────────────────────────────────────

def get_school_rules(school) -> dict:
    return {'rules': _school_rules(school), 'catalogue': CATALOGUE}


def set_school_rules(school, user, data) -> dict:
    _save(school, None, user, _clean(data))
    return get_school_rules(school)


# ── Enseignant ─────────────────────────────────────────────────────────────────────────────────────────────────

def get_class_rules(teacher, class_id) -> dict:
    classroom = _owned_classroom(teacher, class_id)
    policy = RestrictionPolicy.objects.filter(school=teacher.school, classroom=classroom).first()
    return {'rules': policy.rules if policy else {}, 'schoolRules': _school_rules(teacher.school), 'catalogue': CATALOGUE}


def set_class_rules(teacher, class_id, data) -> dict:
    classroom = _owned_classroom(teacher, class_id)
    rules = _clean(data)
    problems = restrictions.loosening_errors(_school_rules(teacher.school), rules)   # décision : l'enseignant n'assouplit jamais la direction
    if problems:
        raise ApiError(' '.join(problems))
    _save(teacher.school, classroom, teacher, rules)
    return get_class_rules(teacher, class_id)


# ── Élève ──────────────────────────────────────────────────────────────────────────────────────────────────────

def student_rules(user) -> dict:
    """Ce que l'élève a le droit de faire maintenant, et qui a posé chaque restriction (jamais de blocage muet)."""
    result = restrictions.effective(user)
    result['messages'] = [restrictions.rule_message(key, result[key]['by']) for key in restrictions.BOOL_KEYS if not result[key]['allowed']]
    if not result['access']['allowedNow']:
        result['messages'].append(f"Ce n'est pas l'heure : {_who(result['access']['by'])} a fixé des horaires.")
    return result


def _who(level) -> str:
    return restrictions.who_label(level)
