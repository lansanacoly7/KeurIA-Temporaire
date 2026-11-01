# T19 — Antigravity — mise en page par écran : position de l'image, taille et alignement du texte

À faire après `T17-D`. Tu écris ici du code d'interface **et** du code serveur (lecteur de l'enfant, validateur, tests) : dis-le dans le message de chaque commit. Lis d'abord `docs/STUDIO79.md` et `docs/REGLES_AGENTS.md`.
Pars du sommet de `Dev_Lansana_Coly`. **Ne commite que tes propres fichiers**, listés un par un (tu as déjà embarqué les miens une fois : `git status` avant chaque `git add`).

## Le but demandé par Lansana

Dans le studio, l'administrateur choisit pour chaque écran : l'image **en haut, en bas, à gauche ou à droite**, sa **taille**, la **taille du texte** (« on l'agrandit, on le rapetisse ») et son **alignement**. Il voit le résultat tout de suite dans l'aperçu, et l'enfant le voit ensuite dans sa leçon. Rien de tout cela n'existe : aujourd'hui l'image est toujours à droite du texte, aux mêmes tailles.

## Le contrat de données (ne le change pas sans me prévenir)

Dans `frontend/app/dashboard/parcours79/types.ts`, ajoute à `ScreenBase` un champ **facultatif** :

```ts
/** Mise en page d'un écran, choisie dans le studio. Absent ou incomplet : la mise en page actuelle (valeurs par défaut). */
export interface ScreenLayout {
  /** Place de l'image par rapport au texte. Défaut : "right". Écrans avec image seulement (histoire, découvre, et l'IA). */
  image?: "right" | "left" | "top" | "bottom";
  /** Taille de l'image. Défaut : "m". */
  imageSize?: "s" | "m" | "l";
  /** Taille du texte de Palou. Défaut : "md". */
  textSize?: "sm" | "md" | "lg" | "xl";
  /** Alignement du texte. Défaut : "left". */
  align?: "left" | "center";
}
// dans ScreenBase :  layout?: ScreenLayout;
```
**Règle d'or : compatibilité.** Un écran sans `layout` doit s'afficher **exactement** comme aujourd'hui (mêmes classes, mêmes mesures). Les 40 leçons existantes n'ont pas de `layout` et ne doivent pas bouger d'un pixel.
**Baseline avant de toucher quoi que ce soit** : capture, avec le vrai lecteur (page `/studio-apercu` ou une leçon réelle), l'écran 1 des leçons `p1-1`, `p5-2` et `p9-3` à 1440, 1024 et 390 px ; garde ces images dans `agents/rapports/T19-captures/baseline/` ; elles servent de référence à la fin.

## 1. Le lecteur de l'enfant (`LessonPlayer79.tsx` et sa feuille de style)

- Ajoute des classes sur le conteneur de l'écran (la ligne « bulle + image » s'appelle `p79-top-row`, cherche-la dans `LessonPlayer79.tsx` et `parcours79.css` / `adventure79.css`) : `p79-img-left|top|bottom` (rien pour `right`, c'est l'actuel), `p79-img-s|l`, `p79-ts-sm|lg|xl`, `p79-al-center`. Les classes viennent d'une petite fonction pure `layoutClasses(layout)` dans `logic.ts`, testée (valeurs inconnues ignorées sans erreur).
- **Respecte la règle de mise en page déjà écrite en tête de `useFit`** (contenu jamais réduit sous 85 % ; avant de réduire, plus de largeur ; sinon la zone défile doucement). Un texte `xl` ou une image `l` ne doivent jamais couper le contenu ni passer sous le bouton « Continuer » : au pire, la zone défile avec sa flèche. Palou ne change jamais de taille.
- **Petits écrans** (largeur de la zone ≤ 640 px) : `left` et `right` se replient en `top` (image au-dessus du texte) ; `bottom` reste `bottom`.
- Les écrans qui n'ont pas d'image ignorent `image` et `imageSize` ; `textSize` et `align` valent pour tous les écrans (bulle de Palou, consignes d'activité n'ont **pas** à changer : seulement le texte de la bulle).
- La voix n'est pas concernée : ne touche pas à `spokenParts` ni à `voiceOff`.

## 2. Le contrôle côté serveur (`backend/apps/curriculum/parcours79.py`)

Dans `_check_lesson`, pour chaque écran qui a `layout` : si ce n'est pas un objet → **erreur de structure** ; une clé inconnue ou une valeur hors des listes ci-dessus → **erreur de structure** (le studio ne produit que des valeurs valides, donc une autre valeur est un contenu cassé) ; `image` / `imageSize` sur un écran qui n'a pas d'image → **avertissement de style** (`soft=True`, voir comment les règles de style sont marquées dans ce fichier). Tests dans `backend/apps/curriculum/test_parcours79.py` et `backend/apps/superadmin/tests/test_studio79.py` (un contenu avec `layout` valide se publie ; une valeur inconnue bloque ; sans image, avertissement confirmable).
`manage.py check_parcours79` doit rester « conforme ».

## 3. Les commandes dans le studio (`ScreenInspector.tsx`)

Une section **« Mise en page »** dans l'inspecteur de chaque écran (sous « Ce que dit Palou ») :
- **Taille du texte** : quatre boutons à choix unique (Petit, Normal, Grand, Très grand) avec un « A » de taille croissante ; état coché évident.
- **Alignement** : deux boutons (à gauche, centré) avec icônes.
- **Image** (écrans histoire, découvre, et l'IA, **seulement s'il y a une image**) : quatre vignettes **schématiques** (un petit dessin du placement : image à gauche, à droite, en haut, en bas, avec le texte en barres) à choix unique ; puis la taille S / M / L.
- Bouton **« Rétablir la mise en page par défaut »** (supprime `layout` de l'écran).
- Chaque choix met à jour l'écran (`onChange`) ; la valeur par défaut n'écrit rien (un écran qui revient à la mise en page par défaut n'a plus de `layout`, pas un `layout` rempli de valeurs par défaut).
- Accessibilité : `role="radiogroup"` / `role="radio"`, flèches du clavier pour passer d'un choix à l'autre, anneau de focus du studio, cibles ≥ 40 px.
- Style dans `studio79.css`, classes préfixées `.sx-` (un test garde cette règle).
- L'aperçu (le vrai lecteur) montre le résultat tout de suite : vérifie que `PreviewFrame` reçoit bien le contenu avec `layout`.

## 4. Tests automatiques

`frontend/tests/` (style des tests existants) : `layoutClasses` (toutes les combinaisons, valeurs inconnues, absence = aucune classe) ; un écran sans `layout` produit **les mêmes classes qu'avant** ; le repli des petits écrans ; les contrôles du studio produisent les bonnes valeurs et retirent `layout` au rétablissement (composant ou logique pure). Serveur : voir le point 2.

## 5. Preuves (dans un vrai navigateur ; dossier `agents/rapports/T19-captures/` et `preuves.json`)

Mêmes exigences que T18-bis : chaque capture montre le **résultat** de l'étape, rien de flou ni de doublon, valeurs lues dans la page ou par l'API dans `preuves.json`, aucun cookie dans le dépôt, un seul profil Chrome temporaire (`--disk-cache-size=1`) supprimé après.
1. **Rien n'a bougé** : les captures `après` des trois écrans de la baseline sont identiques aux `avant` (compare les rectangles de `.p79-top-row`, de la bulle et de l'image par `getBoundingClientRect()`, valeurs avant / après dans `preuves.json`, écart ≤ 1 px).
2. **Image** : sur un écran histoire, les quatre positions × (1440, 1024, 390 px) : douze captures de l'aperçu, avec le placement mesuré (l'image est à gauche / à droite / au-dessus / au-dessous de la bulle : compare les positions des deux rectangles). Les trois tailles S/M/L à 1440 (largeur de l'image mesurée).
3. **Texte** : les quatre tailles et les deux alignements à 1440 et 390 px (taille de police calculée de `.p79-say-text`, alignement calculé).
4. **Rien ne se coupe** : le pire cas (`xl` + image `l` + `bottom`) à 1024 et 390 px : le bouton « Continuer » reste visible ou la zone défile avec sa flèche ; aucune capture avec du texte coupé. Mesure `scrollWidth` du lecteur.
5. **Dans le studio** : un parcours réel (cliquer les vignettes, voir l'aperçu changer ; « Rétablir » supprime `layout` : relis le brouillon par `GET /api/superadmin/studio79/lessons/p1-1`) ; publier avec la mise en ligne forcée (`ContentVersion … publish_at = now - 1 s` par `manage.py shell`) ; ouvrir la leçon **côté enfant** (compte élève de développement) et prouver que la mise en page choisie s'y affiche ; puis restaurer la version d'origine par l'historique.
6. **Clavier seul** : choisir une position et une taille avec les flèches ; captures avec l'anneau de focus.
À la fin, la leçon `p1-1` de la base de développement doit être revenue au contenu d'origine (dis-le dans le rapport) ; **aucun fichier de `frontend/content/` ne change**.

## Contrôles et rendu

`npm run typecheck`, `npm run lint` (0 erreur), `npm test`, `python -m ruff check .`, `python -m pytest -q`, `python manage.py check_parcours79`. Si l'API change : `python manage.py spectacular --file backend/schema.yml` et commite `schema.yml`.
Commits `[antigravity] feat(studio79): … (T19)` + `Agent: antigravity`, auteur `Antigravity <antigravity@keuria.local>`, fichiers un par un, push sur `Dev_Lansana_Coly`. Rapport `agents/rapports/T19-antigravity.md` : une section par point 1 à 6 (fait / pas fait, preuve), les défauts trouvés, ce qui reste imparfait. Ne dis « terminé » que si la compatibilité (point 1) et le parcours enfant (point 5) sont prouvés.
