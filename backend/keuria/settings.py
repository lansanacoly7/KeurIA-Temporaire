import os
import sys
from pathlib import Path

import dj_database_url
from django.core.exceptions import ImproperlyConfigured
from django.core.management.utils import get_random_secret_key
# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

try:
    from dotenv import load_dotenv
    # Charger les variables d'environnement depuis .env
    load_dotenv(BASE_DIR / '.env')
except ImportError:
    env_file = BASE_DIR / '.env'
    if env_file.is_file():
        for line in env_file.read_text(encoding='utf-8').splitlines():
            line = line.strip()
            if not line or line.startswith('#') or '=' not in line:
                continue
            key, val = line.split('=', 1)
            key = key.strip()
            val = val.strip().strip('"').strip("'")
            os.environ.setdefault(key, val)

# Quick-start development settings - unsuitable for production
# See https://docs.djangoproject.com/en/5.1/howto/deployment/checklist/

# DEBUG est désactivé par défaut : le mode développement doit être demandé
# explicitement (DEBUG=True dans backend/.env, voir .env.example).
DEBUG = os.environ.get('DEBUG', 'False') == 'True'

def _dev_secret_key() -> str:
    """Clé aléatoire pour le développement sans .env, gardée dans un fichier ignoré par git : les sessions survivent ainsi aux
    redémarrages, et aucun secret n'est écrit dans le code. Jamais utilisée hors DEBUG."""
    path = BASE_DIR / '.dev_secret_key'
    try:
        if path.exists():
            stored = path.read_text(encoding='utf-8').strip()
            if len(stored) >= 50:
                return stored
        key = get_random_secret_key()
        path.write_text(key, encoding='utf-8')
        return key
    except OSError:
        return get_random_secret_key()


SECRET_KEY = os.environ.get('SECRET_KEY', '')
if not SECRET_KEY:
    if not DEBUG:
        raise ImproperlyConfigured("SECRET_KEY doit être défini (copier backend/.env.example en backend/.env).")
    SECRET_KEY = _dev_secret_key()
elif SECRET_KEY.startswith('change-me') and not DEBUG:
    # La valeur d'exemple de .env.example est publique : elle ne doit jamais signer les sessions d'un site en ligne.
    raise ImproperlyConfigured("SECRET_KEY est encore la valeur d'exemple : générer une clé aléatoire (voir .env.example).")

ALLOWED_HOSTS = [h.strip() for h in os.environ.get('ALLOWED_HOSTS', 'localhost,127.0.0.1').split(',') if h.strip()]
# Hôtes internes toujours acceptés, en plus des noms publics : la sonde de santé du conteneur (127.0.0.1) et le relais Next.js
# (qui joint Django par le nom de son service Docker, « backend »). Ils ne sont pas joignables depuis Internet.
INTERNAL_HOSTS = [h.strip() for h in os.environ.get('INTERNAL_HOSTS', '127.0.0.1,localhost,backend').split(',') if h.strip()]
ALLOWED_HOSTS += [h for h in INTERNAL_HOSTS if h not in ALLOWED_HOSTS]

# Application definition

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',

    # Librairies tierces
    'rest_framework',
    'drf_spectacular',
    'corsheaders',

    # Modules internes (Architecture Modulaire)
    'apps.accounts.apps.AccountsConfig',
    'apps.schools.apps.SchoolsConfig',
    'apps.learners.apps.LearnersConfig',
    'apps.progress.apps.ProgressConfig',
    'apps.curriculum.apps.CurriculumConfig',
    'apps.scolaire.apps.ScolaireConfig',
    'apps.superadmin.apps.SuperadminConfig',
    'apps.famille.apps.FamilleConfig',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware', # Doit être le premier
    'keuria.observability.RequestContextMiddleware',  # identifiant de requête + journal d'accès (en tête pour mesurer toute la durée)
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'keuria.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'keuria.wsgi.application'

# Database
# Bascule intelligente : SQLite en dev, PostgreSQL si DATABASE_URL est fourni
if os.environ.get('DATABASE_URL'):
    DATABASES = {
        'default': dj_database_url.config(
            default=os.environ.get('DATABASE_URL'),
            conn_max_age=600,
            conn_health_checks=True,
        )
    }
    # sqlite:///db.sqlite3 est relatif au dossier courant : lancé depuis la
    # racine du dépôt, Django créait une base vide ailleurs. On ancre les
    # chemins SQLite relatifs sur backend/.
    _db = DATABASES['default']
    if _db['ENGINE'].endswith('sqlite3') and not Path(_db['NAME']).is_absolute():
        _db['NAME'] = BASE_DIR / _db['NAME']
else:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'db.sqlite3',
        }
    }

# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

# Hasheur de mot de passe : PBKDF2-SHA256 uniquement (les comptes existants utilisent déjà pbkdf2_sha256).
PASSWORD_HASHERS = [
    'django.contrib.auth.hashers.PBKDF2PasswordHasher',
]
if DEBUG:
    # Développement seulement : connexion rapide sur un ordinateur chargé (voir keuria/dev_hashers.py). Jamais utilisé en production.
    PASSWORD_HASHERS = ['keuria.dev_hashers.DevPBKDF2PasswordHasher']

# Modèle Utilisateur Personnalisé
AUTH_USER_MODEL = 'accounts.User'

# Internationalization
LANGUAGE_CODE = 'fr-fr'
TIME_ZONE = os.environ.get('TIME_ZONE', 'Africa/Dakar')
USE_I18N = True
USE_TZ = True

# Static files (CSS, JavaScript, Images)
STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
STORAGES = {
    'default': {
        'BACKEND': 'django.core.files.storage.FileSystemStorage',
    },
    'staticfiles': {
        'BACKEND': 'whitenoise.storage.CompressedStaticFilesStorage',
    },
}

# Le logo d'une école (2 Mo max, contrôlé dans scolaire/services/ecole.py) peut arriver en base64 dans un corps JSON :
# ~2,8 Mo. La limite par défaut de Django (2,5 Mo) refuserait la requête avant ce contrôle, sans message clair.
DATA_UPLOAD_MAX_MEMORY_SIZE = 4 * 1024 * 1024

# Media files (Logos d'écoles, uploads)
MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'
# Les logos d'école (images PNG/JPEG/WebP vérifiées à l'envoi) sont servis par Django, y compris hors mode développement,
# tant qu'aucun serveur web ou stockage objet ne s'en charge : mettre SERVE_MEDIA=False dès que c'est le cas.
SERVE_MEDIA = DEBUG or os.environ.get('SERVE_MEDIA', 'True') == 'True'

# L'administration Django (/admin/) n'est active qu'en développement, ou si ADMIN_ENABLED=True. Ses fichiers statiques ne sont pas
# servis par ce projet en production et la gestion des comptes se fait dans l'espace Super Admin : la laisser fermée réduit la surface
# d'attaque. Si elle est activée, changer ADMIN_URL (ex. ADMIN_URL=gestion-7f3a/) pour ne pas la publier à l'adresse habituelle.
ADMIN_ENABLED = DEBUG or os.environ.get('ADMIN_ENABLED', 'False') == 'True'
ADMIN_URL = os.environ.get('ADMIN_URL', 'admin/').strip('/') + '/'

# `python manage.py test` : cache vidé entre les tests et hachage rapide (voir keuria/test_runner.py).
TEST_RUNNER = 'keuria.test_runner.KeuriaTestRunner'

# Conservation limitée des comptes familiaux (voir apps/accounts/retention.py et docs/DONNEES_PERSONNELLES.md) :
# 2 ans sans connexion, avertissement, désactivation 30 jours plus tard, suppression 30 jours après.
RETENTION_INACTIVE_DAYS = int(os.environ.get('RETENTION_INACTIVE_DAYS', '730'))
RETENTION_NOTICE_DAYS = int(os.environ.get('RETENTION_NOTICE_DAYS', '30'))
RETENTION_GRACE_DAYS = int(os.environ.get('RETENTION_GRACE_DAYS', '30'))

# Default primary key field type
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# Configuration Django REST Framework
# Authentification : session Django uniquement (pas de JWT). Toute vue est
# réservée aux utilisateurs connectés sauf si elle déclare AllowAny.
REST_FRAMEWORK = {
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'apps.accounts.authentication.KeurSessionAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated',
    ),
    'DEFAULT_RENDERER_CLASSES': (
        'rest_framework.renderers.JSONRenderer',
    ),
    'EXCEPTION_HANDLER': 'keuria.exceptions.api_exception_handler',
    # Filet de sécurité sur toutes les routes : une vue qui déclare ses propres limites (connexion, Palou, activité...) les garde.
    'DEFAULT_THROTTLE_CLASSES': (
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle',
    ),
    'DEFAULT_THROTTLE_RATES': {
        # Large : une classe entière derrière une seule adresse IP (réseau d'école) ne doit jamais être gênée par erreur.
        'anon': os.environ.get('ANON_THROTTLE_RATE', '600/min'),
        'user': os.environ.get('USER_THROTTLE_RATE', '1200/min'),
        'auth': os.environ.get('AUTH_THROTTLE_RATE', '60/min'),
        'palou': os.environ.get('PALOU_THROTTLE_RATE', '20/min'),
        'activity': os.environ.get('ACTIVITY_THROTTLE_RATE', '60/min'),
        # Rapports d'erreurs envoyés par les navigateurs (voir keuria/monitoring.py) : assez large pour une classe, assez étroit contre l'abus.
        'client_error': os.environ.get('CLIENT_ERROR_THROTTLE_RATE', '60/min'),
    },
    # Django n'est joignable qu'à travers le proxy Next.js : l'IP réelle du
    # client est la dernière entrée de X-Forwarded-For ajoutée par ce proxy.
    'NUM_PROXIES': int(os.environ.get('NUM_PROXIES', '1')),
}

# Palou, l'assistant IA des apprenants (API Anthropic). Sans clé, l'endpoint
# répond « indisponible » : aucune réponse n'est jamais simulée.
ANTHROPIC_API_KEY = os.environ.get('ANTHROPIC_API_KEY', '')
PALOU_MODEL = os.environ.get('PALOU_MODEL', 'claude-haiku-4-5-20251001')
# Durée pendant laquelle le serveur retient la conversation d'un enfant avec Palou (dans le cache, jamais en base).
PALOU_MEMORY_SECONDS = int(os.environ.get('PALOU_MEMORY_SECONDS', '3600'))
# Plafond de messages par enfant et par jour (maîtrise du coût du service et du temps passé à discuter) ; 0 = pas de plafond.
PALOU_DAILY_MESSAGES = int(os.environ.get('PALOU_DAILY_MESSAGES', '60'))

# Les propositions d'un défi ou d'une énigme sont mélangées par le serveur (voir apps/progress/shuffle.py).
SHUFFLE_ANSWER_OPTIONS = os.environ.get('SHUFFLE_ANSWER_OPTIONS', 'True') == 'True'

# Alertes push des parents (Web Push). Sans clés, elles sont déclarées indisponibles.
# Générer les clés avec : python manage.py generate_vapid_keys
VAPID_PUBLIC_KEY = os.environ.get('VAPID_PUBLIC_KEY', '')
VAPID_PRIVATE_KEY = os.environ.get('VAPID_PRIVATE_KEY', '')
VAPID_CLAIMS_SUBJECT = os.environ.get('VAPID_CLAIMS_SUBJECT', 'mailto:contact@example.com')

# Cache : Redis quand REDIS_URL est défini (obligatoire avec plusieurs processus : verrouillage de connexion,
# limitation de débit et déverrouillages y sont comptés). Sans lui, chaque processus compte séparément ;
# manage.py check --deploy le signale (voir keuria/checks.py).
REDIS_URL = os.environ.get('REDIS_URL', '')
if REDIS_URL:
    CACHES = {'default': {'BACKEND': 'django.core.cache.backends.redis.RedisCache', 'LOCATION': REDIS_URL}}
else:
    CACHES = {'default': {'BACKEND': 'django.core.cache.backends.locmem.LocMemCache', 'LOCATION': 'keuria-locmem'}}

# Sessions : stockées en cache avec repli en base (Redis en production, LocMem + SQLite en dev local).
# Évite la perte de sessions et les erreurs UpdateError lors des rechargements en dev,
# tout en assurant des lectures rapides en production.
SESSION_ENGINE = os.environ.get('SESSION_ENGINE', 'django.contrib.sessions.backends.cached_db')
SESSION_CACHE_ALIAS = 'default'

# Notifications aux parents (e-mails, web push) exécutées en arrière-plan pour ne pas bloquer les élèves
ASYNC_NOTIFICATIONS = os.environ.get('ASYNC_NOTIFICATIONS', 'True') == 'True'
# Nombre de fils d'exécution dédiés à l'envoi des notifications parentales (par processus Gunicorn).
NOTIFY_WORKERS = max(1, int(os.environ.get('NOTIFY_WORKERS', '4')))

# Sessions : cookie HttpOnly signé côté serveur. Le nom keur_ia_session est
# conservé car le SSR Next.js (frontend/app/local-auth.ts) le relaie à Django.
SESSION_COOKIE_NAME = 'keur_ia_session'
# La session se termine à la fermeture du navigateur (voir start_session) ; cette durée n'est qu'un plafond côté serveur.
SESSION_COOKIE_AGE = 14 * 24 * 3600
# Déconnexion après ce nombre de minutes sans action de la personne (0 désactive la limite). Seules les vraies actions
# comptent (signal POST /api/auth/activity), pas les requêtes d'arrière-plan : un onglet oublié ouvert finit par expirer.
# Comptes d'administration (plateforme et direction d'école) :
ADMIN_IDLE_TIMEOUT_MINUTES = int(os.environ.get('ADMIN_IDLE_TIMEOUT_MINUTES', '30'))
# Parents, enseignants et élèves :
USER_IDLE_TIMEOUT_MINUTES = int(os.environ.get('USER_IDLE_TIMEOUT_MINUTES', '120'))
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = 'Lax'
SESSION_COOKIE_SECURE = not DEBUG

# CSRF : le frontend lit le cookie csrftoken et renvoie sa valeur dans
# l'en-tête X-CSRFToken (frontend/app/csrf-fetch.ts).
CSRF_COOKIE_SAMESITE = 'Lax'
CSRF_COOKIE_SECURE = not DEBUG

if not DEBUG:
    SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
    SECURE_SSL_REDIRECT = os.environ.get('SECURE_SSL_REDIRECT', 'True') == 'True'
    # Les sondes de santé (appelées en HTTP simple par l'orchestrateur, derrière le proxy) ne doivent jamais être redirigées.
    SECURE_REDIRECT_EXEMPT = [r'^api/health/']
    # Un an : le navigateur n'accepte plus que HTTPS pour ce site. Réduire (ex. 3600) seulement pour un premier essai de mise en ligne.
    SECURE_HSTS_SECONDS = int(os.environ.get('SECURE_HSTS_SECONDS', '31536000'))
    # À activer (avec SECURE_HSTS_SECONDS élevé) seulement quand tous les sous-domaines servent du HTTPS.
    SECURE_HSTS_INCLUDE_SUBDOMAINS = os.environ.get('SECURE_HSTS_INCLUDE_SUBDOMAINS', 'False') == 'True'
    SECURE_HSTS_PRELOAD = os.environ.get('SECURE_HSTS_PRELOAD', 'False') == 'True'
    SECURE_REFERRER_POLICY = 'same-origin'
    SECURE_CONTENT_TYPE_NOSNIFF = True
    X_FRAME_OPTIONS = 'DENY'

# Journaux : tout sort sur la sortie standard (Docker/systemd les collectent), en JSON en production (LOG_JSON=False pour du texte).
# Sans cette configuration, Django n'écrit PAS les erreurs 500 hors DEBUG : la trace d'un incident serait perdue.
LOG_LEVEL = os.environ.get('LOG_LEVEL', 'INFO').upper()
LOG_JSON = os.environ.get('LOG_JSON', 'False' if DEBUG else 'True') == 'True'
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'filters': {'request_id': {'()': 'keuria.observability.RequestIdFilter'}},
    'formatters': {
        'plain': {'format': '%(asctime)s %(levelname)s %(name)s [%(request_id)s] %(message)s'},
        'json': {'()': 'keuria.observability.JsonFormatter'},
    },
    'handlers': {
        'console': {'class': 'logging.StreamHandler', 'formatter': 'json' if LOG_JSON else 'plain', 'filters': ['request_id']},
    },
    'root': {'handlers': ['console'], 'level': LOG_LEVEL},
    'loggers': {
        # Les messages de Django passent par la même sortie (une seule, pas de doublon avec la configuration par défaut).
        'django': {'handlers': ['console'], 'level': 'INFO', 'propagate': False},
        'django.server': {'handlers': ['console'], 'level': 'INFO', 'propagate': False},
    },
}

# Suivi des erreurs (Sentry ou compatible), facultatif : actif seulement si SENTRY_DSN est défini ET `sentry-sdk` installé.
# Aucune donnée personnelle n'est envoyée volontairement (send_default_pii=False) : les élèves sont des mineurs.
SENTRY_DSN = os.environ.get('SENTRY_DSN', '')
if SENTRY_DSN:
    try:
        import sentry_sdk

        sentry_sdk.init(
            dsn=SENTRY_DSN,
            environment=os.environ.get('SENTRY_ENVIRONMENT', 'development' if DEBUG else 'production'),
            release=os.environ.get('RELEASE') or None,
            traces_sample_rate=float(os.environ.get('SENTRY_TRACES_SAMPLE_RATE', '0')),
            send_default_pii=False,
        )
    except ImportError:
        print('SENTRY_DSN est défini mais sentry-sdk n\'est pas installé : le suivi des erreurs est désactivé.', file=sys.stderr)

# Configuration CORS (Autoriser Next.js)
# CORS_ALLOWED_ORIGINS était déclaré dans .env mais jamais lu par ce fichier ;
# il l'est maintenant (liste séparée par des virgules), avec un repli sur les
# ports de dev connus (3000/3001 pour next dev/start, 5173 pour Vite/legacy).
_cors_origins_env = os.environ.get('CORS_ALLOWED_ORIGINS')
if not _cors_origins_env and not DEBUG:
    raise ImproperlyConfigured('CORS_ALLOWED_ORIGINS doit être défini en production (origine réelle du frontend).')
CORS_ALLOWED_ORIGINS = (
    [origin.strip() for origin in _cors_origins_env.split(',') if origin.strip()]
    if _cors_origins_env
    else [
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]
)
CORS_ALLOW_CREDENTIALS = True # Nécessaire pour envoyer le cookie keur_ia_session

# Le frontend authentifie via la session Django ; sans CSRF_TRUSTED_ORIGINS,
# tout POST/PUT/DELETE authentifié échoue en 403 ("Origin checking failed")
# car la requête passe par le proxy Next.js (Origin: http://localhost:3001
# vu par Django qui écoute sur 127.0.0.1:8000).
CSRF_TRUSTED_ORIGINS = CORS_ALLOWED_ORIGINS

# Configuration E-mail
# En production: mettre EMAIL_HOST_USER et EMAIL_HOST_PASSWORD dans .env
# Pour les e-mails en console (dev sans Gmail): EMAIL_BACKEND=console
_email_backend_override = os.environ.get('EMAIL_BACKEND', '').lower()
_email_user = os.environ.get('EMAIL_HOST_USER', '')
_email_password = os.environ.get('EMAIL_HOST_PASSWORD', '')

if _email_backend_override != 'console' and _email_user and _email_password:
    # Envoi réel. Les valeurs par défaut visent Gmail (avec un mot de passe d'application) ; tout autre
    # fournisseur se règle par variables d'environnement. Sans cela, des identifiants d'un autre serveur
    # étaient envoyés à Gmail, qui coupe la connexion pendant l'authentification : l'erreur
    # (SMTPServerDisconnected) ressemble alors à une panne réseau et n'indique pas la vraie cause.
    EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
    EMAIL_HOST = os.environ.get('EMAIL_HOST', 'smtp.gmail.com')
    EMAIL_PORT = int(os.environ.get('EMAIL_PORT', '587'))
    # Port 465 : chiffré dès la connexion (SSL implicite). Port 587 : connexion en clair puis STARTTLS.
    # Les deux réglages s'excluent, Django refuse de démarrer si les deux sont vrais.
    EMAIL_USE_SSL = os.environ.get('EMAIL_USE_SSL', 'False') == 'True'
    EMAIL_USE_TLS = not EMAIL_USE_SSL and os.environ.get('EMAIL_USE_TLS', 'True') == 'True'
    EMAIL_TIMEOUT = int(os.environ.get('EMAIL_TIMEOUT', '10'))
    EMAIL_HOST_USER = _email_user
    EMAIL_HOST_PASSWORD = _email_password
    # Certains fournisseurs refusent un expéditeur différent du compte authentifié : par défaut, le compte lui-même.
    DEFAULT_FROM_EMAIL = os.environ.get('DEFAULT_FROM_EMAIL', f'KeurIA <{_email_user}>')
else:
    # Affichage dans la console (développement sans SMTP)
    EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'
    DEFAULT_FROM_EMAIL = 'KeurIA <no-reply@keuria.local>'
    # La console Windows (cp1252) ne sait pas écrire les emojis des e-mails :
    # sans cela, l'envoi échoue en développement.
    for _stream in (sys.stdout, sys.stderr):
        if hasattr(_stream, 'reconfigure'):
            _stream.reconfigure(encoding='utf-8', errors='replace')

# ─── Documentation OpenAPI 3.0 / Swagger UI (drf-spectacular) ───────────────────
# En développement (DEBUG=True), la documentation est accessible librement.
# En production, elle requiert des privilèges administrateur (IsAdminUser)
# pour éviter d'exposer publiquement la cartographie d'attaque de l'API.
ENABLE_PUBLIC_API_DOCS = os.environ.get('ENABLE_PUBLIC_API_DOCS', 'False') == 'True'

# Inscription d'un parent : l'équipe kEur IA doit d'abord accepter la demande avant que le parent (et ses enfants) puisse
# se connecter. Règle prévue comme temporaire, d'où l'interrupteur : PARENT_REGISTRATION_REQUIRES_APPROVAL=False la coupe
# sans toucher au code (les demandes déjà en attente restent bloquées jusqu'à décision).
PARENT_REGISTRATION_REQUIRES_APPROVAL = os.environ.get('PARENT_REGISTRATION_REQUIRES_APPROVAL', 'True') == 'True'

# Studio de contenus (équipe kEur IA) : une publication ne prend effet qu'après ce délai de sécurité, pendant lequel on peut
# encore l'annuler. Les médias sont gardés dans la base de données : leur poids est donc plafonné (voir apps/curriculum/media.py).
STUDIO_PUBLISH_DELAY_MINUTES = int(os.environ.get('STUDIO_PUBLISH_DELAY_MINUTES', '15'))
STUDIO_IMAGE_MAX_MB = int(os.environ.get('STUDIO_IMAGE_MAX_MB', '8'))
STUDIO_VIDEO_MAX_MB = int(os.environ.get('STUDIO_VIDEO_MAX_MB', '20'))
STUDIO_MEDIA_MAX_MB = int(os.environ.get('STUDIO_MEDIA_MAX_MB', '500'))
STUDIO_MEDIA_WARNING_PERCENT = int(os.environ.get('STUDIO_MEDIA_WARNING_PERCENT', '80'))
_api_docs_permissions = (
    ['rest_framework.permissions.AllowAny']
    if (DEBUG or ENABLE_PUBLIC_API_DOCS)
    else ['rest_framework.permissions.IsAdminUser']
)

# drf-spectacular signale ~310 points de DOCUMENTATION (vues sans sérialiseur déclaré, identifiants d'opération en double) : ils décrivent la
# qualité du schéma OpenAPI, pas la sécurité du déploiement. Ils noieraient les vrais avertissements de `check --deploy`, donc on les écarte
# de cette commande ; `python manage.py spectacular --file schema.yml` les affiche toujours. À résorber peu à peu en décrivant les vues.
SILENCED_SYSTEM_CHECKS = ['drf_spectacular.W001', 'drf_spectacular.W002']

SPECTACULAR_SETTINGS = {
    'TITLE': 'kEur IA API',
    'DESCRIPTION': "Documentation OpenAPI 3.0 interactive des points d'accès de la plateforme éducative kEur IA (apprentissage de l'IA pour les enfants au Sénégal).",
    'VERSION': '1.0.0',
    'SERVE_INCLUDE_SCHEMA': False,
    'COMPONENT_SPLIT_REQUEST': True,
    'SERVE_PERMISSIONS': _api_docs_permissions,
    'TAGS': [
        {'name': 'Authentification', 'description': 'Connexion, déconnexion, session et réinitialisation de mot de passe'},
        {'name': 'Progression & Énigmes', 'description': "Progression des leçons, gain d'XP, étoiles, badges et usage quotidien"},
        {'name': 'Écoles & Classes', 'description': 'Gestion des établissements scolaires, classes et affectations'},
        {'name': 'Curriculum', 'description': 'Modules pédagogiques et contenu des parcours'},
        {'name': 'Superadmin', 'description': 'Administration de la plateforme et métriques globales'},
    ],
}

# ─── Observabilité & Alerting d'Urgence (E-mail & WhatsApp) ────────────────────
# Aucun destinataire par défaut : une adresse écrite dans le code recevrait les erreurs de n'importe quelle installation.
# Sans ADMINS_EMAILS, aucune alerte e-mail n'est envoyée (voir keuria/observability.py).
ADMINS = [email.strip() for email in os.environ.get('ADMINS_EMAILS', '').split(',') if email.strip()]
MANAGERS = ADMINS

# Les adresses de webhook doivent être en HTTPS (contrôlé à l'envoi).
WHATSAPP_ALERT_WEBHOOK_URL = os.environ.get('WHATSAPP_ALERT_WEBHOOK_URL', '')
WHATSAPP_API_TOKEN = os.environ.get('WHATSAPP_API_TOKEN', '')


