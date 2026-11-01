# T7 — OpenCode (code) + Antigravity (design, vérification à l'écran) — Interface « cahier de classe » de l'élève d'école

Contexte : `docs/ECOLE_ELEVE_CONCEPTION.md`. Backend prêt : `GET /api/eleve/restrictions` (réglage effectif + `by` = qui a posé la restriction + `messages` en français + `access.allowedNow`). Un élève d'école (`isSchoolStudent`) utilise aujourd'hui le tableau de bord d'un enfant de famille + l'onglet « Devoirs ».

## À faire (à partir de T6 terminée ; OpenCode code, Antigravity propose le design et vérifie à l'écran)

1. **Accueil « cahier de classe »** pour l'élève d'école (remplace l'aventure de l'accueil famille) : « Aujourd'hui en classe » (la leçon ou le devoir à faire en premier), « Mes devoirs » (à rendre, dates), « Mon parcours » (seulement si `free_path.allowed`), « Ma classe » (classement : prénoms seuls, seulement si `leaderboard.allowed`).
2. **Bandeau de règles** : afficher les `messages` du serveur (« Les jeux : coupé par ton enseignant ») ; jamais de blocage muet.
3. **Respect des règles dans l'interface** : masquer ou verrouiller Palou, jeux, Scratch, parcours libre selon `restrictions`; si `access.allowedNow` est faux : écran « Ce n'est pas l'heure » (qui a fixé les horaires), sans accès au contenu.
4. Le serveur reste la référence (Palou est déjà refusé côté serveur) : l'interface n'est qu'un miroir.

## Critères
- Tests de la logique d'affichage dans `frontend/tests/` ; tsc, lint, tests `NODE_ENV=test`, CI verte.
- Antigravity : captures 390 px et 1440 px de chaque écran dans `agents/rapports/T7-captures/`, et une revue d'accessibilité (contrastes, cibles tactiles 48 px).
- Périmètre : `frontend/app/dashboard/` (fichiers propres à l'élève d'école), `frontend/tests/`. Aucun changement backend sans rapport.
Commits `[opencode] ... (T7)` / `[antigravity] ... (T7)`. Rapports : `agents/rapports/T7-opencode.md`, `T7-antigravity.md`.
