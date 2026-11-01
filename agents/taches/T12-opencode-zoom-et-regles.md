# T12 — OpenCode — bande vide sous les pages (zoom 85 %) + écrans de règles à mettre au propre

Ne pas attendre la revue de T9/T10 (Claude la fait en parallèle) : commence tout de suite.

## 1. Bug : bande vide en bas des pages courtes sur ordinateur portable
`frontend/app/responsive.css` réduit tout le site avec `body { zoom: 0.85 }` entre 1025 et 1599 px (0.95 au-delà). Les conteneurs de page qui ont `min-height: 100vh` (ou `100dvh`) ne font alors plus que 85 % de l'écran : une **bande beige** apparaît sous le contenu quand la page est courte.
- Reproduire : fenêtre 1280×720, `/ecole/regles`, `/enseignant/classement`, `/dashboard` (compte parent) → bande à partir de y ≈ 612.
- Corriger pour **tous** les espaces (école `.ec-app`, enseignant, parent/AdultLayout, élève) : la hauteur minimale doit tenir compte du zoom (par ex. `min-height: calc(100vh / var(--app-zoom, 1))`), sans casser le mobile (≤ 1024 px, zoom 1) ni les réglages Compact/Standard/Confort (`html[data-display-zoom]`).
- Ajouter un test `frontend/tests/` qui échoue si un conteneur de page garde un `100vh` non compensé dans la plage zoomée.
- Captures avant/après en 1280×720 et 1440×900 dans `agents/rapports/T12-captures/`.

## 2. Écrans « Règles de l'école » et « Règles de la classe »
`/ecole/regles` (et la version enseignant) ressemble à un formulaire brut : cases à cocher nues, champ minutes minuscule. Mets-le au niveau du reste de l'espace école :
- cartes `ec-card`, interrupteurs comme ailleurs dans l'application, libellés clairs, bouton Enregistrer cohérent ;
- s'inspirer de la maquette `docs/maquettes/eleve-ecole/11-regles-classe.html` (Antigravity) ;
- responsive : 390 px sans défilement horizontal (`scrollWidth` = 390 mesuré), le tableau des créneaux défile dans son cadre.
- Ne change pas l'API ni les règles métier (backend `apps/scolaire/restrictions.py` intouché).

## Règles
Tests verts (`NODE_ENV=test node --test`, tsc, eslint, pytest si backend touché). Commits signés `--author="OpenCode <opencode@keuria.local>"`, `[opencode] … (T12)`, ligne `Agent: opencode`, push sur `Dev_Lansana_Coly` uniquement. Rapport `agents/rapports/T12-opencode.md` (modèle `MODELE.md`).
