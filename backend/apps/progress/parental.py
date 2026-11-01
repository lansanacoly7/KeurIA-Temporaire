"""
Contrôle parental : limites de temps d'écran, demandes de temps et dérogations.

Règles de sécurité :
  - toutes les actions exigent une session ; l'identité (enfant ou parent) vient de cette session,
    jamais d'un identifiant envoyé par le navigateur ;
  - un parent n'agit que sur ses propres enfants ;
  - le mot de passe parent saisi sur l'appareil de l'enfant est protégé contre le bruteforce ;
  - une dérogation est un crédit enregistré en base : le temps réellement joué n'est jamais modifié.
"""
from datetime import timedelta

from django.db import transaction
from django.db.models import Sum
from django.utils import timezone
from rest_framework import serializers, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.models import User
from apps.accounts.parsing import parse_id
from apps.accounts.serializers import first_error
from apps.accounts.throttling import LoginLockout, client_ip

from .mailing import email_parent_of_event
from .push import push_parent_of_event
from .models import DailyUsage, ParentalLimits, ParentNotification, ScreenTimeCredit

DEFAULT_DAILY_LIMIT = 45
DEFAULT_GRANT_MINUTES = 15
MAX_GRANT_MINUTES = 120
REQUEST_COOLDOWN = timedelta(minutes=5)
HHMM = r'^([01]\d|2[0-3]):[0-5]\d$'
SCREEN_TIME_REQUEST = 'screen_time_request'


# ─── Calculs ────────────────────────────────────────────────────────────────────

def is_in_bedtime(bedtime_start: str, bedtime_end: str, now_time=None) -> bool:
    if not bedtime_start or not bedtime_end:
        return False
    if now_time is None:
        now_time = timezone.localtime().time()
    try:
        sh, sm = map(int, bedtime_start.split(':'))
        eh, em = map(int, bedtime_end.split(':'))
        start = timezone.datetime.min.time().replace(hour=sh, minute=sm)
        end = timezone.datetime.min.time().replace(hour=eh, minute=em)
    except ValueError:
        return False
    if start <= end:
        return start <= now_time <= end
    return now_time >= start or now_time <= end  # plage nocturne, ex. 20:00 → 07:00


def get_limits_payload(limits: ParentalLimits | None) -> dict:
    if limits is None:
        return {
            "strictTimeLimit": False,
            "dailyLimitMinutes": DEFAULT_DAILY_LIMIT,
            "bedtimeEnabled": False,
            "bedtimeStart": "20:00",
            "bedtimeEnd": "07:00",
            "emailNotifs": True,
            "pushNotifs": True,
            "weeklyReport": True,
            "twoFactor": False,
            "palouEnabled": False,
        }
    return {
        "strictTimeLimit": limits.strict_time_limit,
        "dailyLimitMinutes": limits.daily_limit_minutes,
        "bedtimeEnabled": limits.bedtime_enabled,
        "bedtimeStart": limits.bedtime_start,
        "bedtimeEnd": limits.bedtime_end,
        "emailNotifs": limits.email_notifications,
        "pushNotifs": limits.push_notifications,
        "weeklyReport": limits.weekly_report,
        "twoFactor": limits.two_factor,
        "palouEnabled": limits.palou_enabled,
        "updatedAt": limits.updated_at.isoformat(),
    }


def limits_for(parent, child) -> ParentalLimits | None:
    """Règle propre à l'enfant, sinon règle « tous les enfants » du foyer."""
    return (ParentalLimits.objects.filter(parent=parent, child=child).first()
            or ParentalLimits.objects.filter(parent=parent, child__isnull=True).first())


def two_factor_enabled_for(parent) -> bool:
    return ParentalLimits.objects.filter(parent=parent, child__isnull=True, two_factor=True).exists()


def palou_allowed(user) -> bool:
    """Le parent autorise-t-il cet enfant à parler à Palou ? Non tant qu'il n'a rien décidé (règle de l'enfant, sinon du foyer).

    Un élève sans parent relié (élève d'école) relève de son établissement : Palou lui reste ouvert."""
    # Élève d'école : les règles de l'école, de la classe (et de la maison s'il a un parent lié) décident (apps.scolaire.restrictions).
    if user.role == User.ROLE_STUDENT and hasattr(user, 'student_profile'):
        from apps.scolaire import restrictions

        return restrictions.effective(user)['palou']['allowed']
    if user.role != User.ROLE_STUDENT or not user.parent_id:
        return True
    limits = limits_for(user.parent, user)
    return False if limits is None else limits.palou_enabled


def minutes_played_today(user) -> int:
    return DailyUsage.objects.filter(user=user, usage_date=timezone.localdate()).aggregate(total=Sum('minutes'))['total'] or 0


def active_credit(child) -> ScreenTimeCredit | None:
    return ScreenTimeCredit.objects.filter(child=child, expires_at__gt=timezone.now()).order_by('-expires_at').first()


def grant_credit(child, granted_by, minutes: int) -> ScreenTimeCredit:
    return ScreenTimeCredit.objects.create(
        child=child, granted_by=granted_by, minutes=minutes, expires_at=timezone.now() + timedelta(minutes=minutes),
    )


def child_lock_status(user) -> dict:
    """État de verrouillage d'un enfant (limite quotidienne, heure du coucher, dérogation en cours)."""
    payload = get_limits_payload(limits_for(user.parent, user) if user.parent_id else None)
    used = minutes_played_today(user)
    credit = active_credit(user)

    bedtime_active = limit_reached = False
    if credit is None:
        bedtime_active = bool(payload["bedtimeEnabled"]) and is_in_bedtime(payload["bedtimeStart"], payload["bedtimeEnd"])
        limit_reached = bool(payload["strictTimeLimit"]) and payload["dailyLimitMinutes"] > 0 and used >= payload["dailyLimitMinutes"]
    is_locked = bedtime_active or limit_reached
    return {
        "limits": payload,
        "minutesUsed": used,
        "remainingMinutes": (max(0, payload["dailyLimitMinutes"] - used)
                             if payload["dailyLimitMinutes"] > 0 and payload["strictTimeLimit"] else None),
        "isLocked": is_locked,
        "lockReason": "bedtime" if bedtime_active else ("limit_exceeded" if limit_reached else None),
        "bedtimeActive": bedtime_active,
        "limitReached": limit_reached,
        "creditExpiresAt": credit.expires_at.isoformat() if credit else None,
    }


def screen_time_block(user):
    """Réponse 423 si l'enfant est verrouillé (limite du jour, heure du coucher) sans dérogation, sinon None.

    La limite n'est pas qu'un écran d'attente dans le navigateur : les endpoints qui donnent de l'XP ou font parler
    l'IA la refusent aussi, sinon un enfant la contournerait en appelant l'API directement.
    """
    if user.role != User.ROLE_STUDENT or not user.parent_id:
        return None
    state = child_lock_status(user)
    if not state['isLocked']:
        return None
    return Response({
        'error': "C'est l'heure de la pause : demande à ton parent pour continuer.",
        'locked': True,
        'lockReason': state['lockReason'],
    }, status=status.HTTP_423_LOCKED)


# ─── Limites ────────────────────────────────────────────────────────────────────

class LimitsInputSerializer(serializers.Serializer):
    strictTimeLimit = serializers.BooleanField(required=False, default=False)
    dailyLimitMinutes = serializers.IntegerField(required=False, default=DEFAULT_DAILY_LIMIT, min_value=0, max_value=1440)
    bedtimeEnabled = serializers.BooleanField(required=False, default=False)
    bedtimeStart = serializers.RegexField(HHMM, required=False, default='20:00',
                                          error_messages={'invalid': "L'heure de début du coucher doit être au format HH:MM."})
    bedtimeEnd = serializers.RegexField(HHMM, required=False, default='07:00',
                                        error_messages={'invalid': "L'heure de fin du coucher doit être au format HH:MM."})
    emailNotifs = serializers.BooleanField(required=False, default=True)
    pushNotifs = serializers.BooleanField(required=False, default=True)
    weeklyReport = serializers.BooleanField(required=False, default=True)
    twoFactor = serializers.BooleanField(required=False, default=False)
    palouEnabled = serializers.BooleanField(required=False, default=False)
    childId = serializers.IntegerField(required=False, allow_null=True, default=None)
    # Exigé pour DÉSACTIVER la double authentification : une session ouverte ne doit pas suffire à l'affaiblir.
    currentPassword = serializers.CharField(required=False, allow_blank=True, write_only=True, trim_whitespace=False)


class ParentalLimitsView(APIView):
    """
    GET  : parent → réglages (+ temps du jour de chaque enfant) ; enfant → son état de verrouillage ;
           visiteur anonyme → « non verrouillé » (l'écran de verrouillage est monté sur toutes les pages).
    POST : parent seulement, pour lui-même (tous les enfants) ou pour un de ses enfants.
    """
    permission_classes = [AllowAny]

    def get(self, request):
        user = request.user
        if not user.is_authenticated:
            return Response({"ok": True, "isLocked": False, "role": "anonymous"})

        if user.role == User.ROLE_PARENT:
            from apps.accounts.retention import purge_expired_child_deletions
            purge_expired_child_deletions()

            child_id = request.query_params.get('childId')
            child_pk = parse_id(child_id)
            child = user.children.filter(id=child_pk, deleted_at__isnull=True).first() if child_pk is not None else None
            limits = ParentalLimits.objects.filter(parent=user, child=child).first()
            if limits is None and child is not None:
                limits = ParentalLimits.objects.filter(parent=user, child__isnull=True).first()
            payload = get_limits_payload(limits)
            payload["twoFactor"] = two_factor_enabled_for(user)  # réglage du compte, pas d'un enfant
            return Response({
                "ok": True,
                "limits": payload,
                "children": [
                    {
                        "id": c.id,
                        "displayName": c.display_name,
                        "todayMinutes": minutes_played_today(c),
                        "schoolId": c.school_id,
                        "isSchoolStudent": bool(c.school_id),
                        "isPendingDeletion": False,
                    }
                    for c in user.children.filter(deleted_at__isnull=True)
                ],
                "pendingDeletionChildren": [
                    {
                        "id": c.id,
                        "displayName": c.display_name,
                        "todayMinutes": minutes_played_today(c),
                        "schoolId": c.school_id,
                        "isSchoolStudent": bool(c.school_id),
                        "isPendingDeletion": True,
                        "deletedAt": c.deleted_at.isoformat() if c.deleted_at else None,
                        "daysRemaining": c.days_until_permanent_deletion,
                    }
                    for c in user.children.filter(deleted_at__isnull=False)
                ],
            })

        state = child_lock_status(user)
        return Response({
            "ok": True,
            "childId": user.id,
            "childName": user.display_name,
            "role": user.role,
            "limits": state["limits"],
            "usageToday": {"minutes": state["minutesUsed"], "remainingMinutes": state["remainingMinutes"]},
            "isLocked": state["isLocked"],
            "lockReason": state["lockReason"],
            "bedtimeActive": state["bedtimeActive"],
            "limitReached": state["limitReached"],
            "creditExpiresAt": state["creditExpiresAt"],
        })

    def post(self, request):
        user = request.user
        if not user.is_authenticated or user.role != User.ROLE_PARENT:
            code = status.HTTP_401_UNAUTHORIZED if not user.is_authenticated else status.HTTP_403_FORBIDDEN
            return Response({"error": "Réservé aux comptes parents."}, status=code)

        serializer = LimitsInputSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({"error": first_error(serializer.errors)}, status=status.HTTP_400_BAD_REQUEST)
        data = serializer.validated_data

        child = None
        if data['childId'] is not None:
            child = user.children.filter(id=data['childId']).first()
            if child is None:
                return Response({"error": "Enfant introuvable dans votre foyer."}, status=status.HTTP_404_NOT_FOUND)

        # La double authentification protège la CONNEXION du parent : elle se règle sur la ligne « tous les enfants »,
        # jamais sur celle d'un enfant (où elle serait affichée comme active sans rien protéger).
        was_two_factor = two_factor_enabled_for(user)
        if was_two_factor and not data['twoFactor']:
            lockout = LoginLockout(f'twofactor:{user.id}', client_ip(request), scope='twofactor')
            if lockout.is_locked():
                return Response({"error": "Trop d'essais. Réessaie dans 15 minutes."}, status=status.HTTP_429_TOO_MANY_REQUESTS)
            if not user.check_password(data.get('currentPassword') or ''):
                lockout.register_failure()
                return Response({"error": "Confirmez votre mot de passe pour désactiver la double authentification.",
                                 "passwordRequired": True}, status=status.HTTP_403_FORBIDDEN)
            lockout.reset()

        limits, _ = ParentalLimits.objects.update_or_create(
            parent=user, child=child,
            defaults={
                'strict_time_limit': data['strictTimeLimit'],
                'daily_limit_minutes': data['dailyLimitMinutes'],
                'bedtime_enabled': data['bedtimeEnabled'],
                'bedtime_start': data['bedtimeStart'],
                'bedtime_end': data['bedtimeEnd'],
                'email_notifications': data['emailNotifs'],
                'push_notifications': data['pushNotifs'],
                'weekly_report': data['weeklyReport'],
                'palou_enabled': data['palouEnabled'],
                **({'two_factor': data['twoFactor']} if child is None else {}),
            },
        )
        if child is not None and data['twoFactor'] != was_two_factor:
            ParentalLimits.objects.update_or_create(parent=user, child=None, defaults={'two_factor': data['twoFactor']})
        payload = get_limits_payload(limits)
        payload["twoFactor"] = data['twoFactor']
        return Response({"ok": True, "message": "Limites et temps d'écran enregistrés avec succès.", "limits": payload})


# ─── Demandes de temps et dérogations ───────────────────────────────────────────

class ParentalUnlockView(APIView):
    """
    POST /api/progress/parental-limits/unlock — l'action dépend du rôle de la session :

    Parent :  {action: "respond_request", notifId, decision: "approved"|"declined"}
              {action: "unlock", childId, extraMinutes?}      (accorde du temps à un de ses enfants)
    Enfant :  {action: "request_time"}                        (demande du temps à son parent)
              {action: "unlock", parentPassword}              (le parent saisit son mot de passe)
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        if user.role == User.ROLE_PARENT:
            return self._as_parent(request)
        if user.role == User.ROLE_STUDENT:
            return self._as_child(request)
        return Response({"error": "Action réservée aux parents et aux enfants."}, status=status.HTTP_403_FORBIDDEN)

    # -- parent ------------------------------------------------------------------
    def _as_parent(self, request):
        parent, data = request.user, request.data
        action = data.get('action', 'unlock')

        if action == 'respond_request':
            decision = data.get('decision')
            if decision not in ('approved', 'declined'):
                return Response({"error": "Décision invalide."}, status=status.HTTP_400_BAD_REQUEST)
            # Verrou de ligne : deux clics (ou deux appareils) ne doivent pas accorder le temps deux fois.
            with transaction.atomic():
                notif = (ParentNotification.objects.select_for_update(of=('self',))
                         .filter(id=parse_id(data.get('notifId')), parent=parent).select_related('child').first())
                payload = dict(notif.payload or {}) if notif else {}
                if notif is None or payload.get('type') != SCREEN_TIME_REQUEST:
                    return Response({"error": "Demande introuvable."}, status=status.HTTP_404_NOT_FOUND)
                if payload.get('status') != 'pending':
                    return Response({"ok": True, "decision": payload.get('status'), "message": "Cette demande a déjà été traitée."})

                payload['status'] = decision
                notif.payload, notif.is_read = payload, True
                notif.save(update_fields=['payload', 'is_read'])
                if decision == 'approved':
                    minutes = _clamp_minutes(payload.get('extraMinutes'))
                    grant_credit(notif.child, parent, minutes)
                    return Response({"ok": True, "decision": "approved", "message": f"+{minutes} min accordées à {notif.child.display_name} !"})
            return Response({"ok": True, "decision": "declined", "message": "Demande déclinée."})

        if action != 'unlock':
            return Response({"error": "Action inconnue."}, status=status.HTTP_400_BAD_REQUEST)
        child = parent.children.filter(id=parse_id(data.get('childId'))).first()
        if child is None:
            return Response({"error": "Enfant introuvable dans votre foyer."}, status=status.HTTP_404_NOT_FOUND)
        # Absente : durée par défaut ; fournie mais invalide (texte, négative, > plafond) : refusée plutôt que corrigée en silence.
        minutes = parse_id(data.get('extraMinutes', DEFAULT_GRANT_MINUTES))
        if minutes is None or not 1 <= minutes <= MAX_GRANT_MINUTES:
            return Response({"error": f"Le temps accordé doit être compris entre 1 et {MAX_GRANT_MINUTES} minutes."},
                            status=status.HTTP_400_BAD_REQUEST)
        grant_credit(child, parent, minutes)
        return Response({"ok": True, "grantedMinutes": minutes, "message": f"+{minutes} min accordées avec succès."})

    # -- enfant ------------------------------------------------------------------
    def _as_child(self, request):
        child, data = request.user, request.data
        parent = child.parent
        if parent is None:
            return Response({"error": "Aucun parent associé à ce compte."}, status=status.HTTP_400_BAD_REQUEST)
        action = data.get('action', 'unlock')

        if action == 'request_time':
            since = timezone.now() - REQUEST_COOLDOWN
            recent = ParentNotification.objects.filter(parent=parent, child=child, created_at__gte=since)
            if any((n.payload or {}).get('type') == SCREEN_TIME_REQUEST and (n.payload or {}).get('status') == 'pending' for n in recent):
                return Response({"error": "Ta demande a déjà été envoyée, patiente un peu."}, status=status.HTTP_429_TOO_MANY_REQUESTS)
            ParentNotification.objects.create(
                parent=parent, child=child, notif_type=SCREEN_TIME_REQUEST,
                payload={
                    "type": SCREEN_TIME_REQUEST,
                    "title": "Demande de 15 minutes",
                    "message": "« S'il te plaît, puis-je avoir 15 minutes de plus pour terminer ? »",
                    "childId": child.id,
                    "childName": child.display_name,
                    "status": "pending",
                    "extraMinutes": DEFAULT_GRANT_MINUTES,
                },
            )
            alert = {
                "title": f"{child.display_name} demande {DEFAULT_GRANT_MINUTES} minutes de plus",
                "message": f"{child.display_name} a atteint sa limite de temps d'écran et demande {DEFAULT_GRANT_MINUTES} minutes "
                           "supplémentaires. Ouvrez kEur IA pour accepter ou refuser.",
            }
            email_parent_of_event(parent, child, SCREEN_TIME_REQUEST, alert)
            push_parent_of_event(parent, child, SCREEN_TIME_REQUEST, alert)
            return Response({"ok": True, "message": "Demande envoyée à ton parent !"})

        if action != 'unlock':
            return Response({"error": "Action inconnue."}, status=status.HTTP_400_BAD_REQUEST)

        password = data.get('parentPassword')
        if not isinstance(password, str) or not password:
            return Response({"error": "Le mot de passe du parent est requis."}, status=status.HTTP_400_BAD_REQUEST)
        lockout = LoginLockout(f'unlock:{child.id}', client_ip(request), scope='unlock')
        if lockout.is_locked():
            return Response({"error": "Trop d'essais. Réessaie dans 15 minutes."}, status=status.HTTP_429_TOO_MANY_REQUESTS)
        if not parent.check_password(password):
            lockout.register_failure()
            return Response({"error": "Mot de passe parent incorrect."}, status=status.HTTP_401_UNAUTHORIZED)

        lockout.reset()
        grant_credit(child, parent, DEFAULT_GRANT_MINUTES)
        return Response({
            "ok": True,
            "message": f"Déverrouillage parental réussi (+{DEFAULT_GRANT_MINUTES} min accordées) !",
            "grantedMinutes": DEFAULT_GRANT_MINUTES,
            "childId": child.id,
            "childName": child.display_name,
            "role": child.role,
        })


def _clamp_minutes(value) -> int:
    minutes = parse_id(value)
    return min(max(minutes if minutes is not None else DEFAULT_GRANT_MINUTES, 1), MAX_GRANT_MINUTES)
