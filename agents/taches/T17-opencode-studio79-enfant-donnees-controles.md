# T17 — OpenCode — studio 7-9 : le côté enfant, les données, les tests — et vérifier la validation des parents

**Lis d'abord `docs/STUDIO79.md` et `docs/REGLES_AGENTS.md`.** Pars du sommet de `Dev_Lansana_Coly` (commit `[claude]` « studio 7-9 : fondation » et « inscription parent : validation »).
Après le `git pull` : `venv\Scripts\python.exe manage.py migrate` (nouvelles tables `accounts 0016`, `curriculum 0012`). Antigravity (tâche T18) construit en parallèle l'éditeur visuel dans
`frontend/app/admin/_components/studio79/` et `frontend/app/admin/studio79/` : **n'y touche pas**. Tu travailles côté enfant, serveur, tests.

## Contexte en deux phrases

Un administrateur modifie une leçon dans le studio, la publie, et 15 minutes plus tard les enfants doivent voir la nouvelle version. Aujourd'hui le lecteur 7-9 lit seulement des fichiers
`frontend/content/parcours79/mXX.json` embarqués dans le site : le serveur a déjà tout ce qu'il faut (`GET /api/curriculum/content79/…`), mais **personne ne le lit encore côté enfant**.

## A. Le lecteur de l'enfant lit le contenu publié (le plus important)

1. **`frontend/app/dashboard/parcours79/studioContent.ts`** (nouveau) : garde en mémoire les leçons modifiées dans le studio.
   - `GET /api/curriculum/content79/` renvoie `{ "p1-1": { version, source }, … }` (uniquement les leçons dont la version en ligne n'est plus celle d'origine). Pour chaque entrée dont la version n'est pas déjà en mémoire,
     `GET /api/curriculum/content79/<id>/` renvoie `{ version, content }` (`content` = un `LessonContent`). 404 = contenu d'origine : ne rien garder.
   - API : `refreshStudioContent(): Promise<void>` (idempotent, jamais d'exception : en cas d'erreur réseau on garde ce qu'on a), `ensureLesson(id): Promise<void>` (charge juste cette leçon, 1,5 s au plus, puis on continue avec ce qu'on a),
     `getStudioLesson(id): LessonContent | undefined`.
   - Rafraîchir : au premier affichage du parcours 7-9, au retour sur l'onglet (`visibilitychange`), et toutes les 5 minutes (une publication devient visible sans aucune tâche planifiée côté serveur).
2. **`content.ts`** : `getLessonContent(id)` renvoie d'abord la version du studio si elle existe, sinon le JSON embarqué. `getChapter`, `isPlayable`, `computeMap` ne changent pas de comportement (le titre d'une leçon vient du catalogue).
3. **Ouvrir une leçon** (`DashboardActivities.tsx`, composant qui appelle `getLessonContent`) : appeler `ensureLesson(id)` **avant** d'afficher le lecteur (court écran de chargement déjà prévu pour les leçons, sinon un simple `Skeleton`),
   pour qu'un enfant qui ouvre une leçon récemment publiée ait la bonne version même si la page est ouverte depuis longtemps. **Jamais de changement de contenu pendant qu'une leçon est en cours** : la version est figée à l'ouverture
   (stocke-la dans l'état du lecteur).
4. **Voix** : le serveur écrit `voiceOff` dans le contenu publié ; `LessonPlayer79` saute déjà ces passages (rien à refaire). Vérifie à l'oreille/au code qu'un passage modifié reste muet et qu'un passage intact garde sa voix.
5. **Images** : `Img79.lessonImageUrl` comprend déjà `media:<id>.<empreinte>` (URL `/api/media/…`). Vérifie qu'une image du studio s'affiche dans la leçon, avec le repli de Palou si elle est introuvable.
6. **Tests** (`frontend/tests/*.test.mjs`, lancés par `npm test`) : `studioContent` (manifeste vide ; une leçon modifiée remplace le JSON ; 404 ignoré ; erreur réseau ignorée ; pas de rechargement si la version est la même ; `ensureLesson` borné dans le temps),
   `lessonImageUrl` (fichier du site / média), `startAt` et `preview` du lecteur, `voiceOff` (clip sauté). Suis le style de `tests/parcours79-player.test.mjs`.

## B. Outils serveur

1. **`manage.py import_content79`** (`backend/apps/curriculum/management/commands/`) : enregistre le contenu d'origine des 40 leçons comme version 1 (`source='import'`, en ligne), sans rien écraser (idempotent, `--dry-run`, `--from CHEMIN` pour lire
   un autre dossier que `frontend/content/parcours79`). À lancer au déploiement : sur le serveur de production, le dossier `frontend/` peut ne pas exister, et le studio en a besoin pour « Retour au contenu d'origine ».
   Réutilise `studio79._ensure_seeded` / `parcours79.load_chapters`. Test.
2. **`manage.py check_parcours79 --db`** : valide aussi les versions **en ligne** de la base (même règles que le studio : structure = erreur, style = avertissement) et signale un `voiceOff` incohérent. Test.
3. **Durcissement** : limite de débit sur `POST superadmin/media` (30 envois par minute et par administrateur, réponse 429 en français) ; refuse un contenu de leçon de plus de 2 Mo (déjà fait : ajoute le test du 413) ; ne jamais renvoyer `data` d'un média dans un journal ou une erreur.
4. **API documentée** : `python manage.py spectacular --file schema.yml` et commite `schema.yml` (les routes `studio79`, `media`, `content79` y figurent avec leurs réponses).
5. **Ménage** : `python -m ruff check .` propre sur tout ce que tu touches.

## C. Tests de non-régression du studio

- Test node (`frontend/tests/studio79-schemas.test.mjs`) : pour chacun des 17 types de `Round` (`parcours79/types.ts`), `ROUND_TYPES[type]` existe, `blank().type === type`, les clés de champs sont uniques, chaque champ `ref`/`multiref` pointe vers une liste (`from`) qui existe dans le même schéma,
  `blank()` renvoie un objet neuf à chaque appel. (Le fichier est du TypeScript : compile-le comme le font les autres tests du dossier.)
- Test Python : `studio79.spoken_clips` produit exactement les clés de fichiers audio présentes sur le disque pour une leçon d'origine (`frontend/public/audio/palou/lecons/mXX/<id>/<id>_<clé>.mp3`) — c'est la garantie que `voiceOff` est exact.
- Test Python : un contenu d'origine republié sans changement est refusé (« identique ») ; deux ouvertures simultanées d'une leçon ne créent qu'une version 1.

## D. Vérifier dans un vrai navigateur la validation des parents (livrée par Claude, jamais testée à l'écran)

Règle : un parent qui s'inscrit n'a plus d'accès tant que l'administration n'a pas accepté sa demande. Code : `backend/apps/accounts/approval.py`, `views.py` (`approval_block_response`), `backend/apps/superadmin/services.py`
(`list_registrations`, `decide_registration`), pages `frontend/app/connexion/PendingApproval.tsx` et `frontend/app/admin/inscriptions/`. Joue ce scénario, avec captures (`agents/rapports/T17-captures/`) à 1440 et 390 px :
1. Inscription d'un parent (avec un enfant) → code e-mail (console de Django) → écran « Demande bien reçue ! » (aucune session ouverte).
2. Reconnexion du parent → même écran d'attente. Connexion de l'enfant du foyer → message clair.
3. Compte `admin` → menu **Inscriptions** avec pastille de compteur → la carte du parent (nom, e-mail, téléphone, enfant) → **Refuser** avec un motif → e-mail → le parent voit le motif à la connexion.
4. **Accepter finalement** → e-mail → le parent et l'enfant se connectent. 5. Le rappel sur le tableau de bord admin disparaît. 6. `PARENT_REGISTRATION_REQUIRES_APPROVAL=False` rétablit l'accès direct.
Corrige tout défaut visible (texte, mise en page, état de chargement) sans changer la règle ; signale ce que tu ne peux pas corriger.

## Contrôles avant chaque push (la CI doit rester verte)

Frontend : `npm run typecheck`, `npm run lint` (0 erreur), `npm test`. Backend : `python -m pytest -q`, `python -m ruff check .`, `python manage.py check_parcours79`.
**Disque** : si tu lances Chrome pour les captures, UN seul profil temporaire avec `--disk-cache-size=1`, supprimé ensuite, dans une commande à part (le disque C: s'est déjà rempli une fois) ; vérifie `Get-PSDrive C` avant.

## Rendu

Commits signés `[opencode] feat(studio79): … (T17)` + `Agent: opencode`, auteur `OpenCode <opencode@keuria.local>`, fichiers ajoutés un par un, push sur `Dev_Lansana_Coly` uniquement.
Rapport `agents/rapports/T17-opencode.md` : chaque point A–D, ce qui est vérifié (commande + résultat), ce qui ne l'est pas, les captures. Ne dis « terminé » que si le parcours D marche réellement et si un enfant voit bien une leçon publiée depuis le studio
(modifie le texte d'un écran avec l'API ou le studio, force la publication en base avec `UPDATE … SET publish_at = now()`, recharge la leçon côté enfant).
