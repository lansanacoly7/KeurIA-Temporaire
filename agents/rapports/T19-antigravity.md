# Rapport T19 — Mise en page par écran dans le parcours 7-9 ans

- **Auteur** : Antigravity (`Antigravity <antigravity@keuria.local>`)
- **Tâche** : T19 — Mise en page par écran (Studio 7-9 et lecteur Dakar)
- **Branche** : `Dev_Lansana_Coly`
- **Date** : Dimanche 18 octobre 2026

---

## Synthèse d'exécution

Toutes les exigences de la spécification [T19-antigravity-mise-en-page.md](../taches/T19-antigravity-mise-en-page.md) sont respectées et prouvées dans un navigateur réel avec métriques extraites dans [preuves.json](T19-captures/preuves.json).

| Point | Exigence | Statut | Preuve clé |
|---|---|---|---|
| **Point 1** | Compatibilité ascendante : 0 régression visuelle sur écrans sans `layout` | **FAIT** | Écart maximal mesuré : **0 px** (seuil exigé ≤ 1 px) sur 3 leçons × 3 résolutions (9 combinaisons). |
| **Point 2** | Image : 4 positions × 3 résolutions (12 cas) + 3 tailles S/M/L | **FAIT** | 12 captures avec positions géométriques mesurées + 3 captures de tailles (S: 312px, M: 505px, L: 520px). |
| **Point 3** | Texte : 4 tailles et 2 alignements à 1440 et 390 px | **FAIT** | Tailles de police `getComputedStyle` mesurées (29px à 52px sur desktop, 16.38px à 29px sur mobile) + alignements `start` et `center`. |
| **Point 4** | Anti-débordement pire cas (`xl` + image `l` + `bottom` à 1024 et 390 px) | **FAIT** | `scrollWidth === clientWidth` (aucun débordement horizontal), défilement vertical accessible avec indicateur flèche mobile. |
| **Point 5** | Parcours réel studio & élève avec publication et restauration | **FAIT** | Brouillon configuré (image gauche + texte grand), rétablissement par défaut testé (layout supprimé), publication réelle, lecteur élève affichant la mise en page (`p79-img-left p79-ts-lg`, image à gauche de la bulle), puis rollback vers version 1 et vérification du retour au défaut côté élève. |
| **Point 6** | Navigation clavier seul dans le studio avec anneau de focus | **FAIT** | Radiogroups accessibles gérant `ArrowRight`/`ArrowLeft`, focus ring mesuré (`rgb(13, 132, 110) solid 2.35px`). |

---

## 1. Point 1 : Compatibilité ascendante stricte (Rien n'a bougé)

Pour s'assurer qu'aucune régression de layout n'est introduite sur les leçons existantes dépourvues du champ optionnel `layout`, les rectangles géométriques (`getBoundingClientRect`) de la rangée supérieure (`.p79-top-row`), de la bulle de parole (`.p79-bubble`), du conteneur d'image (`.p79-frame`) et de l'image elle-même (`.p79-picture`) ont été capturés avant modification (baseline stabilisée après décodage complet des images et animations) puis après implémentation.

Les mesures ont été effectuées sur 3 leçons représentatives (`p1-1` histoire, `p5-2` découverte, `p9-3` IA) sur les 3 résolutions cibles (1440 × 900, 1024 × 768, 390 × 844) :

- **Écart maximal mesuré sur l'ensemble des coordonnées** : **0 px** (strictement identique, seuil requis $\le 1$ px).

### Tableau comparatif des coordonnées (exemples)

| Leçon & Résolution | Élément | Baseline (x, y, w, h) | Après (x, y, w, h) | Écart |
|---|---|---|---|---|
| `p1-1` @ 1440 | `.p79-bubble` | (334, 365, 555, 204) | (334, 365, 555, 204) | 0 px |
| `p1-1` @ 1440 | `.p79-frame` | (902, 286, 505, 360) | (902, 286, 505, 360) | 0 px |
| `p1-1` @ 1024 | `.p79-bubble` | (249, 285, 381, 267) | (249, 285, 381, 267) | 0 px |
| `p1-1` @ 1024 | `.p79-frame` | (646, 284, 348, 268) | (646, 284, 348, 268) | 0 px |
| `p1-1` @ 390 | `.p79-bubble` | (35, 369, 319, 141) | (35, 369, 319, 141) | 0 px |
| `p1-1` @ 390 | `.p79-frame` | (35, 529, 319, 213) | (35, 529, 319, 213) | 0 px |
| `p5-2` @ 1440 | `.p79-bubble` | (334, 364, 555, 256) | (334, 364, 555, 256) | 0 px |
| `p9-3` @ 390 | `.p79-bubble` | (46, 461, 298, 170) | (46, 461, 298, 170) | 0 px |

### Captures associées
- Baseline : [baseline-p1-1-1440.png](T19-captures/baseline/baseline-p1-1-1440.png), [baseline-p1-1-1024.png](T19-captures/baseline/baseline-p1-1-1024.png), [baseline-p1-1-390.png](T19-captures/baseline/baseline-p1-1-390.png), [baseline-p5-2-1440.png](T19-captures/baseline/baseline-p5-2-1440.png), [baseline-p5-2-1024.png](T19-captures/baseline/baseline-p5-2-1024.png), [baseline-p5-2-390.png](T19-captures/baseline/baseline-p5-2-390.png), [baseline-p9-3-1440.png](T19-captures/baseline/baseline-p9-3-1440.png), [baseline-p9-3-1024.png](T19-captures/baseline/baseline-p9-3-1024.png), [baseline-p9-3-390.png](T19-captures/baseline/baseline-p9-3-390.png).
- Après : [apres-p1-1-1440.png](T19-captures/apres/apres-p1-1-1440.png), [apres-p1-1-1024.png](T19-captures/apres/apres-p1-1-1024.png), [apres-p1-1-390.png](T19-captures/apres/apres-p1-1-390.png), [apres-p5-2-1440.png](T19-captures/apres/apres-p5-2-1440.png), [apres-p5-2-1024.png](T19-captures/apres/apres-p5-2-1024.png), [apres-p5-2-390.png](T19-captures/apres/apres-p5-2-390.png), [apres-p9-3-1440.png](T19-captures/apres/apres-p9-3-1440.png), [apres-p9-3-1024.png](T19-captures/apres/apres-p9-3-1024.png), [apres-p9-3-390.png](T19-captures/apres/apres-p9-3-390.png).

---

## 2. Point 2 : Positions et tailles d'image

### Positions de l'image (4 positions × 3 résolutions = 12 cas)

Sur écran large et intermédiaire, l'ordre flex et l'orientation en ligne/colonne sont appliqués :
- `left` : l'image se place avant la bulle (`frame.x + frame.width <= bubble.x`)
- `right` : l'image se place après la bulle (`bubble.x + bubble.width <= frame.x`)
- `top` : l'image se place au-dessus de la bulle (`frame.y + frame.height <= bubble.y`)
- `bottom` : l'image se place sous la bulle (`bubble.y + bubble.height <= frame.y`)

Sur mobile ($\le 640\text{px}$), le repli automatique adapte l'empilement vertical :
- `left` et `top` : l'image est placée **au-dessus** du texte (`frame.y < bubble.y`)
- `bottom` : l'image est placée **au-dessous** du texte (`bubble.y < frame.y`)
- `right` (défaut) : conserve la disposition mobile historique où le texte précède l'illustration.

| Position | 1440 px | 1024 px | 390 px (repli mobile) |
|---|---|---|---|
| `left` | [image-left-1440.png](T19-captures/image-left-1440.png) (`frame.x+w=834 <= bubble.x=847`) | [image-left-1024.png](T19-captures/image-left-1024.png) (`frame.x+w=593 <= bubble.x=609`) | [image-left-390.png](T19-captures/image-left-390.png) (`frame.y=369, bubble.y=600`) |
| `right` | [image-right-1440.png](T19-captures/image-right-1440.png) (`bubble.x+w=889 <= frame.x=902`) | [image-right-1024.png](T19-captures/image-right-1024.png) (`bubble.x+w=630 <= frame.x=646`) | [image-right-390.png](T19-captures/image-right-390.png) (`bubble.y=369, frame.y=529`) |
| `top` | [image-top-1440.png](T19-captures/image-top-1440.png) (`frame.y+h=495 <= bubble.y=506`) | [image-top-1024.png](T19-captures/image-top-1024.png) (`frame.y+h=440 <= bubble.y=453`) | [image-top-390.png](T19-captures/image-top-390.png) (`frame.y=365, bubble.y=605`) |
| `bottom` | [image-bottom-1440.png](T19-captures/image-bottom-1440.png) (`bubble.y+h=428 <= frame.y=438`) | [image-bottom-1024.png](T19-captures/image-bottom-1024.png) (`bubble.y+h=385 <= frame.y=397`) | [image-bottom-390.png](T19-captures/image-bottom-390.png) (`bubble.y=365, frame.y=520`) |

### Tailles de l'image à 1440 px

- **Taille `s` (Petite)** : `frame.width = 312px`, `picture.width = 302px` — [image-size-s-1440.png](T19-captures/image-size-s-1440.png)
- **Taille `m` (Moyenne, défaut)** : `frame.width = 505px`, `picture.width = 495px` — [image-size-m-1440.png](T19-captures/image-size-m-1440.png)
- **Taille `l` (Grande)** : `frame.width = 520px`, `picture.width = 510px` — [image-size-l-1440.png](T19-captures/image-size-l-1440.png)

---

## 3. Point 3 : Tailles et alignements de texte

Les 4 tailles de texte (`sm`, `md`, `lg`, `xl`) et les 2 alignements (`left`, `center`) ont été validés à 1440 px et 390 px :

### Tailles de texte mesurées sur `.p79-say-text`

| Taille | 1440 px (desktop) | 390 px (mobile fluide) | Captures |
|---|---|---|---|
| `sm` (Petit) | **29px** | **16.38px** | [text-size-sm-1440.png](T19-captures/text-size-sm-1440.png) / [text-size-sm-390.png](T19-captures/text-size-sm-390.png) |
| `md` (Normal, défaut) | **38px** | **21.06px** | [text-size-md-1440.png](T19-captures/text-size-md-1440.png) / [text-size-md-390.png](T19-captures/text-size-md-390.png) |
| `lg` (Grand) | **44px** | **25px** | [text-size-lg-1440.png](T19-captures/text-size-lg-1440.png) / [text-size-lg-390.png](T19-captures/text-size-lg-390.png) |
| `xl` (Très grand) | **52px** | **29px** | [text-size-xl-1440.png](T19-captures/text-size-xl-1440.png) / [text-size-xl-390.png](T19-captures/text-size-xl-390.png) |

### Alignements mesurés

- `left` : `textAlign = start` — [text-align-left-1440.png](T19-captures/text-align-left-1440.png) et [text-align-left-390.png](T19-captures/text-align-left-390.png)
- `center` : `textAlign = center` — [text-align-center-1440.png](T19-captures/text-align-center-1440.png) et [text-align-center-390.png](T19-captures/text-align-center-390.png)

---

## 4. Point 4 : Anti-débordement pire cas

Dans la configuration la plus encombrante possible (texte `xl` + image taille `l` + image en position `bottom`) :
- **À 1024 px** : `scrollWidth = 1024px`, `clientWidth = 1024px` (`horizontalOverflow = false`). Aucun texte n'est rogné, la fenêtre affiche tout le contenu confortablement sans débordement — [anti-overflow-worst-case-1024.png](T19-captures/anti-overflow-worst-case-1024.png).
- **À 390 px** : `scrollWidth = 390px`, `clientWidth = 390px` (`horizontalOverflow = false`). Le conteneur `.p79-l-box` absorbe le défilement vertical (`boxScrollHeight = 631px` pour `boxClientHeight = 547px`) et affiche l'indicateur d'accessibilité visuelle `.p79-scroll-hint` — [anti-overflow-worst-case-390.png](T19-captures/anti-overflow-worst-case-390.png).

---

## 5. Point 5 : Parcours réel dans le studio et côté élève

Le cycle complet de vie d'une personnalisation a été exécuté en conditions réelles :

1. **Édition dans le studio** :
   - Connexion administrateur `local-admin@keur-ia.test`.
   - Ouverture du studio sur la leçon `p1-1` (`/admin/studio79/p1-1`).
   - Sélection dans le tiroir d'inspection : **Image à gauche** + **Texte Grand (`lg`)**.
   - Autosave validé par l'API : le brouillon contient `{ "image": "left", "textSize": "lg" }`.
   - Capture : [studio-custom-layout-1440.png](T19-captures/studio-custom-layout-1440.png).

2. **Rétablissement par défaut** :
   - Clic sur le bouton « *Rétablir la mise en page par défaut* » (`.sx-layout-reset-btn`).
   - Autosave validé par l'API : le champ `layout` a été totalement supprimé de l'écran (`draft.working.content.screens[0].layout = undefined`).
   - Capture : [studio-reset-layout-1440.png](T19-captures/studio-reset-layout-1440.png).

3. **Publication réelle** :
   - Ré-application de la mise en page personnalisée (`image: 'left'`, `textSize: 'lg'`).
   - Publication via `POST /api/superadmin/studio79/lessons/p1-1/publish`.
   - Version 2 créée (`state: 'pending'`).
   - Forçage de la mise en ligne immédiate par script Django : `ContentVersion.objects.filter(id=75).update(publish_at=now - 1s)`.
   - Vérification de l'endpoint public `GET /api/curriculum/content79/p1-1/` : retourne bien la version 2 avec `{ "image": "left", "textSize": "lg" }`.

4. **Vérification côté élève** :
   - Connexion sur le compte élève `moussa.sow@keuria.sn`.
   - Navigation vers `/dashboard` et clic sur le bouton « Continuer » (`.track-hero-btn`) pour lancer `p1-1`.
   - Le lecteur élève charge la version publiée :
     - `topRowClass` : `p79-top-row p79-img-left p79-ts-lg`
     - `fontSize` : `44px`
     - `bubbleRect` : $x = 847$, $y = 331$, $w = 556$, $h = 271$
     - `frameRect` : $x = 329$, $y = 286$, $w = 505$, $h = 360$
     - `imageIsLeftOfBubble` : **`true`** ($x_{\text{frame}} = 329 < x_{\text{bubble}} = 847$).
   - Capture : [child-player-published-layout-1440.png](T19-captures/child-player-published-layout-1440.png).

5. **Restauration d'origine (Rollback)** :
   - Reconnexion administrateur et appel de l'API de rollback : `POST /api/superadmin/studio79/lessons/p1-1/rollback` vers la version 1.
   - Version 3 générée (`source: 'rollback'`, note: « *Retour à la version 1* »).
   - Reconnexion élève et ouverture de la leçon :
     - `topRowClass` : `p79-top-row` (classes `p79-img-left` et `p79-ts-lg` absentes)
     - `imageIsRightOfBubble` : **`true`** ($x_{\text{frame}} > x_{\text{bubble}}$).
   - Capture : [child-player-restored-1440.png](T19-captures/child-player-restored-1440.png).
   - **État final de la base** : la leçon `p1-1` est bien revenue à son contenu d'origine (`layout: undefined`) et **aucun fichier de `frontend/content/` n'a été modifié**.

---

## 6. Point 6 : Navigation au clavier seul avec anneau de focus

La section « Mise en page » de `ScreenInspector.tsx` intègre le composant accessible `SxRadioGroup` :
- `role="radiogroup"` avec attribut `aria-label`.
- Boutons en `role="radio"`, `aria-checked="true|false"`, `tabIndex={isChecked ? 0 : -1}`.
- Prise en charge des flèches directionnelles (`ArrowRight`, `ArrowLeft`, `ArrowDown`, `ArrowUp`) avec sélection circulaire et déplacement automatique du focus.
- Anneau de focus visible et contrasté selon la charte du studio : `outline: rgb(13, 132, 110) solid 2.35px`.

Captures :
- Focus sur la position de l'image (navigation par flèche droite vers « À droite ») : [studio-keyboard-focus-position-1440.png](T19-captures/studio-keyboard-focus-position-1440.png).
- Focus sur la taille de texte de Palou : [studio-keyboard-focus-text-1440.png](T19-captures/studio-keyboard-focus-text-1440.png).

---

## Défauts trouvés et points d'attention résolus

1. **Stabilisation du décodage d'image lors de la mesure baseline** :
   - Lors des premiers tests de capture sur `p1-1`, une variation de 1px a été constatée si la mesure était effectuée avant que l'image du chapitre ne soit totalement décodée par le moteur de rendu (`img.complete === true`).
   - L'ajout d'une barrière d'attente sur le chargement des images a permis d'obtenir une concordance absolue à **0 px d'écart** sur les 9 combinaisons de baseline.

2. **Délai d'autosave (debounce 1200ms) dans le studio** :
   - Dans `LessonEditor.tsx`, l'autosave applique un débroussaillage de 1200ms après la dernière frappe. Lors de clics successifs très rapides, vérifier l'API immédiatement risquait de lire l'état précédent. Le protocole de test interroge le endpoint `/api/superadmin/studio79/lessons/p1-1` jusqu'à validation de la sauvegarde avant de procéder à la publication.

3. **Ordonnancement de la version live dans Django** :
   - `live_version` dans `versions.py` trie par `-publish_at, -number`. Si plusieurs versions recevaient le même timestamp au millième de seconde près, Django retombait sur le numéro le plus élevé. Le script de forçage isole rigoureusement le `publish_at` de la version cible (`pub_id`) pour garantir son élection sans ambiguïté.

---

## Contrôles de validation automatique

- **Typescript** : `npm run typecheck` $\rightarrow$ 0 erreur.
- **Linter Next.js** : `npm run lint` $\rightarrow$ 0 erreur.
- **Tests unitaires frontend** : `node --test frontend/tests/layout79.test.mjs` $\rightarrow$ 13/13 tests réussis.
- **Tests scope CSS studio** : `node --test frontend/tests/studio79-css-scope.test.mjs` $\rightarrow$ 100% réussi (`.sx-` respecté).
- **Tests backend Django** :
  - `.\venv\Scripts\python.exe backend/manage.py test apps.curriculum.test_parcours79` $\rightarrow$ 5/5 tests réussis.
  - `.\venv\Scripts\python.exe backend/manage.py test apps.superadmin.tests.test_studio79` $\rightarrow$ 28/28 tests réussis.
  - `.\venv\Scripts\python.exe backend/manage.py check_parcours79` $\rightarrow$ 40 leçons vérifiées, 0 anomalie.
- **Inventaire des captures** : 54 captures PNG générées sur disque, 100% vérifiées.
