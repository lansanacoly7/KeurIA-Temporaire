# Images du voyage d'île en île (parcours 7-9 ans)

Ce document sert à générer les images du nouveau voyage entre les îles. Il est rédigé pour être donné tel quel à un générateur d'images (Antigravity).

**Ce qu'on fabrique.** L'enfant voit une seule île en grand, celle du chapitre en cours. Quand il termine un chapitre, un « saut » animé l'emmène vers l'île suivante :

1. l'île terminée passe devant l'écran ;
2. la caméra fonce au-dessus de la mer ;
3. la nouvelle île surgit au loin et grandit jusqu'à remplir l'écran.

L'animation est faite en code. Ces images sont les **couches** que le code anime.

Références de style : l'île en 3D cartoon (lagon turquoise, sable blanc, arbres ronds), l'île au loin avec les rayons de soleil, et la mer d'Animal Crossing.

---

## 1. Règles pour TOUTES les images (à respecter strictement)

- **Même style partout.** Commencer chaque génération par le bloc STYLE ci-dessous, mot pour mot.
- **Générer l'île 1 en premier**, la valider, puis la donner comme **image de référence de style** pour toutes les autres.
- **Aucun texte**, aucune lettre, aucun chiffre, aucun logo, aucune marque (pas de WhatsApp, etc.), aucun filigrane.
- **Personnages et animaux :**
  - pas de personnage principal (Palou le lion est ajouté par le code) ;
  - au plus 2 ou 3 silhouettes humaines **minuscules**, et uniquement si c'est précisé.
- **Même lumière :** soleil en haut à gauche, lumière de fin de matinée, ombres douces vers le bas à droite.
- **Même angle de caméra pour les 10 îles :** vue aérienne de trois quarts, en plongée d'environ 35°, île centrée.
- **Même taille :** l'île (sable compris) occupe environ 60 % de la largeur de l'image.
- **Fond transparent** pour les îles et les nuages (PNG avec transparence), sauf indication contraire.

### Bloc STYLE (à coller au début de chaque prompt)

```
STYLE: stylized cartoon illustration for a children's educational game, soft 3D look like a modern Nintendo game (Animal Crossing, Wind Waker), clean rounded shapes, bright saturated but gentle colors, turquoise lagoon water with visible coral shapes, white-cream sand beach with a thin white foam line, lush rounded tropical trees and coconut palms, soft daylight from the upper left, soft shadows to the lower right, no outlines, smooth gradients, cheerful and warm, West African (Senegal) atmosphere. No text, no letters, no numbers, no logos, no watermark, no signature.
```

---

## 2. Les couches du décor (communes à toutes les îles)

Format : **WebP ou PNG**, deux versions de chaque :
- **paysage** : 2560 × 1440 (ordinateur) ;
- **portrait** : 1440 × 2560 (téléphone).

Dossier : `frontend/public/images/parcours79/voyage/`

### 2.1 Le ciel — `ciel-paysage.webp` / `ciel-portrait.webp` (fond opaque)

```
[STYLE] A bright tropical sky only, no sea, no land. Deep blue at the top fading to light sky blue near the bottom, soft diagonal sun rays coming from the upper left, a few soft lens-light bokeh circles, large fluffy white cumulus clouds low near the bottom edge on the left and on the right, leaving the center open. Calm, airy, joyful.
```

### 2.2 La mer — `mer-paysage.webp` / `mer-portrait.webp` (transparent au-dessus de l'horizon)

```
[STYLE] An open ocean seen from slightly above, the horizon line is perfectly straight and horizontal at 38% from the top of the image; everything above the horizon is fully transparent. Near the horizon the water is light turquoise and very calm, getting deeper blue toward the bottom of the image. Stylized flat water patterns: soft rounded lighter-blue reflection shapes on the surface, a few long thin white wave streaks, a few small sparkles of sunlight, large soft darker-blue shadow shapes of the sea floor under the water (like Animal Crossing). No island, no boat, no land.
```

### 2.3 Nuages du premier plan — `nuages-avant.webp` (2560 × 1440, transparent)

Ces nuages passent devant la caméra pendant le saut.

```
[STYLE] Three or four very large, soft, fluffy white clouds seen up close, with gentle pale-blue shading, on a fully transparent background. The clouds are placed at the edges of the image (left, right and bottom corners), the center stays empty and transparent.
```

### 2.4 Petits nuages — `nuage-1.webp`, `nuage-2.webp`, `nuage-3.webp` (1024 × 512, transparent)

```
[STYLE] One single soft fluffy white cumulus cloud, slightly different shape each time, gentle pale-blue shading at the bottom, centered, on a fully transparent background.
```

---

## 3. Les 10 îles — `ile-01.webp` … `ile-10.webp`

Format : **2048 × 2048**, **fond transparent**. L'île est au centre, entourée de son **lagon peu profond turquoise** et d'une fine ligne d'écume blanche. Le lagon **s'efface progressivement en transparence** sur ses bords, pour que l'île se pose sur n'importe quelle mer. Pas de ciel, pas d'horizon, pas de nuages.

Dossier : `frontend/public/images/parcours79/voyage/`

**Début commun à coller avant chaque île :**

```
[STYLE] One single small tropical island seen from a 3/4 aerial view (camera looking down about 35 degrees), centered, occupying about 60% of the image width. White-cream sand beach all around with a thin white foam line, surrounded by a shallow turquoise lagoon with a few soft coral shapes and two small rocks; the lagoon fades smoothly into full transparency at its edges. Fully transparent background, no sky, no horizon, no clouds. The island tells a story:
```

Puis ajouter la description de l'île :

**Île 1 — `ile-01.webp` — « Bonjour, l'IA ! » (la cour de l'école)**
```
a small cheerful Senegalese primary school building with ochre walls, green window shutters and a small roof, a flag pole with the flag of Senegal (three vertical bands green, yellow, red, with one green five-pointed star in the center of the yellow band), a sandy schoolyard where a big wooden delivery crate stands slightly open with a soft magical glow coming out of it, one baobab tree and two coconut palms.
```

**Île 2 — `ile-02.webp` — « L'IA autour de moi » (le car de Papa Ibou)**
```
a small curvy road crossing the island with a colorful Dakar "car rapide" minibus painted yellow and blue with decorative patterns (no text), a tiny traffic light, a small phone antenna mast, a bus stop shelter, a few palms and bushes.
```

**Île 3 — `ile-03.webp` — « La grande famille des données » (le marché et la bibliothèque)**
```
a lively little open-air market with three colorful stalls under striped awnings, baskets full of mangoes, bananas, oranges and tomatoes neatly sorted by color, plus a small open wooden library kiosk with shelves of colorful books, a few palms.
```

**Île 4 — `ile-04.webp` — « Apprendre avec des exemples » (Guet Ndar, Saint-Louis)**
```
a fishing village beach with three long colorful painted Senegalese wooden pirogues pulled up on the sand, fishing nets drying on poles, a wooden rack with small fish drying, baskets of fish, a small fisherman's hut, palms.
```

**Île 5 — `ile-05.webp` — « L'IA qui regarde » (le jardin, sous le manguier)**
```
a school vegetable garden with neat green garden beds, a watering can, a small wooden fence, and in the center one big generous mango tree full of orange-yellow mangoes; one leaf of the tree is slightly yellow-spotted; a small wooden bench under the tree.
```

**Île 6 — `ile-06.webp` — « L'IA qui parle » (Ziguinchor, en Casamance)**
```
a lush green Casamance landscape with tall palms and a big kapok tree, a traditional round Casamance house with a thatched roof (case à impluvium), a small wooden jetty on a calm river mouth with a little canoe, and a small radio antenna on a pole sending gentle wave signals.
```

**Île 7 — `ile-07.webp` — « Créer avec l'IA » (la journée Set Setal)**
```
a small classroom building whose outside wall is covered with a big joyful colorful painted mural of abstract shapes, sun and flowers (no letters), two wooden easels with paintings, paint pots, and a few brooms and a wheelbarrow for the neighborhood clean-up day, palms.
```

**Île 8 — `ile-08.webp` — « Mon bouclier numérique » (protéger ses secrets)**
```
a cozy small lighthouse-like watchtower painted white and green with a big rounded shield emblem on its front (a simple golden shield shape, no symbol, no text), a low protective stone wall around a little garden, a small treasure chest closed with a padlock, palms.
```

**Île 9 — `ile-09.webp` — « Vrai, faux… vérifions ! » (le détective de l'école)**
```
a schoolyard corner with a small wooden detective observation tower holding a giant magnifying glass, two signposts side by side, one with a big green check-mark shape and one with a big red cross shape (shapes only, no text), a few palms and a bench.
```

**Île 10 — `ile-10.webp` — « Une IA pour mon quartier » (la place du quartier en fête)**
```
a colorful Senegalese neighborhood square on a festival day: four small houses in bright pastel colors, strings of colorful triangular bunting flags between them, three recycling bins in green, yellow and blue, a small wooden stage, a big shady tree, palms.
```

---

## 4. Vérification avant de livrer

- Les 10 îles ont **le même angle, la même lumière et la même taille**. Pour s'en assurer, les mettre côte à côte.
- Le **fond est vraiment transparent**. Tester en les posant sur un fond foncé : il ne doit rester ni carré blanc ni halo.
- **Aucun texte** nulle part.
- Les fichiers sont nommés **exactement** comme indiqué, dans `frontend/public/images/parcours79/voyage/`.
- Poids : viser **moins de 400 Ko par île** (WebP qualité ~85), sinon le téléphone d'un enfant met trop de temps à charger.
