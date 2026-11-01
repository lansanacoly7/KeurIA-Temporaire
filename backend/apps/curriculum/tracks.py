"""
Détermination du parcours officiel d'un utilisateur (règles uniques d'accès aux contenus).

Règles :
  - Tranche d'âge : LearnerProfile.age_track en priorité, sinon user.age_group, sinon 7-9 par défaut.
  - École : un élève rattaché à une école (user.school_id ou user.school) reçoit le parcours élève (*-ecole).
  - Hors école : un enfant inscrit par ses parents reçoit le parcours enfant (*).
  - Repli temporaire : si un parcours élève n'a pas encore de contenu (ex: 10-12-ecole ou 13-15-ecole),
    l'élève reçoit le parcours enfant de sa tranche d'âge lorsque le repli est activé.
"""
from django.conf import settings

TRACK_WITH_CONTENT = {'7-9', '7-9-ecole', '10-12'}


def age_to_track_key(age: int | str) -> str:
    """Convertit un âge ou une tranche en clé de base (7-9, 10-12, 13-15)."""
    if isinstance(age, int):
        if age <= 9:
            return '7-9'
        if age <= 12:
            return '10-12'
        return '13-15'
    if isinstance(age, str):
        cleaned = age.strip().lower()
        if cleaned in ('7-9', '10-12', '13-15'):
            return cleaned
        if cleaned in ('7-9-ecole', '10-12-ecole', '13-15-ecole'):
            return cleaned.replace('-ecole', '')
        if cleaned.isdigit():
            val = int(cleaned)
            return '7-9' if val <= 9 else ('10-12' if val <= 12 else '13-15')
    return '7-9'


def track_for(user_or_age, school=None, fallback=None) -> str:
    """
    Renvoie la clé du parcours auquel l'utilisateur doit avoir accès (ex: '7-9', '7-9-ecole', '10-12'...).
    """
    has_school = bool(school)
    base_track = None

    if isinstance(user_or_age, int | str):
        base_track = age_to_track_key(user_or_age)
    elif user_or_age is not None:
        user = user_or_age
        profile = getattr(user, 'learner_profile', None)
        if profile and getattr(profile, 'age_track', None):
            base_track = age_to_track_key(profile.age_track)
        elif getattr(user, 'age_group', None):
            base_track = age_to_track_key(user.age_group)
        else:
            base_track = '7-9'

        if getattr(user, 'school_id', None) or getattr(user, 'school', None):
            has_school = True

    if not base_track:
        base_track = '7-9'

    target = f"{base_track}-ecole" if has_school else base_track

    # Repli temporaire si le parcours élève n'a pas encore de contenu
    if fallback is None:
        fallback = getattr(settings, 'FALLBACK_TO_CHILD_TRACK', True)

    if fallback and target.endswith('-ecole') and target not in TRACK_WITH_CONTENT:
        return base_track

    return target
