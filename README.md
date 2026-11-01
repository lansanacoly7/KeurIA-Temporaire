# kEur IA

Plateforme d'apprentissage de l'IA pour enfants et adolescents (7-15 ans), avec espaces dédiés parents/enseignants/administrateurs et écoles partenaires.

## Architecture

- **`frontend/`** — application Next.js (App Router, React 19, TypeScript). Sert l'interface (dashboard enfant, connexion, profil, administration, espaces écoles).
- **`backend/`** — API Django REST Framework. Gère l'authentification (comptes, rôles), les écoles, les profils d'apprenants et la progression (XP, quiz, usage quotidien, classement).

Les deux communiquent via un proxy déclaré dans `frontend/next.config.ts` : toute requête `/api/*` faite par le frontend est redirigée vers `http://127.0.0.1:8000/api/*` par défaut ; en production, définir la variable d'environnement `DJANGO_API_URL` côté frontend. Le cookie de session `keur_ia_session` circule ainsi de façon transparente entre les deux.

## Authentification et autorisations

- **Sessions Django uniquement** (pas de JWT) : `login()`/`logout()` côté Django, cookie `keur_ia_session` **HttpOnly**, `SameSite=Lax`, `Secure` hors DEBUG. La session est détruite côté serveur à la déconnexion et invalidée quand le mot de passe change.
- **CSRF** : toute requête POST/PUT/PATCH/DELETE authentifiée doit porter l'en-tête `X-CSRFToken`. Le frontend l'ajoute automatiquement (`frontend/app/csrf-fetch.tsx` enveloppe `fetch`) : un simple `fetch("/api/...", { method: "POST" })` suffit.
- **Permissions par défaut** : toute vue DRF exige un utilisateur connecté (`IsAuthenticated`) sauf si elle déclare `AllowAny`. Permissions par rôle dans `backend/apps/accounts/permissions.py` (`IsParent`, `IsParentOrTeacher`, `IsAdminRole`). Non connecté → 401, rôle insuffisant → 403.
- **Rôles** : `admin`, `parent`, `enseignant`, `eleve`. L'inscription publique crée uniquement des parents ; les enfants (`eleve`) sont créés par leur parent et reliés par `User.parent` (seule relation d'appartenance) ; enseignants et admins sont créés par un admin. Un parent qui a encore des enfants ne peut pas être supprimé (409).
- **Vérification d'e-mail** : un parent inscrit via le formulaire public reçoit un code à 6 chiffres (valable 30 min, 5 essais) et ne peut pas se connecter avant de l'avoir saisi (`/api/auth/verify-email`, renvoi via `/api/auth/resend-verification`). Les comptes enfants et ceux créés par un admin sont considérés comme vérifiés. En développement, l'e-mail s'affiche dans la console du backend.
- **Mots de passe** : `AUTH_PASSWORD_VALIDATORS` de Django (longueur, mots de passe courants, similarité avec l'e-mail…) + au moins une lettre et un chiffre, appliqués à toute création/modification.
- **Anti-bruteforce** : 5 échecs de connexion sur un compte (ou 50 sur une IP) → blocage 15 min ; débit limité sur les endpoints `/api/auth/*` ; code de réinitialisation haché, valable 15 min, 5 essais max.
- **Production** : les compteurs vivent dans le cache Django. Avec plusieurs processus, définir `REDIS_URL` (cache partagé ; `pip install redis`). `NUM_PROXIES=1` suppose que Django n'est joignable **que** via le proxy Next.js (sinon l'en-tête `X-Forwarded-For` peut être falsifié).

## Prérequis

- Node.js `>=22.13.0`
- Python 3.13 (version de la CI et de l'image Docker)

## Démarrage en développement

Deux serveurs à lancer en parallèle.

**Backend (Django, port 8000 par défaut ; sur 8001 si 8000 est pris, voir plus bas)**
```bash
cd backend
python -m venv .venv
.venv/Scripts/activate   # .venv/bin/activate sur macOS/Linux
pip install -r requirements.txt
cp .env.example .env     # puis ajuster SECRET_KEY si besoin
python manage.py migrate
python manage.py seed_curriculum   # charge les parcours, modules et leçons (base neuve)
python manage.py runserver
```

**Après avoir récupéré une nouvelle version (`git pull`)**
```bash
cd backend
pip install -r requirements.txt    # des dépendances peuvent avoir changé
python manage.py migrate           # applique les nouvelles migrations (données comprises)
```
Après la refonte de l'authentification (sessions Django), chacun doit se reconnecter une fois : les anciens cookies ne sont plus valides.

**Frontend (Next.js, port 3000 en développement, 3001 avec `npm start`)**
```bash
cd frontend
npm install
npm run dev
```

L'application est ensuite accessible sur `http://localhost:3000`. Si Django tourne sur un autre port que 8000, créer `frontend/.env.local` avec `DJANGO_API_URL=http://127.0.0.1:8001` (fichier ignoré par git) et redémarrer `npm run dev`.

## Variables d'environnement (`backend/.env`)

Voir `backend/.env.example` pour la liste complète. En résumé :
- `SECRET_KEY` — clé secrète Django, à changer dans chaque environnement.
- `DEBUG` — `True` en local.
- `DATABASE_URL` — SQLite par défaut en local (`sqlite:///db.sqlite3`) ; passer une URL `postgres://...` pour basculer sur PostgreSQL sans changer le code.
- `CORS_ALLOWED_ORIGINS` — liste d'origines (séparées par des virgules) autorisées à appeler l'API avec les cookies de session ; doit inclure l'origine réelle du frontend (`http://localhost:3000` par défaut en développement).
- `ALLOWED_HOSTS` — hôtes acceptés par Django (`localhost,127.0.0.1` par défaut).
- `NUM_PROXIES` (défaut `1`) et `AUTH_THROTTLE_RATE` (défaut `60/min`) — voir « Authentification et autorisations ».

`DEBUG` vaut `False` si la variable est absente, et Django refuse alors de démarrer sans `SECRET_KEY` : copier `.env.example` en `.env` pour le développement.

Côté frontend, `DJANGO_API_URL` (défaut `http://127.0.0.1:8000`) indique où le serveur Next.js joint Django pour le rendu serveur.

## Tests

**Backend**
```bash
cd backend
.venv/Scripts/python -m pytest
# ou : python manage.py test
```

Les tests de sécurité (`backend/apps/accounts/tests/test_security.py`) couvrent les critères du plan de tâches Auth/Autorisation (identifiants T01…T17 dans les noms des tests).

****Frontend**
```bash
cd frontend
npm run typecheck      # TypeScript
npm run lint           # ESLint (0 erreur exigée)
npm test               # interpréteur de blocs, logique et lecteur de leçons du parcours 7-9
npm run test:coverage  # idem, avec rapport de couverture (coverage/lcov.info)
```

Ces tests ne couvrent que le parcours 7-9 : les écrans (tableaux de bord, espaces école, parent, enseignant, administration) n'ont pas de tests automatisés.

## Mise en production et exploitation

- Procédure complète, variables obligatoires, mise à jour et retour arrière : [`docs/DEPLOIEMENT.md`](docs/DEPLOIEMENT.md).
- Supervision, sauvegardes et restauration, incidents courants : [`docs/EXPLOITATION.md`](docs/EXPLOITATION.md).
- Données personnelles, services tiers, conservation : [`docs/DONNEES_PERSONNELLES.md`](docs/DONNEES_PERSONNELLES.md).
- Dernier audit de mise en production : [`docs/AUDIT_PRODUCTION_2026-10-08.md`](docs/AUDIT_PRODUCTION_2026-10-08.md).
- `python manage.py check --deploy` doit répondre « no issues » avec la configuration réelle du serveur (PostgreSQL, Redis, HTTPS, SMTP).
## Comptes

Il n'existe pas de compte administrateur par défaut (voir aussi `COMPTES_CONNEXION.md`, qui ne contient aucun mot de passe). Le premier compte admin se crée via :
```bash
cd backend
python manage.py createsuperuser
```
Les administrateurs suivants sont créés depuis l'interface `/admin` (réservée aux comptes `role=admin`) ou directement en base — jamais via l'inscription publique, qui refuse le rôle `admin`.
