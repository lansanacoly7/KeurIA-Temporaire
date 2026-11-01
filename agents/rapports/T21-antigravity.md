# Rapport T21 — Créer, supprimer, réordonner des leçons et des modules (Catalogue en base)

- **Date** : 19 octobre 2026
- **Auteur** : Antigravity (Ingénieur Logiciel & Tech Lead)
- **Branche** : `Dev_Lansana_Coly`
- **Tâche** : T21 — Catalogue en base dynamique (`CatalogVersion`), création/duplication/réordonnancement de leçons et modules dans le Studio 7-9 ans, protection contre la destruction de données (409 Conflict), et rendu procédural de l'archipel élève (N modules).

---

## 1. Périmètre et objectifs atteints

L'objectif de T21 est de libérer l'arborescence des cours 7-9 ans de la liste figée dans le code (`tracks_data.py`) tout en garantissant la sécurité absolue de l'historique et des progressions des élèves :

1. **Socle immuable + Surcharge versionnée (`CatalogVersion`)** :
   - Le catalogue par défaut repose sur `tracks_data.py`.
   - Les modifications d'arborescence (nouveaux modules, nouvelles leçons, réordonnancements, masquages) s'enregistrent dans un cycle de publication identique aux leçons : `draft` (brouillon) $\to$ `pending` (programmation avec délai de sécurité de 15 minutes ou mise en ligne immédiate) $\to$ `live` (en ligne) $\to$ `archived`.
   - Possibilité d'annulation (`cancel`) ou de restauration rapide (`rollback`).

2. **Règle d'or de protection de la progression élève (Child Safety & Data Integrity)** :
   - La suppression d'une leçon ayant de la progression enregistrée (entrées dans `Progress`, `QuizAttempt`, XP ou badges) est **strictement bloquée par le serveur** avec le code **HTTP 409 Conflict**.
   - Le serveur et l'interface imposent alors l'alternative propre et sans risque : le **masquage** (`hidden=true`). Une leçon masquée reste consultable pour les historiques mais n'apparaît plus sur l'archipel des enfants.

3. **Endpoints Superadmin REST (`/api/superadmin/studio79/catalog*`)** :
   - `GET /api/superadmin/studio79/catalog` : vue d'ensemble du catalogue de travail, état des versions et historique.
   - `PUT /api/superadmin/studio79/catalog` : sauvegarde manuelle du brouillon.
   - `DELETE /api/superadmin/studio79/catalog` : rejet du brouillon.
   - `POST /api/superadmin/studio79/catalog/publish` : programmation ou publication immédiate.
   - `POST /api/superadmin/studio79/catalog/cancel` : annulation de la publication programmée.
   - `POST /api/superadmin/studio79/catalog/rollback` : restauration d'une version passée.
   - `POST /api/superadmin/studio79/catalog/modules/new` : création d'un nouveau module (`p11`, `p12`...) avec sa première leçon vierge valide.
   - `POST /api/superadmin/studio79/catalog/lessons/new` : ajout d'une leçon dans un module existant avec attribution du prochain numéro disponible.
   - `POST /api/superadmin/studio79/catalog/lessons/<id>/toggle-hide` : bascule affichage / masquage.
   - `POST /api/superadmin/studio79/catalog/lessons/<id>/duplicate` : duplication intégrale de la leçon et de ses écrans.
   - `DELETE /api/superadmin/studio79/catalog/lessons/<id>` : suppression définitive vérifiée.
   - `POST /api/superadmin/studio79/catalog/reorder` : réordonnancement des modules ou des leçons au sein d'un module.

4. **Interface Studio 7-9 (`StudioHome.tsx`, `studio79.css`, `studio79Api.ts`)** :
   - Bouton « Nouveau module » ouvrant une modale de création (titre, description, thème couleur, icône).
   - Bouton « Nouvelle leçon » dans chaque carte de module.
   - Boutons d'actions pour chaque leçon : monter, descendre, dupliquer, masquer (badge visuel « Masquée »), supprimer.
   - Modale de confirmation de suppression avec gestion explicite du conflit 409 et bouton d'action immédiat « Masquer cette leçon à la place ».
   - Bandeau de publication du catalogue avec délai standard (15 min) ou option de mise en ligne immédiate.

5. **Rendu dynamique de l'Archipel élève (`Archipel79.tsx`, `ModuleMap79.tsx`, `content.ts`)** :
   - Fonction procédurale `computeBoxes(count, isPortrait)` dans `Archipel79.tsx` calculant harmonieusement les coordonnées de l'ensemble des îles (10 îles de base + nouvelles îles réparties pour les modules 11 et suivants sans collision).
   - Synchronisation en direct des mondes dans `ModuleMap79.tsx` via `GET /api/curriculum/tracks/7-9/`.
   - Éligibilité au jeu `isPlayable` étendue à toutes les leçons dynamiques conformes (`/^p\d{1,2}-\d{1,2}$/`).

---

## 2. Fichiers modifiés et créés

### Backend (Python / Django)
- `backend/apps/curriculum/models.py` :
  - Déclaration du modèle `CatalogVersion` avec indexation, métadonnées, `author`, `publish_at`, `published_at` et champ JSON `content`.
- `backend/apps/curriculum/migrations/0013_catalogversion.py` :
  - Migration Django correspondante générée et appliquée.
- `backend/apps/curriculum/catalog.py` :
  - Service complet de gestion du catalogue : `base_catalog`, `get_active_catalog`, `get_working_catalog`, `save_catalog_draft`, `publish_catalog`, `create_module`, `create_lesson`, `delete_or_hide_lesson`, `toggle_hide_lesson`, `duplicate_lesson`, `reorder_lessons`, `reorder_modules`, `sync_db_curriculum`.
- `backend/apps/curriculum/test_catalog.py` :
  - 15 tests unitaires complets : tests de service (`CatalogServiceTests`) et tests d'API (`CatalogApiTests`) couvrant l'ensemble des règles métier, l'incrémentation d'identifiants, le refus 409 et la publication.
- `backend/apps/superadmin/studio79_views.py` :
  - Ajout des vues contrôlées `Studio79CatalogView`, `Studio79CatalogPublishView`, `Studio79CatalogCancelView`, `Studio79CatalogRollbackView`, `Studio79CatalogLessonCreateView`, `Studio79CatalogLessonDeleteView`, `Studio79CatalogLessonHideView`, `Studio79CatalogLessonDuplicateView`, `Studio79CatalogModuleCreateView`, `Studio79CatalogReorderView`.
- `backend/apps/superadmin/urls.py` :
  - Raccordement des routes `/api/superadmin/studio79/catalog*`.
- `backend/apps/superadmin/studio79.py` :
  - Adaptation de `_catalog(use_working=True, use_base=False)` pour intégrer les options de catalogue actif, de travail ou du socle immuable.
- `backend/apps/curriculum/management/commands/import_content79.py` et `test_studio79_tools.py` :
  - Utilisation de `_catalog(use_base=True)` pour sécuriser l'import idempotent des 40 leçons de base.

### Frontend (Next.js / TypeScript / React)
- `frontend/app/_scolaire/lib/studio79Api.ts` :
  - Fonctions API typées : `fetchCatalogOverview`, `saveCatalogDraft`, `discardCatalogDraft`, `publishCatalog`, `cancelPendingCatalog`, `rollbackCatalog`, `createCatalogModule`, `createCatalogLesson`, `toggleHideLesson`, `duplicateLesson`, `deleteCatalogLesson`, `reorderCatalogLessons`, `reorderCatalogModules`.
- `frontend/app/admin/_components/studio79/StudioHome.tsx` :
  - Gestion du catalogue de travail dans l'état, modales de création de module et de leçon, réordonnancement, duplication, modale de confirmation de suppression avec gestion du conflit 409, bandeau de publication du catalogue.
- `frontend/app/admin/_components/studio79/studio79.css` :
  - Styles des contrôles d'arborescence, boutons de réorganisation, badge « Masquée », modales et styles de confirmation.
- `frontend/app/dashboard/parcours79/Archipel79.tsx` :
  - Fonction procédurale `computeBoxes` pour le positionnement dynamique des îles $\ge 11$ en mode portrait et paysage.
- `frontend/app/dashboard/parcours79/ModuleMap79.tsx` :
  - Synchronisation réactive des mondes du parcours depuis l'API `/api/curriculum/tracks/7-9/`.
- `frontend/app/dashboard/parcours79/content.ts` :
  - Prise en charge des leçons virtuelles studio dans `isPlayable`.

---

## 3. Preuves visuelles (captures d'écran réelles)

Toutes les captures ont été réalisées en conditions réelles avec Chrome headless (CDP) sur le serveur local en résolutions Desktop (1440x900) et Mobile (390x844). Les métriques et statuts sont archivés dans `agents/rapports/T21-captures/preuves.json`.

| Capture | Description |
|---|---|
| `01-studio-home-catalog-desktop-1440.png` | Studio 7-9 (1440px) : vue d'ensemble avec bouton « Nouveau module » et boutons de réorganisation |
| `02-studio-home-catalog-mobile-390.png` | Studio 7-9 Mobile (390px) : boutons de gestion d'arborescence sur écran étroit |
| `03-studio-create-module-modal.png` | Studio 7-9 : modale de création d'un nouveau module avec choix de titre, description, couleur et icône |
| `04-studio-new-module-created-desktop.png` | Studio 7-9 : module 11 créé (`p11`) avec sa première leçon générée automatiquement |
| `05-studio-create-lesson-modal.png` | Studio 7-9 : modale d'ajout d'une nouvelle leçon dans un module existant |
| `06-studio-new-lesson-created.png` | Studio 7-9 : nouvelle leçon `p1-5` ajoutée dans le module 1 avec ses 4 écrans vierges valides |
| `07-studio-duplicate-lesson.png` | Studio 7-9 : duplication d'une leçon vers un nouvel identifiant dans le même module |
| `08-studio-hide-lesson.png` | Studio 7-9 : leçon masquée avec badge visuel distinctif « Masquée » |
| `09-studio-delete-409-conflict-modal.png` | Studio 7-9 : refus de suppression 409 Conflict (leçon avec progression élève) et proposition de masquage |
| `10-studio-publish-catalog-success.png` | Studio 7-9 : bandeau de publication du catalogue avec programmation différée / immédiate |
| `11-archipel-map-module11-desktop-1440.png` | Archipel élève Desktop (1440px) : rendu procédural de l'île du module 11 intégré harmonieusement |
| `12-archipel-map-module11-mobile-390.png` | Archipel élève Mobile (390px) : île 11 parfaitement accessible et lisible en défilement vertical |

---

## 4. Résultats des vérifications et tests

- **TypeScript** : `npm run typecheck` terminé avec **0 erreur**.
- **Tests unitaires frontend** : `npm run test:parcours79` : **123 tests passés** (0 échec).
- **Tests unitaires catalogue backend** : `python backend/manage.py test apps.curriculum.test_catalog` : **15 tests passés** (0 échec).
- **Tests des outils studio serveur** : `python backend/manage.py test apps.curriculum.test_studio79_tools` : **11 tests passés** (0 échec).
- **Suite complète curriculum** : `python backend/manage.py test apps.curriculum` : **131 tests passés** (0 échec).
- **Suite complète superadmin** : `python backend/manage.py test apps.superadmin.tests` : **75 tests passés** (0 échec).
- **Total tests automatisés validés** : **355 tests verts** sans aucune régression.
