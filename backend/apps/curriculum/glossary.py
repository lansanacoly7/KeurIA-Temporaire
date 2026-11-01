"""
Dictionnaire de l'apprenant qui se remplit au fil des leçons.

Règle : un élève ne voit un mot qu'après avoir terminé l'une des leçons qui l'enseignent (`GlossaryTerm.unlock_lessons`).
Un enfant qui n'a rien fait a un dictionnaire vide, qui se remplit leçon après leçon. Les adultes (parent, enseignant,
administrateur) voient tout, pour pouvoir relire le vocabulaire. Les mots encore cachés ne sont jamais envoyés au navigateur :
seul leur nombre l'est, avec un indice sur la prochaine leçon qui en révèle un.
"""
from datetime import timedelta

from django.utils import timezone

from apps.accounts.models import User
from apps.learners.models import LearnerProfile
from apps.progress.models import Progress, lesson_progress

from .models import GlossaryTerm, Lesson

NEW_WORD_DAYS = 7  # un mot découvert depuis moins de 7 jours porte l'étiquette « Nouveau »


def _term_payload(term, lesson_titles, unlocked_on=None):
    first = next((lid for lid in term.unlock_lessons if lid in lesson_titles), None)
    return {
        "word": term.word, "definition": term.definition, "example": term.example,
        "icon": term.icon, "color": term.color, "background": term.background,
        "lesson": {"id": first, "title": lesson_titles[first]} if first else None,
        "isNew": bool(unlocked_on and unlocked_on >= timezone.now() - timedelta(days=NEW_WORD_DAYS)),
    }


def build_glossary(user) -> dict:
    terms = list(GlossaryTerm.objects.filter(is_active=True))
    wanted = {lid for t in terms for lid in t.unlock_lessons}
    lessons = {lesson.lesson_id: lesson for lesson in Lesson.objects.filter(lesson_id__in=wanted).select_related('module__track')}
    titles = {lid: lesson.title for lid, lesson in lessons.items()}

    is_student = bool(user and user.is_authenticated and user.role == User.ROLE_STUDENT)
    if user and user.is_authenticated and not is_student:
        return {"terms": [_term_payload(t, titles) for t in terms], "total": len(terms), "discovered": len(terms), "next": None, "lockedForLearner": False}
    if not (user and user.is_authenticated):
        return {"terms": [], "total": 0, "discovered": 0, "next": None, "lockedForLearner": True}

    done = dict(lesson_progress(Progress.objects.filter(user=user)).values_list('lesson_id', 'completed_at'))
    track = LearnerProfile.objects.filter(learner=user).values_list('age_track', flat=True).first()
    if not track:  # compte sans profil : on déduit le parcours de la dernière leçon terminée
        track = lesson_progress(Progress.objects.filter(user=user)).order_by('-completed_at').values_list('age_track', flat=True).first()
    # Les mots à découvrir pour cet enfant : ceux qu'une leçon de SON parcours enseigne.
    relevant = [t for t in terms if any(lid in lessons and (not track or lessons[lid].module.track.key == track) for lid in t.unlock_lessons)]

    unlocked = []
    for term in relevant:
        dates = [done[lid] for lid in term.unlock_lessons if lid in done]
        if dates:
            unlocked.append(_term_payload(term, titles, min(dates)))
    locked = [t for t in relevant if not any(lid in done for lid in t.unlock_lessons)]

    # Indice : la prochaine leçon du parcours qui révèle un mot (sans dire lequel).
    nxt = None
    locked_by_lesson = {lid: t for t in locked for lid in t.unlock_lessons
                        if lid in lessons and (not track or lessons[lid].module.track.key == track)}
    if locked_by_lesson:
        ordered = sorted(locked_by_lesson, key=lambda lid: (lessons[lid].module.order, lessons[lid].order))
        lid = ordered[0]
        nxt = {"lessonId": lid, "lessonTitle": lessons[lid].title}
    return {"terms": unlocked, "total": len(relevant), "discovered": len(unlocked), "next": nxt, "lockedForLearner": True}
