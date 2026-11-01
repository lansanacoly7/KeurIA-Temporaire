"""
Énigme du jour du parcours 7-9 : une énigme par jour, qui revient chaque jour à minuit (heure de Dakar).

Règles (toutes appliquées ici, côté serveur) :
  - une énigme ne porte QUE sur une leçon que l'enfant a terminée : jamais sur quelque chose qu'il n'a pas vu ;
  - plus l'enfant avance, plus il y a d'énigmes possibles ; les énigmes déjà vues ne reviennent pas tant qu'il en reste de nouvelles ;
  - l'énigme du jour est choisie une fois pour la journée, puis l'enfant n'a qu'UN essai : elle disparaît ensuite jusqu'à demain ;
  - bonne réponse : +10 XP (une seule fois) ; mauvaise réponse : pas d'XP mais toujours l'explication ;
  - la bonne réponse n'est révélée qu'après la réponse.
"""
import random

from django.db import IntegrityError, transaction
from django.utils import timezone
from rest_framework import serializers, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.models import User
from apps.accounts.serializers import first_error
from apps.curriculum.models import Lesson, Riddle
from apps.learners.models import LearnerProfile

from .models import Progress, RiddleDay
from .parental import screen_time_block
from .models import RIDDLE_PREFIX, lesson_progress
from .shuffle import display_order, to_displayed, to_original
from .views import RIDDLE_XP, notify_level_up
from .xp import record_xp, total_xp, xp_summary


def completed_lessons(user) -> set[str]:
    return set(lesson_progress(Progress.objects.filter(user=user)).values_list('lesson_id', flat=True))


def choose_riddle(user, day):
    """Une énigme sur une leçon terminée, jamais déjà vue si possible ; le même choix toute la journée."""
    try:
        from apps.superadmin.studio_items import sync_due_pending_versions
        sync_due_pending_versions()
    except Exception:
        pass
    pool = list(Riddle.objects.filter(is_active=True, lesson_id__in=completed_lessons(user)).order_by('id'))
    if not pool:
        return None
    last_seen = {}
    for riddle_id, seen_day in RiddleDay.objects.filter(user=user).values_list('riddle_id', 'day'):
        last_seen[riddle_id] = max(seen_day, last_seen.get(riddle_id, seen_day))
    fresh = [r for r in pool if r.id not in last_seen]
    if fresh:
        candidates = fresh
    else:
        # Tout a été vu : on révise, en commençant par les énigmes les plus anciennes.
        oldest = min(last_seen[r.id] for r in pool)
        candidates = [r for r in pool if last_seen[r.id] == oldest]
    return random.Random(f"{user.pk}:{day.isoformat()}").choice(candidates)


def todays_riddle_day(user, day):
    row = RiddleDay.objects.filter(user=user, day=day).select_related('riddle').first()
    if row is not None:
        return row
    riddle = choose_riddle(user, day)
    if riddle is None:
        return None
    try:
        with transaction.atomic():
            return RiddleDay.objects.create(user=user, day=day, riddle=riddle)
    except IntegrityError:
        # Deux requêtes en même temps : l'autre a déjà posé l'énigme du jour.
        return RiddleDay.objects.select_related('riddle').get(user=user, day=day)


def lesson_title(lesson_id):
    return Lesson.objects.filter(lesson_id=lesson_id).values_list('title', flat=True).first()


def riddle_order(row) -> list[int]:
    return display_order(f'riddle:{row.user_id}:{row.day.isoformat()}:{row.riddle_id}', len(row.riddle.options))


def riddle_payload(row):
    riddle = row.riddle
    order = riddle_order(row)  # positions d'affichage : les propositions sont mélangées par enfant et par jour
    data = {
        "riddle": {
            "id": riddle.id,
            "question": riddle.question,
            "options": [riddle.options[i] for i in order],
            "xp": RIDDLE_XP,
            "lessonTitle": lesson_title(riddle.lesson_id),
        },
        "answered": row.answer is not None,
    }
    if row.answer is not None:
        data.update({
            "correct": bool(row.correct),
            "answer": to_displayed(order, row.answer),
            "correctIndex": to_displayed(order, riddle.correct_index),
            "explanation": riddle.explanation,
        })
    return data


class RiddleAnswerSerializer(serializers.Serializer):
    answer = serializers.IntegerField(min_value=0)


class DailyRiddleView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        row = todays_riddle_day(request.user, timezone.localdate())
        if row is None:
            return Response({"riddle": None})
        return Response(riddle_payload(row))

    def post(self, request):
        blocked = screen_time_block(request.user)
        if blocked:
            return blocked

        serializer = RiddleAnswerSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({"error": first_error(serializer.errors)}, status=status.HTTP_400_BAD_REQUEST)

        today = timezone.localdate()
        row = todays_riddle_day(request.user, today)
        if row is None:
            return Response({"error": "Aucune énigme aujourd'hui."}, status=status.HTTP_404_NOT_FOUND)

        riddle = row.riddle
        displayed = serializer.validated_data['answer']  # position affichée à l'enfant
        if displayed >= len(riddle.options):
            return Response({"error": "Choix de réponse invalide."}, status=status.HTTP_400_BAD_REQUEST)
        answer = to_original(riddle_order(row), displayed)  # position dans la banque d'énigmes

        with transaction.atomic():
            # Verrou de ligne : deux réponses envoyées en même temps ne doivent pas donner deux essais.
            locked = RiddleDay.objects.select_for_update().get(pk=row.pk)
            if locked.answer is not None:
                return Response({**riddle_payload(locked), "correct": bool(locked.correct), "xpGained": 0})
            locked.answer = answer
            locked.correct = answer == riddle.correct_index
            locked.answered_at = timezone.now()
            locked.save(update_fields=['answer', 'correct', 'answered_at'])

        result = {**riddle_payload(locked), "xpGained": 0}
        if locked.correct:
            profile = LearnerProfile.objects.filter(learner=request.user).first()
            xp_before = total_xp(request.user)
            _, created = record_xp(
                request.user, f"{RIDDLE_PREFIX}{today.isoformat()}", RIDDLE_XP,
                age_track=profile.age_track if profile else '7-9',
            )
            summary = xp_summary(request.user, xp_before)
            if created and summary["levelUp"] and request.user.role == User.ROLE_STUDENT:
                notify_level_up(request.user, summary["levelUp"])
            result["xpGained"] = RIDDLE_XP if created else 0
            result["progress"] = summary
        return Response(result)
