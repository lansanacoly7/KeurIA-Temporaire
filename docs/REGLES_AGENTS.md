# Règles de travail des agents (Claude, Antigravity, OpenCode)

Trois agents travaillent sur ce dépôt, avec Lansana. Chacun doit pouvoir reconnaître ce que les autres ont fait.

## 1. Branche

- On travaille et on pousse **uniquement sur `Dev_Lansana_Coly`**.
- **Jamais** sur `test` ni sur `main` : c'est Lansana qui décide quand `test` avance.
- Avant de commencer : `git fetch`, être sur `Dev_Lansana_Coly`, à jour avec `origin/Dev_Lansana_Coly`.
- Avant de pousser : refaire un `git fetch` ; si la branche a avancé, intégrer ses commits d'abord. Jamais de push forcé.

## 2. Signature

- Le message de chaque commit commence par le nom de l'agent entre crochets : `[claude]`, `[antigravity]`, `[opencode]`.
  Exemple : `[antigravity] feat(images): 15 images des modules 9 et 10`
- L'auteur du commit porte aussi le nom de l'agent :
  `git commit --author="Antigravity <antigravity@keuria.local>" -m "..."` (OpenCode : `OpenCode <opencode@keuria.local>`, Claude : `Claude <claude@keuria.local>`).
- Le message se termine par une ligne `Agent: antigravity` (ou `opencode`, `claude`).
- On ne commite que **ses propres fichiers**, listés un par un (`git add chemin/fichier`). Jamais `git add -A` ni `git add .` : le répertoire de travail
  peut contenir des modifications non commitées d'un autre agent.

Retrouver qui a fait quoi : `git log --format="%h %an %s" origin/Dev_Lansana_Coly`.

## 3. Interdits

- Remettre la vue « Carte » (sauvegarde locale dans `frontend/local-only/`, jamais poussée).
- Rendre le mode développeur actif par défaut (`frontend/app/utils/devMode.ts` : seulement sous `next dev`, éteint par défaut).
- Commiter un secret (clé, mot de passe, token) ou un fichier `.env`.
- Écrire un fichier en UTF-16 ou avec « use client » ailleurs qu'en première ligne d'un `.tsx`.
- Supprimer les fichiers d'un autre agent sans demande explicite.

## 4. Avant chaque push (la CI doit rester verte)

- Frontend : `npm run typecheck`, `npm run lint` (0 erreur), `npm test`.
- Backend : `python -m pytest -q`, `python -m ruff check .`, `python manage.py check_parcours79`.
- Si l'API change : `python manage.py spectacular --file schema.yml`, puis commiter `schema.yml`.
- Après le push, vérifier que la CI GitHub est verte ; si elle est rouge à cause de soi, réparer tout de suite.

## 5. Rôles habituels

- **Antigravity** : images et illustrations (`frontend/public/images/...`). Il n'écrit pas dans `frontend/content/` : Claude branche les images avec `scripts/story_images.py`.
- **OpenCode** et **Claude** : code. Si on sort de son rôle habituel, le dire dans le message de commit.
