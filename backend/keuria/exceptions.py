import logging

from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import exception_handler

logger = logging.getLogger(__name__)


def api_exception_handler(exc, context):
    """Garantit qu'aucune erreur 500 ou non gérée ne fuit sous forme de page HTML ou de message technique brut.

    1. Ajoute une clé `error` aux erreurs DRF (401/403/429...).
    2. Si une exception non interceptée survient (DRF renvoie None), intercepte l'erreur,
       journalise la trace complète côté serveur, et renvoie un JSON propre et bienveillant à l'utilisateur.
    """
    response = exception_handler(exc, context)
    if response is not None:
        if isinstance(response.data, dict) and 'detail' in response.data:
            response.data.setdefault('error', str(response.data['detail']))
        return response

    req = context.get('request')
    path = getattr(req, 'path', str(req))
    logger.exception("Erreur serveur non interceptée sur %s: %s", path, exc)

    return Response(
        {"error": "Une difficulté temporaire est survenue. Veuillez réessayer dans un instant."},
        status=status.HTTP_500_INTERNAL_SERVER_ERROR
    )
