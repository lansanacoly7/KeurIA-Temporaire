"""Défi du jour et charte de l'apprenant : état conservé côté serveur."""
from django.db import transaction
from django.utils import timezone
from rest_framework import serializers, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.models import User
from apps.accounts.parsing import parse_id
from apps.accounts.serializers import first_error
from apps.curriculum.models import DailyChallenge
from apps.learners.models import LearnerProfile

from .models import CharterCheck, DailyChallengeAttempt, Progress
from .parental import screen_time_block
from .shuffle import display_order, to_displayed, to_original
from .xp import record_xp, total_xp, xp_summary
from .models import DAILY_CHALLENGE_PREFIX
from .views import DAILY_CHALLENGE_XP, notify_level_up


# Le défi est un jeu de réflexion, pas un QCM à cocher jusqu'à ce que ça passe : deux mauvaises réponses par jour, puis demain.
MAX_WRONG_ANSWERS = 2
OUT_OF_ATTEMPTS = "Tu as utilisé tes deux essais pour aujourd'hui : reviens demain pour un nouveau défi !"


def wrong_answers_today(user, today) -> list[int]:
    attempt = DailyChallengeAttempt.objects.filter(user=user, day=today).first()
    return list(attempt.wrong_answers) if attempt else []


def todays_challenge(today):
    """Un défi par jour, en rotation sur les défis actifs (même choix pour tout le monde)."""
    try:
        from apps.superadmin.studio_items import sync_due_pending_versions
        sync_due_pending_versions()
    except Exception:
        pass
    challenges = list(DailyChallenge.objects.filter(is_active=True))
    if not challenges:
        return None
    return challenges[today.toordinal() % len(challenges)]


def challenge_order(user, today, challenge) -> list[int]:
    return display_order(f'challenge:{user.pk}:{today.isoformat()}:{challenge.id}', len(challenge.options))


class DailyChallengeAnswerSerializer(serializers.Serializer):
    answer = serializers.IntegerField(min_value=0)


class DailyChallengeView(APIView):
    permission_classes = [IsAuthenticated]

    @staticmethod
    def _lesson_id(today):
        return f"{DAILY_CHALLENGE_PREFIX}{today.isoformat()}"

    def get(self, request):
        today = timezone.localdate()
        challenge = todays_challenge(today)
        if challenge is None:
            return Response({"challenge": None})

        completed = Progress.objects.filter(user=request.user, lesson_id=self._lesson_id(today)).exists()
        order = challenge_order(request.user, today, challenge)
        wrong = [to_displayed(order, w) for w in wrong_answers_today(request.user, today) if w in order]  # positions AFFICHÉES
        return Response({
            "challenge": {
                "id": challenge.id,
                "theme": challenge.theme,
                "question": challenge.question,
                "options": [challenge.options[i] for i in order],
                "xp": DAILY_CHALLENGE_XP,
            },
            "completed": completed,
            # Les mauvaises réponses déjà données (retrouvées après un rechargement de la page) et les essais restants.
            "wrong": wrong,
            "attemptsLeft": 0 if completed else max(0, MAX_WRONG_ANSWERS - len(wrong)),
            # L'explication n'est révélée qu'une fois le défi réussi.
            "explanation": challenge.explanation if completed else None,
        })

    def post(self, request):
        blocked = screen_time_block(request.user)
        if blocked:
            return blocked

        serializer = DailyChallengeAnswerSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({"error": first_error(serializer.errors)}, status=status.HTTP_400_BAD_REQUEST)

        today = timezone.localdate()
        challenge = todays_challenge(today)
        if challenge is None:
            return Response({"error": "Aucun défi disponible aujourd'hui."}, status=status.HTTP_404_NOT_FOUND)

        order = challenge_order(request.user, today, challenge)
        displayed = serializer.validated_data['answer']  # position affichée à l'enfant
        if displayed >= len(challenge.options):
            return Response({"error": "Choix de réponse invalide."}, status=status.HTTP_400_BAD_REQUEST)
        answer = to_original(order, displayed)  # position dans la banque de questions

        lesson_id = self._lesson_id(today)
        if Progress.objects.filter(user=request.user, lesson_id=lesson_id).exists():
            return Response({"correct": True, "xpGained": 0, "explanation": challenge.explanation})

        if answer != challenge.correct_index:
            # Verrou de ligne : deux réponses envoyées en même temps ne doivent pas contourner la limite.
            with transaction.atomic():
                attempt, _ = DailyChallengeAttempt.objects.select_for_update().get_or_create(user=request.user, day=today)
                wrong = list(attempt.wrong_answers)
                if len(wrong) >= MAX_WRONG_ANSWERS:
                    return Response({"error": OUT_OF_ATTEMPTS, "locked": True, "wrong": [to_displayed(order, w) for w in wrong], "attemptsLeft": 0},
                                    status=status.HTTP_403_FORBIDDEN)
                if answer not in wrong:
                    wrong.append(answer)
                    attempt.wrong_answers = wrong
                    attempt.save(update_fields=['wrong_answers'])
            return Response({"correct": False, "xpGained": 0, "wrong": [to_displayed(order, w) for w in wrong if w in order],
                             "attemptsLeft": max(0, MAX_WRONG_ANSWERS - len(wrong))})

        if len(wrong_answers_today(request.user, today)) >= MAX_WRONG_ANSWERS:
            # Même la bonne réponse ne compte plus une fois les essais épuisés (sinon la limite ne servirait à rien).
            return Response({"error": OUT_OF_ATTEMPTS, "locked": True, "attemptsLeft": 0}, status=status.HTTP_403_FORBIDDEN)

        profile = LearnerProfile.objects.filter(learner=request.user).first()
        xp_before = total_xp(request.user)
        _, created = record_xp(
            request.user, lesson_id, DAILY_CHALLENGE_XP,
            age_track=profile.age_track if profile else '10-12',
        )
        summary = xp_summary(request.user, xp_before)
        if created and summary["levelUp"] and request.user.role == User.ROLE_STUDENT:
            notify_level_up(request.user, summary["levelUp"])
        return Response({
            "correct": True,
            "xpGained": DAILY_CHALLENGE_XP if created else 0,
            "explanation": challenge.explanation,
            "progress": summary,
        })


# ─── Charte de l'apprenant ────────────────────────────────────────────────────

MAX_CHARTER_RULE_ID = 20


class CharterSerializer(serializers.Serializer):
    checked = serializers.ListField(
        child=serializers.IntegerField(min_value=0, max_value=MAX_CHARTER_RULE_ID), max_length=MAX_CHARTER_RULE_ID + 1,
    )


class CharterView(APIView):
    permission_classes = [IsAuthenticated]

    @staticmethod
    def _checked(user):
        return sorted(CharterCheck.objects.filter(user=user).values_list('rule_id', flat=True))

    def get(self, request):
        child_id = request.query_params.get('child_id')
        if child_id is None:
            return Response({"checked": self._checked(request.user)})

        # Un parent peut consulter la charte de ses enfants (mode visiteur).
        child_pk = parse_id(child_id)
        child = User.objects.filter(id=child_pk, parent=request.user).first() if child_pk is not None else None
        if child is None:
            return Response({"error": "Enfant introuvable."}, status=status.HTTP_404_NOT_FOUND)
        return Response({"checked": self._checked(child)})

    def put(self, request):
        serializer = CharterSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({"error": first_error(serializer.errors)}, status=status.HTTP_400_BAD_REQUEST)

        wanted = set(serializer.validated_data['checked'])
        with transaction.atomic():
            CharterCheck.objects.filter(user=request.user).exclude(rule_id__in=wanted).delete()
            existing = set(CharterCheck.objects.filter(user=request.user).values_list('rule_id', flat=True))
            CharterCheck.objects.bulk_create(
                [CharterCheck(user=request.user, rule_id=rule_id) for rule_id in wanted - existing]
            )
        return Response({"checked": self._checked(request.user)})
