# Pictogrammes des réponses : parcours 7-9 ans

Dans les leçons, chaque bouton de réponse (QCM, tri, choix « Crée ») doit montrer **une image** : l'enfant voit une vache, un chat, une mangue, un cadenas, et le texte la nomme en dessous. Il y a **511 pictogrammes**, à produire en **43 planches de 12**.

## Format d'une planche (très important pour le découpage automatique)

- Un fichier PNG de **2048 × 1536 px**, nommé `sheet-01.png`, `sheet-02.png`… (le numéro est celui de la planche ci-dessous).
- Déposé dans `frontend/public/images/parcours79/pictos-src/` (dossier ignoré par git : ce sont des sources brutes).
- **12 pictogrammes : 4 colonnes × 3 lignes**, rangés dans l'ordre indiqué (de gauche à droite, puis de haut en bas).
- **Fond blanc pur** (#FFFFFF), sans aucune ligne de séparation, sans cadre, sans ombre portée au sol.
- Chaque pictogramme est **centré dans sa case de 512 × 512 px**, avec **au moins 60 px de marge blanche** tout autour. Aucun pictogramme ne touche ni ne dépasse sa case, deux pictogrammes ne se touchent jamais.
- **Aucun texte, aucune lettre, aucun chiffre lisible** dans les images (sauf quand la description demande explicitement un chiffre, comme « 12 »).

## Style (le même que toutes les illustrations du parcours)

Illustration plate façon livre pour enfants, contours bruns épais (#381204), couleurs chaudes et vives (jaune #FEDA82, orange #CD6D19, corail #FF9971, vert #34D399, bleu #3B82F6), formes rondes et lisibles de loin, un seul objet ou une seule petite scène par case. Les personnages gardent leur apparence habituelle :
**Palou** est le lionceau roux avec un losange blanc sur le torse ; **Moussa** porte un tee-shirt jaune ; **Fatou** une robe bleue avec un ruban vert ; **Madame Diop** une robe en wax bleue et blanche avec turban et lunettes. **« Le petit robot »** (une IA, dans beaucoup de descriptions) est toujours le même : un petit robot rond bleu clair, avec une antenne et un écran-visage souriant, **différent de Palou**. Dakar d'aujourd'hui, jamais de savane ni de brousse.

Un pictogramme doit se comprendre **en une seconde** par un enfant de 7 ans : privilégie l'objet ou l'action la plus simple.

## Avancement

Commence par les **planches 1 à 6** (chapitres 1 et 2) pour vérifier que le découpage se passe bien, puis continue dans l'ordre. Quand une série de planches est déposée, préviens-moi : je les découpe (`python manage.py slice_pictos79`), je vérifie chaque pictogramme et je te signale ceux à refaire.

---

# Les 43 planches
### sheet-01.png  (à partir de la leçon p1-1)
 1. (ligne 1, colonne 1) `telephone-musique` : Un smartphone qui affiche une note de musique et des ondes sonores.
 2. (ligne 1, colonne 2) `baguette-magique` : Une baguette magique avec des étincelles.
 3. (ligne 1, colonne 3) `personne-cachee` : Une petite silhouette cachée derrière une boîte, on ne voit que ses yeux et ses mains.
 4. (ligne 1, colonne 4) `robot-machine` : Un robot en métal avec des vis et des boulons, une machine sans cœur.
 5. (ligne 2, colonne 1) `respirer` : Une poitrine d'enfant avec deux poumons roses qui se gonflent, des flèches d'air.
 6. (ligne 2, colonne 2) `coeur-bat` : Un grand cœur rouge qui bat, avec de petits traits de battement.
 7. (ligne 2, colonne 3) `ia-hesite` : Le petit robot avec un point d'interrogation au-dessus de la tête, l'air hésitant.
 8. (ligne 2, colonne 4) `robot-sait-tout` : Le petit robot avec une couronne et des livres partout autour de lui, l'air très sûr de lui.
 9. (ligne 3, colonne 1) `bouton-eteindre` : Un gros bouton rond d'arrêt (symbole marche/arrêt) avec une main qui appuie.
10. (ligne 3, colonne 2) `livre-ouvert` : Un livre d'histoires ouvert avec des petits dessins sur les pages.
11. (ligne 3, colonne 3) `chiffres` : Trois gros chiffres 1 2 3 colorés (sans autre texte).
12. (ligne 3, colonne 4) `crayon-dessin` : Un crayon de couleur qui dessine un soleil et une maison sur une feuille.

### sheet-02.png  (à partir de la leçon p1-1)
 1. (ligne 1, colonne 1) `chanter-note` : Un enfant qui chante la bouche ouverte, avec de grandes notes de musique.
 2. (ligne 1, colonne 2) `chat` : Un chat tigré assis, de face, souriant.
 3. (ligne 1, colonne 3) `chien` : Un chien marron assis, langue sortie, de face.
 4. (ligne 1, colonne 4) `chaton` : Un tout petit chaton gris qui joue avec une pelote.
 5. (ligne 2, colonne 1) `vache` : Une vache blanche et noire avec une cloche, de profil.
 6. (ligne 2, colonne 2) `photos-variees` : Un tas de six photos différentes (animaux variés) étalées en éventail.
 7. (ligne 2, colonne 3) `une-grande-photo` : Une seule très grande photo encadrée d'un chat, qui prend toute la place.
 8. (ligne 2, colonne 4) `mot-repete` : Une bulle de parole qui contient dix petites bulles identiques en cascade, sans texte.
 9. (ligne 3, colonne 1) `hesiter` : Le petit robot qui se gratte la tête devant un chat orange, un point d'interrogation.
10. (ligne 3, colonne 2) `certain-sur` : Le petit robot qui bombe le torse, sûr de lui, avec un grand « OK » en forme de coche verte.
11. (ligne 3, colonne 3) `chevre` : Une chèvre brune avec des petites cornes, de face.
12. (ligne 3, colonne 4) `coq` : Un coq coloré qui chante, de profil.

### sheet-03.png  (à partir de la leçon p1-2)
 1. (ligne 1, colonne 1) `mouton` : Un mouton blanc laineux, de profil.
 2. (ligne 1, colonne 2) `ia-robot` : Un petit robot-lionceau sympathique avec une ampoule allumée au-dessus de la tête (une IA).
 3. (ligne 1, colonne 3) `pas-ia` : Un objet banal (une lampe) barré d'une grande croix rouge arrondie : « pas une IA ».
 4. (ligne 1, colonne 4) `lampe` : Une lampe de bureau simple avec un interrupteur.
 5. (ligne 2, colonne 1) `telephone-visage` : Un smartphone qui affiche un visage entouré d'un cadre de reconnaissance (quatre coins).
 6. (ligne 2, colonne 2) `velo` : Un vélo d'enfant rouge.
 7. (ligne 2, colonne 3) `radio` : Une vieille radio portative avec antenne et bouton.
 8. (ligne 2, colonne 4) `appli-traduction` : Un smartphone avec deux bulles qui échangent une flèche (traduction), sans texte lisible.
 9. (ligne 3, colonne 1) `balance` : Une balance de marché à ressort avec un plateau de mangues.
10. (ligne 3, colonne 2) `ballon` : Un ballon de football noir et blanc.
11. (ligne 3, colonne 3) `assistant-vocal` : Un petit haut-parleur rond avec un micro et des ondes de voix.
12. (ligne 3, colonne 4) `voix-micro` : Un micro avec des ondes sonores qui sortent d'une bouche.

### sheet-04.png  (à partir de la leçon p1-3)
 1. (ligne 1, colonne 1) `ecran` : Un écran de télévision éteint, avec un cadre noir.
 2. (ligne 1, colonne 2) `prise-electrique` : Une prise électrique avec son câble et un petit éclair jaune.
 3. (ligne 1, colonne 3) `jouet-nounours` : Un nounours en peluche.
 4. (ligne 1, colonne 4) `television` : Une télévision avec une image de dessin animé.
 5. (ligne 2, colonne 1) `telephone` : Un smartphone moderne, écran allumé, simple.
 6. (ligne 2, colonne 2) `panier-osier` : Un panier en osier vide, rond.
 7. (ligne 2, colonne 3) `torche` : Une lampe torche qui éclaire avec un faisceau jaune.
 8. (ligne 2, colonne 4) `casque-audio` : Un casque audio avec une note de musique.
 9. (ligne 3, colonne 1) `partage-ok` : Un enfant souriant avec une bulle de parole verte et un pouce levé : « je peux dire ».
10. (ligne 3, colonne 2) `cadenas-secret` : Un gros cadenas fermé doré avec une clé et un petit « chut ! » (doigt sur la bouche).
11. (ligne 3, colonne 3) `assiette-plat` : Une assiette de riz au poisson et aux légumes colorés (un plat sénégalais), vue de dessus.
12. (ligne 3, colonne 4) `mot-de-passe-cle` : Une grosse clé dorée devant un cadre de mot de passe avec des étoiles ****.

### sheet-05.png  (à partir de la leçon p1-4)
 1. (ligne 1, colonne 1) `jeu-manette` : Une manette de jeu vidéo colorée.
 2. (ligne 1, colonne 2) `maison-adresse` : Une maison avec une épingle de localisation rouge au-dessus.
 3. (ligne 1, colonne 3) `carnet-note` : Un carnet avec un crayon et une loupe qui regarde une petite appli.
 4. (ligne 1, colonne 4) `photographier-ecran` : Un téléphone qui prend en photo l'écran d'un autre téléphone plein de messages, un flash.
 5. (ligne 2, colonne 1) `demande-mot-de-passe` : Une main qui tend la paume vers une clé avec des étoiles ****.
 6. (ligne 2, colonne 2) `adulte-confiance` : Un adulte souriant et rassurant (maîtresse ou parent) qui ouvre les bras, avec un petit cœur vert.
 7. (ligne 2, colonne 3) `inconnu-ombre` : Une silhouette sombre d'inconnu avec un point d'interrogation à la place du visage.
 8. (ligne 2, colonne 4) `enfant-seul-chemin` : Un petit enfant tout seul sur un long chemin qui part dans le lointain.
 9. (ligne 3, colonne 1) `ecole` : Un bâtiment d'école avec un drapeau et une cloche.
10. (ligne 3, colonne 2) `quartier` : Quelques maisons colorées et un arbre dans une rue de quartier.
11. (ligne 3, colonne 3) `gps` : Un téléphone avec une carte et une flèche de navigation GPS.
12. (ligne 3, colonne 4) `telephone-voix-reponse` : Un smartphone avec des ondes de voix qui entrent et une bulle de réponse qui sort.

### sheet-06.png  (à partir de la leçon p2-1)
 1. (ligne 1, colonne 1) `pensees-lues` : Une tête d'enfant avec une bulle de pensée qu'un robot essaie de lire (dessin de pensée).
 2. (ligne 1, colonne 2) `sonnerie` : Un téléphone qui sonne avec une petite cloche et des traits de vibration.
 3. (ligne 1, colonne 3) `photos-visages` : Un téléphone avec une grille de photos de visages regroupés par personne.
 4. (ligne 1, colonne 4) `bouton-ecran` : Un doigt qui appuie sur le bouton latéral d'un téléphone qui s'allume.
 5. (ligne 2, colonne 1) `yeux-route` : Deux grands yeux ouverts qui regardent une route avec une voiture.
 6. (ligne 2, colonne 2) `yeux-fermes-route` : Un conducteur les yeux fermés au volant d'une voiture sur une route (cache-yeux).
 7. (ligne 2, colonne 3) `pilote-automatique` : Un volant tout seul qui tourne avec un petit symbole de cerveau électronique.
 8. (ligne 2, colonne 4) `meteo` : Un soleil derrière un petit nuage, symbole de météo.
 9. (ligne 3, colonne 1) `devinette` : Un point d'interrogation entouré de petites étoiles, comme une devinette.
10. (ligne 3, colonne 2) `trajet-bus` : Un car coloré et une horloge, symbole de trajet.
11. (ligne 3, colonne 3) `appli-lecture` : Une tablette qui affiche des livres colorés à choisir.
12. (ligne 3, colonne 4) `tableau-craie` : Un tableau noir avec une craie et un chiffon.

### sheet-07.png  (à partir de la leçon p2-2)
 1. (ligne 1, colonne 1) `cloche-ecole` : Une cloche d'école en laiton avec un marteau.
 2. (ligne 1, colonne 2) `historique-lecture` : Des livres alignés avec un oeil qui les observe (ce qu'on lit souvent).
 3. (ligne 1, colonne 3) `maitresse-choisit` : Une maîtresse en robe wax bleue qui désigne un livre sur une étagère.
 4. (ligne 1, colonne 4) `choisir-autre` : Deux livres côte à côte et une flèche courbe qui montre le choix d'un autre.
 5. (ligne 2, colonne 1) `livre-obligatoire` : Un enfant qui lit un livre avec une chaîne autour : obligé de lire.
 6. (ligne 2, colonne 2) `tablette-eteinte` : Une tablette éteinte, écran noir, avec un petit « zzz ».
 7. (ligne 2, colonne 3) `conte-lievre` : Un livre de contes avec un lièvre malin sur la couverture (Leuk-le-Lièvre).
 8. (ligne 2, colonne 4) `livre-foot` : Un livre avec un ballon de football sur la couverture.
 9. (ligne 3, colonne 1) `livre-mer` : Un livre avec des vagues et un poisson sur la couverture.
10. (ligne 3, colonne 2) `livre-robots` : Un livre avec un petit robot sur la couverture.
11. (ligne 3, colonne 3) `boule-cristal` : Une boule de cristal avec de la fumée et des étoiles.
12. (ligne 3, colonne 4) `trajets-compares` : Plusieurs petits trajets en lignes colorées sur une carte, comparés entre eux.

### sheet-08.png  (à partir de la leçon p2-3)
 1. (ligne 1, colonne 1) `chuchoter-oreille` : Un homme qui chuchote à l'oreille d'un autre, bouche près de l'oreille.
 2. (ligne 1, colonne 2) `appli-chemin` : Un téléphone avec une carte et un trajet en pointillés qui évite une route barrée.
 3. (ligne 1, colonne 3) `klaxon` : Un klaxon de car avec des ondes sonores.
 4. (ligne 1, colonne 4) `appli-heure-arrivee` : Un téléphone qui affiche une horloge et un petit drapeau d'arrivée.
 5. (ligne 2, colonne 1) `panneau-stop` : Un panneau STOP rouge octogonal (sans texte, juste un octogone rouge avec une barre blanche).
 6. (ligne 2, colonne 2) `horloge-arrivee` : Un grand drapeau d'arrivée à damier et une horloge.
 7. (ligne 2, colonne 3) `chemin-alternatif` : Une route qui se sépare en deux, une flèche sur la route libre.
 8. (ligne 2, colonne 4) `embouteillage` : Des voitures et des cars collés les uns aux autres sur une route.
 9. (ligne 3, colonne 1) `arret-bus` : Un panneau d'arrêt de bus avec un car qui arrive.
10. (ligne 3, colonne 2) `telephone-traduit-panneau` : Un téléphone qui regarde un panneau avec des lettres étranges et le traduit (flèche).
11. (ligne 3, colonne 3) `sac-mangues` : Un sac en toile plein de mangues.
12. (ligne 3, colonne 4) `telephone-reconnait-chanson` : Un téléphone qui écoute une radio et affiche des notes de musique.

### sheet-09.png  (à partir de la leçon p2-4)
 1. (ligne 1, colonne 1) `panier-fruits` : Un panier plein de mangues, d'oranges et de bananes.
 2. (ligne 1, colonne 2) `ombrelle` : Une grande ombrelle de marché colorée, ouverte.
 3. (ligne 1, colonne 3) `demander-permission` : Un enfant qui lève la main pour demander la permission, avec un petit « ? ».
 4. (ligne 1, colonne 4) `poster-photo` : Une photo qui s'envole vers un nuage de réseau, avec des cœurs autour.
 5. (ligne 2, colonne 1) `photo-sans-demander` : Un enfant qui photographie en cachette une personne qui a l'air gênée.
 6. (ligne 2, colonne 2) `dessin-etal` : Un joli dessin d'un étal de marché encadré au mur.
 7. (ligne 2, colonne 3) `nombres-fruits` : Des mangues, des oranges et des bananes avec des gros nombres 12, 8 et 5 à côté.
 8. (ligne 2, colonne 4) `nom-etiquette` : Une étiquette de nom accrochée à un fruit, avec un petit crayon.
 9. (ligne 3, colonne 1) `nombre-mangues` : Douze mangues alignées avec un grand 12.
10. (ligne 3, colonne 2) `bruit-marche` : Un marché animé avec un haut-parleur et beaucoup de petites ondes de bruit.
11. (ligne 3, colonne 3) `prix-banane` : Une banane avec une étiquette de prix en forme de pièce.
12. (ligne 3, colonne 4) `soleil-chaud` : Un soleil brûlant avec des vagues de chaleur.

### sheet-10.png  (à partir de la leçon p3-1)
 1. (ligne 1, colonne 1) `nombre-fruits` : Des fruits et un grand « 123 » qui les compte.
 2. (ligne 1, colonne 2) `prix-etiquette` : Une étiquette de prix avec une pièce de monnaie.
 3. (ligne 1, colonne 3) `couleur-palette` : Une palette de peintre avec cinq couleurs vives et un pinceau.
 4. (ligne 1, colonne 4) `panier-mangues` : Un panier d'osier rempli uniquement de mangues.
 5. (ligne 2, colonne 1) `panier-oranges` : Un panier d'osier rempli uniquement d'oranges.
 6. (ligne 2, colonne 2) `panier-bananes` : Un panier d'osier rempli uniquement de bananes.
 7. (ligne 2, colonne 3) `mangue-rouge` : Une belle mangue rouge-orangé avec sa feuille.
 8. (ligne 2, colonne 4) `orange` : Une orange ronde avec sa feuille.
 9. (ligne 3, colonne 1) `banane-mure` : Une banane jaune bien mûre.
10. (ligne 3, colonne 2) `mangue-verte` : Une mangue verte avec sa feuille.
11. (ligne 3, colonne 3) `orange-pressee` : Une orange coupée en deux avec un verre de jus d'orange.
12. (ligne 3, colonne 4) `banane-verte` : Une banane encore verte.

### sheet-11.png  (à partir de la leçon p3-2)
 1. (ligne 1, colonne 1) `trouver-vite` : Une loupe qui trouve vite une orange dans une étagère bien rangée.
 2. (ligne 1, colonne 2) `poids-lourd` : Une grosse balance qui penche très lourd avec des fruits énormes.
 3. (ligne 1, colonne 3) `prix-cher` : Une étiquette de prix avec une flèche rouge qui monte.
 4. (ligne 1, colonne 4) `fruits-jaunes` : Une banane, un citron et une mangue jaune ensemble.
 5. (ligne 2, colonne 1) `caillou` : Un seul gros caillou gris.
 6. (ligne 2, colonne 2) `livres-contes` : Une pile de livres de contes colorés.
 7. (ligne 2, colonne 3) `mangue-chaussette` : Une mangue à côté d'une chaussette rayée, qui n'ont rien à voir.
 8. (ligne 2, colonne 4) `fruits` : Un assortiment de fruits : mangue, orange, banane.
 9. (ligne 3, colonne 1) `legumes` : Un assortiment de légumes : carotte, oignon, tomate.
10. (ligne 3, colonne 2) `poissons` : Trois poissons argentés ensemble.
11. (ligne 3, colonne 3) `boissons` : Deux bouteilles de jus colorées avec des pailles.
12. (ligne 3, colonne 4) `recueil-contes` : Un gros recueil de contes avec une couverture illustrée.

### sheet-12.png  (à partir de la leçon p3-3)
 1. (ligne 1, colonne 1) `lievre-leuk` : Un lièvre malin debout avec un grand sourire (Leuk-le-Lièvre).
 2. (ligne 1, colonne 2) `cahier-maths` : Un cahier de maths avec des chiffres et des formes géométriques.
 3. (ligne 1, colonne 3) `chaussette` : Une chaussette colorée seule.
 4. (ligne 1, colonne 4) `livre-rouge` : Un livre à couverture rouge.
 5. (ligne 2, colonne 1) `livre-bleu` : Un livre à couverture bleue.
 6. (ligne 2, colonne 2) `livres-rouges-deux` : Deux livres rouges côte à côte.
 7. (ligne 2, colonne 3) `retirer-intrus` : Une main qui retire un objet intrus d'un groupe d'objets bien rangés.
 8. (ligne 2, colonne 4) `ajouter-objets` : Une pile d'objets qui grandit avec des flèches « plus ».
 9. (ligne 3, colonne 1) `melanger-donnees` : Des objets de toutes sortes mélangés dans un grand désordre.
10. (ligne 3, colonne 2) `livre-sciences` : Un livre avec un atome et un microscope sur la couverture.
11. (ligne 3, colonne 3) `sport` : Un ballon de football et un ballon de basket côte à côte.
12. (ligne 3, colonne 4) `musique` : Un tambour et des notes de musique.

### sheet-13.png  (à partir de la leçon p3-4)
 1. (ligne 1, colonne 1) `livre-etoiles` : Un livre avec des étoiles et une planète sur la couverture.
 2. (ligne 1, colonne 2) `conte-baobab` : Un livre de contes avec un baobab sur la couverture.
 3. (ligne 1, colonne 3) `livre-insectes` : Un livre avec un papillon et une coccinelle sur la couverture.
 4. (ligne 1, colonne 4) `couverture-couleur` : Quatre livres de couleurs différentes alignés.
 5. (ligne 2, colonne 1) `sujet-livre` : Un livre ouvert avec de petites icônes de thèmes qui sortent des pages.
 6. (ligne 2, colonne 2) `pages-nombre` : Un livre dont les pages sont comptées, avec un grand nombre.
 7. (ligne 2, colonne 3) `donnees-classees` : Le petit robot avec des boîtes bien rangées et étiquetées devant lui.
 8. (ligne 2, colonne 4) `pas-de-critere` : Le petit robot perdu devant un tas mélangé, sans étiquette.
 9. (ligne 3, colonne 1) `toujours-meme` : Une flèche circulaire qui se répète toujours avec le même symbole.
10. (ligne 3, colonne 2) `taille-regle` : Une règle graduée avec trois bâtons de tailles différentes.
11. (ligne 3, colonne 3) `livre-sport` : Un livre avec un ballon et un coureur sur la couverture.
12. (ligne 3, colonne 4) `poissons-caches` : Des poissons cachés sous un drap, on voit juste leurs queues.

### sheet-14.png  (à partir de la leçon p4-1)
 1. (ligne 1, colonne 1) `poissons-avec-noms` : Trois poissons avec chacun une étiquette de nom accrochée.
 2. (ligne 1, colonne 2) `mot-poisson` : Une bulle de parole qui contient un petit poisson, une seule fois.
 3. (ligne 1, colonne 3) `thiof-etiquette` : Un gros poisson thiof (mérou) gris-rose avec une étiquette de nom.
 4. (ligne 1, colonne 4) `poisson-sans-nom` : Un poisson avec une étiquette vide marquée d'un point d'interrogation.
 5. (ligne 2, colonne 1) `sardinelle-etiquette` : Une sardinelle argentée avec une étiquette de nom.
 6. (ligne 2, colonne 2) `pirogue-etiquette` : Une pirogue colorée de pêcheur avec une étiquette de nom.
 7. (ligne 2, colonne 3) `thiofs-differents` : Trois thiofs de tailles et de couleurs un peu différentes côte à côte.
 8. (ligne 2, colonne 4) `caisse-poissons` : Une caisse en bois pleine de poissons.
 9. (ligne 3, colonne 1) `palou-faim` : Le petit lion Palou qui se frotte le ventre, l'air affamé.
10. (ligne 3, colonne 2) `thiof` : Un gros poisson thiof (mérou) gris-rose, de profil.
11. (ligne 3, colonne 3) `sardinelle` : Une sardinelle argentée, mince, de profil.
12. (ligne 3, colonne 4) `capitaine` : Un poisson capitaine doré à grosses écailles, de profil.

### sheet-15.png  (à partir de la leçon p4-1)
 1. (ligne 1, colonne 1) `dorade` : Une dorade grise avec une tache dorée sur le front, de profil.
 2. (ligne 1, colonne 2) `chat-miaule` : Un chat qui miaule, bouche ouverte, avec des notes « miaou » en onde.
 3. (ligne 1, colonne 3) `chien-aboie` : Un chien qui aboie, bouche ouverte, avec des ondes sonores.
 4. (ligne 1, colonne 4) `chat-ronronne` : Un chat qui ronronne, yeux fermés, avec de petites ondes douces.
 5. (ligne 2, colonne 1) `chien-baton` : Un chien qui rapporte un bâton dans sa gueule.
 6. (ligne 2, colonne 2) `demander-nom` : Une photo d'animal avec une étiquette « ? » et une main qui montre l'étiquette.
 7. (ligne 2, colonne 3) `hasard-de` : Un dé à jouer en l'air avec des étoiles, symbole du hasard.
 8. (ligne 2, colonne 4) `jeter-photo` : Une photo qui est jetée dans une poubelle.
 9. (ligne 3, colonne 1) `chien-court` : Un chien qui court joyeusement.
10. (ligne 3, colonne 2) `chat-etiquette-chien` : Un chat avec une étiquette qui porte un dessin de chien (mauvaise étiquette).
11. (ligne 3, colonne 3) `chiot-dort` : Un petit chiot qui dort roulé en boule, avec des « zzz ».
12. (ligne 3, colonne 4) `photo-vide` : Un cadre photo vide avec seulement du sable et de l'eau, sans animal.

### sheet-16.png  (à partir de la leçon p4-3)
 1. (ligne 1, colonne 1) `palou-degout` : Le petit lion Palou qui fait la grimace devant un poisson, l'air dégoûté.
 2. (ligne 1, colonne 2) `photo-floue` : Une photo toute floue d'un poisson, avec des traits de flou.
 3. (ligne 1, colonne 3) `nom-change` : Un poisson avec une étiquette qui change de nom en tournant.
 4. (ligne 1, colonne 4) `arreter-stop` : Une main levée devant un panneau d'interdiction arrondi.
 5. (ligne 2, colonne 1) `meilleurs-exemples` : Une pile de photos de poissons bien nettes avec une étoile.
 6. (ligne 2, colonne 2) `gronder` : Un doigt accusateur levé devant un petit lion qui baisse les oreilles.
 7. (ligne 2, colonne 3) `bon-exemple` : Une photo nette avec un grand pouce vert levé et une coche.
 8. (ligne 2, colonne 4) `mauvais-exemple` : Une photo abîmée avec un grand pouce rouge baissé et une croix.
 9. (ligne 3, colonne 1) `thiof-net` : Une photo bien nette et lumineuse d'un thiof dans un cadre.
10. (ligne 3, colonne 2) `photo-sombre` : Une photo très sombre où l'on devine à peine une forme.
11. (ligne 3, colonne 3) `capitaine-net` : Une photo nette d'un capitaine pris de près dans un cadre.
12. (ligne 3, colonne 4) `photo-eau` : Une photo où l'on ne voit que de l'eau bleue.

### sheet-17.png  (à partir de la leçon p4-3)
 1. (ligne 1, colonne 1) `photo-nette` : Une photo parfaitement nette avec de petites étoiles de netteté.
 2. (ligne 1, colonne 2) `photo-eclairee` : Une photo bien éclairée par une grande lampe qui brille.
 3. (ligne 1, colonne 3) `photos-differentes` : Quatre photos différentes du même poisson sous des angles variés.
 4. (ligne 1, colonne 4) `photo-pres` : Un appareil photo qui prend un poisson de très près.
 5. (ligne 2, colonne 1) `thiofs-nets` : Trois thiofs bien nets avec une grande coche verte.
 6. (ligne 2, colonne 2) `photos-floues-sombres` : Trois photos floues et sombres avec une croix rouge.
 7. (ligne 2, colonne 3) `sardinelles-nettes` : Trois sardinelles bien nettes avec une grande coche verte.
 8. (ligne 2, colonne 4) `capitaines-nets` : Trois capitaines bien nets avec une grande coche verte.
 9. (ligne 3, colonne 1) `memes-photos` : Deux photos identiques côte à côte avec un signe égal.
10. (ligne 3, colonne 2) `poisson-nouveau` : Un poisson inconnu avec des étoiles et un point d'exclamation (nouveau).
11. (ligne 3, colonne 3) `palou-content` : Le petit lion Palou tout content, les yeux brillants.
12. (ligne 3, colonne 4) `ia-parfaite` : Le petit robot avec une couronne dorée et un « 100 % » en étoiles, trop parfait.

### sheet-18.png  (à partir de la leçon p4-4)
 1. (ligne 1, colonne 1) `ia-ameliorer` : Le petit robot qui monte un escalier vers le haut avec une flèche verte.
 2. (ligne 1, colonne 2) `tout-jeter` : Une grande poubelle avec des poissons et des photos qui y tombent.
 3. (ligne 1, colonne 3) `photo-nouvelle` : Une photo toute neuve avec une étincelle.
 4. (ligne 1, colonne 4) `vrai-poisson` : Une main qui tient un vrai poisson frais.
 5. (ligne 2, colonne 1) `manguier` : Un grand manguier avec des mangues orangées.
 6. (ligne 2, colonne 2) `pixels-carres` : Une image zoomée en petits carrés de couleur (pixels), comme une mosaïque.
 7. (ligne 2, colonne 3) `mots-caches` : Une image avec de petites lettres cachées qui apparaissent derrière (sans lisibles).
 8. (ligne 2, colonne 4) `feuille-taches` : Une feuille de manguier verte avec des taches brunes.
 9. (ligne 3, colonne 1) `vent-bruit` : Un petit tourbillon de vent qui fait siffler les feuilles, avec des traits de vent.
10. (ligne 3, colonne 2) `feuille-bord-jaune` : Une feuille verte dont le bord est jaune et sec.
11. (ligne 3, colonne 3) `gout-langue` : Une langue qui goûte une feuille, avec un petit point d'interrogation.
12. (ligne 3, colonne 4) `zoom-loupe` : Une loupe qui zoome sur une feuille, avec de gros détails visibles.

### sheet-19.png  (à partir de la leçon p5-1)
 1. (ligne 1, colonne 1) `arbre-grandit` : Un arbre minuscule dans un pot et un grand arbre avec une flèche de croissance (magique).
 2. (ligne 1, colonne 2) `feuilles-colorees` : Une feuille que l'on repeint avec un pinceau, couleurs changeantes.
 3. (ligne 1, colonne 3) `bords-feuille` : Le contour d'une feuille souligné par un trait de couleur.
 4. (ligne 1, colonne 4) `formes-geometriques` : Un cercle, un carré et un triangle colorés.
 5. (ligne 2, colonne 1) `feuille-saine` : Une feuille verte brillante bien lisse avec un petit cœur vert.
 6. (ligne 2, colonne 2) `feuille-malade` : Une feuille tachetée et un peu flétrie avec une petite croix rouge.
 7. (ligne 2, colonne 3) `feuille-verte-lisse` : Une feuille verte entièrement lisse, sans tache.
 8. (ligne 2, colonne 4) `feuille-brillante` : Une feuille verte qui brille sous le soleil, avec des éclats de lumière.
 9. (ligne 3, colonne 1) `ecole-nom` : Un bâtiment d'école avec une plaque vide sur la façade.
10. (ligne 3, colonne 2) `recreation-cloche` : Une cloche et des enfants qui jouent à la récréation.
11. (ligne 3, colonne 3) `taches-couleur` : Des taches colorées sur une feuille avec une palette à côté.
12. (ligne 3, colonne 4) `arbre-entier-feuilles` : Un arbre couvert d'un très grand nombre de feuilles, avec un grand nombre au-dessus.

### sheet-20.png  (à partir de la leçon p5-2)
 1. (ligne 1, colonne 1) `jardin-place` : Un petit jardin avec un plan et une croix qui indique la place d'une feuille.
 2. (ligne 1, colonne 2) `face-soleil` : Un enfant avec un téléphone qui photographie en regardant vers un gros soleil.
 3. (ligne 1, colonne 3) `soleil-dos` : Un enfant avec un téléphone et le soleil derrière lui, qui éclaire un arbre.
 4. (ligne 1, colonne 4) `ecran-eteint` : Un téléphone dont l'écran est éteint, avec un bouton enfoncé.
 5. (ligne 2, colonne 1) `bonne-lumiere` : Une ampoule brillante qui éclaire joyeusement une scène.
 6. (ligne 2, colonne 2) `fond-sombre` : Un grand fond noir qui avale un petit objet.
 7. (ligne 2, colonne 3) `arbre-net` : Un arbre parfaitement net dans un cadre photo avec des petites étoiles.
 8. (ligne 2, colonne 4) `doigt-objectif` : Un gros doigt qui bouche l'objectif d'un appareil photo.
 9. (ligne 3, colonne 1) `lion-devine` : Une tache sombre dans laquelle on croit voir un lion, avec un point d'interrogation.
10. (ligne 3, colonne 2) `pas-sur-refaire` : Un appareil photo avec une flèche circulaire « refaire » et un point d'interrogation.
11. (ligne 3, colonne 3) `arbre-malade-sur` : Un arbre aux feuilles tachées avec un grand point d'exclamation, l'air catégorique.
12. (ligne 3, colonne 4) `photo-contrejour` : Une photo d'arbre très sombre à contre-jour, avec un soleil éblouissant derrière.

### sheet-21.png  (à partir de la leçon p5-3)
 1. (ligne 1, colonne 1) `photo-floue-loin` : Une photo floue d'un arbre minuscule très loin.
 2. (ligne 1, colonne 2) `photo-coupee` : Une photo d'arbre coupée au ras, sans aucune feuille.
 3. (ligne 1, colonne 3) `sablier-jeu` : Un sablier long avec une manette de jeu : faire durer le jeu.
 4. (ligne 1, colonne 4) `plus-sur-balance` : Une balance penchée du côté de cinq coches vertes contre une coche : plus sûr.
 5. (ligne 2, colonne 1) `feuille-lisse-pres` : Une feuille lisse vue de près avec une loupe.
 6. (ligne 2, colonne 2) `tout-faux` : Une grosse croix rouge sur une feuille d'examen.
 7. (ligne 2, colonne 3) `bravo-verifier` : Un pouce levé et une loupe qui vérifie la dernière photo.
 8. (ligne 2, colonne 4) `pas-tester` : Un éprouvette avec une croix : « on ne teste plus ».
 9. (ligne 3, colonne 1) `mangue-arbre` : Une mangue qui pend à sa branche.
10. (ligne 3, colonne 2) `tronc-manguier` : Le tronc épais d'un manguier avec ses racines.
11. (ligne 3, colonne 3) `maitresse` : Une maîtresse en robe wax bleue et blanche, souriante, avec des lunettes.
12. (ligne 3, colonne 4) `parents` : Un papa et une maman qui sourient avec leur enfant entre eux.

### sheet-22.png  (à partir de la leçon p6-1)
 1. (ligne 1, colonne 1) `visage-devine` : Une machine qui regarde un visage avec un point d'interrogation, la voix absente.
 2. (ligne 1, colonne 2) `voix-en-texte` : Une bouche qui parle, avec des ondes qui se transforment en lignes d'écriture.
 3. (ligne 1, colonne 3) `fabriquer-chanson` : Une machine qui sort des notes de musique comme un robot-chanteur.
 4. (ligne 1, colonne 4) `ligne-grisille` : Un téléphone avec des zigzags de parasites et des ondes brouillées.
 5. (ligne 2, colonne 1) `voix-douce` : Une bouche qui parle doucement avec de belles ondes régulières et claires.
 6. (ligne 2, colonne 2) `bruit-cour` : Des enfants qui jouent bruyamment dans une cour, avec des ondes de bruit.
 7. (ligne 2, colonne 3) `telephone-charge` : Un téléphone avec une batterie pleine et une prise.
 8. (ligne 2, colonne 4) `bulle-barree` : Une bulle de parole barrée d'une croix.
 9. (ligne 3, colonne 1) `peu-exemples` : Un grand panier presque vide avec seulement deux petites graines (peu d'exemples).
10. (ligne 3, colonne 2) `palou-ne-veut-pas` : Le petit lion Palou qui se bouche les oreilles avec les pattes.
11. (ligne 3, colonne 3) `endroit-calme` : Une petite pièce paisible avec une plante et un coussin, des ondes douces.
12. (ligne 3, colonne 4) `parler-doucement` : Une bouche avec un doigt sur les lèvres et des petites ondes douces.

### sheet-23.png  (à partir de la leçon p6-1)
 1. (ligne 1, colonne 1) `micro-proche` : Un micro tout proche d'une bouche, une flèche vers le micro.
 2. (ligne 1, colonne 2) `repeter-fleche` : Deux bulles de parole identiques liées par une flèche circulaire (répéter).
 3. (ligne 1, colonne 3) `horloge-heure` : Une horloge ronde qui marque une heure précise.
 4. (ligne 1, colonne 4) `petit-mot` : Une petite pastille grise toute fine, très petite, qui représente un petit mot.
 5. (ligne 2, colonne 1) `cle-mot` : Une grosse clé dorée avec une bulle de parole qui s'ouvre, mot-clé.
 6. (ligne 2, colonne 2) `fete` : Des guirlandes colorées et des ballons de fête.
 7. (ligne 2, colonne 3) `lieu-pin` : Une carte avec une grosse épingle de localisation rouge.
 8. (ligne 2, colonne 4) `palou-devine` : Le petit lion Palou avec une boule de cristal, qui devine tout.
 9. (ligne 3, colonne 1) `palou-comprend-moins` : Le petit lion Palou avec des points d'interrogation, perplexe.
10. (ligne 3, colonne 2) `fete-annulee` : Des guirlandes tombées et un panneau barré : fête annulée.
11. (ligne 3, colonne 3) `menu-plats` : Une carte de menu avec des assiettes dessinées.
12. (ligne 3, colonne 4) `question-truc` : Une bulle de question avec une forme floue et indéfinie à l'intérieur.

### sheet-24.png  (à partir de la leçon p6-3)
 1. (ligne 1, colonne 1) `question-heure-fete` : Une bulle avec une horloge et une guirlande de fête.
 2. (ligne 1, colonne 2) `question-vague` : Un petit personnage qui hausse les épaules, bulle avec un nuage flou.
 3. (ligne 1, colonne 3) `question-claire` : Une bulle de question avec une cible bien nette au centre.
 4. (ligne 1, colonne 4) `lieu-fete` : Une guirlande de fête au-dessus d'une épingle de localisation.
 5. (ligne 2, colonne 1) `question-vague-ou` : Une bulle de question avec un nuage flou et une flèche qui tourne en rond.
 6. (ligne 2, colonne 2) `bancs-comptes` : Cinq bancs d'école alignés avec un chiffre au-dessus.
 7. (ligne 2, colonne 3) `question-vague-quoi` : Une bulle avec trois points de suspension et une forme floue.
 8. (ligne 2, colonne 4) `sujet-precis` : Une cible avec une flèche plantée au centre.
 9. (ligne 3, colonne 1) `euh-bulles` : Une série de petites bulles de pensée vides qui s'enchaînent (hésitations).
10. (ligne 3, colonne 2) `mots-simples` : Quelques gros blocs de construction simples et colorés qui forment une phrase.
11. (ligne 3, colonne 3) `pas-cle` : Une clé barrée d'une croix rouge.
12. (ligne 3, colonne 4) `car-bus` : Un car coloré de profil.

### sheet-25.png  (à partir de la leçon p6-3)
 1. (ligne 1, colonne 1) `marche-etal` : Un étal de marché avec un auvent et des fruits.
 2. (ligne 1, colonne 2) `invites` : Un petit groupe de personnes souriantes qui arrivent (les invités).
 3. (ligne 1, colonne 3) `tout-clair-merci` : Un pouce levé avec une bulle « OK » en forme de coche et un cœur.
 4. (ligne 1, colonne 4) `ne-plus-ecouter` : Un enfant qui se bouche les oreilles avec une croix sur une oreille.
 5. (ligne 2, colonne 1) `parler-lentement` : Un escargot qui parle avec une bulle de parole.
 6. (ligne 2, colonne 2) `crier` : Un enfant qui crie très fort, bouche grande ouverte, avec des ondes énormes.
 7. (ligne 2, colonne 3) `phrases-courtes` : Trois petites bulles de parole courtes et alignées.
 8. (ligne 2, colonne 4) `bouche-pleine` : Un enfant qui parle la bouche pleine de nourriture, bulle floue.
 9. (ligne 3, colonne 1) `palou-devine-seul` : Le petit lion Palou tout seul devant un mur de mots, qui devine à l'aveugle.
10. (ligne 3, colonne 2) `trop-dur` : Une grosse montagne à escalader avec un panneau « trop dur » (flèche vers le bas).
11. (ligne 3, colonne 3) `aider-verifier` : Une personne qui aide le petit lion Palou et qui vérifie avec une loupe.
12. (ligne 3, colonne 4) `enfant-moi` : Un enfant sympathique qui montre sa poitrine du doigt (moi).

### sheet-26.png  (à partir de la leçon p6-4)
 1. (ligne 1, colonne 1) `palou-portrait` : Le portrait souriant du petit lion Palou.
 2. (ligne 1, colonne 2) `mame-coumba-ecran` : Une grand-mère souriante en boubou vert et turban vert sur l'écran d'une tablette.
 3. (ligne 1, colonne 3) `bonjour-main` : Une main qui fait coucou avec un petit soleil.
 4. (ligne 1, colonne 4) `merci-coeur` : Deux mains qui se joignent autour d'un cœur, symbole de remerciement.
 5. (ligne 2, colonne 1) `idees-ampoules` : Trois ampoules allumées de tailles différentes, avec des étincelles (idées).
 6. (ligne 2, colonne 2) `nettoyer-balai` : Un balai, une pelle et un seau pour nettoyer.
 7. (ligne 2, colonne 3) `tampon-valider` : Un tampon qui marque une grosse coche verte sur une feuille (décision).
 8. (ligne 2, colonne 4) `slogan-megaphone` : Un mégaphone avec une bulle d'étoiles qui en sort.
 9. (ligne 3, colonne 1) `baobab` : Un grand baobab au tronc épais, avec quelques feuilles.
10. (ligne 3, colonne 2) `image-cadre` : Un cadre doré avec un joli paysage coloré.
11. (ligne 3, colonne 3) `tas-sable` : Un tas de sable jaune avec un petit seau et une pelle.
12. (ligne 3, colonne 4) `palou-seul` : Le petit lion Palou tout seul devant une affiche, qui décide seul.

### sheet-27.png  (à partir de la leçon p7-1)
 1. (ligne 1, colonne 1) `moussa-auteur` : Un garçon en tee-shirt jaune qui tient un crayon et signe une affiche.
 2. (ligne 1, colonne 2) `quartier-propre` : Une rue de quartier toute propre avec un petit seau et des fleurs.
 3. (ligne 1, colonne 3) `fresques-murales` : Un mur peint de fresques colorées avec des animaux et des fleurs.
 4. (ligne 1, colonne 4) `voisins-ensemble` : Des voisins de tous âges qui se tiennent par les épaules en souriant.
 5. (ligne 2, colonne 1) `arbres-plantes` : Trois jeunes arbres qui viennent d'être plantés, avec un arrosoir.
 6. (ligne 2, colonne 2) `dessin-simple` : Un petit dessin d'enfant très simple (un trait de crayon).
 7. (ligne 2, colonne 3) `joli-etoile` : Une étoile scintillante qui brille toute seule (quelque chose de joli).
 8. (ligne 2, colonne 4) `rue-fresques-enfants` : Une rue propre avec des fresques colorées et des enfants qui jouent.
 9. (ligne 3, colonne 1) `consigne-precise` : Une feuille de consigne avec une cible et des petites coches précises.
10. (ligne 3, colonne 2) `consigne-vague` : Une feuille de consigne toute floue avec un nuage gris.
11. (ligne 3, colonne 3) `mur-bleu-poissons` : Un mur bleu avec trois poissons jaunes peints dessus.
12. (ligne 3, colonne 4) `truc-beau` : Une forme floue qui scintille, un « truc beau » indéfini.

### sheet-28.png  (à partir de la leçon p7-2)
 1. (ligne 1, colonne 1) `enfants-plantent-arbre` : Des enfants qui plantent un jeune arbre avec une pelle.
 2. (ligne 1, colonne 2) `preciser-consigne` : Un crayon qui ajoute de petits détails sur une consigne.
 3. (ligne 1, colonne 3) `abandonner` : Un petit drapeau blanc planté dans le sol.
 4. (ligne 1, colonne 4) `ia-nulle` : Le petit robot avec un pouce vers le bas et une moue, jugé nul.
 5. (ligne 2, colonne 1) `rue` : Une rue de quartier avec des maisons et un trottoir.
 6. (ligne 2, colonne 2) `enfants-groupe` : Quatre enfants joyeux main dans la main.
 7. (ligne 2, colonne 3) `fleurs` : Un bouquet de fleurs colorées dans un pot.
 8. (ligne 2, colonne 4) `palou-ecrit-vite` : Le petit lion Palou qui écrit à toute vitesse avec plusieurs bras de mouvement.
 9. (ligne 3, colonne 1) `histoire-seule` : Un livre ouvert dont le texte s'écrit tout seul avec une plume magique.
10. (ligne 3, colonne 2) `relire-loupe` : Une loupe qui relit une ligne de texte sur une feuille.
11. (ligne 3, colonne 3) `copier-sans-lire` : Une main qui copie une feuille avec les yeux fermés, un bandeau sur les yeux.
12. (ligne 3, colonne 4) `corriger-crayon-rouge` : Un crayon rouge qui corrige une faute, avec un trait de correction.

### sheet-29.png  (à partir de la leçon p7-3)
 1. (ligne 1, colonne 1) `effacer-colere` : Une gomme énorme avec des yeux fâchés qui efface tout une feuille.
 2. (ligne 1, colonne 2) `expose-sciences` : Une affiche d'exposé de sciences avec un microscope et un atome.
 3. (ligne 1, colonne 3) `histoire-inventee` : Un livre de contes avec des étoiles magiques et un baobab qui danse.
 4. (ligne 1, colonne 4) `journal-quartier` : Un journal de quartier plié avec des petits articles dessinés.
 5. (ligne 2, colonne 1) `lionceau` : Le petit lion Palou en entier, de face, debout, souriant.
 6. (ligne 2, colonne 2) `danse` : Un baobab qui danse en balançant ses branches comme des bras.
 7. (ligne 2, colonne 3) `choisir-corriger` : Un tampon et un crayon rouge, choisir puis corriger.
 8. (ligne 2, colonne 4) `palou-signe` : Le petit lion Palou qui signe une affiche avec une plume.
 9. (ligne 3, colonne 1) `nom-auteur` : Une signature manuscrite stylisée (juste des ondulations) au bas d'une affiche.
10. (ligne 3, colonne 2) `faux-nom` : Un masque de carnaval posé sur un visage, nom volé.
11. (ligne 3, colonne 3) `aide-ia` : Un petit robot qui aide un enfant à tenir un pinceau, ensemble.
12. (ligne 3, colonne 4) `rien` : Un grand cadre complètement vide avec une toile d'araignée.

### sheet-30.png  (à partir de la leçon p7-4)
 1. (ligne 1, colonne 1) `palou-aide` : Le petit lion Palou qui apporte une ampoule à un enfant (il aide).
 2. (ligne 1, colonne 2) `choisir-slogan` : Une main qui choisit un slogan parmi trois bulles de parole.
 3. (ligne 1, colonne 3) `trois-versions` : Trois feuilles légèrement différentes côte à côte.
 4. (ligne 1, colonne 4) `ensemble-nettoie` : Des enfants qui balaient ensemble, un cœur au-dessus.
 5. (ligne 2, colonne 1) `quartier-fier` : Des maisons colorées avec un grand cœur et un drapeau.
 6. (ligne 2, colonne 2) `nom-signature` : Un badge avec un nom (sans texte) et un petit cœur.
 7. (ligne 2, colonne 3) `bouche-dire` : Un enfant qui parle avec une bulle verte souriante.
 8. (ligne 2, colonne 4) `animal-prefere` : Un chat entouré d'un cœur, animal préféré.
 9. (ligne 3, colonne 1) `numero-telephone` : Un clavier de téléphone avec des chiffres et un petit combiné.
10. (ligne 3, colonne 2) `dessin-prefere` : Un dessin d'enfant encadré avec un cœur.
11. (ligne 3, colonne 3) `numero-parents` : Un téléphone avec une photo de parents et un numéro caché.
12. (ligne 3, colonne 4) `couleur-preferee` : Une palette de couleurs avec un cœur sur la couleur choisie.

### sheet-31.png  (à partir de la leçon p8-1)
 1. (ligne 1, colonne 1) `donner-inconnu` : Une main qui tend une maison à une silhouette sombre d'inconnu.
 2. (ligne 1, colonne 2) `donner-rue` : Un panneau de rue donné à une silhouette sombre d'inconnu.
 3. (ligne 1, colonne 3) `ne-pas-repondre-parler` : Une main stop et un enfant qui montre son téléphone à un adulte.
 4. (ligne 1, colonne 4) `publier-vite` : Une photo avec une fusée qui l'envoie à toute vitesse sur un réseau.
 5. (ligne 2, colonne 1) `demander-groupe` : Des enfants et un adulte qui lèvent la main pour donner leur accord.
 6. (ligne 2, colonne 2) `rien-dire` : Une bouche fermée avec une fermeture éclair.
 7. (ligne 2, colonne 3) `publier-ok` : Un bouton d'envoi vert avec une coche.
 8. (ligne 2, colonne 4) `ne-pas-publier` : Un bouton d'envoi rouge barré d'une croix.
 9. (ligne 3, colonne 1) `dessin-classe` : Un dessin de la classe avec des petits bonshommes bâtons, sans visages.
10. (ligne 3, colonne 2) `mains-peignent` : Deux mains qui peignent avec un pinceau, sans visage.
11. (ligne 3, colonne 3) `ecole-adresse` : Un bâtiment d'école avec une épingle d'adresse qui brille.
12. (ligne 3, colonne 4) `publier-quand-meme` : Un bouton d'envoi enfoncé malgré une main stop qui essaie de l'arrêter.

### sheet-32.png  (à partir de la leçon p8-2)
 1. (ligne 1, colonne 1) `respecter-non` : Une main stop et un cœur vert, respect d'un refus.
 2. (ligne 1, colonne 2) `taquiner` : Un enfant qui taquine un autre qui secoue la tête, bulle moqueuse.
 3. (ligne 1, colonne 3) `demander-enfants` : Des enfants qui lèvent la main pour dire oui.
 4. (ligne 1, colonne 4) `demander-adulte` : Un adulte qui hoche la tête avec un grand pouce.
 5. (ligne 2, colonne 1) `cacher-adresse` : Une maison avec une épingle recouverte d'un bandeau noir.
 6. (ligne 2, colonne 2) `photo-sans-visages` : Une photo de dos avec des enfants dont on ne voit pas les visages.
 7. (ligne 2, colonne 3) `envoyer-photo-inconnu` : Une photo qui s'envoie vers une silhouette sombre d'inconnu, danger.
 8. (ligne 2, colonne 4) `montrer-message-adulte` : Un enfant qui montre son téléphone à un adulte inquiet mais bienveillant.
 9. (ligne 3, colonne 1) `repondre-inconnu` : Un enfant qui répond à une bulle d'inconnu sur une tablette.
10. (ligne 3, colonne 2) `mme-diop-portrait` : Le portrait d'une maîtresse en robe wax bleue et blanche, turban, lunettes, souriante.
11. (ligne 3, colonne 3) `inconnu-gentil` : Une silhouette sombre qui sourit trop avec un bonbon à la main (trop gentil).
12. (ligne 3, colonne 4) `secret-chuchote` : Une personne qui chuchote à l'oreille d'un enfant avec un doigt sur les lèvres.

### sheet-33.png  (à partir de la leçon p8-3)
 1. (ligne 1, colonne 1) `seulement-grave` : Une grosse sirène rouge d'alarme allumée, danger grave.
 2. (ligne 1, colonne 2) `des-que-gene` : Un enfant qui lève la main avec un petit nuage de gêne.
 3. (ligne 1, colonne 3) `tout-seul-fort` : Un enfant seul qui serre les poings contre un énorme problème.
 4. (ligne 1, colonne 4) `grand-frere-soeur` : Un grand frère et une grande sœur adolescents qui sourient.
 5. (ligne 2, colonne 1) `oncle-tante` : Un oncle et une tante souriants.
 6. (ligne 2, colonne 2) `numeros-enfants` : Une liste de numéros de téléphone sous des petites têtes d'enfants.
 7. (ligne 2, colonne 3) `envoyer-sans-relire` : Un message qui s'envoie en vitesse avec des fautes qui volent autour.
 8. (ligne 2, colonne 4) `message-ok` : Une bulle de message verte avec une coche.
 9. (ligne 3, colonne 1) `message-non` : Une bulle de message rouge barrée d'une croix.
10. (ligne 3, colonne 2) `bravo-set-setal` : Des mains qui applaudissent devant un balai et un seau, journée de nettoyage.
11. (ligne 3, colonne 3) `merci-parents` : Des parents souriants avec un grand cœur de remerciement.
12. (ligne 3, colonne 4) `mot-de-passe-tablette` : Une tablette avec une clé et des étoiles ****.

### sheet-34.png  (à partir de la leçon p8-4)
 1. (ligne 1, colonne 1) `personne-ira-bien` : Un enfant qui hausse les épaules devant un message sans personne pour le vérifier.
 2. (ligne 1, colonne 2) `ne-pas-donner-adresse` : Une maison avec une épingle barrée d'une croix.
 3. (ligne 1, colonne 3) `demander-avant-publier` : Un doigt qui hésite au-dessus d'un bouton d'envoi, un point d'interrogation.
 4. (ligne 1, colonne 4) `garder-mots-de-passe` : Un coffre-fort avec des clés à l'intérieur.
 5. (ligne 2, colonne 1) `parler-adulte` : Un enfant qui parle à un adulte avec une bulle de confiance.
 6. (ligne 2, colonne 2) `sur-donc-vrai` : Un mégaphone très fort avec un grand « OK » trompeur.
 7. (ligne 2, colonne 3) `ia-peut-se-tromper` : Le petit robot avec une petite erreur qui sort de sa tête, des étincelles.
 8. (ligne 2, colonne 4) `palou-ne-ment-pas` : Le petit lion Palou avec une auréole d'honnêteté et une main sur le cœur.
 9. (ligne 3, colonne 1) `gros-caracteres` : Un grand panneau de lettres énormes (sans texte lisible) qui crie.
10. (ligne 3, colonne 2) `peur-visage` : Un visage terrorisé aux yeux écarquillés et aux cheveux dressés.
11. (ligne 3, colonne 3) `en-couleurs` : Un arc-en-ciel de couleurs vives.
12. (ligne 3, colonne 4) `qui-a-dit` : Une silhouette avec une bulle de parole et un grand point d'interrogation (qui a dit ?).

### sheet-35.png  (à partir de la leçon p9-1)
 1. (ligne 1, colonne 1) `repeter-plus-fort` : Un haut-parleur énorme avec de grandes ondes.
 2. (ligne 1, colonne 2) `redire-plus-vite` : Une bouche qui parle à toute vitesse avec des flèches de vitesse.
 3. (ligne 1, colonne 3) `c-etait-quand` : Un calendrier avec une date entourée et un point d'interrogation.
 4. (ligne 1, colonne 4) `ou-lu` : Un journal et un téléphone avec une épingle qui indique où on a lu.
 5. (ligne 2, colonne 1) `preuve-loupe` : Une loupe sur un document avec un cachet officiel et une coche.
 6. (ligne 2, colonne 2) `source-sure` : Un bouclier vert avec une coche et un petit drapeau, source sûre.
 7. (ligne 2, colonne 3) `source-douteuse` : Un nuage de brouillard gris avec un point d'interrogation, source douteuse.
 8. (ligne 2, colonne 4) `bulletin-meteo` : Un panneau de météo avec soleil, nuage et thermomètre.
 9. (ligne 3, colonne 1) `message-transfere` : Une bulle de message avec plusieurs flèches de transfert « transféré ».
10. (ligne 3, colonne 2) `radio-journaliste` : Une radio avec un micro de journaliste devant.
11. (ligne 3, colonne 3) `photo-sans-date` : Une photo avec un petit calendrier barré d'une croix.
12. (ligne 3, colonne 4) `partages-nombre` : Un compteur de partages avec une grande flèche et un chiffre qui monte.

### sheet-36.png  (à partir de la leçon p9-2)
 1. (ligne 1, colonne 1) `source-date` : Un calendrier et un cachet de source côte à côte.
 2. (ligne 1, colonne 2) `couleur-message` : Une bulle de message avec de nombreuses couleurs.
 3. (ligne 1, colonne 3) `chercher-source` : Une loupe qui remonte une flèche jusqu'à sa source.
 4. (ligne 1, colonne 4) `transferer-vite` : Des flèches de transfert qui partent en rafale, une main rapide.
 5. (ligne 2, colonne 1) `date-calendrier` : Un petit calendrier avec une date entourée.
 6. (ligne 2, colonne 2) `croire-ami` : Deux amis qui se font confiance, des cœurs, sans vérifier.
 7. (ligne 2, colonne 3) `detail-bizarre` : Une loupe sur une main avec six doigts, détail bizarre.
 8. (ligne 2, colonne 4) `image-nette` : Une image très nette avec des petits rayons de netteté.
 9. (ligne 3, colonne 1) `sans-date-auteur` : Une photo sans signature ni date, avec deux petits points d'interrogation.
10. (ligne 3, colonne 2) `croire-premier` : Une personne qui croit tout de suite la première personne qui parle, en pointant du doigt.
11. (ligne 3, colonne 3) `image-grande` : Une très grande image encadrée avec des flèches d'agrandissement.
12. (ligne 3, colonne 4) `adulte-sur-place` : Un adulte avec un casque de chantier devant une école, qui montre qu'il est sur place.

### sheet-37.png  (à partir de la leçon p9-3)
 1. (ligne 1, colonne 1) `a-verifier` : Une loupe avec un point d'interrogation orange.
 2. (ligne 1, colonne 2) `probablement-vraie` : Un cachet vert « vérifié » sur une photo, avec une coche.
 3. (ligne 1, colonne 3) `photo-maitresse` : Une photo prise par la maîtresse avec son nom en signature (sans texte) et une date.
 4. (ligne 1, colonne 4) `mains-six-doigts` : Une main avec six doigts.
 5. (ligne 2, colonne 1) `photo-signee-date` : Une photo avec une signature et un calendrier.
 6. (ligne 2, colonne 2) `chercher-detail` : Une loupe qui cherche un détail bizarre sur une image.
 7. (ligne 2, colonne 3) `auteur-signature` : Une signature de créateur au bas d'une photo.
 8. (ligne 2, colonne 4) `vrai-check` : Un grand cercle vert avec une coche blanche (vrai).
 9. (ligne 3, colonne 1) `faux-croix` : Un grand cercle rouge avec une croix blanche (faux).
10. (ligne 3, colonne 2) `radio-fete-samedi` : Une radio qui diffuse des guirlandes de fête, avec un petit calendrier.
11. (ligne 3, colonne 3) `fete-pluie` : Un nuage de pluie sur une fête annulée.
12. (ligne 3, colonne 4) `mme-diop-confirme` : Une maîtresse en robe wax qui hoche la tête avec un pouce levé.

### sheet-38.png  (à partir de la leçon p9-4)
 1. (ligne 1, colonne 1) `ecole-sous-eau` : Une école dont le bas des murs est sous l'eau, image truquée.
 2. (ligne 1, colonne 2) `prix-ticket` : Un ticket de caisse avec une pièce et un prix.
 3. (ligne 1, colonne 3) `joli-ou-pas` : Un petit nuage de paillettes et un point d'interrogation, est-ce joli ?
 4. (ligne 1, colonne 4) `chercher-source-q` : Une loupe sur une source qui coule.
 5. (ligne 2, colonne 1) `preuve-q` : Un dossier et une loupe : demander une preuve.
 6. (ligne 2, colonne 2) `confirmer-personne` : Deux personnes qui se serrent la main : confirmation.
 7. (ligne 2, colonne 3) `premiere-idee` : Une ampoule qui s'allume trop vite, avec un chronomètre pressé.
 8. (ligne 2, colonne 4) `ecouter-voisins` : Une grande oreille qui écoute des voisins qui parlent autour.
 9. (ligne 3, colonne 1) `attendre-autre` : Un enfant qui attend avec un sablier, les bras croisés.
10. (ligne 3, colonne 2) `vrai-besoin` : Un cœur avec une cible, le vrai besoin.
11. (ligne 3, colonne 3) `pas-besoin` : Une étoile barrée d'une croix légère : pas un besoin.
12. (ligne 3, colonne 4) `poubelles-rue` : Plusieurs poubelles alignées le long d'une rue.

### sheet-39.png  (à partir de la leçon p10-1)
 1. (ligne 1, colonne 1) `statue-or` : Une statue dorée sur un piédestal.
 2. (ligne 1, colonne 2) `camion-ramassage` : Un camion de ramassage des ordures avec un éboueur.
 3. (ligne 1, colonne 3) `jeu-video` : Une console de jeu vidéo avec une manette.
 4. (ligne 1, colonne 4) `gene-question` : Un voisin qui fait la moue avec une bulle de question : qu'est-ce qui gêne ?
 5. (ligne 2, colonne 1) `coupable-doigt` : Un doigt accusateur pointé vers un petit personnage.
 6. (ligne 2, colonne 2) `moment-horloge` : Une horloge avec un point d'interrogation, à quel moment.
 7. (ligne 2, colonne 3) `pourquoi-accuse` : Une bulle de reproche avec un doigt pointé.
 8. (ligne 2, colonne 4) `dechets-ecole` : Des sacs poubelles éventrés devant la grille d'une école.
 9. (ligne 3, colonne 1) `bruit-rue` : Une rue avec un énorme haut-parleur et de grandes ondes de bruit.
10. (ligne 3, colonne 2) `ombre-manque` : Une place en plein soleil sans arbre ni parasol, un thermomètre rouge.
11. (ligne 3, colonne 3) `eau-stagne` : Une flaque d'eau verdâtre avec des moustiques.
12. (ligne 3, colonne 4) `poubelle-pleine-camera` : Une poubelle pleine surveillée par une petite caméra à l'œil vert.

### sheet-40.png  (à partir de la leçon p10-2)
 1. (ligne 1, colonne 1) `remplacer-voisins` : Un robot qui pousse des voisins dehors, avec une croix (remplacer).
 2. (ligne 1, colonne 2) `calendrier-ramassage` : Un calendrier avec des petits camions de ramassage cochés.
 3. (ligne 1, colonne 3) `ia-jette-dechets` : Un petit robot qui essaie de ramasser des déchets avec des bras trop courts.
 4. (ligne 1, colonne 4) `photos-pirogues` : Des photos de pirogues colorées sur une plage.
 5. (ligne 2, colonne 1) `photos-poubelles` : Deux photos : une poubelle pleine et une poubelle vide.
 6. (ligne 2, colonne 2) `photos-anniversaire` : Un gâteau d'anniversaire avec des bougies et des ballons.
 7. (ligne 2, colonne 3) `idee-geniale` : Une ampoule géante avec des étoiles, idée géniale.
 8. (ligne 2, colonne 4) `moyens-ignores` : Une pièce de monnaie et un outil barrés d'une petite croix : sans moyens.
 9. (ligne 3, colonne 1) `faisable-check` : Un marteau et une grosse coche verte : faisable.
10. (ligne 3, colonne 2) `tri-dechets-photos` : Un téléphone qui trie des déchets en bacs de couleurs par photo.
11. (ligne 3, colonne 3) `message-voisins` : Un téléphone avec une bulle de message envoyé à des petites maisons.
12. (ligne 3, colonne 4) `tester-idee` : Un tube à essai avec une étincelle, tester l'idée.

### sheet-41.png  (à partir de la leçon p10-3)
 1. (ligne 1, colonne 1) `remplacer-poubelle` : Une poubelle de chantier à remplacer par une grande poubelle neuve.
 2. (ligne 1, colonne 2) `decorer-classe` : Une salle de classe avec des guirlandes de décoration.
 3. (ligne 1, colonne 3) `prototype-maquette` : Une petite maquette de poubelle en carton et en bois avec un petit signal vert.
 4. (ligne 1, colonne 4) `plus-tard` : Un calendrier avec une flèche vers l'avenir et un petit sablier.
 5. (ligne 2, colonne 1) `dessin-poubelle` : Un dessin de poubelle intelligente avec un signal lumineux, au crayon.
 6. (ligne 2, colonne 2) `appli-tous-telephones` : Une multitude de téléphones avec la même petite appli.
 7. (ligne 2, colonne 3) `signal-lumineux` : Une poubelle avec un petit voyant vert qui brille.
 8. (ligne 2, colonne 4) `reseau-ville` : Un réseau de points reliés qui couvre toute une ville.
 9. (ligne 3, colonne 1) `a-qui-ca-sert` : Des gens divers autour d'un point d'interrogation, à qui ça sert.
10. (ligne 3, colonne 2) `likes-coeurs` : Des cœurs et des pouces qui montent en nombre.
11. (ligne 3, colonne 3) `photos-poubelles-q` : Un appareil photo qui prend des poubelles pleines et vides.
12. (ligne 3, colonne 4) `ruban-fete` : Un ruban de fête rouge noué en nœud.

### sheet-42.png  (à partir de la leçon p10-3)
 1. (ligne 1, colonne 1) `poubelles` : Une rangée de poubelles vertes avec un symbole de recyclage.
 2. (ligne 1, colonne 2) `lumiere-verte` : Une lampe qui brille d'une belle lumière verte.
 3. (ligne 1, colonne 3) `son-doux` : Un petit haut-parleur avec de douces ondes bleues.
 4. (ligne 1, colonne 4) `avant-fete` : Un calendrier avec une flèche vers un jour de fête encore loin.
 5. (ligne 2, colonne 1) `pendant-fete` : Des guirlandes et des gens qui dansent, jour de fête.
 6. (ligne 2, colonne 2) `presenter-invention` : Un enfant sur une petite estrade qui présente une poubelle intelligente.
 7. (ligne 2, colonne 3) `dessin-prototype` : Un enfant qui dessine un prototype au crayon sur une grande feuille.
 8. (ligne 2, colonne 4) `avis-voisins` : Des voisins avec des pouces levés et des bulles d'avis.
 9. (ligne 3, colonne 1) `ecoute-ameliore` : Une oreille et une flèche qui monte vers une ampoule plus brillante.
10. (ligne 3, colonne 2) `se-facher` : Un enfant très fâché qui pointe la porte et tape du pied.
11. (ligne 3, colonne 3) `faire-semblant` : Un enfant qui se bouche les oreilles en fermant les yeux, il fait semblant.
12. (ligne 3, colonne 4) `demander-accord` : Une main qui demande l'accord avec une coche verte.

### sheet-43.png  (à partir de la leçon p10-4)
 1. (ligne 1, colonne 1) `garder-adresses` : Un classeur plein d'adresses de voisins avec des épingles.
 2. (ligne 1, colonne 2) `cacher-visages` : Une photo de groupe dont les visages sont floutés.
 3. (ligne 1, colonne 3) `tout-publier` : Un mégaphone géant et une étoile de célébrité, tout publier.
 4. (ligne 1, colonne 4) `dechets-ramasses` : Une rue propre avec un camion de ramassage qui repart, sacs ramassés.
 5. (ligne 2, colonne 1) `ombre-place` : Une place avec un grand arbre qui donne de l'ombre et un banc.
 6. (ligne 2, colonne 2) `rues-sures` : Une rue avec un lampadaire et un passage piéton, tout est sûr.
 7. (ligne 2, colonne 3) `verifier-adulte` : Un enfant qui montre son travail à un adulte, une loupe de vérification.

