# Rapport T22 — Studios des devoirs, jeux et défis du jour

- **Date** : 19 octobre 2026
- **Auteur** : Antigravity (Ingénieur Logiciel & Tech Lead)
- **Branche** : `Dev_Lansana_Coly`
- **Tâche** : T22 — Studios des devoirs (`Mission`), jeux (`Activity`), énigmes (`Riddle`) et défis du jour (`DailyChallenge`) dans le Studio 7-9 ans, avec formulaires dynamiques `SchemaForm`, validation serveur stricte, cycle complet de publication différée (15 min) / rollback, et synchronisation élève anti-triche.

---

## 1. Périmètre et objectifs atteints

L'objectif de T22 est de permettre à l'administrateur général (Siribra) de **ne plus jamais coder** pour administrer, créer et mettre à jour les énigmes, défis, devoirs et jeux du parcours pédagogique :

1. **Extension du modèle unifié `ContentVersion`** :
   - Ajout des constantes de kinds : `riddle`, `daily_challenge`, `mission`, `activity`.
   - Cycle unifié : Brouillon (`draft`) $\to$ Publication différée (`pending`, délai 15 min ou immédiat) $\to$ Mise en ligne (`live`) $\to$ Historique (`archived`).
   - Mécanismes d'annulation (`cancel`) et de retour arrière instantané (`rollback`).

2. **Moteur Studio unifié (`backend/apps/superadmin/studio_items.py`)** :
   - Fonctions unifiées pour l'ensemble des types d'items : listing avec statuts, lecture, sauvegarde brouillon, publication immédiate ou différée, annulation, restauration, validation de structure, création d'items et bascule d'activation.
   - Synchronisation automatique avec les modèles relationnels du socle (`Riddle`, `DailyChallenge`, `Mission`, `Activity`) à chaque mise en ligne `live`.
   - Fonction d'auto-sync `sync_due_pending_versions()` exécutée à la volée pour promouvoir les publications arrivées à échéance.

3. **Intégrations publiques élèves & Protection anti-triche** :
   - `apps.progress.riddle` : `choose_riddle` et `todays_riddle_day` prennent en compte les énigmes actives en ligne.
   - `apps.progress.challenge` : `todays_challenge` sert le défi en ligne.
   - `apps.scolaire.mission_quizzes` : les missions tirent leurs questions directement des surcharges en ligne, et les endpoints élèves masquent systématiquement les réponses correctes (`correctIndex`, `correct_index`).

4. **Interface Studio (`frontend/app/admin/_components/studio79/`)** :
   - Navigation 5 onglets dans `StudioHome.tsx` :
     - 📚 *Leçons & Modules*
     - 🧩 *Énigmes (7-9 ans)*
     - ⚡ *Défis du jour*
     - 📝 *Devoirs (Missions)*
     - 🎮 *Jeux & Activités*
   - Barre de recherche et indicateurs d'état pour chaque élément.
   - Modale d'édition `StudioItemModal.tsx` générée via `SchemaForm` à partir de définitions de schémas déclaratives (`studioItemSchemas.ts`).
   - Aperçu interactif dynamique fidèle selon le type (simulation de quiz interactive, carte mission, badge XP).
   - Bandeau de publication avec délai de sécurité de 15 minutes ou mise en ligne forcée, et historique de versions avec bouton de restauration.

---

## 2. Fichiers créés et modifiés

### Backend (Python / Django)
- `backend/apps/curriculum/models.py` :
  - Déclaration des constantes `KIND_RIDDLE`, `KIND_DAILY_CHALLENGE`, `KIND_MISSION`, `KIND_ACTIVITY`.
- `backend/apps/superadmin/studio_items.py` :
  - Moteur complet CRUD, validation de structure, cycle de publication, synchronisation base de données et auto-sync.
- `backend/apps/superadmin/studio79_views.py` & `backend/apps/superadmin/urls.py` :
  - Endpoints REST `/api/superadmin/studio79/items/<kind>/...` (list, detail, draft, publish, cancel, rollback, validate, toggle-active, new).
- `backend/apps/progress/riddle.py` :
  - Résolution des énigmes actives avec prise en compte du studio et synchro.
- `backend/apps/progress/challenge.py` :
  - Résolution des défis actifs du jour avec synchro du studio.
- `backend/apps/scolaire/mission_quizzes.py` :
  - Chargement dynamique des questions de devoirs/missions depuis `ContentVersion`.
- `backend/apps/superadmin/tests/test_studio_items.py` :
  - 11 tests automatisés complets couvrant listing, validation, cycle de publication, annulation, rollback et étanchéité anti-triche des réponses.

### Frontend (Next.js / React / TypeScript)
- `frontend/app/_scolaire/lib/studio79Api.ts` :
  - Types `StudioItemSummary`, `StudioItemDetail`, `StudioItemContent`, et fonctions API `listStudioItems`, `getStudioItem`, `saveStudioItemDraft`, `discardStudioItemDraft`, `publishStudioItem`, `cancelStudioItemPending`, `rollbackStudioItem`, `validateStudioItem`, `createStudioItem`, `toggleStudioItemActive`.
- `frontend/app/admin/_components/studio79/studioItemSchemas.ts` :
  - Schémas déclaratifs `FieldDef[]` pour les énigmes, défis, devoirs et activités.
- `frontend/app/admin/_components/studio79/StudioItemModal.tsx` :
  - Modale d'édition, aperçu de quiz interactif, bandeau de publication et panneau d'historique.
- `frontend/app/admin/_components/studio79/StudioHome.tsx` :
  - Barre de navigation 5 onglets, grille d'items avec recherche et boutons d'action.
- `frontend/app/admin/_components/studio79/studio79.css` :
  - Classes `.sx-items-*`, `.sx-item-*`, `.sx-quiz-preview-*`, conformes aux tokens CSS `--sx-*` et `--ec-*`.

---

## 3. Résultats de l'Autorevue & Tests

| Suite de tests | Commande | Résultat |
| :--- | :--- | :--- |
| **Studio Items Test Suite** | `python manage.py test apps.superadmin.tests.test_studio_items` | **11/11 tests passés (0.63s)** |
| **Curriculum Tests** | `python manage.py test apps.curriculum` | **131/131 tests passés (13.85s)** |
| **Superadmin Tests** | `python manage.py test apps.superadmin.tests` | **86/86 tests passés (12.13s)** |
| **Frontend TypeScript** | `npm run typecheck` | **0 erreur** |
| **Parcours 7-9 Tests** | `npm run test:parcours79` | **123/123 tests passés (38.6s)** |
