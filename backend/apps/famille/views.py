from rest_framework import status
from rest_framework.response import Response
from rest_framework.throttling import UserRateThrottle
from rest_framework.views import APIView

from apps.accounts.parsing import parse_id

from .models import MAX_MESSAGE_LENGTH
from .services import NO_FAMILY_MESSAGE, clean_text, list_messages, post_message


class FamilyChatSendThrottle(UserRateThrottle):
    """Limite les envois (pas la lecture, rafraîchie régulièrement)."""

    scope = 'family_chat'
    rate = '30/min'


class FamilyMessagesView(APIView):
    """
    GET  /api/famille/messages[?after=<id>] — messages du canal de ma famille.
    POST /api/famille/messages {text}       — envoie un message dans ce canal.
    Connexion obligatoire (réglage par défaut) ; aucun identifiant de famille
    n'est accepté du navigateur.
    """

    def get_throttles(self):
        return [FamilyChatSendThrottle()] if self.request.method == 'POST' else []

    def get(self, request):
        raw_after = request.query_params.get('after')
        after = parse_id(raw_after)
        return Response(list_messages(request.user, after))

    def post(self, request):
        text = clean_text(request.data.get('text'))
        if text is None:
            return Response({'error': f'Écrivez un message de 1 à {MAX_MESSAGE_LENGTH} caractères.'},
                            status=status.HTTP_400_BAD_REQUEST)
        message = post_message(request.user, text)
        if message is None:
            return Response({'error': NO_FAMILY_MESSAGE}, status=status.HTTP_403_FORBIDDEN)
        return Response({'message': message}, status=status.HTTP_201_CREATED)
