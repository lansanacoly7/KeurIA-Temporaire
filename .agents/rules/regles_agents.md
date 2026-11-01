# Règles de travail des agents (Claude, Antigravity, OpenCode)

Source : `docs/REGLES_AGENTS.md`
Trois agents travaillent sur ce dépôt, avec Lansana. Chacun doit pouvoir reconnaître ce que les autres ont fait.

## 1. Branche
- On travaille et on pousse **uniquement sur `Dev_Lansana_Coly`**.
- **Jamais** sur `test` ni sur `main` : c'est Lansana qui décide quand `test` avance.
- Avant de commencer : `git fetch`, être sur `Dev_Lansana_Coly`, à jour avec `origin/Dev_Lansana_Coly`.
- Avant de pousser : refaire un `git fetch` ; si la branche a avancé, intégrer ses commits d'abord. Jamais de push forcé.

## 2. Signature & Commits pour Antigravity
- Le message de chaque commit commence par le nom de l'agent entre crochets : `[antigravity]`.
  Exemple : `[antigravity] feat(images): 15 images des modules 9 et 10`
- L'auteur du commit porte obligatoirement :
  `git commit --author="Antigravity <antigravity@keuria.local>" -m "..."`
- Le message de commit se termine toujours par une ligne :
  `Agent: antigravity`
- On ne commite que **ses propres fichiers**, listés un par un (`git add chemin/fichier`).
  **JAMAIS `git add -A` ni `git add .`** car l'espace de travail peut contenir des modifications en cours d'un autre agent.

## 3. Interdits absolus
- Ne jamais remettre la vue « Carte » (sauvegarde locale dans `frontend/local-only/`, jamais poussée).
- Ne jamais rendre le mode développeur actif par défaut (`frontend/app/utils/devMode.ts` : seulement sous `next dev`, éteint par défaut).
- Ne jamais commiter un secret (clé, mot de passe, token) ou un fichier `.env`.
- Ne jamais écrire un fichier en UTF-16 ou avec `"use client"` ailleurs qu'en toute première ligne d'un composant `.tsx`.
- Ne jamais supprimer les fichiers d'un autre agent sans demande explicite.

## 4. Avant chaque push (la CI doit rester verte)
- **Frontend** :
  - `npm run typecheck`
  - `npm run lint` (0 erreur tolérée)
  - `npm test`
- **Backend** :
  - `python -m pytest -q`
  - `python -m ruff check .`
  - `python manage.py check_parcours79`
- Si l'API change : `python manage.py spectacular --file schema.yml`, puis commiter `schema.yml`.
- Après le push, vérifier que la CI GitHub est verte ; si elle est rouge à cause de soi, réparer immédiatement.

## 5. Rôle d'Antigravity
- **Antigravity** : images et illustrations (`frontend/public/images/...`).
- Ne pas modifier directement dans `frontend/content/` (Claude s'occupe de relier les images via `scripts/story_images.py`).
- Si Antigravity doit exceptionnellement intervenir sur du code en dehors de son rôle habituel, le préciser explicitement dans le message de commit.
