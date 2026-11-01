# Déploiement de kEur IA

Cible : un serveur Linux avec Docker (Compose v2) et un nom de domaine servi en HTTPS par un reverse proxy (Caddy, Nginx, Traefik…).
Le fichier `docker-compose.yml` à la racine décrit toute la pile : PostgreSQL, Redis, migrations, backend Django (gunicorn),
tâche de conservation des données, sauvegarde quotidienne et frontend Next.js.

**Déploiement sans Docker** : pour une installation native sur Debian (services systemd, PostgreSQL et Redis du système, nginx en frontal), suivre `docs/DEPLOIEMENT_DEBIAN_NGINX.md` — unités et configuration prêtes à copier dans `deploy/`. Ce document-ci ne s'applique alors pas : `docker-compose.yml` ne sert plus qu'à la démonstration locale.

## 1. Prérequis

| Élément | Détail |
|---|---|
| Docker + Compose v2 | `docker compose version` |
| Domaine + certificat HTTPS | Terminé par le reverse proxy, qui transmet `X-Forwarded-Proto: https` |
| Serveur d'e-mail | Les codes de vérification des comptes sont envoyés par e-mail (voir `EMAIL_*`) |
| Stockage hors machine | Pour copier le volume `backups` (voir `docs/EXPLOITATION.md`) |

## 2. Configuration

1. `cp backend/.env.example backend/.env` puis renseigner au minimum :
   - `SECRET_KEY` : valeur longue et aléatoire (`python -c "from django.core.management.utils import get_random_secret_key as g; print(g())"`).
   - `DEBUG=False`
   - `ALLOWED_HOSTS` : le domaine public (virgules pour plusieurs).
   - `CORS_ALLOWED_ORIGINS` et `CSRF_TRUSTED_ORIGINS` : l'origine publique du frontend, `https://…`.
   - `EMAIL_HOST_USER` / `EMAIL_HOST_PASSWORD` (et `EMAIL_HOST` si différent du défaut).
   - Optionnel : `SENTRY_DSN` (suivi d'erreurs), `LOG_LEVEL`, `SECURE_HSTS_SECONDS` (un an par défaut : mettre 3600 pour un tout premier essai).
   - Alertes d'incident : `ADMINS_EMAILS` (aucun destinataire par défaut), `WHATSAPP_ALERT_WEBHOOK_URL` (HTTPS obligatoire).
   - `PALOU_DAILY_MESSAGES` (60 par défaut) plafonne les messages de Palou par enfant et par jour.
2. Créer un fichier `.env` à la racine (jamais commité) avec `POSTGRES_PASSWORD=<mot de passe long>`.
3. `DATABASE_URL` et `REDIS_URL` sont fournis par `docker-compose.yml` : ne pas les mettre dans `backend/.env`.

`check --deploy` échoue (erreurs `keuria.E001` à `E005`) si Redis, les hôtes, le SMTP ou PostgreSQL ne sont pas configurés : Django retomberait sinon sur un fichier SQLite.
Le démarrage échoue volontairement (message explicite) si `SECRET_KEY` ou `CORS_ALLOWED_ORIGINS` manquent en production :
une configuration incomplète ne doit jamais tourner silencieusement.

## 3. Premier déploiement

```bash
docker compose up -d --build            # base, cache, migrations, backend, frontend, sauvegarde
docker compose run --rm backend python manage.py seed_curriculum   # catalogue de leçons (une seule fois)
docker compose run --rm backend python manage.py createsuperuser   # compte administrateur
```

Le service `migrate` s'exécute une fois avant le backend ; le backend ne démarre que s'il a réussi.

## 4. Vérifications après déploiement

```bash
docker compose ps                                        # tous les services « healthy » / « running »
docker compose exec backend python manage.py check --deploy   # doit afficher « no issues »
curl -fsS https://<domaine>/api/health/live              # processus vivant
curl -fsS https://<domaine>/api/health/ready             # base + cache joignables (503 sinon)
```

Les sondes `/api/health/live` et `/api/health/ready` ne demandent aucune authentification et sont exemptées de la redirection HTTPS
(pour les contrôles internes). `INTERNAL_HOSTS` complète `ALLOWED_HOSTS` pour ces sondes.

## 5. Mise à jour

```bash
git pull
docker compose up -d --build     # nouvelles images, migrations rejouées avant le redémarrage du backend
```

Avant une mise à jour comportant une migration, vérifier qu'une sauvegarde récente existe (`./scripts/restore.sh` sans argument liste les sauvegardes).

## 6. Retour arrière

1. Redéployer le commit précédent (`git checkout <commit>` puis `docker compose up -d --build`).
2. Si une migration a modifié les données de façon incompatible : restaurer la sauvegarde d'avant déploiement
   (`./scripts/restore.sh keuria-<date>.dump`, voir `docs/EXPLOITATION.md`).

## 7. Intégration continue

`.github/workflows/ci.yml` exécute à chaque poussée : contrôles Django, migrations à jour, lint, `check --deploy` avec une configuration
de production, tests avec couverture (PostgreSQL + Redis), vérification de types, lint, tests et build du frontend, puis construction des
deux images Docker. `.github/workflows/security.yml` audite les dépendances chaque lundi (`pip-audit`, `npm audit`).
