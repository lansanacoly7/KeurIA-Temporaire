"""Réception des erreurs JavaScript des navigateurs.

Sans cela, une page qui plante chez un enfant ne laisse aucune trace côté serveur : seul son navigateur la voit. Le frontend envoie ici
un court rapport (message, pile, page) ; il est écrit dans les journaux au niveau ERROR, donc aussi envoyé à Sentry si SENTRY_DSN est défini.

Protection de la vie privée (les utilisateurs sont des mineurs) : aucun cookie ni session n'est lu, l'adresse de la page est réduite
à son chemin (jamais de paramètres), les textes sont tronqués, et les adresses e-mail éventuellement présentes dans un message sont masquées.
"""
import logging
import re

from rest_framework import serializers, status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import SimpleRateThrottle
from rest_framework.views import APIView

logger = logging.getLogger('keuria.client')

EMAIL = re.compile(r'[\w.+-]+@[\w-]+(?:\.[\w-]+)+')


class ClientErrorThrottle(SimpleRateThrottle):
    scope = 'client_error'

    def get_cache_key(self, request, view):
        return self.cache_format % {'scope': self.scope, 'ident': self.get_ident(request)}


def _clean(text: str, limit: int) -> str:
    return EMAIL.sub('[e-mail masqué]', text or '')[:limit]


class ClientErrorSerializer(serializers.Serializer):
    kind = serializers.ChoiceField(choices=['error', 'unhandledrejection', 'boundary'], default='error')
    message = serializers.CharField(max_length=2000, allow_blank=True, trim_whitespace=True)
    stack = serializers.CharField(max_length=6000, required=False, allow_blank=True, default='')
    path = serializers.CharField(max_length=300, required=False, allow_blank=True, default='')
    digest = serializers.CharField(max_length=100, required=False, allow_blank=True, default='')


class ClientErrorView(APIView):
    authentication_classes = []   # ni cookie ni session : pas de CSRF, pas d'identité
    permission_classes = [AllowAny]
    throttle_classes = [ClientErrorThrottle]

    def post(self, request):
        serializer = ClientErrorSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(status=status.HTTP_400_BAD_REQUEST)
        data = serializer.validated_data
        path = data['path'].split('?')[0].split('#')[0]
        logger.error(
            'client-error kind=%s path=%s digest=%s message=%s stack=%s',
            data['kind'], _clean(path, 200), _clean(data['digest'], 100), _clean(data['message'], 500), _clean(data['stack'], 2000),
        )
        return Response(status=status.HTTP_204_NO_CONTENT)
