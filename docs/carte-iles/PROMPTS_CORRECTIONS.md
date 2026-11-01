# Corrections d'images — à donner à Antigravity

Ce document complète `PROMPTS_INTERIEURS.md`. Mêmes règles qu'avant :
- **même style** que les îles livrées ;
- **aucun texte** ;
- **WebP uniquement**, avec les noms de fichiers exacts ;
- dossier : `frontend/public/images/parcours79/voyage/`.

---

## 1. Refaire l'intérieur de l'île 1 : une vraie école

**Le problème :** l'intérieur livré ressemble à un village (murs de terre, cases). Il faut qu'on reconnaisse **tout de suite une école primaire sénégalaise**.

**À regénérer :**
- `interieur-01-milieu.webp`
- `interieur-01-avant.webp`

La couche du fond, `interieur-01-fond.webp`, peut rester.

**Format :** 3840 × 1440 (très large, 8:3). Il faut **exactement le même cadrage et le même horizon** que les autres intérieurs : le sol commence vers 55 % de la hauteur.

**Prompt pour la couche du milieu** (coller le bloc STYLE de `PROMPTS_INTERIEURS.md` avant) :

```
A very wide side-scrolling game background layer (aspect 8:3) showing the inside of a small tropical island that is clearly a SENEGALESE PRIMARY SCHOOL, seen FROM THE FRONT at child eye level (no top-down view). Fully transparent above the buildings: no sky, no sea. The ground starts at about 55% of the image height.
It must be instantly recognizable as a school: a long one-storey school building painted cream and light yellow with several identical classroom doors and windows in a row, green shutters, a covered veranda with pillars, a big school bell hanging on a post, a flag pole with the flag of Senegal (three vertical bands green, yellow, red, with one green five-pointed star in the center of the yellow band), a sandy schoolyard with hopscotch drawn on the ground, children's school bags on a bench, a water fountain, a big baobab giving shade, a few coconut palms, a small garden bed. No mud huts, no village houses.
Four distinct landmarks stand in the front row, from left to right, centered at about 12%, 37%, 63% and 88% of the width, never hidden: (1) a big wooden delivery crate slightly open with a soft magical glow; (2) an outdoor blackboard on an easel with chalk drawings of simple shapes (no letters) and a stack of books; (3) two small wooden doors side by side, one green and one orange, like a sorting game; (4) a treasure-hunt corner with a giant magnifying glass leaning on a small treasure map and a basket.
```

**Prompt pour le premier plan :**

```
A very wide side-scrolling game foreground layer (aspect 8:3) on a fully transparent background: only a FEW small, discreet foreground elements along the very bottom 15% of the image: three or four small grass tufts, two small flowers and one small rounded rock, spread out with large empty gaps between them. Everything else is fully transparent. Keep it light and sparse: it must never hide what is behind it.
```

---

## 2. Les panneaux des cours, à l'intérieur des îles

**Le besoin :** à l'intérieur de l'île, au-dessus de chaque endroit, un panneau indique le cours. Le code écrit le nom du cours et les étoiles **par-dessus l'image**. Il faut donc des panneaux **vides**, sans aucun texte.

**Format :** **4 images, 1024 × 512, fond transparent**, toutes de la même forme et de la même taille, vues de face. Seule la couleur et le petit symbole changent :

| Fichier | État | Description |
|---|---|---|
| `panneau-jouer.webp` | cours à faire | panneau vert citron vif, petite étoile brillante au coin |
| `panneau-fait.webp` | cours terminé | panneau vert foncé, petite coche blanche dans un rond au coin |
| `panneau-verrou.webp` | cours verrouillé | panneau gris-beige pâle, petit cadenas au coin |
| `panneau-pointe.webp` | flèche vers le bas | petite pointe en bois (100 × 60 px au centre), pour relier le panneau à l'endroit |

**Prompt** (coller le bloc STYLE avant, puis ajouter la couleur et le symbole de la ligne du tableau) :

```
One single wooden signboard for a children's game, seen exactly from the front, centered, wide rectangle with rounded corners, thick friendly wooden frame, a large EMPTY smooth flat area in the middle for text (completely blank, no letters, no numbers), hanging from two short ropes at the top. Fully transparent background. Color and symbol:
```

---

## Vérification

- L'île 1 ressemble **immédiatement à une école**, de face, sans aucune case de village.
- Le premier plan de l'île 1 est **léger** : rien de plus haut que le bas de l'image.
- Les panneaux sont **vides**, de la même taille, sur fond transparent.
