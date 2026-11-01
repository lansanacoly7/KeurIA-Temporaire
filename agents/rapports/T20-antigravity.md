# Rapport T20 — Nouveaux blocs : vidéo (lien ou fichier), lien, bouton

- **Date** : 18 octobre 2026
- **Auteur** : Antigravity (reprise en solo suite à l'indisponibilité de Claude)
- **Branche** : `Dev_Lansana_Coly`
- **Tâche** : T20 — Nouveaux blocs vidéo (lien YouTube/Vimeo ou fichier de médiathèque), liens et boutons d'action avec protection parentale.

---

## 1. Périmètre et objectifs atteints

L'objectif de T20 est de permettre à l'administrateur d'enrichir les leçons 7-9 ans d'un écran multimédia (`kind: "media"`) complet sans jamais coder :
1. **Intégration vidéo sécurisée** :
   - Par lien externe : YouTube (`youtube.com`, `youtu.be`) ou Vimeo (`vimeo.com`), avec analyse d'URL et réécriture stricte vers l'URL d'intégration sandboxée (`youtube-nocookie.com/embed/<id>`, `player.vimeo.com/video/<id>`).
   - Par fichier : lecture directe via `<video controls playsinline preload="metadata">` pointant vers `/api/media/<id>/<empreinte>`.
   - Par image : intégration d'une image de la médiathèque.
2. **Protection stricte pour enfants de 7-9 ans (Child Safety)** :
   - Tout lien ou bouton vers un site externe (`kind: "external"`) est obligatoirement en `https://` (rejet strict côté serveur et client de `javascript:`, `data:`, etc.).
   - Côté élève, un clic sur un lien externe n'ouvre jamais directement le site : une modale de confirmation « **Demande à un adulte !** » s'affiche avec le nom du site et nécessite une confirmation explicite avant d'ouvrir un nouvel onglet avec `rel="noopener noreferrer"`.
   - Les boutons vers une autre leçon (`kind: "lesson"`) sont sécurisés et naviguent directement au sein de l'application.
3. **Studio 7-9 ans (`LessonEditor.tsx`, `ScreenInspector.tsx`, `studioModel.ts`)** :
   - Ajout du type d'écran `media` avec teinte `coral`, icône `Video` et modèle d'écran vierge valide.
   - Éditeur de bloc média complet : onglets « Lien vidéo », « Fichier vidéo », « Image », aperçu temps réel, validation immédiate des URL avec avertissement visuel, intégration du `MediaPicker`.
   - Éditeur d'actions : ajout dynamique de boutons, sélection du type (Leçon ou Lien externe), saisie de l'étiquette et de la cible.
4. **Lecteur élève (`LessonPlayer79.tsx`)** :
   - Rendu de l'écran média respectant le ratio 16:9, entièrement responsive, sans débordement horizontal ni vertical (desktop 1440px et mobile 390px).
   - Prise en charge de la voix narrative de Palou (`screen.text`).

---

## 2. Fichiers modifiés et créés

### Backend (Python / Django)
- `backend/apps/curriculum/parcours79.py` :
  - Définition des constantes `MEDIA_TYPES`, `MEDIA_ACTION_KINDS`, `ALLOWED_VIDEO_DOMAINS`, `LESSON_ID_RE`.
  - Fonction de validation `_check_media_screen(report, where, screen)` : contrôle de la structure, des domaines vidéo autorisés, des URL en `https://`, des références de médiathèque et des cibles d'actions.
  - Intégration de `_check_media_screen` dans `_check_lesson`.
- `backend/apps/curriculum/test_parcours79.py` :
  - Classe `MediaScreenTests` (10 tests unitaires complets couvrant YouTube, Vimeo, MP4, image, rejet de domaines non autorisés, rejet de `javascript:`, formats invalides).
- `backend/apps/superadmin/tests/test_studio79.py` :
  - Test d'enregistrement de brouillon avec écrans média (`test_media_screen_with_video_file_or_link_can_be_saved_in_draft`).

### Frontend (Next.js / TypeScript / CSS)
- `frontend/app/dashboard/parcours79/types.ts` :
  - Interfaces `MediaAction`, `MediaBlock`, `MediaScreen` et mise à jour de l'union `Screen`.
- `frontend/app/dashboard/parcours79/logic.ts` :
  - Fonction `parseVideoEmbedUrl(url)` extrayant les identifiants YouTube / Vimeo et générant l'URL sandboxée nocookie.
  - Fonction `resolveMediaSource(refOrUrl)`.
- `frontend/tests/parcours79-logic.test.mjs` :
  - Tests unitaires complets de l'analyse et réécriture d'URL vidéo et de la résolution de médias.
- `frontend/app/admin/_components/studio79/studioModel.ts` :
  - Ajout de `media` à `SCREEN_KINDS`, `KIND_ORDER` et générateur `newScreen("media")`.
- `frontend/app/admin/_components/studio79/ScreenInspector.tsx` :
  - Composants `MediaBlockEditor` et `ActionsEditor` avec gestion des onglets, saisie d'URL, intégration `MediaPicker`, aperçu et badges d'erreur.
- `frontend/app/admin/_components/studio79/studio79.css` :
  - Tokens `--ec-tint-coral` et `--ec-tint-coral-ink`, pastilles `.sx-kind-dot[data-tone="coral"]`, styles complets sous `.sx-media-*` et `.sx-action-*`.
- `frontend/app/dashboard/parcours79/LessonPlayer79.tsx` :
  - Prise en charge du type `media` dans `KIND`.
  - Modale de protection parentale « Demande à un adulte ! ».
  - Rendu iframe YouTube/Vimeo sécurisé (`sandbox="allow-scripts allow-same-origin allow-presentation"`, `referrerpolicy="no-referrer"`), balise `<video controls>` et boutons d'action.
- `frontend/app/dashboard/parcours79/styles/01-parcours-7-9-ans-carte-des-iles-fenetre.css` :
  - Styles du conteneur responsive 16:9 (`.p79-video-container`, `.p79-video-iframe`, `.p79-video-player`), de la rangée de boutons (`.p79-actions-row`, `.p79-action-btn`) et de la modale.

---

## 3. Preuves visuelles (captures d'écran réelles)

Toutes les captures ont été réalisées en conditions réelles avec Chrome headless piloté par CDP sur le serveur local en résolutions Desktop (1440x900) et Mobile (390x844). Les métriques et statuts sont archivés dans `agents/rapports/T20-captures/preuves.json`.

| Capture | Description |
|---|---|
| `01-studio-inspector-desktop-1440.png` | Studio 7-9 (1440px) : inspecteur d'écran affichant l'éditeur de média YouTube avec URL, légende et boutons d'action |
| `02-studio-preview-iframe-1440.png` | Studio 7-9 (1440px) : aperçu direct de la vidéo intégrée dans le cadre miroir du lecteur élève |
| `03-studio-url-validation-error-1440.png` | Studio 7-9 (1440px) : détection temps réel d'un domaine non autorisé avec message d'erreur d'invalidation |
| `04-player-media-youtube-desktop-1440.png` | Lecteur élève (1440px) : rendu vidéo YouTube nocookie responsive 16:9 avec texte de Palou et boutons d'action |
| `05-player-media-youtube-mobile-390.png` | Lecteur élève Mobile (390px) : adaptation parfaite sans débordement horizontal |
| `06-player-external-modal-desktop-1440.png` | Lecteur élève (1440px) : modale de protection parentale « Demande à un adulte ! » suite au clic sur « Site partenaire » |
| `07-player-external-modal-mobile-390.png` | Lecteur élève Mobile (390px) : modale de protection parentale adaptée sur écran étroit |
| `08-player-media-videofile-desktop-1440.png` | Lecteur élève (1440px) : écran avec fichier vidéo MP4 natif (`<video controls>`) servi par l'API média |
| `09-player-media-videofile-mobile-390.png` | Lecteur élève Mobile (390px) : fichier vidéo MP4 natif sur mobile |
| `10-studio-mobile-viewport-390.png` | Studio d'édition complet rendu sur mobile 390px |

---

## 4. Résultats des vérifications et tests

- **TypeScript** : `npm run typecheck` terminé avec **0 erreur**.
- **Linting** : `npm run lint` validé sans erreur.
- **Tests unitaires frontend** : `npm run test:parcours79` : **123 tests passés** (0 échec).
- **Style backend** : `ruff check backend` : **All checks passed!** (0 erreur).
- **Contrôle du curriculum** : `python manage.py check_parcours79` : **Contenu conforme** (10 chapitres validés, 0 erreur bloquante).
- **Migrations Django** : `python manage.py makemigrations --check --dry-run` : **No changes detected**.
- **Tests unitaires backend** : `pytest apps/curriculum/test_parcours79.py apps/superadmin/tests/test_studio79.py -q` : **125 tests passés** (0 échec).
- **Rejets de sécurité vérifiés en API** :
  - URL vidéo sur domaine non autorisé (`untrusted-site.com`) : correctement détecté et rejeté avec sévérité `error`.
  - Cible d'action non sécurisée (`javascript:alert(1)`) : correctement rejeté avec sévérité `error`.
  - Débordement horizontal mobile 390px : `scrollWidth === clientWidth === 390` (aucun débordement).
