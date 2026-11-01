# T5 — OpenCode — Supprimer le CSS et le code morts de la vue « Carte » et du carnet

(Issue GitHub n° 5, copie complète ici.)

## Contexte

La vue « Carte » (sentier) et le carnet ont été retirés du code, mais leurs règles CSS restent dans les feuilles. Les feuilles sont maintenant découpées en morceaux (`frontend/app/dashboard/parcours79/styles/01-…03-….css`).

## Critères d'acceptation

Règles candidates : `.p79-sea`, `.p79-stop*`, `.p79-walker*`, `.p79-trail-*`, `.p79-route*`, `.p79-isle*`, `.p79-medal*` (si inutilisées), `.p79-view-toggle`, `.p79-hero*`, `.p79-sheet*` et `.p79-step*` **seulement si** plus aucun composant ne s'en sert, ainsi que les anciennes règles de la page publique d'école dans `frontend/app/globals.css` (`.school-space`, `.school-hero*`, `.school-tracks*`, `.school-track-grid*`, `.school-login`, `.school-not-found*` : remplacées par `frontend/app/school/school-space.css`, classes `ss-*`).

Pour **chaque** règle supprimée : prouver par recherche (`grep` dans `frontend/app` et `frontend/tests`) qu'aucune classe n'est utilisée. Garder tout ce qui sert encore (archipel `.p79-ar-*`, modales, album, lecteur de leçon). Ne pas supprimer une règle dont tu n'as pas la preuve.

Le rendu ne doit pas changer : compare l'archipel et le lecteur de leçon avant/après (captures, dossier `agents/rapports/T5-captures/`).

## Périmètre (fichiers autorisés)

`frontend/app/dashboard/parcours79/styles/`, `frontend/app/globals.css` (uniquement les règles `school-*` listées), `frontend/tests/css-split.test.mjs` si besoin. Rien d'autre. Branche `Dev_Lansana_Coly`, dossier `KerIA-agents/opencode/`.

## Commandes à lancer

```
cd frontend
node node_modules\typescript\bin\tsc --noEmit
node node_modules\eslint\bin\eslint.js .
$env:NODE_ENV="test"; node --test tests/*.test.mjs
```
Les tests `css-split` et `parcours79-player` doivent rester verts (morceaux ≤ 1000 lignes, accolades équilibrées).

## Attendu à la fin

Rapport `agents/rapports/T5-opencode.md` avec, pour chaque règle supprimée, la commande de recherche et son résultat (0 occurrence). Commits `[opencode] ... (T5)` signés.
