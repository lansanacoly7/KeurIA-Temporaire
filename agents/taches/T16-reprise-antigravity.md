# T16-reprise — Antigravity — refaire l'audit des espaces adultes, avec des preuves vérifiables

Lis d'abord `agents/rapports/T16-revue-claude.md` : 24 captures vides, 13 groupes de captures identiques, une fiche classe capturée en squelette. Le rapport T16 est remplacé par celui-ci.

## Méthode obligatoire (pour chaque écran et chaque largeur 390, 768, 1280, 1440)
1. **Un compte par rôle**, dans un contexte de navigateur séparé : parent pour les écrans 01-12, `demo.ecole@keuria.test` pour 13-23, une enseignante (`khady.faye@example.com`) pour 24-33. Pas de session partagée entre rôles.
2. **Vérifier l'adresse finale** après chargement : `location.pathname` doit être celle de l'écran (sinon : écran en échec, noté comme tel).
3. **Attendre le vrai contenu** : un texte attendu propre à l'écran (titre `h1`/`h2`, par exemple « Règles de l'école », « Classes », le nom d'une classe) est présent, et plus aucun squelette ni « Chargement… ». Délai maximal 60 s, sinon écran en échec.
4. Mesurer `document.documentElement.scrollWidth`, `innerWidth`, et lister les éléments plus larges que l'écran.
5. Capture **limitée à l'écran visible** (`Page.captureScreenshot` sans `captureBeyondViewport`), plus une capture pleine page si utile.
6. **Contrôle anti-doublon** : dans `metrics.json`, pour chaque capture, le texte attendu trouvé, `pathname`, la taille du fichier et son empreinte SHA-1. Deux écrans différents avec la même empreinte = erreur à corriger avant d'écrire le rapport.
7. Regarder **chaque** capture avant d'écrire une conclusion.

## À re-mesurer en priorité
- `/enseignant/classes/<id>` à 390 px **avec le tableau des élèves affiché** : `scrollWidth` réel (T13 mesurait 768 ; T15 ne l'a pas encore corrigé).
- Les modales « Nouvelle classe », « Relier mon enfant », étapes 1 à 3 de l'inscription d'un enfant : chaque étape réellement atteinte.
- Bande vide à 1280 × 800 : `appBottom` contre `innerHeight`, comme T12.
- Cibles tactiles < 44 px : liste par écran, avec texte et taille.

## Livrables
- `agents/rapports/T16-captures/` remplacé (les anciennes captures sont supprimées dans le même commit), `metrics.json` complet.
- `agents/rapports/T16-antigravity.md` réécrit : tableau des 33 écrans × 4 largeurs avec `pathname`, texte attendu trouvé (oui/non) et `scrollWidth` ; liste des écrans en échec ; défauts classés avec captures.
- Aucun code applicatif modifié. Commits signés `Antigravity <antigravity@keuria.local>`, `[antigravity] … (T16)`, `Agent: antigravity`, push sur `Dev_Lansana_Coly` uniquement.
