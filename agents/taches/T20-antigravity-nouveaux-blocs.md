# T20 — Nouveaux blocs : vidéo (lien ou fichier), lien, bouton

## 1. Objectif
Permettre à l'administrateur d'ajouter dans une leçon 7-9 ans un écran de type « Média » (`kind: "media"`) contenant :
1. Une vidéo via un lien externe sécurisé (YouTube nocookie ou Vimeo) OU un fichier vidéo MP4/WebP téléversé via la médiathèque (`MediaPicker`).
2. Des boutons ou liens d'action :
   - Vers une autre leçon interne (`kind: "lesson"`, ex: `"p2-3"`).
   - Vers un site externe (`kind: "external"`, `https://...`), protégé pour les enfants de 7-9 ans par une boîte de dialogue de confirmation « Demande à un adulte » avant ouverture dans un nouvel onglet (`rel="noopener noreferrer"`).

## 2. Contrat de données
Dans `frontend/app/dashboard/parcours79/types.ts` et `backend/apps/curriculum/parcours79.py` :
```ts
export interface MediaAction {
  label: string;
  kind: "lesson" | "external";
  target: string; // lesson: "p2-3", external: "https://..."
}

export interface MediaBlock {
  type: "video-link" | "video-file" | "image";
  url?: string;     // https://... (YouTube ou Vimeo uniquement)
  ref?: string;     // media:<id>.<empreinte>
  caption?: string; // Légende facultative
}

export interface MediaScreen extends ScreenBase {
  kind: "media";
  media: MediaBlock;
  actions?: MediaAction[];
}
```

## 3. Règles de sécurité et validation
- **Aucun HTML libre** (XSS).
- Pour `video-link` :
  - Seuls les domaines `youtube.com`, `youtu.be`, `vimeo.com` en `https://` sont acceptés.
  - Analyse stricte et reconstruction de l'URL d'intégration sandboxée :
    - YouTube : `https://www.youtube-nocookie.com/embed/<id>`
    - Vimeo : `https://player.vimeo.com/video/<id>`
  - Iframe avec attributs stricts : `sandbox="allow-scripts allow-same-origin"`, `referrerpolicy="no-referrer"`, `loading="lazy"`. Pas d'autoplay.
- Pour `video-file` :
  - Balise `<video controls playsinline preload="metadata">` pointant vers `/api/media/<id>/<empreinte>`.
- Pour `actions` :
  - `lesson` : la cible doit être un identifiant de leçon valide (ex: `p1-1` à `p10-4`).
  - `external` : URL strictement en `https://`. Jamais de `javascript:`, `data:`, `file:`.
  - Côté élève : clic sur un lien `external` ouvre une modale de confirmation « Demande à un adulte » avant d'ouvrir la page dans un nouvel onglet avec `rel="noopener noreferrer"`.
- Serveur (`backend/apps/curriculum/parcours79.py`) :
  - Valide la structure de `media` et `actions`.
  - Rejette toute URL non conforme ou domaine interdit (code 422 `Report.error`).
  - Vérifie l'existence de la leçon cible pour les actions internes.
- Voix de Palou : lit le texte de l'écran (`screen.text`), comme les autres écrans.

## 4. Interface Studio
- Dans `studioModel.ts` : ajouter le type d'écran `media` à `SCREEN_KINDS` avec son icône (vidéo), sa couleur et son écran vierge `newScreen("media")`.
- Dans `ScreenInspector.tsx` :
  - Sélection du type de média : Lien vidéo, Fichier vidéo, Image.
  - Champ de saisie d'URL pour le lien vidéo avec validation temps réel et aperçu.
  - Bouton de choix dans la médiathèque (`MediaPicker` avec `kind="video"` ou `"image"`).
  - Gestionnaire d'actions : ajout de boutons, choix du type (Leçon ou Lien externe), saisie de l'étiquette et de la cible.
- Aperçu dans `PreviewFrame.tsx` : rendu fidèle de la vidéo et des boutons.

## 5. Rendu dans le lecteur élève (`LessonPlayer79.tsx`)
- Intégration dans la boucle de rendu des écrans.
- Lecteur vidéo ou iframe responsive, proportionné, respectant le ratio 16:9 sans débordement.
- Rangée des boutons d'action stylés.
- Modale de protection parentale / adulte pour les liens sortants.

## 6. Preuves et validation
1. Tests unitaires frontend (`frontend/tests/media-screen.test.mjs`).
2. Tests unitaires backend (`backend/apps/curriculum/test_parcours79.py`, `backend/apps/superadmin/tests/test_studio79.py`).
3. Vérification dans un vrai navigateur (desktop 1440px et mobile 390px) :
   - Vidéo YouTube intégrée.
   - Vidéo fichier MP4 intégrée.
   - Bouton de redirection vers une autre leçon.
   - Bouton de redirection externe avec confirmation adulte.
   - Refus serveur des URL malveillantes ou non autorisées.
4. Captures d'écran et `preuves.json` dans `agents/rapports/T20-captures/`.
5. Rapport final `agents/rapports/T20-antigravity.md`.
