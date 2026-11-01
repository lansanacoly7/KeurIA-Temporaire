import logging
import re
from datetime import timedelta

from concurrent.futures import ThreadPoolExecutor
from django.conf import settings
from django.db import transaction
from django.db.models import Avg, Count, Sum
from django.utils import timezone
from rest_framework import serializers, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from apps.accounts.models import User
from apps.accounts.parsing import parse_id
from apps.accounts.permissions import IsParent, IsParentOrTeacher
from apps.accounts.serializers import first_error
from apps.learners.models import AGE_TRACKS, LearnerProfile

from apps.curriculum.models import Activity, Lesson

from .levels import LEVEL_TIERS, level_info
from .mailing import email_parent_of_event
from .parental import SCREEN_TIME_REQUEST, screen_time_block
from .push import push_parent_of_event
from .models import (DailyUsage, EarnedReward, LearnerStats, ParentNotification,
                     Progress, QuizAttempt, lesson_progress)
from .xp import activity_xp, record_xp, total_xp as user_total_xp, xp_summary


# ─── Helpers ─────────────────────────────────────────────────────────────────

BADGES_DEFINITIONS = [
    {"id": "b_tuto", "emoji": "🦁", "label": "Bienvenu au club", "description": "A terminé le tutoriel d'accueil avec Palou !", "type": "tutorial"},
    {"id": "b_start", "emoji": "🚀", "label": "En route", "description": "A obtenu ses premiers XP : son parcours a commencé !", "type": "xp", "threshold": 1},
    {"id": "b_contact", "emoji": "🤖", "label": "Premier contact", "description": "A terminé son premier cours (cours 1 du module 1) !", "type": "first_lesson"},
    {"id": "b_detective", "emoji": "🕵️", "label": "Détective Palou", "description": "A trouvé toutes les bonnes réponses 3 fois d'affilée !", "type": "perfect_streak"},
    {"id": "b_hidden_friend", "emoji": "🦁", "label": "Ami de Palou", "description": "S'est connecté 7 jours d'affilée avec Palou !", "type": "streak", "threshold": 7},
    {"id": "b_sort", "emoji": "🧩", "label": "Expert du tri", "description": "A réussi plusieurs activités de classement.", "type": "lessons", "threshold": 6},
    {"id": "b_lynx", "emoji": "👀", "label": "Œil de Lynx", "description": "A repéré les différences et les erreurs.", "type": "xp", "threshold": 150},
    {"id": "b_guard", "emoji": "🛡️", "label": "Petit Gardien", "description": "A appris à protéger ses informations.", "type": "lessons", "threshold": 8},
    {"id": "b_secret", "emoji": "🔒", "label": "Mes infos, mes secrets", "description": "A compris quelles informations doivent rester privées.", "type": "xp", "threshold": 300},
    {"id": "b_persist", "emoji": "🔥", "label": "Je n'abandonne pas", "description": "A continué après 20 erreurs sans abandonner !", "type": "errors", "threshold": 20},
    {"id": "b_eye", "emoji": "👀", "label": "L'Œil Curieux", "description": "A découvert sa première IA.", "type": "lessons", "threshold": 2},
    {"id": "b_brain", "emoji": "🧠", "label": "Petit Apprenti", "description": "A compris comment une IA apprend avec des exemples.", "type": "lessons", "threshold": 4},
]


def compute_badges(total_xp: int, lessons_count: int, target_user=None, streak: int = 0, completed_lessons: list = None) -> list:
    earned = []
    completed_lessons = completed_lessons or []
    has_first_lesson = any(lesson in ["p1-1", "a1-1", "c1-1"] or lesson.endswith("-1") for lesson in completed_lessons) or lessons_count >= 1

    stats = None
    has_perfect_streak = False
    has_persisted = False
    if target_user:
        stats, _ = LearnerStats.objects.get_or_create(user=target_user)
        recent_scores = list(QuizAttempt.objects.filter(user=target_user).order_by('-created_at').values_list('score', flat=True)[:3])
        if len(recent_scores) >= 3 and all(s >= 100 for s in recent_scores):
            has_perfect_streak = True
        if stats.perfect_streak >= 3:
            has_perfect_streak = True
        if stats.error_count >= 20:
            has_persisted = True

    # Badges déjà enregistrés en base pour cet utilisateur
    already_saved_badge_ids = set()
    if target_user:
        already_saved_badge_ids = set(
            EarnedReward.objects.filter(user=target_user, reward_type=EarnedReward.REWARD_BADGE).values_list('reward_id', flat=True)
        )

    newly_earned = []
    for badge in BADGES_DEFINITIONS:
        b_id = badge["id"]
        is_earned = b_id in already_saved_badge_ids
        if not is_earned:
            if b_id == "b_tuto":
                is_earned = bool(target_user and target_user.tutorial_completed)
            elif b_id == "b_start":
                is_earned = total_xp > 0
            elif b_id == "b_contact":
                is_earned = has_first_lesson
            elif b_id == "b_hidden_friend":
                is_earned = streak >= 7
            elif b_id == "b_detective":
                is_earned = has_perfect_streak
            elif b_id == "b_persist":
                is_earned = has_persisted
            elif badge["type"] == "xp":
                is_earned = total_xp >= badge.get("threshold", 1)
            elif badge["type"] == "lessons":
                is_earned = lessons_count >= badge.get("threshold", 1)

        # Enregistrement permanent si acquis
        if is_earned and target_user and b_id not in already_saved_badge_ids:
            newly_earned.append(EarnedReward(
                user=target_user, event_key=f"badge_anim_{b_id}",
                reward_type=EarnedReward.REWARD_BADGE, reward_id=b_id,
            ))

        earned.append({**badge, "earned": is_earned})
    if newly_earned:
        # Une seule requête ; l'unicité (user, event_key) rend l'opération idempotente en cas de concurrence.
        EarnedReward.objects.bulk_create(newly_earned, ignore_conflicts=True)
    return earned


_notify_pool = ThreadPoolExecutor(max_workers=getattr(settings, 'NOTIFY_WORKERS', 4), thread_name_prefix='keuria-notify')


_logger = logging.getLogger(__name__)


def dispatch_parent_notifications(parent, child, event_type: str, payload: dict):
    """Distribue les e-mails et pushs aux parents en arrière-plan pour ne jamais ralentir l'enfant."""
    def _deliver():
        try:
            email_parent_of_event(parent, child, event_type, payload)
            push_parent_of_event(parent, child, event_type, payload)
        except Exception:
            # Ne jamais laisser une erreur d'envoi (SMTP/Web Push) tuer le fil ni planter la requête enfant.
            _logger.exception("Échec de l'envoi d'une notification parentale (%s)", event_type)

    if not getattr(settings, 'ASYNC_NOTIFICATIONS', True):
        _deliver()
    else:
        try:
            _notify_pool.submit(_deliver)
        except RuntimeError:
            _deliver()


def create_notifications_for_event(child, event_type: str, payload: dict):
    """Crée une notification pour chaque parent/enseignant lié à l'enfant."""
    parents = []
    if child.parent:
        parents.append(child.parent)
    # Les enseignants qui ont inscrit cet enfant (via learner ou admin)
    # Pour l'instant on ne gère que le parent direct
    for parent in parents:
        ParentNotification.objects.create(
            parent=parent,
            child=child,
            notif_type=event_type,
            payload=payload
        )
        dispatch_parent_notifications(parent, child, event_type, payload)


def notify_level_up(user, level: dict):
    """Prévient le parent qu'un palier vient d'être franchi (`level` = résultat de level_info)."""
    create_notifications_for_event(user, 'level_up', {
        "type": "level",
        "category": "level",
        "title": f"Nouveau palier atteint : {level['name']}",
        "message": f"Félicitations ! {user.display_name} est devenu(e) « {level['name']} » grâce à ses efforts réguliers.",
        "newLevel": level['level'],
        "levelName": level['name'],
        "childName": user.display_name
    })


def resolve_target_user(user, raw_child_id):
    """Compte visé par une requête : soi-même, ou l'enfant d'un parent (un admin peut viser n'importe qui).

    `raw_child_id` vient du navigateur : une valeur absente ou non numérique vise simplement soi-même."""
    if raw_child_id in (None, '') or not (user.role in ('parent', 'admin') or user.is_staff):
        return user
    child_id = parse_id(raw_child_id)
    if child_id is None:
        return user
    found = User.objects.filter(id=child_id, parent=user).first()
    if not found and (user.role == 'admin' or user.is_staff):
        found = User.objects.filter(id=child_id).first()
    return found or user


# ─── Progress ─────────────────────────────────────────────────────────────────

MAX_STARS = 3
DAILY_CHALLENGE_XP = 20
RIDDLE_XP = 10


class ProgressInputSerializer(serializers.Serializer):
    """L'XP n'est pas dans ce contrat : le serveur la lit dans son catalogue (voir xp.py)."""
    lessonId = serializers.CharField(max_length=100)
    age = serializers.ChoiceField(choices=AGE_TRACKS, required=False, default='10-12')
    score = serializers.IntegerField(min_value=0, max_value=100, required=False, default=100)
    stars = serializers.IntegerField(min_value=0, max_value=MAX_STARS, required=False, default=0)


class ProgressView(APIView):
    permission_classes = [IsAuthenticated]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'activity'

    def get(self, request):
        user = request.user
        target_user = resolve_target_user(user, request.query_params.get('child_id'))

        all_progress = Progress.objects.filter(user=target_user)
        progress_items = lesson_progress(all_progress)
        completed_lessons = list(progress_items.values_list('lesson_id', flat=True))
        lesson_stars = dict(progress_items.filter(stars__gt=0).values_list('lesson_id', 'stars'))
        total_xp = all_progress.aggregate(Sum('xp'))['xp__sum'] or 0

        # Seule la personne concernée « se connecte » : un parent qui consulte la progression
        # de son enfant ne doit ni compter comme une connexion de l'enfant ni modifier sa série.
        if target_user.id == user.id:
            streak = target_user.record_connection_and_get_streak()
        else:
            streak = target_user.get_streak()
        badges = compute_badges(total_xp, len(completed_lessons), target_user=target_user, streak=streak, completed_lessons=completed_lessons)
        is_tuto_done = bool(target_user.tutorial_completed or total_xp > 0 or len(completed_lessons) > 0)
        is_own_view = target_user.id == user.id

        # Toutes les récompenses de la personne sont lues en UNE requête (et non une par badge/palier), puis les
        # célébrations à marquer comme vues sont écrites en groupe.
        now = timezone.now()
        rewards = {r.event_key: r for r in EarnedReward.objects.filter(user=target_user)}
        seen_events = [key for key, r in rewards.items() if r.seen_at]
        to_create, to_mark_seen = [], []

        def mark_seen(event_key, reward_type, reward_id):
            """Ne rejouera plus l'animation : crée la récompense vue, ou marque vue celle qui existe."""
            reward = rewards.get(event_key)
            if reward is None:
                to_create.append(EarnedReward(user=target_user, event_key=event_key, reward_type=reward_type,
                                              reward_id=reward_id, seen_at=now))
            elif not reward.seen_at:
                reward.seen_at = now
                to_mark_seen.append(reward)
            if event_key not in seen_events:
                seen_events.append(event_key)

        # Lecture seule pour un parent qui consulte son enfant : il ne doit pas « consommer » ses célébrations.
        # Les badges/paliers déjà acquis sont marqués vus pour ne jamais être re-célébrés à une connexion ultérieure
        # (le palier de départ n'a pas d'animation).
        current_level = level_info(total_xp)
        if is_own_view:
            if is_tuto_done:
                mark_seen("tuto_done", EarnedReward.REWARD_TUTORIAL, 'tutorial')
            for b in badges:
                if b['earned']:
                    mark_seen(f"badge_anim_{b['id']}", EarnedReward.REWARD_BADGE, b['id'])
            for tier in LEVEL_TIERS:
                if 1 < tier["level"] <= current_level["level"]:
                    mark_seen(f"level_anim_{tier['name']}", EarnedReward.REWARD_LEVEL, tier['name'])
            if to_create:
                EarnedReward.objects.bulk_create(to_create, ignore_conflicts=True)
            if to_mark_seen:
                EarnedReward.objects.bulk_update(to_mark_seen, ['seen_at'])
        stats, _ = LearnerStats.objects.get_or_create(user=target_user)
        total_stars = sum(lesson_stars.values()) if lesson_stars else 0
        # Temps réellement passé dans l'application (minutes de présence, hors forfaits d'activité).
        recorded_minutes = DailyUsage.objects.filter(user=target_user).aggregate(Sum('presence_minutes'))['presence_minutes__sum'] or 0

        return Response({
            "progress": {
                "xp": total_xp,
                "level": current_level,
                "completedLessons": completed_lessons,
                "lessonStars": lesson_stars,
                "totalStars": total_stars,
                "totalMinutes": recorded_minutes,
                "ageTrack": LearnerProfile.objects.filter(learner=target_user).values_list('age_track', flat=True).first(),
                "streak": streak,
                "badges": [b['id'] for b in badges if b['earned']],
                "seenEvents": seen_events,
                "tutorialCompleted": is_tuto_done,
                "errorCount": stats.error_count,
                "perfectStreak": stats.perfect_streak,
                "userId": target_user.id,
                "displayName": target_user.display_name,
            }
        })

    def post(self, request):
        user = request.user
        if not user.is_authenticated:
            return Response({"error": "Utilisateur non connecté."}, status=status.HTTP_401_UNAUTHORIZED)

        blocked = screen_time_block(user)
        if blocked:
            return blocked

        serializer = ProgressInputSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({"error": first_error(serializer.errors)}, status=status.HTTP_400_BAD_REQUEST)
        data = serializer.validated_data
        lesson_id, score, stars = data['lessonId'], data['score'], data['stars']

        # L'XP est décidée par le serveur (catalogue), jamais par le navigateur.
        gained_xp = activity_xp(lesson_id)
        if gained_xp is None:
            return Response({"error": "Activité inconnue."}, status=status.HTTP_400_BAD_REQUEST)

        # Un élève ne gagne d'XP que sur les leçons de SON parcours : le verrouillage des autres tranches d'âge
        # n'est pas qu'un affichage, il est aussi imposé ici.
        lesson_track = Lesson.objects.filter(lesson_id=lesson_id).values_list('module__track__key', flat=True).first()
        if not lesson_track:
            import re
            if re.match(r'^ep\d+-\d+$', lesson_id):
                lesson_track = '7-9-ecole'
            elif re.match(r'^p\d+-\d+$', lesson_id):
                lesson_track = '7-9'
            elif re.match(r'^ea\d+-\d+$', lesson_id):
                lesson_track = '10-12-ecole'
            elif re.match(r'^a\d+-\d+$', lesson_id):
                lesson_track = '10-12'
            elif re.match(r'^ec\d+-\d+$', lesson_id):
                lesson_track = '13-15-ecole'
            elif re.match(r'^c\d+-\d+$', lesson_id):
                lesson_track = '13-15'
        has_age = bool((hasattr(user, 'learner_profile') and getattr(user.learner_profile, 'age_track', None)) or getattr(user, 'age_group', None))
        from apps.curriculum.tracks import track_for
        assigned_track = track_for(user) if has_age else None
        if lesson_track and assigned_track and lesson_track != assigned_track:
            return Response({"error": "Cette leçon n'appartient pas à ton parcours."}, status=status.HTTP_403_FORBIDDEN)
        # Dès qu'un utilisateur enregistre une activité, le tutoriel est définitivement validé
        if not user.tutorial_completed:
            user.tutorial_completed = True
            user.save(update_fields=['tutorial_completed'])

        # XP et leçons avant l'enregistrement
        previous = Progress.objects.filter(user=user)
        prev_total_xp = user_total_xp(user)
        prev_completed_lessons = list(lesson_progress(previous).values_list('lesson_id', flat=True))

        obj, created = record_xp(user, lesson_id, gained_xp, age_track=data['age'], score=score, stars=stars)

        if not created:
            changed = []
            if score > obj.score:
                obj.score = score
                changed.append('score')
            if stars > obj.stars:
                obj.stars = stars
                changed.append('stars')
            if changed:
                obj.save(update_fields=changed)
            # RÈGLE ABSOLUE : une récompense déjà acquise ne peut être reçue à nouveau.
            return Response(
                {"ok": True, "xp_gained": 0, "already_completed": True, "progress": xp_summary(user, prev_total_xp)},
                status=status.HTTP_200_OK,
            )

        summary = xp_summary(user, prev_total_xp)

        # ── Notifications post-enregistrement ──────────────────────────────
        if user.role == User.ROLE_STUDENT:
            new_total_xp = summary["xp"]
            new_completed_lessons = prev_completed_lessons + [lesson_id]

            lesson_title = (
                Lesson.objects.filter(lesson_id=lesson_id).values_list('title', flat=True).first()
                or Activity.objects.filter(activity_id=lesson_id).values_list('title', flat=True).first()
                or f"Module {lesson_id}"
            )

            create_notifications_for_event(user, 'lesson_done', {
                "type": "module",
                "category": "module",
                "title": f"Nouveau module terminé : {lesson_title}",
                "message": f"{user.display_name} a terminé avec succès le module « {lesson_title} » avec un score de {score}% (+{gained_xp} XP).",
                "lessonId": lesson_id,
                "lessonName": lesson_title,
                "xpGained": gained_xp,
                "score": score
            })

            if summary["levelUp"]:
                notify_level_up(user, summary["levelUp"])

            prev_badges = compute_badges(prev_total_xp, len(prev_completed_lessons), target_user=user, streak=user.get_streak(), completed_lessons=prev_completed_lessons)
            new_badges = compute_badges(new_total_xp, len(new_completed_lessons), target_user=user, streak=user.get_streak(), completed_lessons=new_completed_lessons)
            for i, badge in enumerate(new_badges):
                if badge['earned'] and not prev_badges[i]['earned']:
                    create_notifications_for_event(user, 'badge', {
                        "type": "badge",
                        "category": "badge",
                        "title": f"Nouveau badge débloqué : {badge['label']}",
                        "message": f"{user.display_name} a brillamment décroché le badge « {badge['label']} » !",
                        "badgeId": badge['id'],
                        "badgeLabel": badge['label'],
                        "badgeEmoji": badge['emoji'],
                        "childName": user.display_name
                    })

        return Response({"ok": True, "xp_gained": gained_xp, "progress": summary}, status=status.HTTP_201_CREATED)


# ─── Daily Usage ──────────────────────────────────────────────────────────────

DAILY_INCREMENTS = {
    # kind: (champ compteur, minutes ajoutées)
    'minute': (None, 1),
    'lesson': ('lessons', 10),
    'quiz': ('quizzes', 5),
    'game': ('games', 15),
}


def usage_payload(usage):
    if usage is None:
        return {"minutes": 0, "lessons": 0, "quizzes": 0, "games": 0}
    return {"minutes": usage.minutes, "lessons": usage.lessons, "quizzes": usage.quizzes, "games": usage.games}


class DailyUsageView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        age_track = request.query_params.get('age', '10-12')
        usage = DailyUsage.objects.filter(user=request.user, usage_date=timezone.localdate(), age_track=age_track).first()
        return Response({"usage": usage_payload(usage)})

    def post(self, request):
        # Un enfant verrouillé ne « joue » plus : son temps d'usage n'augmente pas non plus.
        blocked = screen_time_block(request.user)
        if blocked:
            return blocked

        kind = request.data.get('kind')
        age_track = request.data.get('age', '10-12')
        if kind not in DAILY_INCREMENTS or age_track not in AGE_TRACKS:
            return Response({"error": "Type d'activité ou tranche d'âge invalide."}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            usage, _ = DailyUsage.objects.select_for_update().get_or_create(
                user=request.user,
                usage_date=timezone.localdate(),
                age_track=age_track,
                defaults={'owner_email': request.user.email},
            )
            counter, minutes = DAILY_INCREMENTS[kind]
            if counter:
                setattr(usage, counter, getattr(usage, counter) + 1)
            else:
                usage.presence_minutes += 1  # battement de présence : une minute réellement passée dans l'application
            usage.minutes += minutes
            usage.save()

        return Response({"ok": True, "usage": usage_payload(usage)})


WEEKS_SHOWN = 4


def time_spent_payload(child, today) -> dict:
    """Temps réellement passé dans l'application (minutes de présence) : aujourd'hui, 7 derniers jours, semaines, total."""
    per_day = {}
    for usage_date, minutes in DailyUsage.objects.filter(user=child).values_list('usage_date', 'presence_minutes'):
        per_day[usage_date] = per_day.get(usage_date, 0) + minutes

    week_start = today - timedelta(days=today.weekday())  # lundi de la semaine en cours
    weeks = []
    for i in range(WEEKS_SHOWN - 1, -1, -1):
        start = week_start - timedelta(weeks=i)
        weeks.append({
            "start": start.isoformat(),
            "minutes": sum(per_day.get(start + timedelta(days=d), 0) for d in range(7)),
        })
    return {
        "totalMinutes": sum(per_day.values()),
        "todayMinutes": per_day.get(today, 0),
        "weekMinutes": weeks[-1]["minutes"],
        "days": [{"date": (today - timedelta(days=i)).isoformat(), "minutes": per_day.get(today - timedelta(days=i), 0)}
                 for i in range(6, -1, -1)],
        "weeks": weeks,
        "since": min(per_day).isoformat() if per_day else None,
    }


# ─── Parent Tracking (enrichi) ────────────────────────────────────────────────

ENGAGEMENT_WINDOW_DAYS = 28


def pedagogy_payload(child, progress_items, today) -> dict:
    """Indicateurs pédagogiques calculés uniquement à partir des données enregistrées."""
    since = today - timedelta(days=ENGAGEMENT_WINDOW_DAYS - 1)

    active_days = set(
        progress_items.filter(completed_at__date__gte=since).values_list('completed_at__date', flat=True)
    )
    minutes_by_day, presence_by_day = {}, {}
    for usage_date, minutes, presence in DailyUsage.objects.filter(user=child, usage_date__gte=since).values_list(
            'usage_date', 'minutes', 'presence_minutes'):
        minutes_by_day[usage_date] = minutes_by_day.get(usage_date, 0) + minutes
        presence_by_day[usage_date] = presence_by_day.get(usage_date, 0) + presence
    active_days |= {day for day, minutes in minutes_by_day.items() if minutes > 0}
    # Temps moyen : minutes réellement passées dans l'application (les forfaits d'activité n'y comptent pas).
    studied_days = [m for m in presence_by_day.values() if m > 0]

    last_progress = progress_items.order_by('-completed_at').values_list('completed_at', flat=True).first()

    by_module = {}
    lessons = Lesson.objects.filter(
        lesson_id__in=progress_items.values_list('lesson_id', flat=True)
    ).select_related('module')
    scores = dict(progress_items.values_list('lesson_id', 'score'))
    for lesson in lessons:
        entry = by_module.setdefault(lesson.module_id, {
            "id": lesson.module.world_id, "title": lesson.module.title, "icon": lesson.module.icon,
            "scores": [], "done": 0,
        })
        entry["scores"].append(scores[lesson.lesson_id])
        entry["done"] += 1
    totals = dict(
        Lesson.objects.filter(module_id__in=by_module.keys()).values_list('module_id').annotate(n=Count('id'))
    )
    modules = [
        {
            "id": m["id"], "title": m["title"], "icon": m["icon"],
            "avgScore": round(sum(m["scores"]) / len(m["scores"])),
            "done": m["done"], "total": totals.get(module_id, m["done"]),
        }
        for module_id, m in by_module.items()
    ]
    modules.sort(key=lambda m: m["avgScore"], reverse=True)

    return {
        "windowDays": ENGAGEMENT_WINDOW_DAYS,
        "activeDays": len(active_days),
        "sessionsPerWeek": round(len(active_days) / (ENGAGEMENT_WINDOW_DAYS / 7), 1),
        "avgMinutesPerActiveDay": round(sum(studied_days) / len(studied_days)) if studied_days else None,
        "lastActivityAt": last_progress.isoformat() if last_progress else None,
        "quizAttempts": QuizAttempt.objects.filter(user=child).count(),
        "modules": modules,
    }


def get_child_ranking(child, total_xp: int = 0) -> dict:
    from .leaderboard import (
        rank_students, standing, _own_track, _independent_students,
        STUDENT_ROLES, TRACK_LABELS, PERIOD_LABELS, DEFAULT_BADGE,
        get_rank_badge, public_name, initials_of
    )
    try:
        if getattr(child, 'school_id', None):
            scope = 'school'
            scope_label = child.school.name if getattr(child, 'school', None) else "Son école"
            participants = User.objects.filter(school_id=child.school_id, role__in=STUDENT_ROLES, is_active=True)
        else:
            track = _own_track(child)
            scope = 'global'
            scope_label = f"Promotion {TRACK_LABELS.get(track, track)}"
            participants = _independent_students(track)

        entries = rank_students(participants.values('id'), 'weekly')
        my_standing = standing(entries, child.id)
        period = 'weekly'

        if not my_standing and total_xp > 0:
            entries = rank_students(participants.values('id'), 'all_time')
            my_standing = standing(entries, child.id)
            period = 'all_time'

        total_participants = len(entries)

        if my_standing:
            rank = my_standing['rank']
            badge = my_standing['badge']
            xp_earned = my_standing['xpEarned']
            xp_to_next = my_standing.get('xpToNextRank', 0)
        else:
            rank = total_participants + 1 if total_participants > 0 else 1
            badge = DEFAULT_BADGE
            xp_earned = 0
            xp_to_next = 20

        podium = []
        for i, e in enumerate(entries[:3]):
            name = public_name(e.get('display_name'))
            podium.append({
                "position": i + 1,
                "rank": e.get('rank', i + 1),
                "displayName": name,
                "initials": initials_of(name),
                "xp": e.get('xp', 0),
                "badge": get_rank_badge(e.get('rank', i + 1)),
                "isMe": e.get('user_id') == child.id
            })

        return {
            "rank": rank,
            "totalParticipants": total_participants,
            "badge": badge,
            "xpEarned": xp_earned,
            "xpToNextRank": xp_to_next,
            "scope": scope,
            "scopeLabel": scope_label,
            "period": period,
            "periodLabel": PERIOD_LABELS.get(period, '7 derniers jours'),
            "podium": podium,
        }
    except Exception as exc:
        logging.getLogger(__name__).warning("Erreur calcul ranking enfant: %s", exc)
        return {
            "rank": 1,
            "totalParticipants": 1,
            "badge": {"id": "explorateur", "label": "Explorateur Actif", "tier": "teal"},
            "xpEarned": total_xp,
            "xpToNextRank": 0,
            "scope": "global",
            "scopeLabel": "Explorateurs",
            "period": "weekly",
            "periodLabel": "7 derniers jours",
            "podium": [],
        }


class ParentTrackingView(APIView):
    permission_classes = [IsParent]

    def get(self, request):
        from apps.accounts.retention import purge_expired_child_deletions
        purge_expired_child_deletions()

        tracking_data = []
        today = timezone.localdate()

        for child in request.user.children.filter(deleted_at__isnull=True):
            all_progress = Progress.objects.filter(user=child)
            progress_items = lesson_progress(all_progress)
            completed_lessons = list(progress_items.values_list('lesson_id', flat=True))
            total_xp = all_progress.aggregate(Sum('xp'))['xp__sum'] or 0

            badges = compute_badges(total_xp, len(completed_lessons), target_user=child, streak=child.get_streak(), completed_lessons=completed_lessons)
            quiz_avg = QuizAttempt.objects.filter(user=child).aggregate(Avg('score'))['score__avg']
            daily_usage = DailyUsage.objects.filter(user=child, usage_date=today).first()
            last_lesson = progress_items.order_by('-completed_at').values_list('lesson_id', flat=True).first()
            ranking = get_child_ranking(child, total_xp)

            tracking_data.append({
                "id": child.id,
                "displayName": child.display_name,
                "email": child.email,
                "xp": total_xp,
                "level": level_info(total_xp),
                "completedLessons": completed_lessons,
                "lastLesson": last_lesson,
                "badges": badges,
                "earnedBadges": [b for b in badges if b['earned']],
                "ranking": ranking,
                "comprehensionRate": round(quiz_avg) if quiz_avg is not None else None,
                "todayUsage": usage_payload(daily_usage),
                "timeSpent": time_spent_payload(child, today),
                "totalLessons": len(completed_lessons),
                "streak": child.get_streak() if hasattr(child, 'get_streak') else 1,
                "pedagogy": pedagogy_payload(child, progress_items, today),
            })

        return Response({"tracking": tracking_data})


# ─── Notifications Parent & Exploits ──────────────────────────────────────────

EMOJI_PATTERN = re.compile(
    r'[\U00010000-\U0010ffff\u2600-\u27bf\u2b50\u2b55\u231a\u231b\u23e9-\u23ec\u23f0-\u23f3\u25b6\u2705\u274c\u2714\u2716\u2728\ufe0e\ufe0f]+',
    flags=re.UNICODE
)


def strip_emojis(text: str) -> str:
    if not text:
        return ""
    clean = EMOJI_PATTERN.sub('', text)
    clean = re.sub(r' +', ' ', clean)
    return clean.strip()


def lesson_titles(lesson_ids) -> dict:
    """Titres réels des leçons (une seule requête pour toute une page de notifications)."""
    return dict(Lesson.objects.filter(lesson_id__in=set(lesson_ids)).values_list('lesson_id', 'title'))


def tier_name(level):
    return next((t['name'] for t in LEVEL_TIERS if t['level'] == level), None)


def enrich_notification(n, titles=None):
    """Ajoute à la notification une catégorie, un titre et un message lisibles.

    Rien n'est inventé : quand une donnée manque dans l'événement enregistré, le texte l'omet
    au lieu de la remplacer par une valeur d'exemple.
    """
    titles = titles or {}
    payload = dict(n.payload or {})
    child_name = n.child.display_name if n.child else "Ton enfant"
    notif_type = n.notif_type
    req_type = payload.get('type') or payload.get('category')

    if req_type == SCREEN_TIME_REQUEST or notif_type == SCREEN_TIME_REQUEST:
        category = 'screen_time_request'
        category_label = 'Demande +15 min'
        raw_title = payload.get('title') or "Demande de temps supplémentaire"
        raw_message = payload.get('message') or "« S'il te plaît, puis-je avoir un peu plus de temps pour terminer ? »"
    elif notif_type == 'badge' or req_type == 'badge' or 'badgeId' in payload or 'badgeLabel' in payload or 'badgeName' in payload:
        category = 'badge'
        category_label = 'Nouveau badge'
        badge_name = payload.get('badgeLabel') or payload.get('badgeName')
        raw_title = payload.get('title') or (f"Badge débloqué : « {badge_name} »" if badge_name else "Nouveau badge débloqué")
        raw_message = payload.get('message') or (f"{child_name} a remporté le badge « {badge_name} »." if badge_name else f"{child_name} a remporté un nouveau badge.")
    elif notif_type == 'level_up' or req_type == 'level' or 'newLevel' in payload:
        category = 'level'
        category_label = 'Nouveau palier'
        name = payload.get('levelName') or tier_name(payload.get('newLevel') or payload.get('level'))
        raw_title = payload.get('title') or (f"Nouveau palier atteint : {name}" if name else "Nouveau palier atteint")
        raw_message = payload.get('message') or (f"{child_name} est devenu(e) « {name} »." if name else f"{child_name} vient de franchir un nouveau palier.")
    elif notif_type == 'new_title' or req_type == 'new_title' or 'titleName' in payload:
        category = 'new_title'
        category_label = 'Nouveau titre'
        title_name = payload.get('titleName')
        raw_title = payload.get('title') or (f"Nouveau titre honorifique : « {title_name} »" if title_name else "Nouveau titre honorifique")
        raw_message = payload.get('message') or (f"{child_name} a reçu le titre de « {title_name} »." if title_name else f"{child_name} a reçu un nouveau titre.")
    elif notif_type == 'streak' or req_type == 'streak' or 'streakDays' in payload:
        category = 'streak'
        category_label = 'Série de connexion'
        days = payload.get('streakDays')
        raw_title = payload.get('title') or (f"Série active : {days} jours consécutifs !" if days else "Série de connexion")
        raw_message = payload.get('message') or (f"{child_name} maintient sa série depuis {days} jours d'affilée." if days else f"{child_name} se connecte régulièrement.")
    elif notif_type == 'leaderboard' or req_type == 'leaderboard' or 'rank' in payload:
        category = 'leaderboard'
        category_label = 'Top classement'
        rank = payload.get('rank')
        raw_title = payload.get('title') or (f"Classement : {rank}e place !" if rank else "Nouvelle position au classement")
        raw_message = payload.get('message') or (f"{child_name} est {rank}e au classement." if rank else f"{child_name} a changé de position au classement.")
    elif notif_type == 'vocab_word' or req_type == 'vocab_word' or 'word' in payload:
        category = 'vocab_word'
        category_label = 'Mot de vocabulaire'
        word = payload.get('word')
        raw_title = payload.get('title') or (f"Nouveau concept découvert : « {word} »" if word else "Nouveau mot découvert")
        raw_message = payload.get('message') or (f"{child_name} a découvert la notion de « {word} »." if word else f"{child_name} a découvert un nouveau mot.")
    elif notif_type == 'inactivity' or req_type == 'inactivity' or 'inactiveDays' in payload:
        category = 'inactivity'
        category_label = 'Alerte inactivité'
        days = payload.get('inactiveDays')
        raw_title = payload.get('title') or (f"Alerte : {days} jours d'inactivité" if days else "Alerte d'inactivité")
        raw_message = payload.get('message') or (f"{child_name} ne s'est pas connecté depuis {days} jours." if days else f"{child_name} ne s'est pas connecté récemment.")
    else:
        category = 'module'
        category_label = 'Module terminé'
        lesson_id = payload.get('lessonId')
        lesson_name = payload.get('lessonName') or titles.get(lesson_id) or (f"Module {lesson_id}" if lesson_id else "une activité")
        score, xp = payload.get('score'), payload.get('xpGained')
        details = "".join([f" avec un score de {score}%" if score is not None else "", f" (+{xp} XP)" if xp else ""])
        raw_title = payload.get('title') or f"Module validé : {lesson_name}"
        raw_message = payload.get('message') or f"{child_name} a terminé « {lesson_name} »{details}."

    title = strip_emojis(raw_title)
    message = strip_emojis(raw_message)

    badge_name = payload.get('badgeLabel') or payload.get('badgeName')
    if badge_name:
        badge_name = strip_emojis(badge_name)

    return {
        "id": n.id,
        "type": n.notif_type,
        "category": category,
        "categoryLabel": category_label,
        "title": title,
        "message": message,
        "childName": child_name,
        "childInitial": child_name[0].upper() if child_name else "E",
        "createdAt": n.created_at.isoformat(),
        "isRead": n.is_read,
        "status": payload.get('status', 'pending') if category == 'screen_time_request' else None,
        "extraMinutes": payload.get('extraMinutes', 15) if category == 'screen_time_request' else None,
        "xpGained": payload.get('xpGained'),
        "score": payload.get('score'),
        "rank": payload.get('rank'),
        "streakDays": payload.get('streakDays'),
        "word": payload.get('word'),
        "inactiveDays": payload.get('inactiveDays'),
        "badgeName": badge_name,
        "badgeEmoji": None,
        "payload": payload,
    }


class ParentNotificationsView(APIView):
    permission_classes = [IsParentOrTeacher]

    def get(self, request):
        """Liste les 25 dernières notifications enrichies (exploits, progrès, alertes, demandes)."""
        user = request.user

        notifs = list(ParentNotification.objects.filter(parent=user).select_related('child').order_by('-created_at')[:25])
        titles = lesson_titles(n.payload.get('lessonId') for n in notifs if isinstance(n.payload, dict) and n.payload.get('lessonId'))
        unread_count = ParentNotification.objects.filter(parent=user, is_read=False).count()

        return Response({
            "unreadCount": unread_count,
            "notifications": [enrich_notification(n, titles) for n in notifs]
        })

    def patch(self, request):
        """Marquer toutes les notifications comme lues."""
        ParentNotification.objects.filter(parent=request.user, is_read=False).update(is_read=True)
        return Response({"ok": True})


class TutorialCompleteView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        target_user = resolve_target_user(user, request.data.get('child_id'))

        target_user.tutorial_completed = True
        target_user.save(update_fields=['tutorial_completed'])

        # Enregistrement permanent du tutoriel terminé et du badge Bienvenu au club
        EarnedReward.objects.get_or_create(
            user=target_user,
            event_key="tuto_done",
            defaults={'reward_type': EarnedReward.REWARD_TUTORIAL, 'reward_id': 'tutorial', 'seen_at': timezone.now()}
        )
        EarnedReward.objects.get_or_create(
            user=target_user,
            event_key="badge_anim_b_tuto",
            defaults={'reward_type': EarnedReward.REWARD_BADGE, 'reward_id': 'b_tuto', 'seen_at': timezone.now()}
        )

        return Response({"success": True, "tutorialCompleted": True, "userId": target_user.id})


# Seules les célébrations réellement jouées par l'interface : badge_anim_<badge>, level_anim_<palier>,
# reward_<diplôme> et tuto_done. Toute autre chaîne est refusée (pas de lignes arbitraires en base).
SEEN_EVENT_PATTERN = re.compile(r"^(?:tuto_done|games_tutorial|(?:badge_anim_|level_anim_|reward_)[\w\-.' ’]{1,80})$")


class MarkEventSeenView(APIView):
    """
    Marque un événement/récompense/animation comme vu côté serveur de façon permanente.
    Même si l'enfant change d'appareil ou vide son cache, l'animation ne sera JAMAIS rejouée.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        event = request.data.get('event')
        if not isinstance(event, str) or not SEEN_EVENT_PATTERN.match(event):
            return Response({"error": "Événement inconnu."}, status=status.HTTP_400_BAD_REQUEST)

        reward_type = EarnedReward.REWARD_EVENT
        reward_id = event
        if event.startswith('badge_anim_'):
            reward_type = EarnedReward.REWARD_BADGE
            reward_id = event[len('badge_anim_'):]
        elif event.startswith('reward_'):
            reward_type = EarnedReward.REWARD_DIPLOMA
            reward_id = event[len('reward_'):]
        elif event.startswith('level_anim_'):
            reward_type = EarnedReward.REWARD_LEVEL
            reward_id = event[len('level_anim_'):]
        elif event == 'tuto_done':
            reward_type = EarnedReward.REWARD_TUTORIAL
            reward_id = 'tutorial'
            if not user.tutorial_completed:
                user.tutorial_completed = True
                user.save(update_fields=['tutorial_completed'])

        reward, _ = EarnedReward.objects.get_or_create(
            user=user,
            event_key=event,
            defaults={
                'reward_type': reward_type,
                'reward_id': reward_id,
                'seen_at': timezone.now(),
            }
        )
        if not reward.seen_at:
            reward.seen_at = timezone.now()
            reward.save(update_fields=['seen_at'])

        return Response({"ok": True, "event": event, "seen": True})


MAX_ERRORS_PER_QUIZ = 50  # aucun quiz n'a autant de questions : borne les valeurs absurdes


class RecordActivityView(APIView):
    """
    Enregistre les événements d'activité (erreurs, sans-faute) côté serveur
    pour conserver la progression vers les badges comportementaux quel que soit le device.
    """
    permission_classes = [IsAuthenticated]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'activity'

    def post(self, request):
        user = request.user
        act_type = request.data.get('type')  # 'error' ou 'quiz_result'
        if act_type not in ('error', 'quiz_result'):
            return Response({"error": "Type d'activité inconnu."}, status=status.HTTP_400_BAD_REQUEST)
        stats, _ = LearnerStats.objects.get_or_create(user=user)

        newly_unlocked = []

        if act_type == 'error':
            stats.error_count += 1
            stats.perfect_streak = 0
            stats.save()
            if stats.error_count >= 20:
                rew, created = EarnedReward.objects.get_or_create(
                    user=user,
                    event_key='badge_anim_b_persist',
                    defaults={'reward_type': EarnedReward.REWARD_BADGE, 'reward_id': 'b_persist'}
                )
                if created:
                    newly_unlocked.append('b_persist')

        elif act_type == 'quiz_result':
            is_perfect = request.data.get('isPerfect', False) is True
            raw_errors = request.data.get('errors', 0)
            if isinstance(raw_errors, bool) or not isinstance(raw_errors, int) or not 0 <= raw_errors <= MAX_ERRORS_PER_QUIZ:
                return Response({"error": f"Le nombre d'erreurs doit être compris entre 0 et {MAX_ERRORS_PER_QUIZ}."},
                                status=status.HTTP_400_BAD_REQUEST)
            errors_made = raw_errors
            if errors_made > 0:
                stats.error_count += errors_made
            if is_perfect:
                stats.perfect_streak += 1
                if stats.perfect_streak >= 3:
                    rew, created = EarnedReward.objects.get_or_create(
                        user=user,
                        event_key='badge_anim_b_detective',
                        defaults={'reward_type': EarnedReward.REWARD_BADGE, 'reward_id': 'b_detective'}
                    )
                    if created:
                        newly_unlocked.append('b_detective')
            else:
                stats.perfect_streak = 0
            stats.save()

            if stats.error_count >= 20:
                rew, created = EarnedReward.objects.get_or_create(
                    user=user,
                    event_key='badge_anim_b_persist',
                    defaults={'reward_type': EarnedReward.REWARD_BADGE, 'reward_id': 'b_persist'}
                )
                if created:
                    newly_unlocked.append('b_persist')

        return Response({
            "ok": True,
            "errorCount": stats.error_count,
            "perfectStreak": stats.perfect_streak,
            "newlyUnlocked": newly_unlocked,
        })



