"""Erreurs métier : message affichable tel quel par le frontend (clé `error`)."""
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView


class ApiError(Exception):
    def __init__(self, message: str, status_code: int = status.HTTP_400_BAD_REQUEST, extra: dict | None = None):
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.extra = extra or {}          # champs structurés en plus du message (ex. « qui » a posé une règle)


class NotFound(ApiError):
    def __init__(self, message: str = 'Introuvable.'):
        super().__init__(message, status.HTTP_404_NOT_FOUND)


class ScolaireView(APIView):
    """APIView qui transforme ApiError en réponse {"error": …}."""

    def handle_exception(self, exc):
        if isinstance(exc, ApiError):                  # plus ses champs `extra` (ex. `by` : qui a posé une règle)
            return Response({**exc.extra, 'error': exc.message}, status=exc.status_code)
        return super().handle_exception(exc)


def required(value, label: str) -> str:
    text = (value or '').strip() if isinstance(value, str) else ''
    if not text:
        raise ApiError(f'{label} est obligatoire.')
    return text


def body_str(data, key: str, default: str = '') -> str:
    value = data.get(key, default)
    return value if isinstance(value, str) else default
