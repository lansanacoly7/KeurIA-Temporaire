# Louise-Sophie · Tâches de génération

**Branche :** `dev_louise`, dans l'ancien dépôt, à créer à partir de `test` · Une pull request vers `test` par tâche finie.

**Domaine :** la génération d'images, avec Maïmouna, qui en est la responsable. Toi, tu fais **les personnages, les émotes de Palou, les éléments pour les vidéos et les pictogrammes**. Du code front-end pourra t'être confié plus tard.
**Parcours :** 10-12 ans, « Les vacances à Dakar ».
**À lire d'abord :** `taches/00_GUIDE.md` (le style et les règles), puis `docs/PARCOURS_10-12_DAKAR.html` en entier.

Fais les tâches **dans l'ordre**. Avant chaque série, envoie **1 image d'essai** à Lansana et attends son « validé ».

---

## L'histoire, en deux mots

C'est les vacances. Papa Ibou, le chauffeur de car rapide, emmène Moussa et Fatou, qui ont maintenant 11 ans, et Palou le lionceau découvrir Dakar.
- Ils partent de leur village.
- Chaque module se passe dans un lieu de Dakar, où ils rencontrent 1 à 3 personnages.
- Papa Ibou les dépose au début du module, puis revient les chercher à la fin.

**Tes planches sont la référence de tout le parcours :** Maïmouna s'en sert pour les vidéos, et elles serviront pour toutes les illustrations des leçons. Un personnage doit donc être **identique** d'une image à l'autre.

---

## Où ranger tes fichiers

| Type | Dossier |
|---|---|
| Planches de personnages | `frontend/public/images/parcours1012/references/` |
| Émotes de Palou | `frontend/public/images/parcours1012/palou/` |
| Éléments pour les vidéos | `frontend/public/images/parcours1012/video/` |
| Planches de pictogrammes | `frontend/public/images/parcours1012/planches/` |

Les fichiers sont en PNG, avec des noms tout en minuscules, sans accent ni espace, et des tirets.

---

## L1 · Les personnages principaux

**Mise en page de chaque planche,** la même que `frontend/public/images/parcours79ecole/references/02_khady_reference.png` :
- 1024 × 1024 px, fond blanc ;
- le personnage en pied, de face et de profil ;
- 3 têtes : souriant, surpris, pensif.

| Fichier | Personnage |
|---|---|
| `02_moussa-11_reference.png` | **Moussa à 11 ans.** Pars de `frontend/public/images/parcours79/references/02_moussa_reference.png`. Garde ses traits, sa coiffure et ses couleurs, mais fais-le grandir : plus grand, plus mince, le visage moins rond. Il porte un petit sac à dos de voyage. On doit le reconnaître immédiatement. |
| `02_fatou-11_reference.png` | **Fatou à 11 ans.** Même méthode, à partir de `02_fatou_reference.png`, avec un petit sac en bandoulière. |
| `01_palou-1012_reference.png` | **Palou a grandi.** Pars de `frontend/public/images/parcours79/references/01_palou_reference.png` et garde exactement ses couleurs, sa crinière, ses yeux et sa silhouette générale. Il est juste un peu plus grand et un peu moins « bébé » : un jeune lion, plus un lionceau tout rond. **On doit le reconnaître au premier coup d'œil.** C'est l'essai le plus important : fais-le valider avant tout le reste. |
| `03_car-rapide_reference.png` | **1536 × 1024 px.** Le car rapide de Papa Ibou, vu de profil, de face, de l'arrière et de trois quarts, sur une seule planche. Voir la description ci-dessous. |

**Le car rapide** est le minibus traditionnel de Dakar :
- ancien, jaune et bleu, avec des décorations peintes (motifs, fleurs, yeux, drapeaux) mais **aucune inscription** ;
- une échelle à l'arrière et une galerie sur le toit avec quelques bagages ;
- une porte arrière par laquelle on descend ;
- un **détail unique** qui le rend reconnaissable dans toutes les vidéos, par exemple une tête de lion peinte sur le côté et un pompon rouge au rétroviseur.

**Papa Ibou ne change pas :** utilise `parcours79/references/02_papa-ibou_reference.png` tel quel.

**C'est fini quand** les 4 planches sont validées. **Envoie-les à Maïmouna dès qu'elles sont validées :** elle en a besoin pour les vidéos.

---

## L2 · Les émotes de Palou pour le 10-12

Palou a un jeu de **poses**, ou émotes, qui accompagne chaque écran des leçons. Celles du 7-9 sont dans `frontend/public/images/palou/` : regarde `Palou_Content.png`, `Palou_Surpris.png`, `Palou_Reflexion.png`, etc. Il faut le **même jeu pour le Palou du 10-12**, celui de ta planche `01_palou-1012_reference.png`.

**Format :**
- des **planches de 4 émotes** (2 × 2), de 2048 × 2048 px, fond blanc ;
- chaque case fait 1024 × 1024 ;
- Palou en entier dans sa case, centré, avec 80 px de blanc autour ;
- aucun texte.

Lansana fera la découpe. C'est moins cher en quota qu'une image par émote, mais assez grand pour l'affichage en leçon.

**Ordre des cases :** de gauche à droite, puis de haut en bas.

| Planche | Case 1 | Case 2 | Case 3 | Case 4 |
|---|---|---|---|---|
| `palou-1012-emotes-01.png` | **Content** : grand sourire, détendu | **Surpris** : yeux ronds, bouche ouverte, oreilles dressées | **Intelligent** : un doigt levé, l'air malin, une petite étincelle | **Question** : la tête penchée, une patte au menton, un point d'interrogation dessiné à côté (sans lettre) |
| `palou-1012-emotes-02.png` | **Réflexion** : les yeux vers le haut, une patte qui se gratte la tête | **Célébration** : les bras levés, des confettis | **Héros** : debout fièrement, les poings sur les hanches, la crinière au vent | **Encouragement** : un pouce levé, un sourire chaleureux |
| `palou-1012-emotes-03.png` | **Calme** : assis, les yeux mi-clos, serein | **Rire** : il rit aux éclats, les yeux fermés | **Triste** : les oreilles basses, une petite larme | **Déterminé** : les sourcils froncés, les poings serrés, prêt à agir |
| `palou-1012-emotes-04.png` | **Gentil** : il tend la patte, avec douceur | **Parfait** : il fait « OK » avec la patte, en clignant de l'œil | **Trois quarts** : debout, de trois quarts, souriant ; c'est la grande image de présentation | **Salut** : il fait au revoir de la main ; il servira aussi dans les vidéos |

**Contrôle :** sur les 16 émotes, Palou est **exactement le même** : couleurs, crinière, taille, épaisseur du trait. Seules l'expression et la pose changent.

**C'est fini quand** les 4 planches sont validées.

---

## L3 · Les personnages des lieux

Il y a une planche par personnage, dans le même format et la même mise en page que L1, nommée `02_<prénom>_reference.png`. **Fais-les dans l'ordre des modules,** et envoie à Maïmouna les personnages d'un module dès qu'ils sont validés.

| Module et lieu | Fichier | Personnage |
|---|---|---|
| 1 · Monument de la Renaissance | `02_ousmane_reference.png` | **Ousmane**, environ 35 ans, guide du monument. Souriant et accueillant, chemise de guide bleu nuit, badge sans texte, casquette. |
| | `02_mariama_reference.png` | **Mariama**, 11 ans, une visiteuse. Tresses relevées, robe en wax vert et jaune, lunettes rondes, l'air vif et curieux. |
| 2 · Port autonome | `02_omar_reference.png` | **Omar**, environ 40 ans, grutier. Gilet orange de sécurité, casque de chantier, gants, solide et souriant. |
| | `02_seynabou_reference.png` | **Seynabou**, environ 30 ans, elle suit les conteneurs sur ses écrans. Foulard, tenue de bureau, tablette à la main, gilet de sécurité. |
| 3 · Gare du TER | `02_rama_reference.png` | **Rama**, environ 28 ans, elle étudie la fréquentation de la gare. Tenue moderne, ordinateur portable sous le bras, l'air précis. |
| | `02_ablaye_reference.png` | **Ablaye**, environ 50 ans, contrôleur. Uniforme de contrôleur sans logo, casquette, sifflet, moustache, bienveillant. |
| 4 · Plage de Soumbédioune | `02_vieux-mbaye_reference.png` | **Vieux Mbaye**, environ 70 ans, pêcheur lébou. Barbe blanche, bonnet de laine, vêtements de pêcheur, mains marquées, un regard malicieux. |
| | `02_sokhna_reference.png` | **Sokhna**, 16 ans, sa petite-fille. Elle tient un téléphone pour photographier les poissons ; tresses, tee-shirt corail, jean. |
| 5 · Parc de Hann | `02_oumy_reference.png` | **Oumy**, environ 35 ans, gardienne du parc. Uniforme kaki, chapeau de brousse, jumelles. |
| | `02_djibril_reference.png` | **Djibril**, environ 25 ans, soigneur. Bottes, salopette verte, un seau, souriant. |
| 6 · Laboratoire de langues | `02_docteure-penda_reference.png` | **Docteure Penda**, environ 45 ans, chercheuse en langues. Lunettes, boubou élégant, un casque audio autour du cou. |
| | `02_alioune_reference.png` | **Alioune**, environ 23 ans, étudiant. Sweat bleu, ordinateur portable, micro de table. |
| 7 · Île de Gorée | `02_tante-fama_reference.png` | **Tante Fama**, environ 55 ans, guide de l'île. Grand boubou sobre, foulard noué, une voix douce, l'air sage. |
| | `02_kine_reference.png` | **Kiné**, environ 35 ans, peintre sur verre. Tablier taché de peinture, un pinceau derrière l'oreille. |
| 8 · Musée des Civilisations noires | `02_madame-yacine_reference.png` | **Madame Yacine**, environ 50 ans, conservatrice. Tailleur en wax aux couleurs sobres, lunettes au bout du nez, un carnet. |
| 9 · Dakar Arena | `02_coach-astou_reference.png` | **Coach Astou**, environ 40 ans, entraîneuse de basket. Survêtement, sifflet, chignon, l'air énergique. |
| | `02_ngone_reference.png` | **Ngoné**, 12 ans, joueuse de l'équipe des jeunes. Grande, maillot de basket sans numéro ni texte, ballon sous le bras. |
| 10 · Phare des Mamelles | `02_samba_reference.png` | **Samba**, environ 60 ans, gardien du phare. Pull marin, casquette de marin, une lampe torche. |
| | `02_ndella_reference.png` | **Ndella**, environ 30 ans, journaliste qui vérifie les informations. Tresses, chemise, appareil photo et téléphone, l'air attentif. |
| 11 · Palais de la République | `02_maitre-thioro_reference.png` | **Maître Thioro**, environ 45 ans, juriste. Tailleur sobre, un livre de lois sans titre lisible sous le bras. |

**Ils doivent se distinguer d'un coup d'œil :** silhouette, coiffure et couleur dominante. Leur tenue correspond à leur métier.

**C'est fini quand** les 20 planches sont validées.

---

## L4 · Les éléments pour les vidéos (pour Maïmouna)

**Dossier :** `frontend/public/images/parcours1012/video/`
**Fond :** blanc pur (#FFFFFF), uni, sans ombre au sol, pour que l'élément puisse être détouré.

| Fichier | Taille | Contenu |
|---|---|---|
| `car-profil-gauche.png` | 1600 × 900 | Le car de L1, de profil, tourné vers la gauche, Papa Ibou visible au volant. |
| `car-profil-droite.png` | 1600 × 900 | Le même, tourné vers la droite. |
| `car-arriere-porte-ouverte.png` | 1600 × 900 | Le car vu de l'arrière, porte ouverte, vide. |
| `papa-ibou-volant-salut.png` | 1024 × 1024 | Papa Ibou au volant, par la vitre, qui fait au revoir de la main. |
| `enfants-descendent.png` | 1600 × 900 | Moussa, Fatou et Palou (10-12) qui descendent du car, joyeux. |
| `enfants-salut-dos.png` | 1600 × 900 | Les trois, vus de dos, qui font au revoir de la main. |
| `enfants-salut-face.png` | 1600 × 900 | Les trois, de face, qui font au revoir de la main. |
| `enfants-montent.png` | 1600 × 900 | Les trois qui montent dans le car ; Moussa aide Palou. |
| `enfants-marchent.png` | 1600 × 900 | Les trois qui marchent côte à côte vers la droite, sacs sur le dos. |
| `enfants-assis-car.png` | 1600 × 900 | Les trois assis dans le car, par la fenêtre, le nez collé à la vitre, émerveillés. |

**C'est fini quand** les 10 éléments sont validés et envoyés à Maïmouna.

---

## L5 · Les pictogrammes des leçons

Les leçons du 10-12 sont en cours d'écriture. Dès qu'un module est prêt, Lansana t'envoie la liste de ses pictogrammes.
- **Toujours en planches de 9,** jamais un pictogramme par image.
- **Une planche :** 1536 × 1536 px, fond blanc, une grille invisible de 3 × 3 cases de 512 px.
- **Dans chaque case :** un objet centré, 60 px de blanc autour, aucun trait, aucun numéro, aucune lettre.
- **Ordre des cases :** de gauche à droite, puis de haut en bas, dans l'ordre de la liste.
- **Nom :** `1012-pictos-a1-01.png`, `1012-pictos-a1-02.png`…
- Le dessin doit occuper au moins la moitié de sa case, et se comprendre en une seconde.

**En attendant la liste,** prépare la planche des pictogrammes de base, qui serviront dans tout le parcours : `1012-pictos-base-01.png`. Dans l'ordre des cases :
1. un téléphone ;
2. un ordinateur portable ;
3. un petit robot souriant (symbole « IA »), qui ne ressemble pas à Palou ;
4. une ampoule allumée ;
5. une loupe ;
6. un cadenas fermé ;
7. une bulle de parole ;
8. un appareil photo ;
9. une coche verte dans un rond.

---

## Ordre de travail

1. **L1,** en commençant par l'essai de Palou à 10-12 ans.
2. **L2,** les émotes de Palou.
3. **L4,** les éléments pour les vidéos, dont Maïmouna a besoin vite.
4. **L3,** les personnages des lieux, module par module.
5. **L5,** les pictogrammes.

Si ton quota d'images s'épuise, note dans ton rapport où tu t'es arrêtée, et reprends exactement là.

## Ton rapport

Tiens à jour `taches/rapports/RAPPORT_Louise-Sophie.md` sur ta branche, comme décrit dans le guide. Indique :
- les fichiers produits ;
- le prompt type de chaque série ;
- les images dont tu n'es pas satisfaite ;
- tes questions.
