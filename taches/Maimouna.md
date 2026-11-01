# Maïmouna · Tâches de génération

**Branche :** `dev_maimouna`, dans l'ancien dépôt, à créer à partir de `test` · Une pull request vers `test` par tâche finie.

**Domaine :** tu es **la responsable de toute la génération** : les décors des lieux, les vidéos et les voix. Tu travailles avec Louise-Sophie, qui fait les personnages, les émotes de Palou et les pictogrammes.
**Parcours :** 10-12 ans, « Les vacances à Dakar ».
**À lire d'abord :** `taches/00_GUIDE.md` (le style et les règles), puis `docs/PARCOURS_10-12_DAKAR.html` en entier.

Fais les tâches **dans l'ordre**. Avant chaque série, envoie **1 essai** à Lansana et attends son « validé ».

---

## L'histoire, en deux mots

C'est les vacances. Papa Ibou, le chauffeur de car rapide, emmène Moussa et Fatou, qui ont maintenant 11 ans, et Palou découvrir Dakar.
- Ils partent de leur village.
- Il y a 12 modules, et chaque module se passe dans un lieu de Dakar.
- Papa Ibou dépose les enfants avant la 1ʳᵉ leçon du module, et revient les chercher après la 4ᵉ pour les conduire au lieu suivant.

## Ce que tu reçois de Louise-Sophie

Les planches des personnages et du car rapide, les émotes de Palou et les éléments découpables pour les vidéos. Ils sont rangés dans `frontend/public/images/parcours1012/references/`, `palou/` et `video/`.
- **Commence par les décors (M1 et M2),** qui ne demandent aucun personnage, pendant que Louise-Sophie fait ses planches.
- Pour les vidéos (M3), attends ses planches validées.
- Échangez-vous vos fichiers directement, sans attendre GitHub.

## Où ranger tes fichiers

| Type | Dossier |
|---|---|
| Décors | `frontend/public/images/parcours1012/decors/` |
| Vidéos | `frontend/public/videos/parcours1012/` |
| Voix d'essai | `frontend/public/audio/palou/1012/essais/` |

Les noms sont tout en minuscules, sans accent ni espace, avec des tirets.

---

## M1 · Les décors du voyage et du module 1

**Format :** 1600 × 900 px, paysage, PNG, **sans personnage ni car**. Ils seront ajoutés par-dessus, dans les vidéos et les illustrations.

| Fichier | Décor |
|---|---|
| `village.png` | Le village de Moussa et Fatou, le matin. Maisons basses aux murs ocre, un grand arbre au centre, une piste de sable qui part vers la route, des chèvres au loin, un ciel clair. |
| `route.png` | La route nationale vers Dakar : asphalte, bas-côtés de sable, baobabs, ciel bleu. La route traverse l'image **de gauche à droite, au premier plan,** pour y faire rouler le car. |
| `arrivee-dakar.png` | L'entrée de Dakar : immeubles, circulation, panneaux sans texte, l'océan au loin. |
| `monument-exterieur.png` | Le Monument de la Renaissance africaine vu d'en bas : la colline, le grand escalier, le monument en bronze contre le ciel. Au premier plan, une esplanade **vide** où le car peut s'arrêter. |
| `monument-hall.png` | Le hall d'accueil du monument : sol clair, grandes baies vitrées, et une **borne guide interactive** (un écran sur pied avec un micro), sans texte. |
| `monument-sommet.png` | La vue depuis le sommet : Dakar, l'océan, les Mamelles et le phare au loin. |

**Essai à faire valider :** `monument-exterieur.png`.

---

## M2 · Les décors des 11 autres lieux

Même format. Il y a **2 décors par lieu** :
- **`-exterieur`,** là où le car s'arrête, avec un espace libre au premier plan ;
- **`-interieur`,** là où se passe la leçon.

| Lieu | Fichiers | L'extérieur | L'intérieur |
|---|---|---|---|
| Port autonome de Dakar | `port-exterieur.png`, `port-interieur.png` | Les grues géantes, les piles de conteneurs colorés, un cargo à quai, la mer. | La salle de suivi des conteneurs : des écrans avec des cartes et des points, sans texte, et une fenêtre sur les grues. |
| Gare du TER | `gare-ter-exterieur.png`, `gare-ter-interieur.png` | Le parvis moderne de la gare, avec un train blanc sans logo. | Le quai, les portiques d'entrée, des voyageurs flous au loin et un grand panneau d'affichage sans texte. |
| Plage de Soumbédioune | `soumbedioune-exterieur.png`, `soumbedioune-interieur.png` | La baie avec les pirogues colorées tirées sur le sable et la corniche au-dessus. | Le marché au poisson sur la plage : étals de poissons, caisses, filets. |
| Parc de Hann | `parc-hann-exterieur.png`, `parc-hann-interieur.png` | L'entrée du parc, de grands arbres et un chemin de terre. | Une clairière sous les arbres, avec une petite caméra fixée à un tronc (une caméra de surveillance des animaux). |
| Laboratoire de langues | `labo-langues-exterieur.png`, `labo-langues-interieur.png` | Un bâtiment universitaire sous les arbres, avec des étudiants flous au loin. | Un petit laboratoire : ordinateurs, micros sur pied, casques audio et un tableau blanc avec des ondes sonores dessinées. |
| Île de Gorée | `goree-exterieur.png`, `goree-interieur.png` | La chaloupe qui arrive au petit port de Gorée, les maisons colorées aux balcons, les bougainvilliers. | Une ruelle calme de Gorée et l'atelier de Kiné : peintures sur verre au mur, pinceaux, lumière douce. **Calme et respectueux.** |
| Musée des Civilisations noires | `musee-exterieur.png`, `musee-interieur.png` | La façade ronde du musée et son esplanade. | Une grande salle d'exposition : masques et sculptures sous vitrine, éclairage doux, une tablette sur un pupitre. |
| Dakar Arena | `dakar-arena-exterieur.png`, `dakar-arena-interieur.png` | La grande salle de sport moderne et son parvis. | Le terrain de basket vu depuis le bord, avec les gradins vides, les paniers et un ballon posé. |
| Phare des Mamelles | `phare-exterieur.png`, `phare-interieur.png` | Le phare blanc sur sa colline, l'océan, un léger brouillard au loin. | L'intérieur du phare : l'escalier en colimaçon, puis la grande lampe en haut, avec l'océan par la fenêtre. |
| Palais de la République | `palais-exterieur.png`, `palais-interieur.png` | Le palais blanc **vu de l'extérieur,** derrière ses grilles, les jardins, l'avenue. **On n'entre pas dans le palais.** | L'avenue Léopold-Sédar-Senghor ombragée, avec un banc, là où se passe la leçon. |
| Place de l'Indépendance | `place-independance-exterieur.png`, `place-independance-interieur.png` | La grande place, les immeubles autour, la fontaine. | La place décorée pour la fête de fin de vacances : guirlandes, une petite estrade, des chaises. |

**L'ordre :** fais les lieux dans l'ordre des modules, du port à la place de l'Indépendance.

**C'est fini quand** les 22 décors sont validés.

---

## M3 · Les vidéos

**Format :**
- 1920 × 1080, MP4, 10 à 20 secondes ;
- **aucun texte à l'écran** ;
- **fin en fondu au noir** ;
- pas de voix ;
- une petite musique joyeuse ou le bruit du car est le bienvenu, à faire valider.

**Avec quoi :** l'outil de génération ou de montage que tu maîtrises. Pars des décors de M1 et M2, et des éléments de Louise-Sophie : car, personnages et gestes. Le plus sûr est de **monter** les vidéos à partir de ces images : le car qui roule sur le décor, les personnages qui apparaissent et font au revoir. Le car et les personnages restent ainsi identiques d'une vidéo à l'autre.

### La vidéo d'ouverture : `ouverture.mp4`
1. **Le village, le matin** (décor `village.png`). Le car rapide de Papa Ibou arrive et s'arrête.
2. **Papa Ibou fait signe** par la vitre. Moussa et Fatou, qui ont 11 ans, arrivent en courant avec Palou, sacs sur le dos.
3. **Ils montent** dans le car par la porte arrière.
4. **Le car repart.** On le voit rouler sur la route (`route.png`), entre les baobabs.
5. **Plan des trois** assis dans le car, le nez à la vitre, émerveillés.
6. **L'entrée de Dakar** (`arrivee-dakar.png`). Fondu au noir.

### Le modèle d'arrivée : `arrivee-a1.mp4` … `arrivee-a12.mp4`
1. Le car arrive sur le décor `<lieu>-exterieur.png` et s'arrête.
2. La porte arrière s'ouvre. Moussa, Fatou et Palou descendent.
3. Ils se retournent et font au revoir de la main à Papa Ibou.
4. Papa Ibou leur répond de la main, et le car repart.
5. Les trois marchent vers le lieu. Fondu au noir.

**Le module 7, Gorée,** fait exception. Papa Ibou les dépose au port, et la vidéo montre ensuite la **chaloupe** qui traverse vers l'île, avant qu'ils marchent vers les maisons colorées.

### Le modèle de départ : `depart-a1.mp4` … `depart-a12.mp4`
1. Le décor `<lieu>-exterieur.png`. Le car de Papa Ibou revient et s'arrête.
2. Moussa, Fatou et Palou se retournent vers **les personnages rencontrés sur ce lieu**, qui sont alignés près de l'entrée, et leur font au revoir de la main. Les personnages répondent.
3. Les trois montent dans le car, qui repart. Fondu au noir.

**Après le module 12,** `depart-a12.mp4` est la fin du parcours : le car ramène tout le monde au village (`route.png`, puis `village.png`). Tous les personnages du voyage font au revoir sur la place, au début de la vidéo.

### Les personnages qui font au revoir dans chaque vidéo de départ

| Module | Lieu | Personnages |
|---|---|---|
| a1 | Monument de la Renaissance | Ousmane, Mariama |
| a2 | Port autonome | Omar, Seynabou |
| a3 | Gare du TER | Rama, Ablaye |
| a4 | Soumbédioune | Vieux Mbaye, Sokhna |
| a5 | Parc de Hann | Oumy, Djibril |
| a6 | Laboratoire de langues | Docteure Penda, Alioune |
| a7 | Île de Gorée | Tante Fama, Kiné |
| a8 | Musée des Civilisations noires | Madame Yacine |
| a9 | Dakar Arena | Coach Astou, Ngoné |
| a10 | Phare des Mamelles | Samba, Ndella |
| a11 | Palais de la République | Maître Thioro |
| a12 | Place de l'Indépendance | Tous les personnages du voyage |

**La méthode, pour aller vite et rester cohérente :**
1. Fabrique d'abord l'ouverture, puis `arrivee-a1` et `depart-a1`. Envoie-les à Lansana.
2. Une fois validés, ces deux derniers deviennent tes **modèles**. Pour les 22 autres, tu ne changes que le décor et les personnages.

**C'est fini quand** les 25 vidéos sont validées. Elles sont listées dans ton rapport.

---

## M4 · La voix de Palou pour le 10-12

Palou a grandi : il lui faut **une voix un peu plus mature** que dans le 7-9, mais on doit toujours reconnaître Palou.
- **Seul Palou a une voix.** Il lit aussi les passages des autres personnages.
- **Pas de précipitation :** les crédits ElevenLabs se renouvellent le **6 novembre**.

**Les étapes :**
1. **Écoute la voix actuelle** de Palou, par exemple dans `frontend/public/audio/palou/lecons/m01/p1-1/`.
2. **Prépare 3 voix candidates** sur ElevenLabs. Lansana te donnera l'accès au compte : **ne mets jamais la clé** dans un fichier ou un message. Fais dire la même phrase d'essai aux 3 voix :
   > « Bienvenue à Dakar ! Ici, on va découvrir comment l'iya apprend, observe et parfois se trompe. Prêts ? On y va ! »
3. **Range les 3 essais :** `essais/candidate-1.mp3`, `candidate-2.mp3` et `candidate-3.mp3`. Envoie-les à Lansana, qui choisit.
4. **Note dans ton rapport** les réglages de la voix choisie : son identifiant, le modèle, la stabilité et la similarité.

**Pour comparer,** les réglages de la voix du 7-9 sont :
- le modèle `eleven_v4` ;
- une stabilité de 0,53 et une similarité de 1,0 ;
- une sortie mp3 ;
- l'émotion passe par des balises dans le texte : `[excited]`, `[enthusiastic]`, `[joyful]`.

**Les règles de prononciation,** à appliquer au texte envoyé à la voix (pas au texte affiché) :

| Écrit | Envoyé à la voix |
|---|---|
| « IA » | « iya » |
| « l'IA » | « l'iya » |
| « une IA » | « une niya » |
| « des IA », « les IA » | « des ziya », « les ziya » |
| « Mme » | « Madame » |

- **L'énergie :** toujours vive et joyeuse. Pas de balises douces comme `[softly]` ou `[curious]`, qui rendent la voix trop basse.
- **Aucune flèche « → »** dans les phrases : elle crée de longues pauses.

---

## M5 · Les voix des leçons

Quand les leçons du 10-12 seront écrites et validées, Lansana t'enverra la liste des phrases de chaque leçon : un fichier `.csv` par leçon. Tu génères alors les voix avec la voix choisie en M4, en suivant la méthode du 7-9 (`scripts/generate_voice79.py`).
- **Dossier :** `frontend/public/audio/palou/1012/a1/a1-1/` et suivants. Chaque fichier se nomme `<leçon>_<clé>.mp3`, comme dans la liste.
- **Après chaque leçon, vérifie :**
  - aucun fichier ne manque ;
  - aucune durée n'est anormale, par exemple un silence très long ou une phrase coupée ;
  - écoute au moins 5 phrases.
- **Compression :** les voix sont ensuite réduites en MP3 mono à 48 kbit/s pour alléger le site. Lansana le fait, ou te donnera l'outil.
- **Ne lance jamais de génération en série** sans l'accord de Lansana : chaque leçon coûte environ 1 300 crédits.

---

## Ordre de travail

1. **M1,** les décors du voyage et du module 1.
2. **M4,** les 3 voix candidates, en parallèle, quand Lansana t'a donné l'accès.
3. **M2,** les décors des 11 autres lieux.
4. **M3,** les vidéos, dès que les planches de Louise-Sophie sont validées : l'ouverture et le module 1 d'abord.
5. **M5,** quand les leçons arrivent.

Si ton quota s'épuise, note dans ton rapport où tu t'es arrêtée, et reprends exactement là.

## Ton rapport

Tiens à jour `taches/rapports/RAPPORT_Maimouna.md` sur ta branche, comme décrit dans le guide. Indique :
- les fichiers produits ;
- le prompt type de chaque série ;
- les outils utilisés pour les vidéos ;
- ce qui n'est pas satisfaisant ;
- tes questions.
