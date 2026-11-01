# Audit sévère : page « Modules » et cours du parcours 7-9 ans

Date : 30/09/2026 · Portée : le seul parcours 7-9 « Petits Explorateurs » (10 modules × 4 leçons = 40 leçons) : la page des modules, le lecteur de leçons, les contenus (frontend et serveur), les ressources.
Méthode : lecture du code, **exécution réelle** de la fonction qui fabrique le contenu sur les 40 titres, analyse quantitative des QCM, vérification des fichiers sur le disque. Rien n'a été testé dans un navigateur : les points « blocage » sont établis par le code, pas par un clic.

## Verdict

**Non : ce parcours n'est pas prêt pour des enfants de 7 à 9 ans.** L'idée pédagogique est bonne (personnage Palou, ancrage sénégalais, phrases courtes dans les leçons écrites à la main), mais **75 % du parcours n'existe pas** : seules 10 leçons sur 40 ont un vrai contenu. Les 30 autres sont fabriquées automatiquement à partir de leur titre par des mots-clés et, d'après le code, **un enfant ne peut pas les terminer**. La page des modules affiche en plus **10 images cassées**. Le design est celui d'un tableau de bord d'adulte, pas d'un écran pour un enfant de 7 ans.

| Question | Réponse |
|---|---|
| Bien fait ? | Non (code monolithique, contenu dupliqué en 4 endroits, parties mortes). |
| Bien designé ? | Partiellement. Le monde et la mascotte sont attrayants ; la page des modules, les jauges et le jargon ne le sont pas. |
| Bien conçu pour le 7-9 ans ? | Pas encore. 25 % de contenu, aucune aide à la lecture dans 8 leçons sur 10, glisser-déposer inutilisable sur tablette, vocabulaire d'adulte dans 8 leçons. |

## 1. Bloquants (P0)

**P0-1. 30 leçons sur 40 n'ont aucun contenu réel.** Seules p1-1 à p1-4, p2-1 à p2-4, p3-1 et p3-2 sont écrites. Pour les 30 autres (p3-3 à p10-4), le lecteur appelle `learningCopy(titre, description du module)` (`DashboardClient.tsx:283`) : une fonction qui choisit un texte selon des **mots-clés du titre** (« donnée », « photo », « mot »…). Exécutée sur les 40 titres : 30 leçons sans `mission`, sans `activity`, sans `questions`.

**P0-2. Ces 30 leçons sont bloquées à l'étape « Jeu » (d'après le code).** `KidsLessonPlayer79.tsx:397` : `canNext = activityAnswer === c.activity?.correct`. Avec un contenu sans `activity`, cela compare `null` à `undefined` : toujours faux, le bouton « Continuer » reste désactivé. Comme les leçons sont enchaînées (`i === nextIndex`) et les modules aussi, **un enfant ne peut pas dépasser la leçon p3-2 : au mieux 10 leçons sur 40, soit 25 % du parcours**, et il ne débloquera jamais les modules 4 à 10 ni les badges de module.
À confirmer par un test dans un navigateur avant de le présenter comme certain, mais la logique est sans ambiguïté.

**P0-3. La page « Modules » affiche 10 images cassées.** `DashboardClient.tsx:2132` et `:2218` chargent `/images/modules/p1.png` … `p10.png`. Le dossier `public/images/modules/` ne contient que `a1…a12` et `c1…c12` (les parcours 10-12 et 13-15). **Aucune illustration pour le 7-9 ans**, ni sur les cartes, ni dans le bandeau de chaque module.

**P0-4. Le contenu riche des modules 2 à 10 est du code mort.** `youngModulePilots` (p2 à p10, environ 10 Ko de contenu rédigé : missions, activités, défis) n'est utilisé que par `buildYoungPilot`, appelé uniquement par le lecteur des 10-12 ans pour des modules dont l'identifiant ne commence ni par `a` ni par `c`, ce qui n'arrive jamais. **Le contenu existe, mais il n'est branché nulle part pour le 7-9.** C'est la pièce qui manque pour réparer P0-1 et P0-2.

**P0-5. Tous les enfants sont appelés « Ndeye ».** `DashboardClient.tsx:2244` : `learnerName="Ndeye"` en dur. Chaque enfant est accueilli et félicité sous le prénom d'une autre, et une carte du tableau de bord dit « Palou accompagne Ndeye ». C'est contraire à la règle « aucune donnée factice » que vous avez posée.

## 2. Graves (P1)

**Contenu et pédagogie**
- **Les QCM n'évaluent rien.** Sur les 16 QCM du serveur (parcours p1) : **75 % ont la bonne réponse la plus longue** ; 16 mauvaises réponses sur 32 sont absurdes (« Des nuages », « Une cuillère », « De manger », « Seulement la nuit »…). Un enfant réussit en éliminant l'absurde, sans rien comprendre.
- **Doublon dans une leçon :** p1-2 pose deux fois « Qu'est-ce qui aide l'IA à apprendre ? » (l'activité puis la première question du quiz).
- **Aucune vraie évaluation.** Les leçons dédiées appellent `onComplete(100)` : le score est fixé à 100 %. Les mini-jeux ne se terminent que sur la bonne réponse (essais illimités), donc tout enfant finit à 100 %. Une mauvaise réponse ne joue qu'un son d'erreur, **sans explication** (`Lesson_p3_1.tsx`).
- **Mauvaise réponse sans retour utile** dans les activités générées : « Observe, compare et réessaie à la prochaine tentative » alors que la réponse est verrouillée.
- **Vocabulaire d'adulte dans 8 leçons** (p4-4, p5-3, p5-4, p6-2, p6-4, p7-2, p7-3, p10-3), détecté dans le texte réellement affiché : « algorithme », « modèle », « régularités », « prédiction », « statistiques », « probabilités », « pixel », « hallucination », par exemple : « Les modèles de langage travaillent avec des unités de texte et des relations statistiques apprises sur de nombreux exemples » pour « Les mots magiques ».
- **Activité « exclusive » générée** (`LessonPlayActivity.tsx`) : gabarit choisi par une empreinte du titre ; la bonne réponse est **à une position fixe selon le gabarit** (toujours A, B, B, C, B, A) ; mauvaises réponses du type « Une décoration du module… ». Inutilisable pédagogiquement.
- **Ordre des notions.** Sécurité et esprit critique (module 8 « Mon bouclier numérique », module 9 « Palou peut se tromper ») arrivent après sept modules, alors que l'enfant a Palou (un assistant IA) et le chat familial dès le premier jour. Le sujet « vie privée » est traité tôt par p1-4, mais « l'IA peut se tromper » est dans p1-1 et p9 seulement.
- **Durées, XP et types inventés par formule** (`lms-data.ts`) : `minutes = 5 + 2i`, `xp = 20 + 10i`, `type` selon `i % 5`. Le dernier cours « Grand projet Explorateur » est de type « atelier » et non « projet ». Rien n'est mesuré.
- **Deux sources de vérité qui divergent.** Le texte de p1-1 à p1-4 existe dans `content_7_9.py` (serveur) et `pilotLessons` (frontend) avec des formulations différentes. `curriculum-api.ts` n'est importé par aucun écran : le contenu servi par l'API n'est **jamais affiché**.

**Design et expérience pour un enfant de 7 à 9 ans**
- **Jargon d'adulte sur la page « Modules »** : « MON ESPACE LMS • PARCOURS GUIDÉ », « Progression obligatoire : Module → cours → parcours guidé → quiz → validation ». Un enfant de 7 ans ne sait pas ce qu'est un LMS.
- **Tableau de bord dense** : « Mon programme du jour » avec quatre jauges (Temps, Leçons, Quiz, Jeux) exprimées en `x/y`, quêtes, streak sur 7 jours, badges, etc. La page d'accueil est un tableau de bord d'adulte, avec des centaines de styles en ligne et de petits corps de texte (11 à 14 px).
- **Aucune aide à la lecture dans 8 leçons sur 10.** Un enfant de 7 ans lit encore lentement. Seules p1-1 et p1-2 (lecteur historique) ont la lecture vocale. Dans `LessonContainer.tsx`, le bouton « Écouter Palou » est **commenté** (« for now just the button layout »). Les 8 leçons dédiées n'ont pas de lecture à voix haute.
- **Glisser-déposer à la souris uniquement** (`onDragStart`, `onDrop`, `dataTransfer`) dans le jeu de tri du lecteur historique, sans gestion tactile (`onTouch`/`onPointer` : 3 occurrences seulement, pas pour ce jeu). Ces événements HTML5 **ne fonctionnent pas sur la plupart des tablettes et téléphones**, qui sont les appareils probables au Sénégal.
- **Zéro accessibilité** dans les 8 leçons dédiées : aucun `aria-*`, aucun `role`. 25 `alt` dans le lecteur historique, mais l'étape « Création » impose de **dessiner** (`hasDrawn`) pour continuer, sans alternative, et le dessin **n'est enregistré nulle part**.
- **Attente artificielle de 4,5 secondes avant chaque leçon** (`setTimeout(..., 4500)` avec un conseil aléatoire), alors que la feature a justement supprimé ce type d'écran à la connexion.
- **Carte « Classement » encore dans l'accès rapide de l'accueil** (`DashboardClient.tsx:1474`), alors que vous aviez demandé de retirer le classement de l'accueil.
- **Bouton « Suivant / leçon suivante » mort** : `onNextLesson` et `hasNextLesson` ne sont jamais passés au lecteur.

## 3. Moyens (P2)

- **Ressources trop lourdes pour une connexion limitée** : images de Palou 33,7 Mo (`Palou_Determine.png` : 2,6 Mo à lui seul), 12 images préchargées à l'ouverture du lecteur, illustration de parcours `age-7-9.png` 2,2 Mo, vidéo d'introduction 7,9 Mo, images de jeux 14,9 Mo. Aucune optimisation (WebP, tailles adaptées).
- **Architecture** : `DashboardClient.tsx` fait 4 111 lignes ; `KidsLessonPlayer79.tsx` 1 840 lignes avec des dizaines d'états `p11*`/`p12*` codés en dur pour deux leçons ; branches p1-3 et p1-4 dupliquées (une dans le répartiteur, une dans le lecteur « Legacy » qui n'est plus atteinte) ; `p3-1` testé deux fois ; `props: any`.
- **Code mort** : `DashboardKids79.tsx` (445 lignes, importé nulle part, avec d'anciens paliers « Petit curieux… Maître de l'IA » qui contredisent les paliers officiels), `youngModulePilots`, `curriculum-api.ts`, `LessonPlayActivity` (activités génériques).
- **Fichiers de patch dans le dépôt** : `AdvancedGames.tsx.orig`, `AdvancedGames.tsx.rej`, `DashboardClient.tsx.rej` sont suivis par git.
- **Robustesse** : `window.speechSynthesis.cancel()` appelé sans vérifier que l'API existe (`LessonContainer.tsx`, `KidsLessonPlayer79.tsx`) : plante sur les navigateurs sans synthèse vocale.
- **Arcade partagée entre tous les âges** : les 10 quiz d'arcade (`gameChallenges`) incluent des niveaux « Expert » (jeu de données déséquilibré, « modèle de prédiction entraîné »), hors de portée d'un enfant de 8 ans.
- **Aucun test** de complétion d'une leçon : le seul test frontend vérifie du HTML rendu ; les tests du serveur ne couvrent que la création et la lecture du catalogue. C'est pourquoi le blocage P0-2 n'a jamais été détecté.

## 4. Points positifs (à conserver)

- **Ancrage local réussi** : Wolof, Youssou N'Dour, mangues, marché, prénoms sénégalais, « Idées pour le Sénégal ».
- **Phrases courtes** dans les leçons dédiées (8 à 11 mots en moyenne, aucune ≥ 18 mots).
- **Sécurité et vie privée traitées très tôt et bien** (p1-4, p8) : mots de passe, adresse, adulte de confiance, droit à l'image.
- **Cohérence de la mascotte** : Palou, 38 émotions, toutes les images référencées existent.
- **Parcours progressif** et découpage en 10 mondes clairs ; badges par module ; XP décidée par le serveur.
- **Contenu de qualité déjà rédigé** mais non branché : les modules 2 à 10 de `youngModulePilots` (missions, découvertes, activités, défis, compétences par leçon). C'est la meilleure base pour la correction.

## 5. Plan de correction recommandé (ordre de priorité)

1. **Débloquer le parcours (1 jour)** : brancher `buildYoungPilot`/`youngModulePilots` dans le lecteur 7-9 pour p3-3 à p10-4 ; garde-fou : si `activity` ou `questions` manquent, ne jamais afficher l'étape (ou refuser la leçon avec un message honnête) ; ajouter un test qui **parcourt les 40 leçons** et vérifie qu'on peut les terminer.
2. **Images de modules (0,5 jour)** : créer les 10 illustrations `p1…p10` (ou temporairement des emojis/dégradés) ; test qui vérifie que chaque image référencée existe.
3. **Vrai prénom de l'enfant** (15 min) au lieu de « Ndeye ».
4. **Réécrire les QCM** : distracteurs plausibles (une confusion fréquente d'enfant), bonne réponse à une position aléatoire, retour explicatif à chaque erreur, suppression du doublon de p1-2.
5. **Lecture à voix haute** partout : un seul composant « Écouter » commun à toutes les leçons, avec garde `speechSynthesis`.
6. **Interactions tactiles** : remplacer le glisser-déposer par « touche l'objet puis touche la boîte », ou par Pointer Events.
7. **Simplifier la page « Modules » et l'accueil** pour un enfant : une carte-chemin visuelle (une île, 10 étapes), un seul appel à l'action « Continuer ma leçon », sans jauges chiffrées ni jargon ; retirer l'attente de 4,5 s et la carte « Classement » de l'accueil.
8. **Une seule source de contenu** : le serveur (catalogue et contenu) alimente l'écran ; supprimer les copies frontend (`pilotLessons`, `youngModulePilots`, `learningCopy` pour le 7-9).
9. **Alléger les ressources** : WebP, préchargement limité à 2-3 images, poster d'introduction < 300 Ko.
10. **Nettoyage** : supprimer `DashboardKids79.tsx`, les `.rej/.orig`, `LessonPlayActivity`, découper `DashboardClient` et `KidsLessonPlayer79`.

## 6. Décisions à prendre par vous

1. Le contenu manquant (30 leçons) : brancher le contenu déjà écrit (`youngModulePilots`, rapide) puis le faire relire par un enseignant, ou le réécrire entièrement ?
2. Faut-il un relecteur pédagogique du primaire (CE1 à CM1) pour valider le niveau de langue et les distracteurs ?
3. Souhaitez-vous des illustrations dessinées (10 images de modules) ou une solution provisoire sans image ?
4. Faut-il séparer 7 ans et 9 ans (deux niveaux de lecture) ou garder un seul parcours avec lecture vocale par défaut ?
