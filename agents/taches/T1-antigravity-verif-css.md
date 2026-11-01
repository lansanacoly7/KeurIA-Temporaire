# T1 — Antigravity — Vérifier à l'écran que le découpage des CSS n'a rien changé

(Issue GitHub n° 1, copie ici.)

Les feuilles `home.css`, `_scolaire/scolaire.css`, `dashboard/kids-shared.css`, `dashboard/parcours79/parcours79.css` ont été découpées en morceaux (commit `cb244ac`). Le CSS final doit être identique, mais personne n'a comparé le rendu.

**À faire** : lance le site (`node node_modules\next\dist\bin\next dev -p 3100` dans ton clone, avec Django du dossier principal sur 8001) et compare AVANT (commit `6da605f`) / APRÈS (`cb244ac` ou plus récent), en bureau (1440 px) et mobile (390 px), sur `/`, `/connexion`, `/ecole`, `/enseignant`, `/dashboard/modules`, une leçon du parcours 7-9 (écran d'histoire + défi de Palou). Cherche toute différence (marges, couleurs, polices, éléments décalés ou manquants).

**Périmètre** : `docs/verif-visuelle/` (captures), `docs/VERIF_VISUELLE_CSS.md` ; si une différence vient d'un morceau CSS, corrige dans ce morceau (`frontend/app/**/styles/`).
**Attendu** : rapport `agents/rapports/T1-antigravity.md` (pages comparées, captures, différences ou « aucune »). Commits `[antigravity] ... (T1)`.