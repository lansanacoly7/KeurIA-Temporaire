# Pathe Fall · Tâches back-end

**Domaine :** le back-end, uniquement du code (Django, tests, commandes).
**Branche :** `dev_pathe_fall`, dans l'ancien dépôt. Une pull request vers `test` par partie finie.
**À lire d'abord :** `taches/00_GUIDE.md`.

Cette fiche reprend la relecture de ta branche (partie A), puis ajoute de nouvelles tâches (parties B et C). **Fais-les dans l'ordre.**

---

## Démarrer

- Continue sur ta branche `dev_pathe_fall`, dans ta copie locale de l'ancien dépôt.
- **Dès que l'ancien dépôt est de nouveau disponible,** récupère `test` dans ta branche (`git pull origin test`). Il contient :
  - le contenu du parcours élève 7-9 dont tu as besoin pour la partie B : `frontend/content/parcours79ecole/m01.json … m10.json` ;
  - le document du 10-12 : `docs/PARCOURS_10-12_DAKAR.html`.
- **En cas de conflit sur `taches/Pathe.md`,** garde la version de `test`.
- En attendant, commence par la partie A, qui n'a besoin que de ta branche.
- Les voix de la leçon d'exemple `ep1-1`, utiles pour tes tests de voix (B4), arriveront sur `test` avec le reste. Lansana te les enverra directement si elles ne sont pas encore là.

**Ne modifie pas ces contenus.** Si ta vérification refuse quelque chose dedans, note-le dans ton rapport : c'est Lansana qui corrige le contenu.

---

## Rappel : les 6 parcours

| Parcours | Clé | Préfixe des modules | Dossier de contenu | Voix |
|---|---|---|---|---|
| Enfant 7-9 | `7-9` | `p` | `parcours79/` | `audio/palou/lecons/mNN/pN-K/` |
| Élève 7-9 | `7-9-ecole` | `ep` | `parcours79ecole/` | `audio/palou/ecole79/epN/epN-K/` |
| Enfant 10-12 | `10-12` | `a` | `parcours1012/` | `audio/palou/1012/aN/aN-K/` |
| Élève 10-12 | `10-12-ecole` | `ea` | `parcours1012ecole/` | `audio/palou/ecole1012/eaN/eaN-K/` |
| Enfant 13-15 | `13-15` | `c` | `parcours1315/` | `audio/palou/1315/cN/cN-K/` |
| Élève 13-15 | `13-15-ecole` | `ec` | `parcours1315ecole/` | `audio/palou/ecole1315/ecN/ecN-K/` |

- **Le nom d'un fichier de voix** suit toujours la forme `<leçon>_<clé>.mp3`, par exemple `ep1-1_e01.mp3` ou `p1-1_e05-m1-q.mp3`.
- **Seul Palou a une voix.** Il lit aussi les passages des autres personnages.
- **Les personnages du 10-12 sont créés par Lansana,** pas par toi. Tu fais le mécanisme, avec des personnages d'exemple.

---

## Partie A · Correctifs après relecture de ta branche (commit `cc5e0f5c`)

Ton travail est solide : les quatre vérifications passent, le 7-9 n'est pas cassé, et le blocage entre parcours, la progression 10-12 et les personnages en base fonctionnent. Voici ce qu'il faut corriger avant la fusion.

### A1 · La fiche à jour
- [ ] Quand tu récupères `test`, cette fiche arrive dans `taches/Pathe.md`. Garde-la en cas de conflit, et coche les tâches directement dedans, au fur et à mesure.

### A2 · Les personnages : la structure oui, les noms non
- [ ] Garde le modèle `Character`, l'import de `characters.json`, l'API et la vérification du personnage qui parle (`speaker`).
- [ ] Retire Aminata, Kofi et Dr. Fall partout : `TRACK_CONFIGS`, `characters.json`, le module d'exemple et les tests.
- [ ] Remplace-les par des personnages d'exemple clairement marqués : `exemple-1` et `exemple-2`, nommés « Personnage exemple 1 » et « Personnage exemple 2 ». Palou reste.
- [ ] La liste des personnages d'un parcours ne doit pas être écrite en dur dans le code : elle vient uniquement du `characters.json` du parcours.
  - Pour le 7-9, crée `characters.json` avec les personnages actuels de `CAST_NAMES`, sans en changer aucun.
- [ ] Supprime le cas particulier `dr-fall` (« Dr. Fall ») dans `_check_lesson`. Fais une règle générale : un personnage peut déclarer des `aliases` dans `characters.json`, par exemple `["Mme Diop"]` pour Madame Diop.

### A3 · Les jeux : pas de types inventés
- [ ] Garde le mécanisme `register_game_validator`.
- [ ] Retire `code`, `algo`, `debug`, `prompt` et `branch`, ainsi que leurs tests. La liste des jeux du 10-12 n'est pas encore fixée.
- [ ] Garde un test du mécanisme avec un jeu fictif, en nettoyant après le test (voir A5).

### A4 · Une configuration pour les 6 parcours
- [ ] `TRACK_CONFIGS` contient les 6 parcours du tableau ci-dessus. Pour chacun :
  - la clé, le préfixe des identifiants de leçon et de module ;
  - le dossier de contenu ;
  - le motif des fichiers (`m*.json`, `a*.json`…) ;
  - le dossier des images de leçons et le modèle de nom d'image ;
  - le dossier des voix ;
  - les types d'écrans autorisés et les types de jeux autorisés ;
  - les poses (émotes) de Palou autorisées et leur dossier d'images. Le 10-12 aura son propre jeu d'émotes, car Palou y est plus grand.
  - le `kind` du studio.
- [ ] `--track` accepte toutes les clés de `TRACK_CONFIGS` (`choices=list(TRACK_CONFIGS)`), pas une liste écrite à la main.
- [ ] `import_content79` ne contient plus aucun `if track == '7-9'` : le même code sert à tous les parcours. Si le 7-9 a besoin d'un traitement à part, par exemple le studio, c'est une option de sa configuration (`'studio': True`).
- [ ] `get_track_config` lève une erreur claire pour une clé inconnue. Aujourd'hui, il renvoie le 7-9 sans prévenir.
- [ ] Les constantes globales `LESSON_ID_RE` et `IMAGE_NAME` ne mélangent plus les préfixes. Chaque parcours a les siens dans sa configuration.
- [ ] **Test :** ajouter un parcours fictif ne demande qu'une entrée dans `TRACK_CONFIGS`. Le test l'ajoute avec `mock.patch.dict`, vérifie, puis nettoie.
- [ ] **Test :** le 7-9 donne exactement le même résultat qu'avant ton travail : mêmes erreurs, mêmes avertissements, même import.

### A5 · Défauts à corriger
- [ ] **`_check_round` :** supprime le `try … except TypeError`. Tous les validateurs prennent la même signature `(report, where, rnd, stats)`. Aujourd'hui, une vraie erreur dans un validateur est cachée, et le validateur tourne deux fois.
- [ ] **`test_game_validators.py` :** il modifie `TRACK_CONFIGS` et `GAME_VALIDATORS` sans les remettre en état. Utilise `mock.patch.dict` ou un nettoyage dans `tearDown`.
- [ ] **Images :** une image d'un parcours ne doit jamais être cherchée dans le dossier d'un autre parcours. Supprime le repli `or (LESSON_IMAGES_DIR / …)`.
- [ ] **`apps/progress/xp.py` :** lis l'XP seulement dans la version **en ligne** (`live_version`), jamais dans une version écartée ou pas encore publiée, et sans valeur par défaut de 20.
- [ ] **`leaderboard.py` :** un enfant n'apparaît que dans **un** classement. C'est `LearnerProfile.age_track` qui décide, et `age_group` ne sert que s'il n'y a pas de profil.
  - Ajoute un test avec un profil 10-12 et un `age_group` 7-9.
- [ ] **Le parcours d'un utilisateur** est calculé à trois endroits (`views.py` deux fois, `progress/views.py`). Regroupe ce calcul dans **une** fonction partagée, `track_for(user)`. Voir B2.
- [ ] **`scripts/audit-qualite.ps1`** n'a rien à voir avec cette phase : retire-le de ta branche. Tu pourras le proposer à part plus tard.

### A6 · Le module d'exemple n'est pas le vrai contenu
- [ ] Déplace ton `a01.json` d'exemple et son `characters.json` dans `backend/apps/curriculum/tests/fixtures/parcours1012/`.
- [ ] Tes tests lisent ce dossier avec `--from` ou `content_dir`.
- [ ] Tu ne crées et ne modifies rien dans `frontend/content/parcours1012/` : le vrai contenu y sera écrit par Lansana.

### A7 · P1-7 : les outils des pictogrammes et des voix par parcours
Aujourd'hui, deux outils ne marchent que pour le 7-9 :
- `slice_pictos79` découpe les planches de pictogrammes ;
- `scripts/export_voice79.py` sort les listes de phrases à enregistrer.

À faire :
- [ ] Les deux outils prennent `--track`, avec les clés de `TRACK_CONFIGS`, et `7-9` par défaut.
- [ ] **Planches de pictogrammes :** elles sont désormais en **3 × 3** (9 pictogrammes par planche de 1536 × 1536). Le découpage doit accepter une grille paramétrable (`--grid 3x3`), et garder l'ancienne grille du 7-9 par défaut.
- [ ] Chaque parcours lit et écrit uniquement dans ses propres dossiers, ceux de sa configuration.
- [ ] **Tests :**
  - le 7-9 donne **exactement** les mêmes fichiers qu'avant ;
  - un test par parcours sur un module d'exemple ;
  - un test de découpe 3 × 3 avec une planche d'exemple générée dans le test.

Fais **un commit** après chaque sous-partie, par exemple `A4 : configuration des 6 parcours`, et une pull request vers `test` à la fin de la partie A.

---

## Partie B · Brancher le parcours élève 7-9 côté serveur

Le contenu du parcours élève 7-9 existe : `parcours79ecole/m01.json … m10.json`, 10 modules (`ep1` à `ep10`) et 40 leçons (`ep1-1` à `ep10-4`). Il a des éléments en plus du parcours enfant, décrits ci-dessous. Ouvre `m01.json` à côté pour les voir.

### B1 · Les nouveaux types d'écrans et la fiche enseignant
**Les écrans `classe` (activité en classe)** :
```json
{ "kind": "classe", "titre": "…", "duree": "15 min", "groupes": "groupes de 4",
  "text": "…", "materiel": ["…", "…"] }
```
- [ ] `titre`, `duree`, `groupes` et `text` sont obligatoires.
- [ ] `materiel` est une liste, qui peut être vide.

**Les écrans `debat` (« On en parle ! »)** :
```json
{ "kind": "debat", "speaker": "mme-diop", "question": "…", "text": "…" }
```
- [ ] `question` et `text` sont obligatoires.
- [ ] `speaker` doit être un personnage connu du parcours.

**La fiche enseignant (`fiche`),** au niveau de la leçon, à côté de `screens` :
```json
"fiche": { "objectifs": ["…"], "deroule": ["…"], "materiel": ["…"],
           "reponses": ["…"], "attention": ["…"] }
```
- [ ] Les 5 clés sont obligatoires pour le parcours élève : ce sont des listes de phrases, au moins 1 phrase dans `objectifs` et dans `deroule`.

**La configuration :**
- [ ] Les écrans `classe` et `debat` et la `fiche` sont autorisés **seulement** dans les parcours élèves (`*-ecole`). Dans un parcours enfant, ils sont refusés.
- [ ] Les personnages du parcours élève 7-9 sont dans un `characters.json` à créer dans `parcours79ecole/` :
  - Palou, Madame Diop, Moussa, Fatou ;
  - les camarades Khady, Seydou, Lamine, Aïssatou ;
  - les invités Oncle Bakary, Madame Ndiaye, Monsieur Sarr, Aminata, Monsieur Diallo, Madame Guèye.
  - Les identifiants sont ceux utilisés dans les fichiers : `palou`, `mme-diop`, `moussa`, `fatou`, `khady`, `seydou`, `lamine`, `aissatou`, `bakary`, `ndiaye`, `sarr`, `aminata`, `diallo`, `gueye`.
  - Vérifie-les dans les fichiers, et signale à Lansana tout identifiant qui ne colle pas.
- [ ] `check_parcours79 --track 7-9-ecole` passe sur les 10 modules, ou liste clairement ce qu'il refuse. Envoie cette liste à Lansana, qui corrigera le contenu.
- [ ] `import_content79 --track 7-9-ecole` charge les 40 leçons, et il est idempotent : le relancer ne crée rien de plus.

**C'est fini quand** la vérification et l'import passent, avec des tests pour chaque nouveau type d'écran : un cas valide et un cas refusé par champ obligatoire.

### B2 · Le bon parcours pour chaque utilisateur
Une seule fonction décide du parcours : `track_for(user)`, dans un module partagé, par exemple `apps/curriculum/tracks.py`.
- [ ] La tranche d'âge vient du profil (`LearnerProfile.age_track`), sinon de `age_group`.
- [ ] Un élève **inscrit par une école** (`user.school` non vide) reçoit le parcours élève de sa tranche : `7-9-ecole`, `10-12-ecole` ou `13-15-ecole`.
- [ ] Un enfant inscrit par ses parents reçoit le parcours enfant de sa tranche.
- [ ] Si le parcours élève de sa tranche n'a pas encore de contenu, l'élève reçoit **temporairement** le parcours enfant de sa tranche. Ce repli est une option de configuration, facile à couper.
- [ ] Partout où on vérifie l'accès à une leçon (lecture, contenu du studio, enregistrement de la progression), on utilise `track_for`.

**Tests, au minimum ces 6 cas :**
- un enfant de 8 ans → `7-9` ;
- un enfant de 11 ans → `10-12` ;
- un élève d'école de 8 ans → `7-9-ecole` ;
- un élève d'école de 11 ans → `10-12-ecole`, ou le repli ;
- un élève d'école ne peut ni ouvrir ni valider une leçon du parcours enfant, quand le repli est coupé ;
- un enfant ne peut ni ouvrir ni valider une leçon du parcours élève.

### B3 · La fiche enseignant n'arrive jamais chez l'élève
- [ ] Le contenu d'une leçon envoyé à un élève ou à un enfant **ne contient jamais la `fiche`**.
- [ ] Une nouvelle route renvoie la fiche d'une leçon, par exemple `GET /api/curriculum/fiche/<lesson_id>/`. Y ont accès :
  - un enseignant d'une école ;
  - la direction d'une école ;
  - le super administrateur.
- [ ] Les autres reçoivent une erreur 403.
- [ ] **Tests :** un élève ne voit jamais la fiche, ni dans le contenu ni par la route, et un enseignant la voit.
- [ ] Mets `schema.yml` à jour.

### B4 · Les voix par parcours
- [ ] Le dossier des voix est dans la configuration de chaque parcours (voir le tableau du début).
- [ ] Une commande `check_voices --track <clé>` vérifie que chaque passage lu de chaque leçon a son fichier mp3.
  - Pour savoir quels passages sont lus, inspire-toi du test existant `apps/superadmin/tests/test_studio79_voices.py`, et de `scripts/export_voice79.py` pour la liste des clés.
- [ ] Pour le parcours élève, les clés des écrans en plus sont :
  - `classe` : « En classe : titre. texte » ;
  - `debat` : « On en parle ! question texte ».
  - Compare avec les fichiers de `frontend/public/audio/palou/ecole79/ep1/ep1-1/` : ils sont justes.
- [ ] **Test :** une leçon dont toutes les voix existent passe, et une leçon avec un fichier manquant est signalée.
- [ ] L'API renvoie, pour chaque leçon, le chemin de base de ses voix, pour que le front-end n'ait rien à deviner.

---

## Partie C · Préparer le parcours 10-12 « Les vacances à Dakar »

Lis `PARCOURS_10-12_DAKAR.html`. Chaque module se passe dans un lieu de Dakar. Une vidéo d'**arrivée** passe avant la 1ʳᵉ leçon, et une vidéo de **départ** après la 4ᵉ. Une vidéo d'**ouverture** passe une seule fois, avant le module 1.

### C1 · Les vidéos des modules
- [ ] **Propose d'abord** à Lansana, en quelques lignes, où les déclarer. Ma suggestion : dans l'en-tête `module` du fichier JSON :
  ```json
  "module": { "id": "a1", …, "lieu": "Monument de la Renaissance africaine",
              "video_arrivee": "arrivee-a1.mp4", "video_depart": "depart-a1.mp4" }
  ```
  avec la vidéo d'ouverture dans la configuration du parcours (`"video_ouverture": "ouverture.mp4"`).
- [ ] Le dossier des vidéos est dans la configuration : `frontend/public/videos/parcours1012/`.
- [ ] La vérification **avertit**, sans bloquer, quand une vidéo déclarée n'existe pas encore : Maïmouna les produit en ce moment.
- [ ] L'API d'un parcours renvoie, pour chaque module, son lieu et ses deux vidéos, plus la vidéo d'ouverture du parcours.
- [ ] **Tests :** les vidéos sont renvoyées par l'API, un fichier manquant donne un avertissement, et un champ vidéo sur le 7-9 ne casse rien.

### C2 · Les personnages des lieux
- [ ] Dans `characters.json`, un personnage peut avoir :
  - `module` : le module où on le rencontre, par exemple `a1`, ou rien pour les personnages principaux ;
  - `avatar` : le chemin de sa planche, par exemple `/images/parcours1012/references/02_ousmane_reference.png`.
- [ ] La vérification **avertit** quand un personnage parle dans un module qui n'est pas le sien. Un personnage principal (Palou, Moussa, Fatou, Papa Ibou) peut parler partout.
- [ ] La vérification **avertit** quand l'image d'un personnage n'existe pas encore.
- [ ] L'API des personnages permet de filtrer par module : `?track=10-12&module=a1`. La route renvoie aussi les personnages principaux.
- [ ] **Tests**, avec tes personnages d'exemple uniquement.

### C3 · La documentation de la chaîne de contenu
- [ ] Écris `docs/CHAINE_CONTENU.md`, sur une à deux pages, pour quelqu'un qui arrive dans le projet :
  - comment une leçon va du fichier JSON jusqu'à l'écran ;
  - comment ajouter un parcours, avec un exemple de ligne de `TRACK_CONFIGS` ;
  - comment ajouter un type de jeu, avec une fonction et un test ;
  - les commandes : `check_parcours79`, `import_content79`, `check_voices`, `slice_pictos79` et `export_voice79`, avec leurs options ;
  - où vont les images, les voix et les vidéos de chaque parcours.

---

## Ordre de travail et commits

1. Partie A, de A1 à A7.
2. Partie B, de B1 à B4.
3. Partie C, de C1 à C3.

Fais **un commit par tâche**, avec un message en français qui commence par l'identifiant de la tâche, par exemple `B2 : track_for et règle enfant / élève`. Avant chaque push, les quatre vérifications du guide doivent passer. Ouvre **une pull request vers `test` par partie** (A, B, C), ou plus souvent si une tâche est grosse.

## Ce que tu ne fais pas

- Pas de contenu pédagogique : textes, leçons, personnages réels. C'est Lansana.
- Pas d'images, de vidéos ni de voix, sauf si Lansana te le demande.
- Pas de front-end.
- Pas de push direct sur `test` : toujours une pull request.

## Ton rapport

Tiens à jour `taches/rapports/RAPPORT_Pathe.md` sur ta branche, comme décrit dans le guide. Indique pour chaque tâche :
- ce qui est fait ;
- le commit ou la pull request ;
- ce qui reste ;
- les contenus refusés par la vérification, à transmettre à Lansana.
