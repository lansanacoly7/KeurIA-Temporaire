# Fond du dehors (quand on voit l'île sur la mer) — à donner à Antigravity

Quand l'enfant voit son île de l'extérieur, le fond actuel (`ciel-paysage` + `mer-paysage`) est joli mais vide. On veut **une seule grande image de fond, plus riche**, avec des **éléments de décor au loin** : de petits bateaux, des îlots minuscules, des oiseaux, des nuages, un phare lointain, une plage lointaine.

**Important : on ne montre JAMAIS l'île suivante au loin.** Ce sont uniquement des éléments de décor, toujours les mêmes, qui ne représentent aucun module.

Mêmes règles que les autres cahiers : même style que les îles (`ile-01.webp` en référence), aucun texte, WebP uniquement, dossier `frontend/public/images/parcours79/voyage/`.

## Les fichiers

| Fichier | Format | Remplace |
|---|---|---|
| `fond-exterieur-paysage.webp` | 1920 × 1080 (16:9), **opaque** | `ciel-paysage` + `mer-paysage` |
| `fond-exterieur-portrait.webp` | 1080 × 1920 (9:16), **opaque** | `ciel-portrait` + `mer-portrait` |

**Cadrage, à respecter strictement :**
- **L'horizon est à 43 % de la hauteur** en paysage (35 % en portrait), parfaitement droit. Le code place l'île sur cet horizon.
- **Le centre de l'image reste dégagé** (zone de 50 % de large au milieu, depuis l'horizon jusqu'en bas) : c'est là que se pose l'île de l'enfant. Les éléments du décor sont **sur les côtés et loin**.
- Une seule image : ciel + mer ensemble, pas de couche transparente.

## Prompt

```
STYLE: stylized cartoon illustration for a children's educational game, soft 3D look like a modern Nintendo game (Animal Crossing), same art style, colors and rendering as the reference island image, clean rounded shapes, bright saturated but gentle colors, soft daylight from the upper left, no outlines, smooth gradients, cheerful and warm. No text, no letters, no numbers, no logos, no watermark.

A wide ocean scene seen from slightly above the water, fully opaque, 16:9. The horizon is a perfectly straight line at exactly 43% of the image height. Above it a bright blue sky fading to pale blue at the horizon, with soft diagonal sun rays from the upper left and big fluffy white clouds, a few seagulls. Below it a calm turquoise sea, lighter near the horizon and deeper blue toward the bottom, with soft darker blue shapes of the sea floor under the water, gentle wave streaks and sparkles of sunlight. FAR AWAY, small and slightly hazy near the horizon, ONLY ON THE LEFT AND RIGHT SIDES: two or three tiny wooden fishing pirogues with colorful sails, a small lighthouse on a tiny rocky islet, two or three very small palm-tree islets, a distant sandy beach with a few palms, a faraway cargo ship silhouette. These distant elements are generic scenery: they must NOT look like the main islands of the game. THE CENTER OF THE IMAGE (the middle 50% of the width, from the horizon down to the bottom) STAYS COMPLETELY EMPTY: just open sea and sky, because a game island will be placed there.
```

Pour la version portrait : même prompt, en précisant **9:16**, **horizon à 35 %**, les éléments lointains **dans les coins gauche et droit** et le centre vide.

## Vérification

- L'horizon est **droit** et tombe bien à **43 %** (35 % en portrait).
- Le **centre est vide**.
- Les éléments du loin sont **petits, brumeux et sur les côtés**. Aucune île qui ressemble à celles du jeu.
- **Aucun texte.**
