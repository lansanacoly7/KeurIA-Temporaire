# T23 — Gestion des médias (Médiathèque Studio)

## 1. Problématique & Objectif
Dans le Studio 7-9 ans, l'administrateur peut envoyer des images et de petites vidéos intégrées dans les leçons, énigmes et devoirs.
Tous les médias sont conservés dans la base de données (modèle `MediaAsset`), sans hébergement tiers.
Pour assurer la maintenabilité, l'accessibilité et la propreté du système :
1. **Liste avec recherche** : recherche textuelle par nom de fichier ou texte alternatif, filtrage par type (image, vidéo) et par statut d'utilisation (utilisé, inutilisé).
2. **Traçabilité & Détection d'utilisation (Usage Tracking)** : pour chaque média, scanner l'ensemble des versions de contenu (`ContentVersion` : leçons, énigmes, défis, devoirs, catalogue) pour identifier précisément où la référence `media:<id>.<stamp>` est citée.
3. **Protection contre la suppression accidentelle (Child Safety & Data Integrity)** :
   - Un média **utilisé** (même dans une version archivée de l'historique ou un brouillon) **ne peut jamais être supprimé** ; le serveur retourne un code d'erreur **HTTP 409 Conflict** détaillant les contenus dépendants.
   - Seuls les **médias inutilisés** peuvent être supprimés.
4. **Calcul de quota & Alerte de stockage** : affichage du poids total de la médiathèque en base, jauge d'occupation par rapport au quota conseillé (`STUDIO_MEDIA_MAX_MB`), et alerte préventive avant saturation (seuil à 80%).
5. **Accessibilité & Texte alternatif** : ajout d'un champ `alt` (texte alternatif pour malvoyants et lecteurs d'écran) modifiable directement dans le Studio.
6. **Tests automatisés & validation** : suite complète de tests serveur validant la recherche, le calcul d'utilisation, le refus de suppression (409) et la mise à jour des métadonnées.

---

## 2. Spécification Technique Backend

### A. Modèle `MediaAsset` (`backend/apps/curriculum/models.py`)
- Ajout du champ :
  ```python
  alt = models.CharField('Texte alternatif', max_length=300, blank=True, default='')
  ```
- Migration Django associée.

### B. Paramètres de stockage (`backend/keuria/settings.py`)
- `STUDIO_MEDIA_MAX_MB` : taille maximale recommandée pour l'ensemble des médias (défaut 500 Mo).
- `STUDIO_MEDIA_WARNING_PERCENT` : pourcentage d'alerte (défaut 80%).

### C. Service de médiathèque (`backend/apps/curriculum/media.py`)
- `get_media_storage_stats()` : poids total, quota max, pourcentage d'occupation et indicateur d'alerte.
- `get_media_usages(asset_ids: list[int] | None = None) -> dict[int, list[dict]]` :
  - Parcourt les `ContentVersion` pour extraire toutes les références `media:<id>.<stamp>`.
  - Associe chaque média aux leçons / items où il apparaît avec état (`live`, `draft`, `pending`, `past`).
- `delete_asset(asset_id: int, user)` :
  - Vérifie les usages. Si `len(usages) > 0`, lève une `ApiError` 409 Conflict.
  - Si 0 usage, supprime l'enregistrement et trace dans le journal d'audit.
- `update_asset_metadata(asset_id: int, name: str | None, alt: str | None, user)` :
  - Met à jour `name` et `alt`.

### D. Endpoints Superadmin (`backend/apps/superadmin/studio79_views.py` & `urls.py`)
- `GET /api/superadmin/media` :
  - Paramètres : `q` (recherche), `kind` (image/video), `usage` (all/used/unused), `page`, `pageSize`.
  - Retourne les résultats avec métadonnées (`alt`, `usages`, `usageCount`) et le bloc `storage`.
- `POST /api/superadmin/media` : envoi de fichier (existant optimisé).
- `GET /api/superadmin/media/<int:pk>` : détail d'un média avec liste exhaustive de ses utilisations.
- `PATCH /api/superadmin/media/<int:pk>` : mise à jour du texte alternatif et du nom.
- `DELETE /api/superadmin/media/<int:pk>` : suppression sécurisée (409 si utilisé).

---

## 3. Spécification Technique Frontend

### A. API Client (`frontend/app/_scolaire/lib/studio79Api.ts`)
- Mise à jour du type `MediaItem` (`alt`, `usageCount`, `usages`).
- Types `MediaStorageStats` et `MediaUsage`.
- Fonctions `deleteMedia(id)`, `updateMediaMetadata(id, data)`.

### B. Interface Studio (`frontend/app/admin/_components/studio79/`)
- Onglet dédié **Médias** dans `StudioHome.tsx` :
  - Jauge de stockage avec indicateur en Mo et alerte visuelle si seuil atteint.
  - Champ de recherche en direct et filtres par type / utilisation.
  - Grille des médias avec miniature, nom, alt, taille, badge d'utilisation.
  - Bouton d'édition du texte alternatif et du nom.
  - Bouton de suppression avec garde-fou (désactivé ou bloqué avec avertissement si utilisé).
- Amélioration de `MediaPicker.tsx` :
  - Recherche et badge d'utilisation directement lors de la sélection dans l'inspecteur.

---

## 4. Plan de Test & Vérification
1. Tests unitaires serveur (`backend/apps/superadmin/tests/test_studio_media.py`) :
   - Recherche par nom et par alt text.
   - Détection d'utilisation sur `ContentVersion` en ligne, brouillon et archivée.
   - Blocage de suppression avec 409 Conflict et message explicatif.
   - Suppression autorisée sur média non utilisé.
   - Calcul du poids total et alerte de quota.
   - Mise à jour de `alt` et `name`.
2. Vérification TypeScript et suite de tests existante :
   - `npm run typecheck` $\to$ 0 erreur.
   - `python manage.py test apps.superadmin.tests` $\to$ tous verts.
   - `npm run test:parcours79` $\to$ 123/123 verts.
