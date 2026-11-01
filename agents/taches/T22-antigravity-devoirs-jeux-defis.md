# T22 — Studios des devoirs, jeux et défis du jour

## 1. Problématique & Objectif
L'administrateur général (Siribra) doit pouvoir **ne plus jamais coder** pour :
1. Les **énigmes 7-9 ans** (`Riddle`, 80 énigmes du socle rattachées aux leçons).
2. Les **défis du jour** (`DailyChallenge`, rotation quotidienne pour tous les élèves).
3. Les **devoirs** (`Mission`, devoirs scolaires et bilans avec quiz personnalisables).
4. Les **jeux et activités d'arcade** (`Activity`, configuration des titres et récompenses d'XP).

L'objectif de T22 est de généraliser le moteur de versioning de `ContentVersion` à tous ces types de contenus pédagogiques, d'offrir des formulaires dynamiques basés sur `SchemaForm`, un contrôle de structure rigoureux côté serveur, un aperçu interactif fidèle pour l'auteur, et une intégration directe avec les endpoints publics des élèves sans fuite de réponses correctes.

---

## 2. Règles d'or & Sécurité du jeu élève
1. **Socle + Surcharge versionnée (`ContentVersion`)** :
   - `kind` prend en charge : `riddle`, `daily_challenge`, `mission`, `activity`.
   - Cycle unifié : Brouillon (`draft`) $\to$ Publication programmée (`pending`, délai 15 min configurable ou immédiat) $\to$ En ligne (`live`) $\to$ Historique (`archived`).
   - Possibilité d'annulation de publication et de retour en arrière immédiat (`rollback`).
2. **Confidentialité absolue des réponses (Anti-triche)** :
   - La bonne réponse (`correctIndex`, `correct_index`, `options` correctes) n'est **JAMAIS** renvoyée aux endpoints publics des élèves avant que l'élève n'ait soumis sa réponse.
   - Les options restent mélangées de manière déterministe par élève et par jour (`shuffle.py`).
3. **Contrôle de structure strict côté serveur** :
   - Énigme : question non vide, options non vides (min 2, standard 3), index de bonne réponse valide et unique, explication non vide, leçon existante dans le catalogue.
   - Défi du jour : thème, question, options valides, réponse correcte unique dans l'intervalle, explication.
   - Devoir (Mission) : titre, description, durée $>0$, XP $\ge 0$, questions de quiz cohérentes avec options et bonne réponse.
   - Activité : identifiant, type conforme, titre, XP positive.
4. **Continuité de service** :
   - Si aucune version `ContentVersion` n'a été créée pour un élément, le socle existant en base de données continue de fonctionner à 100%. Dès qu'une version passe `live`, elle surcharge le socle.

---

## 3. Architecture Technique Backend

### A. Modèle `ContentVersion` (`backend/apps/curriculum/models.py`)
Ajout des constantes de types de contenu :
```python
KIND_LESSON79 = 'lesson79'
KIND_CATALOG79 = 'catalog79'
KIND_RIDDLE = 'riddle'
KIND_DAILY_CHALLENGE = 'daily_challenge'
KIND_MISSION = 'mission'
KIND_ACTIVITY = 'activity'
```

### B. Service générique `studio_items.py` (`backend/apps/superadmin/studio_items.py`)
- Fonctions CRUD & cycle de vie unifié pour chaque type :
  - `list_items(kind: str)` : liste tous les éléments (socle + surcharges) avec badges d'état (modifié, brouillon, publication en attente, date de dernière modif).
  - `get_item(kind: str, key: str)` : détail d'un élément (version en ligne, brouillon, version en attente, historique, validation).
  - `save_draft(actor, kind: str, key: str, content: dict, note: str)` : enregistre le brouillon.
  - `discard_draft(actor, kind: str, key: str)` : supprime le brouillon en cours.
  - `publish_item(actor, kind: str, key: str, delay_minutes: int, immediate: bool, acknowledge: bool)` : programme ou publie l'élément.
  - `cancel_pending(actor, kind: str, key: str)` : annule une publication programmée.
  - `rollback_item(actor, kind: str, key: str, number: int)` : restaure une version antérieure.
  - `validate_item(kind: str, key: str, content: dict)` : validation de structure et de cohérence.
  - `create_item(actor, kind: str, content: dict)` : crée un nouvel élément avec génération d'identifiant unique.
  - `toggle_active(actor, kind: str, key: str)` : active ou désactive un élément.

### C. Intégrations publiques élèves
1. `apps.progress.riddle` :
   - `choose_riddle()` et `todays_riddle_day()` lisent les énigmes actives depuis les versions `live` de `ContentVersion(kind='riddle')` combinées à la table `Riddle`.
2. `apps.progress.challenge` :
   - `todays_challenge()` lit les défis actifs en ligne.
3. `apps.scolaire.services.programme` :
   - `programme_quiz()` charge les quiz de missions depuis les versions `live` de `ContentVersion(kind='mission')`.
4. `apps.progress.xp` :
   - `activity_xp()` lit l'XP active depuis la version `live` d'`activity`.

---

## 4. Architecture Frontend & Studio (`frontend/app/admin/_components/studio79/`)

### A. Onglets du Studio dans `StudioHome.tsx`
- Navigation par onglets clairs avec icônes :
  - 📚 **Leçons & Catalogue**
  - 🧩 **Énigmes (7-9 ans)**
  - ⚡ **Défis du jour**
  - 📝 **Devoirs (Missions)**
  - 🎮 **Jeux & Activités**
- Chaque onglet dispose d'une barre de recherche, d'un filtre d'état et d'un bouton « Nouveau ».

### B. Éditeur Unifié & Prévisualisation (`StudioItemModal.tsx` & `studioItemSchemas.ts`)
- Définition déclarative des schémas via `FieldDef[]` pour chaque catégorie.
- Utilisation directe du composant `SchemaForm` réutilisable.
- Aperçu interactif immédiat à droite de l'éditeur :
  - Pour les énigmes et défis : carte de quiz interactive permettant de tester la question, les propositions et de voir l'explication.
  - Pour les devoirs : aperçu de la fiche mission avec durée, XP et liste des questions.
  - Pour les activités : aperçu du badge d'activité et de gain d'XP.
- Bandeau de publication avec délai de 15 minutes ou option immédiate, bouton de confirmation d'avertissement, et panneau d'historique avec restauration en 1 clic.

---

## 5. Plan de Test & Preuves
1. **Tests unitaires backend** (`backend/apps/superadmin/tests/test_studio_items.py`) :
   - Validation structurelle de chaque type (rejet des réponses manquantes, des index hors limites, etc.).
   - Cycle complet : création brouillon $\to$ publication différée $\to$ annulation $\to$ publication immédiate $\to$ retour arrière.
   - Vérification de l'étanchéité des réponses (les API élèves ne révèlent jamais `correctIndex`).
2. **Tests d'intégration consommateur** :
   - Les énigmes publiées via le studio sont correctement tirées au sort par `apps.progress.riddle`.
   - Les défis modifiés via le studio sont servis par `apps.progress.challenge`.
   - Les missions et activités prennent en compte les modifications du studio.
3. **Tests frontend** :
   - `npm run typecheck` $\to$ 0 erreur.
   - `npm run test:parcours79` $\to$ tous verts.
4. **Rapport et captures** :
   - Rapport `agents/rapports/T22-antigravity.md` et `preuves.json`.
