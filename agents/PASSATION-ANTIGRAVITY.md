# Passation à Antigravity — tout ce qu'il faut pour continuer SEUL jusqu'au bout

Claude n'est plus disponible : tu reprends **toute** la suite du chantier « studio 7-9 + validation des parents », y compris le rôle de relecteur que Claude tenait.
Ce document est la source de vérité. Lis-le en entier, puis `docs/STUDIO79.md` et `docs/REGLES_AGENTS.md`. En cas de doute sur un choix produit, **demande à Lansana** (il répond vite) plutôt que d'inventer.
Lansana est francophone, parle simplement, veut des résultats **vérifiés**, pas des promesses. Réponds-lui en français, court, honnête (dis ce qui n'est pas fait).

---

## 1. L'objectif de Lansana (ses mots, résumés)

**Point 1 — Inscription des parents (fait, à finir de prouver).** Un parent qui s'inscrit remplit ses informations, mais n'accède à son espace qu'après acceptation par l'administration générale (Siribra, rôle `admin`). Règle « temporaire » mais construite comme permanente. L'admin a, dans son espace, un endroit pour accepter ou refuser les demandes.

**Point 2 — Le studio de modélisation (en cours).** L'administrateur général doit pouvoir **ne plus jamais coder** pour les modules, leçons, devoirs, jeux et défis. Un studio « banger », beau, fluide, une référence : images, glisser-déposer, texte écrit soi-même (police, taille), vidéo (fichier **ou** lien), lien, bouton ; placement (image en haut, en bas, à gauche, à droite ; texte plus grand ou plus petit) ; ajouter / supprimer / réordonner des modules, des cours, des parties de cours, des devoirs ; voir le résultat tel que l'enfant le verra ; chaque modification ne devient visible des enfants qu'après un **délai de sécurité de 15 minutes** (annulable). On commence par les leçons des **7-9 ans**.

Décisions déjà prises avec Lansana (ne pas les rouvrir) :
- tout est stocké dans la **base de données** (PostgreSQL en production, SQLite en dev), médias compris : gratuit, aucun hébergement à part. Images : WebP 1 600 px ; fichier vidéo : petit (20 Mo, réglable) ; au-delà, un **lien** YouTube/Vimeo ;
- on édite le **format existant** des leçons 7-9 (`frontend/app/dashboard/parcours79/types.ts`) et l'aperçu est le **vrai lecteur** de l'enfant (`/studio-apercu` dans un cadre) ;
- erreurs de **structure** = elles bloquent la publication ; règles de **style** (bible narrative) = avertissements que l'auteur confirme ;
- Palou n'a **aucune voix de secours** : un texte modifié devient muet (`voiceOff`, calculé par le serveur à la publication) ;
- **OpenCode ne travaille plus** (trop lent). Équipe : toi (code et vérification) ; Claude ne répond plus.

## 2. Où en est le dépôt (au 2026-10-18)

Branche de travail : **`Dev_Lansana_Coly` uniquement** (jamais `test` ni `main` : Lansana décide quand `test` avance). Dépôt : `https://github.com/issabathily/keuria-v2`. Derniers commits utiles : `df24584b` (docs Claude), `4c53d61a` (ta T17-D), `52f9848c`/`02d1a093` (tes T18), `6d0562ac` (validation des parents + fondation du studio, Claude).

Fait et vérifié (par Claude, indépendamment) :
- **Serveur** : versions de contenu (brouillon → publication différée → historique/retour arrière), médias en base, contrôle structure/style, `voiceOff`, routes `superadmin/studio79/*`, `superadmin/media`, publiques `curriculum/content79/*` et `media/*` ; import du contenu d'origine (`manage.py import_content79`), `check_parcours79 --db`, limite de débit des envois, `schema.yml`. 843 tests serveur verts.
- **Validation des parents** : `backend/apps/accounts/approval.py`, page `/admin/inscriptions` (pastille, rappel au tableau de bord, e-mails, journal), écran d'attente `PendingApproval.tsx`, interrupteur `PARENT_REGISTRATION_REQUIRES_APPROVAL`.
- **Studio** : accueil `/admin/studio79`, éditeur `/admin/studio79/[lessonId]` (rail d'écrans glisser-déposer, inspecteur, 17 types d'activités par formulaires générés, médiathèque, aperçu fidèle ordinateur/tablette/téléphone, enregistrement auto, annuler/rétablir, publication avec résumé et délai, annulation, historique et restauration, accessibilité clavier). 251 tests site verts.
- **Côté enfant** : le lecteur lit le contenu publié (`studioContent.ts`, leçon figée à l'ouverture).

Ce qui reste, **dans l'ordre** (chaque tâche a son fichier dans `agents/taches/`) :
1. **T17-D-bis** (`T17-D-bis-antigravity.md`) : preuves de l'étape 5 (parent et enfant arrivent sur leur espace, même famille), textes des deux e-mails, `preuves.json` en UTF-8, rapport exact (aucun nom de capture inventé).
2. **T19** (`T19-antigravity-mise-en-page.md`) : mise en page par écran (champ `layout`). *Il se peut que tu l'aies déjà commencée : `types.ts` et `LessonPlayer79.tsx` ont changé dans le dossier de travail ; vérifie `git status`/`git diff` et reprends proprement.*
3. **T20** : nouveaux blocs (vidéo, lien, bouton) — spécification au §5.
4. **T21** : créer / supprimer / réordonner des leçons et des modules — §5.
5. **T22** : studios des devoirs, jeux et défis du jour — §5.
6. **T23** : gestion des médias — §5.
Après chaque tâche : **autorevue** (§4), commit, push, rapport, puis tu enchaînes sans attendre qu'on te le dise.

## 3. Règles d'or (apprises à la dure)

1. **Tu ne commites que tes fichiers**, listés un par un. `git status` avant chaque `git add`. Jamais `git add -A` / `.`. (Tu as déjà embarqué des fichiers d'autrui une fois.)
2. **Aucun secret dans le dépôt** : ni cookie (`keur_ia_session`, `csrftoken`), ni en-tête `Cookie`/`Authorization`, ni mot de passe, ni jeton. Des cookies d'admin ont déjà été poussés par erreur (fichiers Lighthouse) ; ils sont dans l'historique : **ne jamais recommencer**. Les rapports Lighthouse : notes seulement.
3. **Les preuves doivent prouver.** Chaque capture montre le **résultat** de l'étape (pas un chargement, pas une page vide, pas un doublon, pas un tiroir flou par-dessus sans raison). Chaque valeur annoncée est lue **dans la page ou par l'API** et écrite dans un `preuves.json` en **UTF-8**. Chaque nom de fichier cité dans un rapport **existe** (vérifie par script). Un tableau « 0 débordement » de `scrollWidth` ne prouve pas le rendu : mesure aussi les rectangles (`getBoundingClientRect`).
4. **Un rapport exact.** Ne décris pas comme « défaut du produit » une astuce de ton script de test. Ne cite pas de condition de code que tu n'as pas lue. Signale les changements hors périmètre comme tels. Ne dis « terminé » que si **chaque point** est vérifié.
5. **Disque** : un seul profil Chrome temporaire avec `--disk-cache-size=1`, supprimé après, dans une commande à part ; `Get-PSDrive C` avant de commencer (le disque s'est déjà rempli). Ne coupe **jamais** un processus que tu n'as pas lancé.
6. **Base de développement** = celle de Lansana. Crée des comptes de test dédiés et supprime-les ; dis dans le rapport tout ce que tu changes (mots de passe, versions de test). Ne vide pas les sessions sans son accord (il a dit « plus tard »).
7. Interdits du dépôt : remettre la vue « Carte », activer le mode développeur par défaut, `"use client"` ailleurs qu'en première ligne, fichier UTF-16. `frontend/content/` : tu n'y écris pas sans raison (le studio passe par la base).
8. **Compatibilité** : les 40 leçons existantes ne doivent jamais changer d'aspect sans demande (pas de `layout` ⇒ rendu actuel strictement identique).
9. Toute règle de style CSS du studio est préfixée `.sx-` (un test le garde). Pas de couleur écrite en dur : variables `--ec-*` / `--sx-*`. Pas d'emoji dans l'interface (icônes `lucide-react`).
10. Messages de commit : `[antigravity] type(portée): résumé (Txx)` + ligne `Agent: antigravity` ; auteur `Antigravity <antigravity@keuria.local>` ; précise « hors rôle habituel » quand tu écris du code serveur.

## 4. Autorevue obligatoire avant de dire « terminé » (c'est le travail de revue de Claude, maintenant le tien)

À lancer toi-même, à froid, **sur l'arbre propre** après ton dernier commit :
- Frontend (dans `frontend/`) : `npm run typecheck` ; `npm run lint` (0 erreur, les ~167 avertissements existants sont connus) ; `npm test` (≈ 251 tests, tous verts).
- Serveur (dans `backend/`, avec `..\venv\Scripts\python.exe`) : `-m ruff check .` ; `-m pytest -q` (≈ 843, tous verts) ; `manage.py check_parcours79` (« Contenu conforme ») ; `manage.py makemigrations --check --dry-run` (rien à créer) ; si l'API change, `manage.py spectacular --file schema.yml` et commite `schema.yml`.
- **Regarde toi-même chaque capture** que tu cites (ouvre l'image) : est-elle vide ? doublon (compare empreintes et tailles) ? montre-t-elle bien l'étape ? Une capture de 5-10 Ko est presque sûrement vide.
- **Relis ton propre diff** (`git diff <commit>^ <commit>`) : fichiers hors périmètre ? secret ? couleur en dur ? règle CSS sans préfixe ? changement de comportement non voulu d'un composant partagé ?
- **Vérifie le comportement réel dans le navigateur**, au clavier aussi (Tab réel, pas `element.focus()`), à 1440, 1024 et 390 px.
- Rapport : `agents/rapports/Txx-antigravity.md` + `preuves.json`. Puis push, et **vérifie que la CI GitHub est verte**.
Si un contrôle échoue, tu corriges avant de dire quoi que ce soit.

## 5. Les tâches qui n'ont pas encore de fichier (spécifications complètes)

### T20 — Nouveaux blocs : vidéo (lien ou fichier), lien, bouton
*But* : l'admin ajoute dans une leçon une vidéo (lien YouTube/Vimeo **ou** petit fichier envoyé), un lien, un bouton.
*Sécurité enfant — à trancher avec Lansana avant d'activer les liens sortants* (public 7-9 ans) : proposition par défaut = **jamais de lien sortant direct** ; un lien ou bouton externe s'ouvre derrière une confirmation « Demande à un adulte » ; seules les destinations internes (autre leçon, carte) sont libres.
*Contrat* (nouveau type d'écran, `kind: "media"`, à ajouter à `types.ts`, `LessonPlayer79`, `parcours79.py`, `studioModel.ts`, `ScreenInspector`) :
```ts
interface MediaScreen extends ScreenBase { kind: "media";
  media: { type: "video-link" | "video-file" | "image"; url?: string; ref?: string; caption?: string };   // url : https seulement ; ref : « media:<id>.<empreinte> »
  actions?: { label: string; kind: "lesson" | "external"; target: string }[];                              // lesson : identifiant (« p2-3 ») ; external : https
}
```
*Règles* : jamais de HTML libre. Pour un lien vidéo, **analyse l'URL et reconstruis toi-même** l'adresse d'intégration (`https://www.youtube-nocookie.com/embed/<id>`, `https://player.vimeo.com/video/<id>`) ; liste blanche stricte de domaines ; `sandbox`, `referrerpolicy="no-referrer"`, `loading="lazy"` ; pas de lecture automatique. Pour un fichier : balise `<video controls playsinline preload="metadata">` sur `/api/media/<id>/<empreinte>`. Les liens externes : `rel="noopener noreferrer"`, nouvel onglet. Le serveur valide (structure : type connu, URL conforme à la liste blanche, `ref` existant, `target` leçon existante) et refuse tout le reste ; tests de chaque cas (XSS : `javascript:`, `data:`, domaine hors liste). Le studio : un sélecteur de type d'écran « Média » avec un champ de collage de lien (aperçu immédiat, message clair si le lien n'est pas accepté), choix d'un fichier via `MediaPicker` (déjà prêt pour `kind="video"`), éditeur d'actions. La voix : le texte de l'écran seulement.
*Preuves* : une leçon de test avec une vidéo YouTube (lien « non répertorié »), un fichier, un bouton vers une autre leçon, un lien externe derrière la confirmation ; côté enfant, à 1440/390 px ; essais de liens interdits refusés par le serveur.

### T21 — Créer, supprimer, réordonner des leçons et des modules
*Constat* : le **catalogue** (modules, titres et ordre des leçons) est figé dans `backend/apps/curriculum/data/tracks_data.py` ; le studio ne sait aujourd'hui que modifier le **contenu** des 40 leçons. Il faut un **catalogue en base** qui **complète** celui du code, sans casser la progression des enfants (les identifiants `p1-1`… sont partout : progression, XP, énigmes, glossaire).
*Approche sûre* : conserver `tracks_data.py` comme socle, ajouter un modèle de **surcharge versionnée** (même mécanique brouillon / publication différée) : `CatalogVersion` (contenu JSON : modules {id, titre, lieu, intro, ordre} et leçons {id, titre, ordre, masquée}). Règles : on **ne supprime jamais** une leçon qui a de la progression ou de l'XP (on la **masque**) ; un identifiant n'est jamais réutilisé ; l'ordre est une liste ; un nouveau module reçoit le prochain `pN`. `parcours79._catalog_worlds()` et `studio79._catalog()` lisent « socle + surcharge en ligne ». Le lecteur et la carte des îles (`computeMap`, `Archipel79`) doivent accepter un module/une leçon qui n'existe que dans la surcharge (aujourd'hui `isPlayable` suppose le JSON embarqué : étends-le au contenu du studio). Studio : bouton « Nouvelle leçon » (modèle vierge valide d'emblée : histoire, découvre, activité, je retiens), « Dupliquer », « Masquer / afficher », glisser-déposer pour l'ordre, « Nouveau module ». **Avant de coder, écris le plan en une page et envoie-le à Lansana** : c'est le chantier le plus risqué (progression, XP, carte).
*Preuves* : créer une leçon, la publier (mise en ligne forcée), la jouer côté enfant, voir sa progression comptée ; masquer une leçon avec progression ; réordonner ; aucune progression existante perdue (compare avant/après).

### T22 — Devoirs, jeux, défis du jour
*Existant* : `Riddle` (80 énigmes du jour 7-9, une par leçon, `backend/apps/curriculum/riddle_data.py`), `DailyChallenge`, `Activity` (XP des jeux), `Mission` (devoirs de la bibliothèque, `backend/apps/scolaire`).
*Approche* : généraliser `ContentVersion.kind` (déjà prévu : `lesson79`) avec `riddle`, `daily_challenge`, `mission`, et réutiliser `SchemaForm` (descriptions de champs) pour des formulaires générés ; même cycle brouillon / publication différée / historique. **Ordre** : 1) énigmes (le plus simple : question, 3 réponses, bonne réponse, explication, leçon liée) ; 2) défis du jour ; 3) devoirs (missions) ; 4) jeux. Pour chacun : lecture publique « en ligne » depuis la version la plus récente, aperçu fidèle, contrôle de structure côté serveur (une seule bonne réponse, etc.), accueil et éditeur dans le studio, tests serveur, preuves à l'écran.

### T23 — Gestion des médias
Liste avec recherche, utilisation de chaque média (dans quelles leçons : parcourir les contenus pour les références `media:<id>.…`), suppression des **médias inutilisés** seulement (refus s'ils sont utilisés, même dans l'historique), poids total de la médiathèque affiché avec une alerte avant la limite de la base, texte alternatif modifiable. Tests serveur (refus de suppression, comptage d'utilisation).

## 6. Pièges techniques connus

- **Zoom de page** : entre 1025 et 1599 px, le site applique `--app-zoom` (≈ 0,85). Un `position: fixed` en `100vw`/`100vh` ne couvre que 85 % de l'écran : utilise `inset: 0` sans largeur/hauteur, ou divise par `var(--app-zoom, 1)`. `frontend/tests/zoom-page-height.test.mjs` garde la règle.
- **Lecteur 7-9** (`LessonPlayer79.tsx`) : `useFit` ne réduit jamais le contenu sous 85 % et réorganise avant de réduire ; Palou ne change jamais de taille. Respecte-le pour toute mise en page.
- **Focus clavier** : un anneau n'apparaît qu'avec de **vrais appuis de touche** (CDP `Input.dispatchKeyEvent`), pas avec `element.focus()`.
- **Saisie dans un champ React par script** : passe par le setter natif du prototype puis `dispatchEvent('input')` (astuce de test, pas un défaut du produit).
- **PowerShell** : pas de `&&` ; `Set-Location` persiste entre commandes (chemins absolus) ; les apostrophes typographiques `’` cassent les chaînes entre quotes simples (utilise l'outil d'édition) ; les fichiers sont en CRLF.
- **Fichiers du dossier de travail partagé** : plusieurs agents l'ont utilisé ; ne commite que ce que tu as écrit.
- Le serveur de développement : site `http://localhost:3000` (Next ; un cache `.next/dev` corrompu se règle en le supprimant et en relançant), API Django `http://127.0.0.1:8000` (ou le port que tu lances). `EMAIL_BACKEND=console` affiche les e-mails dans la console de Django.
- Routes d'API en `/api/...` relayées par Next vers Django (`frontend/next.config.ts`).

## 7. Ce qui reste ouvert côté Lansana

- **Sessions de la base de développement** : des cookies d'admin ont été poussés (fichiers retirés, mais présents dans l'historique du commit `22772fda`). Lansana a répondu « plus tard » pour les vider : **redemande-lui** à la fin de T19, avec la commande (`Session.objects.all().delete()` dans `manage.py shell`, qui le déconnectera du serveur local).
- **Leçon `p1-1` de la base de développement** : elle contient des versions de test (« Bonjour Aminata… » publiée puis restaurée). Rien dans `frontend/content/` n'a changé. À la fin de T19, remets-la au contenu d'origine (`rollback` vers la version 1) et dis-le.
- **Liens sortants pour les enfants** (T20) : décision de Lansana à obtenir.
- **Plan du catalogue en base** (T21) : à lui faire valider avant de coder.
- `scripts/video-guide/` est exclu du dépôt (`.gitignore`) : il contient des mots de passe de démonstration ; ne le commite pas.

## 8. Définition de « terminé » pour tout le chantier

Un administrateur peut, sans écrire une ligne de code : créer et modifier une leçon (texte, images, vidéo/lien/bouton, mise en page), ses activités, ses énigmes et défis, ses devoirs ; la prévisualiser exactement comme l'enfant la verra ; la publier avec le délai de sécurité (annulable, restaurable) ; gérer ses médias. Les enfants voient la version publiée ; rien d'existant ne casse ; tout est vérifié à l'écran, au clavier et par des tests, sans secret dans le dépôt.
