FROM python:3.13-slim

ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 PIP_NO_CACHE_DIR=1 PIP_DISABLE_PIP_VERSION_CHECK=1
WORKDIR /app

# Les dépendances d'abord : cette couche n'est reconstruite que si requirements.txt change.
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .
RUN useradd --create-home app && mkdir -p /app/media /app/staticfiles
# Valeurs factices, réservées à cette étape : en production, les réglages de sécurité exigent une clé secrète et les origines autorisées (voir keuria/settings.py).
RUN SECRET_KEY=build-collectstatic-dummy-key CORS_ALLOWED_ORIGINS=https://build.invalid CSRF_TRUSTED_ORIGINS=https://build.invalid python manage.py collectstatic --noinput
RUN chown -R app /app
USER app

EXPOSE 8000

# Santé du conteneur : le processus répond (sonde « live », sans dépendance). La disponibilité réelle (base, cache) se lit sur
# /api/health/ready. Python plutôt que curl : l'image slim n'a pas curl.
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD ["python", "-c", "import sys, urllib.request; sys.exit(0 if urllib.request.urlopen('http://127.0.0.1:8000/api/health/live', timeout=4).status == 200 else 1)"]

# Les migrations se lancent à part (service « migrate » du docker-compose), pas au démarrage de chaque worker.
CMD ["gunicorn", "keuria.wsgi:application", "-c", "gunicorn.conf.py"]
