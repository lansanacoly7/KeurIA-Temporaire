# Tâches de Pathe Fall

**Domaine :** backend (Django) du parcours 10-12 ans
**Phase en cours :** Phase 1

---

## Phase 1 : préparer le serveur du parcours 10-12 ans

**But :** tout le serveur du 10-12 est prêt, pour brancher le contenu (textes, images, voix) dès qu'il arrive.

---

## Relecture du 31 octobre : correctifs à faire avant la fusion

J'ai relu ta branche `dev_pathe_fall` (commit `cc5e0f5c`). Le travail est solide : les quatre vérifications passent, le 7-9 n'est pas cassé, et le blocage entre parcours, la progression 10-12 et les personnages en base fonctionnent. Elle ne peut pas encore être fusionnée : voici ce qu'il faut corriger, dans l'ordre.

### C1 · Repartir de la fiche à jour
Tu as travaillé sur une ancienne version de ce fichier. Celle-ci a changé depuis : 6 parcours, seul Palou a une voix, nouvelle tâche P1-7.
- [x] Récupère `test` dans ta branche (merge ou rebase) et garde **cette** version de `taches/Pathe.md`. C'est le seul fichier en conflit.
- [x] Recoche ensuite ce qui est vraiment fini, d'après la fiche à jour.

### C2 · Les personnages : la structure oui, les noms non
Les personnages du 10-12 seront créés par Lansana. Tu ne les inventes pas.
- [x] Garde le modèle `Character`, l'import de `characters.json`, l'API et la vérification du personnage qui parle (`speaker`).
- [x] Retire Aminata, Kofi et Dr. Fall :
  - de `TRACK_CONFIGS` ;
  - de `characters.json` ;
  - du module d'exemple ;
  - des tests.
- [x] Remplace-les par des personnages d'exemple clairement marqués : `exemple-1` et `exemple-2`, nommés « Personnage exemple 1 » et « Personnage exemple 2 ». Palou reste.
- [x] La liste des personnages d'un parcours ne doit pas être écrite en dur dans le code. Elle doit venir uniquement de `characters.json`, Palou compris. Supprime aussi le cas particulier `dr-fall` (« Dr. Fall ») dans `_check_lesson`.

### C3 · Les jeux : pas de types inventés
La liste des nouveaux jeux du 10-12 n'est pas encore fixée.
- [x] Garde le mécanisme `register_game_validator`.
- [x] Retire `code`, `algo`, `debug`, `prompt` et `branch`, ainsi que leurs tests, de la configuration et du code.
- [x] Décoche la 2ᵉ case de P1-6 : elle sera faite quand la liste sera fixée.

### C4 · Finir P1-2 pour les 6 parcours
- [x] `TRACK_CONFIGS` contient les 6 parcours du tableau de P1-2 : `7-9`, `7-9-ecole`, `10-12`, `10-12-ecole`, `13-15` et `13-15-ecole`.
- [x] `--track` accepte toutes les clés de `TRACK_CONFIGS` (`choices=list(TRACK_CONFIGS)`), pas une liste écrite à la main.
- [x] `import_content79` ne contient plus de `if track == '7-9'` : le même code sert à tous les parcours.
  - Si le 7-9 a besoin d'un traitement à part, par exemple le studio, c'est un réglage dans sa configuration.
- [x] `get_track_config` lève une erreur claire pour une clé inconnue. Aujourd'hui, il renvoie le 7-9 sans prévenir.
- [x] `LESSON_ID_RE` et `IMAGE_NAME` globaux reviennent au 7-9 seul, ou disparaissent au profit de la configuration.
- [x] Le contenu du parcours élève 7-9 existe déjà, dans `frontend/content/parcours79ecole/m01.json … m10.json`. Il est en brouillon, et ses écrans `classe` et `debat` sont nouveaux. Le parcours `7-9-ecole` doit au moins se charger.
  - Ne corrige pas son contenu : signale-moi ce que la vérification refuse.
- [x] Un test vérifie qu'ajouter un parcours ne demande qu'une entrée dans `TRACK_CONFIGS`.

### C5 · Défauts à corriger
- [x] `_check_round` : supprime le `try … except TypeError`. Tous les validateurs prennent la même signature `(report, where, rnd, stats)`.
  - Aujourd'hui, une vraie erreur dans un validateur est cachée, et le validateur tourne deux fois.
- [x] `test_game_validators.py` modifie `TRACK_CONFIGS` et `GAME_VALIDATORS` sans les remettre en état, ce qui fausse les autres tests. Utilise `mock.patch.dict` ou un nettoyage dans `tearDown`.
- [x] Images : une image 10-12 ne doit jamais être cherchée dans le dossier du 7-9.
  - Supprime le repli `or (LESSON_IMAGES_DIR / …)`.
  - Mets le nom attendu (`a01-l1-…webp`) dans la configuration, sans le `m` du 7-9.
- [x] `apps/progress/xp.py` : ne lis l'XP que dans la version **en ligne** (`live_version`), jamais dans une version écartée ou pas encore publiée. Retire le « 20 » par défaut s'il n'y a pas de vraie valeur.
- [x] `leaderboard.py` : un enfant ne doit apparaître que dans **un** classement.
  - C'est `LearnerProfile.age_track` qui décide.
  - `age_group` ne sert que s'il n'y a pas de profil.
  - Ajoute un test avec un profil 10-12 et un `age_group` 7-9.
- [x] Le calcul du parcours d'un utilisateur est copié trois fois (`views.py` deux fois, `progress/views.py`). Mets-le dans **une** fonction partagée, testée.
  - Plus tard, c'est elle qui combinera âge et école : un élève de 11 ans reçoit `10-12-ecole`.
- [x] `scripts/audit-qualite.ps1` n'a rien à voir avec ta phase. Retire-le de cette branche, ou propose-le à part.

### C6b · Le module d'exemple ne prend pas la place du vrai contenu
Le vrai contenu du 10-12 arrive : c'est « Les vacances à Dakar », dans `docs/PARCOURS_10-12_DAKAR.html`. Il sera écrit dans `frontend/content/parcours1012/` par Lansana.
- [x] Déplace ton module d'exemple `a01.json` et son `characters.json` dans un dossier de test, par exemple `backend/apps/curriculum/tests/fixtures/parcours1012/`.
- [x] Tes tests lisent ce dossier avec `--from` ou `content_dir`.
- [x] Tu ne crées et ne modifies rien dans `frontend/content/parcours1012/`.

### C6 · P1-7
- [x] Fais P1-7 : les outils des pictogrammes et des voix par parcours. La tâche est plus bas dans cette fiche.

### Pour rendre
1. Les quatre vérifications passent.
2. Pousse sur `dev_pathe_fall`.
3. Ouvre **une pull request vers `test`**, avec un court résumé : ce qui a changé et comment le tester. Pour l'instant, aucune n'a été ouverte.

### Le point de départ

- **Le parcours 10-12 existe déjà dans la base, mais il est vide.**
  - La tranche `10-12` et ses 12 modules `a1` à `a12` sont déclarés dans `backend/apps/curriculum/data/tracks_data.py`.
- **Le parcours 7-9 sert de modèle.**
  - Son contenu est écrit dans `frontend/content/parcours79/m01.json … m10.json`.
  - Il est vérifié par `backend/apps/curriculum/parcours79.py` (commande `check_parcours79`).
  - Il est ensuite chargé en base par la commande `import_content79`.
- **Les modèles utiles** sont dans `backend/apps/curriculum/models.py` : `AgeTrack`, `Module`, `Lesson`, `LessonContent`, `TeacherGuide`.
- **Le contenu 10-12 n'est pas encore écrit.**
  - Tu travailles avec des leçons d'exemple, marquées clairement comme telles.
  - Elles seront remplacées par les vraies leçons.

### Règles de travail

- **Ta branche :** `dev_pathe_fall`.
  - Ne pousse jamais directement sur `test` ni sur `main`.
  - Quand une tâche est finie, ouvre une pull request vers `test`.
- **Le parcours 7-9 ne doit jamais être cassé :** tous les tests existants restent verts.
- **Les tests :** chaque ajout est accompagné de ses tests.
- **Avant chaque push,** ces quatre commandes doivent passer, à lancer dans `backend/` :
  ```
  ruff check .
  python manage.py makemigrations --check --dry-run
  python manage.py spectacular --file schema.yml
  pytest -q
  ```
- **Si tu touches l'API,** pousse aussi le `schema.yml` régénéré : la CI vérifie qu'il est à jour.
- **Aucun secret** (mot de passe, clé) dans le code ni dans Git.

### Tâches, dans l'ordre

#### P1-1 · Prise en main
- [x] Installer le projet en local, lancer le backend et la suite de tests, et vérifier qu'elle est entièrement verte.
- [x] Lire la chaîne du 7-9 :
  - `parcours79.py`, `import_content79.py` et `check_parcours79.py` ;
  - un fichier de contenu, par exemple `m01.json`.
- [x] Repérer comment l'API sert les parcours, les leçons et la progression d'un enfant (`backend/apps/curriculum/views.py` et les applications de progression).

**C'est fini quand** tu peux expliquer par écrit, en quelques lignes, comment une leçon 7-9 va du fichier JSON jusqu'à l'écran de l'enfant.

#### P1-2 · Une chaîne de contenu pour tous les parcours
kEur IA aura **6 parcours** : pour chaque tranche d'âge, un parcours enfant (inscrit par ses parents) et un parcours élève (inscrit par son école). Chacun a son propre contenu, ses images et ses voix.

| Parcours | Clé | Préfixe des modules | Dossier de contenu |
|---|---|---|---|
| Enfant 7-9 | `7-9` | `p` | `parcours79/` (existe) |
| Élève 7-9 | `7-9-ecole` | `ep` | `parcours79ecole/` |
| Enfant 10-12 | `10-12` | `a` | `parcours1012/` |
| Élève 10-12 | `10-12-ecole` | `ea` | `parcours1012ecole/` |
| Enfant 13-15 | `13-15` | `c` | `parcours1315/` |
| Élève 13-15 | `13-15-ecole` | `ec` | `parcours1315ecole/` |

- [x] Rendre la vérification et l'import du contenu **paramétrables par parcours**. Trois choses varient selon le parcours :
  - le dossier de contenu ;
  - le préfixe des identifiants ;
  - la liste des types de jeux autorisés.
- [x] Ajouter un parcours ne doit demander qu'une ligne de configuration, pas de nouveau code.
- [x] Garder les commandes actuelles identiques pour le 7-9.
- [x] Ajouter une option `--track 10-12`, ou des commandes équivalentes, pour le 10-12.
- [x] Créer `frontend/content/parcours1012/` avec **un module d'exemple** `a01.json` de 4 leçons d'exemple, assez complet pour tester toute la chaîne.

**C'est fini quand** la vérification et l'import passent sur le module d'exemple 10-12, et que les tests du 7-9 sont toujours verts.

#### P1-3 · Les personnages du 10-12
- [x] En plus de Palou, le 10-12 a plusieurs personnages. Chacun a un nom, un rôle et une image. Pour l'instant, seul Palou a une voix : il lit aussi les passages des autres personnages.
- [x] Proposer comment les stocker (modèle en base ou fichier de contenu), puis implémenter la solution retenue.
- [x] Une réplique d'histoire doit indiquer **quel personnage parle**. La vérification du contenu refuse un personnage inconnu.

**C'est fini quand** le module d'exemple contient des répliques de plusieurs personnages, et qu'elles sont vérifiées, chargées et renvoyées par l'API.

#### P1-4 · Chaque enfant voit le parcours de son âge
- [x] Vérifier le choix du parcours selon l'âge, et le corriger si besoin :
  - un enfant de 10 à 12 ans reçoit le 10-12 ;
  - un enfant de 7 à 9 ans reçoit le 7-9.
- [x] Empêcher un enfant d'ouvrir ou de valider une leçon d'un autre parcours en appelant l'API directement.
- [x] Écrire les tests de ces deux règles.
- [x] Ta règle porte sur l'âge. La règle enfant / élève est faite par Lansana avec le parcours élève. Les deux doivent se combiner : un élève d'école de 11 ans reçoit le parcours `10-12-ecole`.

**C'est fini quand** les tests prouvent trois choses :
- un enfant de 11 ans voit le 10-12 ;
- un enfant de 8 ans voit le 7-9 ;
- aucun des deux n'accède à l'autre parcours.

#### P1-5 · Progression, étoiles et badges en 10-12
- [x] Vérifier qu'une leçon 10-12 terminée (identifiants `a…`) enregistre bien la progression, les étoiles, l'XP et les badges, comme en 7-9.
- [x] Corriger tout ce qui ne marche qu'avec des identifiants `p…`.
- [x] Vérifier le classement, le tableau de bord parent et le suivi enseignant pour un enfant de 10-12 ans.

**C'est fini quand** un enfant de test de 10-12 ans termine les 4 leçons d'exemple et voit ses étoiles, et que ses parents et son enseignant voient sa progression.

#### P1-6 · Les nouveaux jeux du 10-12
- [x] Préparer la structure : ajouter un type de jeu doit demander seulement une fonction de vérification et un test, sur le modèle des fonctions `_check_…` de `parcours79.py`.
- [ ] Quand la liste des nouveaux jeux du 10-12 sera fixée, ajouter la vérification de chacun côté serveur.

**C'est fini quand** chaque nouveau type de jeu a sa vérification et son test.

#### P1-7 · Les outils des pictogrammes et des voix pour chaque parcours
Aujourd'hui, deux outils ne marchent que pour le 7-9 :
- `slice_pictos79` découpe les planches de pictogrammes ;
- `scripts/export_voice79.py` sort les listes de phrases à enregistrer.

Chacun des 6 parcours a sa propre série de pictogrammes et de voix (voir `docs/PICTOS_ET_VOIX.html`).
- [x] Les deux outils prennent le parcours en paramètre, avec les clés de P1-2 (`--track 10-12`, `--track 7-9-ecole`…) et `7-9` par défaut.
- [x] Chaque parcours lit et écrit dans ses propres dossiers et ne touche jamais aux fichiers d'un autre.
- [x] Ajouter un test par parcours sur le module d'exemple.

**C'est fini quand** l'export des voix et le découpage des pictogrammes passent sur le module d'exemple 10-12, et que le 7-9 donne exactement les mêmes fichiers qu'avant.

### Quand une tâche est finie

1. Les quatre commandes de vérification passent.
2. Coche la tâche dans ce fichier.
3. Pousse sur `dev_pathe_fall`, puis ouvre une pull request vers `test` avec un court résumé : ce qui a changé et comment le tester.
4. Lansana relit et valide avant la fusion.
