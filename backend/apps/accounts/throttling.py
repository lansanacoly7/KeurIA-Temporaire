"""Protection contre le bruteforce des mots de passe et des codes de réinitialisation.

Deux mécanismes complémentaires :
- `AuthRateThrottle` (DRF) limite le débit brut des endpoints d'authentification par IP ;
- `LoginLockout` bloque temporairement un compte (par e-mail) et une IP après
  plusieurs échecs, même si l'attaquant ralentit son rythme.

Les compteurs vivent dans le cache Django. En production avec plusieurs
processus, configurer un cache partagé (Redis) sinon chaque processus compte
séparément.
"""
import hashlib

from django.core.cache import cache
from rest_framework.throttling import SimpleRateThrottle


class AuthRateThrottle(SimpleRateThrottle):
    scope = 'auth'

    def get_cache_key(self, request, view):
        return self.cache_format % {'scope': self.scope, 'ident': self.get_ident(request)}


class LoginLockout:
    # Trois compteurs :
    # - couple (compte, IP) : 5 échecs verrouillent CETTE IP sur CE compte. Un tiers ne peut donc pas bloquer
    #   le vrai propriétaire en tapant de faux mots de passe depuis une autre adresse ;
    # - compte seul : seuil élevé (30), qui arrête un bruteforce distribué sur plusieurs IP ;
    # - IP seule : 50, car toute une classe partage souvent la même IP (école, box).
    MAX_FAILURES_PER_PAIR = 5
    MAX_FAILURES_PER_EMAIL = 30
    MAX_FAILURES_PER_IP = 50
    LOCKOUT_SECONDS = 15 * 60

    def __init__(self, email, ip, scope='login'):
        """`scope` sépare les compteurs (connexion, déverrouillage parental…) : `email` peut être
        n'importe quel identifiant stable de la cible (adresse, ou « unlock:<id enfant> »)."""
        email_digest = hashlib.sha256(email.encode()).hexdigest()
        self.limits = {
            f'{scope}-fail:pair:{email_digest}:{ip}': self.MAX_FAILURES_PER_PAIR,
            f'{scope}-fail:email:{email_digest}': self.MAX_FAILURES_PER_EMAIL,
            f'{scope}-fail:ip:{ip}': self.MAX_FAILURES_PER_IP,
        }
        self.keys = list(self.limits)
    def is_locked(self):
        return any((cache.get(key) or 0) >= limit for key, limit in self.limits.items())

    def register_failure(self):
        for key in self.keys:
            cache.add(key, 0, self.LOCKOUT_SECONDS)
            try:
                cache.incr(key)
            except ValueError:
                cache.set(key, 1, self.LOCKOUT_SECONDS)

    def reset(self):
        # Une connexion réussie efface les compteurs du compte, pas celui de l'IP (partagée).
        cache.delete_many([key for key in self.keys if not key.startswith(('login-fail:ip:', 'unlock-fail:ip:')) and ':ip:' not in key])


def client_ip(request):
    # Même identification que les throttles DRF : avec NUM_PROXIES=1 (voir
    # settings), on retient l'IP ajoutée par le proxy Next.js dans
    # X-Forwarded-For plutôt que 127.0.0.1, sans faire confiance aux valeurs
    # envoyées par le client lui-même.
    return AuthRateThrottle().get_ident(request)
