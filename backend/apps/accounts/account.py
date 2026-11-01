"""Droits des personnes sur leurs données : export (accès/portabilité) et suppression du compte.

  - Un parent exporte ses données et celles de ses enfants, et peut supprimer un enfant ou tout le foyer ;
  - un enfant exporte ses propres données mais ne supprime pas son compte (c'est à son parent de le faire) ;
  - les comptes d'école (enseignant, direction, élève rattaché à une école) sont gérés par leur établissement.
La suppression exige le mot de passe (une session volée ne suffit pas) et est limitée comme une connexion.
"""
from django.contrib.auth import logout
from django.contrib.auth.hashers import check_password
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.progress.models import DailyUsage, ParentalLimits, ParentNotification, Progress

from .models import User
from .permissions import IsParent
from .retention import delete_household
from .throttling import LoginLockout, client_ip


def _iso(value):
    return value.isoformat() if value else None


def account_data(user) -> dict:
    """Toutes les données personnelles d'un compte."""
    profile = getattr(user, 'learner_profile', None)
    data = {
        "account": {
            "email": user.email,
            "displayName": user.display_name,
            "role": user.role,
            "createdAt": _iso(user.created_at),
            "termsAcceptedAt": _iso(user.terms_accepted_at),
            "loginCount": user.login_count,
        },
        "learnerProfile": ({"nickname": profile.nickname, "ageTrack": profile.age_track, "avatar": profile.avatar}
                           if profile else None),
        "progress": [
            {"lessonId": p.lesson_id, "xp": p.xp, "score": p.score, "stars": p.stars, "completedAt": _iso(p.completed_at)}
            for p in Progress.objects.filter(user=user).order_by('completed_at')
        ],
        "dailyUsage": [
            {"date": u.usage_date.isoformat(), "minutes": u.minutes, "presenceMinutes": u.presence_minutes,
             "lessons": u.lessons, "quizzes": u.quizzes, "games": u.games}
            for u in DailyUsage.objects.filter(user=user).order_by('usage_date')
        ],
    }
    if user.role == User.ROLE_PARENT:
        data["parentalLimits"] = [
            {"childId": lim.child_id, "strictTimeLimit": lim.strict_time_limit, "dailyLimitMinutes": lim.daily_limit_minutes,
             "bedtimeEnabled": lim.bedtime_enabled, "bedtimeStart": lim.bedtime_start, "bedtimeEnd": lim.bedtime_end,
             "emailNotifications": lim.email_notifications, "weeklyReport": lim.weekly_report, "twoFactor": lim.two_factor, "palouEnabled": lim.palou_enabled}
            for lim in ParentalLimits.objects.filter(parent=user)
        ]
        data["notifications"] = [
            {"type": n.notif_type, "childId": n.child_id, "createdAt": _iso(n.created_at), "content": n.payload}
            for n in ParentNotification.objects.filter(parent=user).order_by('created_at')
        ]
        data["children"] = [account_data(child) for child in user.children.filter(deleted_at__isnull=True).order_by('created_at')]
    return data


class AccountExportView(APIView):
    """GET /api/account/export — téléchargement JSON des données du compte connecté."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        response = Response(account_data(request.user))
        response['Content-Disposition'] = 'attachment; filename="keria-mes-donnees.json"'
        return response


def _confirmed(request, scope_key):
    """None si le mot de passe est bon ; sinon la réponse d'erreur à renvoyer."""
    lockout = LoginLockout(f'{scope_key}:{request.user.id}', client_ip(request), scope='delete')
    if lockout.is_locked():
        return Response({"error": "Trop d'essais. Réessaie dans 15 minutes."}, status=status.HTTP_429_TOO_MANY_REQUESTS)
    password = request.data.get('password')
    if not isinstance(password, str) or not check_password(password, request.user.password):
        lockout.register_failure()
        return Response({"error": "Mot de passe incorrect."}, status=status.HTTP_403_FORBIDDEN)
    lockout.reset()
    return None


class AccountDeleteView(APIView):
    """POST /api/account/delete {password} — supprime le compte parent ET ceux de ses enfants."""

    permission_classes = [IsParent]

    def post(self, request):
        user = request.user
        if user.school_id:
            return Response({"error": "Ce compte dépend d'un établissement : demandez-lui de le supprimer."},
                            status=status.HTTP_403_FORBIDDEN)
        refused = _confirmed(request, 'account')
        if refused:
            return refused
        # La relation parent est PROTECT : les enfants créés par le parent partent d'abord ; un élève relié par le code de son
        # école appartient à l'école : il est détaché, jamais effacé.
        delete_household(user)
        logout(request)
        return Response({"ok": True})


class ChildDeleteView(APIView):
    """POST /api/parent/children/<id>/delete {password} — place un enfant du foyer en attente de suppression (3 jours de grâce pour récupération)."""

    permission_classes = [IsParent]

    def post(self, request, child_id):
        from django.utils import timezone
        from .retention import purge_expired_child_deletions
        purge_expired_child_deletions()

        child = request.user.children.filter(id=child_id, school__isnull=True).first()
        if child is None:
            return Response({"error": "Enfant introuvable."}, status=status.HTTP_404_NOT_FOUND)
        refused = _confirmed(request, 'child')
        if refused:
            return refused
        child.is_active = False
        child.deleted_at = timezone.now()
        child.save(update_fields=['is_active', 'deleted_at'])
        return Response({
            "ok": True,
            "pendingDeletion": True,
            "graceDays": 3,
            "message": f"Le compte de {child.display_name} a été placé en attente de suppression. Vous disposez de 3 jours pour le récupérer."
        })

