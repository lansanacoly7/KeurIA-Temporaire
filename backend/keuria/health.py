"""Sondes de santé pour l'orchestrateur (Docker, Kubernetes, répartiteur de charge) et la supervision.

  GET /api/health/live   : le processus répond (ne touche à aucune dépendance : un redémarrage ne réglerait pas une panne de base).
  GET /api/health/ready  : le service peut recevoir du trafic (base de données et cache joignables).

Sans authentification, sans cookie et sans détail technique : seules les réponses « ok » / « degraded » sont publiques.
"""
import logging
import uuid

from django.core.cache import cache
from django.db import connection
from django.http import JsonResponse
from django.views.decorators.cache import never_cache
from django.views.decorators.http import require_GET

logger = logging.getLogger(__name__)


@require_GET
@never_cache
def live(request):
    return JsonResponse({'status': 'ok'})


def _database_ok() -> bool:
    try:
        with connection.cursor() as cursor:
            cursor.execute('SELECT 1')
            cursor.fetchone()
        return True
    except Exception:
        logger.exception('Sonde de santé : base de données injoignable')
        return False


def _cache_ok() -> bool:
    key = f'health:{uuid.uuid4().hex}'
    try:
        cache.set(key, '1', 5)
        ok = cache.get(key) == '1'
        cache.delete(key)
        return ok
    except Exception:
        logger.exception('Sonde de santé : cache injoignable')
        return False


@require_GET
@never_cache
def ready(request):
    checks = {'database': _database_ok(), 'cache': _cache_ok()}
    healthy = all(checks.values())
    return JsonResponse({'status': 'ok' if healthy else 'degraded', 'checks': checks}, status=200 if healthy else 503)
