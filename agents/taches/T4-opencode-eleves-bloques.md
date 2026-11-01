# T4 — OpenCode — Tableau de bord enseignant : « Élèves bloqués » par leçon

(Issue GitHub n° 4, copie complète ici : tu n'as pas besoin de GitHub.)

## Contexte

L'espace enseignant (`/enseignant`) a déjà classes, analytiques, devoirs, programme. Il manque : **quels élèves bloquent, sur quelle leçon**.

## Critères d'acceptation

**Backend** — route `GET /api/enseignant/classes/<id>/blocages`, réservée à l'enseignant de la classe. Pour chaque leçon du parcours de la classe, renvoyer :
- le nombre d'élèves ayant terminé la leçon ;
- la moyenne d'étoiles ;
- les élèves **« en difficulté »** : leçon terminée avec 1 étoile, ou jamais reprise après un échec ;
- les élèves **« à l'arrêt »** : aucune leçon terminée depuis 7 jours alors qu'il en reste.
Données existantes : modèle `Progress` (user, lesson_id, stars, score, completed_at). Suivre le style de `class_analytics` (`backend/apps/scolaire/services/enseignant.py`) et les vues de `views.py`.

**Frontend** — une section « Élèves bloqués » dans `frontend/app/enseignant/classes/[id]/` : tableau par leçon (terminés / en difficulté / à l'arrêt) et liste nominative cliquable vers la fiche élève (`/enseignant/eleves/[id]`). Aucune donnée : message encourageant (« Aucun élève n'est bloqué »).

**Exigences**
- **Isolation stricte** : un enseignant ne voit que ses classes. Test dédié (autre enseignant → 403/404).
- Tests backend (pytest) et frontend.
- `python manage.py spectacular --file schema.yml` puis commiter `backend/schema.yml` (la CI vérifie sa fraîcheur).
- Aucune donnée sensible nouvelle ; pas de mot de passe ni d'e-mail dans la réponse.

## Périmètre (fichiers autorisés)

`backend/apps/scolaire/` (views.py, urls.py, services/enseignant.py, tests/), `backend/schema.yml`, `frontend/app/enseignant/`, `frontend/tests/`. **Rien d'autre.** Pas de `frontend/content/`. Branche `Dev_Lansana_Coly`, dossier `KerIA-agents/opencode/`.

## Commandes à lancer (depuis ton clone)

```
cd backend
..\..\..\KerIA\venv\Scripts\python.exe -m pytest apps/scolaire -q
..\..\..\KerIA\venv\Scripts\python.exe -m pytest -q
..\..\..\KerIA\venv\Scripts\python.exe -m ruff check .
..\..\..\KerIA\venv\Scripts\python.exe manage.py spectacular --file schema.yml
..\..\..\KerIA\venv\Scripts\python.exe manage.py check_parcours79
cd ..\frontend
node node_modules\typescript\bin\tsc --noEmit
node node_modules\eslint\bin\eslint.js app/enseignant
$env:NODE_ENV="test"; node --test tests/*.test.mjs
```

## Attendu à la fin

Tout vert, puis rapport `agents/rapports/T4-opencode.md` (modèle : `agents/rapports/MODELE.md`) poussé avec le code. Commits : `[opencode] ... (T4)`, `--author="OpenCode <opencode@keuria.local>"`, ligne `Agent: opencode`.
