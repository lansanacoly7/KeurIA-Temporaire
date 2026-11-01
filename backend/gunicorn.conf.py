"""Configuration de gunicorn (serveur WSGI de production). Tous les réglages se surchargent par variable d'environnement.

Le journal d'accès est écrit par l'application (keuria.observability : identifiant de requête, durée, utilisateur) ; gunicorn ne
double donc pas cette ligne. Ses propres erreurs (démarrage, workers tués) vont sur la sortie d'erreur.
"""
import multiprocessing
import os

bind = os.environ.get('GUNICORN_BIND', '0.0.0.0:8000')

# Règle usuelle (2 x cœurs + 1) plafonnée : chaque worker garde sa connexion PostgreSQL (CONN_MAX_AGE) et sa mémoire.
workers = int(os.environ.get('WEB_CONCURRENCY', min(multiprocessing.cpu_count() * 2 + 1, 4)))
# Des threads absorbent les attentes réseau (Palou, e-mails, push) sans immobiliser un worker entier.
threads = int(os.environ.get('GUNICORN_THREADS', '2'))
worker_class = 'gthread'

timeout = int(os.environ.get('GUNICORN_TIMEOUT', '60'))
graceful_timeout = 30   # laisse finir les requêtes en cours lors d'un redéploiement
keepalive = 5

# Recycle les workers : borne l'effet d'une éventuelle fuite mémoire. Le jitter évite qu'ils redémarrent tous en même temps.
max_requests = int(os.environ.get('GUNICORN_MAX_REQUESTS', '1000'))
max_requests_jitter = 100

accesslog = None
errorlog = '-'
loglevel = os.environ.get('LOG_LEVEL', 'info').lower()

# Fichiers temporaires en mémoire (évite les blocages de disque dans les conteneurs).
worker_tmp_dir = '/dev/shm' if os.path.isdir('/dev/shm') else None
