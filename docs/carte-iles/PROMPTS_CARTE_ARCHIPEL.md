# La grande carte de l'archipel (à donner à Antigravity)

**Le principe.** L'enfant voit **une seule grande carte** avec **les 10 îles du parcours**, posées sur la mer, du rivage (les premiers modules) vers le large (les derniers). Il touche une île : un panneau s'ouvre avec **4 cartes de cours** (leçon 1 à 4). Quand il finit les 4 cours, Palou voyage vers l'île suivante, qui se débloque.

Le code ajoute par-dessus l'illustration : le chemin en pointillés, les noms, les étoiles, les cadenas, Palou, les nuages qui voilent les îles pas encore atteintes, et les zones à toucher. **L'image ne contient donc aucun texte, aucun chemin, aucun personnage.**

Mêmes règles qu'avant : **même style que les îles déjà livrées** (`ile-01.webp` … `ile-10.webp` en références), **aucun texte, aucune lettre, aucun chiffre, aucun logo**, WebP uniquement, dossier `frontend/public/images/parcours79/voyage/`. Le drapeau du Sénégal, s'il apparaît, a une **étoile verte à cinq branches** au centre de la bande jaune.

## Les fichiers

| Fichier | Format | Usage |
|---|---|---|
| `archipel-paysage.webp` | **2560 × 1440** (16:9), opaque | ordinateur et tablette |
| `archipel-portrait.webp` | **1440 × 2880** (1:2), opaque | téléphone (l'enfant fait défiler vers le bas) |

Poids visé : **moins de 600 Ko chacun**.

## Références visuelles (les captures envoyées)

- **L'archipel vectoriel (Fiverr)** : 10 îles distinctes, vue de trois quarts en légère plongée, sur une mer turquoise, chacune avec sa personnalité. C'est **la composition à reproduire**.
- **Ocean Island (medium.com)** : pour l'ambiance, la douceur de la lumière et les petits détails.

## Composition à respecter strictement

1. **10 îles, bien séparées par de l'eau** (au moins une largeur d'île entre deux îles voisines). Chaque île tient dans un espace de **12 % à 16 % de la largeur** et peut être **recouverte d'un nuage** par le code : **de l'eau libre tout autour de chaque île**.
2. **L'ordre du voyage va du rivage vers le large.**
   - **Paysage :** les îles 1 à 3 sont au premier plan, en bas à gauche, près d'une côte de sable et d'un petit port ; les îles suivantes montent en zigzag vers le haut et la droite ; l'île 10 est la plus lointaine, en haut à droite, au large, dans une lumière dorée.
   - **Portrait :** même logique en vertical : l'île 1 en bas, l'île 10 tout en haut. Les îles zigzaguent gauche-droite-gauche.
3. **Chaque île est reconnaissable** (voir la liste ci-dessous) et **de taille un peu décroissante** vers le large (effet de profondeur), mais **toutes restent bien lisibles**.
4. **Le chemin entre les îles n'est PAS dessiné** : de l'eau libre entre elles, que le code recouvrira de pointillés.
5. **Aucune île ne doit toucher le bord de l'image.** Marge d'au moins 5 % autour.
5 bis. **Version paysage : les 10 îles restent TOUTES dans les 70 % du HAUT de l'image** (entre 8 % et 68 % de la hauteur). **Le quart du bas (de 72 % à 100 %) est de la mer libre**, sans aucune île : l'interface des 4 cartes de cours viendra s'y poser. On peut y mettre seulement quelques vagues, un petit port ou une côte de sable en bas à gauche.
6. **Décor de mer autour :** quelques petits îlots de palmiers, des pirogues à voile, un phare lointain, des mouettes, des rochers, de grands nuages doux dans le ciel en haut. **Discret : il ne doit pas ressembler à une île du jeu.**
7. **Pas de personnage, pas de panneau, pas de drapeau en lettres.**
8. **Lumière :** soleil en haut à gauche, ombres douces vers le bas à droite. **Eau :** turquoise clair près du rivage, bleu plus profond au large, avec des motifs doux du fond marin.

## Les 10 îles (de la première à la dernière)

Les îles sont **les mêmes que celles déjà dessinées** (`ile-01.webp` … `ile-10.webp`) : **les reprendre fidèlement**, les redessiner à l'identique du point de vue du style, en les posant dans la composition.

| N° | Île | Reconnaissable à |
|---|---|---|
| 1 | Bonjour, l'IA ! | une petite école avec son drapeau du Sénégal, un baobab, une caisse lumineuse |
| 2 | L'IA autour de moi | une route avec un car rapide jaune et bleu, un feu rouge, un abribus |
| 3 | La grande famille des données | un marché avec étals rayés, paniers de fruits, un coin bibliothèque |
| 4 | Apprendre avec des exemples | une plage de pêcheurs, pirogues colorées, filets, séchoirs à poissons |
| 5 | L'IA qui regarde | un jardin potager avec un grand manguier plein de mangues |
| 6 | L'IA qui parle | une île verte de Casamance, une case ronde au toit de paille, un ponton, une antenne radio |
| 7 | Créer avec l'IA | un mur couvert d'une grande fresque colorée, chevalets, pots de peinture |
| 8 | Mon bouclier numérique | un petit phare blanc et vert avec un bouclier doré, un mur de pierre |
| 9 | Vrai, faux… vérifions ! | une tour d'observation en bois avec une grande loupe, panneaux coche verte et croix rouge (formes seules) |
| 10 | Une IA pour mon quartier | une place en fête, maisons pastel, guirlandes de fanions, trois poubelles de tri |

## Prompt (paysage)

```
STYLE: stylized cartoon illustration for a children's educational game, soft 3D look like a modern Nintendo game (Animal Crossing), same art style, colors and rendering as the reference island images, clean rounded shapes, bright saturated but gentle colors, soft daylight from the upper left, soft shadows to the lower right, no outlines, smooth gradients, cheerful and warm, West African (Senegal) atmosphere. No text, no letters, no numbers, no logos, no watermark, no characters.

A wide game world map of an archipelago, 16:9, fully opaque, seen from a three-quarter aerial view (slightly from above) over a turquoise sea. TEN distinct small islands, clearly separated by open water (at least one island-width of free water between neighbors), arranged in a gentle zigzag path that goes from the bottom-left (near a sandy coast with a tiny harbor) up to the top-right (far out at sea, in golden light). Islands get slightly smaller toward the far end for depth, but all remain very readable. Each island has its own personality: (1) a small school with a baobab and a glowing crate, (2) a road with a yellow-and-blue minibus and a traffic light, (3) a market with striped stalls and fruit baskets, (4) a fishing beach with colorful pirogues and nets, (5) a vegetable garden with a big mango tree, (6) a green island with a round thatched house and a jetty and a radio antenna, (7) a wall with a big colorful mural and easels, (8) a white and green lighthouse with a golden shield, (9) a wooden watchtower with a giant magnifying glass, (10) a festive square with pastel houses, bunting flags and three recycling bins. Water: light turquoise near the coast, deeper blue far out, soft darker shapes of the sea floor, gentle wave streaks and sparkles. Decoration, discreet and clearly NOT game islands: a few tiny palm islets, small sailing pirogues, a faraway lighthouse, seagulls, soft clouds at the top. The water between the islands is EMPTY (a dotted path will be added later). IMPORTANT: all ten islands stay inside the TOP 70% of the image height (between 8% and 68%); the bottom 28% of the image is open water with no island at all. No island touches the image edge (at least 5% margin).
```

## Prompt (portrait)

```
[same STYLE and description as above, but] a TALL portrait version (1:2): island 1 at the BOTTOM near a sandy coast with a tiny harbor, then the islands zigzag left-right-left going UP the image, island 10 at the very TOP in golden light. Same ten islands, same rules (open water around each island, nothing touching the edges, no text, no characters).
```

## Vérification avant de livrer

- **10 îles bien séparées par de l'eau**, chacune reconnaissable. Compter.
- **L'ordre :** paysage du bas-gauche vers le haut-droite, portrait du bas vers le haut.
- **De l'eau libre entre les îles** (pas de pont, pas de chemin dessiné).
- **Aucune île ne touche le bord.**
- **Aucun texte, aucun personnage.**
- **Même style que les îles de référence.**

Ensuite, je mesure la position de chacune des 10 îles sur l'image pour placer les zones à toucher, les cartes de cours, le chemin et les nuages.
