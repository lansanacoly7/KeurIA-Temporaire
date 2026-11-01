# T9 — OpenCode (code) + Antigravity (design, vérification à l'écran) — Interface « cahier de classe » (remplace T7)

Lis `docs/ECOLE_ELEVE_CONCEPTION.md` sections 3, 4 et 8 (menu, annonces, séance, parcours). Backend : `GET /api/eleve/restrictions` (prêt) ; T8 (séances, annonces/sondages, parcours) est **prêt** : routes en section 9 de `docs/ECOLE_ELEVE_CONCEPTION.md` (GET /api/eleve/aujourdhui, POST /api/eleve/annonces/<id>/reponse). Pars des **maquettes de T11** (`docs/maquettes/eleve-ecole/`). Ordre conseillé : le menu réduit, la page « Aujourd'hui » (devoirs, règles), « Mes devoirs », « Mon parcours », « Ma classe », « Mes étoiles », « Libre » et le bandeau de règles.

- Un élève d'école (`isSchoolStudent`) n'a **plus** le menu famille : seulement Aujourd'hui, Mes devoirs, Mon parcours, Ma classe, Mes étoiles, Libre (selon `restrictions`). Pas de messagerie familiale ni de réglages parent.
- Ton « cahier de classe » (Antigravity propose le design : couleurs de l'école, page d'accueil lisible pour un enfant de 6 à 9 ans, grands boutons).
- Les règles du serveur font foi ; l'interface les reflète (masquer/verrouiller, écran « Ce n'est pas l'heure »).
- Tests de la logique d'affichage ; tsc, lint, tests `NODE_ENV=test`, CI verte ; captures 390 px et 1440 px dans `agents/rapports/T9-captures/`.
Périmètre : `frontend/app/dashboard/` (fichiers propres à l'élève d'école), `frontend/tests/`. Dossier `KerIA-agents/<agent>/`. Rapports `agents/rapports/T9-opencode.md` / `T9-antigravity.md`. Fais T4 et T6 (reprises) d'abord.
