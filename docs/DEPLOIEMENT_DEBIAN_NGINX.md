# Déploiement sur un serveur Debian avec nginx (sans Docker)

Installation **native** : les services tournent directement sur la machine, sous systemd. Aucun conteneur.
`docker-compose.yml`, à la racine, ne sert alors qu'à la démonstration locale ; c'est ce document qui fait référence
pour la mise en ligne, et non `docs/DEPLOIEMENT.md` (version Docker).

Ce que Compose fournissait et qu'il faut donc remplacer : PostgreSQL, Redis, le lancement des migrations, la tâche
quotidienne de conservation des données, la sauvegarde quotidienne, et le redémarrage automatique. Les cinq unités
systemd et la configuration nginx sont prêtes dans `deploy/`.

## Chemin d'une requête

```
navigateur ──HTTPS(443)──▶ nginx ──┬──▶ /media/*  : fichiers lus sur le disque
                                   │              (/opt/keuria/backend/media)
                                   └──▶ tout le reste : 127.0.0.1:3001  frontend Next.js
                                                                │
                                                                └──▶ /api/*  127.0.0.1:8100
                                                                     Django (gunicorn)
                                                                        ├── PostgreSQL (127.0.0.1:5432)
                                                                        └── Redis      (127.0.0.1:6379)
```

nginx n'a **qu'une seule destination applicative** : le frontend. C'est Next (`frontend/next.config.ts`) qui relaie
`/api/*` vers Django. Il n'y a pas de `location /api/` à écrire. Seuls `gunicorn` et `next` écoutent, et uniquement sur
la boucle locale : rien n'est joignable de l'extérieur hors 22, 80 et 443.

## 1. Prérequis

| Élément | Détail |
|---|---|
| Système | **Debian 13 (trixie)**. Il fournit Python 3.13 (la version de la CI) et nginx 1.26. Debian 12 n'a que Python 3.11 : l'installation des dépendances s'arrête sur `No matching distribution found for Django==6.1.1`, qui exige `>=3.12`. Solutions : fin de l'étape 2 |
| Matériel | 2 vCPU / 4 Go de RAM, 20 Go de disque (PostgreSQL + Redis + `node_modules` et `.next` ≈ 2 Go) |
| Domaine | Enregistrements `A` (et `AAAA` si IPv6) pointant sur l'IP du serveur, **propagés avant** l'étape 9 |
| Accès | Un utilisateur `sudo` ; ports 80 et 443 ouverts chez l'hébergeur |
| SMTP | Les codes de vérification des comptes partent par e-mail (variables `EMAIL_*`) |

## 2. Paquets système

```bash
sudo apt update
sudo apt install -y nginx postgresql redis-server \
                    python3 python3-venv git curl ca-certificates certbot ufw
```

Node.js doit venir d'un dépôt tiers : Debian 13 livre Node 20, alors que le frontend exige `>=22.13.0`
(`frontend/package.json`).

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
node --version      # v22.x
python3 --version   # 3.13.x
```

### Si le serveur est en Debian 12 (Python 3.11)

`pip install -r requirements.txt` échoue alors sans ambiguïté :

```
ERROR: Ignored the following versions that require a different python version: … 6.1.1 Requires-Python >=3.12
ERROR: No matching distribution found for Django==6.1.1
```

Ce n'est pas contournable : Django 6 ne tourne pas sur Python 3.11, et il n'existe pas de `python3.13` dans
`bookworm-backports`. Trois issues, par ordre de préférence.

**a. Passer le serveur en Debian 13** — la voie recommandée. Elle donne Python 3.13, nginx 1.26 et PostgreSQL 17 comme
paquets du système, maintenus par Debian, et ce document s'applique alors mot pour mot. Si rien n'est encore déployé
(cas d'une première installation), réinstaller la machine depuis l'image Debian 13 de l'hébergeur est plus sûr et plus
rapide qu'une montée de version. Sinon, montée de version en place :

```bash
sudo apt update && sudo apt full-upgrade -y        # finir de mettre bookworm à jour d'abord
sudo sed -i 's/bookworm/trixie/g' /etc/apt/sources.list
sudo sed -i 's/bookworm/trixie/g' /etc/apt/sources.list.d/*.list 2>/dev/null
sudo apt update && sudo apt full-upgrade -y        # répondre aux questions de conffiles
sudo reboot
```

Faire un instantané (snapshot) de la machine avant : c'est une montée de version majeure.

**b. Rester en Debian 12 et installer Python 3.13 à côté, avec `uv`** — aucune compilation, aucun paquet système
touché, le Python 3.11 du système reste en place pour `apt`.

```bash
# uv dans /usr/local/bin, donc utilisable par tous les comptes
curl -LsSf https://astral.sh/uv/install.sh | sudo env UV_INSTALL_DIR=/usr/local/bin sh

# CPython 3.13 hors de l'arborescence système, lisible par l'utilisateur keuria
sudo env UV_PYTHON_INSTALL_DIR=/opt/python uv python install 3.13
sudo chmod -R a+rX /opt/python

cd /opt/keuria/backend
sudo rm -rf .venv                                  # l'environnement créé en 3.11 est inutilisable
# « --seed » installe pip dans l'environnement : la suite de ce document continue d'utiliser .venv/bin/pip.
sudo -u keuria env UV_PYTHON_INSTALL_DIR=/opt/python uv venv --seed --python 3.13 .venv
sudo -u keuria .venv/bin/python -V                 # Python 3.13.x
```

Puis reprendre l'étape 6 à partir de `pip install -r requirements.txt`. Deux conséquences à ne pas oublier dans la
suite : Debian 12 livre **nginx 1.22** (la configuration fournie en tient compte, voir étape 10) et **PostgreSQL 15**
(parfaitement adapté ; seules les mentions de la version 17 dans ce document changent). Et ce Python ne reçoit pas les
mises à jour de sécurité de Debian : c'est `uv python upgrade` qu'il faudra penser à passer.

**c. Compiler Python 3.13 depuis les sources** (`./configure --enable-optimizations && make altinstall`) : possible, mais
c'est se charger d'une dépendance à recompiler à chaque correctif de sécurité. À n'envisager que si `uv` est exclu.

## 3. Utilisateur et arborescence


```bash
sudo adduser --system --group --home /opt/keuria --shell /usr/sbin/nologin keuria
sudo git clone <url-du-depot> /opt/keuria
sudo chown -R keuria:keuria /opt/keuria
# nginx (www-data) doit pouvoir traverser l'arborescence pour lire /media/ :
sudo chmod 755 /opt/keuria /opt/keuria/backend
sudo -u keuria mkdir -p /opt/keuria/backend/media
sudo chmod 755 /opt/keuria/backend/media
```

## 4. PostgreSQL

**Toutes les données applicatives vivent ici** : comptes, profils d'apprenants, progression, écoles, classes. Le seul
état hors PostgreSQL est le cache Redis (volatil, reconstruit) et les logos d'école, qui sont des fichiers sur le disque
(`/opt/keuria/backend/media`, sauvegardés avec la base — étape 12).

```bash
# Mot de passe en hexadécimal : il part dans une URL (DATABASE_URL), où « / », « @ » ou « : »
# devraient sinon être encodés.
openssl rand -hex 24          # noter la valeur
sudo -u postgres createuser keuria --pwprompt
sudo -u postgres createdb keuria --owner=keuria
sudo systemctl enable --now postgresql
```

Le rôle `keuria` n'a besoin d'aucun privilège particulier : propriétaire de sa base, ni superutilisateur ni `CREATEDB`
(seuls les tests en auraient besoin, et ils ne tournent pas sur ce serveur).

Debian écoute par défaut sur la seule boucle locale et accepte les connexions `127.0.0.1` en `scram-sha-256` : la
configuration livrée convient telle quelle. À vérifier avant d'aller plus loin, car c'est exactement ce que fera Django :

```bash
sudo -u postgres psql -c 'SHOW listen_addresses;'                      # localhost
psql 'postgres://keuria:<mot-de-passe>@127.0.0.1:5432/keuria' -c '\conninfo'
```

## 5. Redis

Redis ne sert que de cache partagé (verrouillage des connexions, limitation de débit, déverrouillages parentaux) ; aucune
donnée durable n'y vit. Le paquet Debian n'écoute que sur la boucle locale par défaut — à vérifier :

```bash
grep -E '^bind|^protected-mode' /etc/redis/redis.conf   # bind 127.0.0.1 -::1
sudo systemctl enable --now redis-server
redis-cli ping                                          # PONG
```

## 6. Backend Django

```bash
cd /opt/keuria/backend
sudo -u keuria python3 -m venv .venv
sudo -u keuria .venv/bin/pip install --upgrade pip
sudo -u keuria .venv/bin/pip install -r requirements.txt   # psycopg en roues binaires : rien à compiler
sudo -u keuria cp .env.example .env
sudo chmod 600 .env
sudo -u keuria nano .env
```

Valeurs à renseigner. Les deux premières lignes sont **le changement principal par rapport au déploiement Docker** :
Compose fournissait `DATABASE_URL` et `REDIS_URL`, ici elles doivent figurer dans le fichier.

⚠️ `.env.example` livre `DATABASE_URL=sqlite:///db.sqlite3` (choix de développement assumé, voir le commentaire du
fichier). Cette ligne **doit** être remplacée, sinon toutes les données des familles iraient dans un fichier SQLite du
serveur : ni `pg_dump`, ni accès concurrent sûr entre les workers gunicorn.

```bash
# Remplacement explicite plutôt qu'à la main : la ligne ne peut pas être oubliée.
sudo -u keuria sed -i 's#^DATABASE_URL=.*#DATABASE_URL=postgres://keuria:<mot-de-passe>@127.0.0.1:5432/keuria#' .env
grep '^DATABASE_URL=' .env      # doit commencer par postgres://
```

| Variable | Valeur |
|---|---|
| `DATABASE_URL` | `postgres://keuria:<mot-de-passe>@127.0.0.1:5432/keuria` |
| `REDIS_URL` | `redis://127.0.0.1:6379/1` |
| `SECRET_KEY` | `sudo -u keuria .venv/bin/python -c "from django.core.management.utils import get_random_secret_key as g; print(g())"` |
| `DEBUG` | `False` |
| `ALLOWED_HOSTS` | `keuria.example.com` (le domaine public, sans schéma) |
| `CORS_ALLOWED_ORIGINS` | `https://keuria.example.com` — avec le schéma. `CSRF_TRUSTED_ORIGINS` en découle dans `settings.py`, il n'y a pas de seconde variable à renseigner |
| `NUM_PROXIES` | `1` — nginx pose une entrée unique dans `X-Forwarded-For` (voir §13) |
| `SERVE_MEDIA` | `False` — nginx sert `/media/` depuis le disque (étape 10) |
| `EMAIL_HOST_USER` / `EMAIL_HOST_PASSWORD` | Compte SMTP dédié, mot de passe d'application |
| `SECURE_HSTS_SECONDS` | `3600` pour le premier essai, `31536000` une fois le HTTPS confirmé |
| `ADMINS_EMAILS` | Destinataires des alertes d'incident (vide = personne n'est prévenu) |

Puis la base de données et le catalogue :

```bash
sudo -u keuria .venv/bin/python manage.py migrate --noinput
sudo -u keuria .venv/bin/python manage.py seed_curriculum    # une seule fois : parcours, modules, leçons
sudo -u keuria .venv/bin/python manage.py createsuperuser
# Fichiers statiques : servis par WhiteNoise depuis gunicorn (voir STORAGES dans settings.py).
# Sans cette commande, le dossier staticfiles/ n'existe pas et WhiteNoise le signale à chaque démarrage.
sudo -u keuria .venv/bin/python manage.py collectstatic --noinput
sudo -u keuria .venv/bin/python manage.py check --deploy      # doit afficher « no issues »
```

`check --deploy` échoue (`keuria.E001` à `E006`) si Redis, les hôtes, le SMTP, PostgreSQL ou les origines de confiance sont mal réglés. En particulier
`keuria.E005` refuse une base SQLite. Ce contrôle est aussi câblé en `ExecStartPre` dans `keuria-backend.service` : le
service **refuse de démarrer** sur une configuration qui retomberait sur SQLite, au lieu de tourner en silence avec les
données au mauvais endroit. Ne jamais définir `ALLOW_SQLITE=True` sur ce serveur : cette variable n'existe que pour un
essai isolé.

## 7. Frontend Next.js

`DJANGO_API_URL` est lue **au build** (`next.config.ts` y fige les réécritures `/api/*`) : la définir avant
`npm run build`, et pas seulement dans l'unité systemd.

```bash
cd /opt/keuria/frontend
sudo -u keuria -H npm ci                                                   # dépendances de dev comprises : le build en a besoin
sudo -u keuria -H env DJANGO_API_URL=http://127.0.0.1:8100 npm run build   # « prebuild » copie au passage le moteur MediaPipe
sudo -u keuria -H npm prune --omit=dev                                     # outils de dev retirés de la machine
```

Le `-H` n'est pas décoratif : sans lui, npm tente d'écrire son cache dans `/root/.npm` et échoue en `EACCES`.

## 8. Services systemd

```bash
sudo cp /opt/keuria/deploy/systemd/keuria-*.service /opt/keuria/deploy/systemd/keuria-*.timer /etc/systemd/system/

# Identifiants de la sauvegarde (lu par systemd en tant que root) :
sudo mkdir -p /etc/keuria /var/backups/keuria
sudo chown keuria:keuria /var/backups/keuria
sudo tee /etc/keuria/backup.env >/dev/null <<'ENVFILE'
PGHOST=127.0.0.1
PGUSER=keuria
PGDATABASE=keuria
PGPASSWORD=<le mot de passe du role keuria>
ENVFILE
sudo chmod 600 /etc/keuria/backup.env

sudo systemctl daemon-reload
sudo systemctl enable --now keuria-backend keuria-frontend
sudo systemctl enable --now keuria-retention.timer keuria-backup.timer
sudo systemctl start keuria-backup            # première sauvegarde, tout de suite
```

Ce que fait chaque unité :

| Unité | Rôle | Équivalent Docker |
|---|---|---|
| `keuria-backend.service` | gunicorn sur `127.0.0.1:8100` | service `backend` |
| `keuria-frontend.service` | `next start` sur `127.0.0.1:3001` | service `frontend` |
| `keuria-retention.timer` | `apply_retention` chaque nuit à 03h30 | service `retention` (boucle `sleep 86400`) |
| `keuria-backup.timer` | `pg_dump` + archive des médias à 02h00, conservés 14 jours | service `backup` |
| — | les migrations se lancent à la main (étapes 6 et 14) | service `migrate` |

Vérification :

```bash
systemctl status keuria-backend keuria-frontend --no-pager
systemctl list-timers 'keuria-*' --no-pager
curl -fsS http://127.0.0.1:8100/api/health/ready     # base + cache joignables
curl -fsS http://127.0.0.1:3001/robots.txt           # le frontend répond
journalctl -u keuria-backend -n 30 --no-pager        # journaux JSON, un request_id par requête
```

## 9. Pare-feu et certificat

```bash
sudo ufw allow OpenSSH && sudo ufw allow 80/tcp && sudo ufw allow 443/tcp
sudo ufw enable
```

nginx sert encore son site par défaut (racine `/var/www/html`) : le défi ACME passe par là.

```bash
sudo certbot certonly --webroot -w /var/www/html \
  -d keuria.example.com --agree-tos -m <adresse@exemple.org> --no-eff-email
```

Recharger nginx après chaque renouvellement — sinon le certificat renouvelé n'est jamais servi et finit par expirer :

```bash
sudo tee /etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh >/dev/null <<'HOOK'
#!/bin/sh
systemctl reload nginx
HOOK
sudo chmod +x /etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh
sudo certbot renew --dry-run     # vérifie le renouvellement automatique (minuteur systemd)
```

## 10. nginx

```bash
sudo cp /opt/keuria/deploy/nginx/keuria.conf /etc/nginx/sites-available/keuria.conf
sudo sed -i 's/keuria\.example\.com/<votre-domaine>/g' /etc/nginx/sites-available/keuria.conf
sudo ln -s /etc/nginx/sites-available/keuria.conf /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default      # libère le port 80 (page « Welcome to nginx »)
sudo nginx -t && sudo systemctl reload nginx
sudo systemctl enable nginx
```

Deux pièges que `nginx -t` signale avant tout rechargement :

- **`unknown directive "http2"`** : la machine a nginx < 1.25 (Debian 12 livre 1.22). La configuration fournie emploie
  déjà la forme compatible `listen 443 ssl http2;` ; cette erreur signifie qu'une version antérieure du fichier, avec
  `http2 on;`, est encore installée. Sur nginx >= 1.25 la forme recommandée est l'inverse (`listen 443 ssl;` puis
  `http2 on;`), l'ancienne y restant acceptée.
- **`conflicting server name`** : un autre fichier de `sites-enabled/` déclare déjà ce domaine. nginx garde le premier
  chargé et ignore le second — ce qui donne un 502 inexplicable si l'ancien pointe vers un port abandonné.
  `grep -rl '<votre-domaine>' /etc/nginx/sites-enabled/` les liste ; n'en garder qu'un.

Vérifier aussi que les chemins du certificat correspondent à ce que certbot a créé (`sudo ls /etc/letsencrypt/live/`) :
le nom du dossier n'est pas toujours exactement le domaine.

## 11. Vérifications

```bash
curl -I http://<domaine>                                        # 301 vers https://
curl -fsS https://<domaine>/api/health/live                     # processus vivant
curl -fsS https://<domaine>/api/health/ready                    # base + cache (503 sinon)
curl -fsS -o /dev/null -w '%{http_code}\n' https://<domaine>/   # 200 : page d'accueil
nmap -Pn <domaine>                                              # depuis une AUTRE machine : 22, 80, 443 et rien d'autre
```

Puis dans un navigateur : créer un compte parent (l'e-mail de vérification doit arriver), se connecter, et vérifier dans
l'onglet réseau que les réponses portent `strict-transport-security` et que le cookie `keur_ia_session` est `Secure` et
`HttpOnly`. Enfin, redémarrer le serveur (`sudo reboot`) : tout doit remonter seul.

## 12. Sauvegardes et restauration

Le minuteur dépose chaque nuit dans `/var/backups/keuria` un `keuria-<horodatage>.dump` (format `custom`, vérifié par
`pg_restore --list`) et un `media-<horodatage>.tar.gz`. **À faire par l'exploitant** : copier ce dossier hors de la
machine. Une sauvegarde sur le disque du serveur ne protège pas d'une panne de ce disque.

`scripts/restore.sh` est écrit pour Docker ; en natif, la restauration est la suivante :

```bash
ls -lh /var/backups/keuria
sudo systemctl stop keuria-frontend keuria-backend
sudo -u postgres pg_restore --clean --if-exists --no-owner --no-privileges \
     --dbname=keuria /var/backups/keuria/keuria-<horodatage>.dump
sudo -u keuria tar -xzf /var/backups/keuria/media-<horodatage>.tar.gz -C /opt/keuria/backend/media
cd /opt/keuria/backend && sudo -u keuria .venv/bin/python manage.py migrate --noinput
sudo systemctl start keuria-backend keuria-frontend
```

Le `pg_dump` utilisé est celui du serveur (PostgreSQL 15 sur Debian 12, 17 sur Debian 13) : la sauvegarde se restaure sur cette version
ou plus récent, mais pas sur une version antérieure.

**Faire un essai de restauration sur une machine de test avant la mise en production, puis chaque trimestre** : une
sauvegarde jamais restaurée n'est pas prouvée. `scripts/verify-backup.sh` automatise ce contrôle, mais il est écrit pour
Docker (`docker compose run`) : en natif, les mêmes étapes se font à la main, dans une base temporaire que l'on jette
(la base de production n'est jamais touchée) :

```bash
f=$(ls -1t /var/backups/keuria/keuria-*.dump | head -n1)
sudo -u postgres createdb keuria_verify
sudo -u postgres pg_restore --no-owner --no-privileges --dbname=keuria_verify "$f"
sudo -u postgres psql -tA -d keuria_verify -c \
  "select count(*) from information_schema.tables where table_schema='public'"   # > 10 attendu
sudo -u postgres psql -tA -d keuria_verify -c 'select count(*) from accounts_user'
sudo -u postgres dropdb keuria_verify
```

Pour être prévenu quand une sauvegarde **manque** (et pas seulement quand elle échoue), `backup-loop.sh` accepte
`BACKUP_PING_URL` : l'adresse d'un service de surveillance de type « heartbeat » (healthchecks.io, Uptime Kuma), appelée
après chaque succès et avec `/fail` après un échec. Il suffit de l'ajouter à `/etc/keuria/backup.env`.

## 13. Points d'attention

| Sujet | Ce qu'il faut savoir |
|---|---|
| Toutes les données en PostgreSQL | Rien ne doit subsister en SQLite. `keuria.E005` le refuse au contrôle de déploiement, et `ExecStartPre` dans `keuria-backend.service` empêche le service de démarrer dans ce cas. `ALLOW_SQLITE=True` contourne les deux : ne jamais la poser ici. |
| Version de PostgreSQL | Debian 13 fournit PostgreSQL 17 ; la pile Docker de démonstration utilise 16. Un `.dump` pris en 16 se restaure en 17, **l'inverse n'est pas vrai** : ne pas restaurer sur le serveur de démonstration une sauvegarde de production. |
| Scripts SQLite du dépôt | `scripts/sqlite_backup.py`, `backup-sqlite.sh` et `restore-sqlite.sh` datent de la période de développement sur SQLite : ils n'ont **aucun effet** sur les données de ce serveur. Les sauvegardes passent par `keuria-backup.timer` (`pg_dump`). |
| `X-Forwarded-Proto` | **Obligatoire** dans nginx. Sans lui, Django croit la requête en HTTP et renvoie une redirection HTTPS en boucle (`ERR_TOO_MANY_REDIRECTS`). |
| `X-Forwarded-For` | La configuration pose `$remote_addr`, pas `$proxy_add_x_forwarded_for` : une entrée unique, non falsifiable, que `NUM_PROXIES=1` lit correctement. **Ajouter un CDN ou un répartiteur devant nginx impose `NUM_PROXIES=2`**, sinon le blocage après échecs de connexion compte tous les visiteurs comme une seule IP. |
| Port du backend : 8100 | **Ce serveur héberge une autre application sur le port 8000** (son propre gunicorn). D'où le choix de 8100 pour kEur IA : ne pas « rétablir » 8000, et vérifier avec `sudo ss -tlpn 'sport = :8100'` avant tout déploiement sur une nouvelle machine. Les processus du port 8000 n'appartiennent pas à ce projet : ne jamais les arrêter. |
| Origines de confiance | `CORS_ALLOWED_ORIGINS` doit contenir l'origine publique **complète** (`https://keuria.sn`), car `CSRF_TRUSTED_ORIGINS` en découle. Une valeur restée sur `http://localhost:3000` laisse le site consultable mais fait échouer toute écriture authentifiée en 403 « Origin checking failed » — création d'un enfant, modification de profil. `keuria.E006` le détecte désormais au contrôle de déploiement, donc le service refuse de démarrer dans ce cas. Ajouter aussi `https://www.keuria.sn` si ce sous-domaine est servi. |
| Rendu serveur et HTTPS | Les appels de Next vers Django côté serveur (profil, marque de l'école) passent par la boucle locale en HTTP. Ils portent donc `X-Forwarded-Proto: https` (`SSR_HEADERS` dans `frontend/app/local-auth.ts`), sans quoi `SECURE_SSL_REDIRECT` leur répond une redirection 301 vers `https://127.0.0.1:<port>` où gunicorn ne parle pas TLS : le `fetch` échoue, `getLocalUser()` renvoie `null` et **toute page rendue côté serveur croit que personne n'est connecté** (symptôme : redirection permanente vers `/connexion`, et des `GET /api/profile -> 301` dans les journaux). Dépannage immédiat sans reconstruction : `SECURE_SSL_REDIRECT=False` dans `.env`, nginx assurant déjà la redirection au bord. |
| Changer le port du backend | Trois endroits, pas deux : `GUNICORN_BIND` (unité backend), `DJANGO_API_URL` (unité frontend, pour le rendu serveur) **et le build du frontend**, car `next.config.ts` fige les réécritures `/api/*` dans l'artefact. Oublier le troisième donne un site qui s'affiche mais dont toutes les requêtes API échouent. Et comme `npm prune --omit=dev` a retiré les outils de build, reconstruire exige un `npm ci` au préalable. |
| Écoute sur la boucle locale | `GUNICORN_BIND=127.0.0.1:8100` et `next start -H 127.0.0.1` : ce sont ces deux réglages qui empêchent de joindre l'application en clair, en contournant nginx. Les retirer annule le pare-feu applicatif. |
| En-têtes de sécurité | Posés par Next (`frontend/next.config.ts`), ils traversent le proxy. Ne pas les redéfinir dans nginx : des valeurs concurrentes ne se cumulent pas. |
| `client_max_body_size` | `5m` : un logo d'école de 2 Mo arrive en base64 (~2,7 Mo) et Django refuse au-delà de 4 Mo. Le défaut nginx (1 Mo) casserait l'envoi de logo. |
| Fichiers statiques Django | WhiteNoise les sert depuis gunicorn, et Next relaie `/static/*` vers lui : `collectstatic --noinput` est donc à relancer **après chaque mise à jour**, sinon les fichiers servis sont ceux de la version précédente. Le message « No directory at: …/staticfiles » au démarrage signifie que la commande n'a jamais été passée. Pour décharger gunicorn, nginx peut aussi servir ce chemin directement, comme `/media/` : `location /static/ { alias /opt/keuria/backend/staticfiles/; expires 30d; }`. |
| Journaux | `journalctl -u keuria-backend -f` (JSON, un `request_id` par requête, renvoyé en `X-Request-ID`) et `/var/log/nginx/keuria.{access,error}.log`. Corréler un incident : relever le `X-Request-ID` d'une réponse en erreur, puis `journalctl -u keuria-backend \| grep <id>`. |
| Montée en charge | `WEB_CONCURRENCY` (workers gunicorn, 4 au plus par défaut) dans l'unité backend. Chaque worker garde sa connexion PostgreSQL (`CONN_MAX_AGE=600`) : augmenter aussi `max_connections` côté PostgreSQL si l'on dépasse largement 4 workers. |

## 14. Mises à jour

```bash
sudo systemctl start keuria-backup          # sauvegarde fraîche AVANT toute migration
cd /opt/keuria && sudo -u keuria git pull

cd /opt/keuria/backend
sudo -u keuria .venv/bin/pip install -r requirements.txt
sudo -u keuria .venv/bin/python manage.py migrate --noinput
sudo -u keuria .venv/bin/python manage.py collectstatic --noinput
sudo systemctl restart keuria-backend

# Le frontend est arrêté pendant sa reconstruction : « npm ci » remplace node_modules sous les
# pieds du processus en cours. nginx renvoie un 502 le temps du build (1 à 2 minutes).
sudo systemctl stop keuria-frontend
cd /opt/keuria/frontend
sudo -u keuria -H npm ci
sudo -u keuria -H env DJANGO_API_URL=http://127.0.0.1:8100 npm run build
sudo -u keuria -H npm prune --omit=dev
sudo systemctl start keuria-frontend
```

Pour une mise à jour sans coupure : construire dans une copie du dossier (`/opt/keuria-next`), puis échanger les deux
dossiers et redémarrer le service — l'arrêt se réduit alors au redémarrage.

**Retour arrière** : `git checkout <commit>` puis les mêmes étapes. Si une migration a modifié les données de façon
incompatible, restaurer la sauvegarde d'avant déploiement (§12).
