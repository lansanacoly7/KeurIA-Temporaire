# CHECKLIST DE MISE EN PRODUCTION — kEur IA

> Préparez un fichier `.env` (ne JAMAIS commiter les secrets) et exécutez chaque étape.

## 1. Infrastructure minimale
- [ ] Serveur Debian/Ubuntu (Python 3.13, Node ≥ 22.13)
- [ ] PostgreSQL (obligatoire — SQLite refusé en prod par `keuria.E005`)
- [ ] Redis (`REDIS_URL`) si multi-workers
- [ ] Reverse proxy HTTPS (Nginx) avec gzip activé (voir `deploy/nginx/keuria.conf`)
- [ ] SMTP configuré (mot de passe d’application dédié)
- [ ] Domaine + certificat TLS

## 2. Backend — `.env` (voir `backend/.env.example`)
```env
SECRET_KEY=<cle aleatoire longue et unique>
DEBUG=False
ALLOWED_HOSTS=keuria.example, www.keuria.example
CORS_ALLOWED_ORIGINS=https://keuria.example
CSRF_TRUSTED_ORIGINS=https://keuria.example
DATABASE_URL=postgres://user:pass@localhost:5432/keuria
REDIS_URL=redis://localhost:6379/1
EMAIL_HOST_USER=...
EMAIL_HOST_PASSWORD=<mot de passe application>
DEFAULT_FROM_EMAIL=...
NUM_PROXIES=1
SECURE_SSL_REDIRECT=True
SECURE_HSTS_SECONDS=31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS=False
SECURE_HSTS_PRELOAD=False
NOTIFY_WORKERS=4
PALOU_API_KEY=
```

## 3. Frontend — `.env.local` si besoin
```env
DJANGO_API_URL=https://keuria.example/api
```

## 4. Déploiement (ordre)
```bash
# base
python manage.py check
python manage.py check --deploy
python manage.py makemigrations --check --dry-run

# migration
cd backend
python manage.py migrate

# collect static
python manage.py collectstatic --noinput

# backend server
gunicorn keuria.wsgi -c gunicorn.conf.py

# frontend
cd ../frontend
npm ci
npm run build
npm start
```

## 5. Sécurité & observabilité
- [ ] `opencode auth` non requis (projet interne)
- [ ] Sentry installé si souhaité (`SENTRY_DSN`)
- [ ] `LOG_JSON=True` sur prod, `LOG_LEVEL=INFO`
- [ ] Stockage média `/media` servi par reverse proxy (pas Django si possible)
- [ ] Backup automatique testé (voir `docs/EXPLOITATION.md`)
- [ ] Restore testé au moins une fois avant go-live

## 6. Tests pre‑prod
- [ ] Backend : 733+ tests verts (Postgres + Redis, pas SQLite)
- [ ] Frontend : `npm run typecheck` + `npm run lint` sans erreur
- [ ] Lighthouse ≥ 90 sur page connexion (mobile)
- [ ] Teste les 4 modes de zoom (auto/compact/standard/comfortable) sur Chrome/Firefox/Safari

## 7. Points ouverts (à traiter après live)
- [ ] Branch protection GitHub (PR + checks)
- [ ] Nettoyage owner_email / merge dev_maimounasall
- [ ] Purge `ParentNotification` et comptes d’école inactifs
- [ ] Optimisation `/api/enseignant/programme` si trafic enseignant élevé
- [ ] Docs unifiées (un seul audit daté)
- [ ] E2E Playwright pour se connecter parent + valider une leçon

---

*Laste update : 2026-10-14*