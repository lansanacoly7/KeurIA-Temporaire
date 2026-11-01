# Audit de mise en production : kEur IA

Date : 8 octobre 2026. Périmètre : tout le dépôt (`backend/`, `frontend/`, `scripts/`, `docs/`, `Rapports/`, `.github/`, Docker), le dépôt GitHub

Méthode : lecture du code, outils automatiques (ruff, Bandit, pip-audit, npm audit, ESLint, TypeScript, jscpd, radon, coverage, Lighthouse),
exécution réelle (build de production, 637 tests backend, 116 tests frontend, 235 appels API avec 5 rôles), et API GitHub en lecture seule.
Chaque chiffre de ce rapport a été mesuré le 8 octobre 2026 ; ce qui n'a pas pu l'être est dit dans la section « Limites ».

---

## 1. Verdict

**Le produit est solide, mais il ne peut pas être mis en production aujourd'hui.** Le code applicatif est de bonne qualité (aucune faille de type
injection, contrôle d'accès cohérent, 90 % de couverture backend). Ce qui bloque est périphérique : une intégration continue rouge, une dépendance
critique non corrigée, deux fichiers internes exposés, et une politique de confidentialité qui affirme un contrat pas encore signé.

| # | Bloquant avant la mise en ligne | Effort | État |
|---|---|---|---|
| B1 | La CI GitHub est rouge sur **toutes** les exécutions récentes (lockfile npm, 4 erreurs ruff) ; l'image Docker du frontend ne peut pas se construire | 1 h | **Corrigé dans le dossier de travail, non poussé** |
| B2 | Next.js 16.2.6 : avis de sécurité **critique** (correctif en 16.4.0) | 0,5 à 1 jour | À faire |
| B3 | `frontend/public/rapport.html` (rapport interne) est servi publiquement sur Internet, avec des chiffres faux | 15 min | À faire |
| B4 | `COMPTES_CONNEXION.md` est dans le dépôt : mot de passe administrateur en clair et adresse e-mail personnelle réelle | 30 min | À faire |
| B5 | La page « Confidentialité » affirme des accords de traitement avec Anthropic ; `docs/DONNEES_PERSONNELLES.md` les listait comme non signés | page corrigée, contrat abandonné | Résolu |

Délai réaliste pour lever les 5 bloquants : **2 à 3 jours**, dont la montée de version de Next.js et sa recette.

### Tableau de bord qualité (équivalent SonarQube)

| Indicateur | Mesure | Note |
|---|---|---|
| Fiabilité (bugs) | 0 erreur ESLint, ruff propre, 0 erreur HTTP 500 sur 235 appels réels ; 34 alertes `set-state-in-effect` côté React | B |
| Sécurité du code | Bandit : 0 gravité haute, 3 moyennes (appels réseau sortants), 4 basses ; aucun SQL brut, `eval`, `pickle`, `shell=True` | A |
| Sécurité des dépendances | pip-audit : 0 vulnérabilité. npm audit : **21** (1 critique, 19 hautes) dont 2 en production | E |
| Points chauds de sécurité | CSP en mode rapport seul, médias servis par Django, alerting sortant (détails en section 3) | B |
| Maintenabilité | Complexité moyenne A (3,6) mais 4 fonctions à risque ; 12 fichiers frontend de plus de 800 lignes ; 2 777 styles en ligne | B |
| Duplication | **0,96 %** sur 68 167 lignes (seuil usuel : 3 %) | A |
| Couverture backend | **90 %** (6 957 instructions) | A |
| Couverture frontend | 95 % **mais seulement sur 3 modules testés** ; le reste (266 fichiers) n'a aucun test | D |
| Accessibilité | Lighthouse 100 sur la connexion ; environ 130 alertes de lint a11y restantes dans les tableaux de bord | B |
| Performance | Lighthouse mobile 68 sur la connexion (TBT 900 ms, LCP 3,6 s) ; 231 Mo de PNG de plus de 500 Ko | C |

---

## 2. État du dépôt GitHub

- Dépôt privé, 348 Mo. Branche par défaut `main` : **un seul commit** (« Initial commit », 15 septembre). Tout le travail vit sur `test` et
  `Dev_Lansana_Coly`, qui pointent aujourd'hui sur le même commit `7ab6ba2` (identique à ma copie locale).
- **Aucune protection de branche, aucune pull request** (0 sur toute l'histoire) : on pousse directement. Rien n'impose la CI avant fusion.
- CI : 10 dernières exécutions toutes en échec (voir B1). La CI échoue même avant d'exécuter les tests, donc elle ne protège rien aujourd'hui.
- Alertes Dependabot et analyse de code : le jeton n'a pas la portée nécessaire (HTTP 403) ; je n'ai pas pu les lire. Les résultats de npm audit
  et pip-audit de ce rapport les remplacent.
- Pas de `LICENSE`, de `CONTRIBUTING.md` ni de `CODEOWNERS`.
- Fichiers à la racine qui n'ont rien à y faire : `audio.wav`, `KEURIA_Plan_Taches_Auth_Autorisation.xlsx`, `Design_systeme.md`, dossier `.claude/`,
  25 documents dans `Rapports/` (dont plusieurs rapports d'audit aux chiffres contradictoires, par exemple « 153 tests » alors qu'il y en a 637).
- Dossier de travail local : 35 fichiers modifiés et 22 non suivis. **La migration `0010_simplify_daily_challenges.py` n'est pas suivie par git alors
  que ma migration `0011` en dépend** : les deux doivent être commitées ensemble, sinon la base ne se migre plus.

---

## 3. Constats détaillés

Légende : **[BLOQUANT]** à lever avant la mise en ligne, **[ÉLEVÉ]** dans les 2 semaines, **[MOYEN]** dans le mois, **[BAS]** hygiène.

### 3.1 Intégration continue et livraison

**B1 [BLOQUANT] CI rouge.** Preuve : exécution `37707739670` du 8 octobre.
1. Frontend : `npm ci` échoue (« Missing: @emnapi/runtime@1.11.3 from lock file »). Le fichier `package-lock.json` a été généré sous Windows et il
   manque une dépendance optionnelle de `sharp`. Je reproduis l'erreur en local. **Corrigé** : lockfile régénéré (`npm install --package-lock-only`),
   puis `npm ci --dry-run` passe. Effet de bord : l'étape Docker du frontend échouait aussi, donc l'image de production ne se construisait pas.
2. Backend : `ruff check` signale 4 erreurs (imports inutilisés dans `progress/views.py`, f-strings sans variable dans `observability.py`). **Corrigé** ;
   j'ai aussi déplacé les imports de `challenge.py`, `leaderboard.py` et `riddle.py` vers `progress.models`, leur vraie source.
3. Piège suivant, déjà désamorcé : `backend/schema.yml` (schéma OpenAPI versionné) était périmé à cause de la docstring de la vue du dictionnaire,
   ce qui aurait fait échouer l'étape « fraîcheur du schéma ». **Régénéré**.
4. Toujours à faire : exiger la CI avant fusion (protection de branche) ; épingler les actions GitHub par empreinte de commit ; ajouter un seuil de
   couverture (`--fail-under=85`).

**[ÉLEVÉ] Image Docker du frontend trop lourde.** `frontend/Dockerfile` copie tout `/app` : `node_modules` complet (développement compris),
`.next` (819 Mo mesurés) et les sources. L'image embarque donc aussi les outils de développement vulnérables. Recommandation : `output: "standalone"`,
`npm prune --omit=dev`, et un `HEALTHCHECK`. Le conteneur tourne en `USER node` sur des fichiers appartenant à root : le cache d'images de Next peut
échouer à l'écriture. Je n'ai pas pu construire l'image (Docker absent de cette machine).

**[MOYEN] Incohérence de ports.** `package.json` lance `dev` sur 3000 et `start` sur 3001 ; le README annonce 3001 partout ; le port 8000 de
développement est pris par un autre projet sur la machine de l'équipe (j'ai dû pointer vers 8001 dans `.env.local`).

### 3.2 Dépendances

**B2 [BLOQUANT] Next.js.** `next@16.2.6` est concerné par GHSA-6gpp-xcg3-4w24 (contournement de middleware, Turbopack) et GHSA-m99w-x7hq-7vfj
(déni de service via actions serveur). Correctif : `next@16.4.0` (version publiée, vérifiée). `postcss` suit. Le build de production passe sur 16.2.6
(compilation 2,7 min, typage 4,1 min, 58 routes) ; la montée de version demande une recette complète des écrans.

**[ÉLEVÉ] Outillage hérité de Cloudflare.** `vinext`, `wrangler`, `@cloudflare/vite-plugin`, `vite`, `@vitejs/*`, `react-server-dom-webpack`, plus
`frontend/worker/`, `vite.config.ts`, `.vinext/`, `.wrangler/` : plus utilisés pour la production (Docker utilise `next build`). Ils portent 13 des 21
vulnérabilités. Les retirer règle l'essentiel d'npm audit sans toucher au produit.

**[MOYEN]** `drf-spectacular>=0.30.0` n'est pas épinglé (builds non reproductibles) ; `pywebpush~=2.5` non plus.
**[BAS]** `@mediapipe/tasks-vision ^1.0.1` côté npm, mais le fichier wasm est chargé depuis jsDelivr en `0.10.3` : versions incohérentes.
**Point positif** : pip-audit, 38 paquets Python, **0 vulnérabilité**.

### 3.3 Sécurité applicative

Contrôlé et conforme : sessions HttpOnly + SameSite, CSRF, verrouillage des connexions (compte et IP), codes à usage unique hachés avec 5 essais
et `secrets`, messages génériques contre l'énumération, double authentification parentale, politique de mots de passe, verrouillage des routes par
rôle (`IsAuthenticated` par défaut), 256 routes cartographiées, redirections sûres (`safeReturnTo`), aucun `dangerouslySetInnerHTML` avec contenu
utilisateur, aucun SQL brut, schéma OpenAPI protégé en production, pages protégées côté serveur via les layouts.

Essai réel : 235 appels GET avec un élève, un parent, un administrateur, une direction d'école et un enseignant : **0 erreur 500** ; 34 routes refusées
(403) à l'élève, 31 au parent, comme attendu.

- **[ÉLEVÉ] Alerting d'incident (`keuria/observability.py`).**
  - Le texte de l'exception (`type: message`) part par e-mail, WhatsApp et webhook. Un message d'erreur de base de données peut contenir des données
    d'enfants : à remplacer par le type d'erreur et l'identifiant de requête uniquement.
  - Un fil d'exécution est créé à chaque alerte ; le délai anti-répétition vit en mémoire de chaque worker (4 workers = 4 compteurs) et dépend du
    chemin d'URL, donc un attaquant qui provoque des erreurs sur des URL variées déclenche autant d'alertes. À remplacer par `cache.add` (Redis) et
    une file bornée.
  - Le repli WhatsApp appelle `graph.facebook.com/v19.0/me/messages` avec un corps non conforme à l'API Meta : il échouera toujours. Code mort ou à terminer.
  - Les URL de webhook ne sont pas contrôlées (Bandit B310) : exiger `https://`.
  - `settings.py` : `ADMINS` vaut `alerts@keuria.sn` par défaut. Un site mal configuré enverrait ses erreurs à une adresse que l'équipe ne contrôle peut-être pas.
- **[ÉLEVÉ] En-têtes de sécurité (`next.config.ts`).** La CSP est en « rapport seul » avec `'unsafe-inline'` et `'unsafe-eval'` : elle ne protège pas encore.
  Pas d'en-tête HSTS côté Next (Django n'en pose que sur ses propres réponses) ; valeur par défaut Django à 3 600 s. Mise en place progressive :
  CSP appliquée pour `base-uri`, `object-src`, `frame-ancestors`, `form-action`, puis `script-src` sans `unsafe-eval` (le moteur de blocs n'utilise plus `new Function`).
- **[ÉLEVÉ] Base SQLite par défaut en production.** Sans `DATABASE_URL`, Django démarre sur SQLite, y compris avec `DEBUG=False`. `check --deploy` ne le signale pas.
  Ajouter une vérification `keuria.E005`. Les scripts `scripts/backup-sqlite.sh` et `sqlite_backup.py` visent un moteur qui n'est pas celui de la production.
- **[MOYEN] Médias.** `SERVE_MEDIA` vaut vrai par défaut : Django sert les logos avec `django.views.static.serve`, déconseillé en production (pas de cache, lent).
- **[MOYEN] Temporisation d'énumération.** `ForgotPasswordView` envoie l'e-mail de façon synchrone seulement si le compte existe : la durée de réponse révèle l'existence.
  Envoyer en arrière-plan ou à durée constante.
- **[MOYEN] Suspension de compte fondée sur du texte libre.** `AuditLog.objects.filter(label__icontains=user.email)` : « a@x.com » est contenu dans « ba@x.com »
  (faux positifs) et la requête parcourt toute la table. Utiliser une clé étrangère ou un champ dédié.
- **[MOYEN] Compteur d'essais non atomique** (`OneTimeCode.consume`) : des requêtes parallèles peuvent dépasser les 5 essais. Utiliser `F('attempts') + 1` sous verrou.
- **[MOYEN] Palou (IA pour mineurs).** Bien conçu (éteint par défaut, mémoire côté serveur, e-mails et téléphones masqués, limite 20 requêtes/min). Il manque :
  un plafond quotidien par enfant et un coût global maximal (le budget Anthropic n'est pas protégé), la détection et le signalement des propos préoccupants,
  et le masquage des prénoms.
- **[BAS]** `robots.txt` n'interdit que `/dashboard` ; ajouter `/admin`, `/ecole`, `/enseignant`, `/parent`. Les routes API existent en double (avec et sans `/` final).
- **[BAS]** `layout.tsx` publie `<meta name="codex-preview" content="development">` en production, et un test en dépend. Retirer les deux.

### 3.4 Protection des données et conformité

- **B5 [RÉSOLU] Affirmation non étayée.** La page de confidentialité ne prétend plus aucun accord signé : elle décrit exactement les données envoyées. Le contrat de sous-traitance avec Anthropic est abandonné (sans objet) et n'est plus listé.
- **[ÉLEVÉ] Services tiers non déclarés.** Au chargement, le navigateur de l'enfant contacte Google Fonts (7 familles de polices), jsDelivr et
  `storage.googleapis.com` (jeu de reconnaissance de gestes) : adresse IP transmise à ces tiers, absents de la liste du document de données personnelles.
  Héberger les polices avec `next/font` et le wasm/modèle MediaPipe sur le site (gain : conformité, performance, fonctionnement hors ligne en école).
- **[MOYEN]** `ParentNotification` croît sans purge ; la conservation de 2 ans ne couvre que les comptes. Les comptes d'école n'ont aucune purge (déjà noté dans le document).
- **Point positif** : droit d'accès et d'effacement implémentés, conservation limitée avec avertissement, mot de passe exigé pour les actions sensibles, données de
  Palou jamais écrites en base, rien d'identifiant envoyé à Anthropic.

### 3.5 Référentiel et contenu

- **B3 [BLOQUANT] `frontend/public/rapport.html`** (rapport « exécutif », 66 Ko) et `public/maquettes/*.html` sont servis à tout visiteur. Le rapport annonce « 622+ tests »
  (réalité : 637 backend + 116 frontend, dont un ignoré), « 100 % succès » et « points d'audit corrigés et revérifiés » alors que la CI est rouge et que npm audit
  signale un avis critique. Déplacer ces fichiers hors de `public/` (ils appartiennent à `Rapports/`) et ne plus les citer comme preuve.
- **B4 [BLOQUANT] `COMPTES_CONNEXION.md`** donne `local-admin@keur-ia.test` avec le mot de passe `Admin-Keuria-2026`, et l'adresse personnelle `theeminence07@gmail.com`.
  Le dépôt est privé, mais un mot de passe écrit dans l'historique git y reste. À faire : supprimer le fichier, **changer ce mot de passe partout où il a pu être utilisé**,
  et ne garder dans le dépôt qu'une procédure de création de compte.
- **[ÉLEVÉ] Dépôt alourdi.** `frontend/public/scratch/` (code tiers du studio Scratch) pèse 134 Mo en 1 664 fichiers, dont **quatre copies de 17,9 Mo** de `gui.js`, `player.js`,
  `blocksonly.js`, `compatibilitytesting.js`. Images : 248 Mo de PNG (148 fichiers de plus de 500 Ko, 231 Mo ; ex. `Palou_Determine.png` 2,6 Mo) alors que 593 WebP existent déjà.
  Un enfant sur mobile paie ces octets. Convertir en WebP/AVIF et utiliser `next/image` (99 balises `<img>`, 4 `next/image`).
- **[MOYEN] Règle produit « aucun emoji ».** Respectée dans le parcours 7-9 et le dictionnaire, mais encore violée par `BadgeGrid` (badges), les classements (`WeeklyLeaderboardView`,
  `SchoolLeaderboardView`, `LeaderboardProfileModal`), l'avatar de repli `🧒🏾` et les e-mails de code. Les emojis viennent de l'API (`leaderboard.py`, `views.py`, 308 occurrences
  au total dont 144 dans les JSON de leçons, non affichées). Remplacer par des clés d'icône.
- **[MOYEN] Intégrité pédagogique du défi du jour.** 3 réponses justes sur 4 sont à l'indice 1 (la position « du milieu » signalée), et il n'y a que 4 défis en rotation.
  Les énigmes tournent A/B/C de façon prévisible. Mélanger les propositions côté serveur (graine par enfant et par jour) et enrichir la banque.
- **[BAS]** `/favicon.ico` répond 404 (erreur console sur chaque page).

### 3.6 Base de données et performance

- **[MOYEN] Dette du modèle.** `Progress`, `QuizAttempt` et `DailyUsage` portent à la fois `user` (nullable) et `owner_email`, avec des contraintes d'unicité en double,
  « le temps de la migration » : plan de nettoyage à prévoir. `Progress.lesson_id` mélange vraies leçons et préfixes `dc:`/`rd:` (défi, énigme) : un oubli de `lesson_progress()` fausse les comptes.
- **[MOYEN]** `/api/enseignant/programme` exécute 66 requêtes SQL (≈ 180 ms) : à optimiser avec `prefetch_related`. Les 46 autres routes testées font moins de 20 requêtes.
- **Mesures** (build de production, mobile simulé, page de connexion) : performance 68, accessibilité 100, bonnes pratiques 96. Temps de blocage 900 ms, LCP 3,6 s, 180 Ko de JavaScript
  inutilisé, 4 feuilles CSS bloquantes. JavaScript total : 4,3 Mo bruts, plus gros bloc 1,27 Mo.
- 54 routes sur 58 sont rendues à la demande (seules `/conditions`, `/confidentialite`, `/robots.txt` et la page 404 sont statiques), y compris la page d'accueil publique :
  la rendre statique permettrait un cache CDN.

### 3.7 Qualité du code et tests

- **Backend** : 12 351 lignes de production, 637 tests, 90 % de couverture ; ruff, `check`, `makemigrations --check` propres. Points chauds de complexité : `enrich_notification`
  (75), `_check_lesson` (69), `build_admin_dashboard` (33), `build_glossary` (32, mon code : à découper), `compute_badges` (27). `progress/views.py` a un indice de maintenabilité de 2,35 (grade C).
  Aucun test pour les apps `learners` et `schools`.
- **Frontend** : 44 576 lignes TypeScript, 266 fichiers. 0 erreur ESLint, **166 avertissements** (102 variables inutilisées, 34 `set-state-in-effect`, 12 dépendances de hooks, 10 `any`).
  Fichiers de plus de 800 lignes : 12 (`DashboardActivities` 1 946, `StudioAdminView` 1 629, `DashboardClient` 1 466). Le rapport interne parle de « découpage modulaire » mais
  `DashboardClient` fait encore 1 466 lignes. 2 777 styles en ligne.
- **Tests frontend** : 4 fichiers, 116 tests (115 réussis, 1 ignoré). Aucun test de composant, aucun test de bout en bout : pour 44 000 lignes, c'est le risque de régression principal
  lors de la montée de Next.js.

### 3.8 Documentation

README partiellement faux : « port 3001 », « aucun script de test frontend » (il y en a), « Python 3.12+ » (CI et Docker : 3.13), « pas de compte administrateur par défaut » (contredit par `COMPTES_CONNEXION.md`).
Il ne renvoie pas vers `docs/DEPLOIEMENT.md` ni `docs/EXPLOITATION.md`. Les 25 documents de `Rapports/` se contredisent. Aucun journal des changements.

---

## 4. Ce qui est bien (à conserver)

Authentification et contrôle parental particulièrement soignés ; test de verrouillage des rôles ; journalisation JSON avec identifiant de requête ; sondes de santé ; Redis exigé par une vérification
de déploiement ; sauvegarde et restauration scriptées ; conservation limitée des données ; faible duplication (0,96 %) ; build de production qui passe ; Lighthouse accessibilité 100 ;
parcours 7-9 sans emoji, avec test de lecture de toutes les leçons.

---

## 5. Plan d'action

**Avant la mise en ligne (2 à 3 jours)**
1. Commiter ensemble : migrations `0010` et `0011`, `package-lock.json` régénéré, `schema.yml`, correctifs ruff. Pousser, vérifier que la CI passe au vert (B1).
2. Supprimer `COMPTES_CONNEXION.md`, changer le mot de passe administrateur ; déplacer `rapport.html` et `maquettes/` hors de `public/` (B3, B4).
3. Passer à `next@16.4.0`, retirer l'outillage Cloudflare, relancer `npm audit`, recette complète des écrans (B2).
4. B5 : résolu (page corrigée, contrat sans objet).
5. Activer la protection de branche (CI obligatoire, une revue avant fusion) et définir quelle branche est la production.

**Dans les 2 semaines** : alerting sans données d'enfants et à file bornée ; `check` contre SQLite en production ; CSP appliquée en partie et HSTS ; image Docker du frontend allégée ; polices et modèle MediaPipe hébergés ;
compression des 231 Mo d'images ; défi du jour mélangé ; plafond quotidien de Palou.
**Dans le mois** : tests de composants et un parcours de bout en bout ; découpage de `DashboardActivities`, `DashboardClient`, `StudioAdminView` ; nettoyage `owner_email` ; suppression des emojis restants ;
README et documentation unifiés (un seul rapport daté).

---

## 5 bis. Suivi des corrections (même journée)

Corrigé dans le dossier de travail, **pas encore commité ni poussé** (vérifié : 664 tests backend, 115 tests frontend, ruff, TypeScript, `check --deploy`,
build de production sous Next.js 16.4.0) :

| Réf. | Correction |
|---|---|
| B1 | Lockfile npm régénéré (`npm ci` passe), erreurs ruff corrigées, `schema.yml` régénéré ; `check --deploy` ne signale plus les 310 avertissements de documentation d'`drf-spectacular` (ils étaient une 3e cause d'échec de la CI) ; seuil de couverture backend à 85 % dans la CI |
| B2 | Next.js 16.4.0 : **0 vulnérabilité en production** (`npm audit --omit=dev`). Outillage Cloudflare retiré (vinext, wrangler, vite…, `worker/`, `vite.config.ts`, test devenu orphelin). Il reste 5 alertes hautes **de développement uniquement** (chaîne `eslint-config-next` : `braces`, `micromatch`), sans effet sur ce qui est livré |
| B3 | `rapport.html` et `maquettes/` déplacés dans `Rapports/archives/` (plus servis publiquement) |
| B4 | `COMPTES_CONNEXION.md` réécrit sans mot de passe ni adresse personnelle. **Reste à faire : changer le mot de passe `Admin-Keuria-2026` partout où il a servi, et purger l'historique git si nécessaire** |
| B5 | Article 6 de la page Confidentialité réécrit : plus aucune affirmation d'accord signé ; décrit exactement les données envoyées. Contrat Anthropic abandonné : sans objet. |
| Alerting | Le texte des exceptions n'est plus transmis ; fils d'exécution bornés ; compteur partagé (Redis) et plafond de 20 alertes / 10 min ; webhooks en HTTPS obligatoire ; plus de destinataire par défaut ; repli WhatsApp inopérant supprimé |
| Déploiement | Contrôle `keuria.E005` (SQLite refusé en production) ; HSTS d'un an par défaut côté Django et côté Next ; CSP appliquée (`frame-ancestors`, `form-action`, `base-uri`, `object-src`) ; `Cross-Origin-Opener-Policy` ; balise `codex-preview` retirée ; `favicon` déclaré ; `robots.txt` complété |
| Docker | `Dockerfile` du frontend : outils de développement retirés de l'image (`npm prune --omit=dev`), fichiers appartenant à l'utilisateur `node`, contrôle de santé. **Non construit** (Docker absent de cette machine) |
| Défi / énigme du jour | Propositions mélangées par le serveur (stable par enfant et par jour, bonne réponse jamais envoyée) ; 12 tests dédiés |
| Palou | Plafond de 60 messages par enfant et par jour (`PALOU_DAILY_MESSAGES`) ; 3 tests |
| Comptes | Essais de code atomiques (plus de dépassement par requêtes parallèles) ; suspension administrative exacte (plus de faux positifs `a@x.com` / `ba@x.com`, et une réactivation lève bien la suspension) ; 6 tests |
| Règle « aucun emoji » | Badges de classement et grille de badges remplacés par de vraies icônes ; e-mails et avatar de repli sans emoji. Les emojis restent dans les données de l'API (champ `emoji`) mais ne sont plus affichés |
| Tests | `conftest.py` : cache vidé et hachage rapide entre les tests ; la suite backend passe de 5 min à 1 min |
| Documentation | README corrigé (ports, Python 3.13, tests, liens), `DONNEES_PERSONNELLES.md` (services tiers réels), `DEPLOIEMENT.md`, `.env.example` |

**Traité depuis : voir la section 5 ter.**

## 5 ter. Suivi des corrections (9 octobre)

| Sujet | Résultat |
|---|---|
| Migrations 0010 et 0011 | Commitées ensemble et poussées ; CI verte (backend, frontend, docker) |
| Polices | Hébergées sur le site (`app/fonts.css`, 13 fichiers `woff2`, 371 Ko) ; plus aucune requête vers Google Fonts |
| MediaPipe | Modèle (8 Mo) dans `public/mediapipe`, moteur wasm copié depuis `node_modules` à `predev` / `prebuild` ; plus aucune requête vers jsDelivr ni `storage.googleapis.com` |
| Poids des images | Mascottes limitées à 900 px avec contrôle de qualité, bannières d'âge converties en WebP ; images suivies par git : environ 99 Mo (le chiffre de 231 Mo comptait aussi des dossiers de travail non suivis) |
| Scratch | Variantes en double supprimées (`player`, `blocksonly`, `compatibilitytesting`) : `public/scratch` passe de 134 à 82 Mo |
| Fichiers de plus de 800 lignes | Plus aucun dans `frontend/app` (état, gestionnaires et blocs d'interface répartis dans des hooks et des sous-composants) ; TypeScript, lint (0 erreur), 119 tests et build de production passent |
| Tests de composants | `tests/components.test.mjs` : dictionnaire (mots secrets, erreur réseau), icônes de palier, avertissement de temps d'écran, absence d'emoji |
| Fichiers orphelins de `dashboard/` | Absents du dépôt à ce jour |
| Mot de passe administrateur, page Confidentialité | Laissés tels quels sur décision du propriétaire |
| **Protection de branche GitHub** | **Impossible avec le jeton actuel** (l'API répond 404 : jeton sans droit d'administration, ou fonction réservée à une offre payante pour un dépôt privé). À faire par le propriétaire : *Settings > Branches > Add rule* sur `main` : exiger une pull request avec 1 approbation, exiger les contrôles `backend` et `frontend`, interdire le push forcé et la suppression. Sur `test` et `Dev_Lansana_Coly` : interdire seulement push forcé et suppression |

Reste dans le plan : nettoyage `owner_email`, optimisation de `/api/enseignant/programme`, envoi d'e-mail asynchrone, épinglage des actions GitHub par empreinte.
---

## 6. Limites de cet audit

- Docker n'est pas installé sur cette machine : le build des images et `docker compose` n'ont pas été exécutés ; la sauvegarde/restauration n'a jamais été rejouée.
- Pas de serveur SonarQube : les notes ci-dessus reproduisent ses indicateurs avec d'autres outils, elles ne sont pas des notes Sonar officielles.
- Aucun test de charge ni de pénétration actif ; aucun contrôle de l'infrastructure réelle (domaine, TLS, serveur).
- Lighthouse n'a mesuré que la page de connexion (mobile simulé) ; les tableaux de bord n'ont pas été mesurés.
- Pendant l'audit, j'ai modifié trois fichiers du dossier de travail, sans rien commiter ni pousser : `frontend/package-lock.json`, `backend/schema.yml`, et les imports de
  `challenge.py`, `leaderboard.py`, `riddle.py`. Un compte de test temporaire a été créé puis supprimé de la base locale.
