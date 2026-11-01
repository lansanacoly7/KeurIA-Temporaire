# kEur IA · Guide des tâches

**Pour :** Pathe, Maïmouna et Louise-Sophie
**De :** Lansana

L'ancien dépôt (`issabathily/keuria-v2`) est indisponible pour quelques heures. En attendant, vos fiches de tâches sont sur un **dépôt temporaire**, qui ne contient que les tâches :

**https://github.com/lansanacoly7/KeurIA-Temporaire**, branche `test`, dossier `taches/`.

**Le code, les images, les vidéos et les voix restent dans l'ancien dépôt.** Travaillez dans votre copie locale de l'ancien dépôt, sur votre branche, comme d'habitude. Quand il sera de nouveau disponible, vous pousserez votre branche et ouvrirez une pull request vers `test`, comme avant.

---

## 1. Les fichiers à lire

| Fichier | Pour qui |
|---|---|
| `taches/00_GUIDE.md` | Tout le monde : ce guide. |
| `taches/Pathe.md` | Pathe : le back-end. |
| `taches/Maimouna.md` | Maïmouna : les décors, les vidéos et les voix. |
| `taches/Louise.md` | Louise-Sophie : les personnages, les émotes de Palou, les éléments de vidéo et les pictogrammes. |
| `docs/PARCOURS_10-12_DAKAR.html` | Tout le monde. C'est **le document de référence** du parcours 10-12 : l'histoire, les 12 lieux, les personnages et les vidéos. Ouvre-le dans un navigateur. |

**Lis ta fiche en entier avant de commencer.** Elle est rangée dans l'ordre : on fait les tâches dans cet ordre.

---

## 2. Qui fait quoi

| Personne | Rôle |
|---|---|
| **Pathe** | Le back-end, et seulement du code : Django, les tests, les commandes de vérification. |
| **Maïmouna** | La responsable de toute la génération : les décors des lieux, les vidéos et les voix. |
| **Louise-Sophie** | La génération avec Maïmouna : les personnages, les émotes de Palou, les éléments pour les vidéos et les pictogrammes. |
| **Lansana** | Il relit, valide, fusionne et s'occupe du parcours école. |

Maïmouna et Louise-Sophie travaillent **ensemble** :
- les personnages de Louise-Sophie servent de modèles aux vidéos de Maïmouna ;
- les décors de Maïmouna servent de fond aux images de Louise-Sophie.

Échangez-vous vos images au fur et à mesure.

---

## 3. Comment travailler

| Personne | Branche, dans l'ancien dépôt |
|---|---|
| Pathe | `dev_pathe_fall` |
| Maïmouna | `dev_maimouna` |
| Louise-Sophie | `dev_louise` |

1. **Travaille sur ta branche,** dans l'ancien dépôt.
2. **Fais des commits souvent,** au moins un par tâche finie, avec un message clair en français, qui commence par l'identifiant de la tâche : `M1 : décors du village et du monument`.
3. **Quand l'ancien dépôt est de nouveau disponible :**
   - récupère `test` ;
   - pousse ta branche ;
   - ouvre une **pull request vers `test`**, avec ce qui a changé, la liste des fichiers livrés et comment vérifier.
4. **Lansana relit.** S'il y a des erreurs, il te les renvoie. Sinon, il fusionne.

**Pour les images, les vidéos et les voix :**
- **Range chaque fichier exactement** dans le dossier et sous le nom indiqués par ta fiche. Les noms comptent : le site les retrouvera par leur nom. Ils sont tout en minuscules, sans accent ni espace, avec des tirets.
- **Garde tes prompts.** Note dans ton rapport le prompt type de chaque série : c'est ce qui permet de refaire une image pareille.

**Pour le code (Pathe) :** avant chaque push, les quatre vérifications doivent passer, à lancer dans `backend/` :
```
ruff check .
python manage.py makemigrations --check --dry-run
python manage.py spectacular --file schema.yml
pytest -q
```

---

## 4. La validation

On ne produit jamais une série entière sans validation.

1. **Avant chaque série,** fais **1 image d'essai**, ou 1 vidéo, ou 1 voix.
2. Envoie-la-moi directement, par message ou par mail.
3. J'ai répondu « validé » : fais toute la série dans le même style.
4. J'ai demandé une correction : refais l'essai.

Pour Pathe, c'est pareil, mais pour une décision : quand ta fiche dit « propose », envoie-moi ta proposition en quelques lignes avant de coder.

**Si tu es bloqué,** écris-moi tout de suite. Ne reste jamais bloqué plus d'une demi-journée.

---

## 5. Le style des images, pour Maïmouna et Louise-Sophie

Ces règles valent pour **toutes** les images du parcours 10-12 :

- **Le même style que les planches existantes** (dossier `frontend/public/images/parcours79/references/`) :
  - illustration plate de livre pour enfants ;
  - contours bruns épais (#381204) ;
  - couleurs chaudes et vives : jaune #FEDA82, orange #CD6D19, corail #FF9971, vert #34D399, bleu #3B82F6.
- **Un dessin un peu plus mûr que pour le 7-9 :** les enfants ont 11 ans.
- **Aucun texte, aucune lettre et aucun chiffre lisible,** nulle part : ni sur le car, ni sur les panneaux, ni sur les écrans, ni sur les vêtements. Si l'outil en ajoute, refais l'image.
- **Un personnage garde toujours exactement la même apparence :** mêmes vêtements, même coiffure, mêmes couleurs. Avant chaque image, mets sa planche en référence dans ton outil.
- **Le Dakar d'aujourd'hui,** réaliste et chaleureux, avec une lumière de journée. Pas de clichés : ni savane ni animaux sauvages en ville.
- **Respect des lieux :** les scènes dans des lieux réels sont des histoires inventées. Aucune vraie personne reconnaissable, aucun logo, aucun nom d'entreprise.
- **Gorée** est un lieu de mémoire : les images y restent calmes et respectueuses, jamais festives.

### Les pictogrammes : toujours en planches de 9

On ne génère **jamais** un pictogramme par image : c'est beaucoup trop cher en quota.
- **Une planche :** 1536 × 1536 px, fond blanc, une grille invisible de 3 × 3 cases de 512 px.
- **Dans chaque case :** un objet centré, au moins 60 px de blanc autour, rien qui déborde, aucun trait de séparation, aucun numéro.
- **Ordre des cases :** de gauche à droite, puis de haut en bas, dans l'ordre de la liste donnée.
- **La découpe,** c'est Lansana qui la fait.

### La liste de contrôle, après chaque image

- [ ] Le nom du fichier, le dossier et la taille en pixels sont exactement ceux de la fiche.
- [ ] Il n'y a aucun texte, aucune lettre et aucun chiffre lisible.
- [ ] Les personnages ressemblent à leur planche.
- [ ] Le style est le même que celui des images déjà validées.

---

## 6. Ce qu'on ne fait jamais

- On ne pousse jamais directement sur `test` : on passe toujours par une pull request.
- On ne met **aucune clé ni aucun mot de passe** (ElevenLabs, base de données, fichier `.env`…) dans le code, dans un fichier ou dans un message.
- On ne modifie ni ne supprime les fichiers des autres parcours (`parcours79/`, `parcours79ecole/`) ni ceux des autres membres.
- On n'invente pas de personnages, de lieux ou de types de jeux sans validation. Tout est dans `docs/PARCOURS_10-12_DAKAR.html` et dans ta fiche.

---

## 7. Ton rapport

Tiens à jour un fichier `taches/rapports/RAPPORT_<Prénom>.md`, sur ta branche, avec :
1. les tâches finies, cochées, avec la date ;
2. la liste des fichiers produits ;
3. les prompts types utilisés, pour Maïmouna et Louise-Sophie ;
4. ce qui n'est pas satisfaisant ou pas fini, et pourquoi ;
5. les questions pour Lansana.
