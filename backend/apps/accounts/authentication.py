import time

from django.conf import settings
from rest_framework.authentication import SessionAuthentication
from rest_framework.exceptions import AuthenticationFailed

from .models import User

# Rôles d'administration : délai d'inactivité plus court (ADMIN_IDLE_TIMEOUT_MINUTES) que les autres (USER_IDLE_TIMEOUT_MINUTES).
ADMIN_ROLES = (User.ROLE_ADMIN, User.ROLE_SCHOOL_ADMIN)
LAST_ACTIVITY_KEY = 'last_activity'
IDLE_MESSAGE = "Votre session a expiré après une période d'inactivité. Reconnectez-vous."


def idle_limit_minutes(user) -> int:
    """Minutes sans action avant déconnexion pour ce compte (0 = pas de limite)."""
    return settings.ADMIN_IDLE_TIMEOUT_MINUTES if user.role in ADMIN_ROLES else settings.USER_IDLE_TIMEOUT_MINUTES


def touch_activity(session) -> None:
    """Remet le compte à rebours d'inactivité à zéro (ouverture de session, signal d'activité)."""
    session[LAST_ACTIVITY_KEY] = int(time.time())


class KeurSessionAuthentication(SessionAuthentication):
    """Session Django (cookie HttpOnly `keur_ia_session`) + vérification CSRF.

    - `authenticate_header` : DRF répond 401 (et non 403) à une requête non
      connectée, ce qui permet au frontend de distinguer « pas connecté » de
      « pas autorisé ».
    - Une session déjà ouverte cesse de fonctionner dès que l'école du compte
      est suspendue (la connexion elle-même est refusée dans LoginView).
    - Inactivité : une session sans aucune action depuis trop longtemps est détruite. Les requêtes
      ordinaires (dont les sondages d'arrière-plan) NE remettent PAS le compte à rebours à zéro :
      seuls la connexion et le signal d'activité de l'interface (ActivityView) le font.
    """

    def authenticate(self, request):
        result = super().authenticate(request)
        if result is not None:
            user = result[0]
            if user.school_id and user.school.is_suspended:
                raise AuthenticationFailed("L'espace de votre école est suspendu. Contactez l'équipe kEur IA.")
            self._enforce_idle_timeout(request, user)
        return result

    @staticmethod
    def _enforce_idle_timeout(request, user):
        limit_minutes = idle_limit_minutes(user)
        if not limit_minutes:
            return
        last = request.session.get(LAST_ACTIVITY_KEY)
        if last is None:
            touch_activity(request.session)  # session ouverte avant l'existence de cette règle : on repart de maintenant
        elif int(time.time()) - int(last) > limit_minutes * 60:
            request.session.flush()  # session détruite côté serveur, pas seulement ignorée
            raise AuthenticationFailed(IDLE_MESSAGE)

    def authenticate_header(self, request):
        return 'Session'
