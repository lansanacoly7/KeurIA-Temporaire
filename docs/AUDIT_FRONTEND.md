# Audit exécutif du frontend kEur IA (Next.js / React)

> **Destinataire** : l'assistant d'exécution (Gemini) et l'équipe de développement.
> **Date de l'audit** : 8 octobre 2026. **Branche** : `feature/v26-septembre`. **Périmètre** : `frontend/` (application Next.js 16 / React 19 / TypeScript 5.9).
> **Nature du document** : diagnostic uniquement. **Aucun code n'a été modifié** pendant l'audit.
> Chaque constat donne le fichier, les lignes ou la fonction, la criticité, l'explication et une **instruction exacte** à donner à l'assistant d'exécution.

## 1. Comment lire ce document

**Criticité**

| Niveau | Sens |
|---|---|
| **BLOCKER** | Fonction essentielle absente ou inopérante, ou risque pour les enfants ; à traiter avant tout le reste |
| **CRITICAL** | Bug visible, faille ou accessibilité bloquante ; à corriger dans le prochain lot |
| **MAJOR** | Dette ou risque significatif (performance, fiabilité, accessibilité, cohérence) |
| **MINOR** | Amélioration, nettoyage, lisibilité |

**Numérotation** : les modules 1 à 10 suivent l'ordre de l'audit. Les références `M1`…`M10` renvoient à ces modules ; `T1`, `R1`, `O1`, `P1`, `A1` sont des constats transversaux propres à chaque module.

**Règle d'exécution** : les instructions à l'assistant sont rédigées pour être copiées telles quelles. Les points marqués **« À faire valider côté backend »** ou **« Décision »** ne doivent pas être codés avant réponse : voir les annexes A et B.

## 2. Couverture et limites de l'audit (à lire)

L'application compte **263 fichiers TypeScript/TSX et 44 192 lignes** dans `frontend/app/`, plus 145 lignes dans `lib/`, plus 15 641 lignes de CSS réparties dans 36 feuilles.

| Niveau de lecture | Périmètre |
|---|---|
| **Lu en entier, ligne à ligne** | `app/components/` (14 fichiers), racine de `app/` (`layout`, `csrf-fetch`, `activity-ping`, `local-auth`, `admin-auth`, `sign-out-client`, `space-home`, `school-theme`, `daily-plan`, `level-tiers`, `lms-data`, `error`, `not-found`, `robots`, `utils/*`, `lib/*`), `dashboard/DashboardClient.tsx`, `dashboardShared.tsx`, `TutorialOverlay`, `GamesMapView`, `JeuxDefisDashboardView`, `GameShell`, `DictionaryView`, `WeeklyLeaderboardView`, `LeaderboardPodium`, `DailyChallengeCard`, `AdultLayout`, `sections/{DashboardNavbar,AventureView,ParentLinkBanner}`, `components/{LinkChildModal,NavKidIcon}`, `connexion/*`, `profile/*`, `parent/*`, `school/*` |
| **Lu en grande partie** | `HomeClient.tsx` (lignes 1-162 et 270-326), `ParentSettingsView` (logique et formulaires, pas tout le JSX visuel), `ParentDashboardView`, `ParentChildrenView`, `StudentAssignmentsView` (lignes 1-330), `DashboardActivities.tsx` (lignes 1-430 + extraits), `QuotidienView` (lignes 1-200 + extraits), `ChildProfileView` (lignes 1-140 + grep), `ScratchEmbed` (lignes 1-200 + extraits), `ProgrammingAtelier` (extraits), `parcours79/{voice,settings,content,logic,fx}`, `games/GestureCameraGame` (lignes 30-160), `_scolaire/lib/{http,useApi,parentLinks,whatsapp,identifiers,importing}`, `_scolaire/ui/{CredentialsModal,ui (début)}` |
| **Mesuré par script, non lu** | 134 fichiers de `admin/`, `ecole/`, `enseignant/`, `_scolaire/`, `_space/` (lignes, `any`, ARIA, effets, timers, styles inline…) ; comptages par fonction pour les 11 mini-jeux de `DashboardActivities.tsx` |
| **Non relu** | `games/VoiceAssistantGame.tsx`, `games/ImageTrainingGame.tsx`, reste de `games/ModelTrainingGames.tsx`, `parcours79/{LessonPlayer79,Scene79,activities,ModuleMap79}` (comptages seulement), `programmation/IsoBoard.tsx`, le détail des composants `admin/_components`, `ecole/_components`, `enseignant/_components`, `_scolaire/ui/*` hors cités, les fichiers CSS (sauf mesures), `vite.config.ts`, `worker/`, `scripts/`, `security.yml`, `cd.yml` |

Les constats issus d'un simple comptage ou d'un grep sont signalés « (grep) » ou « (non vérifié visuellement) ». Aucun fichier n'a été exécuté dans un navigateur : les comportements décrits (hydratation, rendu) sont déduits du code.

## 3. Synthèse chiffrée

| Mesure | Valeur | Lecture |
|---|---|---|
| Fichiers TS/TSX dans `app/` | 263 (44 192 lignes) | |
| Fichiers de plus de 500 lignes | 19 | Annexe D |
| Fichier le plus long | `DashboardActivities.tsx`, 1 957 lignes | |
| `any` explicites | **10** (9 emplacements, 6 fichiers) | Bon niveau |
| `dangerouslySetInnerHTML` | 9, **tous des `<style>` statiques** | Aucun vecteur XSS |
| `eslint-disable` / `@ts-ignore` | 8 (dans `parcours79/`, justifiés) | Bon niveau |
| `console.*` | 11 | Acceptable |
| `useEffect` | 123 | |
| `useMemo` / `useCallback` / `memo` | 82 | Surtout dans `parcours79` et `_scolaire` |
| Attributs `aria-*` / `role=` | 729 | Très inégal : voir module 6 et 7 |
| `<img>` | 95 (règle ESLint désactivée) | 3 fichiers seulement utilisent `next/image` |
| `style={{…}}` inline | **2 751** | Principal frein à la maintenance |
| `key={index}` | 58 | |
| Timers (`setTimeout`/`setInterval`) / nettoyés | 88 / 38 | Au moins 50 sans nettoyage |
| Accès `localStorage`/`sessionStorage` | 76 | Plusieurs sans `try/catch` |
| Fichiers de test | 4 (572 lignes) | Couverture quasi nulle des zones à risque |
| Poids de `public/` | ≈ 270 Mo (Scratch 139 Mo, images 115 Mo, Palou 18 Mo) | |
| Images > 1 Mo | 17 fichiers (≈ 29 Mo) | |
| **ESLint (exécuté pendant l'audit, `npx eslint app lib`)** | **0 erreur, 166 avertissements** dans 31 fichiers sur 264 | La CI exige 0 erreur : les avertissements ne bloquent rien |
| dont `no-unused-vars` | **104** (DashboardClient 43, DashboardActivities 22, GamesMapView 12, JeuxDefisDashboardView 8) | Imports et états morts : confirme le code mort |
| dont `react-hooks/set-state-in-effect` | 32 (20 fichiers) | `setState` synchrone dans un effet |
| dont `react-hooks/exhaustive-deps` | 12 | |
| dont `no-explicit-any` | 10 (9 emplacements) | |
| dont `react-hooks/purity` | 3 (`Date.now` dans le rendu : `DictionaryView:112`, `ChildProfileView:143`, `ParentNotificationCenter:246`) | |
| dont `react-hooks/immutability` | 1 (`DashboardClient:277`, `track` utilisé avant sa déclaration) | |
| dont `no-page-custom-font` | 1 (`layout.tsx:34`) | Confirme le problème de polices |
| directives `eslint-disable` inutiles | 3 (`Img79.tsx`) | La règle est désactivée globalement |


## 4. Les 20 priorités transversales (ordre d'exécution recommandé)

| Rang | Constat | Criticité | Où |
|---|---|---|---|
| 1 | **Le contrôle parental n'est appliqué sur aucun écran enfant** : `ScreenTimeManager` (verrous coucher et limite journalière, déverrouillage parental) n'est importé nulle part, et la synchronisation passe par `localStorage` du même navigateur. | BLOCKER | M1 (T1), M5 |
| 2 | **Vérifications backend d'autorisation** : `child_id` du mode visiteur (IDOR potentiel), `reset-password`, 2FA mêlée aux limites, preuve de jeu d'arcade, XP des défis 10-15 ans, CSV non échappé, couleurs d'école. | BLOCKER | Annexe B |
| 3 | **Le Studio de contenus édite une base que l'espace élève ne lit pas** ; le guide enseignant, lui, la lit. | CRITICAL | M9 (O1) |
| 4 | **Confidentialité des enfants** : MediaPipe chargé depuis `cdn.jsdelivr.net` et `storage.googleapis.com` ; iframe Scratch de même origine avec permissions caméra/micro/écran, sans `sandbox` ; CSP en mode « rapport seul » avec `unsafe-eval`. | CRITICAL | M7, M8, M10 |
| 5 | **`public/rapport.html`** (infrastructure, alertes, secrets nécessaires) et maquettes servis publiquement. | MAJOR | M10 |
| 6 | **Consentement parental non distinct** des conditions, non journalisé ; mot de passe de réactivation conservé en mémoire ; téléphone obligatoire. | CRITICAL | M9 |
| 7 | **Données inventées présentées comme réelles** : jauges de « compétences » du bulletin parent, précision de modèle simulée, devinette de dessin par défaut, faux audio « Écouter Palou », horloge de 16 ms par trame. | CRITICAL | M5, M6, M7 |
| 8 | **Bugs visibles** : `age: "7-9"` figé pour tous les défis ; en-tête « Niveau 12 » des défis 10-12 ; confettis qui redémarrent à chaque rendu ; badge « Premier contact » accordé trop tôt ; compteur d'étoiles gonflé ; images de modules identiques pour les trois âges ; halo du tutoriel resté sur la mauvaise cible ; `onEventConsumed` de Palou jamais consommé. | CRITICAL | M1-M4, M2 |
| 9 | **Plantages potentiels** : `localStorage` lu pendant le rendu sur `/dashboard/badges` (SSR) ; `curriculum-10-12/13-15` et `buildYoungPilot` sur `undefined` ; `id.split("-")[2]` sur un identifiant atypique. | CRITICAL | M2, M3, M6 |
| 10 | **Accessibilité bloquante** : au moins 15 modales sans `role="dialog"`, Échap ni focus ; cartes cliquables en `div` (dictionnaire, enfant du bulletin, mini-jeux) ; sélecteur d'heures et menus déroulants inutilisables au clavier ; labels sans `htmlFor` ; interrupteurs sans nom. | CRITICAL | M1, M4-M7 |
| 11 | **`aside { transform: translateX(0) !important }`** global dans `AdultLayout` : s'applique à tous les `<aside>` de la page. | CRITICAL | M5 |
| 12 | **Performance des images** : PNG de 0,5 à 2,6 Mo affichés à 64-200 px, aucun `next/image`, règle ESLint désactivée sur un faux argument ; 10 JSON de parcours (≈ 230 Ko) dans le bundle ; Scratch de 139 Mo dans `public/`. | MAJOR | M1, M8, M10 |
| 13 | **Accueil public en Client Component + `force-dynamic`** pour un seul `useState`. | CRITICAL | M2 |
| 14 | **Polices** : 7 familles Google Fonts bloquantes, `Fredoka One` non chargée, `@import` supplémentaire dans le dashboard. | MAJOR | M2, M3 |
| 15 | **Trois lecteurs de leçon, quatre utilitaires sonores, deux défis quotidiens, trois inscriptions d'enfant, deux modales de liaison** : doublons à unifier. | MAJOR | M3, M6, M8, M9 |
| 16 | **Monolithes** (19 fichiers > 500 lignes dont `DashboardActivities` 1 957, `StudioAdminView` 1 630, `DashboardClient` 1 442, `ParentSettingsView` 1 336). | MAJOR | Annexe D |
| 17 | **Code mort** (≈ 5 000 lignes, Annexe C) dont les restes de la refonte arcade. | MAJOR | Annexe C |
| 18 | **Timers et effets sans nettoyage** (≥ 50 timers), `fetch` sans `AbortController` (≥ 30), `exhaustive-deps` en avertissement seulement. | MAJOR | partout |
| 19 | **Tests** : 4 fichiers pour 44 000 lignes ; aucun test de `safeReturnTo`, import CSV, règles de badges, API de progression. | MAJOR | M10 |
| 20 | **Cohérence éditoriale** : « KerIA » / « kEur IA », « Ndeye », « una voix », emoji dans `ScreenTimeManager`. | MINOR | M3, M5, M1 |

## 5. Table des matières

1. Module 1 : `app/components/`
2. Module 2 : racine de `app/`, `lib/`, `utils/`, `services/`, `types/`, `design/`
3. Module 3 : `dashboard/`, cœur
4. Module 4 : `dashboard/`, vues élève
5. Module 5 : `dashboard/`, espace parent
6. Module 6 : `DashboardActivities.tsx`
7. Module 7 : `sections/`, `components/`, `classement/`, `games/`
8. Module 8 : `programmation/`, `parcours79/`
9. Module 9 : autres espaces (`connexion`, `profile`, `parent`, `school`, `_scolaire`, `admin`, `ecole`, `enseignant`)
10. Module 10 : configuration, dépendances, assets, CI
11. Annexes A à E
Une note sur la lecture de l'ensemble : **`parcours79/`, la connexion, `_scolaire/` et les espaces école/enseignant/admin sont de bonne qualité** (logique pure testée, ARIA, clients d'API uniques, 0 `any`). Les problèmes sont concentrés dans `components/`, dans la racine de `dashboard/` et dans les mini-jeux.

---
## MODULE 1 : `frontend/app/components/` (14 fichiers, 4 916 lignes)

> Il n'existe pas de dossiers `components/` ni `hooks/` à la racine du frontend. Les composants partagés sont dans `app/components/`. Il n'y a aucun hook custom nulle part (le seul est `app/dashboard/useStoredNumber.ts`).

### Constats transversaux

| # | Constat | Criticité |
|---|---|---|
| T1 | **Trois composants ne sont importés nulle part** : `ScreenTimeManager` (1 183 lignes, écrans de verrouillage coucher / limite journalière / déverrouillage parental), `KidTooltip`, `KidsRewardAnimation`. Vérifié par grep, y compris sur `HEAD` et sur le commit `6ea65a0`. `DashboardClient.tsx` pose pourtant des `data-kid-tooltip` : aucune infobulle ne s'affiche. Le contrôle parental n'est donc pas appliqué côté écran enfant. | BLOCKER |
| T2 | Aucune modale n'a `role="dialog"` + `aria-modal` avec focus trap et touche Échap. Seul `BadgeUnlockAnimation` a le rôle, sans focus trap ni Échap. | CRITICAL |
| T3 | Les animations `canvas-confetti` et les `@keyframes` ignorent `prefers-reduced-motion`. | MAJOR |
| T4 | `<style>` injecté dans 10 composants (`dangerouslySetInnerHTML` ou template). Les noms de keyframes (`popIn`, `fadeIn`, `shine`) sont en collision globale (`kids-theme.css:30` définit aussi `popIn`). | MAJOR |
| T5 | `<img>` bruts partout, aucun `next/image`. Les PNG de Palou pèsent de 0,5 à 2,6 Mo (`Palou_Determine.png` = 2,6 Mo). | MAJOR |
| T6 | Styles 100 % inline, survol en JS (`onMouseOver`/`onMouseOut`) : plus de 60 objets de style recréés à chaque rendu. | MAJOR |
| T7 | `framer-motion` et `motion/react` sont mélangés. `framer-motion` n'est pas dans le `package.json` (seul `motion` y est) : il ne marche que par dépendance transitive. | MAJOR |
| T8 | `canvas-confetti` importé statiquement dans 4 fichiers (bundle initial), sans `import()` dynamique. | MINOR |
| T9 | **`PalouGuide.tsx` (246 lignes) n'est lui aussi monté nulle part** : `DashboardClient.tsx:10` n'importe que son *type* `PalouEvent`. Le dashboard entretient pourtant `palouEvent`, `isWalking`, `isThinking` et trois effets (salutation, saut au gain d'XP, marche pendant les transitions) qui ne nourrissent plus rien (confirmé par ESLint : `palouEvent`, `isWalking`, `isThinking` « assigned but never used »). Les défauts listés plus bas pour `PalouGuide` sont donc sans effet tant qu'il n'est pas remonté. | MAJOR |

**Instruction pour Gemini (T1) :** « Gemini, dans `app/dashboard/DashboardClient.tsx`, dis-moi d'abord si `ScreenTimeManager` et `KidTooltip` devaient être montés (historique git du commit `7169470`). S'ils le doivent, monte-les via `next/dynamic` avec `ssr:false`. Sinon, supprime-les. Supprime `KidsRewardAnimation.tsx` après avoir vérifié l'absence d'import. »

### `BadgeGrid.tsx`

| Lignes | Crit. | Problème |
|---|---|---|
| 48-72 | MAJOR | Un badge verrouillé est un `<button disabled>` sans texte pour les lecteurs d'écran : `grayscale` et opacité sont purement visuels. Pas d'`aria-label="… verrouillé"`. |
| 101 | MAJOR | `<img>` sans `width`/`height`, `loading="lazy"`, `decoding="async"` : CLS et chargement de toute la grille d'un coup. |
| 107 | MINOR | L'emoji n'a ni `aria-hidden` ni `role="img"`. |
| 46-118 | MINOR | Chaque badge refait ses objets de style (≈ 45 propriétés inline) et n'est pas mémoïsé. |
| 120-124 | MINOR | `<style>` dans le rendu pour un seul `:hover`. `kia-shine` est défini ailleurs sans garantie. |
| 47 | MINOR | `<div>` wrapper inutile autour de chaque bouton. |

**Instruction pour Gemini :** « Gemini, dans `BadgeGrid.tsx`, extrais `BadgeCard` en `React.memo`. Ajoute `aria-label={badge.earned ? badge.label : \`${badge.label}, verrouillé\`}`. Passe `<img>` à `next/image` (ou `loading="lazy" decoding="async" width/height`). Déplace le style dans un module CSS et supprime le `<style>` inline. Mets `aria-hidden` sur l'emoji. »

### `BadgeUnlockAnimation.tsx`

| Lignes | Crit. | Problème |
|---|---|---|
| 25-52 | CRITICAL | `useEffect` dépend de `[badge]`. `DashboardClient` passe un objet littéral recréé à chaque rendu : chaque rendu du parent supprime l'`interval`, recalcule `animationEnd` et **relance les confettis**, qui ne s'arrêtent plus tant que le parent se re-rend. |
| 55-64 | MAJOR | `onClose` est une flèche inline côté parent : le listener `keydown` est retiré et réinstallé à chaque rendu. |
| 240-252 | MAJOR | `onError` manipule le DOM à la main (`createElement`, `innerHTML`, `appendChild`). SVG statique donc pas de XSS, mais hors React ; chaque erreur ajoute un nouveau `div` (doublons), aucun nettoyage. |
| 70-86 | MAJOR | Pas de focus initial, ni focus trap, ni retour du focus. `aria-labelledby` pointe vers un `<p>`, pas un titre. |
| 67 | MINOR | Ternaire à 3 niveaux sur une ligne de 170 caractères. |
| 125 | MINOR | `conic-gradient` de 1 500 caractères en inline. |
| 75-86, 120-310 | MAJOR | Composant de 300 lignes, ~90 % dupliqué avec `LevelUpAnimation`. |

**Instruction pour Gemini :** « Gemini, dans `BadgeUnlockAnimation.tsx`, remplace la dépendance `[badge]` par `[badge.id]`. Stabilise `onClose` avec une ref. Remplace `onError` par un état `imgFailed` qui rend `<Trophy />` de lucide. Passe l'`img` à `next/image`. Crée `components/CelebrationModal.tsx` avec la structure commune à `LevelUpAnimation`. Crée un hook `useConfettiBurst({ duration, colors })` avec `disableForReducedMotion: true`. »

### `ChildAvatar.tsx`

| Lignes | Crit. | Problème |
|---|---|---|
| 82-146 | MAJOR | Avatars Palou en `<image>` SVG pointant vers des PNG de 1 à 2,6 Mo affichés à 64 px. Très lourd dans les classements. |
| 333-342 | MAJOR | `id` de `linearGradient`/`clipPath` = `av-bg-${a.id}` : si le même avatar apparaît deux fois, ids dupliqués ; si l'un est masqué (`display:none`), l'autre perd son dégradé. Utiliser `useId()`. |
| 78-328 | MINOR | `Character` : 250 lignes, `switch` de 20 cas, recalculé à chaque rendu, composant non mémoïsé. |
| 99, 124 | MINOR | Alias d'ID `palou-malin`, `palou-hero` absents de `AVATARS` (cas morts ou d'héritage non documentés). |

**Instruction pour Gemini :** « Gemini, dans `ChildAvatar.tsx`, remplace les ids par `useId()`, enveloppe en `React.memo`, génère des vignettes WebP 128 px dans `/images/palou/avatars/` et remplace les `<image href>` lourds. Extrais les personnages SVG dans `avatars/Characters.tsx` avec un `Record<string, ComponentType>` à la place du `switch`. »

### `FamilyChatWidget.tsx`

| Lignes | Crit. | Problème |
|---|---|---|
| 41-74 | MAJOR | Polling toutes les 5 s même quand `available === false` (enseignant, parent sans enfant). Pas d'`AbortController` ni de backoff. |
| 33-39 | MINOR | `isOpenRef` duplique l'état `isOpen`. |
| 54-57 | MAJOR | La liste `messages` grandit sans limite ; chaque ajout fait un `new Set` sur toute la liste. |
| 76-78 | MINOR | `scrollIntoView({behavior:"smooth"})` à chaque modification de `messages`. |
| 147-165 | CRITICAL | Fenêtre de chat sans `role="dialog"`, Échap, focus initial sur l'input, ni retour du focus. Zone de messages sans `role="log"` ni `aria-live="polite"`. |
| 142 | MINOR | `<div aria-label>` sans rôle : l'`aria-label` est ignoré. |
| 154-155 | MAJOR | `width: 360, height: 500` fixes : débordement sur mobile < 400 px. |
| 118-277 | MAJOR | Styles recréés à chaque frappe (`setInputText` re-rend les 200 lignes). Pas de `MessageBubble`/`ChatInput` extraits. |
| 138, 162 | MINOR | `zIndex: 999999` : conflit d'empilement avec `PalouGuide` (fixed bas-droite) et les modales. |

**Instruction pour Gemini :** « Gemini, dans `FamilyChatWidget.tsx`, ne démarre le polling que si `available` est vrai (sinon toutes les 60 s). Ajoute `AbortController`, plafonne `messages` à 200. Extrais `MessageBubble` (memo) et `ChatComposer`. Ajoute `role="dialog" aria-label="Chat familial"`, `role="log" aria-live="polite"`, focus auto sur l'input. Mets `width: min(360px, calc(100vw - 32px))`. »

### `KidTooltip.tsx`

| Lignes | Crit. | Problème |
|---|---|---|
| tout | BLOCKER | Jamais monté (T1). |
| 16 | MINOR | `NodeJS.Timeout` dans du code navigateur : `ReturnType<typeof setTimeout>`. |
| 92-105 | MAJOR | `setTooltip` (donc un rendu) à chaque `scroll`, sans `requestAnimationFrame`. |
| 50-76 | MAJOR | Souris uniquement : pas de `focusin`, ni tactile (WCAG 1.4.13). Pas de `role="tooltip"` ni `aria-describedby`. |
| 5 | MINOR | Délai de 4 s : choix produit probablement trop long. |

**Instruction pour Gemini :** « Gemini, dans `KidTooltip.tsx`, remplace `NodeJS.Timeout`, ajoute `focusin/focusout`, limite `handleScroll` par `requestAnimationFrame`, ajoute `role="tooltip"` + `id` et `aria-describedby` sur la cible. Ne fais rien d'autre tant que le montage n'est pas décidé (T1). »

### `KidsRewardAnimation.tsx`

| Lignes | Crit. | Problème |
|---|---|---|
| tout | MAJOR | Code mort (T1). |
| 104-124 | CRITICAL | Boucle `requestAnimationFrame(frame)` jamais annulée au démontage : confettis pendant 4 s sur la page suivante. |
| 11, 49 | MAJOR | `id` SVG `gold`, `glow`, `starGold` en collision : `StarSVG` est rendu 3 fois. |
| 83 | MINOR | Prop `maxXp` jamais lue. `earnedStars = 3` et `gradeText` sont des constantes déguisées. |
| 317 | MAJOR | `<h1>` dans une modale (deuxième `h1`), pas de `role="dialog"`. |
| 319 | MAJOR | `Palou_Celebration.png` : 747 Ko sans dimensions. |
| 141-315 | MINOR | 170 lignes de CSS en chaîne. |

**Instruction pour Gemini :** « Gemini, supprime `KidsRewardAnimation.tsx` après avoir confirmé qu'aucune route ne l'importe. Si conservé : stocker l'id de frame et appeler `cancelAnimationFrame` au cleanup. »

### `LevelDetailsModal.tsx`

| Lignes | Crit. | Problème |
|---|---|---|
| 1 | MINOR | Pas de `"use client"` alors qu'il utilise des hooks (marche car importé depuis un client component). |
| 11-15 | MINOR | `mounted` + `setMounted(true)` dans un effet pour un fondu : rendu inutile (règle `set-state-in-effect`). Utiliser une animation CSS. |
| 27-33, 211 | CRITICAL | `role="presentation"` + `onClick` sur le fond, sans `role="dialog"`, `aria-modal`, Échap, focus trap. |
| 34-209 | MAJOR | `popIn` et `shine` en collision avec `kids-theme.css:30`. |
| 225-229 | MAJOR | `<img>` sans dimensions ni lazy. |
| 256 | MINOR | `nextLevel!` alors que `isMaxLevel` est déjà calculé. |
| 266-277 | MINOR | `.tip-card:nth-child(n)` pour les couleurs : fragile. |

**Instruction pour Gemini :** « Gemini, dans `LevelDetailsModal.tsx`, ajoute `"use client"`, `role="dialog" aria-modal="true" aria-labelledby`, Échap et focus sur Fermer. Supprime l'état `mounted`. Renomme les keyframes (`lvlmodal-popIn`, `lvlmodal-shine`) ou passe en module CSS. Remplace `nextLevel!` par `nextLevel &&`. »

### `LevelUpAnimation.tsx`

| Lignes | Crit. | Problème |
|---|---|---|
| 17-44 | MAJOR | Même défaut que BadgeUnlock (dépend `[levelName]`, chaîne donc moins grave) ; pas de `prefers-reduced-motion`. |
| 46-58 | CRITICAL | Aucun `role="dialog"`, aucun Échap : l'enfant ne ferme que par le bouton. |
| 136-146 | MAJOR | Même `onError` avec `innerHTML`/`createElement` : doublons de `div`. |
| 134 | MINOR | `mixBlendMode: 'multiply'` + `backdrop-filter: blur(15px)` + animation de 30 s : coûteux en peinture. |
| 172-192 | MINOR | Bouton « Super ! » sans `aria-label` explicite. |

**Instruction pour Gemini :** « Gemini, dans `LevelUpAnimation.tsx`, applique les mêmes corrections que `BadgeUnlockAnimation.tsx` (`imgFailed`, `useConfettiBurst`, `CelebrationModal`), ajoute Échap et `role="dialog"`. »

### `ModuleIcon.tsx`

| Lignes | Crit. | Problème |
|---|---|---|
| 4-61 | MINOR | 57 icônes importées individuellement (tree-shaking OK mais toutes embarquées). |
| 63-123 | MINOR | `ICON_MAP` sans validation des clés fournies par le backend : clé inconnue → `Bot` silencieusement. |
| 120-122 | MINOR | Alias redondants (`butterfly`/`papillon`, `speech`/`mic`). |

**Instruction pour Gemini :** « Gemini, dans `ModuleIcon.tsx`, loggue un `console.warn` en dev quand `name` est absent de `ICON_MAP`. Sinon ne touche à rien. »

### `PalouGuide.tsx`

> **Composant mort** (voir T9). Les constats suivants valent seulement si la mascotte flottante est remontée ; sinon, supprimer le fichier et les trois états associés dans `DashboardClient.tsx` (voir module 3).

| Lignes | Crit. | Problème |
|---|---|---|
| 34-42 | MAJOR | `TIPS` recréé à chaque rendu, utilisé dans un effet `[inline]` (`exhaustive-deps`). |
| 55-57, 70-74 | CRITICAL | `setTimeout` jamais annulés au démontage : `setState` après démontage. |
| 78-109 | CRITICAL | `onEventConsumed` dans les dépendances : avec un callback inline côté parent, l'effet est relancé à chaque rendu, le timer de 1,5 s est annulé, l'événement n'est jamais « consommé ». |
| 82-91 | MAJOR | `PalouEvent` inclut `curious` et `surprise` mais aucune branche ne les gère. |
| 79 | MINOR | `setImgExt("png")` à chaque exécution de l'effet. |
| 211-222 | CRITICAL | `<div onClick>` non interactif : pas de `role="button"`, `tabIndex`, ni clavier. |
| 224-228 | MAJOR | Bulle d'aide sans `role="status"`/`aria-live`. |
| 229-242 | MAJOR | `alt="Palou Mascot"` (anglais), pas de dimensions, PNG lourd, fallback png→jpg par état. |
| 113-210 | MINOR | `<style dangerouslySetInnerHTML>` pour du CSS statique, réinjecté par instance. |
| 217-221 | MINOR | `position: fixed` + `pointerEvents: auto` sur 240×240 px en bas à droite : bloque les clics, se superpose au bouton du chat. |

**Instruction pour Gemini :** « Gemini, dans `PalouGuide.tsx`, sors `TIPS` du composant. Stocke tous les `setTimeout` dans une `useRef<Set>` et vide-la au cleanup. Stabilise `onEventConsumed` par une ref. Ajoute les branches `curious` et `surprise`. Transforme le `div` cliquable en `<button type="button" aria-label="Faire sauter Palou">`. `role="status"` sur la bulle, `alt="Palou, la mascotte"`, CSS en module. »

### `PalouTutorial.tsx`

| Lignes | Crit. | Problème |
|---|---|---|
| 194-216 | CRITICAL | Quand le sélecteur de l'étape ne trouve aucun élément, l'effet ne fait rien et **`targetRect` garde la valeur de l'étape précédente** : le halo reste sur le mauvais élément. |
| 21-85 | MAJOR | Sélecteurs couplés à des classes CSS (`.userline`, `.lms-side nav a[href*='badges']`, `.track-hero button`) : casse silencieusement à la refonte du dashboard. Utiliser `data-tour`. |
| 223 | MAJOR | `scroll` écouté sans `capture:true` : un scroll dans un conteneur interne ne remonte pas ; pas de `requestAnimationFrame`. |
| 110-117, 223-224 | MINOR | Deux listeners `resize` séparés. |
| 119-132 | MAJOR | `currentAudioRef` jamais assigné : code audio mort ; commentaire « voix clonée » mais `speechSynthesis` utilisé. |
| 135-169 | MINOR | `playVoice`/`speakFallback` redéfinis à chaque rendu, `try/catch` inutile. |
| 270-310 | MAJOR | Largeur de bulle codée à 540 px : débordement sous 580 px (vérifier `max-width` dans `tutorial.css`). |
| 336-343 | CRITICAL | Cliquer le fond fait avancer d'étape (`<rect onClick={handleNext}>`) : un enfant peut sauter la visite par accident ; pas d'équivalent clavier. |
| 315 | CRITICAL | Pas de `role="dialog"`/`aria-modal`, focus trap, Échap. Points de navigation sans alternative texte. |
| 394-400 | MINOR | `title` comme seul libellé. |
| 91 | MINOR | Prop `activeTab` déclarée mais jamais lue ; `containerRef` inutilisée. |
| 5 | MINOR | `canvas-confetti` statique. |

**Instruction pour Gemini :** « Gemini, dans `PalouTutorial.tsx`, appelle `setTargetRect(null)` quand `querySelector` ne trouve rien (et passe à l'étape suivante après 1 s). Remplace les sélecteurs de classe par `[data-tour="…"]` (modifie `DashboardClient`, `DashboardNavbar`). Écoute `scroll` avec `{capture:true, passive:true}` et regroupe `measureTarget` dans un `requestAnimationFrame`. Supprime `currentAudioRef`. Limite la bulle à `Math.min(540, viewport.w - 40)`. Retire `onClick={handleNext}` du fond. Ajoute `role="dialog" aria-modal="true" aria-labelledby`, Échap, focus. `import()` dynamique de `canvas-confetti`. »

### `ParentNotificationCenter.tsx` (701 lignes)

| Lignes | Crit. | Problème |
|---|---|---|
| 27, 44 | MAJOR | Deux `any` : `payload?: any` (lu pour `childId`, `status`, `extraMinutes`) et `icon: any`. Typer avec une interface et `LucideIcon`. |
| 167-171 | MAJOR | `flash()` : `setTimeout` jamais annulé ; un message est effacé trop tôt par l'ancien timer ; fuite au démontage. |
| 177-198 | MAJOR | `fetchNotifications` hors de l'effet qui l'appelle avec `[]` (`exhaustive-deps`). Polling toutes les 10 s même fenêtre fermée / onglet caché ; pas d'`AbortController`. |
| 281-309 | CRITICAL | Cloche : pas de `aria-expanded`, `aria-haspopup`, `aria-controls`. Nombre de non-lues non annoncé. Popup sans rôle, Échap, retour du focus. |
| 299-308, 398-399, 619-620, 646-647 | MAJOR | Survol par mutation de `e.currentTarget.style` : conflit avec React, inopérant au tactile. |
| 226-276, 242, 649, 664 | MAJOR | « +15 min » codé en dur alors que `extraMinutes` est variable. |
| 245-250 | MINOR | Double canal de synchro (`localStorage` + `BroadcastChannel`), tous deux écoutés par `ScreenTimeManager` : `checkStatus` deux fois. |
| 435-686 | MAJOR | `map` avec 250 lignes de JSX inline, un objet de style par badge (561-590). Extraire `NotificationRow` en `React.memo`. |
| 129-159 | MINOR | `formatFrenchDateTime` réécrit `Intl.DateTimeFormat("fr-FR")`. |
| 161-701 | MAJOR | Composant de 540 lignes, 9 états, 5 fonctions. |
| 693-698 | MINOR | `<style dangerouslySetInnerHTML>` pour un seul `@keyframes`. |
| 600-650 | MINOR | Boutons Décliner/Approuver : ajouter le nom de l'enfant dans l'`aria-label`. |

**Instruction pour Gemini :** « Gemini, dans `ParentNotificationCenter.tsx`, définis `interface NotificationPayload { childId?: number; status?: …; extraMinutes?: number; type?: string }` et remplace les deux `any` (`icon: LucideIcon`). Crée `NotificationRow.tsx` (memo). `fetchNotifications` en `useCallback` avec `AbortController`, suspendre si `document.visibilityState === "hidden"`. Timer de `flash` dans une ref nettoyée. Remplace tous les `onMouseOver/Out` par du CSS `:hover`. Remplace « 15 min » par `${extraMinutes} min`. Ajoute `aria-expanded`, `aria-haspopup="dialog"`, `aria-label` dynamique, Échap. »

### `ScreenTimeManager.tsx` (1 183 lignes)

| Lignes | Crit. | Problème |
|---|---|---|
| tout | BLOCKER | Jamais monté (T1) : les écrans de coucher et de limite n'existent pas à l'exécution. |
| 36-1183 | CRITICAL | Un seul composant de 1 150 lignes : 3 écrans plein écran + 2 modales de mot de passe quasi identiques (652-763 et 1041-1149). |
| 690-707, 1077-1094 | CRITICAL | `<input type="password">` sans `<label>`, sans `autoComplete="current-password"`, sans `autoFocus`. |
| 709-719, 1096-1106 | MAJOR | Erreur/succès du déverrouillage sans `role="alert"`/`status`. |
| 294, 770 | CRITICAL | Écrans de verrouillage sans `role="alertdialog"`/`aria-modal` ; focus non piégé : un enfant peut tabuler vers la page derrière l'overlay. |
| 113-144 | MAJOR | Polling reconstruit à chaque changement d'état (`status?.isLocked`, `persistedLock?.isLocked`, `requestSent`) : `clearInterval` + `setInterval` + `checkStatus()` immédiat et `BroadcastChannel` recréé. Utiliser une ref. |
| 117-118 | MINOR | Commentaire « 2 s / 5 s » mais le code met 6 000 ms. |
| 58-67, 93-95 | MAJOR | Verrou persisté dans `sessionStorage` lu sans validation de schéma : un enfant peut le supprimer depuis la console (le serveur doit refaire le contrôle, à confirmer). |
| 187-193 | MINOR | `window.location.reload()` dans un `setTimeout` non annulé. |
| 204-213 | MAJOR | `handleSignOut` : `sessionStorage.clear()` global ; `isLoggingOutRef` déclaré (ligne 53), jamais utilisé ; doublon de `sign-out-client.ts`. |
| 152-165 | MAJOR | `handleRequestTime` : l'échec est ignoré, aucun message : l'enfant ne sait pas si sa demande est partie. |
| 231-233 | MINOR | Garde incompréhensible `if (!isLocked && (remaining === null …)) { if (!status) return null; }`. |
| 270 | MINOR | Emoji `⏱️` dans le texte (contraire à la règle « icônes Lucide, pas d'emojis »). |
| 272-289 | MAJOR | Croix de fermeture de la bannière sans `aria-label`. |
| 418-431, 842-854 | MAJOR | `<img>` sans dimensions ; chemins `/palou/Dormir.png`, `/palou/Bravo !.png` (espace et `!`) : dossier distinct de `/images/palou/` (doublon d'assets). |
| 1155-1180 | MINOR | `fadeIn` aussi défini dans `ParentSettingsView.tsx:1321` (collision globale). |
| 308-334 | MINOR | 9 éléments `Stars` animés en permanence, sans `prefers-reduced-motion`. |

**Instruction pour Gemini :** « Gemini, dans `ScreenTimeManager.tsx`, éclate le fichier en `screen-time/BedtimeLock.tsx`, `LimitReachedLock.tsx`, `TimeWarningBanner.tsx`, `ParentUnlockForm.tsx` (formulaire unique réutilisé). `<label>` visible + `autoComplete="current-password"`. `role="alertdialog" aria-modal="true"` avec focus trap, `role="alert"` sur les erreurs, `aria-label` sur la croix. Polling dans un seul effet avec ref. Message d'erreur si la demande échoue. Remplace `sessionStorage.clear()` par la purge des clés `keria_*` (ou utilise `signOut` de `sign-out-client.ts`). Supprime `isLoggingOutRef` et l'emoji. Valide le JSON de `sessionStorage`. D'abord, tranche T1. »

### `SkeletonLoader.tsx`

| Lignes | Crit. | Problème |
|---|---|---|
| 24-112 | MAJOR | Aucun `role="status"`/`aria-busy`/`aria-live` sur `SkeletonLoader` (seul `LessonSkeleton` en a un). |
| 92, 108 | MINOR | `<style>` du `@keyframes kia-shimmer` réinjecté par instance. |
| 17-22 | MINOR | Shimmer sans `prefers-reduced-motion`. |
| 80-82, 109 | MINOR | `Array.from({length})` recréé à chaque rendu. |
| 9 | MINOR | `"use client"` inutile (aucun hook). |

**Instruction pour Gemini :** « Gemini, dans `SkeletonLoader.tsx`, ajoute `role="status" aria-busy="true" aria-label="Chargement"` sur le conteneur. Déplace `kia-shimmer` dans `globals.css` avec `@media (prefers-reduced-motion: reduce)`. Supprime `"use client"`. »

### Ordre de correction du module 1
1. T1 (impact fonctionnel et sécurité enfants).
2. Bugs de comportement : `BadgeUnlockAnimation` (deps `[badge]`), `PalouGuide` (`onEventConsumed`, timers), `PalouTutorial` (`targetRect` périmé), `KidsRewardAnimation` (rAF).
3. Accessibilité : modales (T2), `PalouGuide` cliquable, champs mot de passe, cloche de notifications.
4. Dette : `ParentNotificationCenter`, `ScreenTimeManager` à éclater, `useConfettiBurst`, `CelebrationModal`, `any`.
5. Performance : PNG de Palou (T5), `next/image`, `canvas-confetti` en import dynamique.
## MODULE 2 : racine de `frontend/app/`, `lib/`, `app/utils/`, `app/services/`, `app/types/`, `app/design/`

### Constats transversaux

| # | Constat | Criticité |
|---|---|---|
| R1 | **Code mort volumineux.** Non importés : `lib/soundManager.ts` (144 lignes), `services/curriculum-api.ts` (95), `services/curriculum-fallback.ts` (253), `types/curriculum.ts` (81) (les trois derniers ne s'importent qu'entre eux). 11 des 13 exports de `design/motion-variants.ts` ne sont pas utilisés. | MAJOR |
| R2 | Le layout racine ne monte ni `ScreenTimeManager` ni `KidTooltip` (confirme T1). | BLOCKER |
| R3 | Polices : 7 familles Google Fonts dans un `<link>` bloquant + un `@import` dans un `<style>` de `DashboardClient`. Pas de `next/font`. `Fredoka One` est demandée par des composants mais seule `Fredoka` est chargée. | MAJOR |
| R4 | 14 feuilles CSS globales importées dans `layout.tsx`, dont 5 minifiées sur une ligne. `globals.css` : 110 `!important`. | MAJOR |
| R5 | Types dupliqués : `AgeKey`, `Lesson`, `World` dans `lms-data.ts` et `types/curriculum.ts`. | MINOR |

### `app/layout.tsx`

| Lignes | Crit. | Problème |
|---|---|---|
| 32-37 | MAJOR | Feuille de polices bloquante pour 7 familles dont `Fraunces` (axe `opsz,wght`) et `Plus Jakarta Sans` italique 400..800 : LCP pénalisé. |
| 3-18 | MAJOR | 14 imports CSS globaux dans un ordre qui fait la cascade ; aucun découpage par route : tout est chargé sur la vitrine publique, y compris `dashboard/programmation/programmation.css`. |
| 25 | MINOR | `other: { "codex-preview": "development" }` : balise meta parasite. |
| 22-26 | MINOR | Métadonnées minimales : pas d'`openGraph`, `metadataBase`, `icons`, `viewport`/`themeColor`. |
| 39 | MINOR | `suppressHydrationWarning` global sur `<body>` : masque de vrais écarts d'hydratation. |
| 28-45 | MAJOR | Pas de lien d'évitement ni de `<main>` garanti. |

**Instruction pour Gemini :** « Gemini, dans `app/layout.tsx`, remplace le `<link>` Google Fonts par `next/font/google` (Fredoka, Nunito, Plus Jakarta Sans, `display:"swap"`, poids réellement utilisés), expose-les en variables CSS et mets à jour `globals.css` et `tutorial.css`. Supprime `Fraunces`, `DM Serif Display`, `Baloo 2`, `Poppins` si un grep sur `font-family` ne les trouve plus. Retire `other: { "codex-preview" }`. Ajoute `metadataBase` et `openGraph`. Déplace `programmation.css` dans son composant. Ajoute un lien d'évitement. »

### `app/HomeClient.tsx` (551 lignes)

| Lignes | Crit. | Problème |
|---|---|---|
| 1, 72 | CRITICAL | Toute la page d'accueil est un Client Component pour un seul `useState` (sélecteur d'âge). |
| 28-68 | MAJOR | 40 lignes de données (`TRACKS_DATA`) embarquées dans le bundle client. |
| 278-287 | MAJOR | Sélecteur d'âge : boutons sans `aria-pressed` ni sémantique `tablist`/`tab`/`tabpanel`. |
| 81, 150-154, 303-307, 426, 473, 531 | MAJOR | `<img>` bruts sans dimensions ni `next/image` ; hero `Palou_Hero.png` 487 Ko, logo SIRIBRA 229 Ko, illustrations de module ≈ 190-230 Ko pièce, pas de `priority` sur le hero (LCP). |
| 303-307 | MAJOR | Bug : `/images/modules/p${mod.n}.png` pour les trois onglets : 10-12 et 13-15 affichent les images 7-9 alors que `a1`-`a12` existent. |
| 143 | MINOR | `aria-label` sur un `div` sans rôle : ignoré. |
| 321-324 | MINOR | Style inline `color: "inherit"…` sur un `Link`. |
| 89-92 | MINOR | Liens d'ancre : cibles à vérifier ; pas de menu burger visible pour mobile. |
| 172-202 | MINOR | `h4` sans `h3` parent. |
| 551 | MAJOR | Une fonction de 480 lignes sans découpage. |

**Instruction pour Gemini :** « Gemini, dans `app/HomeClient.tsx`, supprime `"use client"` : le fichier devient un Server Component. Extrais seulement le sélecteur de parcours dans `app/_home/TrackSwitcher.tsx` (`"use client"`) avec `role="tablist"`/`tab`/`tabpanel` et `aria-selected`. Découpe en `Hero`, `StatsBar`, `Method`, `Families`, `Partners`, `Footer`. `next/image` avec dimensions et `priority` sur le hero. Corrige l'image des modules par âge (`a${n}`, équivalent 13-15). Convertis les PNG en WebP. »

### `app/page.tsx`

| Lignes | Crit. | Problème |
|---|---|---|
| 3 | MAJOR | `export const dynamic = "force-dynamic"` sur une page entièrement statique : plus de cache ni de génération statique. |
| tout | MINOR | Pas de `metadata` propre. |

**Instruction pour Gemini :** « Gemini, supprime `dynamic = "force-dynamic"` de `app/page.tsx`. Si la page doit rediriger les comptes connectés, fais-le par middleware. »

### `app/csrf-fetch.tsx`

| Lignes | Crit. | Problème |
|---|---|---|
| 57 | MAJOR | `window.fetch` remplacé au chargement du module (effet de bord global). `CsrfFetch` rend `null`. Un `fetch` lancé avant l'hydratation part sans en-tête CSRF. |
| 37-54 | MINOR | `init.headers` écrase les en-têtes d'un `Request` passé en `input` (corps déjà consommé). |
| 46-47 | MINOR | Si `/api/auth/csrf` échoue, la requête mutante part sans jeton, sans signalement. |
| 19-22 | MINOR | `readCookie` appelé deux fois par requête. |

**Instruction pour Gemini :** « Gemini, remplace le monkey-patch par un module `lib/api.ts` exportant `apiFetch(input, init)` qui ajoute l'en-tête CSRF et migre progressivement les appels. À défaut, journalise l'échec de `/api/auth/csrf` en développement et documente l'ordre d'import dans `layout.tsx`. »

### `app/activity-ping.tsx`

| Lignes | Crit. | Problème |
|---|---|---|
| 21, 59 | MAJOR | `pointermove` et `scroll` écoutés en capture sur `document` : handler exécuté à chaque mouvement. Utiliser un drapeau « activité récente » et un `setInterval` d'une minute. |
| 27-65 | MINOR | `[inSignedInArea, pathname]` : l'effet entier est remonté à chaque navigation. |
| 45 | MINOR | Pas d'`AbortController` ni `keepalive`. |
| 46-49 | MINOR | `window.location.assign` perd l'état non sauvegardé (formulaire). |
| 19 | MINOR | `SIGNED_IN_AREAS` dupliquée (`space-home.ts`, `robots.ts`, middleware). |

**Instruction pour Gemini :** « Gemini, dans `activity-ping.tsx`, remplace l'écoute de `pointermove`/`scroll` par un drapeau `active = true` et un `setInterval(60_000)` qui envoie le ping si `active`. Sépare l'envoi au changement de page dans un `useEffect` à part. »

### `app/local-auth.ts`

| Lignes | Crit. | Problème |
|---|---|---|
| 11-17 | MAJOR | Détection de la phase de build par `process.argv.some(a => a.includes("build"))` : fragile. N'utiliser que `NEXT_PHASE`. |
| 20-58 | MAJOR | `getLocalUser()` fait un `fetch` Django à chaque appel, sans `React.cache` (layout + page + composants = plusieurs appels par requête). |
| 39-51 | MINOR | Réponse non validée : `Number(data.profile.id)` peut donner `NaN`. |
| 5 | MINOR | `role: string` : un union littéral éviterait les fautes de frappe. |
| 53-55 | MINOR | Erreur avalée (`catch {}`) sans distinguer backend injoignable et réponse invalide. |
| 72-77 | MINOR | `localSignOutPath` conservé « pour compatibilité » : candidat à suppression. |
| 79-84 | MINOR | `safeReturnTo` ne gère pas les variantes encodées (`/%2f%2fevil`), ni les tabulations. |

**Instruction pour Gemini :** « Gemini, dans `local-auth.ts`, enveloppe `getLocalUser` dans `React.cache`. Limite la détection de build à `NEXT_PHASE`. Type `role` par un union littéral exporté. Valide la réponse du profil. Dans `safeReturnTo`, `decodeURIComponent` dans un `try/catch` avant les tests de préfixe. »

### `app/admin-auth.ts`

| Lignes | Crit. | Problème |
|---|---|---|
| 7-10 | MINOR | `isAdminEmail` est `async` sans `await`. |
| 14 | MAJOR | Un compte dont l'e-mail figure dans `KEUR_ADMIN_EMAILS` obtient l'accès admin même sans rôle Django `admin`. Si l'inscription ne vérifie pas l'e-mail, élévation de privilèges possible (à confirmer côté backend). |
| 3-14 | MINOR | Style sans espaces, incohérent. |

**Instruction pour Gemini :** « Gemini, dans `admin-auth.ts`, rends `isAdminEmail` synchrone. Vérifie dans le backend que l'e-mail est vérifié à l'inscription ; sinon supprime la voie par e-mail et ne fais confiance qu'à `role === "admin"`. »

### `app/sign-out-client.ts`, `space-home.ts`, `school-theme.ts`, `daily-plan.ts`, `level-tiers.ts`

| Fichier | Lignes | Crit. | Problème |
|---|---|---|---|
| `sign-out-client.ts` | 21 | MINOR | `sessionStorage.clear()` global ; `ScreenTimeManager` fait la même chose en doublon. |
| `sign-out-client.ts` | 27-35 | MINOR | Le `fetch` de déconnexion n'a ni délai ni `AbortController`. |
| `space-home.ts` | 14 | MINOR | `schoolId !== null` : si `undefined`, un enseignant est envoyé vers `/enseignant`, contraire au commentaire. Utiliser `!= null`. |
| `space-home.ts` | 11-26 | MINOR | `role: string` non typé. |
| `school-theme.ts` | 35-52 | MINOR | `as CSSProperties` pour les variables CSS. |
| `school-theme.ts` | 20-38 | MINOR | Couleurs validées par format hexadécimal seulement ; aucun contrôle de contraste WCAG. |
| `daily-plan.ts` | tout | MINOR | Code minifié sans espaces ; `isAgeKey` redéfini alors que le type vient de `lms-data`. |
| `level-tiers.ts` | 18 | MINOR | `[...LEVEL_TIERS].reverse().find(…)` recopie le tableau à chaque appel. |

**Instruction pour Gemini :** « Gemini, ajoute `lib/roles.ts` exportant `type Role` utilisé par `local-auth.ts` et `space-home.ts`. Dans `school-theme.ts`, calcule le contraste WCAG et retombe sur le thème par défaut sous 4,5:1. Reformate `daily-plan.ts` avec Prettier. »

### `app/lms-data.ts`

| Lignes | Crit. | Problème |
|---|---|---|
| 14-60 | MAJOR | Catalogue de 34 mondes codé en dur côté client alors que Django expose `/api/curriculum/overview/` : deux sources de vérité (R1). |
| 118-174 | MINOR | `computeEarnedBadges` : règles de badges décidées côté client, donc contournables. |
| 143-145 | MAJOR | `id.endsWith("-1")` donne le badge « Premier contact » à toute leçon dont l'id finit par `-1` (`p3-1`, `a7-1`…), alors que le commentaire dit « cours 1 du module 1 ». |
| 62-68 | MINOR | `games` : tuples sans type nommé. |
| 114-116 | MINOR | `encodeURI` laisse passer `#` et `?` ; noms de fichiers accentués (`Détective_Palou.jpg`) fragiles (normalisation Unicode NFC/NFD). |

**Instruction pour Gemini :** « Gemini, dans `lms-data.ts`, corrige la règle `b_contact` pour ne tester que `p1-1`, `a1-1`, `c1-1` (supprime `|| id.endsWith("-1")`). Renomme les fichiers de `public/images/badges/` en ASCII et mets à jour `BADGE_IMAGES`. Documente ce fichier comme « données de secours » et confirme avec le backend lequel fait foi pour `computeEarnedBadges`. »

### `app/curriculum-10-12.ts`, `app/curriculum-13-15.ts`

| Lignes | Crit. | Problème |
|---|---|---|
| 5-18 | MAJOR | ≈ 40 Ko de contenu pédagogique en dur dans du TypeScript, lignes de 1 500 caractères : illisible, non relisible en revue. |
| 20-22 | MAJOR | Aucun garde sur `profiles[moduleId]` : `moduleId` inconnu ou `index` ≥ 4 donne `undefined.actions` : **TypeError à l'exécution**. |
| 20-22 | MINOR | Fonction d'une ligne de 1 100 caractères. Bonne réponse = `index % 3` : prévisible. |
| 1-3 | MINOR | `Question`, `Profile` non exportés mais dupliqués dans `types/curriculum.ts`. |

**Instruction pour Gemini :** « Gemini, déplace les profils dans `content/curriculum/10-12.json` (le dossier `content/` existe) avec import JSON typé. Dans `buildAdventureLesson`, lève une erreur explicite si `profiles[moduleId]` ou l'index sont hors bornes. Remplace `index % 3` par `shuffle` de `utils/random.ts`. Idem pour `curriculum-13-15.ts`. »

### `app/services/*`, `app/types/curriculum.ts`

| Fichier | Lignes | Crit. | Problème |
|---|---|---|---|
| tous | — | MAJOR | Jamais importés par l'application (R1) : 429 lignes mortes. |
| `curriculum-api.ts` | 4-6 | MAJOR | Cache module global (partagé entre utilisateurs si importé en SSR). |
| `curriculum-api.ts` | 34 | MINOR | `fallbackTracks as unknown as Record<…>` : double cast qui masque l'incompatibilité. |
| `curriculum-api.ts` | 17-23, 43, 69 | MINOR | `cache: "no-cache"` seulement sur l'aperçu ; pas d'`AbortController`. |
| `curriculum-api.ts` | 41-58 | MINOR | En échec, `fetchCurriculumTrack` retombe sur l'aperçu local : l'erreur d'origine est cachée. |
| `curriculum-api.ts` | 49 | MINOR | `console.warn` en production. |
| `types/curriculum.ts` | 31 | MINOR | `steps?: unknown[]` jamais utilisé. |

**Instruction pour Gemini :** « Gemini, dis-moi d'abord si ces trois fichiers doivent être branchés ou supprimés. Si branchés : adaptateur explicite à la place du double cast, pas de cache module. Sinon supprime-les ainsi que `fallbackPilotLessons`. »

### `app/design/motion-variants.ts`

| Lignes | Crit. | Problème |
|---|---|---|
| tout | MINOR | Seuls `staggerContainer` et `staggerItem` servent (dans `BadgeGrid`). Le grep a trouvé 2 fichiers pour `slideInRight` : vérifier si c'est un homonyme. |

**Instruction pour Gemini :** « Gemini, supprime de `motion-variants.ts` tous les exports non importés, sauf `staggerContainer` et `staggerItem`. »

### CSS globales (`app/*.css`, `app/design/*.css`, `dashboard/kids-shared.css`)

| Fichier | Crit. | Problème |
|---|---|---|
| `globals.css` | MAJOR | 927 lignes, 110 `!important`. |
| `home.css` (1 302 lignes), `dashboard/kids-shared.css` (2 658 lignes) | MAJOR | CSS globaux massifs chargés au-delà de leur page. |
| `readability.css` | MAJOR | 16 `!important` pour corriger la lisibilité par-dessus d'autres feuilles : conflit d'ordre. |
| `icon-cleanup.css` | MINOR | 7 `!important` et nom révélateur (rustine). |
| `pilot.css`, `pilot-label.css`, `lesson-play.css`, `unique-lesson-play.css`, `age-lock.css`, `logo.css` | MINOR | Minifiés sur une ligne : non diffables. `pilot-label.css` masque un texte (`font-size:0`) puis le remplace par `::after{content:…}` : texte invisible pour les lecteurs d'écran ou doublon. |
| `kids-theme.css:30` | MAJOR | `@keyframes popIn` global en collision avec `KidsRewardAnimation` et `LevelDetailsModal`. |
| `lesson-play.css` | MINOR | Contient `prefers-reduced-motion` : bon exemple à généraliser à `animations.css`. |

**Instruction pour Gemini :** « Gemini, formate toutes les CSS minifiées avec Prettier. Supprime les `!important` de `globals.css`, `readability.css`, `icon-cleanup.css` un par un (spécificité/ordre d'import) en vérifiant visuellement. Préfixe les keyframes par module et ajoute `@media (prefers-reduced-motion: reduce)` dans `animations.css`. Remplace la technique `font-size:0` + `::after` de `pilot-label.css` par du vrai texte dans le JSX. »

### `lib/soundManager.ts`, `app/utils/sounds.ts`, `app/utils/random.ts`

| Fichier | Lignes | Crit. | Problème |
|---|---|---|---|
| `soundManager.ts` | tout | MAJOR | Singleton jamais importé (R1), doublon fonctionnel de `utils/sounds.ts`. |
| `soundManager.ts` | 54-127 | MINOR | Quatre méthodes répètent init + `resume()` sans passer par `playTone`. |
| `sounds.ts` | 3-22 | MINOR | `audioCtx.resume().catch(() => {})` avale l'erreur. |
| `sounds.ts` | 24-42 | MAJOR | `a.currentTime = 0` coupe le son au lieu de le superposer (clics rapides). |
| `sounds.ts` | 104-127 | MINOR | `playError` est le seul son sans fichier `.wav` ni repli. |
| `sounds.ts` | — | MINOR | Aucun réglage global « sons activés/désactivés ». |
| `random.ts` | 14-27 | MINOR | Bien conçu ; la branche sans `crypto` est du code mort. |

**Instruction pour Gemini :** « Gemini, supprime `lib/soundManager.ts`. Dans `utils/sounds.ts`, ajoute `setSoundEnabled(bool)` persisté dans `localStorage` (clé `keria_sound`), clone l'élément `Audio` (`cloneNode`) pour permettre le chevauchement, ajoute le repli `.wav` pour `playError`. »

### `app/error.tsx`, `global-error.tsx`, `loading.tsx`, `not-found.tsx`, `robots.ts`, `legal-page.tsx`

| Fichier | Lignes | Crit. | Problème |
|---|---|---|---|
| `error.tsx` | 9 | MINOR | `console.error(error)` seul : aucune remontée ; `error.digest` non affiché. |
| `error.tsx`, `not-found.tsx` | tout | MINOR | Styles inline ; pas de `role="alert"`. |
| `global-error.tsx` | 4 | MINOR | Le paramètre `error` est ignoré. |
| `loading.tsx` | 1-4 | MAJOR | Le squelette du **tableau de bord** s'affiche pour toute route de premier niveau sans `loading.tsx` propre (vitrine et pages légales incluses). |
| `robots.ts` | 6 | MAJOR | `disallow` ne contient que `/dashboard`, `/api/`, `/connexion`. `/admin`, `/ecole`, `/enseignant`, `/parent`, `/profile` restent explorables. Aucun `sitemap`. |
| `legal-page.tsx` | 11-17, 24 | MINOR | `LEGAL_UPDATED` codé en dur. |
| `legal-page.tsx` | 31 | MINOR | `<img>` du logo sans dimensions. |

**Instruction pour Gemini :** « Gemini, dans `robots.ts`, ajoute `/admin`, `/ecole`, `/enseignant`, `/parent`, `/profile`, `/school` aux `disallow` et un `sitemap`. Déplace `loading.tsx` dans `app/dashboard/` et crée un `loading.tsx` léger à la racine. `error.tsx` : `role="alert"` et `error.digest`. `global-error.tsx` : journaliser l'erreur. »

### Ordre de correction du module 2
1. Bug / plantage : `lms-data.ts:143-145` (badge accordé trop tôt) ; `curriculum-10-12/13-15.ts` (`undefined`) ; `HomeClient.tsx:303-307` (mauvaises images).
2. Sécurité / exposition : `robots.ts`, `admin-auth.ts`, `safeReturnTo`.
3. Performance : `HomeClient` en Server Component, `force-dynamic`, polices via `next/font`, PNG lourds.
4. Code mort : `soundManager.ts`, `services/*`, `types/curriculum.ts`, exports inutiles de `motion-variants.ts`.
5. CSS : `!important`, keyframes en collision, fichiers minifiés.
## MODULE 3 : `frontend/app/dashboard/`, passe 1 : cœur du tableau de bord

Fichiers : `DashboardClient.tsx`, `[[...slug]]/page.tsx`, `layout.tsx`, `loading.tsx`, `dashboardShared.tsx`, `TutorialOverlay.tsx`, `LessonPlayActivity.tsx`, `MyDataCard.tsx`, `push-client.ts`, `useStoredNumber.ts`, `AdvancedGames.tsx`, `World1/2/3Background.tsx`.

### `DashboardClient.tsx` (1 442 lignes)

| Lignes | Crit. | Problème |
|---|---|---|
| 1055-1056, 1071-1072 | CRITICAL | `localStorage.getItem(...)` appelé **dans le rendu** de l'onglet `badges`, composant rendu aussi côté serveur : charger directement `/dashboard/badges` peut lever `ReferenceError: localStorage is not defined` (dépend de la version de Node, à vérifier). `computeEarnedBadges` + 2 lectures `localStorage` sont refaits 12 fois dans le `skillBadges.map` puis une fois dans le compteur. |
| 891-897 | CRITICAL | `<BadgeUnlockAnimation badge={{ … }}>` reçoit un objet littéral recréé à chaque rendu : l'animation dépend de `[badge]`, donc **les confettis redémarrent à chaque rendu du dashboard**. |
| 46 | CRITICAL | `DashboardView` : composant de ≈ 1 380 lignes, plus de 40 `useState`, 20 `useEffect`, 5 `useMemo`, 0 `useCallback`. Cumule routage par onglet, progression, badges, animations, daily usage, charte, chat Palou, mode visiteur, 3 modales plein écran de jeu, tutoriel. |
| 252-318 | MAJOR | Effet de file d'animations : lit `animationQueue` et `track` (déclaré ligne 429, après l'effet : `no-use-before-define`) sans les lister en dépendances ; lit `localStorage` à chaque changement d'XP ; risque de doublons dans la file. |
| 138-143, 106-109, 467-523, 525 | MAJOR | 5 `fetch` dans des effets sans `AbortController`. `setProgressLoaded(true)` est appelé même quand le fetch échoue : l'enfant démarre avec une progression à zéro et peut écraser sa progression au prochain enregistrement (à confirmer côté API). |
| 527 | MAJOR | `setInterval` d'une minute qui appelle `recordDaily("minute")` : fermeture périmée, pas de nettoyage au changement d'`age`. Le temps d'écran est comptabilisé côté client (onglet en arrière-plan, requête bloquée) : contournable. Le serveur doit être l'autorité. |
| 526 | MAJOR | `recordDaily` : `await response.json()` sans `.catch()` ni `try/catch` : rejet non rattrapé pendant `completeLesson`. |
| 432-434 | MAJOR | `timeLimitReached = false` et `lessonLimitReached = false` sont des constantes figées qui pilotent 6 branches de rendu (569, 986, 1043, 1148…) : code mort ; la limite quotidienne n'est jamais appliquée aux leçons. |
| 63-67, 698-725 | MAJOR | `if (role === "enseignant") window.location.assign("/enseignant")` + écran « Redirection… » : code mort, `[[...slug]]/page.tsx:18` redirige déjà côté serveur. |
| 767-782 | MAJOR | Mode visiteur « lecture seule » obtenu par **CSS** (`pointer-events:none !important`) et `if (visitorChildId) return` : contournable depuis la console. Le serveur doit refuser les écritures pour un `child_id` sans lien parent. |
| 59-60, 1438-1440 | MAJOR | `visitorChildId` stocké dans `sessionStorage` modifiable : si `/api/progress?child_id=` ne revérifie pas le lien parent-enfant, lecture inter-comptes (IDOR). **À vérifier côté backend en priorité.** |
| 768-837 | MAJOR | Deux `<style dangerouslySetInnerHTML>` conditionnels. Le second contient un `@import url('https://fonts.googleapis.com/…')` (requête externe bloquante à chaque montage) et `.kids-theme * { font-family: 'Fredoka One' !important }` (y compris les champs de saisie). |
| 1179-1227 | MAJOR | Modale « coffre » : manipulation du DOM à la main (`createElement`, `appendChild`, `removeChild`, deux `setTimeout` sans nettoyage). Démonté avant 1 500 ms : `removeChild` lève et le XP n'est jamais crédité. Aucun `role="dialog"`, pas d'Échap. |
| 1228-1413 | MAJOR | Écran de jeu plein écran (185 lignes) en JSX inline. À extraire en `GameLevelPlayer`. |
| 1285 | MAJOR | Image de fond choisie par 8 ternaires sur `playingLevel.id` dans un `style` (900 caractères). Données qui devraient être dans `games-map-data.ts`. |
| 1287, 1324 | MAJOR | `playingLevel?.id.split("-")[2].replace(/^0+/, "")` plante si l'identifiant n'a pas 3 segments. |
| 1299-1301 | MINOR | `new SpeechSynthesisUtterance` sans test de support ni `cancel()`. Le commentaire ligne 694 dit « pas de voix IA » mais la synthèse vocale reste appelée. |
| 1415 | MAJOR | Chat Palou : pas d'`aria-live`/`role="log"`, `key={i}`, pas de défilement vers le bas, pas de `<label>`, bouton fermer `×` sans `aria-label`, pas un `dialog`. |
| 1146 | MAJOR | Modale de module : `role="presentation"` sur le fond et sur des `div`, bouton `×` sans `aria-label`, pas de focus trap ni Échap (idem lignes 1180 et 1232). |
| 1043 | MAJOR | Carte de module : une ligne de JSX de 1 400 caractères avec une IIFE dans le `map` ; `w.lessons.filter(...)` recalculé à chaque rendu. Extraire `ModuleCard` (memo). |
| 1043, 1105 | MAJOR | `<img src="/images/modules/${w.id}.png">` (≈ 190-230 Ko × 12) et `/images/badges/badge-N.png` : pas de `next/image`, pas de `loading="lazy"`. |
| 1049, 1094 | MINOR | `fontFamily: "'Fredoka One'…"` en style inline répété ; police non chargée par `layout.tsx`. |
| 1111 | MINOR | `downloadPersonalizedBadge` sans gestion d'erreur (`decode()` rejeté). |
| 1089, 693-696 | MINOR | `onBadgeClick` appelle `playBadgeAudio`, fonction vide (`return;`). Code mort. |
| 244, 272, 321 | MAJOR | 3 `any` : `rarity as any`, `badgeDef as any`, `(e: any)` pour l'événement `levelProgress`. |
| 689 | MINOR | `const getLevel = getLevelTier;` alias inutile. |
| 123-124, 402-425 | MAJOR | `palouEvent`, `isWalking` (et `isThinking`, ligne 427) alimentent `PalouGuide`, qui n'est plus monté : 3 états et 3 effets (salutation à 800 ms, saut au gain d'XP, marche de 1 200 ms) sans effet visible. ESLint les signale « assigned but never used ». Idem `recordError`, `signOutUrl`, `GamesView`, `DailyTip79`, `DailyChallengeCard` importés mais inutilisés. |
| 34 (ESLint) | MAJOR | **43 avertissements `no-unused-vars` dans ce seul fichier** (33 icônes `lucide-react`, 3 composants, 4 états) : la ligne d'import des icônes est en grande partie morte. |
| 436 | MAJOR | `startsWith(age === "10-12" ? "a" : age === "7-9" ? "p" : "c")` : couplage fragile avec le préfixe des ids. |
| 574 | MAJOR | `id.endsWith("-1") && isFirstLessonEver` : même défaut que `lms-data.ts`. |
| 656 | CRITICAL | `completeGameLevel` envoie `age: "7-9"` et `score: 100` **en dur** : un élève de 10-12 qui joue est enregistré comme 7-9 ; le score réel n'est pas envoyé. |
| 622, 659 | — | Bon point : XP écrasée par le serveur, progression annulée en cas d'échec. À généraliser (`awardActivity` n'annule rien). |
| 626 | MINOR | Deux `await recordDaily` en série : `Promise.all`. |
| 93-95 | MINOR | `ageLocked` appliqué côté client seulement. |
| 753 | MINOR | `as React.CSSProperties` : doublon avec `schoolThemeVars`. |
| 34 | MINOR | Import `lucide-react` de 47 icônes dont plusieurs inutilisées (à vérifier par ESLint). |
| 1445 | MINOR | `key` qui change en mode visiteur : remonte tout l'arbre, états perdus. |
| 1436-1440 | MINOR | `useEffect` + `setState` pour lire `sessionStorage` : `useSyncExternalStore` (`useClientValue`) conviendrait. |

**Instructions pour Gemini :**
1. « Gemini, dans `DashboardClient.tsx`, extrais un hook `useBadgeProgress(progress, userScope)` qui lit `localStorage` dans un `useEffect`/`useSyncExternalStore` (via `useClientValue`) et renvoie `earnedIds: Set<string>` calculé une fois avec `useMemo`. Supprime les lectures `localStorage` des lignes 1055-1072. »
2. « Stabilise l'objet `badge` : `useMemo` sur `animationQueue[0]` ; `onClose` en `useCallback`. »
3. « Découpe `DashboardView` en `useDashboardProgress`, `useDailyUsage`, `useVisitorMode`, et composants `GameLevelPlayer`, `TreasureChestModal`, `ModuleCard`, `ModuleDetailModal`, `PalouChatPanel`, `StudentShell`. Aucun fichier de plus de 300 lignes. »
4. « Supprime les constantes mortes `timeLimitReached`, `lessonLimitReached`, `playBadgeAudio`, les lignes 63-67 et 698-725. »
5. « Remplace la manipulation DOM de la modale coffre par un état `flyingXp` rendu en JSX et animé en CSS, nettoyage dans `useEffect`. »
6. « `AbortController` partout, état `progressError` (ne pas marquer `progressLoaded` en cas d'échec), remplace les 3 `any`, dans `completeGameLevel` envoie l'`age` courant et le score réel. »
7. « Retire le `@import` Google Fonts et le sélecteur `.kids-theme *` : `next/font` + `kids-shared.css`. »

> **À faire valider côté backend :** `/api/progress`, `/api/charter`, `/api/progress/record-activity` refusent un `child_id` non relié au parent connecté.

### `app/dashboard/[[...slug]]/page.tsx`

| Lignes | Crit. | Problème |
|---|---|---|
| 5, 37 | MAJOR | `activeTab={tab as …}` : cast non validé. Une URL `/dashboard/nimportequoi` rend un dashboard vide (pas de 404). |
| 9-10 | MINOR | `slug.length > 1` accepté (`/dashboard/badges/xyz`). |
| 19 | MAJOR | `isAdmin` déduit de l'e-mail (voir `admin-auth.ts`) : un admin voit **toutes les leçons complétées** (`DashboardClient:103`). |
| 22-23 | MINOR | Âge absent → 7-9 silencieusement. |
| 30-36 | MINOR | `fetch` Django sans délai : un backend lent bloque le rendu. |
| 37 | MINOR | Une ligne de 500 caractères de props non typées. |
| 7 | MINOR | `force-dynamic` redondant avec `layout.tsx:5`. |

**Instruction pour Gemini :** « Gemini, dans `[[...slug]]/page.tsx`, définis `const TABS = [...] as const`, valide `slug[0]` et appelle `notFound()` si inconnu ou si `slug.length > 1`. Ajoute `signal: AbortSignal.timeout(3000)` au fetch de l'école. `isAdmin` = `user.role === "admin"` uniquement. »

### `layout.tsx`, `loading.tsx` (dashboard)

| Fichier | Lignes | Crit. | Problème |
|---|---|---|---|
| `layout.tsx` | 8 | MAJOR | `getLocalUser()` appelé ici et dans `page.tsx` : deux appels Django par navigation. |
| `layout.tsx` | 5 | MINOR | `dynamic` en doublon. |
| `loading.tsx` | — | MINOR | Identique à `app/loading.tsx` (doublon). |

### `dashboardShared.tsx` (274 lignes, fourre-tout)

| Lignes | Crit. | Problème |
|---|---|---|
| tout | MAJOR | 7 responsabilités : types, sons Web Audio, confettis CSS, `GameShell`, export canvas du badge, API de progression, contenu pédagogique, registre d'événements. |
| 16-51 | MAJOR | `playQuizSound`/`playCelebrationSound` créent un `AudioContext` à chaque appel (limite navigateur) ; doublon de `utils/sounds.ts`. |
| 53-56 | MINOR | `CelebrationSound` rend `null` pour jouer un son au montage. |
| 63-71, 93 | MINOR | 100 `div` animés pour les confettis ; règle `prefers-reduced-motion` par sélecteur `[style*="kiFall"]` fragile. |
| 98-115 | MAJOR | `GameShell` défini **ici et dans `GameShell.tsx`**. |
| 123-138 | MAJOR | `downloadPersonalizedBadge` : coordonnées en dur (1200×1400), `Promise.all([decode()])` sans `try/catch`, police `Arial` en dur. |
| 169-171 | MINOR | `postProgress` inutilisé. |
| 176-187 | MAJOR | `gameChallenges` : contenu pédagogique en dur ; faute « Une image ou **una** voix » (ligne 181). |
| 189-232 | MAJOR | `lessonExtras`/`learningCopy` : 9 `if` en cascade qui choisissent le contenu par **regex sur le titre** de la leçon : un titre contenant « image » bascule sur le mauvais bloc. Remplacer par un champ `topic`. |
| 199-207 | MINOR | Prénom « Ndeye » présent alors que `HomeClient.tsx:27` précise « sans Ndeye » (aussi dans `LessonPlayActivity.tsx:17`, `DashboardActivities.tsx`). À trancher. |
| 235-274 | MAJOR | `seenEventsCache` : `Set` module global jamais vidé ; au changement de compte dans le même onglet, les événements du compte précédent restent « vus » (scope absent de la clé). |
| 241-249 | MAJOR | `hasSeenEvent` retourne `true` côté serveur : appelé dans le rendu (`DashboardClient:262`) → SSR différent du client, risque d'avertissement d'hydratation. |
| 251-274 | MINOR | `markEventSeen` parse + stringify tout le store à chaque appel. |

**Instruction pour Gemini :** « Gemini, éclate `dashboardShared.tsx` en `types.ts`, `progress-api.ts`, `seen-events.ts`, `badge-download.ts`, `celebration.tsx`, `content/lesson-extras.ts`. Supprime le `GameShell` en doublon et `postProgress`. Remplace les deux sons par ceux de `utils/sounds.ts`. Indexe `seenEventsCache` par scope. Remplace la sélection par regex par un champ `topic` dans `lms-data.ts`. Corrige « una voix ». Décide pour « Ndeye ». »

### `TutorialOverlay.tsx`

| Lignes | Crit. | Problème |
|---|---|---|
| 25 | MAJOR | `localStorage.getItem` sans `try/catch`. |
| 22-31 | MAJOR | `markEventSeen("games_tutorial")` dès l'apparition : si l'enfant ferme l'onglet avant la fin, il ne reverra jamais le guide (choix produit à confirmer). |
| 84-85 | MAJOR | `setInterval(updateSpot, 50)` pendant 1 s + `scroll` en capture sans throttle ; le `setTimeout(…, 1000)` n'est pas nettoyé. |
| 49-61 | MAJOR | Ids cibles `gm-node-jeux7-9-XX` en dur ; `parseInt(currentLevel.id.split("-")[2])` plante si autre format. |
| 96-99 | MAJOR | `steps` recréé à chaque rendu. |
| 175 | MAJOR | Aucun `role="dialog"`, `aria-modal`, focus, ni Échap. Fond radial recalculé à chaque mise à jour du spot. |
| 179 | MINOR | `<img>` sans dimensions ; animation sans `prefers-reduced-motion`. |
| 107 | MINOR | « 700px de padding à gauche » en dur. |

### `LessonPlayActivity.tsx`, `AdvancedGames.tsx`

| Fichier | Lignes | Crit. | Problème |
|---|---|---|---|
| `LessonPlayActivity.tsx` | tout | MAJOR | Illisible : 21 lignes de 600 à 1 300 caractères. Aucun import ailleurs : code mort. |
| idem | 7 | MINOR | `seedOf` : somme pondérée des codes, collisions fréquentes. |
| idem | 8 | MAJOR | Un `AudioContext` par son. |
| idem | 12 | MINOR | `useMemo` aux dépendances incomplètes ; `key={option}` en doublon possible. |
| `AdvancedGames.tsx` | tout | MINOR | « Proxy de rétrocompatibilité » qui réexporte `./games`. |

**Instruction pour Gemini :** « Gemini, supprime `LessonPlayActivity.tsx` (aucun import) après vérification par grep. Supprime `AdvancedGames.tsx` et importe depuis `./games` dans `DashboardClient.tsx` et `DashboardActivities.tsx`. »

### `World1Background.tsx`, `World2Background.tsx`, `World3Background.tsx`

| Lignes | Crit. | Problème |
|---|---|---|
| 5-14 | MINOR | Trois fichiers identiques (16 lignes) qui ne diffèrent que par l'URL du fond ; un seul composant `WorldBackground({ src })`. Image de fond CSS non optimisée, sans `aria-hidden`. |

### `MyDataCard.tsx`

| Lignes | Crit. | Problème |
|---|---|---|
| 13-35 | MAJOR | Suppression de compte irréversible : un seul champ mot de passe, aucune confirmation par saisie (« SUPPRIMER »), pas d'`aria-live`. |
| 69-77 | MAJOR | `<input type="password">` sans `<label>` (placeholder seul). |
| 45-51 | MINOR | `<a href="/api/account/export" download>` : pas de gestion d'erreur 401/500. |
| 38-88 | MINOR | 13 objets de style inline. |
| 29 | MINOR | `window.location.href = "/connexion"` sans purge locale : appeler `signOut()`. |

### `push-client.ts`

| Lignes | Crit. | Problème |
|---|---|---|
| 15-36 | MAJOR | `enablePush` : pas de `try/catch` autour de `fetch`, `Notification.requestPermission`, `serviceWorker.register` (exceptions non rattrapées alors que la fonction promet un message lisible). |
| 23 | MINOR | `/sw.js` en dur ; `register` sans `scope`. |
| 5-9 | MINOR | `atob` peut lever sur une clé invalide. |

### `useStoredNumber.ts`

| Lignes | Crit. | Problème |
|---|---|---|
| 1-33 | MINOR | **Bon pattern** (`useSyncExternalStore`). Défaut : l'événement `storage` ne se déclenche pas dans l'onglet qui écrit, la valeur ne se met pas à jour après un `setItem` local. `useStoredNumber` et `useClientValue` n'ont **aucun importateur** (code mort), alors qu'ils résoudraient `DashboardClient:1055`. |

**Instruction pour Gemini :** « Gemini, adopte `useClientValue` dans `DashboardClient.tsx` pour toutes les lectures de `localStorage` faites pendant le rendu, et fais émettre un événement personnalisé `keria-storage` à chaque écriture. »

### Ordre de correction de la passe 1
1. Backend : autorisation de `child_id` (mode visiteur) ; validité de l'âge envoyé à `/api/progress`.
2. Bugs visibles : objet `badge` instable, `localStorage` en SSR sur `/dashboard/badges`, `age:"7-9"` figé, « una voix », validation de l'onglet (`notFound()`).
3. Fiabilité : `AbortController`, `progressLoaded` posé en cas d'échec, modale coffre manipulée à la main.
4. Découpage : `DashboardView`, `dashboardShared.tsx`.
5. Nettoyage : constantes mortes, `LessonPlayActivity`, `AdvancedGames`, `World*Background`, `useStoredNumber`.
## MODULE 4 : `frontend/app/dashboard/`, passe 2 : vues élève

Fichiers : `GamesMapView.tsx` (801), `JeuxDefisDashboardView.tsx` (258), `GameShell.tsx` (224), `DictionaryView.tsx` (596), `WeeklyLeaderboardView.tsx` (271), `LeaderboardPodium.tsx` (135), `DailyChallengeCard.tsx` (194), `StudentAssignmentsView.tsx` (587), `games-map-data.ts` (232, début seulement).

> Bons modèles à imiter : `DailyChallengeCard.tsx` (bonne réponse jamais dans le navigateur, fetch annulable, `role="alert"`) et `StudentAssignmentsView.tsx` (note calculée par le serveur).
> Lecture partielle : `StudentAssignmentsView.tsx` lignes 330-587 (lecteur de quiz) seulement balayées par grep ; `games-map-data.ts` après la ligne 120 non lue.

### `GamesMapView.tsx` (801 lignes)

| Lignes | Crit. | Problème |
|---|---|---|
| 199-801 | CRITICAL | Composant monolithique : 10 `useState`, 7 `useEffect`, 147 `style={{…}}`, 600 lignes de JSX (hero, progression, carte, modale de niveau, modale de félicitations, modale de monde). |
| 217, 337-338 | CRITICAL | `localStorage.removeItem("keuria_dev_unlock_all")` et `setItem("lastAvatarId", …)` sans `try/catch` ; le second dans un effet exécuté à chaque changement de `targetAvatarLevel`/`displayedAvatarLevel`. |
| 215-219 | MAJOR | Nettoyage d'un drapeau de développement `keuria_dev_unlock_all` en production : un contournement de déblocage a existé. |
| 325-334 | MAJOR | L'initialiseur de `useState` lit `localStorage` : valeur différente serveur/client → avertissement d'hydratation (masqué par `suppressHydrationWarning` ligne 564). |
| 337-356 | MAJOR | Dans l'effet de l'avatar, `id1` et `id2` (`setTimeout` des lignes 344-349) ne sont jamais annulés (seul `t` l'est). La dépendance `displayedAvatarLevel` relance l'effet à chaque pas. |
| 232-250 | MAJOR | Détection de complétion d'un monde : dépendances incomplètes (lit `effectiveCompleted`) ; risque de double célébration ; `prevCompletedLength` en état au lieu d'une ref. |
| 221 | MINOR | `const effectiveCompleted = completed;` alias inutile. |
| 263-264 | MINOR | Commentaire tronqué suivi d'un état sans rapport. |
| 266-287 | MAJOR | `chaseNode` redéfini à chaque rendu et lancé deux fois ; parcourt le DOM (`getComputedStyle` sur toute la chaîne de parents) puis boucle en rAF 1,4 s. Son nettoyage n'est **pas retourné** par les deux appelants (377, 433). |
| 304-308, 228, 303 | MINOR | `reduce`/`filter` recalculés à chaque rendu sans `useMemo`. |
| 305-306 | MAJOR | `if (displayCompleted.includes(l.id)) return sum + 3;` : un niveau terminé sans étoiles enregistrées compte 3 étoiles : le compteur « ÉTOILES » peut afficher plus que la réalité. |
| 396-411 | MAJOR | `handlePrimary` : `setSaving(true)` puis `await onComplete(...)` sans `try/catch` ; si l'appel échoue `saving` reste à `true`. `saving` n'est jamais lu (état mort). |
| 12-23 | MINOR | `LEVEL_BACKGROUNDS` : 10 entrées à générer par boucle. |
| 44-47 | MINOR | `import` au milieu du fichier (`import/first`). |
| 50-58 | MINOR | `WorldBackground` : 3 branches vers 3 fichiers quasi identiques. |
| 62-174 | MAJOR | `LevelNode` : 112 lignes, 3 variantes de bouton quasi dupliquées, chaîne de ternaires `state === "done" ? … : …` répétée 14 fois ; non mémoïsé. |
| 89-94, 115-120, 138-143 | MAJOR | Niveau verrouillé : bouton actif sans `disabled`/`aria-disabled`. |
| 71 | MINOR | `id="gm-node-…"` global en dur (couplage avec `TutorialOverlay`). |
| 204-213 | — | Bon point : Échap géré. Mais les modales (595-723, 725, 770) n'ont pas `role="dialog"`, `aria-modal`, `aria-labelledby`, focus initial ni piège de focus ; fond cliquable en `div onClick`. |
| 725-764 | MAJOR | Empilement : modale félicitations `zIndex 90`, modale monde `9999`, `TutorialOverlay` et `LevelDetailsModal` à 999999. |
| 535, 566, 449, 608, 737, 772 | MAJOR | `<img>` bruts sans dimensions : `/palou/Joie.png` (190 px), 4 illustrations Palou de 1 à 2,6 Mo. `/palou/` (ligne 449) ≠ `/images/palou/` : doublon d'assets. |
| 730-735 | MINOR | `<svg>` sans `aria-hidden`/`focusable="false"`. |
| 569-589 | MINOR | `<linearGradient id="cloudGrad">` id global. |
| 356-361 | MAJOR | Position de l'avatar calculée avec des constantes magiques (`SCALE = 1000/720`, `550 * SCALE`, `160 + 40`) à synchroniser à la main avec les hauteurs CSS (534, 542). |
| 192-197 | MINOR | `getModuleProgress` lit `tracks["7-9"]` en dur ; appelé pour chaque nœud à chaque rendu (10×). |
| 176-197 | MINOR | Props `age`, `ageLocked`, `setAge` jamais utilisées. |
| 5 | MINOR | Import `Gamepad2` inutilisé. |
| 444 | MINOR | ~12 boutons sans `type="button"`. |
| — | MINOR | 9 keyframes/classes globales (`kiFloat`, `kiRing`, `kiPulse`, `kiPop`, `gmPop`, `kiFloatSlow`, `kiDash`, `kiTwinkle`, `.gm-title`) définies dans `kids-shared.css` ; aucune ne respecte `prefers-reduced-motion`. |

**Instructions pour Gemini :**
1. « Gemini, dans `GamesMapView.tsx`, extrais `LevelNode.tsx` (memo), `LevelDetailModal.tsx`, `RewardModal.tsx`, `WorldCompleteModal.tsx`, `MapHero.tsx`, `ProgressSummary.tsx` et un hook `useAvatarPosition(targetLevel)` (lignes 323-381). Fichier principal < 200 lignes. »
2. « Entoure tous les accès `localStorage` d'un `try/catch` ou utilise `useClientValue`. Initialise `displayedAvatarLevel` avec `targetAvatarLevel` et lis `lastAvatarId` dans un effet. Retourne le nettoyage de `chaseNode`. Mémorise `id1`/`id2` pour les annuler. Supprime `saving`, `effectiveCompleted`, `age/ageLocked/setAge`. »
3. « Corrige le décompte d'étoiles : `lessonStars[l.id] ?? 0` uniquement. `try/catch/finally` dans `handlePrimary`. »
4. « `role="dialog" aria-modal="true" aria-labelledby` aux trois modales via un composant `Modal` commun avec focus trap. `aria-disabled` aux niveaux verrouillés. »
5. « `next/image` (WebP redimensionnés) et unification de `/palou/` et `/images/palou/`. »

### `JeuxDefisDashboardView.tsx`

| Lignes | Crit. | Problème |
|---|---|---|
| 26 | MAJOR | `openLevel: (level: any) => void` : un des `any` du dossier. Le type `GameLevel` existe. |
| 193-203 | CRITICAL | L'objet passé à `openLevel` est un `GameLevel` **partiel** (manque `world`, `x`, `y`, `tag`, `meta`) : champs `undefined` lus par `DashboardClient`. |
| 195 | MAJOR | `kind: wi % 2 === 0 ? "quiz" : "defi"` : alternance arbitraire ; les modules pairs ouvrent un `DefiGame` sans contenu lié au module. Contredit le texte ligne 86 « intrinsèquement lié à son module ». |
| 199 | MAJOR | `quizIndex: Math.min(wi, 9)` : seulement 10 quiz pour 12 modules (11 et 12 rejouent le n° 10), partagés entre les trois âges. |
| `DashboardClient` 1287, 1324 | CRITICAL | Pour ces défis, l'`id` est `defi-10-12-a1` : `id.split("-")[2]` donne `"12"` (l'âge), l'en-tête affiche **« Niveau 12 : Défi Module 1… » pour tous les modules**. |
| `DashboardClient` 656 | CRITICAL | `completeGameLevel` poste `age: "7-9"` en dur : les défis 10-12/13-15 sont enregistrés comme 7-9 avec un `lessonId` `defi-<age>-<module>` que le serveur doit connaître. **À vérifier backend** : sinon l'XP de +50 n'est jamais accordée. |
| 3, 5, 12-15, 22, 30-34 | MINOR | Imports et props inutilisés : `React`, `useState`, `ArrowRight`, `Gamepad2`, props `track`, `tracks`, `lessonStars`, `dailyUsage`, `dailyPlan`, `limitsApply`, `recordDaily`, `awardActivity`. Interface `Track` avec `[key: string]: unknown` (contournement). `tracks` importé et masqué par la prop. |
| 119-254 | MAJOR | Carte de défi : 130 lignes de JSX dans le `map`, 28 `style={{}}`, couleurs en dur, aucune mémoïsation. |
| 191-226 | MINOR | Boutons sans `type="button"`. |
| 142 | MINOR | `opacity: 0.85` sur les cartes verrouillées : contraste `#64748B` sur `#F1F5F9` ≈ 4,3:1 (limite AA). |
| 113 | MINOR | `<img>` sans dimensions. |

**Instruction pour Gemini :** « Gemini, dans `JeuxDefisDashboardView.tsx`, remplace `any` par `GameLevel`, ajoute `buildModuleChallenge(world, wi, age): GameLevel` dans `games-map-data.ts` renvoyant tous les champs requis, avec un champ séparé `displayNumber`. Supprime props et imports inutilisés. Extrais `ModuleChallengeCard` (memo). Dans `DashboardClient`, passe l'`age` courant à `completeGameLevel` et utilise `level.displayNumber` pour l'en-tête. **Vérifie côté backend** que `defi-<age>-<module>` est reconnu et crédité. »

### `GameShell.tsx`

| Lignes | Crit. | Problème |
|---|---|---|
| 37 | MAJOR | `useState<any[]>` pour les particules. |
| 39-52 | MAJOR | `setParticles` dans un effet à partir de `window.innerWidth` : rendu supplémentaire, positions figées (pas de `resize`). |
| 69-87 | MINOR | `randomFloat()` appelé **dans le rendu** : valeur différente à chaque rendu, les particules « sautent ». |
| 98 | MAJOR | Bouton `×` sans `aria-label` ni `type`. |
| 110-126 | MINOR | `SpeechSynthesisUtterance` sans test de support. |
| 145-161 | MAJOR | Bouton « Continuer » : effet d'appui par `onMouseDown/Up/Leave` en JS (ni tactile ni clavier). |
| 170-221 | MAJOR | Modale de sortie sans `role="dialog"`, focus, Échap. |
| 3 | MINOR | `import "./kids-shared.css"` (2 658 lignes) dans un composant. |
| doublon | MAJOR | `dashboardShared.tsx` exporte aussi un `GameShell` (signature différente). |
| 57 | MINOR | Pas de `"use client"` (hooks). |

### `DictionaryView.tsx`

| Lignes | Crit. | Problème |
|---|---|---|
| 11-29 | MAJOR | `playPop` redéfini ici (3e implémentation du même son : `dashboardShared`, `sounds.ts`, ici) ; `AudioContext` à chaque clic. |
| 4, 81-86 | MINOR | `canvas-confetti` statique pour 40 particules. |
| 38-42 | MINOR | Choix de voix par `v.name.toLowerCase().includes("fem")` : peu fiable ; `getVoices()` souvent vide au premier appel. |
| 95-98, 105-107 | MAJOR | `setTimeout` (400 ms, 5 s) non annulés. |
| 111-118 | MINOR | Mot du jour et filtre recalculés à chaque frappe (pas de `useMemo`) ; pas de normalisation des accents dans la recherche. |
| 129-135 | MAJOR | `<input>` de recherche sans `<label>`/`aria-label` ; icône sans `aria-hidden`. |
| 185-198 | CRITICAL | Cartes : `<div className="dict-card-front" onClick>` **non focalisables, non activables au clavier** (ni `role="button"` ni `tabIndex`) : impossible d'ouvrir une définition sans souris. |
| 202-238 | MAJOR | Modale sans `role="dialog"`, `aria-modal`, Échap, focus. |
| 149, 193, 210 | MINOR | Emojis (`icon`) du backend lus par les lecteurs d'écran (autorisé : contenu enfant). |
| 240-593 | MAJOR | 350 lignes de CSS dans un `<style dangerouslySetInnerHTML>` injecté à chaque rendu ; keyframes `fadeOut`, `modalFlipIn`, `dictBounce` en collision ; aucune règle `prefers-reduced-motion` (rotation 3D `rotateY(-180deg)`). |
| 226 | MINOR | `<img>` sans dimensions. |

**Instruction pour Gemini :** « Gemini, dans `DictionaryView.tsx`, transforme les cartes en `<button type="button" className="dict-card-front">`. `aria-label` sur l'input de recherche. Déplace les 350 lignes de CSS dans `DictionaryView.module.css` avec `@media (prefers-reduced-motion: reduce)` qui supprime `modalFlipIn`. Remplace `playPop` locale par celle de `utils/sounds`. Timers dans une ref nettoyée. `import()` dynamique de `canvas-confetti`. `role="dialog" aria-modal="true" aria-labelledby` + Échap pour la modale. »

### `WeeklyLeaderboardView.tsx`

| Lignes | Crit. | Problème |
|---|---|---|
| 48-100 | MAJOR | 50 lignes de CSS injectées via `<style>{STYLES}</style>` à chaque rendu ; classes globales génériques (`.lb`, `.lb-row`, `.lb-name`…). |
| 145-162 | MINOR | Annulation par `cancelled` mais pas d'`AbortController` ; `loading` repasse à `true` à chaque changement de période (le contenu disparaît). |
| 168-172 | MINOR | `query.toLowerCase().trim()` recalculé par entrée. |
| 195-198 | MAJOR | `disabled` sur « Proche de moi » sans explication accessible. |
| 235-248 | MINOR | `key` contenant l'index : instable ; `position` serait unique. |
| 237-238 | MINOR | `style={{ width: 42, … }}` surcharge inline de `.lb-avatar` (56 px) : créer une variante. |
| 244 | MINOR | `entry.badge.emoji` du serveur. |
| 256 | MINOR | `"MOI"` en dur au lieu des initiales. |
| 127 | — | Bon : `role="progressbar"` avec `aria-label`. |
| 215-217 | MINOR | `view === "near"` testé sur l'état local alors que le reste utilise `effectiveView`. |
| a11y | MINOR | `.lb-list` n'est pas une liste (`div`/`div`), pas d'`aria-live` pour les changements de période/vue. |

### `LeaderboardPodium.tsx`

| Lignes | Crit. | Problème |
|---|---|---|
| 19-66 | MAJOR | 47 lignes de CSS exportées (`PODIUM_STYLES`) et réinjectées à chaque instance (ligne 104). Bon : `prefers-reduced-motion` géré. |
| 72 | MAJOR | `<linearGradient id="pdm-crown">` id fixe. |
| 112 | MINOR | `aria-label` redondant sur `role="listitem"`. |
| 121 | MINOR | Nom tronqué par `ellipsis` sans `title`. |
| 1 | MINOR | `"use client"` inutile. |

### `DailyChallengeCard.tsx`

| Lignes | Crit. | Problème |
|---|---|---|
| tout | — | **Bon fichier** (réponse validée par le serveur, `cancelled`, `role="alert"`, reprise après rechargement). |
| 41 | MAJOR | `if (!challenge) return null` : **aucun état de chargement ni d'erreur** ; `.catch(() => {})` : la carte disparaît sans explication. |
| 133-170 | MAJOR | Boutons de réponse sans `aria-pressed`, sans `role="radiogroup"`/`aria-labelledby` ; résultat communiqué par couleur + icône. |
| 176 | MINOR | `animation: 'palouPopIn…'` keyframe définie ailleurs (collision connue avec `PalouGuide`). |
| 175-189 | MINOR | Messages de résultat sans `role="status"`/`aria-live`. |
| 82-92, 107-110 | MINOR | 24 styles inline ; `<img>` sans `loading`. |
| 123-130 | MINOR | Couleurs via variables `let` mutées dans `map`. |

### `StudentAssignmentsView.tsx` (587 lignes)

| Lignes | Crit. | Problème |
|---|---|---|
| 53-587 | MAJOR | Composant de 530 lignes : liste, entête et lecteur de quiz plein écran (75 `style={{}}`). |
| 67-69 | MINOR | `useEffect(() => { loadAssignments() }, [])` : fonction non mémoïsée (`exhaustive-deps`), pas de nettoyage. |
| 41-51, 97-101 | MINOR | Deux styles d'appel réseau dans le même fichier. |
| 138-156 | MAJOR | Après `submitMission`, `await loadAssignments()` remet `loading=true` : toute la vue est remplacée par « Chargement… » (flash). |
| 134 | MINOR | `canvas-confetti` statique. |
| 314 | MINOR | `new Date(a.dueDate).toLocaleDateString("fr-FR")` peut décaler d'un jour (date sans heure en UTC). |
| 330-340 | MAJOR | Statut « En retard ! » signalé par couleur + texte du badge. |
| ≈ 370-400 (grep) | CRITICAL | Lecteur de mission en `position: fixed; zIndex: 9999` sans `role="dialog"`, Échap ni focus trap ; bouton fermer sans `aria-label` (non vérifié visuellement). |
| ≈ 495-520 (grep) | MAJOR | Options de réponse : `key={idx}`, aucun lien d'accessibilité avec la question. |
| 182-194 | MINOR | Message « réservé aux élèves d'une école » : l'onglet est affiché dès `isSchoolStudent \|\| Boolean(school)` (`DashboardClient:1136`). |

**Instruction pour Gemini :** « Gemini, dans `StudentAssignmentsView.tsx`, extrais `AssignmentCard`, `MissionPlayer` (modale avec focus trap, Échap, `role="dialog"`) et un hook `useAssignments()`. Après `submitMission`, mets la liste à jour localement ou recharge sans repasser `loading` à `true`. `import()` dynamique de `canvas-confetti`. Clé stable à la place de `key={idx}`. »

### Ordre de correction de la passe 2
1. Bugs fonctionnels : en-tête « Niveau 12 » pour les défis 10-12 ; `age:"7-9"` figé pour tous les défis ; compteur d'étoiles qui inclut 3 étoiles par défaut ; `GameLevel` partiel passé à `openLevel`.
2. Accessibilité bloquante : cartes du dictionnaire non activables au clavier, modales (5 fichiers) sans `role="dialog"`/Échap/focus, input de recherche sans label.
3. Fiabilité : `localStorage` sans `try/catch` dans `GamesMapView`, timers non annulés, rafale `chaseNode`.
4. Découpage : `GamesMapView` (801), `StudentAssignmentsView` (587), `DictionaryView` (350 lignes de CSS).
5. Doublons : `GameShell` (2 versions), `playPop` (3 versions), `/palou/` vs `/images/palou/`.
## MODULE 5 : `frontend/app/dashboard/`, passe 3 : espace parent et adulte

Fichiers : `ParentSettingsView.tsx` (1 336), `ParentChildrenView.tsx` (913), `ParentDashboardView.tsx` (892), `AdultLayout.tsx` (312).

> Lecture : `AdultLayout.tsx` et la logique de `ParentSettingsView.tsx` en entier ; `ParentDashboardView.tsx` formulaire, cartes, modale d'identifiants ; `ParentChildrenView.tsx` en-têtes, carte enfant, vue pédagogique, vue principale. Seulement balayés par grep : les blocs de JSX purement visuels (cartes de limites, notifications, sécurité) de `ParentSettingsView.tsx` et la modale de synthèse de `ParentDashboardView.tsx`.

### Constats transversaux

| # | Constat | Criticité |
|---|---|---|
| P1 | Les trois vues sont montées par un `useState` d'onglet (`adultTab`) de `DashboardClient`, sans route propre : pas d'URL partageable, pas de `loading.tsx` par onglet. | MAJOR |
| P2 | `ParentDashboardView` et `ParentChildrenView` refont chacun `fetch /api/progress/tracking` : deux appels pour les mêmes données, sans cache partagé, à chaque changement d'onglet. | MAJOR |
| P3 | Le type `ChildTracking` est redéfini dans deux fichiers avec des champs différents. | MINOR |
| P4 | Plus de 450 `style={{}}` inline pour 3 400 lignes ; couleurs `#0f766e`, `#134e4a`, `#f1f5f9`… en dur alors que `tokens.css` existe. | MAJOR |
| P5 | Aucun `role="dialog"`, focus trap ni Échap sur les 5 modales du périmètre (synthèse, ajout d'enfant, identifiants créés, confirmation de suppression, liaison). | CRITICAL |

### `AdultLayout.tsx`

| Lignes | Crit. | Problème |
|---|---|---|
| 233 | CRITICAL | Le CSS injecté contient le sélecteur global **`aside { transform: translateX(0) !important; }`** (≥ 1024 px) : il s'applique à tous les `<aside>` de la page, y compris `.lesson-play aside`. Cibler `.adult-aside`. |
| 234 | MAJOR | `.main-content { padding-left: calc(264px + 40px) !important }` : décalage dépendant de `!important` et d'une classe générique. |
| 231-241 | MAJOR | `<style>` injecté à chaque montage ; classes globales `.menu-btn`, `.menu-btn-open`, `.mobile-overlay`, `.main-content`. |
| 121 | MAJOR | Bouton de fermeture mobile (`.menu-btn`) avec `style` inline `display:"flex"` : toujours visible, y compris sur grand écran. Pas d'`aria-label`. |
| 255-266 | MAJOR | Bouton burger sans `aria-label`, `aria-expanded`, `aria-controls`. |
| 74-83 | MAJOR | Barre latérale mobile : `translateX(-100%)` la rend invisible mais **focalisable au clavier** (ni `inert` ni `visibility:hidden`) ; pas de focus trap ni Échap. |
| 59-71 | MINOR | Overlay `div role="presentation"` cliquable sans équivalent clavier. |
| 133-169 | MAJOR | Navigation en `<button>` dans un `<nav>`, sans `aria-current="page"`, sans URL par onglet (P1). |
| 152-163, 213-222 | MAJOR | Survol en JS (`onMouseEnter/Leave`) qui mute `style`. |
| 20-32 | MAJOR | `TEACHER_MENU` et la branche `role === "enseignant"` : code mort (enseignants redirigés avant). |
| 16, 41, 300 | MINOR | Prop `NotifBellComponent` jamais utilisée ; `ParentNotificationCenter` toujours monté. |
| 48-53 | MINOR | Initiales : `w[0]` avec deux espaces consécutifs produit des initiales vides. |
| 98-104 | MINOR | `scale(2.2)` sur un logo complet pour n'en montrer que le pictogramme : image upscalée floue. |
| 107 | MINOR | `<h1>` dans la barre latérale et `<h2>` dans l'en-tête : aucun `<h1>` de contenu. |
| 115 | MINOR | `Espace {role}` affiche `parent`/`enseignant` brut. |

**Instruction pour Gemini :** « Gemini, dans `AdultLayout.tsx`, remplace le `<style>` par `AdultLayout.module.css` (classes `.aside`, `.main`, `.closeBtn`, `.openBtn`), supprime les `!important` et le sélecteur `aside`. `aria-label`, `aria-expanded`, `aria-controls="adult-sidebar"` aux boutons, `aria-current="page"` à l'onglet actif, `inert` sur la barre latérale fermée en mobile. `:hover` CSS à la place de `onMouseEnter`. Supprime `TEACHER_MENU`, `NotifBellComponent` et la branche `enseignant`. À terme : routes `app/dashboard/(parent)/{apercu,enfants,parametres}/page.tsx`. »

### `ParentDashboardView.tsx` (892 lignes)

| Lignes | Crit. | Problème |
|---|---|---|
| 76, 150-161, 573-575 | CRITICAL | **Le mot de passe de l'enfant est conservé en clair dans l'état React** (`createdChildSuccess.password`) puis **affiché en clair** dans la modale finale ; il reste en mémoire tant que la vue est montée ; aucune option masquer/copier. |
| 68-72 | MAJOR | `ageIsValid` accepte 3 à 25 ans, `autoTrack` 7 à 15, sinon choix manuel ; à confirmer avec les règles du serveur. |
| 40-56 | MAJOR | `formatPreviewLogin` reproduit côté client la règle de génération d'identifiant du serveur : l'identifiant réel peut différer (collision, suffixe), l'aperçu peut mentir. |
| 100-170 | MAJOR | `handleAddChild` : mot de passe validé par `minLength={8}` seulement alors que le placeholder annonce « lettres et chiffres » (aucune vérification JS) ; confirmation en deux clics via un état dans le même handler : fragile. |
| 141-147 | MINOR | `let data;` (`any` implicite) puis `try/catch` imbriqué. |
| 166-168 | MINOR | `"Problème de connexion : " + e.message` : message technique anglais (`Failed to fetch`) montré au parent. |
| 78-98 | MAJOR | `fetchChildren` non annulable, pas d'`AbortController` ; `useEffect` sans `fetchChildren` en dépendance. |
| 7-19 | MAJOR | `getLessonDisplayName` : triple boucle sur `tracks` **à chaque rendu et pour chaque enfant** ; importe tout le catalogue dans le bundle parent. Utiliser une `Map<lessonId, title>`. |
| 297 | MINOR | `children.reduce(…)` dans le JSX, répété pour d'autres agrégats : 4 passes par rendu. |
| 328-455 | MAJOR | Le `map` des enfants : 120 lignes de JSX avec un tableau `colors` recréé à chaque itération. Extraire `ChildSummaryCard` (memo). |
| 357-362 | MINOR | `child.displayName.charAt(0)` : avatar vide si nom vide. |
| 456-495 | MAJOR | Carte « Ajouter mon enfant » : `div onClick` sans `role`/`tabIndex`/clavier ; survol par mutation de `style`. |
| 313-324 (labels) | CRITICAL | `<label>` **sans `htmlFor`** pour « Prénom » (~314), « Nom » (~341), « Mot de passe » (~415) ; inputs sans `id`. Seul le champ âge (`htmlFor="new-child-age"`) est correct. |
| 321-336 | MAJOR | `onFocus`/`onBlur` mutent `e.target.style` ; `var(--field-border)` à vérifier dans `tokens.css`. |
| 422-432 | MAJOR | `<input type="password">` sans `autoComplete="new-password"` : les gestionnaires proposeront d'enregistrer le mot de passe de l'enfant comme celui du parent. |
| 499-525 | MAJOR | Sélecteur de parcours : `role="radio"` sur des `div` sans `role="radiogroup"`, sans flèches, `aria-disabled` incohérent. |
| 551-590 | MAJOR | Modale des identifiants : pas de `role="alertdialog"`, pas de focus, pas de bouton « Copier ». Fermée par erreur, le mot de passe est perdu. |
| 174-190 | MINOR | `.hover-lift:hover { … !important }` global ; `keur-spin` redéfini ici et dans `ParentChildrenView`. |
| 244-252 | MAJOR | Spinner sans `role="status"`/`aria-live` ; pas de `prefers-reduced-motion`. |
| 193-242 | MINOR | `DM Serif Display` chargée par `layout.tsx` uniquement pour ces titres. |
| 4 | MINOR | Imports `lucide-react` probablement inutilisés (`Lightbulb`, `Trophy`, `Lock`, `X`…). |

**Instructions pour Gemini :**
1. « `htmlFor`/`id` (via `useId`) sur les 4 champs ; `autoComplete="new-password"` et bouton œil. Modale d'identifiants : mot de passe masqué avec « Afficher », bouton « Copier » (`navigator.clipboard`), `createdChildSuccess` effacé à la fermeture, `role="alertdialog"` avec focus sur le bouton de fermeture. »
2. « `useChildrenTracking()` partagé avec `ParentChildrenView` (cache), `AbortController`, gestion d'erreur. Index `lessonTitleById` (`Map`) en constante de module à la place de `getLessonDisplayName`. »
3. « Extrais `AddChildModal`, `CreatedCredentialsModal`, `SynthesisModal`, `ChildSummaryCard` (memo). Carte « Ajouter » en `<button>`. Remplace `formatPreviewLogin` par « Identifiant généré à la création » ou un endpoint de prévisualisation. »
4. « **Backend** : règle d'âge (3-25 ou 7-15), règle de mot de passe (lettres + chiffres), rate limiting sur `/api/parent/children/`. »

### `ParentChildrenView.tsx` (913 lignes)

| Lignes | Crit. | Problème |
|---|---|---|
| ≈ 12, ≈ 880 | MINOR | Commentaires séparateurs avec caractères corrompus : **problème d'encodage du fichier** (octets invalides). Normaliser en UTF-8. |
| 124-140 | CRITICAL | `ChildCard` est un `div onClick` : non focalisable, ni `role="button"`/`aria-pressed` : **sélectionner un enfant est impossible au clavier**. |
| 189-193 | CRITICAL | **Compétences inventées présentées comme « données réelles ».** `aiScore = min(100, totalLessons × 8)`, `activityScore = min(100, todayMinutes × 5)` sont des formules arbitraires affichées en jauges `SkillBar`, alors que l'en-tête annonce « Données réelles de progression — Aucune simulation » (~838). `securityScore` reprend le taux de compréhension aux quiz mais est étiqueté compétence de sécurité. Un parent peut en tirer des conclusions pédagogiques fausses. |
| 100, 167-169 | MAJOR | `pct = xpInLevel / xpPerLevel` sans garde (NaN/Infinity), deux fois ; `ParentDashboardView` protège ce cas. |
| 504-535 | MAJOR | `fetchData` : l'effet `[reloadKey]` réinitialise `activeId` sur le premier enfant à chaque rechargement ; pas d'`AbortController`. |
| 502 | MINOR | `knownIds` en `useRef` : bon usage, mais logique « enfant ajouté » subtile. |
| 221-227 | MINOR | `formatLastActivity` en jours glissants de 24 h, pas calendaires : « Aujourd'hui » après minuit pour une activité d'hier. |
| 237-254 | MAJOR | `buildSummary` écrit « sur **KerIA** » (marque : **kEur IA**) ; appelé à chaque rendu. |
| 237-243 | MINOR | « Meilleur / à retravailler » suppose `modules` trié par score décroissant côté serveur (non documenté). |
| ≈ 800 | MAJOR | `gridTemplateColumns: "320px 1fr"` fixe : non responsive, aucune media query dans le fichier. |
| 780-800 | MAJOR | `keur-spin` réinjecté ; spinner sans `role="status"` ; erreur de chargement sans `role="alert"` ni bouton « Réessayer ». |
| ≈ 150-165 | MINOR | « Visiter l'espace » (`onVisitChild`) lance le mode visiteur (voir passe 1 : `child_id` à vérifier côté serveur). |
| 141 | MINOR | Badges : `title` seul pour la description (invisible au clavier et au tactile). |
| 6 | MINOR | 20+ icônes `lucide-react` dont plusieurs probablement inutilisées. |

**Instructions pour Gemini :**
1. « `ChildCard` : `<button type="button" aria-pressed={isActive}>`. »
2. « **Supprime les jauges de compétences inventées** (lignes 189-193) : n'affiche que des mesures réelles fournies par le serveur (taux de compréhension, jours d'activité, leçons terminées, score par module). »
3. « Garde `xpPerLevel > 0` avant la division (deux endroits). « KerIA » → « kEur IA ». `@media (max-width: 900px) { grid-template-columns: 1fr }` via un module CSS. `role="alert"` + bouton « Réessayer » sur l'erreur. Garder l'enfant sélectionné lors d'un rechargement si son `id` existe. »
4. « Normalise l'encodage en UTF-8 sans BOM, remplace les séparateurs corrompus. »

### `ParentSettingsView.tsx` (1 336 lignes)

| Lignes | Crit. | Problème |
|---|---|---|
| 295-1336 | CRITICAL | Composant de plus de 1 000 lignes : 4 onglets, 3 modales, un toast, 25 `useState`, ≈ 150 `style={{}}`. Non testable. |
| 15-52 | CRITICAL | `CustomDropdown` : `role="listbox"` sur un `div` dont les `option` sont tabbables **sans flèches / Échap / fermeture au clic extérieur** ; un `<select>` natif suffirait. |
| 66-188 | CRITICAL | `TimeSelectDropdown` : liste (`div`) sans rôle `listbox`, options `div onClick` **non focalisables** : choisir une heure est **impossible au clavier**. 84 options rendues à l'ouverture ; `aria-expanded` absent. |
| 195-262 | MAJOR | Heure de coucher : deux listes de 24 et 60 valeurs. `<input type="time">` natif donnerait clavier, mobile, i18n. |
| 264-285 | MINOR | `ToggleSwitch` : bon (`role="switch"`, `aria-checked`, clavier) mais **sans nom accessible**. |
| 320-325 | MAJOR | `durationMap`/`reverseDurationMap` recréées à chaque rendu et dupliquées. |
| 350-410 | MAJOR | `loadSettings` : 2 requêtes séquentielles indépendantes (profil, limites) ; pas d'`AbortController` ; l'effet `[selectedChildId]` peut recevoir des réponses dans le désordre (course) ; `loadSettings` absent des dépendances. |
| 357, 394 | MAJOR | `/api/profile` rechargé à chaque changement d'enfant (inutile). |
| 441-470 | MAJOR | `handleSaveLimits` : `fetch` POST **sans `credentials`** et `await res.json()` sans `.catch()` ; les autres appels du fichier utilisent `credentials: "same-origin"`. Idem `handleSaveProfile` (~474). |
| 447-460 | MAJOR | Synchro « instantanée avec l'écran enfant » par `localStorage` + `BroadcastChannel` : ne fonctionne que si parent et enfant utilisent le même navigateur. Le polling de `ScreenTimeManager` (non monté, T1) devrait le faire : **les limites de temps d'écran ne s'appliquent donc à aucun écran enfant aujourd'hui**. |
| ≈ 392-412 | CRITICAL | `handleResetChildPassword` : aucune confirmation par le mot de passe du parent, aucun garde-fou contre un clic accidentel, mot de passe laissé dans l'état `resetPassword` après échec. `minLength={8}` côté client seulement. Côté serveur, vérifier que l'API refuse un enfant non rattaché. |
| 380-399 | MINOR | `showToast` : `setTimeout` de 4 s jamais annulé ; deux toasts se coupent ; pas de `role="status"`/`aria-live`. |
| 405-414 | MAJOR | `handlePushToggle` : `enablePush()` peut lever (passe 1), aucune capture. |
| ≈ 678, ≈ 698 | MAJOR | Labels « Nom complet » et « Adresse E-mail » sans `htmlFor`/`id`. |
| ≈ 748-760 | MAJOR | `<select>` « Retirer un enfant » (`value=""`) déclenche directement la confirmation d'une action destructive ; sans libellé (`aria-label`). |
| ≈ 878-896 | CRITICAL | **2FA** : activation/désactivation passent par `handleSaveLimits` (avec `currentPassword` optionnel). Mélanger un réglage de sécurité de compte avec des limites par enfant est piégeux : si `selectedChildId` est défini, le payload contient `childId` et `twoFactor`. Le serveur doit ignorer `twoFactor` quand `childId` est présent (à vérifier). |
| ≈ 1229-1263 | MAJOR | Modale de suppression : `type="password"` correct, mais pas de `role="alertdialog"`, focus, Échap. Le chemin « enfant » appelle `await res.json()` sans `.catch()` (~1296). |
| ≈ 1265-1290 | MINOR | `setDeleteConfirm(null)` avant le `await signOut` superflu. |
| 15 | MINOR | `import { signOut } from "@/app/sign-out-client"` : seul fichier à utiliser l'alias `@/`. |
| 295 | MINOR | `isHovered` en `useState` : re-rend toute la vue à chaque survol d'un onglet ; `:hover` CSS. |
| 1329-1335 | MINOR | `fadeIn`, `spinSlow`, `slideInRight` définis ici et ailleurs (collision globale). |
| 640-1230 | MAJOR | Cartes de limites, coucher, notifications : blocs de 60 à 100 lignes répétés avec le même motif (icône + titre + description + interrupteur). Extraire `SettingRow`. |
| `MyDataCard` | MAJOR | Dans l'onglet Sécurité : « Désactiver mon compte parent » et « Supprimer mon compte » coexistent avec des libellés proches. |

**Instructions pour Gemini :**
1. « Découpe `ParentSettingsView.tsx` en `settings/ProfileTab.tsx`, `NotificationsTab.tsx`, `SecurityTab.tsx`, `LimitsTab.tsx`, `DeleteAccountModal.tsx`, `SettingRow.tsx` et un hook `useParentalSettings(childId)` (`Promise.all`, `AbortController`, enregistrement). »
2. « Remplace `CustomDropdown` par un `<select>` natif et `TimeSelectDropdown`/`ModernTimePicker` par `<input type="time">`. Sinon implémente le motif ARIA `listbox` complet (flèches, Échap, Home/End). `aria-label` sur chaque `ToggleSwitch`. »
3. « `credentials: "same-origin"` aux deux `fetch` qui n'en ont pas, `.catch(() => ({}))` à tous les `res.json()`. Timer du toast dans une ref. `role="status" aria-live="polite"` sur le toast. »
4. « `handleResetChildPassword` : modale de confirmation par le mot de passe du parent, `resetPassword` effacé dans un `finally`. »
5. « Sépare la sauvegarde de la 2FA (endpoint dédié) de celle des limites enfant. »
6. « **Backend** : (a) `reset-password` refuse un enfant non rattaché, (b) `/api/progress/parental-limits` ignore `twoFactor` quand `childId` est présent, (c) la désactivation du compte exige le mot de passe, (d) les limites sont appliquées côté serveur (réponse 423 sur `/api/progress`). »

### Ordre de correction de la passe 3
1. Fonctionnel / honnêteté des données : jauges de compétences inventées, contrôle parental non appliqué côté écran enfant (T1), synchro limitée au même navigateur.
2. Sécurité : réinitialisation de mot de passe sans reconfirmation, mot de passe de l'enfant en clair en mémoire, `aside` global, 2FA mélangée aux limites, vérifications backend.
3. Accessibilité bloquante : carte enfant et sélecteur d'heures non utilisables au clavier, labels sans `htmlFor`, toggles sans nom, modales.
4. Découpage et performance : `ParentSettingsView` (1 336), double `fetch` de `tracking`, `getLessonDisplayName` en triple boucle.
5. Cohérence : « KerIA » vs « kEur IA », encodage, alias `@/`, `credentials`.
## MODULE 6 : `frontend/app/dashboard/`, passe 4 : `DashboardActivities.tsx` (1 957 lignes)

> Lecture : lignes 1-430 en entier, `QuizGame`, début de `MemoryGame`, `QuickMissionGame` (début), `ScratchView`, `ScratchStudio` ; le reste mesuré par un script de comptage par fonction (états, effets, timers, listeners, `aria-*`, `<img>`, styles inline, clés par index). Les mini-jeux `JeVoisIAGame`, `DetectIAGame`, `ClassifGame`, `PromptGame`, `RobotGame`, `SequenceGame`, `BalanceGame`, `ModelLabGame` n'ont pas été relus ligne à ligne.

### Cartographie du fichier

| Bloc | Lignes | Taille | Observations |
|---|---|---|---|
| Données `pilotLessons`, `youngModulePilots` | 64-83 | 20 lignes de 600 à 1 500 caractères | contenu pédagogique en dur |
| `LessonPlayer`, `PilotLessonPlayer`, `StandardLessonPlayer` | 89-356 | 270 | lecteurs de leçon 10-15 ans et générique |
| `GamesView` | 357-408 | 52 lignes denses | **jamais rendu** (voir ci-dessous) |
| `RealGame` + 8 mini-jeux internes | 409-1814 | 1 400 | `JeVoisIA`, `Quiz`, `Memory`, `DetectIA`, `Classif`, `Prompt`, `Robot`, `Sequence`, `QuickMission`, `Balance`, `ModelLab` |
| `scratchLabs`, `ScratchView`, `ScratchStudio` | 1815-1958 | 140 | `ScratchStudio` jamais importé |

### Constats transversaux de ce fichier

| # | Constat | Criticité |
|---|---|---|
| A1 | Fichier fourre-tout de 1 957 lignes, 24 exports : contenu pédagogique, 3 lecteurs de leçon, un hub arcade, 11 mini-jeux et un studio Blockly. Aucun test possible, tout le fichier est chargé pour afficher n'importe quelle activité. | CRITICAL |
| A2 | **Code mort** : `GamesView` (hub arcade, importé par `DashboardClient.tsx:41` mais jamais rendu : l'onglet `jeux` utilise `JeuxDefisDashboardView`), `ScratchStudio` (aucun importateur), `JeVoisIAGame`, `MemoryGame`… exportés sans importateur externe (utilisés seulement via `RealGame`). | MAJOR |
| A3 | 242 `style={{}}` inline et 21 `<img>` sans dimensions : aucune règle réutilisable, aucun `next/image`. | MAJOR |
| A4 | Les réponses correctes des leçons, quiz et défis (`correct`, `gameChallenges`, `pilotLessons`) sont dans le bundle client. L'XP est attribuée par le serveur (catalogue) donc le risque est limité, mais un élève peut lire toutes les réponses dans les outils du navigateur. À l'inverse de `DailyChallengeCard` (réponse validée par le serveur). | MINOR |
| A5 | Pas d'accessibilité dans les mini-jeux : `aria-*` : 0 pour `QuizGame`, `MemoryGame`, `ClassifGame`, `PromptGame`, `RobotGame`, `QuickMissionGame`, `BalanceGame`, `ModelLabGame` ; `role` : 0 hors `GamesView`. Les cartes du Memory ne sont pas annoncées, aucun mode clavier. | CRITICAL |
| A6 | Prénom « Ndeye » dans 6 chaînes (lignes 64, 72…, `GamesView` 308-309) alors que `HomeClient.tsx:27` précise « sans Ndeye ». À trancher. | MINOR |
| A7 | Chaque mini-jeu réinvente son en-tête Palou + bouton « Écouter » (`SpeechSynthesisUtterance` sans test de support) au lieu d'utiliser `GameShell`. | MAJOR |

### `LessonPlayer` / `PilotLessonPlayer` / `StandardLessonPlayer`

| Lignes | Crit. | Problème |
|---|---|---|
| 89-129 | MINOR | `LessonPlayer` : branchement par âge propre. Mais pour 10-12 et 13-15 les props `answer`/`setAnswer` sont passées à un composant qui ne les utilise pas (`PilotLessonPlayer`, ligne 130 : `answer`/`setAnswer` déclarées, jamais lues). |
| 130-313 | MAJOR | `PilotLessonPlayer` : 184 lignes, 7 `useState`, 48 `style={{}}`, 9 « étapes » rendues par 9 blocs `{step === n && …}` ; couleur et taille de titre (`fontSize: '2.5rem'`, `color: 'var(--green)'`) répétées 9 fois. |
| 72 | MAJOR | `pilotLessons[item.lesson.id] \|\| (item.module.id.startsWith("a") ? … : item.module.id.startsWith("c") ? … : buildYoungPilot(item))` : sélection du contenu par préfixe d'id. `buildYoungPilot` (ligne 84) plante si `youngModulePilots[module.id]` est absent (`profile.activities[index]` sur `undefined`). |
| 89-99 | MAJOR | Effet qui change l'émotion de Palou à chaque étape : 9 `if` consécutifs ; `setPalouEmotion` dans un effet (rendu supplémentaire) alors qu'une valeur dérivée suffit. |
| 118-121 | MAJOR | `playFakeAudio` : fait **semblant** de lire de l'audio (`setAudioPlaying(true)` pendant 3 s) : le bouton « Écouter Palou » n'émet aucun son. Fonctionnalité factice affichée à l'enfant. `setTimeout` non nettoyé. |
| 84 | MINOR | `score` recalculé à chaque rendu ; division par `content.questions.length` (zéro possible). |
| 141 | MAJOR | Bouton « Écouter Palou » sans `aria-label` explicite et sans effet réel (voir ci-dessus). |
| 128 | — | Bon : `aria-label="Quitter le cours"`. |
| 197-203 | MINOR | `key={q.question}` / `key={o}` : clés textuelles (doublons possibles si deux options identiques). |
| 218 | MINOR | Image `/images/games/quiz-1.png` utilisée pour toute réussite (nom trompeur). |
| 239-251, 283-295 | CRITICAL | Modale « Tu veux vraiment t'arrêter ? » : `div.modal-bg` sans `role="dialog"`, `aria-modal`, Échap, focus. Dupliquée entre `PilotLessonPlayer` et `StandardLessonPlayer`. Texte « **Ndeye** a encore besoin de toi ». |
| 232-234 | MINOR | `style` inline `transition`/`transform`/`boxShadow` sur le bouton « Continuer » ; effet d'appui non défini. |
| 256-258 | MAJOR | `StandardLessonPlayer` : `typeof (c.quiz as { correct?: number }).correct === "number" ? … : 1` : cast pour lire un champ du contenu ; la bonne réponse **par défaut à l'index 1** si absent. |
| 268-282 | MAJOR | JSX de 15 lignes très longues (jusqu'à 1 500 caractères) pour les 7 étapes. Illisible. |
| 279 | MINOR | Rond `○` en texte comme case à cocher visuelle (pas de `<input type="checkbox">` ni `aria-checked`). |
| 281 | MAJOR | Bouton « Étape précédente » (`step - 1`) vs « Quitter le cours » à l'étape 0 : le label change mais pas le `type`. |

**Instruction pour Gemini :** « Gemini, extrais de `DashboardActivities.tsx` : `lessons/PilotLessonPlayer.tsx`, `lessons/StandardLessonPlayer.tsx`, `lessons/QuitConfirmModal.tsx` (une seule modale, `role="alertdialog"`, focus trap, Échap), `lessons/PilotStep.tsx` (un composant par étape). Supprime `playFakeAudio` : branche le bouton sur `speechSynthesis` (avec test de support) ou masque-le tant que l'enregistrement officiel n'existe pas. Dans `buildYoungPilot`, retourne une erreur lisible si le profil ou l'index sont absents. Retire les props `answer/setAnswer` inutilisées de `PilotLessonPlayer`. »

### `GamesView` (lignes 357-408)

| Lignes | Crit. | Problème |
|---|---|---|
| tout | MAJOR | **Jamais rendu** (A2). 52 lignes denses (jusqu'à 2 000 caractères). Une refonte arcade a été faite ailleurs (`JeuxDefisDashboardView`, `arcade/page.tsx` supprimé). |
| 358-377 | MAJOR | `realGames` : tableau de 20 tuples positionnels `[icône, titre, description, xp, tag, niveau]` accédés par index (`g[0]`, `g[3]`…) : fragile. Les XP affichés (30 à 80) sont codés ici alors que **l'XP est décidée par le serveur** : risque d'affichage incohérent. |
| 378-383 | MAJOR | `activitiesByAge` renvoie des **index** dans deux tableaux (`realGames`, `gameChallenges`) : réordonner un tableau casse silencieusement la sélection par âge. |
| 384-390 | MINOR | 4 `useState` déclarés sur une seule ligne séparés par `;`. |
| 392-395 | MAJOR | `claim`/`winReal` : `await onAward(...); await onDaily(...)` sans `try/catch`. Le client **déclare** la victoire à un jeu (`arcade-game-NN`) : le serveur ne peut pas la vérifier. Un élève peut appeler l'API pour chaque id et obtenir l'XP de tous les jeux (une fois chacun). |
| 396 (modales) | MAJOR | `div.game-modal-bg onClick` + `×` sans `aria-label` ; une seule modale avec `role="presentation"`. |

**Instruction pour Gemini :** « Gemini, supprime `GamesView` si aucune route ne l'utilise (grep sur `<GamesView`), et retire l'import de `DashboardClient.tsx:41`. Remplace `realGames` par un tableau d'objets nommés `{ id, icon, title, description, tag, level }` sans XP (l'XP vient du serveur). **Vérifie côté backend** que l'attribution d'XP pour `arcade-game-NN` ne peut pas être obtenue sans avoir joué (anti-triche : durée minimale, jeton de session de jeu). »

### Mini-jeux (lignes 409-1814)

| Fonction | Lignes | Crit. | Problème |
|---|---|---|---|
| `RealGame` | 409-431 | MINOR | Aiguillage par 20 `if (index === n)` : un `Record<number, ComponentType>` serait plus sûr ; un index inconnu retombe sur `VoiceAssistantGame` (dernier `return`), sans erreur. |
| `JeVoisIAGame` | 432-496 | MINOR | `setTimeout` ×2 non nettoyés. |
| `QuizGame` | 497-598 | MAJOR | `key={o}` (options textuelles) ; boutons sans `aria-pressed`/`aria-live` pour le retour de réponse ; `claim` calcule les étoiles côté client (3/2/1) et appelle `onComplete`. 10 styles inline dupliqués par bouton. Le calcul de couleur (`bgColor`, `borderColor`, `color`) par mutation de variables `let` dans le `map`. |
| `MemoryGame` | 599-745 | MAJOR | Effet `[open]` qui lit `cards`, `matched`, `mistakes`, `onComplete` sans les lister (`exhaustive-deps`) : **risque d'`onComplete` appelé deux fois** si l'effet est rejoué ; `setInterval` du compte à rebours correctement nettoyé. Un `fixed inset:0` en fond plein écran avec image CSS ; `window.dispatchEvent(new CustomEvent("levelProgress"))` : bus d'événements global non typé (consommé par `DashboardClient:321` avec un `any`). Cartes du Memory sans libellé accessible. |
| `MemoryGame` | 641-644 | MINOR | « Revoir les cartes » réinitialise le compte à rebours sans pénalité : étoiles non affectées. |
| `DetectIAGame` | 746-870 | MINOR | Un `setTimeout` non nettoyé ; images sans dimensions. |
| `ClassifGame` | 871-1094 | MAJOR | 224 lignes ; glisser-déposer sans alternative clavier ; `onDrag` : 0 → probablement des clics, à confirmer ; `setTimeout` non nettoyé. |
| `PromptGame` | 1095-1214 | MINOR | 20 styles inline. |
| `SequenceGame` | 1283-1482 | MAJOR | 200 lignes, 4 `setTimeout` pour 1 `clearTimeout` : séquences de couleurs qui continuent après démontage. Jeu de mémoire visuelle uniquement par couleur (daltonisme : aucune alternative de forme). |
| `QuickMissionGame` | 1483-1704 | MAJOR | 222 lignes ; **trois jeux (bouclier, sources, éthique) en un seul composant** piloté par un `kind` ; `(items[pos][1] as readonly any[]).map((optionDef: any, i) => …)` (ligne 1609) : `any` explicite (seul `any` du fichier). |
| `BalanceGame`, `ModelLabGame` | 1705-1814 | MINOR | Pas de clavier, `setTimeout` non nettoyé. |
| tous | — | MAJOR | `window.speechSynthesis.speak(...)` sans test de support dans `MemoryGame` (ligne ~665). |
| tous | — | CRITICAL | Aucun jeu n'expose de rôle ARIA ni d'annonce du résultat (`aria-live`). Les enfants utilisant un lecteur d'écran ou le clavier ne peuvent pas jouer. |

**Instruction pour Gemini :** « Gemini, déplace chaque mini-jeu dans `dashboard/games/` (le dossier existe déjà pour les jeux avancés) avec un fichier par jeu et un registre `games/registry.ts` (`Record<number, { component, title, stars }>`). Utilise `GameShell` pour l'en-tête commun. Pour chaque jeu : timers dans une ref nettoyée au démontage, `aria-live="polite"` sur la zone de résultat, alternative clavier. Remplace l'événement global `levelProgress` par une prop `onProgress(ratio)` typée. Dans `MemoryGame`, corrige les dépendances de l'effet `[open]` et empêche le double appel de `onComplete` (ref `completedRef`). Éclate `QuickMissionGame` en `ShieldGame`, `SourceGame`, `EthicsGame` avec des types pour les options (supprime le `any`). »

### `ScratchView` et `ScratchStudio` (lignes 1815-1958)

| Lignes | Crit. | Problème |
|---|---|---|
| 1815-1838 | MINOR | `scratchLabs` : contenu en dur (cartes de missions). |
| 1839-1896 | MAJOR | `ScratchView` : défilement automatique à l'arrivée (`scrollIntoView` après 350 ms) à chaque changement d'âge, y compris au premier rendu : saut inattendu. |
| 1862-1883 | MAJOR | Bouton « Ouvrir le Studio Scratch » avec effet d'appui en JS (`onMouseDown/Up/Leave`), styles inline de 14 propriétés. |
| 1887 | — | `ScratchEmbed` ouvre le vrai éditeur Scratch (voir passe sous-dossier `programmation/`). |
| 1897-1958 | MAJOR | `ScratchStudio` : **jamais importé** (A2), contient une instance Blockly complète avec définition de blocs : ≈ 60 lignes mortes. À supprimer ou à brancher. |
| 1898-1936 | — | Bons points : `import("blockly")` **dynamique**, `disposed` flag, `observer.disconnect()`, `workspace.dispose()`, interpréteur par parcours de blocs avec budget d'instructions (plus de `new Function`), `JSON.stringify` pour le texte du bloc `say`. |
| 1926 | MINOR | `.catch(() => setStatus(...))` : erreur affichée mais jamais journalisée. |

**Instruction pour Gemini :** « Gemini, supprime `ScratchStudio` et `import type { Block, WorkspaceSvg }`/`JavascriptGenerator` si aucun importateur n'existe (vérifie `ProgrammingAtelier`). Dans `ScratchView`, ne défile que lors d'un changement d'âge (pas au premier rendu) et remplace les `onMouse*` par `:active` CSS. »

### Données pédagogiques (lignes 64-83)

| Lignes | Crit. | Problème |
|---|---|---|
| 64-71 | MAJOR | `pilotLessons` : 4 leçons (p1-1 à p1-4) en dur avec des missions de 300 à 600 caractères. Les autres âges utilisent `curriculum-10-12.ts` et `curriculum-13-15.ts`. Trois formats de contenu différents pour la même notion de « leçon ». |
| 72-83 | MAJOR | `youngModulePilots` : profils par module (p3 à p10 vus), dupliquant ce que font `content/parcours79` et les générateurs `build*Lesson`. Source de vérité éclatée : fichiers `content/parcours79`, `lms-data.ts`, `curriculum-*.ts`, `dashboardShared.ts` (`lessonExtras`), ici. |
| 61-62 | MINOR | Types `PilotQuestion` / `PilotLesson` / `YoungModulePilot` redéfinis (aussi dans `types/curriculum.ts`). |

**Instruction pour Gemini :** « Gemini, déplace `pilotLessons` et `youngModulePilots` dans `content/` (JSON typé) et fais d'`app/types/curriculum.ts` la seule source des types. Prépare une table de correspondance unique `leçon → contenu` plutôt que quatre générateurs. »

### Ordre de correction de la passe 4
1. **Supprimer le code mort** : `GamesView`, `ScratchStudio`, `playFakeAudio`, imports Blockly inutiles (réduit d'environ 150 lignes et clarifie la refonte arcade).
2. **Bugs** : `MemoryGame` (double `onComplete`), `buildYoungPilot` (plantage), `RealGame` (index inconnu), faux audio « Écouter Palou ».
3. **Accessibilité** : modale de sortie, mini-jeux (ARIA, clavier, annonce du résultat), alternatives aux couleurs.
4. **Découpage** : un fichier par lecteur et par jeu, registre, `GameShell` partagé.
5. **Contenu** : sortir les données pédagogiques dans `content/` et unifier les types ; trancher « Ndeye ».
6. **Backend** : preuve de jeu pour `arcade-game-NN`.
## MODULE 7 : `frontend/app/dashboard/`, passe 5a : `sections/`, `components/`, `classement/`, `games/`

> Lecture : `sections/DashboardNavbar.tsx`, `AventureView.tsx`, `ParentLinkBanner.tsx`, `index.ts`, `components/LinkChildModal.tsx`, `NavKidIcon.tsx`, `classement/page.tsx` en entier ; `QuotidienView.tsx` (lignes 1-200 en entier, le reste par grep et extraits) ; `ChildProfileView.tsx` (lignes 1-140 en entier, le reste par grep) ; `games/GestureCameraGame.tsx` (lignes 30-160), `games/DrawingGuessGame.tsx` (extraits), `games/ModelTrainingGames.tsx` (début), `games/sound.ts` et `index.ts` en entier. **Non relus ligne à ligne** : `games/VoiceAssistantGame.tsx` (680), `games/ImageTrainingGame.tsx` (298) et le reste de `ModelTrainingGames.tsx` ; leurs chiffres viennent de comptages par grep.

### `sections/DashboardNavbar.tsx` (341 lignes)

| Lignes | Crit. | Problème |
|---|---|---|
| 62-161 | MAJOR | Navigation : 9 liens sans `aria-current="page"` (l'onglet actif n'est marqué que par la classe `on`). |
| 135 | MINOR | `<i />` vide comme séparateur visuel. |
| 42 | MINOR | `<aside aria-label="Menu principal">` : le `<nav>` interne a un autre libellé (« Navigation de l'apprenant ») : deux noms pour la même navigation. |
| 48 | MINOR | Logo `<img>` sans dimensions. |
| 124-133 | MAJOR | Lien « Suivi Enfants » (`/dashboard/suivi`) pour `accountRole === "parent"` : **code mort** : un parent ne voit jamais cette barre latérale (`DashboardClient` renvoie `AdultLayout` avant), et `suivi` ne rend aucune vue élève. |
| 183-187 | MINOR | Lien « Retour à l'accueil » pour les non-élèves : jamais atteint (mêmes raisons). Condition redondante `role === "enfant" \|\| role === "eleve" \|\| isLearner`. |
| 229 | MAJOR | `<header role="banner">` à l'intérieur de `<main>` : un seul `banner` est permis par page, et il doit être hors de `main`. Rôle redondant sur `<header>`. |
| 262-277 | MAJOR | Bouton XP/niveau : `span role="button"` avec `onKeyDown` qui réagit à Espace **sans `preventDefault`** (la page défile) ; survol par mutation de `style`. |
| 247 | MINOR | Informations de série uniquement dans `title` (invisible au clavier et au tactile). |
| 226 | MINOR | `if (activeTab === "profil") return null` : barre supérieure masquée, mais aucune déconnexion visible pour l'élève ailleurs que dans le profil (`ChildProfileView:362`). |
| 313-323 | MAJOR | Le bouton de déconnexion n'est affiché que pour les non-élèves : un élève sur un poste partagé ne voit pas « Déconnexion » dans la barre. |
| 296, 306 | MINOR | `finalDisplayName.slice(0, 2).toUpperCase()` coupe un emoji ou un caractère composé. |
| 334-341 | MINOR | `DashboardNavbar` par défaut : composant non utilisé (seuls `DashboardSidebar` et `DashboardTopBar` le sont). |

**Instruction pour Gemini :** « Gemini, dans `DashboardNavbar.tsx`, ajoute `aria-current={isActive ? "page" : undefined}` à chaque lien. Supprime le lien « Suivi Enfants », le lien « Retour à l'accueil » non atteignable et le composant par défaut `DashboardNavbar`. Remplace `role="banner"` sur le `<header>` par un `<div>` ou retire-le, et ajoute `e.preventDefault()` pour la touche Espace. Affiche « Déconnexion » aussi pour les élèves (avec confirmation), ou documente qu'elle est dans le profil. »

### `sections/AventureView.tsx` (341 lignes)

| Lignes | Crit. | Problème |
|---|---|---|
| 81-90 | MAJOR | `div role="button"` pour écouter Palou : `onKeyDown` Espace sans `preventDefault`. Un second bouton identique juste à côté (109-131) : deux commandes pour la même action. |
| 82 | MAJOR | `key={headerImg}` + `key={headerTitle}` : le bloc d'accueil est **remonté toutes les 15 s** (timer dans `DashboardClient` qui re-rend aussi les 1 400 lignes du dashboard et relance les animations). Distrayant pour l'enfant et coûteux. |
| 91-102 | MAJOR | `<img>` sans dimensions ; animation `palouFloat` infinie sans `prefers-reduced-motion`. |
| 173-203 | MINOR | Frise de la série : `new Date().getDay()` recalculé 7 fois ; couleur et symbole sans alternative texte (jours « actifs » signalés par une flamme seulement). |
| 214-234 | MAJOR | Étoile « Bonus secret » : `span role="button"` avec `tabIndex`, mais **aucun nom accessible** (le `title` n'est pas lu de façon fiable) ; Espace sans `preventDefault`. |
| 255-292 | MAJOR | Mini-carte de progression : cercles numérotés sans texte alternatif ni `aria-current` ; la progression par module n'est pas annoncée. |
| 258 | MINOR | Calcul `track.worlds[i - 1].lessons.every(...)` répété pour chaque monde à chaque rendu. |
| 294-300 | MAJOR | Barre `i`/`b` de progression globale sans `role="progressbar"` ni `aria-valuenow`. |
| 302-332 | MAJOR | Trois chemins de rendu du bouton « Continuer » (7-9, autres âges, rien) avec le calcul `track.worlds.flatMap(...).find(...)` dans le JSX. |
| 334 | MINOR | `<img src="/images/age-${age}.png">` sans dimensions ni `loading`. |
| 10 | MINOR | Import `QuotidienView` placé après une constante (viole `import/first`). |
| 9-10 | MINOR | Phrase d'accueil de Palou codée dans le composant. |

### `sections/QuotidienView.tsx` (718 lignes)

| Lignes | Crit. | Problème |
|---|---|---|
| 56-718 | MAJOR | Composant de 660 lignes : programme du jour, accès dictionnaire/classement, défi éclair, trois ateliers, astuce du jour, charte du citoyen numérique. |
| 139-147 | MAJOR | `pct = Math.min(100, (value / max) * 100)` : division par zéro si un plafond vaut 0 (NaN). Barres sans `role="progressbar"`. |
| ≈ 290-410 | MAJOR | Trois ateliers affichés si `gameUnlocked(3)`, `(6)`, `(5)` : **indices magiques** dans `GAME_LEVELS` (`GAME_LEVELS[3]`, `[6]`, `[5]`) ; réordonner `games-map-data.ts` casse l'écran sans erreur. |
| ≈ 330-410 | MINOR | « +40 XP » et durées affichées en dur alors que l'XP est décidée par le serveur. |
| ≈ 485-560 | MAJOR | Charte du citoyen : tableau de 3 règles défini **dans le rendu** (recréé à chaque rendu), carte entière en `div role="button"`, couleurs choisies par chaînes de ternaires sur `rule.id` (`0`/`1`/`2`). La case cochée est un état visuel seulement (pas d'`aria-pressed`/`aria-checked`). |
| ≈ 20, 45 | MINOR | `<Link style={{ display: "block" }}>` enveloppant des blocs complets (liens très larges). |
| 29 | MINOR | `GAME_LEVELS` importé pour 3 niveaux. |
| 5-26 | MINOR | 19 icônes `lucide-react` importées, plusieurs probablement inutilisées (`Globe`, `Languages`, `Mic`, `Palette`, `Smile`, `Sprout`, `Stethoscope`, `Search`…). |
| 73-74 | — | Bon : `DailyChallengeCard` seulement si `signedIn && !visitorChildId`. |

**Instruction pour Gemini :** « Gemini, découpe `QuotidienView.tsx` en `DailyProgram.tsx`, `QuickLinks.tsx`, `WorkshopCards.tsx` (données issues de `games-map-data.ts` par `id`, pas par index), `CitizenCharter.tsx` (règles en constante de module, `aria-pressed`, `<button>`). Garde `Math.max(1, max)` avant la division. Ajoute `role="progressbar"` aux barres. »

### `sections/ParentLinkBanner.tsx`, `index.ts`

| Fichier | Lignes | Crit. | Problème |
|---|---|---|---|
| `ParentLinkBanner.tsx` | 21-45 | MINOR | Bandeau école : `role="region"` avec `aria-label`, bien. |
| idem | 48-111 | MAJOR | Bandeau « Mode Consultation » : `<aside role="status" aria-live="polite">` en `position: fixed` à 999 999 de z-index, qui masque le bas de page (boutons, notifications) ; non réduit sur mobile (`gap: 20`, `padding: 12px 24px` sur une ligne). |
| idem | 100-107 | MINOR | Survol par mutation de `style`. |
| `DashboardClient` | — | MINOR | `ParentLinkBanner` est rendu deux fois (lignes 754 et 930), l'un pour le mode visiteur, l'autre pour l'école. |
| `index.ts` | — | MINOR | Réexporte `DashboardNavbar` par défaut (composant inutilisé). |

### `components/LinkChildModal.tsx`, `NavKidIcon.tsx`, `ChildProfileView.tsx`

| Fichier | Lignes | Crit. | Problème |
|---|---|---|---|
| `LinkChildModal.tsx` | tout | — | **Bon modèle d'accessibilité** : `role="dialog" aria-modal aria-labelledby`, focus initial et restitution, Échap, `aria-invalid`/`aria-describedby`, `role="alert"`. |
| idem | 28-34 | MINOR | `close` recréé à chaque rendu → l'effet `keydown` se ré-abonne à chaque rendu ; pas de focus trap complet (Tab peut sortir de la modale). |
| idem | 57 | MINOR | `onMouseDown` sur l'arrière-plan : fermeture par clic-glisser accidentel. |
| `NavKidIcon.tsx` | 6, 14 | MINOR | Nom `arcade` dans le type et la table d'icônes alors que l'onglet arcade n'existe plus (code mort après la refonte). |
| `ChildProfileView.tsx` | 83 | MINOR | `(acc: number, val: any)` : `any` explicite. |
| idem | 40 | MINOR | `userId` initialisé à `1` : un identifiant factice peut être affiché avant le chargement. |
| idem | 61-96 | MAJOR | Deux `fetch` dans le même effet, sans `AbortController` ; `/api/progress` traité avec `.catch(() => {})` sans signal à l'utilisateur. |
| idem | 9 | MINOR | `import "../../profile/profile.css"` : feuille d'un autre module importée depuis le dashboard. |
| idem | 385 | MINOR | Chemin `/palou/PalouMain.png` (doublon `/palou/` vs `/images/palou/`). |
| idem | 136-140 | MINOR | `computeEarnedBadges` côté client avec `perfectStreak`/`errorCount` absents → badges `b_detective`/`b_persist` éventuellement non calculés dans le profil alors qu'ils le sont dans le dashboard (incohérence). |
| idem | 394-405 | — | Bon : sélecteur d'avatar `role="dialog"`, `aria-pressed`. |

### `classement/page.tsx`

| Lignes | Crit. | Problème |
|---|---|---|
| 12-15 | MINOR | Appelle directement la fonction `DashboardPage` d'une autre route (`DashboardPage({ params: Promise.resolve(...) })`) : fonctionne, mais fragile (contrat de `params` non typé) ; crée une seconde route `/dashboard/classement` qui masque la capture par `[[...slug]]`. |
| 4-6 | MINOR | `metadata` défini ici mais pas pour les autres onglets. |

### `games/` (3 791 lignes)

| Fichier | Lignes | Crit. | Problème |
|---|---|---|---|
| `GestureCameraGame.tsx` | 40-50 | MAJOR | **Ressources tierces chargées à l'exécution pour un public d'enfants** : WASM de MediaPipe depuis `cdn.jsdelivr.net` et modèle depuis `storage.googleapis.com`. Fuite de l'adresse IP de l'enfant vers deux tiers, dépendance à leur disponibilité, aucune intégrité (SRI), blocable par une CSP. À héberger en local (`/public/mediapipe/`). |
| idem | 142 | — | Bon : `getUserMedia({ video: true, audio: false })`, arrêt des pistes au démontage, inférence locale (aucune image envoyée). |
| idem | 86-89 | MAJOR | `inferenceTime.current += 16` : horloge **simulée** (16 ms par trame) au lieu de `performance.now()`. Le temps de maintien de « 1 000 ms » vaut en réalité 62 trames : sur un écran 30 Hz il faut 2 s, à 144 Hz moins de 0,5 s. |
| idem | 98-106 | MINOR | « Pouce vers le bas » joue `playFeedbackSound(true)` (son de réussite). |
| idem | 118-124, 131-138 | MAJOR | Effets sans toutes les dépendances (`detectGestures` recréée à chaque rendu, valeurs `done` périmées) ; `setTimeout(() => onComplete(3), 1500)` non nettoyé. |
| idem | 37-57 | MAJOR | `loadModel` : si le composant est démonté pendant le chargement, `recognizer.current` est affecté après le nettoyage ; erreur seulement dans `console.error` (le jeu reste bloqué sur « chargement » sans message à l'enfant). |
| idem | 142-150 | MAJOR | Permission caméra : message d'échec, mais aucune explication préalable ni consentement parental avant la demande de caméra (public enfant). |
| `DrawingGuessGame.tsx` | 106-160, 326-366 | MAJOR | « L'IA de Palou » est une **heuristique codée en dur** sur les pixels (13 formes avec des règles de proportion). Si aucune forme n'est détectée, elle retombe sur une **réponse inventée** (« un arbre », « Palou a analysé la géométrie… »). Présenté comme de l'analyse alors que c'est une valeur par défaut. |
| idem | 83-105 | MAJOR | `setPointsCount` et `setBounds` à **chaque événement `pointermove`** : un rendu par point tracé. Le suivi des bornes devrait être dans une `useRef`. Pas de `setPointerCapture` ; `onPointerLeave` coupe le trait quand le doigt sort. |
| idem | 532-540 | MINOR | `<canvas>` sans `aria-label` ni description (8 `aria-` dans le fichier mais pas sur le canvas) ; pas de `touch-action: none` dans le fichier (défini dans `kids-shared.css:2044`). |
| idem | 768-1197 | MINOR | Effet d'appui par `onMouseDown/Up` sur 7 boutons. |
| `ModelTrainingGames.tsx` | 26-45 | MAJOR | `TrainYourModelGame` : `accuracy = Math.min(96, 30 + total * 5)` : la « précision du modèle » est une **formule**, pas une mesure. L'enfant apprend un résultat simulé comme s'il était réel. |
| idem | tout | CRITICAL | 5 jeux dans un fichier de 1 033 lignes, 80 styles inline, `aria-` : 0, `role` : 0, `useEffect` : 0, 5 `setTimeout` non nettoyés. |
| idem | 243-418 | MINOR | `ChatbotBuilderGame` : les « réponses du chatbot » sont des règles locales (pas d'appel IA) : correct, mais à indiquer comme simulation. |
| `ImageTrainingGame.tsx` | tout | MINOR | 298 lignes, 17 styles ; `setTimeout` non nettoyé. |
| `VoiceAssistantGame.tsx` | 380-387 | MINOR | `speechSynthesis` utilisé avec test de support (bien) ; `aria-` : 0 sur 54 styles inline. |
| `sound.ts` | 11-28 | MAJOR | Un `AudioContext` par son (4e implémentation du même utilitaire). |
| `index.ts` | — | — | Propre. |
| tous | — | MAJOR | L'événement global `levelProgress` est émis par au moins 4 jeux (`Gesture`, `Drawing`, `Memory`…) et consommé par `DashboardClient:321` avec un `any` : bus d'événements non typé. |

**Instructions pour Gemini :**
1. « Gemini, héberge les fichiers MediaPipe (WASM et `gesture_recognizer.task`) dans `public/mediapipe/` et remplace les deux URL externes. Utilise `performance.now()` pour la durée de maintien. Affiche un message d'erreur si le modèle ne se charge pas. Ajoute un écran d'information avant la demande de caméra (« la vidéo reste sur ton appareil »). Nettoie le `setTimeout` final. »
2. « Dans `DrawingGuessGame.tsx`, garde `bounds`/`pointsCount` dans des `useRef`. Utilise `setPointerCapture`. Remplace la réponse par défaut « un arbre » par un message honnête (« Je n'arrive pas à deviner, aide-moi ») et indique à l'enfant que Palou utilise des règles simples. »
3. « Dans `ModelTrainingGames.tsx`, libelle la précision comme « estimation de l'exercice » ou calcule-la avec un vrai jeu de test. Éclate le fichier en 5 fichiers, ajoute `aria-live` et des alternatives clavier. »
4. « Remplace `games/sound.ts` par `utils/sounds.ts` et l'événement `levelProgress` par un callback `onProgress(ratio)` typé. »

### Ordre de correction de la passe 5a
1. Confidentialité : ressources MediaPipe externes pour les enfants ; consentement avant caméra.
2. Honnêteté pédagogique : précision simulée, devinette de dessin par défaut, horloge simulée de 16 ms.
3. Accessibilité : `role="banner"` dans `main`, `aria-current`, boutons `span role="button"` sans `preventDefault`, nom accessible du bonus secret, barres sans `role="progressbar"`.
4. Nettoyage : lien « Suivi Enfants », `DashboardNavbar` par défaut, `arcade` dans `NavKidIcon`, `ParentLinkBanner` en double.
5. Découpage : `QuotidienView` (718), `ModelTrainingGames` (1 033), `DrawingGuessGame` (1 207).
## MODULE 8 : `frontend/app/dashboard/`, passe 5b : `programmation/` et `parcours79/`

> Lecture : `programmation/ScratchEmbed.tsx` (lignes 1-200 en entier, le reste par extraits), `programmation/ProgrammingAtelier.tsx` (lignes 1-60 et extraits ciblés), `blocklyInterpreter.ts` (début), `parcours79/voice.ts`, `settings.ts`, `content.ts`, `logic.ts` en entier ; `fx.ts` en entier. **Non relus ligne à ligne** : `ProgrammingAtelier.tsx` (reste), `IsoBoard.tsx`, `parcours79/LessonPlayer79.tsx`, `Scene79.tsx`, `activities.tsx`, `ModuleMap79.tsx`, `DailyChallenge79.tsx`, `Adventure79.tsx` (comptages par grep et extraits). `parcours79/` est le **module le plus propre** du dossier (logique pure testée, ARIA présent, annulation des clips audio).

### `programmation/ScratchEmbed.tsx`

| Lignes | Crit. | Problème |
|---|---|---|
| ≈ 330-369 | CRITICAL | `<iframe src="/scratch/index.html">` **de même origine**, sans attribut `sandbox`, avec `allow="camera; microphone; display-capture; fullscreen"`. Le code de Scratch (139 Mo servis depuis `public/scratch`, dont les extensions et `extension-worker.js`) s'exécute dans l'origine de l'application : tout script chargé par un projet Scratch ou une extension a le même accès réseau (cookies de session, `fetch /api/...` avec l'en-tête CSRF ajouté par `csrf-fetch.tsx`) que l'application. À isoler : sous-domaine dédié ou `sandbox="allow-scripts allow-forms allow-popups"` sans `allow-same-origin` si Scratch le supporte, et retirer `camera; microphone; display-capture` (public enfant ; `Permissions-Policy` bloque déjà le micro). |
| 17-23, 25-31 | MINOR | `requestFullscreen?.()` sans `catch` : promesse rejetée non rattrapée sur Safari/iOS. |
| 33-38 | MINOR | « Recommencer » recharge l'iframe sans confirmation : le projet en cours est perdu. |
| 40-52 | CRITICAL | Plein écran en `position: fixed; zIndex: 99999` sans `role="dialog"`, sans Échap, sans focus ; le bouton « Quitter Scratch » est rouge sans indication de perte de travail. |
| 54-180 | MAJOR | 40 `style={{}}` pour une barre d'outils ; boutons sans `aria-label` explicite (icône + texte, acceptable) ; `title` seul sur « Recharger l'éditeur ». |
| 196-250 | MINOR | `<style>` du squelette de chargement injecté à chaque ouverture ; 120 lignes de faux squelette de l'éditeur. |
| `next.config.ts` | MAJOR | `frame-src 'self' https://scratch.mit.edu` : l'iframe est locale, la source `scratch.mit.edu` n'est pas utilisée → à retirer (surface inutile). |

**Instruction pour Gemini :** « Gemini, dans `ScratchEmbed.tsx`, retire `camera; microphone; display-capture` de l'attribut `allow`. Étudie l'hébergement de Scratch sur un sous-domaine séparé (ou `sandbox` sans `allow-same-origin`) et vérifie qu'aucun cookie ni jeton n'est accessible au code de l'éditeur. Ajoute `role="dialog" aria-modal="true" aria-label`, Échap (avec confirmation si un projet est en cours) et capture le rejet de `requestFullscreen`. »

### `programmation/ProgrammingAtelier.tsx` (854 lignes)

| Lignes | Crit. | Problème |
|---|---|---|
| 264-854 | MAJOR | Composant principal de 590 lignes, 22 `useState`, 7 `useEffect`, niveaux (`LEVELS`), décor, exécution, tutoriel, atelier Scratch. |
| 20-31 vs `types.ts` | MAJOR | Types redéfinis dans le fichier (`BlockType` à 7 valeurs) alors que `programmation/types.ts` en définit d'autres (5 valeurs) : **`types.ts` n'est importé par personne** (code mort et divergent). |
| 229-262 | MINOR | `chaseNode` : copie de celle de `GamesMapView.tsx:266` (deux implémentations du même défilement). |
| 32-88 | MINOR | Niveaux de jeu codés dans le composant (à déplacer dans `programmation/levels.ts` ou JSON). |
| 170-179, 328 | MINOR | `setTimeout(..., 4000)` (lignes 175 et 328) sans nettoyage. |
| 307, 319 | — | Bon : lecture/écriture `localStorage` dans `try/catch`. |
| 5-12 | — | Bon : `@dnd-kit` avec `KeyboardSensor` et `sortableKeyboardCoordinates` (glisser-déposer accessible au clavier). |
| 495, 822 | MINOR | Seulement 2 attributs `aria-` dans le fichier : le plateau et l'état d'exécution ne sont pas annoncés. |
| 1-3 | MINOR | `<img>` ×6 sans dimensions. |

### `programmation/IsoBoard.tsx`, `blocklyInterpreter.ts`

| Fichier | Crit. | Problème |
|---|---|---|
| `blocklyInterpreter.ts` | — | **Bon fichier** : interpréteur pur sans `new Function`, budget `MAX_STEPS = 5000`, `MAX_REPEAT = 1000`, testé (`tests/blockly-interpreter.test.mjs`). |
| `IsoBoard.tsx` | MINOR | SVG isométrique de 120 lignes, constantes magiques (`CELL`, `EDGE`, `GRID`, `PAD`) ; sans `role="img"`/`aria-label` pour décrire la position de Palou. |

### `parcours79/` : `voice.ts`, `settings.ts`, `content.ts`, `logic.ts`, `fx.ts`

| Fichier | Lignes | Crit. | Problème |
|---|---|---|---|
| `content.ts` | 1-12 | MAJOR | Les **10 chapitres JSON (≈ 230 Ko) sont importés statiquement** dans le code client (`import chapter01 from "…/m01.json"`…), donc embarqués dans le bundle du dashboard pour tous les âges (aussi pour les 10-15 ans). À charger par chapitre via `import()`. |
| `content.ts` | 22-26 | MAJOR | La relecture du contenu est conditionnée par `process.env.NEXT_PUBLIC_REQUIRE_REVIEWED_CONTENT === "true"`, variable **de build** : si elle est absente à la construction, **des leçons non relues par des enseignants sénégalais sont servies aux enfants**. Le défaut devrait être « relu obligatoire », ou la variable vérifiée par le script de build (`validate-artifact.sh`). |
| `content.ts` | 31 | MINOR | `as unknown as ChapterContent[]` : double cast qui désactive la vérification de schéma des JSON (la vérification est faite côté Django par `check_parcours79`). |
| `content.ts` | 28-32 | MINOR | `LEGACY_PLAYABLE` : ensemble vide, code mort. |
| `settings.ts` | 136-141 | MINOR | État global de module (`let current`) lu hors de React par `voice.ts` : cohérent, mais contourne le cycle de rendu ; `read()` ne se fait qu'après le premier rendu (`useEffect`) : les premiers sons peuvent ignorer le réglage de l'enfant. |
| `settings.ts` | 151 | MINOR | Accolade fermante collée à la dernière propriété (formatage). |
| `voice.ts` | 18-39 | MINOR | `getVoices()` souvent vide au premier appel (chargement asynchrone) : `pickVoice()` renvoie `null` et la voix par défaut est utilisée ; pas d'écouteur `voiceschanged`. Le choix de voix par heuristique de nom reste fragile. |
| `voice.ts` | 61-79 | — | Bon : annulation propre des clips (`lessonToken`, `cancelLessonClip`), repli sur la synthèse si un fichier manque. |
| `voice.ts` | 8-9 | MINOR | `speak()` reste actif quand la voix officielle n'existe pas (la voix du navigateur « timbre d'enfant » est une imitation) ; cohérent avec le choix produit. |
| `logic.ts` | tout | — | **Bon fichier** : fonctions pures, testées, `computeMap` sans effet de bord. |
| `logic.ts` | 330-337 | MINOR | `speakable` retire les emojis par plages Unicode (`\u{1F300}-\u{1FAFF}`) : les emojis récents hors plage sont lus. |
| `fx.ts` | 1-8 | MINOR | `disableForReducedMotion` laissé à `false` **volontairement** (« les jeux d'enfants doivent bouger ») : choix produit assumé, mais il ignore la préférence système de l'enfant ou de ses parents (voir constat T3). Proposer un réglage « animations réduites » dans `settings.ts`. |
| `fx.ts` | 11-16 | MINOR | `navigator.userAgent.includes("jsdom")` : branchement sur l'environnement de test dans le code de production. |

**Instruction pour Gemini :** « Gemini, dans `content.ts`, remplace les 10 imports statiques par une fonction asynchrone `loadChapter(moduleId)` avec `import()` dynamique et un cache, et adapte `getLessonContent`/`isPlayable` (ou fournis un index léger des identifiants jouables généré au build). Inverse le défaut de `REQUIRE_REVIEW` (relu obligatoire sauf `NEXT_PUBLIC_ALLOW_UNREVIEWED_CONTENT=true` en développement) et fais échouer le build si la variable est absente. Ajoute un réglage « animations réduites » dans `settings.ts` et utilise-le dans `fx.ts`. »

### `parcours79/` : composants

| Fichier | Crit. | Problème |
|---|---|---|
| `Adventure79.tsx` (263) | MAJOR | **Jamais importé** (code mort) ; il importe `DailyChallenge79` (170 lignes) qui n'est donc lui non plus jamais rendu, ainsi que `adventure79.css` (220 lignes). `DailyChallenge79` appelle `/api/daily-riddle` alors que le dashboard utilise `/api/daily-challenge` : **deux systèmes de défi quotidien** (un des deux endpoints est probablement orphelin). Ces fichiers sont ceux que la refonte arcade a laissés derrière elle. |
| `LessonPlayer79.tsx` (411) | MINOR | Fichier long mais structuré : 11 `useState`, 12 `aria-`, `role` ×5, `role="img"` avec `aria-label` sur les étoiles. Dépendances de l'effet ligne 162 : 14 valeurs (fragile). Cases à cocher natives pour les réglages (bien). |
| `LessonPlayer79.tsx` | MINOR | Aucun `<img>` brut : passe par `Img79`/`PalouImg`. |
| `ModuleMap79.tsx` (421) | — | 22 `aria-`, `localStorage` dans `try/catch` (lignes 144-148). |
| `activities.tsx` (413) | MINOR | 22 `useState`, `@dnd-kit` ; 17 `aria-`. Bon niveau d'accessibilité. |
| `Scene79.tsx` (325) | MINOR | Pur SVG, 2 `aria-` seulement. |
| `DailyTip79.tsx` | — | Bon : `setInterval` nettoyé (`clearInterval`), `localStorage` dans `try/catch`. |
| `sound.ts` | MINOR | Troisième utilitaire sonore Web Audio du dépôt (3 `AudioContext`). |
| `carnet.ts` | MINOR | `localStorage.getItem/setItem` (lignes 19 et 31) : à vérifier que les appels sont dans un `try/catch` (non visible dans le comptage). |
| `Icons79.tsx`, `Trophy79.tsx`, `LessonUnavailable79.tsx`, `Img79.tsx`, `tips79.ts` | — | Petits composants cohérents. |
| `parcours79.css` (525), `adventure79.css` (220) | MINOR | Préfixe `p79-` : bon cloisonnement ; `adventure79.css` mort avec `Adventure79`. |

**Instruction pour Gemini :** « Gemini, vérifie par grep qu'aucun fichier n'importe `Adventure79.tsx`, puis supprime `Adventure79.tsx`, `DailyChallenge79.tsx` et `adventure79.css`. Demande au backend si `/api/daily-riddle` est encore utilisé ; sinon marque-le comme à supprimer. Unifie `sound.ts` de `parcours79`, `utils/sounds.ts`, `games/sound.ts` et `dashboardShared.tsx` en un seul module. »

### Ordre de correction de la passe 5b
1. **Sécurité** : isolation de l'iframe Scratch (même origine, `allow` camera/microphone/display-capture) ; défaut du drapeau « contenu relu ».
2. **Performance** : 10 JSON de chapitres (≈ 230 Ko) dans le bundle ; 139 Mo de Scratch dans `public/`.
3. **Nettoyage** : `Adventure79`, `DailyChallenge79`, `adventure79.css`, `programmation/types.ts`, `LEGACY_PLAYABLE`, deux défis quotidiens.
4. **Cohérence** : unification des utilitaires sonores et du défilement (`chaseNode` ×2) ; réglage « animations réduites ».
## MODULE 9 : autres espaces de `frontend/app/` (`connexion/`, `profile/`, `parent/`, `school/`, `_scolaire/`, `_space/`, `admin/`, `ecole/`, `enseignant/`)

> **Couverture, dite sans détour.** Ces neuf dossiers représentent environ 15 000 lignes. Je les ai traités ainsi :
> - **Lus en entier** : `connexion/*` (sauf les CSS), `profile/ProfileClient.tsx` et `page.tsx`, `parent/layout.tsx` et `relier/*`, `school/[slug]/page.tsx`, `_scolaire/lib/http.ts`, `useApi.ts`, `parentLinks.ts`, `whatsapp.ts`, `identifiers.ts`, `importing.ts`, `_scolaire/ui/CredentialsModal.tsx`, le début de `ui.tsx`, `ecole/_components/certificats/CertificatesPrintView.tsx`, début de `enseignant/programme/[lessonId]/page.tsx`, les trois `layout.tsx` d'espace.
> - **Mesurés par un script** (lignes, `any`, `dangerouslySetInnerHTML`, `window.open`, stockage, `useEffect`, mémoïsation, ARIA, `<img>`, styles inline, clés par index, timers, `eslint-disable`) sur **134 fichiers** de `admin/`, `ecole/`, `enseignant/`, `_scolaire/`, `_space/`.
> - **Seulement balayés par grep** : `admin/_components/StudioAdminView.tsx` (structure, états, appels), `ecole/_components/import/ImportWizard.tsx`, `LogoEditorModal.tsx`, `CertificateDocument.tsx`.
> - **Non lus** : le détail ligne à ligne de `admin/_components/*` (hors Studio), `ecole/_components/*` (hors ceux cités), `enseignant/_components/*`, `_scolaire/ui/*` (hors `CredentialsModal`, début de `ui.tsx`), `_scolaire/lib/*Api.ts` hors ceux cités, les CSS (`scolaire.css` 3 851 lignes, `profile.css`, `connexion*.css`).
>
> **Qualité générale observée** : ces espaces sont nettement plus propres que `dashboard/` : 0 `any`, 0 `dangerouslySetInnerHTML`, 0 `eslint-disable`, 403 attributs ARIA/`role`, un seul hook de chargement (`useApi`) avec annulation, un client d'API unique (`http.ts`), des composants d'interface communs accessibles (`ui.tsx`). Les points ci-dessous sont donc surtout des incohérences et des doublons.

### Constats transversaux

| # | Constat | Criticité |
|---|---|---|
| O1 | **Le Studio de contenus (`/admin/studio`) édite des données que l'espace élève ne lit pas.** Les routes `superadmin/curriculum/*` écrivent en base ; l'espace élève lit `lms-data.ts` (statique), `content/parcours79/*.json`, `curriculum-10-12.ts`, `curriculum-13-15.ts`. Le seul appel à `/api/curriculum/` côté élève est le glossaire (`DictionaryView`). Le client `services/curriculum-api.ts` qui lirait `overview/tracks/lessons` n'est importé nulle part. L'espace enseignant (`getLessonSheet`) lit en revanche la base : **le guide de l'enseignant peut différer de ce que voit l'élève**. À confirmer avec vous : c'est peut-être l'étape suivante prévue de la refonte. | CRITICAL |
| O2 | **Trois parcours d'inscription d'un enfant** : `ParentDashboardView` (`/api/parent/children/`, identifiant généré, âge saisi), `ProfileClient` (`/api/profiles`, e-mail et mot de passe saisis par ligne, tranche d'âge choisie), et la liaison par code école (`LinkChildModal`, `LinkChildView`). Les règles diffèrent (e-mail requis ou non, âge ou tranche). | MAJOR |
| O3 | Deux composants de liaison par code (`LinkChildModal` accessible, `LinkChildView` sans focus ni normalisation du code) qui appellent la même API. | MINOR |
| O4 | Aucun `middleware.ts`/`proxy.ts` Next : la protection des routes repose sur les `layout.tsx` (`requireLocalUser`) et sur l'API. Cohérent mais **`admin` n'utilise que `role === "admin"`** alors que `/dashboard` et `admin-auth.ts` acceptent aussi l'e-mail listé dans `KEUR_ADMIN_EMAILS` (voir module 2). | MAJOR |
| O5 | Styles inline : 769 `style={{}}` dans ces 134 fichiers (169 dans `StudioAdminView`), alors que `scolaire.css` (3 851 lignes) fournit déjà les classes `ec-*`. | MINOR |

### `connexion/` (680 lignes)

| Fichier | Lignes | Crit. | Problème |
|---|---|---|---|
| `ConnexionClient.tsx` | 95, 155-158, 174, 198 | MAJOR | Le mot de passe d'un compte désactivé est **conservé dans l'état React** (`pendingPassword`) le temps du parcours de réactivation et renvoyé deux fois à `request-reactivation`. Effacé dans `enterSpace`/`go`, mais présent en mémoire pendant plusieurs écrans. Préférer un jeton de réactivation renvoyé par le serveur après la première vérification. |
| idem | 145 | MINOR | `expectedRole` envoyé par le client (le serveur le revérifie : OK). |
| idem | 106-112 | MINOR | `window.location.assign(destination)` : `returnTo` est assaini par `safeReturnTo` dans `page.tsx`, mais `destinationFor` n'est pas lui-même validé (voir module 2 pour les variantes encodées). |
| idem | 269-274 | MAJOR | `role="tablist"` / `role="tab"` sans `role="tabpanel"`, `aria-controls`, ni navigation par flèches : sémantique incomplète. |
| idem | 282-304 | MINOR | Vue « réactivation » avec 8 `style` inline de 150 caractères dans le composant principal : à extraire en `ReactivateView`. |
| idem | 243 | MINOR | `<a href="/connexion">` au lieu de `Link` (rechargement complet) ; `<img>` du logo sans dimensions. |
| idem | 86-320 | MINOR | 11 `useState` + 7 fonctions asynchrones dans un composant de 235 lignes : un `useReducer` ou une machine à états (`view`) clarifierait. |
| `ParentRegisterForm.tsx` | 208-215 | MAJOR | **Une seule case** pour les conditions, la politique de confidentialité **et** le consentement parental à l'usage par l'enfant : le consentement n'est pas granulaire (RGPD/COPPA : le consentement parental devrait être une case distincte, journalisée). |
| idem | 193-196 | MINOR | Téléphone obligatoire à l'inscription d'un parent « pour que l'école puisse le joindre » : collecte de donnée personnelle à justifier (minimisation) quand l'enfant n'est pas rattaché à une école. |
| `authApi.ts` | 40-55 | MINOR | Règles de mot de passe et de téléphone **dupliquées** côté client et serveur (commentaire « même règle que le serveur ») : risque de dérive. |
| `LoginForm.tsx`, `RecoveryForms.tsx`, `PasswordInput.tsx` | tout | — | **Bons composants** : labels englobants, `autoComplete` corrects (`username`, `current-password`, `new-password`, `one-time-code`), `aria-pressed` sur l'œil du mot de passe, `inputMode`, `pattern`. |
| `RecoveryForms.tsx` | 138 | MINOR | `pattern="\d{6}"` sans message d'erreur personnalisé (`title`). |
| `page.tsx`, `admin/page.tsx` | 9-23 | — | Bon : redirection des utilisateurs déjà connectés, `robots: noindex` sur l'admin, `safeReturnTo`. |
| `robots.ts` (module 2) | — | MINOR | `/connexion` est listé dans `disallow` : cela révèle aussi l'existence de `/connexion/admin`. |

**Instruction pour Gemini :** « Gemini, dans `ParentRegisterForm.tsx`, sépare la case `acceptTerms` (conditions + confidentialité) de la case `parentalConsent` (consentement parental), envoie les deux au serveur et demande au backend de les journaliser avec la date. Dans `ConnexionClient.tsx`, demande au serveur de renvoyer un jeton court pour la réactivation et supprime `pendingPassword`. Extrais `ReactivateView`. Complète la sémantique d'onglets (`tabpanel`, `aria-controls`, flèches). »

### `profile/`

| Fichier | Lignes | Crit. | Problème |
|---|---|---|---|
| `ProfileClient.tsx` | 78-93, 178-190 | MAJOR | Formulaire d'inscription d'élèves en lot : **mot de passe de chaque enfant saisi en clair dans l'état** (`row.password`), e-mail obligatoire pour l'enfant, tranche d'âge choisie à la main. Voir O2. |
| idem | 10-13, 36-48 | MINOR | `fetch` sans `AbortController` ; deux `fetch` en cascade. |
| idem | 21 | MINOR | Prop `signOutUrl` déclarée, jamais utilisée. |
| idem | 14, 132, 148 | MINOR | `roleLabel[role] \|\| "Parent"` : un rôle inconnu (ex. `admin_ecole`) s'affiche comme « Parent ». |
| idem | 178-190 | MINOR | `key={i}` sur des lignes supprimables. |
| idem | 95-111 | MINOR | `sidebar` et `topBar` définis comme JSX dans le composant (recréés à chaque rendu) : à extraire. |
| idem | 164-165 | MINOR | Messages d'inscription d'élèves sans `role="status"`/`role="alert"` (les messages du profil en ont). |
| idem | 97 | MINOR | `<img>` du logo sans dimensions. |
| `page.tsx` | — | — | Bon : `requireLocalUser`, redirection des élèves. |

### `parent/` et `school/`

| Fichier | Lignes | Crit. | Problème |
|---|---|---|---|
| `parent/layout.tsx` | 8-14 | — | Bon : accès réservé aux parents. |
| `parent/relier/LinkChildView.tsx` | 20-28 | MINOR | Pré-remplissage du code depuis `?code=` via `window.location.search` dans un effet (`useSearchParams` ou `searchParams` serveur suffirait). Un code de liaison placé dans l'URL reste dans l'historique du navigateur et peut fuiter par `Referer` (atténué par `strict-origin-when-cross-origin`). |
| idem | 35, 68 | MINOR | Envoie `form.code` brut (`K7P-4Q2`) alors que `LinkChildModal` envoie le code compacté et en majuscules. Pas de validation de longueur ni `inputMode`. |
| `school/[slug]/page.tsx` | 43-46 | MAJOR | Les couleurs de l'école (`primaryColor`, `secondaryColor`, `accentColor`) venues du backend sont injectées telles quelles dans des variables CSS (`style`). Si le backend ne les valide pas comme hexadécimaux, une valeur contenant `url(…)` pourrait provoquer une requête externe. Utiliser `schoolThemeVars()` (qui valide l'hexadécimal) comme `DashboardClient`. |
| idem | 57, 69, 86 | MINOR | `<a href>` vers `/dashboard?school=…` au lieu de `Link` ; pas de `generateMetadata` (titre = nom de l'école) ni d'Open Graph pour une page publique partagée. |
| idem | 32-34, 89-91 | MINOR | Les parcours affichés viennent de `lms-data.ts` (statique) : le nombre de modules peut diverger de la base (O1). |
| idem | 17-19 | MINOR | `fetch` Django sans délai d'attente. |

### `_scolaire/lib` et `_scolaire/ui`

| Fichier | Lignes | Crit. | Problème |
|---|---|---|---|
| `http.ts` | 34-38 | MINOR | Sur 401 : `window.location.assign` puis `throw` ; pas de purge locale de l'état (compte précédent) avant redirection. Aucune méthode `PUT` (le reste du code utilise `PUT /api/profile` via `fetch` direct) : deux manières d'appeler l'API. |
| `http.ts` | 20-46 | MINOR | Pas de `AbortSignal` ni de délai : une requête qui pend bloque l'écran de chargement. |
| `useApi.ts` | 74-86 | MAJOR | Piège d'usage : `load` doit être stable (`useCallback`), sinon boucle de requêtes infinie. Aucune garde ni avertissement ; pas d'`AbortController`. Un `useApi(() => api.get(...))` oublié produit un flot de requêtes. |
| `identifiers.ts` | 233-252 | MAJOR | `generateTemporaryPassword` (10 mots × 9 000 nombres ≈ 16 bits d'entropie, biais de modulo) et `generateStudentLogin` sont **du code mort** : la génération est désormais côté serveur. À supprimer pour qu'un futur développeur ne les réutilise pas : ces mots de passe seraient trop faciles à deviner pour des identifiants prévisibles `prenom.nom@ecole.keuria.sn`. |
| `whatsapp.ts` | 195-210 | MINOR | Le mot de passe provisoire est placé dans un lien `https://wa.me/…?text=…` : transmis à WhatsApp/Meta et conservé dans l'historique du navigateur. Acceptable comme choix métier, à documenter et à rendre optionnel (envoyer seulement le code parent + l'identifiant). |
| `parentLinks.ts`, `importing.ts` | — | — | Bons : documentation des règles serveur, parseur CSV RFC 4180 testable, limite de 5 Mo, dates validées en UTC. |
| `importing.ts` | 37 | MINOR | `.pdf` accepté pour l'import (extraction côté serveur) : surface d'attaque plus large que CSV/XLSX ; vérifier les limites serveur (taille, nombre de pages, bibliothèque). |
| `CredentialsModal.tsx` | 25-35, 82 | MINOR | `setTimeout` de 2 s non nettoyé ; `window.location.host` lu dans le rendu (OK car rendu après action). Message « ne sera plus jamais affiché » : bon. |
| `ui.tsx` | tout | — | **Bonne bibliothèque** : `PageHeader` (un seul `h1`), `ErrorMessage role="alert"`, `DataTable` avec légende et clavier, `Modal`/`ConfirmModal`. |
| `CertificateDocument.tsx` | 40-53 | MINOR | Logo de l'école en `<img src={school.logoUrl}>` : si `logoUrl` est une URL externe, la CSP (actuellement en mode rapport) la bloquera quand elle sera durcie ; si c'est une data URL PNG, elle est incluse dans chaque réponse d'API. |
| `LogoEditorModal.tsx` | 89-90 | — | Bon : l'image est redessinée sur un canvas puis exportée en PNG (neutralise un SVG ou un fichier piégé). Mais le résultat est une `data:` URL (base64) envoyée au serveur : lourd. |
| `ecoleApi.ts`, `superadminApi.ts`, `enseignantApi.ts` | — | MINOR | Non relus ligne à ligne. 3 fichiers d'API de 220 à 290 lignes avec `types.ts` (289 lignes) : vérifier la duplication de types avec `app/types/curriculum.ts`. |

### `admin/`, `ecole/`, `enseignant/`

| Fichier | Lignes | Crit. | Problème |
|---|---|---|---|
| `admin/layout.tsx`, `ecole/layout.tsx`, `enseignant/layout.tsx` | — | — | Bon : `requireLocalUser` + test de rôle (+ `schoolId` pour l'école et l'enseignant). L'API revérifie. |
| `admin/layout.tsx` | 14 | MAJOR | `user.role !== "admin"` : incohérent avec `/dashboard` (`isAdminEmail`). Un compte « admin par e-mail » est admin dans le dashboard mais refusé ici (voir O4). |
| `admin/_components/StudioAdminView.tsx` | 1-1630 | CRITICAL | Fichier de 1 630 lignes : `ComputerPreviewModal` (≈ 557 lignes, lignes 41-597), `ModuleModal` (≈ 110), `LessonEditorModal` (≈ 436), `StudioAdminView` (≈ 485) ; 169 `style={{}}` ; 3 `useEffect` ; aucune mémoïsation. À éclater en 4 fichiers. |
| idem | 41-597 | MAJOR | `ComputerPreviewModal` reproduit en local l'aperçu de leçon (étapes, quiz, synthèse vocale `speechSynthesis` ligne 76-83 sans test de support) : troisième implémentation d'un lecteur de leçon (avec `PilotLessonPlayer`, `StandardLessonPlayer`, `LessonPlayer79`). Aucune garantie que l'aperçu ressemble à ce que verra l'élève. |
| idem | 1020, 410 | MINOR | `key={idx}` sur des listes éditables (réordonnables) : l'état des champs peut se déplacer à la suppression d'une ligne. |
| idem | 1185 | MINOR | `useEffect` de chargement sans `useApi` ni annulation. |
| `ecole/_components/import/ImportWizard.tsx` | 1-498 | MAJOR | 498 lignes, 76 `style={{}}`, `setTimeout` avec `clearTimeout` (bien). Import XLSX/PDF lu **côté serveur** (`readExcelFile`), CSV côté client. Les données d'élèves (mineurs) transitent par le navigateur : bien. À vérifier : taille et nombre de lignes maximum. |
| `ecole/_components/years/ClosureWizard.tsx` | 106-117 | MAJOR | Téléchargement d'un CSV de bilan (`getYearArchive`) : si le serveur n'**échappe pas** les cellules commençant par `=`, `+`, `-`, `@` (noms d'élèves, résultats), ouverture dans Excel = **injection de formules**. À vérifier côté backend. |
| `ecole/_components/DashboardView.tsx` | 1-411 | MINOR | 71 `style={{}}`, 4 `key={i}` ; 18 attributs ARIA (bien). |
| `ecole/_components/certificats/CertificatesPrintView.tsx` | 24-92 | MINOR | Chargement manuel en `useEffect` (pas de `useApi`), `getClassroom` charge tous les élèves de la classe pour imprimer ; pas de pagination ni de limite (classe de 60 élèves = 60 certificats dans le DOM). |
| `enseignant/programme/[lessonId]/page.tsx` | 29-41 | MINOR | Lecture de `localStorage` dans l'initialiseur d'état : valeur différente serveur/client → hydratation (la page est un client component rendu aussi en SSR). |
| idem | 442 lignes | MINOR | 45 styles inline, 9 `key={i}`. |
| `enseignant/_components/*`, `admin/_components/*` (hors Studio) | — | MINOR | 134 fichiers : `useEffect` total 18, `useMemo/useCallback` 57, bonne couverture ARIA. 3 `confirm()` détectés sont des fonctions nommées `confirm` (pas la boîte native). |
| `_space/SpaceSkeleton.tsx`, `DashboardSkeleton.tsx` | — | — | Squelettes propres et CSS dédiée. |

**Instructions pour Gemini :**
1. « Gemini, supprime `generateTemporaryPassword`, `generateStudentLogin` et `LOGIN_DOMAIN` si inutilisé (`SettingsView` l'utilise pour un exemple : garde seulement la constante) dans `_scolaire/lib/identifiers.ts`. »
2. « Dans `_scolaire/lib/useApi.ts`, passe `AbortSignal` à `load(signal)` et ajoute en développement un avertissement si `load` change de référence plus de 5 fois en une seconde. »
3. « Éclate `StudioAdminView.tsx` en `studio/ComputerPreviewModal.tsx`, `ModuleModal.tsx`, `LessonEditorModal.tsx`, `StudioAdminView.tsx`, remplace `key={idx}` par des identifiants de ligne, et réutilise `LessonPlayer79`/`PilotLessonPlayer` pour l'aperçu afin d'afficher exactement ce que verra l'élève. »
4. « Dans `school/[slug]/page.tsx`, applique `schoolThemeVars()` aux couleurs, remplace les `<a>` par `Link` et ajoute `generateMetadata`. »
5. « Fusionne les trois parcours d'inscription d'enfant en un seul formulaire (`/api/parent/children/`) et supprime le bloc « Inscrire mes enfants » de `ProfileClient.tsx` si l'API `/api/profiles` n'est plus nécessaire. Remplace `LinkChildView` par `LinkChildModal` dans une page. »
6. « **Backend** : (a) CSV du bilan : préfixer par `'` toute cellule commençant par `=`, `+`, `-`, `@`, tab ou retour chariot ; (b) limites de taille et de lignes de l'import XLSX/PDF ; (c) validation hexadécimale des couleurs d'école ; (d) journal du consentement parental. »

### Ordre de correction du module 9
1. **Produit / architecture** : trancher O1 (le Studio doit-il alimenter l'espace élève ?). Sans cela, le travail de saisie des administrateurs n'a aucun effet pour les enfants.
2. **Conformité** : consentement parental dissocié et journalisé ; mot de passe de réactivation en mémoire ; téléphone obligatoire.
3. **Sécurité** : CSV (injection de formules), couleurs d'école, cohérence `admin` / `isAdminEmail`, code mort de génération de mots de passe.
4. **Doublons** : trois parcours d'inscription, deux modales de liaison, trois lecteurs de leçon.
5. **Découpage** : `StudioAdminView`, `ImportWizard`.
## MODULE 10 : configuration, dépendances, assets et hygiène du dépôt `frontend/`

> Lecture : `next.config.ts`, `package.json`, `eslint.config.mjs`, `tsconfig.json` (début), `Dockerfile`, `.dockerignore`, `.github/workflows/ci.yml` (extraits), `public/` (tailles), `tests/` (liste). Non relus : `vite.config.ts`, `worker/index.ts`, `scripts/*`, `.github/workflows/cd.yml` et `security.yml`, `tsconfig.json` (suite).

### `next.config.ts`

| Lignes | Crit. | Problème |
|---|---|---|
| 11-24, 43 | MAJOR | La politique de sécurité du contenu est en **mode « rapport seul »** (`Content-Security-Policy-Report-Only`) : elle ne protège donc encore rien. De plus `script-src` contient `'unsafe-inline'` et `'unsafe-eval'`, ce qui annulerait l'essentiel de la protection même une fois activée. Les 9 `<style dangerouslySetInnerHTML>` du code (statiques) obligent `style-src 'unsafe-inline'`. |
| 17 | MINOR | `frame-src 'self' https://scratch.mit.edu` : Scratch est servi en local (`/scratch/index.html`), la source externe n'est pas utilisée. |
| 15-16 | MINOR | `connect-src` autorise `cdn.jsdelivr.net` et `storage.googleapis.com` pour MediaPipe : à supprimer une fois les fichiers hébergés en local (module 7). |
| 14 | MINOR | `script-src` autorise `cdn.jsdelivr.net` sans empreinte (SRI) ni `nonce`. |
| 39-42 | — | Bon : `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy: camera=(self), microphone=()`, `poweredByHeader: false`. |
| 36-43 | MINOR | Pas de `Strict-Transport-Security` (peut être posé par le proxy en production : à vérifier). |
| — | MINOR | Pas de bloc `images` (formats AVIF/WebP, domaines autorisés) : `next/image` n'est utilisé que dans 3 fichiers (`AdultLayout`, `LinkChildView`, …). |
| — | MINOR | Pas de `output: "standalone"` : l'image Docker embarque tout `node_modules` (dev incluses). |
| 6, 21 | MINOR | `DJANGO_API_URL` figé au build (ARG Docker) : changer d'environnement exige de reconstruire l'image. |

**Instruction pour Gemini :** « Gemini, dans `next.config.ts`, prépare la CSP stricte : génère un `nonce` par requête via un `middleware.ts`, retire `'unsafe-eval'` (vérifie que ni Blockly ni MediaPipe n'en ont besoin ; sinon limite l'exception à `/dashboard/programmation`), retire `frame-src https://scratch.mit.edu`, remplace les `<style dangerouslySetInnerHTML>` par des feuilles CSS, puis bascule de `Report-Only` à `Content-Security-Policy` après une semaine sans rapport. Ajoute `output: "standalone"` et adapte le `Dockerfile`. »

### `eslint.config.mjs`

| Lignes | Crit. | Problème |
|---|---|---|
| 14-15 | MAJOR | `"@next/next/no-img-element": "off"` avec le commentaire « Mascotte et illustrations sont de petits fichiers locaux déjà optimisés ». **C'est inexact** : 95 `<img>` dans le code, 17 fichiers d'images de plus de 1 Mo (≈ 29 Mo) et 75 PNG/JPG de plus de 500 Ko dans `public/` hors Scratch (Palou jusqu'à 2,6 Mo). La règle masque donc le principal problème de performance. |
| 17-25 | MAJOR | Règles React 19 mises en `warn` : `react-hooks/set-state-in-effect`, `purity`, `static-components`, `exhaustive-deps`, `immutability`, `refs`, `no-explicit-any`, `no-unused-vars`. La CI exige « 0 erreur » (ci.yml:108-109) : les avertissements ne bloquent donc rien et s'accumulent. Il faut un **plafond d'avertissements** (`--max-warnings`) décroissant. |
| 31-43 | MINOR | `globalIgnores` couvre `DashboardClient_reconstructed.tsx`, `extract3.cjs`, `**/*.cjs` : les brouillons locaux sont ignorés plutôt que supprimés. |

### `package.json`

| Élément | Crit. | Problème |
|---|---|---|
| `@rive-app/react-canvas` | MINOR | Dépendance installée, **jamais importée** (grep `app`, `lib`, `worker`, `scripts`, `tests`). |
| `react-server-dom-webpack`, `cross-env` | MINOR | Aucune référence dans le code ni dans les scripts. |
| `vinext`, `@cloudflare/vite-plugin`, `@vitejs/plugin-rsc`, `vite`, `wrangler`, `@tailwindcss/vite`, `worker/index.ts`, `vite.config.ts` | MAJOR | Deuxième chaîne de build (Vite/Cloudflare) à côté de Next.js (`next build` dans le Dockerfile). Ces dépendances et fichiers ne servent qu'à `scripts/build-verified.sh` et `install-ci.sh` (189 lignes). Décision déjà listée comme ouverte dans vos notes (« chaîne vinext »). |
| `tailwindcss`, `@tailwindcss/postcss` | MINOR | Référencés dans `globals.css` et `vite.config.ts` ; l'application n'utilise presque pas de classes Tailwind (styles inline et CSS maison). À vérifier avant de les garder. |
| `@mediapipe/tasks-vision` | MINOR | Installé, mais les fichiers WASM sont chargés depuis un CDN (module 7) : le paquet embarque pourtant ces fichiers. |
| `canvas-confetti`, `motion` | — | Utilisés. `framer-motion` est importé sans être déclaré (module 1, T7). |
| `engines.node >= 22.13.0` | — | Cohérent avec `@types/node 22` et l'image `node:22-alpine`. |
| `"start": "next start -p 3001"` / `"dev": "next dev -p 3000"` | MINOR | Deux ports différents : l'application de production écoute sur 3001, ce qui surprend et nécessite une configuration explicite côté proxy. |

### `Dockerfile` et `.dockerignore`

| Lignes | Crit. | Problème |
|---|---|---|
| 12-17 | MINOR | L'image finale copie **tout** `/app` de l'étape de build (code source, `node_modules` complet avec dépendances de développement, `public/` de 270 Mo dont 139 Mo de Scratch). Image volumineuse et surface d'attaque plus large. `output: "standalone"` réduirait l'image de façon importante. |
| 15 | — | Bon : `USER node`, `NODE_ENV=production`. |
| `.dockerignore` | — | Bon : `.env`, `tests`, `coverage`, `*.md`. |

### `public/` : assets servis publiquement

| Élément | Crit. | Problème |
|---|---|---|
| `public/maquettes/piste-1/2/3-*.html` (3 fichiers, suivis par git) | MINOR | Maquettes de conception servies en production. |
| `public/scratch/` (139 Mo) | MAJOR | Build vendored de Scratch servi par l'application : alourdit l'image Docker, les déploiements et la CI ; mises à jour de sécurité manuelles. Envisager un artefact séparé (CDN privé ou sous-domaine) — voir isolation de l'iframe (module 8). |
| `public/images/` (115 Mo), `public/palou/` (18 Mo) | MAJOR | 17 fichiers de plus de 1 Mo (29 Mo cumulés) ; 75 PNG/JPG de plus de 500 Ko hors Scratch. Aucune génération WebP/AVIF. Deux dossiers pour la mascotte : `/images/palou/` et `/palou/`. |
| noms de fichiers | MINOR | Noms avec espaces, accents et symboles (`/palou/Bravo !.png`, `Réflexion.png`, `Côté.png`, `Clin d'oeil.png`, badges `Détective_Palou.jpg`, `Œil_de_Lynx.jpg`) : fragiles selon l'encodage d'URL et la normalisation Unicode. |
| `public/sw.js` | MINOR | Service worker pour les notifications push (`push-client.ts`) ; non relu. |
| `public/*.svg` (`file.svg`, `globe.svg`, `window.svg`) | MINOR | Reliquats du gabarit `create-next-app`, non utilisés. |

**Instruction pour Gemini :** « Gemini, retire `public/rapport.html` et `public/maquettes/` du dépôt (déplace-les vers `docs/`). Génère des versions WebP des images de plus de 300 Ko avec `sharp`, remplace les références, supprime les originaux dont le poids dépasse 1 Mo une fois la recette faite. Unifie `/palou/` et `/images/palou/`. Renomme les fichiers en ASCII sans espace. Supprime les trois SVG du gabarit. »

### Brouillons à la racine de `frontend/`

| Fichier | Crit. | Problème |
|---|---|---|
| `DashboardClient_reconstructed.tsx` (2 148 lignes), `dc_chunks.json`, `dc_chunks2.txt`, `dc_write.txt` (vide), `dashboard_client_edits.txt` (vide), `diff_clean.patch` (1 727 lignes), `apply_advanced.py`, `patch_fuzzy.py`, `extract3.cjs`, `nodes.html`, `next_dev_log.txt` | MINOR | Résidus de manipulation d'éditeurs (reconstruction de fichiers). **Non suivis par git** (ignorés par `.gitignore`), donc sans danger pour le dépôt, mais ils encombrent le dossier, sont ignorés par ESLint (au lieu d'être supprimés) et peuvent être embarqués dans une image Docker construite depuis le dossier de travail. À supprimer après vérification que rien n'y manque. |
| `scripts/*.py` (7 scripts de traitement d'images de Palou) | MINOR | Outils de production d'assets dans `frontend/scripts` à côté des scripts de build ; Python non déclaré dans les prérequis. |

### Tests et CI

| Élément | Crit. | Problème |
|---|---|---|
| `tests/*.test.mjs` | MAJOR | **4 fichiers de tests (572 lignes) pour 44 000 lignes** de code : `blockly-interpreter`, `parcours79-logic`, `parcours79-player`, `rendered-html`. Aucune couverture des parties à risque : `local-auth`/`safeReturnTo`, `csrf-fetch`, `lms-data` (règles de badges), `dashboardShared` (API de progression), formulaires de connexion, import CSV (`parseCsv`, `parseDate`). |
| `.github/workflows/ci.yml` | — | Bon : `typecheck`, `lint`, `test:coverage`, `build`. Mais pas de seuil de couverture ni de plafond d'avertissements ESLint. |
| `security.yml` | — | Non relu. |

**Instruction pour Gemini :** « Gemini, ajoute des tests `node --test` (pas de dépendance nouvelle) pour : `safeReturnTo` (valeurs encodées, `//`, `\`), `parseCsv`/`parseDate`/`tableToRecords`, `computeEarnedBadges` (règle `b_contact`), `starsFor`/`scoreForStars`, `passwordProblem`/`phoneProblem`, `computeMap`. Ajoute `--max-warnings <N courant>` à `npm run lint` et décrémente-le à chaque correction. »

### Ordre de correction du module 10
1. Retirer `rapport.html` et `maquettes/` de `public/`.
2. CSP : passer de rapport seul à application, sans `unsafe-eval` si possible.
3. Poids des images (WebP/AVIF) et règle `no-img-element` réactivée au minimum en `warn`.
4. Trancher la chaîne Vite/Cloudflare et supprimer les dépendances mortes.
5. Plafond d'avertissements ESLint et tests des fonctions à risque.
## ANNEXES : listes consolidées pour l'exécution

### Annexe A. Décisions de produit à prendre AVANT de coder (elles bloquent des corrections)

| # | Question | Pourquoi elle bloque | Où |
|---|---|---|---|
| D1 | `ScreenTimeManager` (verrous coucher / limite journalière / déverrouillage parental) doit-il être **remonté** dans le layout, ou supprimé ? | Sans lui, le contrôle parental configuré dans `ParentSettingsView` n'a aucun effet sur l'écran de l'enfant. | M1 (T1), M5 |
| D2 | `KidTooltip` : le remonter (les `data-kid-tooltip` existent déjà) ou les retirer ? | Les infobulles ne s'affichent plus. | M1 |
| D3 | Le **Studio de contenus** doit-il alimenter l'espace élève (lire `/api/curriculum/*`) ? | Aujourd'hui l'élève lit des fichiers statiques ; le Studio et le guide enseignant lisent la base. | M2, M9 (O1) |
| D4 | Prénom **« Ndeye »** : le garder ou le retirer ? (`HomeClient` dit « sans Ndeye », 14 occurrences dans 6 fichiers.) | Cohérence du contenu. | M3, M6 |
| D5 | Politique d'animations : respecter `prefers-reduced-motion` (WCAG) ou garder le choix assumé de `fx.ts` ? Proposer un réglage « animations réduites » ? | Touche confettis, keyframes, 10 composants. | M1 (T3), M8 |
| D6 | Chaîne de build **Vite / Cloudflare / vinext** à côté de Next : garder ou supprimer ? | 7 dépendances et 3 fichiers. | M10 |
| D7 | Âge accepté à l'inscription d'un enfant : **3-25 ans** (formulaire) ou **7-15 ans** (produit) ? | Validation `ParentDashboardView` et serveur. | M5 |
| D8 | `isAdmin` par e-mail (`KEUR_ADMIN_EMAILS`) : garder, ou rôle `admin` uniquement ? | Incohérence `/dashboard` / `/admin`. | M2, M3, M9 |
| D9 | Trois parcours d'inscription d'enfant : lequel garder ? | Doublons et règles divergentes. | M9 (O2) |
| D10 | Consentement parental : formulation et journalisation exigées par la loi sénégalaise / le RGPD si des enfants de l'UE sont concernés. | Une case unique aujourd'hui. | M9 |
| D11 | Contenu non relu par des enseignants : **bloquer par défaut** en production ? | `NEXT_PUBLIC_REQUIRE_REVIEWED_CONTENT` est facultative. | M8 |
| D13 | La **mascotte flottante** `PalouGuide` doit-elle revenir sur le dashboard ? Elle est codée et pilotée par des états, mais n'est plus montée. | Évite de corriger 11 défauts d'un composant mort. | M1 (T9) |
| D12 | Faut-il garder un **hub arcade** (`GamesView`) ? La refonte l'a retiré du rendu. | 52 lignes denses + 20 jeux listés. | M6 |

### Annexe B. Vérifications à faire côté **backend** (non auditables depuis le frontend)

| # | À vérifier | Risque si absent | Source |
|---|---|---|---|
| B1 | `/api/progress?child_id=`, `/api/charter?child_id=`, `/api/progress/record-activity` refusent un `child_id` **non relié au parent connecté** | Lecture ou écriture entre comptes (IDOR) via le mode visiteur (`sessionStorage`) | M3 |
| B2 | `/api/parent/children/<id>/reset-password` refuse un enfant non rattaché ; exige idéalement le mot de passe du parent | Prise de contrôle d'un compte enfant | M5 |
| B3 | `/api/progress/parental-limits` ignore `twoFactor` quand `childId` est fourni ; désactivation du 2FA exige le mot de passe | Désactivation du 2FA par un chemin détourné | M5 |
| B4 | L'attribution d'XP pour `arcade-game-NN` / `arcade-quiz-NN` ne dépend pas d'une simple déclaration du client | Gain d'XP sans jouer (une fois par id) | M6 |
| B5 | Les identifiants `defi-<age>-<module>` sont reconnus par `/api/progress`, avec l'âge envoyé | XP de +50 jamais accordée aux 10-15 ans (le client envoie `age: "7-9"`) | M4 |
| B6 | CSV du bilan d'année : cellules commençant par `=`, `+`, `-`, `@` préfixées | Injection de formules à l'ouverture dans Excel | M9 |
| B7 | Couleurs d'école validées en hexadécimal | Injection de `url(...)` dans les variables CSS | M9 |
| B8 | L'e-mail est **vérifié** avant d'être admis dans `KEUR_ADMIN_EMAILS` | Élévation de privilèges | M2 |
| B9 | Limites de taille / lignes / pages de l'import XLSX et PDF | Déni de service, consommation mémoire | M9 |
| B10 | Limites de temps d'écran **appliquées par le serveur** (réponse 423 sur `/api/progress`), et non seulement affichées par le client (`recordDaily("minute")` est déclaré par le navigateur) | Contournement des limites parentales | M3, M5 |
| B11 | Rate-limiting sur `/api/parent/children/`, `/api/auth/*`, `/api/parent/link-code` | Force brute | M3, M9 |
| B12 | `/api/daily-riddle` encore utile ? (consommé seulement par `DailyChallenge79`, fichier mort) | Endpoint orphelin | M8 |
| B13 | Politique de mot de passe (lettres + chiffres) appliquée côté serveur ; unicité d'identifiant ; mot de passe provisoire à changer à la première connexion | Comptes d'enfants faibles | M9 |
| B14 | Journalisation du consentement parental (date, version des CGU) | Non-conformité | M9 |

### Annexe C. Code mort à supprimer (vérifié par grep, aucun importateur)

| Fichier ou élément | Lignes | Condition |
|---|---|---|
| `app/components/KidsRewardAnimation.tsx` | 357 | Aucune |
| `app/components/KidTooltip.tsx`, `ScreenTimeManager.tsx` | 146 + 1 183 | Après décision D1 / D2 (peuvent être à remonter) |
| `app/components/PalouGuide.tsx` + états `palouEvent`, `isWalking`, `isThinking` et 3 effets de `DashboardClient.tsx` | 246 + ≈ 40 | Après décision D13 (remonter la mascotte flottante ou supprimer) |
| `lib/soundManager.ts` | 144 | Aucune |
| `app/services/curriculum-api.ts`, `curriculum-fallback.ts`, `app/types/curriculum.ts` | 95 + 253 + 81 | Après décision D3 |
| 11 exports de `app/design/motion-variants.ts` | ≈ 150 | Aucune |
| `app/dashboard/LessonPlayActivity.tsx` | 21 | Aucune |
| `app/dashboard/AdvancedGames.tsx` (proxy) | 20 | Importer depuis `./games` |
| `GamesView` dans `DashboardActivities.tsx` | 52 | Après D12 |
| `ScratchStudio` + imports Blockly associés dans `DashboardActivities.tsx` | 62 | Aucune |
| `app/dashboard/parcours79/Adventure79.tsx`, `DailyChallenge79.tsx`, `adventure79.css` | 263 + 170 + 220 | Aucune |
| `app/dashboard/programmation/types.ts` | 41 | Aucune |
| `World2Background.tsx`, `World3Background.tsx` (fusion avec le n° 1) | 32 | Aucune |
| `DashboardNavbar` (export par défaut), lien « Suivi Enfants », lien « Retour accueil » | ≈ 40 | Aucune |
| `TEACHER_MENU` et branche `enseignant` d'`AdultLayout` | ≈ 25 | Aucune |
| Branches `role === "enseignant"` de `DashboardClient` (lignes 63-67, 698-725) | ≈ 35 | Aucune |
| Constantes `timeLimitReached`, `lessonLimitReached`, fonction `playBadgeAudio`, `postProgress`, alias `getLevel` | ≈ 25 | Aucune |
| `generateTemporaryPassword`, `generateStudentLogin` (`_scolaire/lib/identifiers.ts`) | ≈ 30 | Aucune (et faible entropie) |
| `NavKidIcon` : entrée `arcade` | 3 | Aucune |
| `LEGACY_PLAYABLE` (`parcours79/content.ts`) | 1 | Aucune |
| `playFakeAudio` (`PilotLessonPlayer`) | 5 | Remplacer par une vraie lecture |
| `public/rapport.html`, `public/maquettes/`, `public/{file,globe,window}.svg` | — | Aucune |
| Dépendances `@rive-app/react-canvas`, `react-server-dom-webpack`, `cross-env` | — | Vérifier `npm ls` |
| Brouillons `frontend/` : `DashboardClient_reconstructed.tsx`, `dc_*`, `diff_clean.patch`, `apply_advanced.py`, `patch_fuzzy.py`, `extract3.cjs`, `nodes.html` | ≈ 4 000 | Non suivis par git |

### Annexe D. Fichiers à découper (au-delà de 500 lignes)

| Fichier | Lignes | Découpage proposé |
|---|---|---|
| `dashboard/DashboardActivities.tsx` | 1 957 | lecteurs de leçon, un fichier par mini-jeu, registre, contenus en JSON |
| `admin/_components/StudioAdminView.tsx` | 1 630 | `ComputerPreviewModal`, `ModuleModal`, `LessonEditorModal`, vue |
| `dashboard/DashboardClient.tsx` | 1 442 | hooks `useDashboardProgress`, `useDailyUsage`, `useVisitorMode` + 6 composants |
| `dashboard/ParentSettingsView.tsx` | 1 336 | 4 onglets + modale + `SettingRow` + `useParentalSettings` |
| `dashboard/games/DrawingGuessGame.tsx` | 1 207 | canvas, heuristique de reconnaissance, écrans |
| `components/ScreenTimeManager.tsx` | 1 183 | 3 écrans + formulaire de déverrouillage |
| `dashboard/games/ModelTrainingGames.tsx` | 1 033 | 5 jeux |
| `dashboard/ParentChildrenView.tsx` | 913 | `ChildCard`, `ChildDetail`, `ChildPedagogyView`, vue |
| `dashboard/ParentDashboardView.tsx` | 892 | modales d'ajout / identifiants / synthèse + carte enfant |
| `dashboard/programmation/ProgrammingAtelier.tsx` | 854 | niveaux en données, plateau, exécuteur, tutoriel |
| `dashboard/GamesMapView.tsx` | 801 | `LevelNode`, 3 modales, `MapHero`, hook d'avatar |
| `dashboard/sections/QuotidienView.tsx` | 718 | 4 sections |
| `components/ParentNotificationCenter.tsx` | 701 | `NotificationRow`, hooks de polling |
| `dashboard/games/VoiceAssistantGame.tsx` | 680 | non relu : à examiner |
| `dashboard/DictionaryView.tsx` | 596 | CSS en module, modale |
| `dashboard/StudentAssignmentsView.tsx` | 587 | liste, lecteur de mission |
| `HomeClient.tsx` | 551 | Server Component + sélecteur client |
| `dashboard/games/GestureCameraGame.tsx` | 531 | modèle MediaPipe, détection, écran |
| `ecole/_components/import/ImportWizard.tsx` | 498 | étapes d'assistant |

### Annexe E. Fiches de bonnes pratiques à généraliser (déjà présentes dans le code)

| Modèle | Fichier | Ce qu'il fait bien |
|---|---|---|
| Fenêtre accessible | `dashboard/components/LinkChildModal.tsx` | `role="dialog"`, focus initial et restitution, Échap, `aria-invalid`/`aria-describedby`, `role="alert"` |
| Défi côté serveur | `dashboard/DailyChallengeCard.tsx` | La bonne réponse n'arrive jamais dans le navigateur |
| Note côté serveur | `dashboard/StudentAssignmentsView.tsx` | Aucun score envoyé par le client |
| Logique pure testée | `dashboard/parcours79/logic.ts`, `programmation/blocklyInterpreter.ts` | Fonctions pures, testées, sans `new Function` |
| Formulaires de connexion | `connexion/LoginForm.tsx`, `PasswordInput.tsx` | Labels, `autoComplete`, `aria-pressed` |
| Hook de chargement | `_scolaire/lib/useApi.ts` + `http.ts` | Un seul client, erreurs métier affichables, annulation |
| Bibliothèque d'interface | `_scolaire/ui/ui.tsx` | `h1` unique, `role="alert"`, tableau avec légende et clavier |
| Hydratation sûre | `dashboard/useStoredNumber.ts` | `useSyncExternalStore` (à adopter) |
| Annulation audio | `dashboard/parcours79/voice.ts` | Jeton d'annulation, repli sur la synthèse |
| Pas de HTML injecté | partout | 9 `dangerouslySetInnerHTML`, tous des `<style>` statiques : aucun vecteur XSS |
