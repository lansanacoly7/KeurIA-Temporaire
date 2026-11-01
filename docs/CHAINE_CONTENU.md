# Chaîne de contenu de kEur IA

Ce guide explique le fonctionnement complet de la chaîne de contenu de kEur IA : du fichier JSON rédigé jusqu'à l'écran de l'enfant ou de l'élève, comment ajouter un parcours ou un type de jeu, ainsi que les commandes de contrôle et d'import.

---

## 1. Du fichier JSON jusqu'à l'écran

### Étape 1 : Rédaction des modules et leçons
Chaque parcours possède ses fichiers de contenu (par exemple `frontend/content/parcours79/m01.json` ou `frontend/content/parcours79ecole/m01.json`). Chaque fichier JSON décrit :
- Le module (`id`, `title`, `description`, `lieu`, `video_arrivee`, `video_depart`, etc.).
- Les leçons (`id`, `title`, `minutes`, `stars`, `xp`, `cast`, `fiche`, `screens`).
- Les écrans de chaque leçon (`story`, `discover`, `game`, `classe`, `debat`, `bravo`).

### Étape 2 : Vérification narrative et structurelle
Avant d'intégrer le contenu, la commande Django `check_parcours79` valide :
- La cohérence des identifiants et des formats.
- La distribution des personnages (`speaker` et `cast`).
- La présence des images requises dans le dossier média du parcours.
- La validité de tous les types d'écrans et mini-jeux.

### Étape 3 : Versionnage et import en base de données
La commande `import_content79` charge les leçons en tant que version 1 dans la table `ContentVersion` (`kind='lesson79'`, `'lesson79ecole'`, `'lesson1012'`, etc.).
- Les personnages déclarés dans `characters.json` sont synchronisés dans la table `Character`.
- L'import est idempotent : relancer la commande n'écrase jamais une version existante.

### Étape 4 : Exposition par l'API
Le client web interroge l'API Django :
- `GET /api/curriculum/catalog/` renvoie la liste des mondes et leçons autorisés pour l'utilisateur.
- `GET /api/curriculum/lessons/<id>/` fournit les métadonnées de la leçon (avec URL de base des voix `voice_base_url`).
- `GET /api/curriculum/content79/<id>/` fournit le contenu interactif (écrans, répliques, jeux). Pour un élève, la section pédagogique `fiche` est automatiquement retirée.
- `GET /api/curriculum/fiche/<id>/` permet aux enseignants et administrateurs d'accéder à la fiche pédagogique d'une leçon école.

---

## 2. Les 6 parcours de kEur IA

| Parcours | Clé | Préfixe modules | Dossier de contenu | Dossier audio / voix |
|---|---|---|---|---|
| Enfant 7-9 | `7-9` | `p` | `frontend/content/parcours79/` | `audio/palou/lecons/` |
| Élève 7-9 | `7-9-ecole` | `ep` | `frontend/content/parcours79ecole/` | `audio/palou/ecole79/` |
| Enfant 10-12 | `10-12` | `a` | `frontend/content/parcours1012/` | `audio/palou/1012/` |
| Élève 10-12 | `10-12-ecole` | `ea` | `frontend/content/parcours1012ecole/` | `audio/palou/ecole1012/` |
| Enfant 13-15 | `13-15` | `c` | `frontend/content/parcours1315/` | `audio/palou/1315/` |
| Élève 13-15 | `13-15-ecole` | `ec` | `frontend/content/parcours1315ecole/` | `audio/palou/ecole1315/` |

---

## 3. Comment ajouter un parcours

Tous les réglages d'un parcours sont centralisés dans le dictionnaire `TRACK_CONFIGS` de `backend/apps/curriculum/parcours79.py`.

Pour ajouter un nouveau parcours, il suffit d'ajouter une entrée de configuration :

```python
TRACK_CONFIGS['10-12'] = {
    'label': "10–12 ans",
    'content_dir': FRONTEND / 'content' / 'parcours1012',
    'lesson_images_dir': FRONTEND / 'public' / 'images' / 'parcours1012' / 'lecons',
    'emotes_dir': FRONTEND / 'public' / 'images' / 'parcours1012' / 'palou',
    'voices_dir': FRONTEND / 'public' / 'audio' / 'palou' / '1012',
    'videos_dir': FRONTEND / 'public' / 'videos' / 'parcours1012',
    'voice_base_url': '/audio/palou/1012',
    'module_prefix': 'a',
    'file_prefix': 'a',
    'file_glob': 'a*.json',
    'lesson_id_re': r'^a[0-9]+-[0-9]+$',
    'image_name_re': r'^a[0-9]+-l[0-9]+-.*\.webp$',
    'allowed_screen_kinds': {'story', 'discover', 'game', 'bravo'},
    'allowed_game_types': {'select', 'sort', 'link', 'sequence'},
    'kind': 'lesson1012',
    'studio': False,
    'school': False,
}
```

---

## 4. Comment ajouter un type de jeu

L'ajout d'un jeu se fait en 2 étapes :

### 1. Enregistrer la fonction de vérification dans `parcours79.py`
Chaque validateur prend exactement la signature `(report, where, rnd, stats=None)` :

```python
def _check_mon_jeu(report, where, rnd, stats=None):
    if not rnd.get('target'):
        report.error(f"{where} : 'target' est obligatoire.")

register_game_validator('mon_jeu', _check_mon_jeu)
```

Puis ajouter `'mon_jeu'` dans `allowed_game_types` des parcours concernés dans `TRACK_CONFIGS`.

### 2. Écrire le test associé
Ajouter un test unitaire vérifiant les cas valide et invalide pour ce type de jeu dans la suite de tests.

---

## 5. Les commandes et scripts utiles

### `check_parcours79`
Vérifie la conformité narrative, les images, le casting et les choix de réponse.
```bash
python manage.py check_parcours79 --track 7-9
python manage.py check_parcours79 --track 7-9-ecole
python manage.py check_parcours79 --track 10-12 --from backend/apps/curriculum/tests/fixtures/parcours1012
```
- `--track <clé>` : tranche à contrôler (`7-9` par défaut).
- `--from <chemin>` : dossier optionnel contenant les fichiers JSON.
- `--db` : contrôle également les versions en ligne publiées dans la base de données.
- `--export-md <chemin>` : exporte le contenu en fichier Markdown.

### `import_content79`
Importe les leçons d'un parcours comme versions initiales dans la base de données.
```bash
python manage.py import_content79 --track 7-9
python manage.py import_content79 --track 10-12 --from backend/apps/curriculum/tests/fixtures/parcours1012 --dry-run
```
- `--track <clé>` : parcours à importer.
- `--dry-run` : affiche ce qui serait importé sans écrire dans la base de données.
- `--from <chemin>` : dossier source alternatif.

### `check_voices`
Contrôle la présence effective de tous les fichiers audio MP3 requis pour chaque passage lu d'un parcours.
```bash
python manage.py check_voices --track 7-9
python manage.py check_voices --track 7-9-ecole
```
- `--track <clé>` : parcours cible.
- `--strict` : lève une erreur si des clips audio manquent.

### `slice_pictos79`
Découpe les planches de pictogrammes brutes (`pictos-src/sheet-NN.png`) en images individuelles WebP (`pictos/<id>.webp`).
```bash
python manage.py slice_pictos79 --track 7-9
python manage.py slice_pictos79 --track 10-12 --grid 3x3
python manage.py slice_pictos79 --redo nom_picto_1,nom_picto_2
```
- `--track <clé>` : parcours cible.
- `--grid <cols>x<rows>` : découpage en grille (ex: `4x3` pour 7-9, `3x3` pour les nouvelles séries).
- `--redo <id1,id2>` : redécoupe ciblée depuis la planche de corrections `sheet-redo.png`.

### `scripts/export_voice79.py`
Génère les listes de répliques et phrases à enregistrer au format CSV pour la production audio (ElevenLabs).
```bash
python scripts/export_voice79.py --track 7-9
python scripts/export_voice79.py --track 7-9-ecole
python scripts/export_voice79.py --track 10-12
```
- `--track <clé>` : parcours à exporter.
- Accepte un argument optionnel pour restreindre l'export à un module précis (ex: `m01` ou `a01`).

