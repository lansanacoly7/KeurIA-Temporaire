# Île 1 « Bonjour, l'IA ! » — l'île pilote (à donner à Antigravity)

C'est la première île, celle qui sert de **norme** pour toutes les autres. Elle remplace entièrement l'intérieur actuel d'`interieur-01-*` (qui est trop vide et ne ressemble pas à un monde).

**L'idée.** Quand l'enfant entre dans l'île, il ne voit pas « des objets posés sur un sol » : il **voyage à travers 4 lieux**, un par cours. Palou marche de l'un à l'autre, la caméra le suit, et chaque lieu est une **scène complète, vivante et riche**, vue de face à hauteur d'enfant. Chaque scène est faite de **5 plans superposés** qui glissent à des vitesses différentes (profondeur).

> **Correction importante du drapeau.** Le drapeau du Sénégal est **vert – jaune – rouge, avec une ÉTOILE VERTE À CINQ BRANCHES au centre de la bande jaune**. Les versions précédentes l'ont dessiné sans étoile, ce qui donne le drapeau du Mali. **À chaque fois qu'un drapeau apparaît : l'étoile verte au centre est obligatoire.**

Mêmes règles qu'avant : **même style que l'île vue de loin** (`ile-01.webp` en référence, à régénérer aussi avec la bonne étoile), aucun texte, WebP uniquement, noms exacts, dossier `frontend/public/images/parcours79/voyage/ile1/`.

---

## 1. Le principe des plans (valable pour les 4 scènes)

Chaque scène = **5 images de même taille, 16:9 (1920 × 1080 si possible, 1376 × 768 au minimum), parfaitement alignées** : même cadrage, même horizon, même sol. Elles se superposent exactement.

| N° | Nom | Fond | Contenu |
|---|---|---|---|
| 1 | `fond` | opaque | ciel et mer au loin, l'horizon, des îlots minuscules. **Horizon à 42 % de la hauteur.** |
| 2 | `lointain` | transparent | décors très éloignés (silhouettes de palmiers, de toits, de collines), légèrement voilés par la brume. Rien dans le bas de l'image. |
| 3 | `decor` | transparent | le grand décor du lieu : bâtiments, arbres, murs, grandes structures. Le sol commence vers 62 % de la hauteur. |
| 4 | `scene` | transparent | le sol et **tout ce qu'on voit de près et qui raconte le cours** : objets, meubles, accessoires. Détails riches, mais **les 4 lieux ne se ressemblent pas**. |
| 5 | `avant` | transparent | **uniquement** quelques éléments tout proches, **dans le bas de 12 % de l'image** (feuilles, herbes, fleurs). **Léger, jamais envahissant.** Tout le reste transparent. |

**Quatre scènes :** `s1` (le portail), `s2` (la salle de classe), `s3` (la cour), `s4` (le jardin).
Noms : `ile1/s1-fond.webp`, `ile1/s1-lointain.webp`, `ile1/s1-decor.webp`, `ile1/s1-scene.webp`, `ile1/s1-avant.webp`, puis `s2-…`, `s3-…`, `s4-…`. **Total : 20 images.**

**Ce qui doit être très différent d'une scène à l'autre :** l'ambiance de lumière, la dominante de couleur, et le décor. En revanche, un **fil rouge** les relie : le **chemin de terre rouge**, le **baobab**, le **drapeau**, qu'on revoit d'une scène à l'autre depuis un autre angle. C'est ce qui fait « qu'on se sent vraiment dans la même île ».

### Bloc STYLE à coller au début de chaque prompt

```
STYLE: stylized cartoon illustration for a children's educational game, soft 3D look like a modern Nintendo game (Animal Crossing), exactly the same art style, colors and rendering as the reference island image, clean rounded shapes, bright saturated but gentle colors, soft daylight from the upper left, soft shadows, no outlines, smooth gradients, extremely rich in small details, cheerful, warm and lively, West African (Senegal) atmosphere. Any flag shown is the flag of SENEGAL: three vertical bands green, yellow, red, with ONE GREEN FIVE-POINTED STAR in the center of the yellow band. No text, no letters, no numbers, no logos, no watermark, no signature. Seen from the front at child eye level, never from above.
```

### Début commun à ajouter selon le plan

- **fond :** `Layer 1 of 5, background only: sky, soft clouds, distant calm turquoise sea, horizon exactly at 42% of the height, tiny faraway islets, no land in front. Fully opaque. Mood matching the scene:`
- **lointain :** `Layer 2 of 5, distant scenery only, on a fully transparent background: far-away silhouettes (palm trees, rooftops, low hills) slightly hazy and bluish like atmospheric perspective, only between 35% and 62% of the height. Everything else transparent. Scene:`
- **decor :** `Layer 3 of 5, main set, on a fully transparent background: the big structures of the place (buildings, large trees, walls) standing on the ground that begins at about 62% of the height. Nothing in the sky area. Scene:`
- **scene :** `Layer 4 of 5, close props and ground, on a fully transparent background: the ground (starting at about 62% of the height, down to the bottom) and everything near the viewer that tells the story of the place. Very rich in details. Scene:`
- **avant :** `Layer 5 of 5, foreground only, on a fully transparent background: a FEW small discreet foreground elements in the bottom 12% of the image only (grass tufts, a leaf, small flowers), with large empty gaps. Everything else transparent. It must never hide the scene. Plants matching:`

---

## 2. Les 4 scènes

**Scène 1 — Le portail de l'école (cours 1 : « C'est quoi une IA ? »)**
Ambiance : matin doré, chaude, pleine d'attente. Dominante : ocre, jaune, vert tendre.
`The entrance of a Senegalese primary school at the start of the morning: a wide open gate in a whitewashed wall painted with a cheerful colorful frieze of animals (no letters), a path of red earth leading in, a tall baobab beside the gate, a flag pole with the SENEGAL flag (green-yellow-red with the green star), a big wooden delivery crate that has just arrived, slightly open, glowing softly with golden sparkles, a handcart next to it, school bags lined up on a low wall, a bicycle, flowering bougainvillea over the wall, a water jar, coconut palms, chickens.`

**Scène 2 — La salle de classe (cours 2 : « Comment apprend une IA ? »)**
Ambiance : douce, studieuse, lumière qui traverse les persiennes. Dominante : bois chaud, vert d'ardoise, rayons de soleil.
`The inside of a bright Senegalese primary classroom seen from the front: a big blackboard on the wall with simple chalk drawings of circles, squares and triangles (no letters), rows of small wooden desks and benches, colorful children's paintings and a world map pinned on the walls (no text), shelves full of picture books, a pile of books on a stool, a teacher's desk with a plant, an open window with green shutters showing palms and sea, sunbeams crossing the room with floating dust, a ceiling fan, a small wooden abacus, a globe.`

**Scène 3 — La cour de récréation (cours 3 : « IA ou pas IA ? »)**
Ambiance : joyeuse, énergique, pleine de jeu. Dominante : orange, turquoise, jaune.
`The sandy schoolyard at recess: hopscotch and a circle game drawn on the ground, two big wooden doors side by side, one green and one orange, standing as a sorting game, a tall wooden school bell on a carved post, a long row of colorful school bags on a bench, a mango tree with a tire swing, a water tap with a bucket, a ball, skipping ropes, a low wall painted with a colorful mural of animals and suns (no letters), a ramp of colorful flags (Senegal flag with the green star among them), palms and a baobab behind.`

**Scène 4 — Le jardin et la chasse aux IA (cours 4 : « Ma chasse aux IA »)**
Ambiance : aventure, mystère doux, fin d'après-midi. Dominante : verts profonds, violet, or.
`A lush school garden at golden hour, set up like a treasure hunt: raised vegetable beds, a wooden watchtower with a rope ladder, a giant magnifying glass leaning on a small treasure map lying on a table, a basket of colorful clues, footprints on the path, a scarecrow, butterflies, fireflies starting to glow, a pond with lily pads, a wooden bridge, a hammock between two palm trees, a small greenhouse, tall grasses, mango and papaya trees, the baobab and the flag with the green star seen from another angle in the distance.`

---

## 3. Les personnages (pour que ça vive)

**12 personnages sur fond transparent**, tous **dans le même style**, debout, vus de face ou de trois quarts, à **hauteur égale** (environ 900 px), un geste naturel. **Aucun texte, aucun logo.** Nom : `ile1/perso-N-nom.webp`.

| Fichier | Personnage |
|---|---|
| `perso-1-ecoliere.webp` | une écolière souriante en tablier bleu et blanc, cartable sur le dos, qui salue |
| `perso-2-ecolier.webp` | un écolier en tablier, qui lève la main |
| `perso-3-maitresse.webp` | une maîtresse en boubou coloré, lunettes, qui tient un livre |
| `perso-4-ecolieres-jeu.webp` | deux petites filles qui sautent à la corde |
| `perso-5-ecolier-ballon.webp` | un garçon qui joue au ballon |
| `perso-6-ecoliers-lecture.webp` | deux enfants assis qui lisent un livre ensemble |
| `perso-7-directeur.webp` | un directeur d'école âgé et bienveillant, en boubou, avec une canne |
| `perso-8-jardinier.webp` | un jardinier avec un arrosoir et un chapeau de paille |
| `perso-9-cuisiniere.webp` | une femme qui porte un panier de mangues sur la tête |
| `perso-10-curieux.webp` | un enfant penché sur la caisse, en train de regarder dedans |
| `perso-11-detective.webp` | une petite fille détective avec une loupe |
| `perso-12-livreur.webp` | un livreur à vélo, qui s'éloigne |

```
[STYLE] One single friendly character for a children's educational game, standing, seen from the front or three-quarter, centered, full body, about 900 pixels tall, a natural cheerful gesture, fully transparent background, no shadow on the ground. The character:
```

---

## 4. Vérification avant de livrer

- **Les 5 plans d'une scène s'emboîtent :** même taille, même horizon (42 %), même sol (62 %). Pour le vérifier, les superposer à 50 % d'opacité : rien ne doit se décaler.
- **Les 4 scènes sont très différentes** l'une de l'autre en lumière et en décor, mais on y retrouve **le baobab, le chemin rouge et le drapeau** (avec l'étoile verte).
- **Le plan `avant` est léger.** Rien au-dessus des 12 % du bas.
- **Fonds transparents propres** : tester sur fond foncé, sans carré blanc ni halo.
- **Aucun texte**, **drapeau du Sénégal correct** (étoile verte).
- 20 images de scène + 12 personnages. **Poids visés :** plans < 500 Ko, personnages < 120 Ko. WebP uniquement.
