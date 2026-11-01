"""
Classements des apprenants.

Règles de confidentialité (les apprenants sont des mineurs) :
  - un élève rattaché à une école n'est classé qu'au sein de son établissement ;
  - le classement général ne contient que les élèves sans école, par parcours d'âge ;
  - aucun classement n'est public, et l'école n'est jamais affichée ;
  - seuls les élèves ayant gagné de l'XP sur la période sont classés.
La direction et les enseignants consultent le classement de leur établissement via
les services de l'app `scolaire`, qui réutilisent `rank_students`.
"""
from datetime import timedelta

from django.db.models import Count, Q, Sum
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.models import User
from apps.learners.models import AGE_TRACKS, LearnerProfile

from .levels import level_info
from .models import Progress
from .models import DAILY_CHALLENGE_PREFIX, RIDDLE_PREFIX

STUDENT_ROLES = ('eleve', 'enfant')
DEFAULT_AGE_TRACK = '10-12'
MAX_ENTRIES = 100
NEAR_WINDOW = 3  # élèves affichés au-dessus et en dessous de moi dans la vue « proche de moi »

PERIOD_DAYS = {'weekly': 7, 'monthly': 30, 'all_time': None}
PERIOD_LABELS = {'weekly': '7 derniers jours', 'monthly': '30 derniers jours', 'all_time': 'Depuis le début'}
TRACK_LABELS = {'7-9': '7–9 ans', '10-12': '10–12 ans', '13-15': '13–15 ans'}

BADGES = (
    (1, {"id": "champion_gold", "label": "Champion d'Or", "emoji": "🏆", "tier": "gold", "color": "#D97706", "bg": "#FEF3C7", "border": "#FDE68A"}),
    (2, {"id": "dauphin_silver", "label": "Dauphin d'Argent", "emoji": "🥈", "tier": "silver", "color": "#475569", "bg": "#F1F5F9", "border": "#E2E8F0"}),
    (3, {"id": "virtuoso_bronze", "label": "Virtuose de Bronze", "emoji": "🥉", "tier": "bronze", "color": "#C2410C", "bg": "#FFEDD5", "border": "#FED7AA"}),
    (10, {"id": "top_10", "label": "Top 10 Élite", "emoji": "🎖️", "tier": "emerald", "color": "#0D846E", "bg": "#ECFDF5", "border": "#A7F3D0"}),
    (25, {"id": "challenger", "label": "Challenger Élite", "emoji": "⚡", "tier": "blue", "color": "#2563EB", "bg": "#EFF6FF", "border": "#BFDBFE"}),
    (50, {"id": "etoile", "label": "Étoile Montante", "emoji": "🚀", "tier": "purple", "color": "#7C3AED", "bg": "#F5F3FF", "border": "#DDD6FE"}),
)
DEFAULT_BADGE = {"id": "explorateur", "label": "Explorateur Actif", "emoji": "🌟", "tier": "teal", "color": "#0F766E", "bg": "#F0FDFA", "border": "#CCFBF1"}


def get_rank_badge(rank: int) -> dict:
    for max_rank, badge in BADGES:
        if rank <= max_rank:
            return badge
    return DEFAULT_BADGE


def public_name(display_name) -> str:
    """Prénom + initiale : les classements concernent des mineurs."""
    parts = (display_name or '').split()
    if not parts:
        return "Explorateur"
    return f"{parts[0]} {parts[1][0]}." if len(parts) > 1 else parts[0]


def initials_of(name: str) -> str:
    return ''.join(word[0] for word in name.replace('.', '').split())[:2].upper() or '?'


def parse_period(raw) -> str | None:
    """Période demandée (« weekly » par défaut) ; None si elle est inconnue."""
    period = (raw or 'weekly').lower()
    return period if period in PERIOD_DAYS else None


def rank_students(user_ids, period: str, now=None) -> list[dict]:
    """
    Classe les comptes `user_ids` selon l'XP gagnée sur la période.

    Seuls les élèves ayant de l'XP sont classés ; à XP égale, le rang est le même
    (1, 2, 2, 4…) et l'ordre d'affichage est alphabétique.
    """
    days = PERIOD_DAYS[period]
    progress = Progress.objects.filter(user__in=user_ids)
    if days is not None:
        progress = progress.filter(completed_at__gte=(now or timezone.now()) - timedelta(days=days))
    rows = list(
        progress.values('user')
        .annotate(xp=Sum('xp'), lessons=Count('id', filter=~Q(lesson_id__startswith=DAILY_CHALLENGE_PREFIX) & ~Q(lesson_id__startswith=RIDDLE_PREFIX)))
        .filter(xp__gt=0)
    )
    names = dict(User.objects.filter(id__in=[r['user'] for r in rows]).values_list('id', 'display_name'))
    entries = sorted(
        ({"user_id": r['user'], "display_name": names.get(r['user'], ''), "xp": r['xp'], "lessons": r['lessons']} for r in rows),
        key=lambda e: (-e['xp'], e['display_name'].lower(), e['user_id']),
    )
    rank, previous_xp = 0, None
    for position, entry in enumerate(entries, start=1):
        if entry['xp'] != previous_xp:
            rank, previous_xp = position, entry['xp']
        entry['rank'] = rank
    return entries


def standing(entries: list[dict], user_id: int) -> dict | None:
    """Position de `user_id` dans le classement, ou None s'il n'y figure pas (aucun XP)."""
    mine = next((e for e in entries if e['user_id'] == user_id), None)
    if mine is None:
        return None
    ahead = [e['xp'] for e in entries if e['xp'] > mine['xp']]
    return {
        "rank": mine['rank'],
        "xpEarned": mine['xp'],
        "badge": get_rank_badge(mine['rank']),
        "xpToNextRank": min(ahead) - mine['xp'] + 1 if ahead else 0,
    }


def profile_extras(user_ids) -> dict[int, dict]:
    """
    Ce qu'on montre de chaque élève dans la fenêtre « aperçu » du classement : son avatar, son niveau et son XP totale.
    Deux requêtes pour toute la liste (jamais une par élève). Aucune donnée personnelle de plus que dans le classement.
    """
    ids = list(user_ids)
    avatars = dict(LearnerProfile.objects.filter(learner_id__in=ids).values_list('learner_id', 'avatar'))
    totals = dict(Progress.objects.filter(user_id__in=ids).values('user_id').annotate(total=Sum('xp')).values_list('user_id', 'total'))
    extras = {}
    for uid in ids:
        total = totals.get(uid) or 0
        extras[uid] = {"avatar": avatars.get(uid), "totalXp": total, "level": level_info(total)}
    return extras


def _own_track(user) -> str:
    profile_track = LearnerProfile.objects.filter(learner=user).values_list('age_track', flat=True).first()
    if profile_track:
        return profile_track
    user_group = getattr(user, 'age_group', None)
    if user_group:
        return user_group
    return DEFAULT_AGE_TRACK


def _independent_students(track: str):
    """Élèves sans école (inscrits par un parent) du parcours `track`."""
    match = Q(learner_profile__age_track=track) | (Q(learner_profile__isnull=True) & Q(age_group=track))
    if track == DEFAULT_AGE_TRACK:
        match |= (Q(learner_profile__isnull=True) & Q(age_group__isnull=True))
    return User.objects.filter(role__in=STUDENT_ROLES, is_active=True, school__isnull=True).filter(match)


class LeaderboardWeeklyView(APIView):
    """
    Classement de l'élève connecté :
      - rattaché à une école → uniquement les élèves de son établissement ;
      - sans école → les élèves sans école de son parcours d'âge.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        if user.role not in STUDENT_ROLES and user.role != User.ROLE_ADMIN:
            return Response({"error": "Le classement est réservé aux élèves."}, status=status.HTTP_403_FORBIDDEN)

        period = parse_period(request.query_params.get('period'))
        if period is None:
            return Response({"error": "Période invalide."}, status=status.HTTP_400_BAD_REQUEST)

        if user.school_id:
            scope, track = 'school', None
            scope_label = "Mon établissement"
            participants = User.objects.filter(school_id=user.school_id, role__in=STUDENT_ROLES, is_active=True)
        else:
            scope = 'global'
            track = request.query_params.get('track')
            if track not in AGE_TRACKS:
                track = _own_track(user)
            scope_label = f"Parcours {TRACK_LABELS[track]}"
            participants = _independent_students(track)

        entries = rank_students(participants.values('id'), period)

        # « general » : le haut du classement ; « near » : les élèves autour de moi (NEAR_WINDOW au-dessus et en dessous),
        # avec leurs vrais rangs, même si je suis hors du top 100. Sans XP sur la période, on n'a pas de voisins.
        view = request.query_params.get('view', 'general')
        if view not in ('general', 'near'):
            return Response({"error": "Vue invalide."}, status=status.HTTP_400_BAD_REQUEST)
        my_index = next((i for i, e in enumerate(entries) if e['user_id'] == user.id), None)
        if view == 'near' and my_index is not None:
            shown = entries[max(0, my_index - NEAR_WINDOW): my_index + NEAR_WINDOW + 1]
        else:
            view, shown = 'general', entries[:MAX_ENTRIES]

        index_of = {id(e): i for i, e in enumerate(entries)}
        extras = profile_extras({e['user_id'] for e in entries[:3]} | {e['user_id'] for e in shown} | {user.id})

        def serialize(index, e):
            name = public_name(e['display_name'])
            return {
                "position": index + 1,  # place dans la liste (les ex æquo partagent le même rang, pas la même position)
                "rank": e['rank'],
                "displayName": name,
                "initials": initials_of(name),
                "xpEarned": e['xp'],
                "badge": get_rank_badge(e['rank']),
                "isMe": e['user_id'] == user.id,
                **extras[e['user_id']],
            }

        current = standing(entries, user.id)
        if current is not None:
            current = {**current, **extras[user.id]}
        return Response({
            "view": view,
            "nearAvailable": my_index is not None,
            "scope": scope,
            "scopeLabel": scope_label,
            "track": track,
            "period": period,
            "periodLabel": PERIOD_LABELS[period],
            "totalParticipants": len(entries),
            "totalXpPeriod": sum(e['xp'] for e in entries),
            # Le podium (3 premières places) est toujours renvoyé, quelle que soit la vue.
            "podium": [serialize(i, e) for i, e in enumerate(entries[:3])],
            "leaderboard": [serialize(index_of[id(e)], e) for e in shown],
            "currentUser": current,
        })
