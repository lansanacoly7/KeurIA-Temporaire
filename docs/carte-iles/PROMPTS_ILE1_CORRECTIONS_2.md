# Île 1 pilote — corrections à demander à Antigravity

Les 32 images sont bien livrées (1920 × 1080, fonds transparents, personnages très réussis). Mais **deux scènes ne respectent pas le cahier** et refont l'effet « désert » : il faut les refaire. Les scènes 2 (la salle de classe) et 4 (le jardin) sont bonnes et **ne changent pas**.

Mêmes règles que `PROMPTS_ILE1_PILOTE.md` (style, drapeau du Sénégal avec l'étoile verte, aucun texte, WebP uniquement, mêmes noms de fichiers : on remplace). Dossier : `frontend/public/images/parcours79/voyage/ile1/`.

## Ce qui ne va pas

| Problème | Scène 1 (portail) | Scène 3 (cour) |
|---|---|---|
| Le **sol commence trop haut** (à 41 % et 35 % de la hauteur au lieu de 62 %) et cache tout le reste | oui | oui |
| Le sol est **une immense étendue vide de sable ou de terre rouge** : on dirait un désert | oui | oui |
| Le **décor est absent ou minuscule** : on ne voit ni mur, ni portail (scène 1), ni bâtiment (scène 3) | oui | oui |
| Les plans ne **s'emboîtent pas** (le sol de `scene` recouvre le `decor`) | oui | oui |

## Règle d'alignement à respecter, cette fois à la lettre

Pour **chaque scène, les 5 plans partagent la même ligne de sol à 62 % de la hauteur**.
- `fond` : ciel et mer, **horizon à 42 %**.
- `lointain` : seulement entre 35 % et 62 %.
- `decor` : les **grandes structures posées sur le sol qui commence à 62 %** (murs, portail, bâtiments, arbres). **Pas de sol** dans ce plan, juste le bas des structures.
- `scene` : **le sol commence à 62 %** et descend jusqu'en bas (c'est seulement **38 % de l'image**), avec les objets. **Au-dessus de 62 %, il n'y a RIEN dans ce plan** (sauf des objets hauts qui dépassent).
- `avant` : seulement le bas 12 %.

**Le sol ne doit jamais être une étendue vide.** Il est couvert de détails : herbe par touffes, fleurs, pavés, petits cailloux, feuilles mortes, traces de pas, ombres des objets, objets du quotidien.

## Scène 1 — le portail de l'école (à refaire)

**decor** (ajouter à `Layer 3 of 5` du cahier) :
```
The entrance of a Senegalese primary school: a long whitewashed school wall painted with a colorful frieze of animals and suns (no letters), a wide open double gate of green painted wood in the middle, a one-storey school building with green shutters visible through the open gate, a tall baobab on the left of the gate, a flag pole with the flag of Senegal (three vertical bands green, yellow, red, with one green five-pointed star in the center of the yellow band) on the right, bougainvillea flowers climbing the wall, coconut palms. The base of the wall and the gate stand exactly on a ground line at 62% of the image height.
```

**scene** (ajouter à `Layer 4 of 5`) :
```
The ground of the school entrance, starting at 62% of the image height and going down to the bottom (so only the bottom 38% of the image). A dirt path of red earth entering through the gate, bordered by grass tufts and flower beds, paving stones, small pebbles, fallen leaves, shadows. On it, near the viewer: the big wooden delivery crate just arrived, slightly open and glowing with golden sparkles, a handcart, school bags lined up on a low bench, a bicycle, a clay water jar, chickens. NOTHING above 62% of the height except tall props. No big empty areas of bare sand.
```

## Scène 3 — la cour de récréation (à refaire)

**decor** :
```
The sides of a sandy schoolyard: on the left a long low school building painted cream and ochre with several classroom doors and green shutters, a covered veranda, and a tall carved wooden school bell on a post; on the right a large mango tree with a tire swing and a low wall with a colorful mural of animals and suns (no letters); in the middle background a row of colorful flags (the flag of Senegal with its green star among them) hung between palm trees. Everything stands on a ground line at 62% of the image height.
```

**scene** :
```
The ground of the schoolyard, starting at 62% of the image height and going down to the bottom (the bottom 38%). Hopscotch and a circle game drawn in chalk, two big wooden doors side by side, one green and one orange, standing as a sorting game, a long bench with school bags, a ball, a skipping rope, a water tap with a blue bucket, grass tufts at the edges, small flowers, pebbles. NOTHING above 62% except tall props. No big empty areas of bare sand: the ground is full of details and playful marks.
```

## Vérification avant de livrer

Superposer les 5 plans à 50 % d'opacité : **le sol de `scene` et le bas de `decor` tombent sur la même ligne (62 %)**, et **le haut de `scene` est vide**. Le résultat ne doit plus ressembler à un désert.

---

## Retouche demandée sur la scène 1 (après les corrections ci-dessus)

Dans `s1-scene.webp`, **la caisse ouverte porte un rectangle à bords nets** (une petite boîte en bois posée sur son flanc droit, entre environ 20 % et 32 % de la largeur et 57 % à 70 % de la hauteur) qui ressemble à un défaut de génération. **Le retirer ou l'intégrer proprement** à la caisse (bords arrondis, ombre cohérente), sans changer le reste de l'image. Idem pour le contour clair visible autour du vélo si besoin.

---

## Scène 1 trop chargée : à refaire en plus épuré

Le retour : **la scène 1 est beaucoup trop chargée, l'œil ne sait pas où se poser.** Il faut la refaire avec **moins d'éléments et plus d'air**, sans tomber dans le vide. Remplace `s1-decor.webp` et `s1-scene.webp`.

**Règles d'épure :**
- **Un seul point d'intérêt fort : le portail de l'école et le bâtiment derrière.** Le reste est secondaire et calme.
- **Pas de massifs de fleurs qui couvrent tout le mur.** Seulement **une bougainvillée sur un côté du portail**, pas sur toute la largeur.
- **Maximum 6 éléments visibles** dans le plan `scene` : la caisse lumineuse, un banc avec un ou deux cartables, un pot, rien d'autre. **Plus de poules, de vélo ni de chariot.**
- **Le sol est dégagé :** un chemin de terre rouge clair qui conduit au portail, bordé de quelques herbes. De l'espace libre au milieu de l'image (pour que les cartes et Palou aient de la place).
- **Un arbre seulement** (le baobab), à gauche, et **un palmier** à droite. Pas de forêt de palmiers.
- **Couleurs plus calmes** : moins de rose très saturé, ciel doux, mur crème, portail vert.

```
[STYLE] Layer 3 of 5 (decor), fully transparent background: a calm, uncluttered Senegalese school entrance: a cream-colored wall with ONE open green double gate in the middle, a one-storey school building with a terracotta roof and green shutters seen through the gate, ONE baobab on the far left, ONE coconut palm on the far right, ONE small bougainvillea bush beside the gate only, the flag of Senegal (green-yellow-red with a green star) on a pole at the right. Lots of breathing room, very few elements, soft muted colors. Ground line at 62% of the image height.
```
```
[STYLE] Layer 4 of 5 (scene), fully transparent background: a clean red-earth path leading to the gate starting at 62% of the image height down to the bottom, a few grass tufts at the edges, and ONLY these objects near the viewer: the big wooden crate slightly open with a soft golden glow on the left, and one short bench with two school bags on the right. Nothing else. A lot of free open ground in the center.
```

