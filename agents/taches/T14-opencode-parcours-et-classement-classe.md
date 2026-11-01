# T14 — OpenCode — parcours imposé par l'enseignant + classement de la classe (à faire juste après T12)

Contexte : revue `agents/rapports/T9-T10-revue-claude.md` (manques 1 et 2) et décisions de `docs/ECOLE_ELEVE_CONCEPTION.md` (§ 6.5, § 8.4).

## 1. « Mon parcours » suit le parcours effectif
Le parcours effectif d'un élève d'école = l'exception de l'enseignant (`StudentProfile.track_override`), sinon le niveau de sa classe (`GET /api/eleve/aujourdhui` renvoie déjà `track`). Aujourd'hui l'onglet reste sur 7-9 (`assignedAge`).
- L'onglet « Mon parcours » (et ce qui dépend de l'âge : carte, modules) doit utiliser ce parcours effectif.
- Test : un élève de CE1 avec exception `10-12` voit le parcours 10-12 ; sans exception, 7-9 ; un enfant de famille n'est pas affecté.

## 2. Classement de la classe (prénom seul, si l'école l'autorise)
- Backend : `GET /api/eleve/classement` → élèves de **sa** classe uniquement, prénom + initiale du nom, XP de la semaine, sa propre ligne marquée ; **403** si la règle effective `leaderboard` est fermée (`restrictions.effective`), avec le « qui » ; jamais d'élèves d'une autre classe ou école. Tests d'isolation (autre classe, autre école, règle fermée, élève de famille → 403).
- Frontend : « Ma classe » utilise cet appel à la place du classement général ; libellé « Classement de la classe ».
- `schema.yml` régénéré.

## Règles
Tests verts (pytest, ruff, `makemigrations --check`, tsc, `node --test`), vérification à l'écran avec captures, commits signés `OpenCode <opencode@keuria.local>`, `[opencode] … (T14)`, `Agent: opencode`, push sur `Dev_Lansana_Coly` uniquement. Rapport `agents/rapports/T14-opencode.md`.
