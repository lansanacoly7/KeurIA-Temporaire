# Studio des leçons du parcours 7-9 — référence

But demandé par Lansana (2026-10-17) : l'administrateur général (Siribra) crée et modifie les leçons, devoirs, jeux et défis **sans jamais coder**,
dans un studio visuel à part entière (texte, polices, images, vidéos, liens, boutons, glisser-déposer, aperçu fidèle), avec un **délai de sécurité**
(15 minutes) avant qu'une modification soit visible des enfants. Le studio doit être beau, fluide, une référence. On commence par les leçons 7-9 ans.

## Décisions prises (ne pas les rediscuter sans Lansana)

- **Tout est dans la base de données** (PostgreSQL en production, SQLite en développement) : textes, versions **et médias**. Aucun hébergement à part, gratuit.
  Images : redimensionnées (1 600 px) et converties en WebP à l'envoi. Fichiers vidéo : petits (20 Mo par défaut, réglable `STUDIO_VIDEO_MAX_MB`) ;
  au-delà, l'auteur colle un **lien** YouTube/Vimeo.
- **Format de contenu = celui qui existe déjà** (`frontend/app/dashboard/parcours79/types.ts`, `LessonContent` : une suite d'écrans typés, 17 types d'activités).
  Le studio édite ce format ; le lecteur de l'enfant (`LessonPlayer79`) n'a pas de second format à apprendre. Les 40 leçons existantes sont éditables dès le premier jour.
- **Cycle de vie** (`backend/apps/curriculum/models.py` → `ContentVersion`) : brouillon (une seule copie de travail par leçon) → « Publier » programme la mise en ligne
  `STUDIO_PUBLISH_DELAY_MINUTES` (15) plus tard → en ligne. Pas de tâche planifiée : la version en ligne est la plus récente dont `publish_at` est passé.
  On peut **annuler** une publication en attente. Le **retour à une ancienne version est immédiat** (secours).
- **Deux sortes de problèmes** : *structure* (le lecteur ne saurait pas jouer le contenu) = **bloque** la publication ; *style* de la bible narrative (phrases longues,
  6 à 9 écrans…) = **avertissement** que l'auteur confirme (`acknowledge`). Marqueur côté serveur : `Report.error(..., soft=True)` dans `backend/apps/curriculum/parcours79.py`.
- **Voix de Palou** : uniquement les fichiers audio enregistrés, **aucune voix de navigateur** (règle du projet). Un passage dont le texte change devient **muet** :
  le serveur écrit `voiceOff: ["e03", "e04-m1-q", …]` dans le contenu publié (`studio79._with_voice_off`), le lecteur saute ces clips.
- **Images d'un contenu** : un fichier du site (`m01-l1-xxx.webp`) ou une image du studio `media:<id>.<8 car. de l'empreinte>` (URL `/api/media/<id>/<empreinte>`, cache d'un an).
- Les **titres des leçons** restent ceux du catalogue serveur (`backend/apps/curriculum/data/tracks_data.py`) : le studio ne les change pas.

## Serveur (déjà fait, 24 tests : `backend/apps/superadmin/tests/test_studio79.py`)

| Fichier | Rôle |
|---|---|
| `curriculum/models.py` | `ContentVersion` (versions), `MediaAsset` (images/vidéos en base) |
| `curriculum/versions.py` | lecture : `live_version`, `pending_version`, `draft_version`, `next_number` |
| `curriculum/media.py` | contrôle (par le contenu du fichier) + optimisation des envois, diffusion avec ETag et lecture par morceaux (vidéo) |
| `curriculum/parcours79.py` | validateur de contenu (structure = erreur ; style = `soft`) |
| `superadmin/studio79.py` | service : liste, lecture, brouillon, contrôle, publication, annulation, retour arrière, `voiceOff` |
| `superadmin/studio79_views.py` + `urls.py` | routes admin |
| `curriculum/views.py` + `urls.py` | routes publiques : contenu en ligne, médias |

Routes (admin = rôle `admin` seulement) :
`GET superadmin/studio79/lessons` · `GET superadmin/studio79/lessons/<id>` · `PUT|DELETE …/<id>/draft` · `POST …/<id>/validate|publish|cancel|rollback` ·
`GET|POST superadmin/media` ; publiques : `GET api/curriculum/content79/` (manifeste des leçons modifiées) · `GET api/curriculum/content79/<id>/` (contenu en ligne, 404 = contenu d'origine du site) ·
`GET api/media/<id>/<empreinte>`.
Erreurs de publication : 422 `{blocking, issues}` (structure) ; 409 `{needsAcknowledge, issues}` (style). `issues[]` = `{severity: error|warning, screen: n°|null, message}`.

## Interface (en cours)

Dossier `frontend/app/admin/_components/studio79/` :

| Fichier | État |
|---|---|
| `roundSchemas.ts` | fait — description des 17 activités (champs, modèles vierges) |
| `SchemaForm.tsx` | fait — formulaire générique (listes glisser-déposer, images du catalogue, liens entre éléments) |
| `studioModel.ts` | fait — sortes d'écrans, modèles vierges, compteurs de style |
| `ScreenRail.tsx` | fait — colonne des écrans (glisser-déposer, ajout, copie, suppression) |
| `ScreenInspector.tsx` | fait — panneau de droite (texte, pose de Palou, image, mot nouveau, activités…) |
| `MediaPicker.tsx` | fait — médiathèque (envoi par glisser-déposer) |
| `PreviewFrame.tsx` + `app/studio-apercu/page.tsx` | fait — aperçu = le vrai lecteur dans un cadre isolé (ordinateur / tablette / téléphone) |
| `LessonEditor.tsx`, `StudioHome.tsx`, `PublishPanel.tsx`, `studio79.css`, routes, menu | **à faire** (tâche T18) |
| lecteur enfant lisant le contenu publié | **à faire** (tâche T17) |

Client API : `frontend/app/_scolaire/lib/studio79Api.ts` (types `StudioLesson`, `Issue`, `VersionInfo`, `MediaItem`, fonctions `getStudioLesson`, `saveDraft`, `publishLesson`, `publishRefusal`, …).
Le lecteur `LessonPlayer79` accepte maintenant `startAt` et `preview` (sans voix, rien d'enregistré) ; `Img79.lessonImageUrl` comprend `media:`.

## Plus tard (hors première livraison)

Options de mise en page par écran (position de l'image : haut, bas, gauche, droite ; taille du texte), nouveaux blocs (vidéo en lien ou fichier, lien, bouton),
création de nouvelles leçons et de nouveaux modules, studios des devoirs, jeux et défis, gestion/suppression des médias, commentaires de relecture.
