# T15 — OpenCode — corriger les écarts relevés par Antigravity (T13) — après T12 et T14

Lis `agents/rapports/T13-antigravity.md` (captures dans `agents/rapports/T13-captures/`) et `agents/rapports/T13-revue-claude.md`.

1. **Page classe enseignant à 390 px** (`/enseignant/classes/<id>`) : `scrollWidth` = 768 au lieu de 390. Le tableau des élèves (`DataTable` dans `TeacherClassView.tsx`) doit défiler **dans son cadre** sur petit écran (conteneur `overflow-x: auto`, `-webkit-overflow-scrolling: touch`), sans que la page déborde. Vérifier aussi les autres `DataTable` de l'espace enseignant et de l'espace école (fiche élève, devoirs, enseignants, élèves) : aucune page ne doit dépasser la largeur de l'écran à 390 px.
2. **Options de sondage côté élève** (`frontend/app/dashboard/cahier/`) : cibles tactiles de **56 px minimum** (règle des maquettes pour les 6-9 ans), état choisi bien visible.
3. **« Rejoindre la séance »** : gros bouton principal (fond citron `#D8F05B`, texte vert foncé, cible ≥ 56 px), comme la maquette `docs/maquettes/eleve-ecole/01-aujourdhui.html`.
4. **Superpositions plein écran sous zoom** (relevé dans ton rapport T12, confirmé dans `T12-revue-claude.md`) : les `position: fixed` en `100vw/100vh` (dictionnaire, lecteur de leçon, animations badge et niveau) ne couvrent que 85 % de l'écran entre 1025 et 1599 px. Même correctif que T12 (`/ var(--app-zoom, 1)`), et étendre `zoom-page-height.test.mjs` à ces `height`.

5. **Police du tableau de bord hors 7-9** (relevé en T14, capture `agents/rapports/T14-captures/16-comparaison-enfant-famille-10-12-1280.png`) : en 10-12 et 13-15 (enfant de famille comme élève d'école), le texte s'affiche en Times New Roman. `frontend/app/globals.css` déclare `font-family: var(--font-geist), Arial, sans-serif` mais `--font-geist` n'est défini nulle part : la déclaration entière est ignorée. Donner une vraie police (celle du design system, `--kia-font` de `design/tokens.css`), vérifier à l'écran en 10-12 et 13-15 (famille et école), sans toucher au thème 7-9.

Pars du sommet de `Dev_Lansana_Coly` **après le commit T14 de Claude** : `frontend/app/dashboard/cahier/` (MaClasseView, cahier.css, cahierLogic, eleveApi) a changé.

Preuves attendues : `scrollWidth` mesuré à 390/768/1280 sur chaque page touchée + captures avant/après dans `agents/rapports/T15-captures/`, un test qui garde la règle « pas de tableau sans conteneur défilant », tous les tests verts. Commits signés OpenCode, `(T15)`, push sur `Dev_Lansana_Coly` uniquement. Rapport `agents/rapports/T15-opencode.md`.
