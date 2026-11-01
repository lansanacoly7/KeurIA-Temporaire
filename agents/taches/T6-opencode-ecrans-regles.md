# T6 — OpenCode — Écrans « Règles de l'école » (direction) et « Règles de la classe » (enseignant)

Contexte : `docs/ECOLE_ELEVE_CONCEPTION.md` (lis-la en entier). Le backend est prêt (étape 1, commit signé [claude]) :
- `GET/PUT /api/ecole/restrictions` (direction) : `{rules, catalogue}` / body `{rules: {...}}`.
- `GET/PUT /api/enseignant/classes/<id>/restrictions` : `{rules, schoolRules, catalogue}` ; le PUT renvoie 400 `{error}` si la classe assouplit l'école.
- Réglages : `palou`, `games`, `scratch`, `free_path`, `leaderboard` (booléens, `false` = interdit ; absent = pas de restriction à ce niveau), `daily_limit_minutes` (5 à 600), `windows` (liste `{days:[0..6], start:"HH:MM", end:"HH:MM"}` = créneaux **autorisés**, 0 = lundi).

## À faire

**Direction** (`/ecole`, nouvelle page « Règles de l'école ») : un interrupteur par réglage booléen (libellés du `catalogue`), un champ « minutes par jour », un éditeur de créneaux (jours + heures), bouton Enregistrer, message de succès/erreur (afficher `error` du serveur tel quel).
**Enseignant** (`/enseignant/classes/[id]`, nouvelle section « Règles de la classe ») : mêmes contrôles, mais **ce que l'école interdit est affiché verrouillé** (cadenas, « Interdit par l'école ») et impossible à activer ; créneaux limités à ceux de l'école. Un encart **« Ce que voit l'élève »** (aperçu en phrases : « Palou : coupé par ton enseignant », « Horaires : lundi–vendredi 8 h–16 h »).
Style : réutiliser les composants et classes existants des espaces école/enseignant (`frontend/app/_scolaire/`, `frontend/app/enseignant/_components/`), ton « cahier de classe », clair pour un adulte non technique.

## Critères
- Tests frontend de la logique (verrouillage, conversion des créneaux, aperçu en phrases) dans `frontend/tests/`.
- Aucun changement backend sans me le dire (rapport) ; si un besoin manque, décris-le dans le rapport.
- tsc, lint (0 erreur), tests `NODE_ENV=test`, CI verte.

## Périmètre
`frontend/app/ecole/`, `frontend/app/enseignant/`, `frontend/app/_scolaire/` (nouveaux fichiers de préférence), `frontend/tests/`. Dossier `KerIA-agents/opencode/`, branche `Dev_Lansana_Coly`, commits `[opencode] ... (T6)`.
Rapport : `agents/rapports/T6-opencode.md`.
