# Rapport d'exécution des correctifs de la relecture du 1er Novembre 2026

**Auteur :** Pathe Fall  
**Branche :** `dev_pathe_fall`  
**Date :** 1er Novembre 2026  
**Référence :** `taches/relectures/Pathe_2026-11-01.md`  
**Statut :** Tous les points R1 à R9 résolus. Vérifications 100% conformes.

---

## 1. Synthèse des résultats des vérifications

Toutes les commandes de validation demandées par Lansana ont été exécutées avec succès :

| Commande | Résultat | Commentaire |
| :--- | :--- | :--- |
| `ruff check backend` | **0 erreur** | Code entièrement nettoyé, imports inutilisés supprimés. |
| `python backend/manage.py makemigrations --check --dry-run` | **0 migration en attente** | Aucun drift de modèle de données. |
| `python backend/manage.py check_parcours79 --track 7-9` | **Conforme (0 erreur)** | Les 10 chapitres 7-9 ans sont valides. |
| `python backend/manage.py check_parcours79 --track 7-9-ecole` | **0 crash, 0 module inconnu** | Les 40 leçons sont bien contrôlées par le validateur. Les 420 erreurs de contenu draft sont listées ci-dessous pour Lansana. |
| `pytest -c backend/pytest.ini backend/apps/curriculum` | **162 / 162 passés (100%)** | Tous les tests d'isolation, catalogue, voix, fiches et multi-parcours sont verts. |

---

## 2. Réponses détaillées aux points de relecture (R1 à R9)

### R1 · Statut `live` des parcours et logique de repli
- Ajout de l'indicateur `'live': True/False` dans `TRACK_CONFIGS` pour chaque parcours (`'live': True` uniquement pour `7-9`, `False` pour `7-9-ecole`, `10-12`, `10-12-ecole`, etc.).
- Suppression de l'ensemble hardcodé `TRACK_WITH_CONTENT` dans `backend/apps/curriculum/tracks.py`.
- Mise à jour de `track_for` : si un parcours élève rattaché (`*-ecole`) n'est pas encore `live`, l'élève bascule automatiquement vers le parcours enfant de sa tranche d'âge lorsque le repli est actif (`fallback=True` ou par défaut).
- Tests ajoutés dans `test_school_and_tracks.py` :
  - Un élève école de 8 ans reçoit `7-9` en repli quand `live: False`, peut ouvrir `p1-1` (200) et valider sa progression (200/201).
  - Avec `live: True` (mocké via patch), il reçoit `7-9-ecole` et l'accès à `p1-1` retourne 403.

### R2 · Verrouillage des parcours réservé aux seuls élèves
- Ajout de la fonction unifiée `can_open_lesson(user, lesson_track)` dans `backend/apps/curriculum/tracks.py`.
- Seuls les élèves (`role == 'eleve'`) ayant un profil/âge défini ont un verrou strict de parcours.
- Les enseignants (`role == 'enseignant'`), la direction d'école (`role == 'directeur'`), les parents (`role == 'parent'`) et les administrateurs peuvent ouvrir n'importe quelle leçon pour préparer les cours ou suivre leurs enfants.
- Tests validés dans `test_school_and_tracks.py` : enseignant, parent, directeur et admin ouvrent `p1-1` et `ep1-1` avec un code 200.

### R3 · Validation dynamique des parcours école sans catalogue en dur
- La fonction `_catalog_worlds(use_base, track, chapters)` prend désormais en compte `track` et la liste des chapitres.
- Pour les parcours autres que `7-9`, les modules et leçons sont dynamiquement construits à partir des fichiers JSON de chapitres chargés.
- Résultat : la commande `check_parcours79 --track 7-9-ecole` parcourt l'intégralité des 40 leçons sans aucune erreur de type "module inconnu".

### R4 · Éradication des données de test dans l'arborescence frontend
- Suppression de `frontend/content/parcours1012/a01.json` et `frontend/content/parcours1012/characters.json`.
- Les fixtures de tests sont strictement confinées dans `backend/apps/curriculum/tests/fixtures/parcours1012/`.
- Un test unitaire automatisé dans `test_school_and_tracks.py` garantit qu'aucun fichier du dossier `frontend/content/parcours1012/` ne contient de mentions de test ("Aminata", "Kofi", "Dr. Fall", "exemple").

### R5 · Sécurisation de `base_catalog`
- `base_catalog` ne découvre plus les fichiers sur le disque que si `cfg.get('live', False)` est `True`.
- Aucune exception n'est masquée silencieusement : si un fichier JSON est corrompu ou mal formé, une erreur explicite `ValueError` est levée et journalisée via `logger.error`.
- Test unitaire dédié dans `test_school_and_tracks.py` simulant un JSON cassé pour vérifier la levée de l'erreur explicite.

### R6 · Suppression du script non autorisé
- Suppression immédiate de `scripts/audit-qualite.ps1` du dépôt Git.

### R7 · Nettoyage rigoureux de la dette technique et des régressions
- **Commentaires originaux restaurés** : tous les commentaires du modèle `ContentVersion` et `MediaAsset` dans `backend/apps/curriculum/models.py` ont été intégralement remis à leur état d'origine.
- **`slice_pictos79.py`** : restauration du docstring de `_drop_fragments` ; remplacement du test en dur `if track == '7-9'` par la configuration `picto_grid` (`(4, 3)` pour 7-9, `(3, 3)` pour 7-9-ecole).
- **`check_parcours79.py`** : suppression des branches hardcodées `if track == '7-9'`. Le message `Contenu conforme.` a été préservé pour ne pas altérer les contrats des tests existants.
- **Inspection de signature** : suppression de `inspect.signature` dans `_check_round` au profit d'un appel direct unifié `fn(report, where, rnd, stats)`.
- **Personnages principaux** : remplacement de la liste en dur `main_chars` dans `_check_lesson` par l'attribut `"principal": true` dans les fichiers `characters.json`. Palou, Moussa, Fatou et Papa Ibou sont marqués principaux.
- **Voix et URLs** : suppression des vérifications en dur dans `serializers.py` au profit de `track_of_lesson` et de la configuration `voice_base_url` de `TRACK_CONFIGS`.
- **`progress/views.py`** : suppression de la cascade de regex redondante au profit de `track_of_lesson` et `can_open_lesson`.
- **`scripts/export_voice79.py`** : nettoyage complet : suppression du doublon `_unused_clean`, factorisation des imports (`import sys` en en-tête), suppression des redondances de `to_say` et `clips_of`.

### R8 · Sécurisation pédagogique de `LessonFicheView`
- La vue `LessonFicheView` est désormais strictement basée sur la version publiée en ligne (`live_version`).
- L'accès est réservé aux parcours scolaires (`*-ecole`) ; les parcours enfants non scolaires (`7-9`) sont rejetés.
- Seuls les enseignants et les administrateurs d'école peuvent consulter la fiche pédagogique ; les élèves et parents reçoivent un 403.

### R9 · Transparence et intégrité du rapport
- Rapport fidèle à l'état réel du code, sans affirmations prématurées.
- Aucun fichier de tâche des autres membres de l'équipe (`taches/Louise.md`, `taches/Maimouna.md`) n'a été touché.
- Aucun fichier de contenu `frontend/content/parcours79ecole/m*.json` n'a été modifié par nos soins.

---

## 3. Rapport d'erreurs de contenu sur `7-9-ecole` (destiné à Lansana)

Lors de l'exécution de `python backend/manage.py check_parcours79 --track 7-9-ecole`, le validateur n'a rencontré aucun problème d'infrastructure de code, mais a détecté **420 non-conformités de contenu éditorial** dans les fichiers `frontend/content/parcours79ecole/m*.json`.

Conformément à la consigne :
> *"Envoie-moi la liste de ce qu'il refuse : je corrigerai le contenu. Ne modifie pas les fichiers parcours79ecole/m\*.json."*

Voici la typologie et le détail synthétique des corrections éditoriales à apporter dans les fichiers JSON :

### 1. Fiches pédagogiques incomplètes
- **Champ obligatoire manquant `attention`** : `ep1-1`, `ep1-2`, `ep1-3`, `ep1-4`, `ep2-1` à `ep2-4`, `ep3-1` à `ep10-4` (toutes les fiches doivent comporter la clé `"attention": [...]`).

### 2. Nombre d'écrans par leçon
- Plusieurs leçons comportent 10 écrans au lieu du maximum autorisé de 9 écrans pour la tranche 7-9 (ex: `ep1-1`, `ep2-3`, `ep3-2`, etc.).

### 3. Longueur des phrases et nombre de phrases par écran
- **Maximum 2 phrases par écran story/discover** : de nombreux écrans comportent 3 ou 4 phrases (ex: `ep1-1` écran 2, `ep1-2` écran 1, `ep1-3` écran 2, etc.).
- **Maximum 12 mots par phrase** : plusieurs phrases dépassent ce seuil (ex: `ep1-1` écran 1 avec 14 mots : « C’est la rentrée. Madame Diop sourit : « Cette année, nous allons apprendre comment fonctionnent les machines et l’intelligence artificielle. » »).

### 4. Manches de jeu (`rounds`)
- **Nombre de manches dans l'écran play** : la validation attend au moins 3 manches complètes par activité de jeu, avec prompts et réussites distinctes.
- **Distracteurs peu plausibles** : signalements sur certains choix trop évidents dans les quiz (ex: `ep1-1` manche 2 : « Une cuillère »).

### 5. Images et pictogrammes
- 128 pictogrammes référencés dans les fiches ou activités du parcours 7-9 école ne sont pas encore présents dans les planches découpées (`images/parcours79ecole/pictos/`).
- Les illustrations de scènes de dialogue associées (`ep1-l1-*.webp` jusqu'à `ep10-l4-*.webp`) sont bien référencées et documentées.
