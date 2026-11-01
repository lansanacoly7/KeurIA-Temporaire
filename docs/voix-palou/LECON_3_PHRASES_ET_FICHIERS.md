# Brief de référence : créer ou modifier un module du parcours 7-9 (avec voix)

> **MISE À JOUR : le module 8 « Mon bouclier numérique » (leçons 29 à 32) est maintenant FAIT** (jeu `shield` « Cache pour protéger », plus `layers` et les manches classiques, avec les voix). **Maimouna n'a donc plus de module à faire.** Les 10 modules du parcours 7-9 sont complets. Ce document reste le guide de référence : si tu dois modifier un module ou ajouter un jeu, il explique la méthode, les fichiers à toucher et le catalogue des jeux. Ignore les passages qui disent « le module 8 est à toi » : ils décrivent la mission d'origine.

## Ancienne mission de Maimouna : le module 8 (leçons 29 à 32), maintenant terminé

> **À l'attention du Claude de Maimouna.** Ce fichier est ton brief. Il remplace l'ancien contenu (la leçon 8 est terminée : ses 23 fichiers audio sont dans `frontend/public/audio/palou/lecons/m02/p2-4/`). Tu vas faire, pour le **module 8**, exactement le même travail que le Claude de Lansana a fait pour les modules 3 à 7, avec la même qualité. Lis tout avant de commencer. Parle à Maimouna en français, simplement, et dis-lui toujours clairement ce qui est fait, ce qui ne l'est pas et ce qui reste à décider.

## 1. Le contexte

**kEur IA** est une plateforme qui apprend l'IA aux enfants sénégalais. Tu travailles sur le **parcours 7-9 ans**, « Palou à Dakar » : 10 modules de 4 leçons, avec **Palou**, un petit lion-robot, comme guide. Chaque leçon enchaîne des écrans : histoire, découverte, jeu (« À toi de jouer »), pourquoi, « l'IA et moi », création, bravo.

**Pourquoi ce travail.** Les jeux étaient répétitifs (choisir, toucher plusieurs réponses, ranger dans des boîtes). La demande de Lansana : des **mécaniques très simples, liées à l'IA et au thème du module**, où l'**enfant voit et comprend le lien avec l'IA** (il fait un geste simple, Palou fait la même chose à l'écran, puis dit le lien). On garde de temps en temps le jeu classique (toucher une image, glisser-déposer) dans chaque module, pour la variété.

**Ce qui est déjà fait (n'y touche pas, sauf bug) :** les modules 1 à 7, 9 et 10 (leçons 1 à 28 et 33 à 40), avec leurs voix. Seul le **module 8 manque : c'est le tien.** (Le jeu `loupe` du module 9, qui agrandit une zone d'image, et `verify` peuvent t'inspirer pour le module 8.) Les leçons 1 à 8 gardent leur mise en page d'origine. À partir de la leçon 9, chaque module a un jeu signature, déjà codé :

| Module | Jeu (type de manche dans le JSON) | Idée |
|---|---|---|
| 3 | `whois`, `rulesort`, `cleanup` | décrire un objet avec des données, choisir une règle de tri, retirer les intrus |
| 4 | `train`, `relabel`, `probe` | entraîner Palou avec des exemples, corriger une étiquette, tester et corriger |
| 5 | `focus` (pixels, flou, sombre), `lens`, `probe` | les yeux de Palou : plus ou moins net, choisir ce qu'il regarde |
| 6 | `speak` | cartes de mots qui forment une phrase pour « parler » à Palou (pas de micro) |
| 7 | `layers` | des cartes qui s'empilent dans le dessin de Palou |
| 9 | `verify`, `loupe` | enquête (questions utiles ou inutiles, jauge de confiance, tampon vrai / faux / pas prouvé) et loupe sur une image |
| 10 | `machine` (+ `verify`, `train`, `layers` réutilisés) | construis ton IA en 3 cases (elle regarde, elle apprend, elle fait), puis teste-la |
| 8 | `shield` (+ `layers` réutilisé) | cache pour protéger : l'enfant cache les secrets d'un message ou d'une photo sous un flou |

**Le module 8 est à toi.** Titre « Mon bouclier numérique », décor : le groupe WhatsApp de la classe. Thème : protéger les données personnelles (le secret ou pas, le droit à l'image, l'adulte de confiance, le bouclier numérique). Le contenu existe déjà dans `frontend/content/parcours79/m08.json` (histoires, jeux classiques, création) : tu **remplaces certaines manches de jeu** par des jeux simples liés à l'IA, tu gardes le reste.

## 2. Ta façon de travailler (très important)

1. **Plan d'abord, code ensuite.** Présente à Maimouna un plan court (tableau : leçon, manche 1, manche 2) et **attends son accord** avant d'écrire la moindre ligne. Le plan de départ est au §3 : propose-le, adapte-le si elle le demande.
2. **Leçon par leçon, mais tout le module d'un coup une fois le plan validé.** Pour chaque leçon : jeu, contenu, tests, voix, vérification dans un vrai navigateur, puis la suivante.
3. **Vrai travail, pas de maquette.** Chaque jeu doit être testé pour de vrai (voir §6), en version ordinateur **et** téléphone (390 × 844).
4. **Reste dans ta mission.** Ne refais pas les autres modules, ne change pas la charte graphique, ne « corrige » pas d'autres fichiers au passage, ne propose pas de gros chantiers en plus. Si tu vois un vrai bug ailleurs, signale-le, ne le corrige pas sans demander.
5. **Dis la vérité sur ce qui est fait.** Si un test échoue, montre-le. Si une étape est sautée, dis-le. Quand c'est vérifié, dis-le sans hésiter.
6. **Ne pousse sur GitHub que si Maimouna le demande**, et seulement sur sa branche (`dev_maimounasall`) ou celle qu'elle indique. Ne fais jamais de `push --force`. Ne mélange pas dans ton commit des fichiers qui ne sont pas à toi (travail en cours de l'équipe).
7. **Aucun secret dans le dépôt** : la clé ElevenLabs reste dans une variable d'environnement. Si une clé n'est pas fournie, demande-la à Maimouna.

## 3. Le plan proposé pour le module 8

Mécanique du module : **« Cache pour protéger »**. Une image s'affiche (message ou photo, jamais de vrai enfant ni de vraies données). L'enfant **touche ce qui doit rester secret** et un flou ou une pastille le cache sous son doigt. Il voit ce qu'un inconnu pourrait lire, puis ce qui reste invisible une fois protégé. Le lien : une photo en ligne se copie et se retrouve, donc ce qu'on y cache ne peut plus être lu. Les zones sont des **boutons placés sur l'image** (tout se joue au toucher, aucune caméra, aucun micro).

| Leçon | Manche 1 | Manche 2 |
|---|---|---|
| **29 · p8-1 Secret ou pas secret ?** | Glisser-déposer classique : « secret » / « pas secret » | **R « Cache les secrets »** : sur le message de Moussa pour le groupe, l'enfant touche les informations à cacher (adresse, numéro, photo) ; chaque secret touché se cache, les autres restent visibles |
| **30 · p8-2 Je partage ou pas ?** | **S « Cache avant de partager »** : la photo de la classe avec le panneau de l'école ; l'enfant cache ce qui donne l'adresse et le visage d'un camarade qui a dit non | Choix classique : « Un camarade dit non à la photo. Que faire ? » |
| **31 · p8-3 Un adulte de confiance** | Choix classique avec images : « Un inconnu te demande une photo. Que fais-tu ? » | **T « À qui je le montre ? »** : un message d'un inconnu arrive ; l'enfant touche ceux à qui il le montre (maîtresse, parent) et refuse les autres |
| **32 · p8-4 Mission bouclier** | Glisser-déposer classique : « bouclier » / « piège » | **U « Construis ton bouclier »** : l'enfant ajoute 3 protections au message de Moussa (cacher l'adresse, demander à un adulte, relire) ; chacune s'ajoute au bouclier |

Remarques de conception : un **seul composant** pour R, S, T et U (une image ou un message, des zones à toucher, un résultat visible) ; le sujet touche à la sécurité des enfants, donc des phrases **rassurantes** (« tu as bien fait de demander », jamais de peur) ; chaque erreur est expliquée gentiment.

## 4. Comment le code est organisé (à lire avant de coder)

Une leçon est un fichier JSON (`frontend/content/parcours79/m08.json`) : une liste d'**écrans** (`story`, `discover`, `play`, `why`, `ai`, `create`, `bravo`). Un écran `play` ou `why` contient des **manches** (`rounds`). Chaque manche a un `type`.

Types existants que tu peux **réutiliser tels quels** (cherche leur description dans `frontend/app/dashboard/parcours79/types.ts`) : `choose` (une seule bonne réponse), `multi` (toucher toutes les bonnes), `sort` (ranger dans des boîtes), et les jeux signatures des modules 3 à 7. **Avant de créer un nouveau type, regarde si l'un d'eux suffit** : par exemple `layers` (cartes qui s'ajoutent dans un « dessin ») ou `cleanup` (toucher pour retirer) sont proches de ce qu'il faut pour R, S, T, U. Si un type existant convient avec un autre habillage, **réutilise-le** plutôt que d'en inventer un.

Si un nouveau type est vraiment nécessaire (ex. `shield`), voici les **8 endroits à toucher**, avec un modèle à copier à chaque fois (prends un type récent comme `layers`, `lens` ou `probe`) :

1. `frontend/app/dashboard/parcours79/types.ts` : l'interface du type (commentaire en français) et son ajout à l'union `Round`.
2. `frontend/app/dashboard/parcours79/activities.tsx` : le composant de la manche (`XxxRoundView`) et la ligne `if (round.type === "xxx") return …` dans `RoundView`. Utilise `sayRound(voice, "ok" | "oN" | "sN", texte)` pour lire une phrase préparée, `onMistake()` à la 1re erreur d'un même choix, `onDone()` à la réussite, `sfx.ok()` / `sfx.almost()` pour les sons, `burstAt(el)` pour les confettis, `FeedbackBox` pour le message.
3. `frontend/app/dashboard/parcours79/LessonPlayer79.tsx` : ajoute ton type dans la condition de la classe `with-sort` (la liste des types qui élargissent l'écran).
4. `frontend/app/dashboard/parcours79/parcours79.css` : le style, **avec une section `@media (max-width: 640px)` pour le téléphone** et `prefers-reduced-motion`. Réutilise les classes existantes quand c'est possible (`.p79-opt`, `.p79-tr-*`, `.p79-ly-*`).
5. `backend/apps/curriculum/parcours79.py` : une fonction `_check_xxx(report, where, rnd)` qui **valide le contenu** (nombre de cartes, une seule bonne réponse, explication obligatoire pour chaque mauvais choix, etc.), l'appel dans `_check_round`, et la branche dans `export_markdown` pour la relecture.
6. `backend/apps/curriculum/test_parcours79.py` : 4 à 5 tests (`round_of_type('xxx')` renvoie la manche réelle ; teste le contenu réel valide, puis chaque règle refusée).
7. `frontend/tests/parcours79-player.test.mjs` : une branche dans `playRound` pour que le test automatique sache jouer ta manche (avec `wrongFirst`).
8. `scripts/export_voice79.py` : les clés audio de ta manche (voir §5).

## 5. Règles de contenu (le validateur les impose : `check_parcours79`)

Public : enfants de **7 à 9 ans**. Français très simple, concret, jamais de mot compliqué sans explication.
- **Phrases courtes** : 2 phrases au maximum par écran, **14 mots au maximum** par phrase (idéalement 12). Une consigne : 3 phrases au maximum.
- **Chaque mauvaise réponse a une explication** gentille et courte (`explain`). La bonne réponse n'est pas systématiquement la plus longue.
- Chaque manche a `prompt` (consigne), `hint` (indice) et `success` (bravo).
- **Pictogrammes** : `pict` doit exister dans `frontend/public/images/parcours79/pictos/<id>.webp`. Cherche dans ce dossier avant d'inventer un nom. Le validateur signale les pictos manquants. Ne crée pas de nouvelles images sans demander à Maimouna.
- **Personnages** : n'écris dans un texte que les personnages listés dans `cast` de la leçon (sinon erreur « personnages cités mais absents »).
- Pas de ton qui fait peur ; pas d'emoji dans les textes ; pas de vraie donnée personnelle.
- Le `learned` du bravo tient en une phrase.

**Éditer le JSON.** Les fichiers sont mis en forme **à la main** (pas de `json.dump`, qui réécrirait tout). Pour changer des manches, utilise l'outil d'édition de fichiers de Claude Code, ou un petit script Python qui repère les lignes et conserve le saut de ligne d'origine (`\r\n` sous Windows). Après chaque modification : `venv\Scripts\python.exe manage.py check_parcours79` (depuis `backend`) doit afficher « Contenu conforme ».

## 6. Vérifier pour de vrai

Depuis `backend` (Python du venv) :
- `venv\Scripts\python.exe manage.py check_parcours79` : contenu conforme.
- `venv\Scripts\python.exe manage.py test apps.curriculum` : tous les tests passent.
- `venv\Scripts\python.exe -m ruff check apps/curriculum` : aucune erreur.

Depuis `frontend` (Node ≥ 22 ; sous Windows, `node` n'est parfois pas dans le PATH : cherche `C:\Program Files\nodejs`) :
- `node node_modules\typescript\bin\tsc --noEmit` : aucune erreur de type.
- `node --test tests/parcours79-logic.test.mjs tests/parcours79-player.test.mjs` : tous les tests passent.

**Dans un vrai navigateur.** Lance Django (`venv\Scripts\python.exe manage.py runserver 127.0.0.1:8001` depuis `backend`) et Next (`node node_modules\next\dist\bin\next dev` depuis `frontend`, avec `DJANGO_API_URL=http://127.0.0.1:8001` dans `frontend/.env.local`). Ouvre http://localhost:3000, connecte-toi avec un compte **élève 7-9 ans**. Pour tout débloquer sans jouer les 28 leçons précédentes, utilise la commande de test :

```
venv\Scripts\python.exe manage.py seed_dev_account --password "<un mot de passe de ton choix>"
```
Elle crée un compte `dev.test@keria.dev` (élève sans parent, parcours 7-9, 40 leçons déjà faites ; refuse de tourner si `DEBUG` est faux). Sur la page de connexion, choisis d'abord la carte **Élève**. Les leçons terminées se rejouent librement.

Pour chaque nouveau jeu : joue-le **en entier**, trompe-toi exprès pour entendre chaque explication, et regarde-le sur **ordinateur et en 390 × 844**. Rien ne doit déborder, tous les boutons doivent être faciles à toucher au doigt. (Astuce : le premier affichage d'une page est lent en mode développement ; attends la fin de la compilation avant de juger.) Si l'écran affiche « ChunkLoadError » après un redémarrage de Next, supprime le dossier `frontend/.next`, relance Next et fais Ctrl+Maj+R dans le navigateur.

Si tu écris une page de test temporaire, **supprime-la avant de terminer**.

## 7. Les voix de Palou (ElevenLabs)

Chaque phrase dite par Palou est un fichier MP3 **préparé à l'avance** ; si un fichier manque, le navigateur lit la phrase avec sa voix (dégradé, à éviter). Rien n'est généré en direct (aucune voix d'enfant, aucun envoi de données).

**1) Générer les listes de phrases** (depuis la racine du projet) :
```
venv\Scripts\python.exe scripts\export_voice79.py m08
```
Ça (re)crée `docs/voix-palou/m08-p8/p8-1.csv` … `p8-4.csv` : une ligne = un fichier (`fichier_a_deposer`, `texte`). Si ton nouveau type de manche a des phrases à dire, ajoute-les dans `scripts/export_voice79.py` (cherche les blocs existants pour `layers`, `lens`, `probe` comme modèle). **Relance toujours cet export après avoir modifié le texte d'une leçon** : sinon tu génères d'anciennes phrases (c'est déjà arrivé).

**Noms de clés** : `eNN` = texte de l'écran NN ; `eNN-bravo` / `eNN-retiens` = fin de leçon ; `eNN-mM-q` = consigne de la manche M ; `eNN-mM-ok` = bravo ; `eNN-mM-oK` = explication d'un mauvais choix (K = position de la carte ou de l'option, en commençant à 1) ; `eNN-mM-iK` = explication d'un objet à ranger ; `eNN-mM-sK` = réaction de Palou à l'étape K (jeux à étapes). Les deux dernières suivent la logique de `sayRound` dans `activities.tsx` : **le nom du fichier doit correspondre exactement à la clé que ton composant demande.**

**2) Générer les audios** (une leçon à la fois ; installe d'abord `pip install mutagen` dans le venv) :
```
$env:ELEVEN_API_KEY = "<clé ElevenLabs de Maimouna>"
$env:ELEVEN_VOICE_ID = "FZ2DBQpJWRzjjLpw8ztP"
venv\Scripts\python.exe scripts\generate_voice79.py tmp\stage_p8-1 docs\voix-palou\m08-p8\p8-1.csv frontend\public\audio\palou\lecons\m08\p8-1 p8-1_
```
Le script applique tout seul **les réglages de la voix officielle** : modèle Eleven v4, stabilité 53 %, similarité 100 %, et les règles de prononciation et d'énergie ci-dessous. Il refuse de déposer les fichiers si une durée est suspecte (une balise lue à voix haute) et ne remplit que des dossiers vides.

**Règles de la voix (voulues par Lansana)** :
- Prononciation : « IA » → « iya » ; « des IA » / « les IA » → « ziya » ; « l'IA » → « l'iya » ; « une IA » → « niya ». (Déjà appliqué par le script.)
- **Toujours la même énergie joyeuse** : pas de ton calme, doux ou curieux.
- Explications après une mauvaise réponse : balises `[mischievously] [enthusiastic] [playful] [excited]`. Tout le reste : `[excited] [enthusiastic] [hopeful] [joyful]`. (Déjà appliqué.)
- Les mots wolof des pastilles et le prénom de l'enfant ne sont jamais enregistrés. Les noms propres sont adaptés par le script (« Mame » → « Mamé », etc.).

**3) Vérifier les audios dans le navigateur** : rejoue chaque leçon en te trompant exprès. Toutes les phrases doivent se jouer jusqu'au bout, aucun fichier en erreur (onglet Réseau : pas de 404). Compte les fichiers de chaque dossier (`frontend/public/audio/palou/lecons/m08/p8-N/`) : il doit y en avoir autant que de lignes du CSV.

## 7bis. Taille de Palou et du contenu : règle définitive (ne règle JAMAIS au cas par cas)

Un écran de leçon suit **une seule règle**, codée une fois pour tous (`useFit` + `planFit` dans `LessonPlayer79.tsx` / `logic.ts`, et le bloc « MISE EN PAGE DES ÉCRANS DE LEÇON » à la fin de `parcours79.css`) :
- **Palou ne change jamais de taille à cause du contenu.** Sa taille ne dépend que de l'écran (ordinateur : colonne de gauche, 220 à 440 px de haut ; téléphone : rangée du haut, jamais moins de 104 px).
- **Le contenu ne descend jamais sous 85 % de sa taille** (MIN_SCALE). Avant de le réduire, le lecteur lui donne plus de largeur (il se range sur plus de colonnes) ; s'il ne tient toujours pas, **la zone de jeu défile** et une flèche le montre.
- Ne mets donc **pas** de `height` fixe sur Palou, ne réduis pas Palou dans la CSS de ton jeu, ne fais pas de `transform: scale` ni de tailles de police en `vh`. Pour un nouveau jeu : des tailles en `px`/`clamp(... vw ...)`, un `@media (max-width: 640px)` plus compact, et c'est tout.
- **Vérifie-le** : `frontend/tests/layout-survey79.mjs` (mode d'emploi dans son en-tête) joue des leçons sur 7 tailles d'écran et mesure le zoom du contenu et la taille de Palou. Il doit rester : zoom ≥ 0,85, Palou ≥ 104 px sur téléphone.

## 8. Pièges connus (gagne du temps)

- **PowerShell 5.1** casse sur les apostrophes typographiques `’` dans une commande. Pour du texte français, écris un fichier avec l'outil d'écriture de Claude Code plutôt que de le passer en ligne de commande. N'utilise pas `&&`.
- `html { scroll-behavior: smooth }` (dans `globals.css`) transforme chaque `window.scrollBy` en animation : pour un défilement automatique, demande `behavior: "instant"`. Ne modifie pas `globals.css`.
- Ne touche pas aux fichiers en conflit de l'équipe (`GamesMapView.tsx`, `globals.css`).
- Les tests jsdom n'ont pas `Image`, ni audio, ni micro : n'utilise pas ces APIs sans protection.
- Après avoir supprimé un fichier pendant que `next dev` tourne, le cache peut se bloquer : redémarre Next avec `.next` vidé.
- **Pas de micro, pas de caméra** dans ce parcours : la voix et l'image des enfants ne sont jamais captées (décision de confidentialité de Lansana).

## 9. Quand tu as terminé

Donne à Maimouna un compte rendu honnête : ce qui est fait (leçon par leçon), ce qui a été vérifié (tests, navigateur, voix), ce qui reste (et pourquoi), et les décisions qui lui appartiennent. Propose ensuite de commiter (uniquement **tes** fichiers : `m08.json`, le code des nouveaux jeux, les tests, `docs/voix-palou/m08-p8/`, `frontend/public/audio/palou/lecons/m08/`) et, **seulement si elle le demande**, de pousser.

Les modules 9 et 10 sont déjà faits : une fois ton module 8 terminé, tout le parcours 7-9 est complet.

## Annexe : le catalogue des jeux déjà faits (pour avoir le même contexte que nous)

Chaque jeu a son interface commentée dans `frontend/app/dashboard/parcours79/types.ts`, son composant dans `activities.tsx` (cherche `XxxRoundView`), son validateur `_check_xxx` dans `backend/apps/curriculum/parcours79.py` et un exemple réel dans le JSON de la leçon indiquée. **Ouvre l'exemple avant d'écrire du contenu.** Les clés audio sont celles que le composant demande ; le préfixe est `eNN-mM-` (écran, manche).

| Type | Ce que fait l'enfant | Où voir un exemple | Clés audio de la manche |
|---|---|---|---|
| `whois` | Décrit un objet avec des étiquettes de données ; Palou écarte les objets qui ne correspondent pas | `m03.json`, p3-1 et p3-4 | `q`, `ok`, `oN` (mauvaise étiquette N) |
| `rulesort` | Choisit une règle de tri, la machine range tout d'un coup | `m03.json`, p3-2 | `q`, `ok`, `oN` (mauvaise règle N) |
| `cleanup` | Touche les intrus d'une liste ; le compte de Palou se corrige | `m03.json`, p3-3 | `q`, `ok`, `oN` (bonne donnée touchée par erreur) |
| `train` | Montre de bons exemples à Palou ; une jauge se remplit ; il finit par reconnaître | `m04.json`, p4-1 et p4-4 | `q`, `ok`, `sK` (réaction de Palou après K exemples), `oN` (mauvais exemple N) |
| `relabel` | Corrige la photo qui a une fausse étiquette ; Palou répond alors juste | `m04.json`, p4-2 | `q`, `ok`, `oN` (photo déjà juste touchée) |
| `probe` | Repère la photo où Palou se trompe, puis choisit le bon exemple à lui donner | `m04.json`, p4-3 ; `m05.json`, p5-4 | `q`, `ok`, `oN` (photo où Palou avait juste), `s1` (erreur trouvée), `fN` (mauvais exemple) |
| `focus` | Rend une photo plus ou moins nette (`pixels`, `blur`) ou plus ou moins claire (`dark`) ; Palou dit ce qu'il voit à chaque cran | `m05.json`, p5-1 et p5-3 | `q`, `ok`, `sK` (cran K, en commençant à 0) |
| `lens` | Choisit ce que Palou regarde (forme, couleur, détails) ; la photo change d'aspect | `m05.json`, p5-2 | `q`, `ok`, `oN` (mauvais regard) |
| `speak` | Forme une phrase avec des cartes de mots ; Palou écrit ce qu'il a « entendu » et surligne les mots-clés | `m06.json`, p6-1 à p6-4 | `q`, `ok`, `o1` (mot manquant), `o2` (mot vague, si `avoid`) |
| `layers` | Ajoute des cartes au dessin de Palou ; une carte hors sujet apparaît de travers | `m07.json`, p7-1 à p7-4 | `q`, `ok`, `sK` (après K cartes), `oN` (carte hors sujet) |
| `verify` | Pose des questions (utiles ou inutiles) sur une affirmation ; la confiance baisse ; pose un tampon | `m09.json`, p9-1, p9-2, p9-4 | `q`, `ok`, `sN` (indice de la question N), `oN` (question inutile N), `a` (demande du tampon), `fN` (mauvais tampon N) |
| `loupe` | Déplace une loupe sur des zones d'une image ; repère les indices | `m09.json`, p9-3 | `q`, `ok`, `sN` (zone à indice N), `oN` (zone normale N) |
| `shield` | Touche les informations secrètes d'un message ou d'une photo : elles se cachent sous un flou ; un panneau montre ce qu'un inconnu peut encore lire | `m08.json`, p8-1 et p8-2 | `q`, `ok`, `oN` (information sans danger touchée par erreur) |
| `machine` | Remplit 3 cases d'une IA (elle regarde, elle apprend, elle fait) en choisissant la bonne option, puis lui présente des cas et lit ses réponses | `m10.json`, p10-4 | `q`, `ok`, `oN` (mauvaise option ; N continue sur les 3 cases), `d` (machine prête), `rK` (réponse au cas K) |

Règles communes à tous ces jeux (déjà imposées par le validateur) : au moins une mauvaise réponse **expliquée**, un `hint`, un `success`, et **on doit toujours pouvoir réussir** (le contenu ne peut pas rendre la manche impossible). Le premier choix est toujours mélangé à l'affichage : ne compte pas sur l'ordre des cartes.

Les leçons gardent en général **une manche classique** (choisir une image, glisser-déposer) à côté du jeu signature : garde cet équilibre pour le module 8.
