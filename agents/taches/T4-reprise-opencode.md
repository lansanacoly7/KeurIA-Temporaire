# T4 (reprise) — OpenCode — rendre « Élèves bloqués » réellement fonctionnel

Lis d'abord `agents/rapports/T4-revue-claude.md` (6 remarques). À faire, dans l'ordre :

1. La route existe déjà (GET /api/enseignant/classes/<id>/blocages) : **garde-la**. Réduis la réponse à **un seul nom par champ**, ceux que le frontend utilise : {classroom, studentCount, lessons: [{lessonId, lessonTitle, moduleTitle, completed, total, averageStars, difficult: [élèves], stopped: [élèves]}], message} ; retire alias et doublons.
2. « À l'arrêt » : l'élève (aucune leçon terminée depuis 7 jours, il lui en reste) apparaît **une seule fois**, sur sa **prochaine leçon non terminée**.
3. « En difficulté » : leçon terminée avec 1 étoile (garde), ou — si les données le permettent — jamais reprise après un échec ; sinon dis-le dans le rapport.
4. Tests dans `backend/apps/scolaire/tests/` : isolation (autre enseignant → 403 ; élève d'une autre classe jamais listé), « à l'arrêt » une seule fois, moyenne d'étoiles, classe sans élève, message « Aucun élève n'est bloqué ». Frontend : adapter `enseignantApi.ts` / `TeacherClassView.tsx` aux noms conservés.
5. `python manage.py spectacular --file schema.yml` puis commiter `backend/schema.yml` (la route doit y figurer).
5. **Vérifie toi-même avant d'affirmer** : lance le site (port 3100), ouvre une classe de l'école démo et constate que la section s'affiche sans erreur 404 ; joins une capture dans `agents/rapports/T4-captures/`.

Rapport : `agents/rapports/T4-opencode.md` mis à jour avec les **vrais numéros de commit**. Commits `[opencode] ... (T4)`.
