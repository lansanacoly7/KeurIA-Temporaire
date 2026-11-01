# Revue Claude — T12 (bande vide sous les pages zoomées + écrans de règles) — OpenCode

**Verdict : validé.** Revue faite sur le sommet de `Dev_Lansana_Coly` (`3b15419`), arbre exporté à part (`KerIA-agents/claude-review`), avant toute modification T14.

## Vérifié
| Contrôle | Résultat |
|---|---|
| pytest backend (sommet, sans T14) | `788 passed` en 7 min 14 s |
| tsc | `tsc exit 0` |
| tests frontend (`NODE_ENV=test node --test tests/*.test.mjs`) | `# tests 216 / # pass 216 / # fail 0` (dont les 2 nouveaux de `zoom-page-height.test.mjs`) |
| Portée | frontend seulement ; `backend/apps/scolaire/restrictions.py` intact (la logique des règles n'a pas bougé) |
| Test anti-régression | `zoom-page-height.test.mjs` refuse tout `min-height: 100vh/100dvh` nu dans `app/` et accepte `calc(100vh / var(--app-zoom, 1))` ; preuve négative faite par OpenCode (sonde `.probe { min-height: 100vh }` → `not ok 1`) |
| Débordement 390 px de `/ecole/regles` | `contain: inline-size` sur le cadre du tableau des créneaux (`09-regles-de-classe-ecrans-propres.css` l. 47 et 52) |
| Écran à l'usage | pendant T14, l'interrupteur « Le classement » de `/ecole/regles` a été basculé puis enregistré deux fois depuis un vrai navigateur (fermer puis rouvrir) : « Enregistré avec succès », effet immédiat côté élève (voir `T14-claude.md`) |

Le rapport est honnête : il dit où la bande n'a pas pu être montrée (pages déjà plus longues que l'écran) et donne la preuve par le calcul (847,059 px = 720 / 0,85).

## Signalés par OpenCode, confirmés, hors périmètre (donnés dans T15)
1. **Fiche de classe enseignant à 390 px** (déjà T15 § 1, aussi relevé par Antigravity en T13) : le tableau `.ec-table` (liste des élèves) élargit la page à 768 px. Même mécanique que le correctif T12 (`contain: inline-size` ou `overflow` sur le cadre).
2. **Superpositions plein écran** (ajouté en T15 § 4) (`position: fixed` en `100vw/100vh` : dictionnaire, lecteur de leçon, animations badge et niveau) : réduites aussi par le zoom de 85 %. Même correctif (`/ var(--app-zoom, 1)`), et étendre le test aux `height` de superposition.

## Remarques
- `contain: inline-size` et `:has()` : Chrome 105+, Safari 16+, Firefox 111+. Repli acceptable (teinte neutre ; sans `contain`, l'ancien débordement peut revenir sur un vieux navigateur).
- Les 12 captures sont dans `agents/rapports/T12-captures/`.
