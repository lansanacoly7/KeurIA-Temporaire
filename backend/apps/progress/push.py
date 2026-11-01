"""Alertes push (Web Push / VAPID) pour les parents.

Le navigateur du parent s'abonne (service worker `public/sw.js`), le serveur enregistre l'abonnement et l'utilise
pour les mêmes événements importants que l'e-mail. Sans clés VAPID (`VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY`),
la fonctionnalité est déclarée indisponible : jamais de faux « activé ».
"""
import base64
import json
import logging
from urllib.parse import urlparse

from django.conf import settings
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.models import User

from .mailing import EMAILED_TYPES, limits_row
from .models import PushSubscription

logger = logging.getLogger(__name__)


# Services de push des navigateurs. L'adresse d'abonnement vient du navigateur du parent : sans cette liste,
# le serveur enverrait une requête vers n'importe quel site HTTPS choisi par un utilisateur (SSRF).
PUSH_SERVICE_HOSTS = (
    'fcm.googleapis.com',
    'updates.push.services.mozilla.com',
    'web.push.apple.com',
    'push.apple.com',
    'notify.windows.com',
)


def is_push_service_endpoint(endpoint) -> bool:
    if not isinstance(endpoint, str) or not endpoint.startswith('https://') or len(endpoint) > 500:
        return False
    try:
        host = (urlparse(endpoint).hostname or '').lower()
    except ValueError:
        return False
    return any(host == allowed or host.endswith('.' + allowed) for allowed in PUSH_SERVICE_HOSTS)


def push_configured() -> bool:
    return bool(settings.VAPID_PUBLIC_KEY and settings.VAPID_PRIVATE_KEY)


def generate_vapid_keys() -> tuple[str, str]:
    """(clé publique, clé privée) au format attendu par le navigateur et par pywebpush."""
    from cryptography.hazmat.primitives import serialization as s
    from py_vapid import Vapid

    vapid = Vapid()
    vapid.generate_keys()
    private = vapid.private_key.private_bytes(s.Encoding.DER, s.PrivateFormat.PKCS8, s.NoEncryption())
    public = vapid.public_key.public_bytes(s.Encoding.X962, s.PublicFormat.UncompressedPoint)
    encode = lambda raw: base64.urlsafe_b64encode(raw).decode().rstrip('=')  # noqa: E731
    return encode(public), encode(private)


def wants_push(parent, child) -> bool:
    limits = limits_row(parent, child)
    return True if limits is None else limits.push_notifications


def push_parent_of_event(parent, child, notif_type, payload) -> int:
    """Envoie l'alerte aux appareils abonnés du parent. Renvoie le nombre d'envois réussis."""
    if not push_configured() or notif_type not in EMAILED_TYPES or not wants_push(parent, child):
        return 0
    from pywebpush import WebPushException, webpush

    body = json.dumps({"title": payload.get('title') or 'kEur IA', "body": payload.get('message') or '', "url": "/dashboard"})
    sent = 0
    for sub in PushSubscription.objects.filter(user=parent):
        try:
            webpush(
                subscription_info={"endpoint": sub.endpoint, "keys": {"p256dh": sub.p256dh, "auth": sub.auth}},
                data=body,
                vapid_private_key=settings.VAPID_PRIVATE_KEY,
                vapid_claims={"sub": settings.VAPID_CLAIMS_SUBJECT},
                ttl=3600,
                timeout=5,
            )
            sent += 1
        except WebPushException as exc:
            # 404/410 : l'abonnement n'existe plus côté navigateur, on l'oublie.
            if getattr(exc.response, 'status_code', None) in (404, 410):
                sub.delete()
            else:
                logger.warning("Échec d'envoi push (subscription %s) : %s", sub.pk, exc)
        except Exception:
            logger.exception("Échec d'envoi push (subscription %s)", sub.pk)
    return sent


class PushPublicKeyView(APIView):
    """GET /api/push/public-key — clé VAPID publique, ou `available: false` si le serveur n'est pas configuré."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response({"available": push_configured(), "publicKey": settings.VAPID_PUBLIC_KEY or None})


class PushSubscribeView(APIView):
    """POST /api/push/subscribe {endpoint, keys:{p256dh, auth}} — enregistre l'appareil du parent."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        if request.user.role != User.ROLE_PARENT:
            return Response({"error": "Les alertes push sont réservées aux parents."}, status=status.HTTP_403_FORBIDDEN)
        if not push_configured():
            return Response({"error": "Les alertes push ne sont pas activées sur ce serveur."}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        endpoint = request.data.get('endpoint')
        keys = request.data.get('keys') or {}
        p256dh, auth = keys.get('p256dh'), keys.get('auth')
        if not all(isinstance(v, str) and v for v in (endpoint, p256dh, auth)) or not is_push_service_endpoint(endpoint):
            return Response({"error": "Abonnement invalide."}, status=status.HTTP_400_BAD_REQUEST)
        PushSubscription.objects.update_or_create(
            endpoint=endpoint[:500], defaults={'user': request.user, 'p256dh': p256dh[:200], 'auth': auth[:100]},
        )
        return Response({"ok": True})


class PushUnsubscribeView(APIView):
    """POST /api/push/unsubscribe {endpoint} — oublie l'appareil."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        PushSubscription.objects.filter(user=request.user, endpoint=str(request.data.get('endpoint', ''))[:500]).delete()
        return Response({"ok": True})
