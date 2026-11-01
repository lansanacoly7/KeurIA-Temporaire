# T6 (reprise) — OpenCode — finir les écrans de règles

Lis `agents/rapports/T6-revue-claude.md` (5 remarques). À faire :
1. Remplace l'éditeur JSON des créneaux par un vrai éditeur : par créneau, sept cases de jours (Lun à Dim), « de » et « à » (champs heure), supprimer ; bouton « Ajouter un créneau » ; plusieurs créneaux possibles. Convertir vers/depuis `windows` (`days` 0 = lundi, `start`/`end` « HH:MM »).
2. Écris l'encart « Ce que voit l'élève » en **phrases** (fonction pure, testable) : une ligne par réglage qui restreint, avec « coupé par … » (école / ton enseignant), horaires lisibles (« lundi à vendredi, de 8 h à 16 h ») et temps par jour. Si rien n'est restreint : « Tout est ouvert ».
3. Validations avant envoi (début < fin, au moins un jour, minutes 5 à 600) avec messages clairs ; afficher aussi l'erreur du serveur.
4. Tests dans `frontend/tests/` : conversion des créneaux (aller-retour), verrouillage selon `schoolRules`, phrases d'aperçu.
5. tsc, lint (0 erreur), tests `NODE_ENV=test`, CI verte ; capture de chaque écran dans `agents/rapports/T6-captures/` ; `agents/rapports/T6-opencode.md` avec les vrais numéros de commit.
Commits `[opencode] ... (T6)`. Fais d'abord T4 (reprise), puis T6 (reprise).
