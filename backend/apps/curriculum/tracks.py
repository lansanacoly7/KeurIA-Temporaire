"""
Détermination du parcours officiel d'un utilisateur et vérification des droits d'accès.

Règles :
  - Tranche d'âge : LearnerProfile.age_track en priorité, sinon user.age_group, sinon 7-9 par défaut.
  - École : un élève rattaché à une école (user.school_id ou user.school) reçoit le parcours élève (*-ecole).
  - Hors école : un enfant inscrit par ses parents reçoit le parcours enfant (*).
  - Repli temporaire : si un parcours élève n'est pas encore 'live' dans TRACK_CONFIGS (ex: 7-9-ecole aujourd'hui),
    l'élève reçoit le parcours enfant de sa tranche d'âge.
  - Accès aux leçons : seuls les élèves (role == 'eleve') ont un verrou de parcours strict. Les enseignants,
    la direction, les parents et les administrateurs peuvent ouvrir toutes les leçons.
"""
import re


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


def track_of_lesson(lesson_id: str) -> str:
    """
    Détermine la clé de parcours d'une leçon à partir de son identifiant,
    en utilisant les motifs lesson_id_re définis dans TRACK_CONFIGS.
    """
    if not lesson_id:
        return '7-9'
    from apps.curriculum.parcours79 import TRACK_CONFIGS
    lid = str(lesson_id)
    for key, cfg in TRACK_CONFIGS.items():
        pattern = cfg.get('lesson_id_re')
        if pattern and re.match(pattern, lid):
            return key
    return '7-9'


def track_for(user_or_age, school=None, fallback=None) -> str:
    """
    Renvoie la clé du parcours auquel l'utilisateur doit avoir accès (ex: '7-9', '7-9-ecole', '10-12'...).
    Un élève dont le parcours élève n'est pas 'live' dans TRACK_CONFIGS reçoit le parcours enfant de sa tranche.
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

    # Repli : si un élève a un parcours élève qui n'est pas live, il reçoit le parcours enfant de sa tranche
    from apps.curriculum.parcours79 import TRACK_CONFIGS
    if target.endswith('-ecole') and fallback is not False:
        is_live = TRACK_CONFIGS.get(target, {}).get('live', False)
        if not is_live:
            return base_track

    return target


def can_open_lesson(user, lesson_track: str) -> bool:
    """
    Détermine si l'utilisateur peut ouvrir une leçon appartenant à lesson_track.
    Règles :
      - Seuls les élèves (role == 'eleve') ayant un âge ou rattachés à une école ont un verrou de parcours :
        ils ne peuvent ouvrir que les leçons de leur propre parcours tel que renvoyé par track_for(user).
      - Les enseignants, la direction, les parents et les administrateurs
        peuvent ouvrir toutes les leçons.
      - Les utilisateurs anonymes peuvent ouvrir.
    """
    if not user or not getattr(user, 'is_authenticated', False):
        return True
    if getattr(user, 'role', None) != 'eleve':
        return True
    has_age = bool(
        (hasattr(user, 'learner_profile') and getattr(user.learner_profile, 'age_track', None))
        or getattr(user, 'age_group', None)
        or getattr(user, 'school_id', None)
        or getattr(user, 'school', None)
    )
    if not has_age:
        return True
    return track_for(user) == lesson_track
