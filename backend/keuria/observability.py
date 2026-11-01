"""Observabilité : identifiant de requête, journal d'accès, format JSON et alerting d'urgence (e-mail, webhook).

Rien de personnel n'est écrit : ni corps de requête, ni paramètres d'URL, ni adresse e-mail. Seuls le chemin, le statut, la durée
et l'identifiant numérique de l'utilisateur permettent de relier une erreur à une action lors d'une enquête.
En cas d'erreur serveur (500), une notification est transmise aux canaux d'urgence. Garde-fous :
  - le TEXTE de l'exception n'est jamais envoyé (il peut contenir des données d'enfants, par exemple dans une erreur de base de
    données) : on transmet son type et l'identifiant de requête, à rechercher dans les journaux ;
  - une alerte identique n'est émise qu'une fois par minute pour TOUS les workers (compteur dans le cache partagé), et le nombre
    total d'alertes est plafonné par période : une série d'erreurs ne peut ni saturer la boîte des administrateurs ni créer de fils sans fin ;
  - les envois passent par un petit groupe de fils d'exécution (jamais un fil par alerte) ;
  - une adresse de webhook doit être en HTTPS (HTTP seulement en développement).
"""
import contextvars
import json
import logging
import re
import threading
import time
import urllib.error
import urllib.request
import uuid
from concurrent.futures import ThreadPoolExecutor
from urllib.parse import urlparse

from django.conf import settings
from django.core.cache import cache
from django.core.mail import mail_admins

access_logger = logging.getLogger('keuria.access')
alert_logger = logging.getLogger('keuria.alerts')

_request_id = contextvars.ContextVar('request_id', default='-')
# Un identifiant fourni par un proxy est repris tel quel s'il est sobre ; sinon on en crée un (pas d'injection dans les journaux).
_VALID_REQUEST_ID = re.compile(r'^[A-Za-z0-9._-]{8,64}$')
# Sondes de santé et fichiers statiques : trop bavards pour le journal d'accès.
_QUIET_PREFIXES = ('/api/health/',)

ALERT_COOLDOWN_SECONDS = 60.0
ALERT_BUDGET = 20            # alertes au plus ...
ALERT_BUDGET_WINDOW = 600    # ... par période de 10 minutes, tous types d'incident confondus
WEBHOOK_TIMEOUT_SECONDS = 3.0

_alert_pool = ThreadPoolExecutor(max_workers=2, thread_name_prefix='keuria-alert')
# Repli si le cache partagé est indisponible : on garde au moins un compteur local plutôt que de laisser passer toutes les alertes.
_local_lock = threading.Lock()
_local_cooldown: dict[str, float] = {}


def current_request_id() -> str:
    return _request_id.get()


def alert_fingerprint(method: str, path: str, status: int) -> str:
    """Empreinte d'un incident : les numéros sont neutralisés (/api/x/12 et /api/x/13 sont le même incident) et la longueur bornée."""
    return f"{method}:{re.sub(r'\d+', 'N', path)[:80]}:{status}"


def is_alert_throttled(fingerprint: str, cooldown: float = ALERT_COOLDOWN_SECONDS) -> bool:
    """Vrai si une alerte pour cette empreinte a déjà été émise récemment (anti-répétition), ou si le plafond global est atteint."""
    try:
        if not cache.add(f'alert:{fingerprint}', 1, timeout=max(1, int(cooldown))):
            return True
        cache.add('alert:budget', 0, timeout=ALERT_BUDGET_WINDOW)
        return cache.incr('alert:budget') > ALERT_BUDGET
    except Exception:  # noqa: BLE001 - le cache est lui-même une cause possible d'incident : ne jamais échouer ici
        now = time.time()
        with _local_lock:
            if now - _local_cooldown.get(fingerprint, 0.0) < cooldown:
                return True
            _local_cooldown[fingerprint] = now
            if len(_local_cooldown) > 200:
                for key in [k for k, v in _local_cooldown.items() if v < now - cooldown * 2]:
                    del _local_cooldown[key]
        return False


def _webhook_allowed(url: str) -> bool:
    """HTTPS obligatoire hors développement : le contenu de l'alerte ne doit pas circuler en clair ni vers un schéma exotique (file:, ftp:)."""
    parsed = urlparse(url)
    if parsed.scheme == 'https' and parsed.netloc:
        return True
    return bool(settings.DEBUG and parsed.scheme == 'http' and parsed.netloc)


def send_critical_email_alert(subject: str, message: str) -> bool:
    """Transmet un e-mail d'urgence aux administrateurs configurés (ADMINS)."""
    try:
        if not getattr(settings, 'ADMINS', None):
            return False
        mail_admins(subject=subject, message=message, fail_silently=True)
        alert_logger.info("Alerte e-mail transmise aux administrateurs: %s", subject)
        return True
    except Exception as exc:  # noqa: BLE001
        alert_logger.warning("Échec de l'envoi de l'alerte e-mail: %s", type(exc).__name__)
        return False


def _post_json(url: str, payload: dict, user_agent: str, token: str = '') -> bool:
    if not _webhook_allowed(url):
        alert_logger.warning("Webhook d'alerte refusé : l'adresse doit commencer par https://")
        return False
    request = urllib.request.Request(  # noqa: S310 - schéma contrôlé par _webhook_allowed
        url, data=json.dumps(payload, ensure_ascii=False).encode('utf-8'),
        headers={'Content-Type': 'application/json', 'User-Agent': user_agent},
    )
    if token:
        request.add_header('Authorization', f'Bearer {token}')
    with urllib.request.urlopen(request, timeout=WEBHOOK_TIMEOUT_SECONDS) as response:  # noqa: S310
        return 200 <= response.status < 300


def send_whatsapp_alert(subject: str, message: str, context: dict | None = None) -> bool:
    """Transmet l'alerte à un service de messagerie par webhook (WHATSAPP_ALERT_WEBHOOK_URL), en texte brut."""
    webhook_url = getattr(settings, 'WHATSAPP_ALERT_WEBHOOK_URL', '')
    if not webhook_url:
        return False
    ctx = context or {}
    text = (
        "ALERTE INCIDENT SERVEUR KEURIA\n"
        f"Titre : {subject}\n"
        f"Chemin : {ctx.get('path', '-')}\n"
        f"Request ID : {ctx.get('request_id', '-')}\n\n"
        f"{message}"
    )
    try:
        delivered = _post_json(webhook_url, {"text": text, "content": text}, 'KeurIA-Alerting/1.0', getattr(settings, 'WHATSAPP_API_TOKEN', ''))
    except Exception as exc:  # noqa: BLE001
        alert_logger.warning("Échec de l'envoi de l'alerte par webhook: %s", type(exc).__name__)
        return False
    if delivered:
        alert_logger.info("Alerte par webhook délivrée")
    return delivered


def dispatch_critical_alert(subject: str, message: str, context: dict | None = None, sync: bool = False) -> None:
    """Distribue l'alerte d'erreur 500 sur les canaux d'urgence avec protection anti-répétition et plafond global."""
    ctx = context or {}
    fingerprint = alert_fingerprint(ctx.get('method', 'GET'), ctx.get('path', 'unknown'), ctx.get('status', 500))
    if is_alert_throttled(fingerprint):
        alert_logger.debug("Alerte ignorée (cooldown ou plafond atteint pour %s)", fingerprint)
        return

    def _deliver():
        send_critical_email_alert(subject, message)
        send_whatsapp_alert(subject, message, ctx)

    if sync:
        _deliver()
    else:
        try:
            _alert_pool.submit(_deliver)
        except RuntimeError:  # arrêt de l'interpréteur : l'alerte est perdue, jamais l'application
            alert_logger.warning("Alerte non envoyée : le service d'alerte est arrêté")


class RequestIdFilter(logging.Filter):
    """Ajoute `request_id` à chaque enregistrement (« - » hors requête, par exemple dans une commande de gestion)."""

    def filter(self, record: logging.LogRecord) -> bool:
        record.request_id = _request_id.get()
        return True


class JsonFormatter(logging.Formatter):
    """Une ligne JSON par événement : exploitable tel quel par un agrégateur (Loki, ELK, CloudWatch...)."""

    def format(self, record: logging.LogRecord) -> str:
        payload = {
            'time': self.formatTime(record, '%Y-%m-%dT%H:%M:%S%z'),
            'level': record.levelname,
            'logger': record.name,
            'request_id': getattr(record, 'request_id', '-'),
            'message': record.getMessage(),
        }
        for key in ('method', 'path', 'status', 'duration_ms', 'user_id'):
            if hasattr(record, key):
                payload[key] = getattr(record, key)
        if record.exc_info:
            payload['exception'] = self.formatException(record.exc_info)
        return json.dumps(payload, ensure_ascii=False)


class RequestContextMiddleware:
    """Attribue un identifiant à chaque requête (en-tête `X-Request-ID` repris ou créé, renvoyé dans la réponse),
    journalise une ligne d'accès par requête et déclenche l'alerting d'urgence en cas d'erreur 500."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        supplied = request.headers.get('X-Request-ID', '')
        request_id = supplied if _VALID_REQUEST_ID.match(supplied) else uuid.uuid4().hex
        token = _request_id.set(request_id)
        started = time.perf_counter()
        status_code = 500
        exc_caught = None

        try:
            response = self.get_response(request)
            status_code = response.status_code
            response['X-Request-ID'] = request_id
            return response
        except Exception as exc:
            exc_caught = exc
            raise
        finally:
            duration_ms = round((time.perf_counter() - started) * 1000)
            user = getattr(request, 'user', None)
            user_id = user.pk if getattr(user, 'is_authenticated', False) else None

            if not request.path.startswith(_QUIET_PREFIXES):
                access_logger.info(
                    '%s %s -> %s', request.method, request.path, status_code,
                    extra={
                        'method': request.method, 'path': request.path, 'status': status_code,
                        'duration_ms': duration_ms,
                        'user_id': user_id,
                    },
                )

            if status_code >= 500:
                subject = f"[KeurIA ALERTE {status_code}] Incident sur {request.method} {request.path}"
                detail_lines = [
                    "Alerte d'incident serveur sur KeurIA :",
                    f"- Request ID : {request_id}",
                    f"- Méthode HTTP : {request.method}",
                    f"- URL demandée : {request.path}",
                    f"- Code retour : {status_code}",
                    f"- Durée : {duration_ms} ms",
                    f"- Utilisateur ID : {user_id or 'Anonyme'}",
                ]
                if exc_caught:
                    # Le type seulement : le message peut contenir des données personnelles. Le détail est dans les journaux (Request ID).
                    detail_lines.append(f"- Type d'exception : {type(exc_caught).__name__}")

                dispatch_critical_alert(
                    subject=subject,
                    message="\n".join(detail_lines),
                    context={
                        'request_id': request_id,
                        'method': request.method,
                        'path': request.path,
                        'status': status_code,
                        'user_id': user_id,
                    },
                    sync=False,
                )

            _request_id.reset(token)
