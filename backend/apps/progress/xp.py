"""
Attribution de l'XP : règles uniques, appliquées par le serveur.

  - L'XP d'une activité vient du catalogue serveur (`Lesson.xp` pour les leçons du
    parcours, `Activity.xp` pour les jeux, quiz et bonus) : le navigateur ne la fixe jamais.
  - Une activité rapporte son XP UNE seule fois ; la rejouer ne rapporte rien.
  - Le total d'XP est toujours la somme des lignes `Progress` : aucune autre valeur stockée
    ne peut diverger.
  - Le niveau se déduit du total (voir levels.py) ; une montée de niveau n'est signalée que
    lorsqu'un seuil est réellement franchi par l'attribution.
"""
from django.db import IntegrityError, transaction
from django.db.models import Sum

from apps.curriculum.models import Activity, Lesson

from .levels import level_info
from .models import Progress


def activity_xp(activity_id: str) -> int | None:
    """XP officielle d'une activité, ou None si elle n'existe pas au catalogue."""
    lesson_xp = Lesson.objects.filter(lesson_id=activity_id).values_list('xp', flat=True).first()
    if lesson_xp is not None:
        return lesson_xp
    from apps.curriculum.models import ContentVersion
    from apps.curriculum.versions import live_version
    for kind in (
        getattr(ContentVersion, 'KIND_LESSON1012', 'lesson1012'),
        'lesson79ecole',
        ContentVersion.KIND_LESSON79,
    ):
        cv = live_version(kind, activity_id)
        if cv and cv.content and isinstance(cv.content, dict) and cv.content.get('xp') is not None:
            return cv.content['xp']
    return Activity.objects.filter(activity_id=activity_id, is_active=True).values_list('xp', flat=True).first()


def total_xp(user) -> int:
    return Progress.objects.filter(user=user).aggregate(total=Sum('xp'))['total'] or 0


def record_xp(user, lesson_id: str, xp: int, *, age_track: str, score: int = 100, stars: int = 0):
    """Enregistre l'activité terminée. Renvoie (ligne, créée) ; créée=False si elle l'était déjà."""
    try:
        with transaction.atomic():
            return Progress.objects.get_or_create(
                user=user,
                lesson_id=lesson_id,
                defaults={'owner_email': user.email, 'age_track': age_track, 'xp': xp, 'score': score, 'stars': stars},
            )
    except IntegrityError:
        # Double clic / requêtes concurrentes : la ligne existe déjà.
        return Progress.objects.get(user=user, lesson_id=lesson_id), False


def xp_summary(user, xp_before: int) -> dict:
    """Total, niveau et éventuelle montée de niveau après une attribution."""
    xp_after = total_xp(user)
    before, after = level_info(xp_before), level_info(xp_after)
    return {
        "xp": xp_after,
        "level": after,
        "levelUp": after if after["level"] > before["level"] else None,
    }
