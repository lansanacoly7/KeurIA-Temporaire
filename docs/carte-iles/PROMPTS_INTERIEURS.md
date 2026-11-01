# Images de l'intérieur des îles (parcours 7-9 ans)

Ce document est à donner à Antigravity pour générer les images de **l'intérieur des îles**. Il complète `PROMPTS_IMAGES.md`, qui a servi aux îles vues de loin.

**Ce qu'on fabrique.** Quand l'enfant touche son île, la caméra plonge dedans. Il se retrouve **debout sur l'île**, et la regarde **de face, à hauteur d'enfant**, comme un décor de jeu vidéo de plateforme. Il fait défiler l'île de gauche à droite. On y trouve **4 endroits**, un par cours du module :
- Palou marche d'un endroit à l'autre ;
- l'enfant touche un endroit pour lancer le cours.

**Le plus important :**
- **Même style que l'île vue de loin.** L'intérieur est la même île, vue de près : mêmes bâtiments, mêmes arbres, mêmes couleurs, même rendu. Donner l'île correspondante (`ile-01.webp` … `ile-10.webp`) comme **image de référence de style** à chaque génération.
- **Beaucoup plus de détails qu'à l'extérieur :** objets, plantes, fleurs, petits animaux, textures, petits accessoires partout. L'île doit paraître **vivante et habitée**.
- **Vue de face, à hauteur d'enfant.** Jamais de vue du ciel, jamais de plongée. On voit les façades, les troncs, les étals de face, et le ciel au-dessus.
- **Chaque intérieur est unique :** décor, ambiance et couleurs différents d'une île à l'autre.

---

## 1. Les couches

Chaque intérieur est livré en **3 couches** de **même taille, 4096 × 1536** (très large, il défile horizontalement). Le code les superpose et les fait glisser à des vitesses différentes, ce qui crée la profondeur. Les 3 couches doivent donc **s'emboîter parfaitement** : même cadrage, même horizon.

| Couche | Fichier | Fond | Contenu |
|---|---|---|---|
| Fond | `interieur-XX-fond.webp` | opaque | le ciel, la mer au loin, l'horizon (îlots lointains, petits bateaux). **Horizon à 45 % de la hauteur.** Rien de l'île elle-même. |
| Milieu | `interieur-XX-milieu.webp` | **transparent** au-dessus de l'île | l'île vue de face, très détaillée, avec les **4 endroits** dessinés dedans. Le sol commence vers 55 % de la hauteur et va jusqu'en bas ; les bâtiments et les arbres montent dans le ciel. |
| Premier plan | `interieur-XX-avant.webp` | **transparent** | uniquement des éléments tout proches, **dans le quart du bas** : grandes feuilles, fleurs, touffes d'herbe, rochers, avec des trous entre eux. Tout le reste de l'image est transparent. |

**Les 4 endroits, sur la couche du milieu :**
- de gauche à droite, centrés à peu près à **12 %, 37 %, 63 % et 88 % de la largeur** ;
- chacun **bien distinct et reconnaissable au premier coup d'œil**, au premier rang, posé au sol, de face ;
- ce sont les endroits que l'enfant touche, donc ils ne doivent pas être cachés par des arbres.

Les bords gauche et droit de la couche du milieu montrent la plage, pour qu'on sente qu'on est sur une île.

**Nommage :** XX est le numéro de l'île, de 01 à 10. Exemples : `interieur-04-fond.webp`, `interieur-04-milieu.webp`, `interieur-04-avant.webp`.

---

## 2. Les éléments de vie (communs à toutes les îles)

Le code les anime par-dessus le décor. Format WebP, **fond transparent**.

| Fichier | Taille | Contenu |
|---|---|---|
| `vie-nuage-1.webp` | 1024 × 512 | un nuage doux, isolé |
| `vie-nuage-2.webp` | 1024 × 512 | un autre nuage, de forme différente |
| `vie-oiseau.webp` | 256 × 256 | une petite mouette en vol, vue de côté, ailes ouvertes |

---

## 3. Règles pour TOUTES les images

- **Aucun texte**, aucune lettre, aucun chiffre, aucun logo, aucun filigrane.
- **Personnages :** pas de personnage principal (Palou est ajouté par le code). Au plus 2 ou 3 silhouettes humaines **minuscules** au loin. Les petits animaux sont bienvenus : poules, chèvres, chat, papillons, crabes sur la plage.
- **Format WebP uniquement**, qualité ~85. Pas de copies `.jpg` ou `.png` à côté.
- **Poids visés :**
  - couche du fond : moins de 400 Ko ;
  - couche du milieu : moins de 900 Ko ;
  - premier plan : moins de 300 Ko ;
  - éléments de vie : moins de 60 Ko.
- Dossier : `frontend/public/images/parcours79/voyage/`.

### Bloc STYLE (à coller au début de chaque prompt)

```
STYLE: stylized cartoon illustration for a children's educational game, soft 3D look like a modern Nintendo game (Animal Crossing), exactly the same art style, colors and rendering as the reference island image, clean rounded shapes, bright saturated but gentle colors, soft daylight from the upper left, soft shadows, no outlines, smooth gradients, very rich in small details, cheerful, warm and lively, West African (Senegal) atmosphere. No text, no letters, no numbers, no logos, no watermark, no signature.
```

### Début commun pour la couche du MILIEU

```
[STYLE] A very wide side-scrolling game background layer (4096x1536, aspect 8:3) showing the inside of one small tropical island, seen FROM THE FRONT at child eye level, as if standing on the island and looking straight ahead (no top-down view, no aerial view). Fully transparent above the island: no sky, no sea in the background. The ground starts at about 55% of the image height and goes down to the bottom. The far left and far right edges show the beach. Very rich in details everywhere: plants, flowers, small props, little animals, textures. Four distinct, clearly recognizable landmarks stand in the front row, from left to right, centered at about 12%, 37%, 63% and 88% of the width, never hidden by trees. The island:
```

### Début commun pour la couche du FOND

```
[STYLE] A very wide side-scrolling game background (4096x1536, aspect 8:3): only the sky and the distant sea, seen from eye level. A bright blue sky with soft clouds and gentle sun rays from the upper left; the horizon line is perfectly straight at 45% of the image height; below it, calm turquoise sea getting a bit deeper toward the bottom, with a few tiny distant islets and one or two tiny boats far away. No island in the foreground, no land. Color mood matching:
```

### Début commun pour le PREMIER PLAN

```
[STYLE] A very wide side-scrolling game foreground layer (4096x1536, aspect 8:3) on a fully transparent background: only very close foreground elements along the bottom quarter of the image, seen from eye level, slightly out of focus: big tropical leaves, flowers, grass tufts and rounded rocks, with gaps between them. Everything above the bottom quarter is fully transparent. Plants matching:
```

---

## 4. Les 10 îles

Pour chaque île, générer les 3 couches. Coller le début commun de la couche, puis la description de l'île ci-dessous. Pour la couche du milieu, coller la description complète avec ses 4 endroits.

**Île 1 — « Bonjour, l'IA ! » : la cour de l'école**
- Décor : a cheerful Senegalese primary school courtyard, ochre walls with green shutters, a flag pole with the flag of Senegal (three vertical bands green, yellow, red, with one green five-pointed star in the center of the yellow band), a big baobab, coconut palms, hopscotch drawn on the ground, school benches, a water fountain, chickens. Color mood: warm ochre, leafy green, sunny yellow.
- 4 endroits : (1) a big wooden delivery crate slightly open with a soft magical glow coming out; (2) an outdoor blackboard on an easel with chalk drawings of simple shapes (no letters) and a stack of books; (3) two small wooden doors side by side, one green and one orange, like a sorting game; (4) a treasure-hunt corner with a giant magnifying glass leaning on a small treasure map and a basket.

**Île 2 — « L'IA autour de moi » : le car de Papa Ibou**
- Décor : a lively little Dakar street, small shops with colorful awnings, a bus stop shelter, a phone antenna mast, a traffic light, a fruit cart, a sleeping cat, palms. Color mood: bright yellow, cobalt blue, warm grey.
- 4 endroits : (1) a giant friendly smartphone standing upright like a kiosk, screen showing colorful app shapes (no text); (2) a small classroom with an open door and a colorful window; (3) a colorful yellow-and-blue Dakar "car rapide" minibus (no text); (4) a big colorful bingo board of 9 square tiles with simple pictures (no letters, no numbers).

**Île 3 — « La grande famille des données » : le marché Kermel et la bibliothèque**
- Décor : a colorful open-air market, stalls under striped awnings, piles of colorful fabrics, hanging baskets, spice sacks, a library corner. Color mood: orange, red, mango yellow, fabric patterns.
- 4 endroits : (1) a small open-air library kiosk with shelves of colorful books; (2) a big woven basket overflowing with mangoes, bananas and oranges; (3) a stall with a row of identical red tomatoes and one green mango among them; (4) three wooden crates of different colors, each holding one kind of fruit, neatly sorted.

**Île 4 — « Apprendre avec des exemples » : Guet Ndar, à Saint-Louis**
- Décor : a fishing village beach, long colorful painted wooden pirogues, fishing nets on poles, baskets of fish, a fisherman's hut, seagulls, crabs on the sand. Color mood: sea turquoise, pirogue reds and greens, sandy beige.
- 4 endroits : (1) a fish-drying rack with several kinds of small fish in neat rows; (2) a cozy little kennel and a cat basket side by side (empty); (3) a pirogue with a funny mix-up: a basket of fish and a basket of shoes on board; (4) a small workbench with a cute toy robot made of wood and metal, and tools.

**Île 5 — « L'IA qui regarde » : le jardin de l'école, sous le manguier**
- Décor : a lush school vegetable garden, raised garden beds with lettuces, tomatoes and onions, watering cans, a little wooden fence, a scarecrow, butterflies, and one big generous mango tree full of mangoes. Color mood: many fresh greens, mango orange, earth brown.
- 4 endroits : (1) a pair of giant binoculars on a small wooden stand; (2) colorful garden sculptures: a red circle, a blue square and a yellow triangle; (3) a vintage camera on a tripod with a photo print hanging on a string; (4) a big mango leaf on a stand under a giant magnifying glass.

**Île 6 — « L'IA qui parle » : Ziguinchor, en Casamance**
- Décor : a lush green Casamance landscape, tall palms, a giant kapok tree, a traditional round house with a thatched roof (case à impluvium), a calm river with a wooden jetty and a small canoe, rice fields, goats. Color mood: deep jungle greens, river blue, thatch gold.
- 4 endroits : (1) a friendly round smart-speaker shaped like a little hut, with sound waves; (2) a small wooden stage with a microphone on a stand and floating musical notes; (3) a big wooden signpost with arrows pointing in different directions (no text); (4) two little round huts facing each other with a big empty speech-bubble shape between them.

**Île 7 — « Créer avec l'IA » : la classe, pour la journée Set Setal**
- Décor : a creative neighborhood corner on clean-up day, a long wall with a joyful colorful mural of abstract shapes, suns and flowers (no letters), paint pots and brushes, brooms and a wheelbarrow, flower pots. Color mood: rainbow of bright paint colors on white walls.
- 4 endroits : (1) a painter's easel with a colorful dreamy painting and floating sparkles; (2) a table with paper, crayons and a half-finished drawing of a sun and a house; (3) a giant open storybook standing upright with colorful pictures (no text); (4) a big colorful poster board on two legs with bright shapes (no text).

**Île 8 — « Mon bouclier numérique » : protéger les secrets de tous**
- Décor : a cozy protected garden, a white-and-green lighthouse-like watchtower with a plain golden shield emblem (no symbol), a low stone wall, neatly trimmed hedges, a gate with a little guard booth, lanterns. Color mood: calm teal green, white, gold accents.
- 4 endroits : (1) a small treasure chest closed with a big padlock; (2) a little mailbox with a gate that can open or close; (3) a cozy small house with a warm lit window and a bench at the door; (4) a big plain golden shield on a stand with small flags around.

**Île 9 — « Vrai, faux… vérifions ! » : le détective de l'école**
- Décor : a detective-themed schoolyard, a small wooden observation tower, a notice board with blank colorful pinned papers (no text), footprints on the ground, lamp posts, a bench under a tree. Color mood: purple and amber detective tones with green and red accents.
- 4 endroits : (1) a little robot workshop with a question-mark shaped lamp (shape only); (2) a detective's desk with a big magnifying glass and two papers side by side; (3) a photo stand with two picture frames side by side, one slightly different; (4) two signposts, a big green check-mark shape and a big red cross shape (shapes only).

**Île 10 — « Une IA pour mon quartier » : la place du quartier, le jour de la fête**
- Décor : a colorful Senegalese neighborhood square on a festival day, small houses in bright pastel colors, strings of colorful triangular bunting flags, a big shady tree, drums, flower pots, three recycling bins (green, yellow, blue). Color mood: festive pastels, bunting rainbow, warm light.
- 4 endroits : (1) a small pile of litter next to an overflowing bin, with a little broom; (2) a glowing light-bulb shaped lamp on a stand among small green, yellow and red flags; (3) a drawing table with a big sheet showing a simple invention sketch (no text); (4) a small festival stage with colorful bunting and a trophy on a pedestal.

---

## 5. Vérification avant de livrer

- **Vue de face, à hauteur d'enfant.** Pas de vue du dessus.
- **Même style que l'île vue de loin.** Pour vérifier, poser les deux images côte à côte.
- **Les 3 couches s'emboîtent :**
  - même taille ;
  - l'horizon du fond est bien à 45 % ;
  - le haut de la couche du milieu et la majeure partie du premier plan sont vraiment transparents. Tester sur fond foncé : il ne doit rester ni carré blanc ni halo.
- **Les 4 endroits sont bien visibles**, dans l'ordre de gauche à droite, non cachés.
- **Chaque intérieur a ses propres couleurs et son propre décor**, très détaillé.
- **Aucun texte** nulle part.
- **Noms de fichiers exacts, WebP uniquement.**
