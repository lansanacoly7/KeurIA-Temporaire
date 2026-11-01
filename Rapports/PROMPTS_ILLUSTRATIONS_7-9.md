# Consignes d'images à générer : parcours 7-9 ans

Ces consignes remplacent celles de la maquette. Elles suivent la [bible narrative](BIBLE_NARRATIVE_7-9.md) : **valider la bible avant de générer**, car les personnages et les lieux en dépendent.

## 0. Correction de style (important)

Palou est une **illustration 2D à contours bruns épais et aplats de couleur** (crinière orange, museau jaune doré, nez en cœur rouge, losange blanc sur la poitrine). Ma recommandation initiale (« 3D jouet pastel », style du téléphone souriant) **ne s'accorde pas** avec lui. Nouveau style commun : **illustration plate d'album jeunesse, mêmes contours bruns que Palou.**
Les 15 images de leçons 3D existantes (`public/images/lessons/*.jpg`, par exemple le téléphone souriant) seront refaites ou remplacées au fil des modules.

## 1. Blocs à coller (le style d'abord, toujours)

**BLOC STYLE**
> Illustration plate style album jeunesse, contours marron chaud épais et réguliers (même trait que la mascotte jointe), aplats de couleurs vives et douces avec un très léger dégradé, formes rondes et simples, grands yeux expressifs, lumière chaude, fond clair, sans texte ni lettres ni logo, composition très lisible pour un enfant de 8 ans.

**BLOC PALOU** (joindre l'image `Palou_Content.png` comme référence)
> Palou : un petit lion-robot rond et mignon, crinière orange en nuages, museau jaune doré, gros yeux souriants, nez en forme de cœur rouge, joues roses, losange blanc sur la poitrine, queue à houppe orange.

**BLOC DAKAR**
> Dakar moderne et lumineux : immeubles colorés, palmiers, mer, marchés animés, téléphones et enseignes sans texte lisible. Jamais de brousse, ni de village de cases.

**Astuce de cohérence :** générez d'abord les **feuilles de personnage** (section 2), puis **joignez-les comme images de référence** à chaque scène.

## 2. Personnages (à générer en premier, 8 images)

Format carré, fond blanc, personnage en pied puis 3 expressions (content, surpris, réfléchit) sur la même feuille. Nom de fichier : `parcours79/personnages/<nom>.webp`.

| Fichier | Consigne (après le BLOC STYLE) |
|---|---|
| `moussa` | Moussa, garçon sénégalais de 9 ans, cheveux courts, t-shirt jaune et short bleu, baskets, sourire malicieux, un peu pressé. |
| `fatou` | Fatou, fille sénégalaise de 8 ans, tresses relevées avec un ruban vert, robe d'écolière bleue, cartable, regard attentif, un livre sous le bras. |
| `mme-diop` | Madame Diop, maîtresse d'école sénégalaise d'une quarantaine d'années, tenue d'enseignante élégante en tissu wax bleu et blanc, lunettes rondes, sourire calme et rassurant. |
| `mame-awa` | Mame Awa, marchande de fruits sénégalaise, foulard coloré, boubou orange, tablier, souriante, sans étal. |
| `papa-ibou` | Papa Ibou, chauffeur de car sénégalais d'une cinquantaine d'années, casquette, chemise à carreaux, moustache, air blagueur. |
| `tonton-cheikh` | Tonton Cheikh, pêcheur sénégalais de Saint-Louis, bonnet tricoté, t-shirt délavé, bras robustes, grand sourire, sans bateau. |
| `baye` | Baye, gardien d'école sénégalais d'une soixantaine d'années, casquette, gilet, sourire doux, un petit poste de radio à la main. |
| `mame-coumba` | Mame Coumba, grand-mère sénégalaise de Casamance, foulard noué, boubou vert, sourire tendre, assise sur un petit tabouret. |

## 3. Les 10 illustrations de module (carrées, 1:1, 1200 × 1200 px)

Fichier : `parcours79/modules/mXX-carte.webp`. Joindre Palou et les personnages cités.
Après le BLOC STYLE + BLOC DAKAR :

| Fichier | Scène |
|---|---|
| `m01-carte` | Cour d'une école de quartier à Dakar : Palou sort d'une grande caisse en carton, Madame Diop et Moussa le regardent, étonnés et ravis ; un poste de radio sur un banc. |
| `m02-carte` | Intérieur d'un car de Dakar : Papa Ibou au volant, Moussa et Fatou regardent un téléphone qui affiche un trajet (sans texte), Palou sur les genoux de Fatou, embouteillage à la fenêtre. |
| `m03-carte` | Marché Kermel : Mame Awa range des mangues, oranges et bananes en piles bien triées ; Fatou et Palou l'aident ; une chaussette égarée dans un panier de fruits. |
| `m04-carte` | Guet Ndar à Saint-Louis : Tonton Cheikh montre des poissons colorés (thiof, sardinelles) à Palou ; pirogues très colorées alignées sur la plage derrière ; Moussa tient des cartes de poissons. |
| `m05-carte` | Jardin de l'école, sous un manguier : Fatou photographie une feuille avec un téléphone, Palou regarde avec de grandes jumelles, Moussa tient une loupe. |
| `m06-carte` | Appel vidéo : sur l'écran d'un téléphone tenu par Fatou, Mame Coumba sourit dans une cour de Casamance avec des manguiers ; Palou tend l'oreille, des bulles de dialogue vides autour d'eux. |
| `m07-carte` | Salle de classe : Moussa, Fatou et Palou fabriquent une grande affiche colorée pour une journée de nettoyage du quartier (pinceaux, seaux, fresque). |
| `m08-carte` | Fatou tient un téléphone avec un cadenas doré et un grand bouclier ; Madame Diop souriante à côté ; Moussa hésite devant un bouton. |
| `m09-carte` | Palou en détective (chapeau, loupe) compare deux messages sur des téléphones ; Fatou et Moussa réfléchissent, gros points d'interrogation. |
| `m10-carte` | Place du quartier en fête : guirlandes, parents et voisins, la classe présente ses inventions à Palou qui porte une médaille ; enfants qui trient des déchets. |

## 4. Les 10 fonds de module (paysage 16:9, 1920 × 1080 px)

Fichier : `parcours79/modules/mXX-fond.webp`. **Fond doux, peu contrasté, zone centrale vide** pour laisser lire le texte par-dessus.
Consigne après le BLOC STYLE + BLOC DAKAR : « **décor seulement, sans personnage, couleurs pastel très claires, centre dégagé** » puis :

| Fichier | Décor | Couleur dominante |
|---|---|---|
| `m01-fond` | Cour d'école, ciel bleu, baobab au loin | jaune soleil |
| `m02-fond` | Rue de Dakar animée, cars colorés | vert menthe |
| `m03-fond` | Allées de marché, étals de fruits | corail |
| `m04-fond` | Plage de Guet Ndar, pirogues colorées, mer calme | bleu |
| `m05-fond` | Jardin de l'école et manguier | violet doux |
| `m06-fond` | Cour ombragée en Casamance, manguiers, lumière chaude | vert menthe |
| `m07-fond` | Classe décorée, fresques colorées | jaune soleil |
| `m08-fond` | Ciel de nuit doux avec cadenas et étoiles discrets | corail |
| `m09-fond` | Bureau de détective clair, loupes en filigrane | bleu |
| `m10-fond` | Place en fête, guirlandes, coucher de soleil | vert franc |

## 5. Les 10 autocollants (512 × 512 px, fond transparent)

Fichier : `parcours79/stickers/mXX-sticker.webp` (WebP avec transparence). Consigne après le BLOC STYLE : « **autocollant rond avec bord blanc épais et ombre douce, un seul objet, fond transparent** » puis :
`m01` Palou saluant · `m02` petit car coloré · `m03` panier de fruits · `m04` poisson doré · `m05` loupe sur une feuille · `m06` bulle de dialogue avec micro · `m07` pinceau et étoile · `m08` bouclier doré · `m09` chapeau de détective · `m10` médaille de la fête.

## 6. Ce qui arrive plus tard (module par module)

Les **images de leçon** (environ 3 par leçon, 800 × 600 px, `mXX-lY-zN.webp`) sont demandées **au moment où l'on écrit chaque module**, avec leur consigne exacte : je vous donnerai la liste et les consignes du module au moment de le construire. Idem pour les poses de Palou manquantes (marche, écoute, réfléchit).

## 7. Spécifications et livraison

| Point | Règle |
|---|---|
| Dossier | `frontend/public/images/parcours79/{personnages,modules,stickers,lecons}/` |
| Format | **WebP**, qualité 80 ; transparence pour les personnages et les autocollants |
| Poids | **≤ 120 Ko** par image, jamais plus de 300 Ko (aujourd'hui : jusqu'à 2,6 Mo) |
| Noms | exactement ceux du tableau (minuscules, tirets) |
| Livraison | déposez les fichiers (PNG ou JPG suffisent, je convertis et j'allège) dans un dossier de votre choix et dites-moi où |
| Provisoire | tant qu'une image manque, l'écran affiche un emoji sur dégradé (aucune image cassée) ; un test signale toute image référencée mais absente |
| Accessibilité | chaque image a une description courte (`alt`) écrite avec le contenu |
| Droits | conservez l'outil, la date et les consignes utilisés pour chaque image (traçabilité) |

Si votre outil comprend mieux l'anglais, dites-le-moi : je traduis toutes les consignes.
