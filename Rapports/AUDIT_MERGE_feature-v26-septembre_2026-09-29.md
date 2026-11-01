# Audit de fusion : `feature/v26-septembre` → notre branche

Date : 29/09/2026 · Portée : `origin/feature/v26-septembre` (d480667, 57 commits de Mounassesall) comparée à `Dev_Lansana_Coly` + tout notre travail non commité.

## Méthode (lecture seule)

- Aucun `checkout`, aucun changement de branche : notre travail n'étant pas commité, cela l'aurait mis en danger.
- Lecture des objets git avec `dulwich` (git.exe est absent de cette machine) ; la feature est extraite dans un dossier temporaire, hors dépôt.
- Point de départ commun : `aad6118` (ancienne branche `test`). La feature a 451 fichiers modifiés (dont 218 images), nous 134 fichiers suivis. **58 fichiers sont touchés des deux côtés.**
- Vérifications : présence de chaque défaut que nous avions corrigé, imports cassés, migrations, tailles de conflits, lecture du code à risque.

## Verdict

**Ne pas fusionner tel quel.** La branche apporte beaucoup de valeur (espace école, Studio de contenus, messagerie, nettoyage du dépôt) mais elle a été développée sur l'ancien module `progress` : une fusion brute (ou une résolution « garder la feature » sur `progress`) **réintroduirait presque tous les défauts corrigés dans cette session**.
La fusion est faisable sans perte si l'on suit la procédure de la section 5 : **notre côté gagne sur `progress`, `accounts` (sécurité) et les réglages ; la feature gagne sur `scolaire`, `superadmin`, `famille`, les images et le nettoyage.**

## 1. Bloquants (cassent l'application ou les tests)

| # | Constat | Pourquoi c'est grave |
|---|---|---|
| B1 | `settings.py` de la feature met **Redis en cache par défaut** (`redis://127.0.0.1:6379/1`) sans ajouter le paquet `redis` à `requirements.txt` | `redis` n'est pas installé dans notre venv : la connexion (verrouillage), le limiteur de débit et `cache.clear()` de `conftest.py` échouent. **Tous les tests et toute connexion plantent** sans serveur Redis. Leur CI (`ci.yml`) n'a pas de service Redis non plus. Notre solution : `REDIS_URL` optionnel, mémoire locale sinon, avertissement `keuria.W001` en déploiement. |
| B2 | Deux messageries familiales : `apps/famille` (`/api/famille/messages`) côté feature, `progress/family_chat.py` (`/api/family-chat`, modèle `FamilyMessage` dans `progress`) côté nous | Deux tables, deux API, deux versions de `FamilyChatWidget.tsx` (le composant est réécrit des deux côtés, props différents). Il faut **en garder une seule** (décision, section 6). |
| B3 | `progress/views.py` : 263 lignes changées côté feature, 984 côté nous, écart de 1057 | Conflit certain et massif. Cf. section 2 : garder **notre** fichier, puis y reporter les rares apports de la feature. |
| B4 | `DashboardClient.tsx` : 56 lignes côté feature, 1361 côté nous | Conflit certain. Garder **notre** fichier et y reporter 4 changements précis de la feature (section 3). |
| B5 | Migrations : pas de collision de numéros (feature : `schools/0004`, `superadmin/0002`, `famille/0001` ; nous : `accounts/0009-0012`, `progress/0008-0014`) mais **notre `progress` supprime `WeeklyXP` (0010)** alors que 3 tests de la feature et son code l'utilisent | Après fusion : adapter ou supprimer `test_weekly_leaderboard.py`, `test_progress_api.py` (feature), `scolaire/tests/test_security_hardening.py` (import `WeeklyXP`). |

## 2. Défauts déjà corrigés chez nous que la feature réintroduit

| Défaut (référence audit) | Notre arbre | Feature |
|---|---|---|
| XP envoyée par le navigateur (champ `xp`, plafonnée à 200) ; catalogue serveur absent | corrigé : XP lue dans le catalogue | **présent** (`ProgressInputSerializer.xp`) |
| Ancienne logique de niveaux `XP_PER_LEVEL = 100` | paliers canoniques (`levels.py`) | **présent** (le frontend parent affiche `xpInLevel/xpPerLevel`) |
| `GET /api/progress`, tutoriel, profil ouverts aux anonymes (SEC-11) | 401 | **présent** (`AllowAny`) |
| Flux SSE (`SSENotificationsView`, occupe un worker 5 min, inutilisé) | supprimé | **présent** |
| Déverrouillage : `grant_minutes` **retire des minutes** au temps joué (falsifie l'historique) | crédit en base `ScreenTimeCredit` | **présent** |
| Verrouillage du déverrouillage dans le cache, sans `scope` ; demande de temps = notification `module_done` | `LoginLockout(scope='unlock')` ; type `screen_time_request` | **présent** (et l'approbation parentale n'existe pas) |
| Classement global `WeeklyXP`, toutes écoles mélangées, XP hebdo dupliquée | par école / parcours, calculé sur `Progress`, vue « proche de moi » | **présent** |
| Mots de passe : `PBKDF2SHA1` autorisé (SEC-10) | PBKDF2 seul | **présent** |
| `TIME_ZONE = 'UTC'` (BUG-11) | Africa/Dakar | **présent** |
| Verrouillage de connexion par e-mail seul (déni de service) | couple compte+IP | **présent** |
| `requirements.txt` : Django 5.1.4, Faker, factory_boy, pillow | Django 6.1.1, séparé prod/dev | **présent** |
| Réglages parentaux e-mail / push / bilan / 2FA sans effet | tous implémentés (2FA e-mail, push VAPID, bilan hebdo) | la feature les remplace par des badges « Bientôt disponible » |
| Badges : `get_or_create` par badge (66 requêtes sur `GET /progress`) | ~10 requêtes | `compute_badges` simplifié à 6 badges, sans enregistrement |
| `codex-preview` dans `layout.tsx`, script `lint` cassé, pas de pages d'erreur | corrigés | **présent** |
| Mot de passe Gmail dans `.env` | à révoquer (nous) | non concerné (`.env.example` vide) |

**Défauts corrigés par la feature aussi** (à garder, sans conflit de fond) : rattachement automatique des enseignants supprimé, validation stricte des limites parentales, verrouillage 423 côté serveur (chez nous aussi), suppression de `LeaderboardView` public, en-têtes de sécurité, suppression de `pusher`, suppression de `/api/chat` et de `chat-db.json`, nettoyage des fichiers parasites du dépôt (1.zip, old_*, anciens diffs, vidéo).

**Non corrigé ni chez eux ni chez nous** : `curriculum` reste public (`AllowAny`) et expose les bonnes réponses.

## 3. Ce qu'il faut absolument reporter de la feature dans nos fichiers

| Fichier (nous gardons la base) | À reporter depuis la feature |
|---|---|
| `DashboardClient.tsx` | `badgeImage()` (import + 2 usages), `<FamilyChatWidget viewerRole="parent" />` **si** on garde leur messagerie, retrait de l'écran « Connexion à ton aventure… » de 4,5 s, retrait du lien « Retour à l'accueil » |
| `lms-data.ts` | `BADGE_IMAGES` + `badgeImage()` (illustrations validées) ; requis aussi par `BadgeUnlockAnimation.tsx` |
| `BadgeUnlockAnimation.tsx` | `badgeImage(badge.id)` (3 lignes) |
| `ParentChildrenView.tsx` | `LinkChildModal` (fenêtre « Relier mon enfant ») et le rechargement de la liste ; **garder** notre affichage de niveau (paliers) |
| `GamesMapView.tsx` | fond du niveau 7 (`bg-level-7.jpg`). **Ne pas reprendre le bouton « tout débloquer » (`keuria_dev_unlock_all`)** : visible par les enfants, il contourne le verrouillage des parcours (voulu). |
| `accounts/serializers.py` | prénom, nom, téléphone obligatoires + `ParentProfile` + `phone_problem` + `LoginSerializer.email` en identifiant ; **garder** notre `acceptTerms` |
| `accounts/views.py` | textes « KeurIA » ; garder notre refus des enseignants sans école, la double authentification et `emailSent` |
| `settings.py` | `MEDIA_*`, app `famille`, textes « KeurIA » ; **refuser** leur bloc `CACHES` Redis obligatoire |
| `next.config.ts` | rewrite `/media`, CSP en mode rapport, `X-Frame-Options`, variable `DJANGO_API_URL` (même nom que `local-auth.ts`) ; **unifier** avec notre `BACKEND_URL` (garder un seul nom, mettre à jour `Dockerfile` et `docker-compose.yml`) ; remettre notre `poweredByHeader: false` |
| `sign-out-client.ts` | valeur par défaut `"/connexion"` ; **garder** notre purge des clés `keria_*` |
| `.github/workflows/ci.yml` | conflit d'ajout des deux côtés : garder le nôtre (Python 3.13, `requirements-dev.txt`, `build`) + leur étape `ruff check` ; lint sans avertissements bloquants |
| `requirements.txt` | leur `pypdf==6.19.0` (import PDF) ; ne pas reprendre `Django==5.1.4` |
| `.env.example` | leur bloc e-mail commenté ; garder nos variables (`REDIS_URL`, `TIME_ZONE`, VAPID, HSTS) |
| `progress/urls.py`, `progress/views.py` | **rien de fonctionnel** à reprendre (leurs ajouts ont un équivalent chez nous) ; supprimer `LeaderboardView`, déjà retiré chez nous |

## 4. Autres constats sur le code de la feature (à traiter après fusion)

- **Compteurs trompeurs** (`scolaire/services/ecole.py`, `superadmin/services.py`) : `Progress.objects.count()` compte aussi les défis du jour (`dc:`) et les jeux d'arcade comme des « leçons ». À filtrer avec `lesson_progress()`.
- **Classements de l'espace école** : « podium des classes » et « palmarès inter-écoles » (commits 34d56b05, f8622f2a). Pas un classement d'élèves, mais à valider avec votre règle « les écoles ont leur propre classement en leur sein » (section 6).
- **`seed_demo_school.py`** et `create_school_admin.py` : `School.objects.first()` / rattachement par défaut, pour des commandes de démonstration uniquement : acceptable, à ne pas lancer en production.
- **`FamilyChatWidget`** (feature) : appel de `/api/famille/messages` ; le nôtre appelle `/api/family-chat`. Selon la décision B2, un des deux est à supprimer.
- **`ParentDashboardView`** et **`ParentChildrenView`** : la feature affiche encore `xpInLevel/xpPerLevel` (ancien format de niveau) : ne pas reprendre ces lignes.
- **Tests de la feature à adapter** : ceux qui supposent un profil anonyme (`email == ""`), `WeeklyXP`, l'XP envoyée par le client, le déverrouillage qui réduit les minutes.
- **Le frontend de la feature dépend de** `frontend/public/images/badges/*` et de 218 images : fusion sans conflit, mais gros volume (le dépôt est déjà lourd).

## 5. Procédure recommandée (sans rien perdre)

1. **Commiter notre travail d'abord** sur une branche de sauvegarde, par exemple `backup/audit-refactor-2026-09-29`. Sans cela, rien n'est protégé. (Vérifier que `backend/.env` n'est pas suivi.)
2. Créer une branche de fusion depuis notre branche : `git checkout -b merge/v26-septembre`.
3. `git merge origin/feature/v26-septembre`, puis résoudre :
   - **`--ours` (nous)** : `apps/progress/**`, `apps/accounts/throttling.py`, `keuria/settings.py` (puis y ajouter `MEDIA_*` et l'app `famille`), `DashboardClient.tsx`, `ParentSettingsView.tsx`, `WeeklyLeaderboardView.tsx`, `sign-out-client.ts`, tests `progress` et `accounts`.
   - **`--theirs` (feature)** : `apps/scolaire/**`, `apps/superadmin/**`, `apps/famille/**` (selon B2), `frontend/app/admin/**`, `ecole/**`, `enseignant/**`, `_scolaire/**`, images, suppression des fichiers parasites (acceptez les suppressions de `HomeClient.tsx`, `api/chat/route.ts`, `modules/*`, `chat-db.json`).
   - **À combiner à la main** : la table de la section 3.
4. Reporter les apports listés en section 3.
5. Vérifier : `python manage.py check`, `makemigrations --check`, `pytest apps` (les tests `WeeklyXP` sont à supprimer ou à réécrire), `tsc --noEmit`, `npm run lint`, puis `migrate` sur une copie de la base.
6. Relancer la vérification automatique de cet audit (script `audit_backend.py` dans le dossier temporaire) : aucun des défauts du tableau 2 ne doit rester « présent ».

## 6. Décisions à prendre par vous

1. **Messagerie familiale** : garder `apps/famille` (feature) ou `progress/family_chat.py` (nous) ? Recommandation : garder celle qui a le plus de tests et migrer le composant de l'autre ; à défaut, `famille` (app dédiée, plus propre) en y reportant notre limitation de débit et nos tests.
2. **Palmarès inter-écoles / podium des classes** : à conserver dans l'espace direction/superadmin uniquement ? (Recommandé : oui, jamais visible des élèves.)
3. **Bouton « tout débloquer » de la carte des jeux** : supprimer (recommandé) ou le réserver aux comptes administrateurs.
4. **Nom du produit** : la feature renomme « KerIA » en « KeurIA » dans les e-mails ; nos pages légales, la CI et les textes disent « Kër IA » / « kEur IA ». À uniformiser.
5. **Variable d'environnement de l'API** : `DJANGO_API_URL` (feature, aussi utilisée par le rendu serveur) ou `BACKEND_URL` (nous). Recommandé : garder `DJANGO_API_URL`.

## Fichiers touchés des deux côtés (58)

`progress/views.py`, `progress/urls.py`, `progress/tests/*`, `accounts/{views,serializers}.py`, `accounts/tests/*`, `keuria/settings.py`, `requirements.txt`, `.env.example`, `scolaire/{views.py,services/ecole.py,management/commands/seed_demo_school.py}`, `.github/workflows/ci.yml`, `frontend/app/{connexion/*,dashboard/{AdultLayout,AdvancedGames,DashboardClient,GamesMapView,ParentChildrenView,ParentSettingsView,TutorialOverlay}.tsx,components/{BadgeUnlockAnimation,FamilyChatWidget}.tsx,ecole/_components/EcoleShell.tsx,enseignant/_components/EnseignantShell.tsx,_scolaire/lib/{ecoleApi,types}.ts,lms-data.ts,globals.css,layout.tsx,page.tsx,profile/ProfileClient.tsx,sign-out-client.ts}`, `frontend/{eslint.config.mjs,next.config.ts,next-env.d.ts,package.json}` et les fichiers supprimés côté feature que nous avons modifiés (`HomeClient.tsx`, `api/chat/route.ts`, `modules/*`, `chat-db.json`).
