import logging

from django.conf import settings
from django.contrib.auth import authenticate, login, logout
from django.core.mail import EmailMultiAlternatives
from django.db import transaction
from django.middleware.csrf import get_token
from django.utils import timezone
from django.utils.html import escape
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.scolaire.levels import effective_track

from . import approval
from .authentication import touch_activity
from .models import EmailVerificationCode, LoginCode, PasswordResetCode, User
from .parsing import parse_id
from .permissions import IsParent
from .serializers import (
    ChildAccountSerializer,
    LoginSerializer,
    ProfileSerializer,
    RegisterSerializer,
    check_password_policy,
    first_error,
)
from .throttling import AuthRateThrottle, LoginLockout, client_ip

logger = logging.getLogger(__name__)

GENERIC_RESET_MESSAGE = "Si un compte existe pour cette adresse, un code de vérification vient d'être envoyé."
GENERIC_VERIFY_MESSAGE = "Si un compte en attente de vérification existe pour cette adresse, un nouveau code vient d'être envoyé."
INVALID_CODE_MESSAGE = "Code invalide ou expiré."


def error_response(message, http_status=status.HTTP_400_BAD_REQUEST):
    return Response({"error": message}, status=http_status)


SCHOOL_SUSPENDED_MESSAGE = "L'espace de votre école est suspendu. Contactez l'équipe kEur IA."
TEACHER_WITHOUT_SCHOOL_MESSAGE = "Votre compte enseignant n'est rattaché à aucune école. Demandez à votre établissement ou à l'équipe kEur IA de le rattacher."


def profile_payload(user):
    learner_profile = getattr(user, 'learner_profile', None)
    parent_profile = getattr(user, 'parent_profile', None)
    student_profile = getattr(user, 'student_profile', None)
    is_school_student = bool(user.role == User.ROLE_STUDENT and user.school_id and hasattr(user, 'student_profile') and user.student_profile.classroom_id)
    return {
        "id": user.id,
        "displayName": user.display_name,
        "role": user.role,
        "email": user.email,
        "gender": getattr(user, 'gender', '') or (parent_profile.parent_role if parent_profile else '') or (student_profile.sexe if student_profile else ''),
        "parentRole": getattr(parent_profile, 'parent_role', '') if parent_profile else '',
        "schoolId": user.school_id,
        "isSchoolStudent": is_school_student,
        "tutorialCompleted": bool(getattr(user, 'tutorial_completed', False)),
        "schoolName": user.school.name if user.school_id else None,
        # Identifiant public de l'école : le frontend s'en sert pour charger son habillage (couleurs du thème choisi).
        "schoolSlug": user.school.slug if user.school_id else None,
        "avatar": learner_profile.avatar if learner_profile else None,
        "createdAt": user.created_at.isoformat() if getattr(user, 'created_at', None) else None,
        # Élève d'école : son parcours effectif (exception de l'enseignant, sinon niveau de sa classe), relu à chaque
        # chargement ; jamais l'âge saisi à la création du compte. Les autres comptes gardent leur tranche d'âge.
        "ageGroup": effective_track(student_profile) if is_school_student else getattr(user, 'age_group', None),
    }


def start_session(request, user):
    """Ouvre une session Django (cookie HttpOnly keur_ia_session) et trace la connexion.

    Le cookie est un cookie de session : il disparaît à la fermeture du navigateur, pour tout le monde et sans
    option « rester connecté » (on la coche sans la lire). Sur un ordinateur partagé, on ne reste donc pas
    connecté par oubli.
    """
    login(request, user, backend='django.contrib.auth.backends.ModelBackend')
    request.session.set_expiry(0)
    touch_activity(request.session)
    user.last_seen_at = timezone.now()
    user.login_count += 1
    user.save(update_fields=['last_seen_at', 'login_count'])
    user.record_connection_and_get_streak()
    # login() fait tourner le jeton CSRF : on le renvoie pour que le frontend
    # puisse l'utiliser immédiatement (il est aussi posé en cookie csrftoken).
    return get_token(request)


class ActivityView(APIView):
    """POST /api/auth/activity — signal envoyé par l'interface quand la personne agit réellement (clic, saisie, retour sur l'onglet).

    Il remet à zéro le compte à rebours d'inactivité. Réponse 200 {active: bool} : `false` pour un visiteur non connecté
    (aucune erreur, les pages publiques peuvent l'appeler) ; 401 si la session vient d'expirer par inactivité.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        if not request.user.is_authenticated:
            return Response({"active": False})
        touch_activity(request.session)
        return Response({"active": True})


class CsrfView(APIView):
    """GET /api/auth/csrf — garantit la présence du cookie csrftoken."""

    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request):
        return Response({"csrfToken": get_token(request)})


class RegisterView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [AuthRateThrottle]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if not serializer.is_valid():
            return error_response(first_error(serializer.errors))

        user = serializer.save()
        # Pas de session tant que l'adresse n'est pas prouvée (T15) : le
        # parent saisit le code reçu via VerifyEmailView, qui ouvre la session.
        email_sent = send_verification_code(user)
        message = (f"Un code de vérification a été envoyé à {user.email}." if email_sent else
                   "Compte créé, mais l'e-mail n'a pas pu être envoyé. Utilisez « Renvoyer le code » dans quelques instants.")
        return Response({
            "ok": True,
            "verificationRequired": True,
            "emailSent": email_sent,
            "approvalRequired": approval.requires_approval(),
            "email": user.email,
            "message": message,
        }, status=status.HTTP_201_CREATED)


ROLE_MISMATCH_MESSAGE = "Ces identifiants ne permettent pas d'accéder à cet espace. Veuillez vérifier le profil sélectionné ou vos identifiants."


def role_mismatch_response(user, expected_role):
    """403 générique si le profil choisi sur l'écran de connexion ne correspond pas au vrai rôle du compte
    (le message ne révèle pas le rôle réel). None si tout est cohérent ou si aucun profil n'est demandé."""
    allowed = {
        'eleve': (User.ROLE_STUDENT,),
        'parent': (User.ROLE_PARENT,),
        'enseignant': (User.ROLE_TEACHER,),
        # Deux entrées distinctes : la direction d'une école, et l'équipe kEur IA (page /connexion/admin).
        'ecole': (User.ROLE_SCHOOL_ADMIN,),
        'admin': (User.ROLE_ADMIN,),
    }.get(expected_role)
    if allowed is not None and user.role not in allowed:
        return error_response(ROLE_MISMATCH_MESSAGE, status.HTTP_403_FORBIDDEN)
    return None


def approval_block_response(user):
    """403 tant que l'inscription du parent (ou celle du parent d'un enfant du foyer) n'est pas acceptée par l'équipe kEur IA.

    Appelé seulement après un mot de passe correct : un tiers ne peut pas savoir quels comptes sont en attente.
    """
    blocked = approval.blocked_reason(user)
    if blocked is None:
        return None
    payload = {"error": blocked["message"]}
    if blocked["who"] == "parent":
        payload["email"] = user.email
    payload["pendingApproval" if blocked["code"] == "pending" else "registrationRejected"] = True
    return Response(payload, status=status.HTTP_403_FORBIDDEN)


class LoginView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [AuthRateThrottle]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        if not serializer.is_valid():
            return error_response("Identifiant et mot de passe obligatoires.")

        email = serializer.validated_data['email'].lower().strip()
        lockout = LoginLockout(email, client_ip(request))
        if lockout.is_locked():
            return error_response(
                "Trop de tentatives de connexion. Réessaie dans 15 minutes.",
                status.HTTP_429_TOO_MANY_REQUESTS,
            )

        # authenticate() vérifie aussi is_active et exécute un hachage même
        # quand l'e-mail n'existe pas (temps de réponse homogène).
        user = authenticate(request, email=email, password=serializer.validated_data['password'])
        if user is None:
            # Vérifier si c'est un compte parent désactivé dont le mot de passe est valide
            # Seuls les parents peuvent se désactiver eux-mêmes : un compte désactivé par l'école ou par
            # l'équipe kEur IA (enseignant, direction, élève) reçoit la réponse générique ci-dessous.
            inactive_user = User.objects.filter(email=email, is_active=False, role=User.ROLE_PARENT).first()
            if inactive_user and inactive_user.check_password(serializer.validated_data['password']):
                return Response({
                    "accountDeactivated": True,
                    "email": inactive_user.email,
                    "displayName": inactive_user.display_name,
                    "error": "Votre compte parent est actuellement désactivé.",
                }, status=status.HTTP_403_FORBIDDEN)

            lockout.register_failure()
            return error_response("Identifiant ou mot de passe incorrect.", status.HTTP_401_UNAUTHORIZED)

        # Signalé seulement après un mot de passe correct : un tiers ne peut
        # pas découvrir quels comptes sont en attente de vérification.
        if not user.email_verified:
            return Response({
                "error": "Vérifie d'abord ton adresse e-mail avec le code reçu.",
                "verificationRequired": True,
                "email": user.email,
            }, status=status.HTTP_403_FORBIDDEN)
        if user.school_id and user.school.is_suspended:
            return error_response(SCHOOL_SUSPENDED_MESSAGE, status.HTTP_403_FORBIDDEN)
        if user.role == User.ROLE_TEACHER and not user.school_id:
            # Jamais de rattachement automatique à une école au hasard : ce serait donner accès aux données d'un autre établissement.
            return error_response(TEACHER_WITHOUT_SCHOOL_MESSAGE, status.HTTP_403_FORBIDDEN)

        rejected = role_mismatch_response(user, serializer.validated_data.get('expectedRole') or request.data.get('expectedRole') or request.data.get('role'))
        if rejected:
            lockout.register_failure()
            return rejected

        lockout.reset()

        blocked = approval_block_response(user)
        if blocked:
            return blocked

        if two_factor_enabled(user):
            # Mot de passe correct mais pas de session tant que le code reçu par e-mail n'est pas saisi.
            sent = send_code_email(
                user, LoginCode.issue(user), LoginCode.VALIDITY_MINUTES,
                subject="[kEur IA] Votre code de connexion",
                title="Connexion sécurisée",
                intro="Quelqu'un vient de saisir votre mot de passe kEur IA. Voici le code pour terminer la connexion.",
            )
            return Response({
                "twoFactorRequired": True,
                "email": user.email,
                "message": (f"Un code de connexion a été envoyé à {user.email}." if sent else
                            "Le code n'a pas pu être envoyé. Réessayez dans quelques instants."),
            }, status=status.HTTP_202_ACCEPTED)

        csrf_token = start_session(request, user)
        return Response({"ok": True, "role": user.role, "userId": user.id, "csrfToken": csrf_token})


def two_factor_enabled(user):
    """Vrai si ce parent a activé la double authentification dans ses réglages parentaux."""
    from apps.progress.parental import two_factor_enabled_for

    return user.role == User.ROLE_PARENT and two_factor_enabled_for(user)


class LoginTwoFactorView(APIView):
    """POST /api/auth/login-2fa {email, code} — second facteur de la connexion, ouvre la session."""

    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [AuthRateThrottle]

    def post(self, request):
        email = str(request.data.get('email', '')).strip().lower()
        code = str(request.data.get('code', '')).strip()
        if not email or not code:
            return error_response("E-mail et code sont requis.")

        user = User.objects.filter(email=email, is_active=True, email_verified=True).first()
        if user is None or not LoginCode.consume(user, code):
            return error_response(INVALID_CODE_MESSAGE)

        blocked = approval_block_response(user)
        if blocked:
            return blocked

        rejected = role_mismatch_response(user, request.data.get('expectedRole') or request.data.get('role'))
        if rejected:
            return rejected

        csrf_token = start_session(request, user)
        return Response({"ok": True, "role": user.role, "userId": user.id, "csrfToken": csrf_token})


class VerifyEmailView(APIView):
    """POST /api/auth/verify-email {email, code} — valide l'adresse et ouvre la session."""

    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [AuthRateThrottle]

    def post(self, request):
        email = str(request.data.get('email', '')).strip().lower()
        code = str(request.data.get('code', '')).strip()
        if not email or not code:
            return error_response("E-mail et code sont requis.")

        user = User.objects.filter(email=email, is_active=True, email_verified=False).first()
        if user is None or not EmailVerificationCode.consume(user, code):
            return error_response(INVALID_CODE_MESSAGE)

        user.email_verified = True
        user.save(update_fields=['email_verified'])
        blocked = approval.blocked_reason(user)
        if blocked:
            # Adresse prouvée, mais l'équipe kEur IA doit encore accepter la demande : pas de session.
            return Response({"ok": True, "pendingApproval": blocked["code"] == "pending",
                             "registrationRejected": blocked["code"] == "rejected",
                             "email": user.email, "message": blocked["message"]})
        csrf_token = start_session(request, user)
        return Response({"ok": True, "role": user.role, "userId": user.id, "csrfToken": csrf_token})


class ResendVerificationView(APIView):
    """POST /api/auth/resend-verification {email} — réponse identique dans tous les cas."""

    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [AuthRateThrottle]

    def post(self, request):
        email = str(request.data.get('email', '')).strip().lower()
        if not email:
            return error_response("L'adresse e-mail est requise.")
        user = User.objects.filter(email=email, is_active=True, email_verified=False).first()
        if user is not None:
            send_verification_code(user)
        return Response({"ok": True, "message": GENERIC_VERIFY_MESSAGE})


class LogoutView(APIView):
    # Pas d'authentification requise : la déconnexion doit toujours réussir,
    # même avec une session expirée. logout() détruit la session côté serveur.
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        logout(request)
        response = Response({"ok": True})
        response.delete_cookie(settings.SESSION_COOKIE_NAME, samesite=settings.SESSION_COOKIE_SAMESITE)
        return response


class DeactivateAccountView(APIView):
    """POST /api/auth/deactivate {password} — désactive le compte parent connecté et détruit la session.

    Le mot de passe est exigé (une session volée ne doit pas suffire à enfermer le propriétaire dehors)."""
    permission_classes = [IsParent]

    def post(self, request):
        user = request.user
        lockout = LoginLockout(f'deactivate:{user.id}', client_ip(request), scope='deactivate')
        if lockout.is_locked():
            return error_response("Trop d'essais. Réessaie dans 15 minutes.", status.HTTP_429_TOO_MANY_REQUESTS)
        password = request.data.get('password')
        if not isinstance(password, str) or not user.check_password(password):
            lockout.register_failure()
            return error_response("Mot de passe incorrect.", status.HTTP_403_FORBIDDEN)
        lockout.reset()
        user.is_active = False
        user.save(update_fields=['is_active'])
        logout(request)
        response = Response({"ok": True, "message": "Votre compte a été désactivé."})
        response.delete_cookie(settings.SESSION_COOKIE_NAME, samesite=settings.SESSION_COOKIE_SAMESITE)
        return response


def suspended_by_administration(user) -> bool:
    """Vrai si la DERNIÈRE décision de l'équipe kEur IA sur ce compte est une désactivation (une réactivation ultérieure la lève).

    Le journal d'audit écrit « Compte <e-mail> désactivé » / « réactivé » (apps/superadmin/services.py) : on compare le libellé EXACT,
    jamais une recherche partielle (« a@x.com » apparaît dans « ba@x.com »)."""
    from apps.superadmin.models import AuditLog

    last = (AuditLog.objects
            .filter(action__in=('compte_desactive', 'compte_reactive'),
                    label__in=(f"Compte {user.email} désactivé", f"Compte {user.email} réactivé"))
            .order_by('-id').first())
    return last is not None and last.action == 'compte_desactive'


class RequestReactivationView(APIView):
    """POST /api/auth/request-reactivation {email, password} — vérifie les identifiants et envoie un code OTP par email."""
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [AuthRateThrottle]

    def post(self, request):
        email = str(request.data.get('email', '')).strip().lower()
        password = str(request.data.get('password', ''))
        if not email or not password:
            return error_response("E-mail et mot de passe requis.")

        # Ce point d'entrée vérifie un mot de passe : il est verrouillé comme la connexion.
        lockout = LoginLockout(email, client_ip(request), scope='reactivate')
        if lockout.is_locked():
            return error_response("Trop de tentatives. Réessaie dans 15 minutes.", status.HTTP_429_TOO_MANY_REQUESTS)
        # Parents seulement : un compte désactivé par l'école ou par l'équipe kEur IA ne se réactive pas seul.
        user = User.objects.filter(email=email, is_active=False, role=User.ROLE_PARENT).first()
        if user is None or not user.check_password(password):
            lockout.register_failure()
            return error_response("Identifiant ou mot de passe incorrect.", status.HTTP_401_UNAUTHORIZED)

        if user.school_id is not None:
            return error_response("Les comptes rattachés à une école sont gérés par l'établissement.", status.HTTP_403_FORBIDDEN)

        if suspended_by_administration(user):
            return error_response("Ce compte a été suspendu par l'administration. Contactez le support kEur IA.", status.HTTP_403_FORBIDDEN)

        lockout.reset()
        send_reactivation_code(user)
        return Response({
            "ok": True,
            "email": user.email,
            "message": f"Un code de réactivation à 6 chiffres a été envoyé à {user.email}."
        })


class ReactivateAccountView(APIView):
    """POST /api/auth/reactivate {email, code} — valide le code OTP, réactive le compte parent et ouvre la session."""
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [AuthRateThrottle]

    def post(self, request):
        email = str(request.data.get('email', '')).strip().lower()
        code = str(request.data.get('code', '')).strip()
        if not email or not code:
            return error_response("E-mail et code de vérification requis.")

        user = User.objects.filter(email=email, is_active=False, role=User.ROLE_PARENT).first()
        if user is None:
            return error_response(INVALID_CODE_MESSAGE)

        if user.school_id is not None:
            return error_response("Les comptes rattachés à une école sont gérés par l'établissement.", status.HTTP_403_FORBIDDEN)

        if suspended_by_administration(user):
            return error_response("Ce compte a été suspendu par l'administration. Contactez le support kEur IA.", status.HTTP_403_FORBIDDEN)

        if not EmailVerificationCode.consume(user, code):
            return error_response(INVALID_CODE_MESSAGE)

        user.is_active = True
        user.save(update_fields=['is_active'])

        csrf_token = start_session(request, user)
        return Response({
            "ok": True,
            "role": user.role,
            "userId": user.id,
            "csrfToken": csrf_token,
            "message": f"Bon retour parmi nous {user.display_name} ! Votre compte a été réactivé avec succès."
        })


class ProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response({"profile": profile_payload(request.user)})

    def put(self, request):
        serializer = ProfileSerializer(data=request.data)
        if not serializer.is_valid():
            return error_response(first_error(serializer.errors, "Données de profil invalides."))

        user = request.user
        update_fields = []
        if 'displayName' in serializer.validated_data:
            new_name = serializer.validated_data['displayName'].strip()
            user.display_name = new_name
            update_fields.append('display_name')
            if hasattr(user, 'parent_profile') and user.parent_profile:
                parts = new_name.split(maxsplit=1)
                user.parent_profile.first_name = parts[0]
                user.parent_profile.last_name = parts[1] if len(parts) > 1 else ""
                user.parent_profile.save(update_fields=['first_name', 'last_name'])

        new_email = serializer.validated_data.get('email')
        if new_email:
            new_email = new_email.strip().lower()
            if user.role == User.ROLE_STUDENT:
                return error_response("L'adresse e-mail d'un compte élève ne peut pas être modifiée.")
            if new_email != user.email:
                if User.objects.filter(email=new_email).exclude(id=user.id).exists():
                    return error_response("Cette adresse e-mail est déjà utilisée par un autre compte.")
                user.email = new_email
                update_fields.append('email')

        if update_fields:
            user.save(update_fields=update_fields)

        avatar = serializer.validated_data.get('avatar')
        learner_profile = getattr(user, 'learner_profile', None)
        if avatar and learner_profile:
            learner_profile.avatar = avatar
            learner_profile.save(update_fields=['avatar'])
        return Response({"profile": profile_payload(user)})


def child_payload(child):
    learner_profile = getattr(child, 'learner_profile', None)
    student_profile = getattr(child, 'student_profile', None)
    raw_sexe = getattr(child, 'gender', '') or (student_profile.sexe if student_profile else '') or (learner_profile.gender if learner_profile else '')
    gender_label = 'fille' if raw_sexe in ('fille', 'F') else ('garcon' if raw_sexe in ('garcon', 'M') else '')
    return {
        "id": child.id,
        "email": child.email,
        "displayName": child.display_name,
        "role": child.role,
        "gender": gender_label,
        "avatar": learner_profile.avatar if learner_profile else None,
        "ageGroup": getattr(child, 'age_group', None),
        "tutorialCompleted": bool(getattr(child, 'tutorial_completed', False)),
        "createdAt": child.created_at,
        "schoolId": child.school_id,
        "isSchoolStudent": bool(child.school_id),
        "isPendingDeletion": child.is_pending_deletion,
        "deletedAt": child.deleted_at.isoformat() if child.deleted_at else None,
        "daysRemaining": child.days_until_permanent_deletion if child.deleted_at else None,
    }


class ParentChildrenView(APIView):
    permission_classes = [IsParent]

    def get(self, request):
        from .retention import purge_expired_child_deletions
        purge_expired_child_deletions()
        all_children = request.user.children.all().order_by('-created_at')
        active = [c for c in all_children if not c.deleted_at]
        pending = [c for c in all_children if c.deleted_at]
        return Response({
            "children": [child_payload(child) for child in active],
            "pendingDeletionChildren": [child_payload(child) for child in pending],
        })

    def post(self, request):
        serializer = ChildAccountSerializer(data=request.data, context={'parent': request.user})
        if not serializer.is_valid():
            return error_response(first_error(serializer.errors))
        child = serializer.save()
        return Response({"ok": True, "child": child_payload(child)}, status=status.HTTP_201_CREATED)

    def delete(self, request):
        """DELETE /api/parent/children {childId} — voir remove_child."""
        return remove_child(request, request.data.get('childId') or request.query_params.get('childId'))


class ParentChildView(APIView):
    """DELETE /api/parent/children/<id> — retire du foyer un enfant relié par le code de son école."""

    permission_classes = [IsParent]

    def delete(self, request, child_id):
        return remove_child(request, child_id)


class ParentChildRestoreView(APIView):
    """POST /api/parent/children/<id>/restore — permet au parent de récupérer le compte de son enfant pendant les 3 jours de grâce."""

    permission_classes = [IsParent]

    def post(self, request, child_id):
        from .retention import purge_expired_child_deletions
        purge_expired_child_deletions()

        child = request.user.children.filter(id=child_id, school__isnull=True, deleted_at__isnull=False).first()
        if not child:
            return error_response("Enfant introuvable ou le délai de récupération de 3 jours a expiré.", status.HTTP_404_NOT_FOUND)

        from datetime import timedelta
        if timezone.now() - child.deleted_at >= timedelta(days=3):
            child.delete()
            return error_response("Le délai de 3 jours est expiré. Le compte a été définitivement supprimé.", status.HTTP_410_GONE)

        child.is_active = True
        child.deleted_at = None
        child.save(update_fields=['is_active', 'deleted_at'])

        return Response({
            "ok": True,
            "message": f"Le compte de {child.display_name} a été récupéré avec succès !",
            "child": child_payload(child),
        })


def remove_child(request, raw_id):
    """Retire du foyer un enfant relié par le code de son école, ou place en attente de suppression (3 jours de grâce pour récupération) un enfant créé par le parent (mot de passe requis)."""
    target_id = parse_id(raw_id)
    if target_id is None:
        return error_response("Identifiant de l'enfant manquant ou invalide.")

    from .retention import purge_expired_child_deletions
    purge_expired_child_deletions()

    child = request.user.children.filter(id=target_id).first()
    if not child:
        return error_response("Enfant introuvable ou non rattaché à votre compte.", status.HTTP_404_NOT_FOUND)

    if not child.school_id:
        from .account import _confirmed
        password = request.data.get('password') if (hasattr(request, 'data') and isinstance(request.data, dict)) else None
        if not password:
            return error_response(
                "Ce compte enfant a été créé depuis votre espace : veuillez confirmer sa suppression avec votre mot de passe parent.",
                status.HTTP_409_CONFLICT,
            )
        refused = _confirmed(request, 'child')
        if refused:
            return refused
        child_name = child.display_name
        child.is_active = False
        child.deleted_at = timezone.now()
        child.save(update_fields=['is_active', 'deleted_at'])
        return Response({
            "ok": True,
            "pendingDeletion": True,
            "graceDays": 3,
            "message": f"Le compte de {child_name} a été placé en attente de suppression. Vous disposez de 3 jours pour le récupérer.",
        })

    from apps.progress.models import ParentalLimits
    with transaction.atomic():
        ParentalLimits.objects.filter(parent=request.user, child=child).delete()
        child.parent = None
        child.save(update_fields=['parent'])
        if hasattr(child, 'student_profile'):
            student = child.student_profile
            student.parent_linked_at = None
            student.save(update_fields=['parent_linked_at'])

    return Response({"ok": True, "message": f"{child.display_name} a été retiré(e) avec succès de votre espace parent."})



class ForgotPasswordView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [AuthRateThrottle]

    def post(self, request):
        email = str(request.data.get('email', '')).strip().lower()
        if not email:
            return error_response("L'adresse e-mail est requise.")

        # Réponse identique que le compte existe ou non (pas d'énumération).
        user = User.objects.filter(email=email, is_active=True).first()
        if user is not None:
            recipient = user.parent if (user.parent_id and user.parent and user.parent.email) else user
            send_code_email(
                recipient, PasswordResetCode.issue(user), PasswordResetCode.VALIDITY_MINUTES,
                subject="[kEur IA] Votre code de réinitialisation",
                title="Réinitialisation de mot de passe",
                intro=f"Vous avez demandé la réinitialisation du mot de passe pour le compte {user.display_name} ({user.email})." if recipient != user else "Vous avez demandé la réinitialisation de votre mot de passe kEur IA.",
            )

        return Response({"ok": True, "message": GENERIC_RESET_MESSAGE})


class ParentResetChildPasswordView(APIView):
    """POST /api/parent/children/<id>/reset-password — permet à un parent de définir un nouveau mot de passe pour son enfant."""
    permission_classes = [IsParent]

    def post(self, request, child_id):
        child = request.user.children.filter(id=child_id).first()
        if not child:
            return error_response("Enfant introuvable ou non rattaché à votre compte.", status.HTTP_404_NOT_FOUND)
        if child.school_id:
            # Le compte d'un élève d'école est géré par son établissement (comme sa suppression).
            return error_response("Ce compte est géré par l'école de votre enfant : demandez-lui de réinitialiser le mot de passe.", status.HTTP_403_FORBIDDEN)
        new_password = str(request.data.get('password', ''))
        errors = check_password_policy(new_password, user=child)
        if errors:
            return error_response(errors[0])
        child.set_password(new_password)
        child.save(update_fields=['password'])
        return Response({"ok": True, "message": f"Le mot de passe de {child.display_name} a été mis à jour avec succès."})


class ResetPasswordView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [AuthRateThrottle]

    def post(self, request):
        email = str(request.data.get('email', '')).strip().lower()
        code = str(request.data.get('code', '')).strip()
        new_password = str(request.data.get('password', ''))

        if not email or not code or not new_password:
            return error_response("E-mail, code et nouveau mot de passe sont requis.")

        user = User.objects.filter(email=email, is_active=True).first()
        # Politique vérifiée avant le code, pour ne pas « brûler » un code
        # valide sur un mot de passe refusé.
        errors = check_password_policy(new_password, user=user or User(email=email))
        if errors:
            return error_response(errors[0])
        if user is None or not PasswordResetCode.consume(user, code):
            return error_response(INVALID_CODE_MESSAGE)

        # set_password change l'empreinte de session : toutes les sessions
        # ouvertes avec l'ancien mot de passe deviennent invalides. Recevoir
        # le code prouve aussi la possession de l'adresse e-mail.
        user.set_password(new_password)
        user.email_verified = True
        user.save(update_fields=['password', 'email_verified'])
        return Response({"ok": True, "message": "Mot de passe modifié avec succès."})


def send_verification_code(user):
    return send_code_email(
        user, EmailVerificationCode.issue(user), EmailVerificationCode.VALIDITY_MINUTES,
        subject="[kEur IA] Confirmez votre adresse e-mail",
        title="Vérification de l'adresse e-mail",
        intro="Bienvenue sur kEur IA ! Pour activer votre compte parent, saisissez ce code sur la page de connexion.",
    )


def send_reactivation_code(user):
    send_code_email(
        user, EmailVerificationCode.issue(user), EmailVerificationCode.VALIDITY_MINUTES,
        subject="[kEur IA] Code de réactivation de votre compte",
        title="Réactivation de votre compte parent",
        intro="Bon retour sur kEur IA ! Pour réactiver votre compte parent et retrouver votre espace, saisissez ce code sur la page de connexion.",
    )


def send_code_email(user, code, validity_minutes, *, subject, title, intro):
    """Envoie un code à 6 chiffres. Un échec SMTP est journalisé sans être révélé
    au client (les réponses restent identiques, pas d'énumération de comptes). Renvoie True si l'envoi a réussi ;
    seule l'inscription (adresse qui vient d'être créée, donc rien à énumérer) s'en sert pour être honnête."""
    name = escape(user.display_name)
    text_body = (
        f"Bonjour {user.display_name},\n\n"
        f"{intro}\n\n"
        f"Votre code de vérification à 6 chiffres est :\n\n"
        f"    {code}\n\n"
        f"Ce code est valide pendant {validity_minutes} minutes.\n"
        f"Si vous n'avez pas fait cette demande, ignorez simplement cet e-mail.\n\n"
        f"Cordialement,\nL'équipe kEur IA"
    )
    html_body = f"""
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; background:#f4f4f4; margin:0; padding:20px;">
  <div style="max-width:480px; margin:0 auto; background:white; border-radius:12px; overflow:hidden; box-shadow:0 2px 8px rgba(0,0,0,0.08);">
    <div style="background:#0d846e; padding:24px 32px;">
      <h1 style="color:white; margin:0; font-size:22px;">kEur IA</h1>
      <p style="color:rgba(255,255,255,0.85); margin:4px 0 0; font-size:14px;">{escape(title)}</p>
    </div>
    <div style="padding:32px;">
      <p style="color:#333; font-size:16px;">Bonjour <strong>{name}</strong>,</p>
      <p style="color:#555; font-size:15px;">{escape(intro)} Voici votre code :</p>
      <div style="background:#f0fdf9; border:2px solid #0d846e; border-radius:10px; padding:20px; text-align:center; margin:24px 0;">
        <p style="margin:0; font-size:13px; color:#666; letter-spacing:0.05em; text-transform:uppercase;">Code de vérification</p>
        <p style="margin:8px 0 0; font-size:42px; font-weight:900; color:#0d846e; letter-spacing:8px;">{code}</p>
      </div>
      <p style="color:#888; font-size:13px;">Ce code expire dans <strong>{validity_minutes} minutes</strong>.</p>
      <p style="color:#888; font-size:13px;">Si vous n'avez pas fait cette demande, ignorez cet e-mail.</p>
    </div>
    <div style="background:#f8f8f8; padding:16px 32px; border-top:1px solid #eee;">
      <p style="color:#aaa; font-size:12px; margin:0;">© kEur IA — Apprendre, Jouer, Créer</p>
    </div>
  </div>
</body>
</html>
"""
    try:
        msg = EmailMultiAlternatives(subject, text_body, settings.DEFAULT_FROM_EMAIL, [user.email])
        msg.attach_alternative(html_body, "text/html")
        msg.send(fail_silently=False)
    except Exception:
        logger.exception("Échec d'envoi d'un code par e-mail (user_id=%s)", user.pk)
        return False
    return True
