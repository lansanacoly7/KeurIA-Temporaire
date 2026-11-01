# Revue Claude — T9 (cahier de classe élève) et T10 (séances, annonces, parcours) — OpenCode

**Verdict : validés.** Revue faite sur le sommet de `Dev_Lansana_Coly` (`a231c5b`), arbre exporté à part.

## Vérifié
| Contrôle | Résultat |
|---|---|
| pytest backend | 788 passed |
| ruff | All checks passed |
| makemigrations --check | No changes detected |
| tsc | 0 erreur |
| tests frontend (`node --test`) | 214 / 214 |
| Portée | T9 : frontend uniquement ; T10 : backend limité à la restauration de « blocages » + `trackOverride` dans la fiche élève |

Rapports honnêtes et vérifiés à l'écran (captures, mesures des cibles 56 px, non-régression famille). Bonne prise : la vue et la route `enseignant/classes/<pk>/blocages` avaient été supprimées par erreur dans mon commit T8 (`d3837db`) ; restaurées avec leurs tests.

Contrôle indépendant côté enseignant (pendant le tournage de la vidéo guidée, 16/10) : page classe avec « Séance de classe » et « Annonces et sondages » fonctionnelle, saisie du titre, durées prédéfinies, bascule mot/sondage.

## Manques signalés par OpenCode, confirmés (→ T14)
1. **Parcours de l'élève figé à 7-9** dans « Mon parcours » : l'exception posée par l'enseignant (`track_override`) n'est pas appliquée côté élève.
2. **Classement de classe absent** : la vue « Ma classe » utilise le classement général de l'école ; la décision du 15/10 est « classement de la classe, prénom seul, avec l'accord de l'école (règle `leaderboard`) ».
3. Pas de liste des camarades côté élève (acceptable : la carte classe suffit pour l'instant).

## Remarques
- Données de démonstration posées localement par OpenCode (mots de passe `Demo-1234` sur deux élèves, séance, annonces) : base locale seulement, rien dans le dépôt. OK.
- Turbopack instable sur ce chemin : `next dev --webpack`. Connu.
