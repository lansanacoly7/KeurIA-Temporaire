# Tâches et rapports des agents (sans accès à l'API GitHub)

Certains agents (OpenCode, peut-être Antigravity) ne peuvent pas lire les issues GitHub ni y écrire. Le lien passe donc **par des fichiers du dépôt** :

| Dossier | Contenu |
|---|---|
| `agents/taches/` | Une tâche = un fichier `T<n>-<agent>-<sujet>.md`, complet (critères, fichiers autorisés, commandes, vérifications). Écrit par Claude. |
| `agents/rapports/` | Le compte rendu de l'agent : `T<n>-<agent>.md` (modèle : `agents/rapports/MODELE.md`). Écrit par l'agent. |

## Cycle

1. Claude écrit `agents/taches/T<n>-....md` (et l'issue GitHub correspondante, pour mémoire). L'agent récupère la tâche avec `git fetch` puis en lisant le fichier.
2. L'agent travaille dans **son clone** (`KerIA-agents/<agent>/`), branche `Dev_Lansana_Coly`, commits signés `[agent] ... (T<n>)` (voir `docs/REGLES_AGENTS.md`).
3. À la fin, l'agent écrit `agents/rapports/T<n>-<agent>.md` (commits, commandes lancées, résultats, points d'attention), le commite et le pousse avec son code.
4. Claude lit le rapport, relit le diff (`git log --format="%h %an %s"`), relance les contrôles, puis écrit sa décision dans `agents/rapports/T<n>-revue-claude.md` : **validé** ou **à reprendre** (avec la liste des remarques).

L'agent n'a pas besoin de GitHub, de jeton ni de commentaire d'issue : tout est dans les commits et ces deux dossiers.

## Rappels d'environnement (clones `KerIA-agents/<agent>/`)

- `frontend/node_modules` est un lien vers celui du dossier principal ; ne lance pas `npm ci` (ça casserait le lien). `backend/.env` et `frontend/.env.local` sont déjà copiés (jamais commités).
- Python : `..\..\..\KerIA\venv\Scripts\python.exe` depuis `backend/`. Node : `"C:\Program Files\nodejs\node.exe"` (pas dans le PATH).
- Tests frontend : définir `NODE_ENV=test` puis `node --test tests/*.test.mjs`. Typecheck : `node node_modules\typescript\bin\tsc --noEmit`. Lint : `node node_modules\eslint\bin\eslint.js .`.
- Ne lance pas `next dev` sur le port 3000 (le dossier principal l'utilise) : `node node_modules\next\dist\bin\next dev -p 3100`.
