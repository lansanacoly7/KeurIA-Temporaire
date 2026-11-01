"""Vérifications de déploiement propres à KeurIA (visibles avec `manage.py check --deploy`)."""
import os
from urllib.parse import urlsplit

from django.conf import settings
from django.core.checks import Error, Tags, Warning, register


@register(Tags.security, deploy=True)
def shared_cache_configured(app_configs, **kwargs):
    """Sans cache partagé, chaque worker compte à part : un attaquant obtient autant d'essais qu'il y a de workers, et
    un déverrouillage parental accordé sur un worker est ignoré par les autres. C'est une erreur de déploiement."""
    backend = settings.CACHES['default']['BACKEND']
    if backend.endswith('LocMemCache') and os.environ.get('ALLOW_LOCAL_CACHE', 'False') != 'True':
        return [Error(
            "Le cache est local à chaque processus : le verrouillage des connexions, la limitation de débit et "
            "les dérogations parentales ne sont pas partagés entre les workers.",
            hint="Définir REDIS_URL (voir .env.example). Un seul processus : ALLOW_LOCAL_CACHE=True.",
            id='keuria.E001',
        )]
    return []


@register(Tags.security, deploy=True)
def admin_is_not_published_by_default(app_configs, **kwargs):
    if settings.ADMIN_ENABLED and settings.ADMIN_URL == 'admin/':
        return [Warning(
            "L'administration Django est active à l'adresse habituelle /admin/.",
            hint="Changer ADMIN_URL (ex. ADMIN_URL=gestion-7f3a/) ou désactiver ADMIN_ENABLED.",
            id='keuria.W002',
        )]
    return []

@register(Tags.security, deploy=True)
def hosts_are_configured(app_configs, **kwargs):
    """Avec la valeur par défaut (localhost seulement), Django refuse toutes les requêtes du vrai nom de domaine."""
    hosts = {h for h in settings.ALLOWED_HOSTS if h not in settings.INTERNAL_HOSTS and h not in ('localhost', '127.0.0.1', '[::1]')}
    if not hosts:
        return [Error(
            "ALLOWED_HOSTS ne contient que des hôtes internes : aucune requête du vrai nom de domaine ne sera acceptée.",
            hint="Définir ALLOWED_HOSTS (ex. ALLOWED_HOSTS=keuria.example.org).",
            id='keuria.E003',
        )]
    return []


@register(Tags.security, deploy=True)
def database_is_not_sqlite(app_configs, **kwargs):
    """Sans DATABASE_URL, Django retombe silencieusement sur un fichier SQLite : pas de sauvegarde `pg_dump`, pas d'accès concurrent
    sûr entre workers, et les données de la famille vivraient dans un fichier du conteneur."""
    if settings.DATABASES['default']['ENGINE'].endswith('sqlite3') and os.environ.get('ALLOW_SQLITE', 'False') != 'True':
        return [Error(
            "La base de données est un fichier SQLite : ce n'est pas un moteur de production.",
            hint="Définir DATABASE_URL=postgres://... (voir .env.example). Un essai isolé : ALLOW_SQLITE=True.",
            id='keuria.E005',
        )]
    return []


@register(Tags.security, deploy=True)
def email_is_configured(app_configs, **kwargs):
    """Sans SMTP, les codes de vérification, de réinitialisation et les alertes aux parents s'affichent dans la console du serveur
    au lieu d'être envoyés : personne ne peut s'inscrire ni retrouver son mot de passe."""
    if settings.EMAIL_BACKEND.endswith('console.EmailBackend'):
        return [Error(
            "Aucun serveur d'e-mail n'est configuré : les codes de vérification ne sont jamais envoyés.",
            hint="Définir EMAIL_HOST_USER et EMAIL_HOST_PASSWORD (voir .env.example).",
            id='keuria.E004',
        )]
    return []


@register(Tags.security, deploy=True)
def trusted_origins_cover_public_hosts(app_configs, **kwargs):
    """CSRF_TRUSTED_ORIGINS découle de CORS_ALLOWED_ORIGINS. Si aucune origine ne correspond au domaine public, la lecture
    du site fonctionne mais toute écriture authentifiée échoue en 403 (« Origin checking failed ») : le défaut reste invisible
    jusqu'au premier formulaire envoyé. Une valeur présente mais restée sur localhost passait tous les autres contrôles."""
    if '*' in settings.ALLOWED_HOSTS:
        return []
    public_hosts = {h.lstrip('.') for h in settings.ALLOWED_HOSTS
                    if h not in settings.INTERNAL_HOSTS and h not in ('localhost', '127.0.0.1', '[::1]')}
    if not public_hosts:
        return []  # déjà signalé par keuria.E003
    trusted = {urlsplit(origin).hostname for origin in settings.CSRF_TRUSTED_ORIGINS}
    missing = sorted(h for h in public_hosts if h not in trusted)
    if missing:
        return [Error(
            'Aucune origine de confiance ne correspond à : {}. Les requêtes POST/PUT/DELETE authentifiées seront '
            'refusées en 403 (CSRF : Origin checking failed), alors que la consultation du site fonctionnera.'
            .format(', '.join(missing)),
            hint='Définir CORS_ALLOWED_ORIGINS avec l\'origine publique complète, par exemple '
                 f'CORS_ALLOWED_ORIGINS=https://{missing[0]} (CSRF_TRUSTED_ORIGINS en découle).',
            id='keuria.E006',
        )]
    return []
