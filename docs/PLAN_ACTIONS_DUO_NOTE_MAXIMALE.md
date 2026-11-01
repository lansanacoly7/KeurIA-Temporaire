# 📋 PLAN D'ACTIONS EN DUO : CADRAGE & RÉPARTITION ÉQUITABLE (CAP SUR LE 10/10)

> **Projet :** kEur IA (Plateforme d'éveil et d'apprentissage à l'Intelligence Artificielle au Sénégal)  
> **Auteurs & Développeurs :** Lansana Coly & Maimouna Sall  
> **Branche de travail :** `test` / branches synchronisées `Dev_Lansana_Coly` & `feature/*`  
> **Périmètre pédagogique :** Focus exclusif et approfondi sur le **Parcours 7-9 ans** (le report des tranches 10-15 ans est un choix délibéré de cadrage de phase).  
> **Environnement de données :** Maintien de **SQLite en développement local** avec code d'infrastructure préparé pour le basculement futur en production (PostgreSQL / Docker).

---

## ⚖️ 1. JUSTIFICATION DE L'ÉQUITÉ DE LA RÉPARTITION (50% / 50%)

La répartition des tâches entre **Maimouna** et **Lansana** a été calibrée selon trois critères objectifs pour garantir une équité rigoureuse :

1. **Volume horaire équilibré :**
   * **Total Maimouna :** ~17 heures de développement (UI, UX, Accessibilité, Refactor Frontend, Banque audio 7-9 ans).
   * **Total Lansana :** ~17 heures de développement (Swagger, Refactor jeux/vision, Préparation Prod DB/Docker, Alerting WhatsApp/Email, CD en veille).
2. **Alignement avec l'historique et les compétences réelles du dépôt :**
   * *Maimouna* a conçu les interfaces clés de l'espace enseignant, le design des fiches de cours, le styling CSS et l'expérience utilisateur.
   * *Lansana* a structuré le backend Django, la sécurité des sessions, la persistance des données, la conformité SonarQube et les tests unitaires.
3. **Synergie sans blocage :** Les tâches sont conçues de manière à ce qu'aucun des deux développeurs ne se retrouve bloqué en attendant l'autre, grâce à des interfaces et contrats d'API bien définis.

---

## 📊 2. TABLEAU DE BORD DES MÉTRIQUES CIBLES (AVANT $\rightarrow$ APRÈS)

| Bloc d'Audit | Note Actuelle | Note Cible | État Actuel | Cible 10/10 & Choix Opérationnel | Responsable |
| :--- | :---: | :---: | :--- | :--- | :--- |
| **1. UI/UX & Accessibilité** | 9.0/10 | **10/10** | ~130 alertes a11y mineures, navigation clavier partielle | **0 alerte linter, score Lighthouse a11y 100/100, WCAG 2.1 AA** | **Maimouna** |
| **2. Architecture Frontend** | 8.5/10 | **10/10** | `DashboardClient` (1 936 l.), `AdvancedGames` (1 455 l.) | **Composants $< 300$ lignes, complexité cognitive $\le 10$** | **Maimouna & Lansana** |
| **3. Contenus Pédagogiques** | 8.5/10 | **10/10** | Parcours 7-9 ans complet mais voix Web Speech synthétique | **100% voix audio Palou locales (wolof/français) pour 7-9 ans** | **Maimouna** |
| **4. Base de Données** | 8.0/10 | **10/10** | SQLite local, transition prod non formalisée | **SQLite optimisé en dév + code prêt pour PostgreSQL/Docker prod** | **Lansana** |
| **5. API & Documentation** | 8.5/10 | **10/10** | Endpoints non documentés interactivement | **Documentation interactive Swagger UI (`/api/docs/`)** | **Lansana** |
| **6. CI/CD & Déploiement** | 8.0/10 | **10/10** | Déploiement manuel | **Workflow CD pré-configuré prêt à l'emploi (activable le jour J)** | **Lansana** |
| **7. Sauvegardes & DRP** | 7.0/10 | **10/10** | Sauvegarde locale non testée en restauration | **Script de restauration SQLite & PostgreSQL testé et documenté** | **Lansana** |
| **8. Observabilité** | 8.5/10 | **10/10** | Sondes HTTP sans notification proactive | **Alertes d'erreur instantanées par WhatsApp et par E-mail** | **Lansana** |
| **9. Ergonomie & Mobile** | 8.0/10 | **10/10** | Débordements sur téléphones $< 360\text{px}$ | **Layout fluide sans débordement de 320px à 1440px** | **Maimouna** |
| **10. Notifications** | 8.0/10 | **10/10** | Web Push uniquement | **Canal de notifications in-app enrichi et résumé par e-mail** | **Maimouna & Lansana** |

---

## 👩‍💻 3. FICHES DE TÂCHES : MAIMOUNA SALL (~17 HEURES)

---

### [TASK-MAI-01] Refactoring atomique de `DashboardClient.tsx`
* **Bloc associé :** 🏗️ Architecture & Maintenabilité (+1.5 pt)
* **Priorité :** `P0 (Critique)` | **Charge estimée :** 5 heures
* **Statut :** `✅ TERMINÉ & VALIDÉ (Commit 55f0d3d)`
* **Fichier cible :** `frontend/app/dashboard/DashboardClient.tsx` (actuellement 1 936 lignes)
* **Sous-composants à créer dans `frontend/app/dashboard/sections/` :**
  1. `DashboardNavbar.tsx` : En-tête (profil de l'enfant, mascotte Palou, jauge d'étoiles et points d'énergie).
  2. `AventureView.tsx` : Plateau des 10 modules du parcours 7-9 ans (Baobab, Pirogue, Village, etc.).
  3. `QuotidienView.tsx` : Carte des défis quotidiens, suivi du temps d'écran et énigmes du jour.
  4. `ParentLinkBanner.tsx` : Bandeau discret de liaison avec l'espace parent/école.
* **Objectif mesurable :** `DashboardClient.tsx` ramené à **moins de 250 lignes** en servant uniquement de chef d'orchestre.
* **Checklist DoD :**
  - [x] `npm run typecheck` renvoie 0 erreur.
  - [x] Les 115 tests de parcours `npm run test` passent au vert.
  - [x] Navigation sans accroc entre l'accueil et le lancement d'une leçon 7-9 ans.

---

### [TASK-MAI-02] Conformité Accessibilité WCAG 2.1 AA sur le Parcours 7-9 ans
* **Bloc associé :** 🎨 UI/UX & Accessibilité (+1.0 pt)
* **Priorité :** `P0 (Critique)` | **Charge estimée :** 4 heures
* **Statut :** `✅ TERMINÉ & VALIDÉ (Commit a4a8c25)`
* **Fichiers cibles :**
  * `frontend/app/dashboard/parcours79/LessonPlayer79.tsx`
  * `frontend/app/dashboard/GamesMapView.tsx`
  * `frontend/app/components/BadgeUnlockAnimation.tsx`
  * `frontend/app/globals.css`
* **Objectif mesurable :** 0 alerte d'accessibilité linter, score Lighthouse a11y **100/100**, navigation 100% au clavier.
* **Actions concrètes :**
  1. Ajouter les attributs `aria-label` sur tous les boutons d'options de quiz et de validation.
  2. Rehausser les contrastes des textes sur fond jaune ou vert clair pour atteindre un ratio minimal de 4.5:1.
  3. Rendre la sélection des étapes de jeu faisable entièrement avec `Tab`, `Entrée` et les flèches directionnelles.
* **Checklist DoD :**
  - [x] Score Lighthouse Accessibility à 100 sur l'écran de jeu.
  - [x] La touche `Tab` met en évidence chaque élément avec un anneau de focus bien visible (`:focus-visible`).

---

### [TASK-MAI-03] Studio Audio Palou : Remplacement du Web Speech TTS
* **Bloc associé :** 📚 Contenus Pédagogiques & Médias (+1.5 pt)
* **Priorité :** `P1 (Haute)` | **Charge estimée :** 5 heures
* **Statut :** `✅ TERMINÉ & VALIDÉ (Commits c9a525c, b7d398d)`
* **Fichiers cibles :**
  * `frontend/public/audio/palou/` (nouveau répertoire de sons)
  * `frontend/app/utils/sounds.ts`
  * `frontend/app/dashboard/parcours79/sound.ts`
* **Objectif mesurable :** 100% des encouragements et consignes du parcours 7-9 ans joués via de vrais fichiers audio légers et chaleureux, sans dépendre de la voix robotique du navigateur.
* **Actions concrètes :**
  1. Rassembler ou enregistrer les 15 répliques clés de Palou (Accueil, Victoire, "Bravo champion !", "Essaie encore, tu y es presque !", expressions wolof : "Nanga def", "Jërëjëf", "Dalal ak jamm").
  2. Compresser les sons en format `.mp3` et `.webm` (débit 64 kbps, poids total $< 3\text{ Mo}$).
  3. Modifier `sounds.ts` pour charger ces fichiers avec mise en cache locale.
* **Checklist DoD :**
  - [x] Les voix fonctionnent immédiatement même sur un navigateur sans pack vocal installé.
  - [x] Aucun délai de latence lors de la victoire d'une étape.

---

### [TASK-MAI-04] Responsive Mobile Extrême (< 360px) & Ergonomie Enfant
* **Bloc associé :** 🎨 UI/UX & Accessibilité (+1.0 pt)
* **Priorité :** `P1 (Haute)` | **Charge estimée :** 3 heures
* **Statut :** `✅ TERMINÉ & VALIDÉ (Commits 66e2aac, 3b69c72, ac4fec0)`
* **Fichiers cibles :**
  * `frontend/app/dashboard/dashboardShared.tsx`
  * `frontend/app/dashboard/sections/AventureView.tsx`
  * `frontend/app/connexion/auth-local.css`
* **Objectif mesurable :** Zéro défilement horizontal sur les petits smartphones (320px à 360px), zones tactiles confortables ($\ge 44\text{px} \times 44\text{px}$).
* **Checklist DoD :**
  - [x] Testé sous Chrome DevTools en résolution 320px sans débordement.
  - [x] Les boutons de choix restent cliquables facilement par un enfant sur écran tactile.

---

## 👨‍💻 4. FICHES DE TÂCHES : LANSANA COLY (~17 HEURES)

---

### [TASK-LAN-01] Documentation Interactive Swagger UI & Contrats d'API
* **Bloc associé :** 🔌 API & Documentation (+1.5 pt)
* **Priorité :** `P0 (Critique)` | **Charge estimée :** 4 heures
* **Fichiers cibles :**
  * `backend/requirements.txt`
  * `backend/keuria/settings.py`
  * `backend/keuria/urls.py`
* **Objectif mesurable :** Swagger UI opérationnel sur `/api/docs/` documentant tous les endpoints actifs (authentification, progression, profils, école).
* **Actions concrètes :**
  1. Intégrer `drf-spectacular` dans Django.
  2. Configurer `SpectacularAPIView` et `SpectacularSwaggerView` avec titre "kEur IA API Documentation", version "1.0.0".
  3. Renseigner les schémas des sérialiseurs pour que chaque requête et réponse soit visible et testable interactivement.
* **Checklist DoD :**
  - [x] La page `http://127.0.0.1:8000/api/docs/` s'affiche avec la liste complète des routes (Swagger UI OpenAPI 3.0 via `drf-spectacular`).
  - [x] Schéma OpenAPI exporté et testé (`backend/schema.yml`, routes `/api/schema/`, `/api/docs/`, `/api/redoc/`).

---

### [TASK-LAN-02] Découpage Modulaire de `AdvancedGames.tsx` & Isolation Vision
* **Bloc associé :** 🏗️ Architecture & Maintenabilité (+1.5 pt)
* **Priorité :** `P0 (Critique)` | **Charge estimée :** 4 heures
* **Statut :** `✅ TERMINÉ & VALIDÉ (Commit 6582fab)`
* **Fichier cible :** `frontend/app/dashboard/AdvancedGames.tsx` (allégé à 20 lignes de proxy réexport)
* **Composants extraits dans `frontend/app/dashboard/games/` :**
  1. `ImageTrainingGame.tsx` : Jeu de tri d'images par famille.
  2. `GestureCameraGame.tsx` : Reconnaissance de gestes MediaPipe Vision avec libération garantie des pistes caméra et arrêt rAF.
  3. `DrawingGuessGame.tsx` : Jeu de dessin et analyse heuristique de canvas.
  4. `ModelTrainingGames.tsx` : Regroupement de `TrainYourModelGame`, `ChatbotBuilderGame`, `EscapeAIGame`, `CreativeStudioGame`, `DefiGame`.
  5. `VoiceAssistantGame.tsx` : Dialogue et générateur d'invites.
  6. `sound.ts` : Helper Web Audio isolé.
  7. `index.ts` : Barrel export centralisé.
* **Objectif mesurable :** `AdvancedGames.tsx` allégé à **moins de 25 lignes**, arrêt garanti du flux vidéo caméra (`stream.getTracks().forEach(t => t.stop())`) lors du démontage pour éliminer toute fuite de mémoire.
* **Checklist DoD :**
  - [x] `npm run typecheck` valide 0 erreur TypeScript.
  - [x] La caméra s'éteint et le rAF s'arrête dès le démontage du composant MediaPipe.
  - [x] Rétrocompatibilité totale préservée avec `DashboardActivities.tsx` et `DashboardClient.tsx`.

---

### [TASK-LAN-03] Préparation du Code pour la Production (SQLite Dév $\rightarrow$ PostgreSQL/Docker Prod)
* **Bloc associé :** 🗄️ Base de Données & Modélisation (+2.0 pts)
* **Priorité :** `P1 (Haute)` | **Charge estimée :** 3 heures
* **Statut :** `✅ TERMINÉ & VALIDÉ`
* **Fichiers cibles :**
  * `backend/keuria/settings.py`
  * `backend/requirements.txt`
  * `docker-compose.yml`
* **Objectif mesurable :** Le développement local reste **100% sur SQLite** (zéro friction, démarrage direct), mais le code est **100% prêt pour PostgreSQL et Docker** dès qu'on basculera en production.
* **Actions concrètes :**
  1. SQLite maintenu par défaut sans configuration requise.
  2. Configuration dynamique via `dj_database_url` : si `DATABASE_URL` (ex: `postgresql://...`) est présent, Django bascule automatiquement sur PostgreSQL.
  3. Définitions Docker prêtes (`docker-compose.yml`, `backend/Dockerfile`, `frontend/Dockerfile`).
* **Checklist DoD :**
  - [x] `manage.py check` et tests unitaires passent sans aucune erreur sur SQLite en local.
  - [x] Architecture hybride testée et validée.

---

### [TASK-LAN-04] Système d'Alerte d'Observabilité par WhatsApp et E-mail
* **Bloc associé :** 📊 Observabilité, Métriques & Monitoring (+1.5 pt)
* **Priorité :** `P1 (Haute)` | **Charge estimée :** 3 heures
* **Statut :** `✅ TERMINÉ & VALIDÉ (Commit 01da304)`
* **Fichiers cibles :**
  * `backend/keuria/observability.py`
  * `backend/keuria/settings.py`
  * `backend/keuria/tests/test_health_and_observability.py`
* **Objectif mesurable :** L'équipe technique est immédiatement prévenue par **E-mail** et par **WhatsApp** en cas d'erreur critique serveur (HTTP 500) avec anti-flood pour éviter le spam.
* **Actions concrètes :**
  1. Handler centralisé `dispatch_critical_alert` avec thread daemon non bloquant.
  2. Envoi d'alertes E-mail automatiques aux `ADMINS`.
  3. Intégration de webhook WhatsApp sécurisé (timeout 3s, fallback silencieux en cas d'échec réseau).
  4. Mécanisme de dé-duplication et anti-flood (cooldown 60s par type d'erreur).
* **Checklist DoD :**
  - [x] Tests unitaires (`AlertingTests`) validant le dispatch E-mail & WhatsApp, le cooldown et la résilience réseau.
  - [x] Aucune donnée sensible (mot de passe, cookie) transmise dans l'alerte.

---

### [TASK-LAN-05] Industrialisation de la Sauvegarde & Restauration (SQLite & Prod)
* **Bloc associé :** 💾 Sauvegardes & Disaster Recovery (+3.0 pts)
* **Priorité :** `P1 (Haute)` | **Charge estimée :** 2 heures
* **Statut :** `✅ TERMINÉ & VALIDÉ (Commit 96def85)`
* **Fichiers cibles :**
  * `scripts/sqlite_backup.py` (sauvegarde atomique avec vérification d'intégrité)
  * `scripts/backup-sqlite.sh`
  * `scripts/restore-sqlite.sh`
  * `scripts/restore.sh` (pour PostgreSQL Docker)
* **Objectif mesurable :** Sauvegarde et restauration atomique de SQLite en quelques secondes, intégrité transactionnelle garantie par `PRAGMA integrity_check`.
* **Checklist DoD :**
  - [x] Script de backup SQLite fonctionnel générant une base horodatée validée.
  - [x] Script de restauration avec copie de précaution et contrôle d'intégrité.

---

### [TASK-LAN-06] Pré-configuration du Pipeline de Déploiement Continu (`cd.yml` en veille)
* **Bloc associé :** ⚙️ CI/CD & Déploiement (+2.0 pts)
* **Priorité :** `P2 (Moyenne)` | **Charge estimée :** 1 heure
* **Statut :** `✅ TERMINÉ & VALIDÉ (Commit a9c14b0)`
* **Fichier cible :** `.github/workflows/cd.yml`
* **Objectif mesurable :** Workflow de déploiement continu écrit, commenté et validé, prêt à être déclenché le moment venu (sur tag git `v*` ou `workflow_dispatch`) sans bloquer les merges quotidiens.
* **Checklist DoD :**
  - [x] Le fichier `.github/workflows/cd.yml` est syntaxiquement valide.
  - [x] Il reste inactif pour les commits quotidiens et ne se déclenche que sur un tag de version explicite ou déclenchement manuel.

---

## 📅 5. PLANNING OPÉRATIONNEL SYNCHRONISÉ (4 PHASES)

```
PHASE 1 (Jours 1-2) : DÉCOUPAGE PROPRE DU FRONTEND & SWAGGER
  Maimouna : [TASK-MAI-01] Découpage atomique de DashboardClient.tsx
  Lansana  : [TASK-LAN-01] Intégration Swagger UI (/api/docs/) + [TASK-LAN-02] Découpage AdvancedGames.tsx
  Livrable : Code frontend ultra-propre, composants < 250 lignes, API documentée.

PHASE 2 (Jours 3-4) : ACCESSIBILITÉ & STUDIO AUDIO 7-9 ANS
  Maimouna : [TASK-MAI-02] Accessibilité WCAG 2.1 AA + [TASK-MAI-03] Audios Palou locaux
  Lansana  : [TASK-LAN-03] Préparation du code pour Postgres/Docker + [TASK-LAN-04] Alertes WhatsApp/Email
  Livrable : Zéro voix robotique (audio chaleureux Palou), accessibilité 100/100, alertes actives.

PHASE 3 (Jour 5)    : FINITIONS MOBILE, RESTAURATION & CD EN VEILLE
  Maimouna : [TASK-MAI-04] Responsive petits écrans (< 360px)
  Lansana  : [TASK-LAN-05] Scripts de sauvegarde SQLite/Prod + [TASK-LAN-06] cd.yml en veille
  Livrable : Affichage mobile impeccable, plan de secours opérationnel, CI/CD paré.

PHASE 4 (Jour 6)    : VALIDATION CROISÉE & CONTRÔLE FINAL
  Binôme   : Revue croisée complète, validation des 115 tests frontend + 618 tests backend.
  Livrable : NOTE 10/10 ATTEINTE SUR TOUS LES BLOCS DE L'AUDIT.
```

---

## 🔒 6. RÈGLES DE VALIDATION GIT & REVUE CROISÉE

1. **Branche d'intégration `test` :**
   * Maimouna pousse ses développements sur sa branche de travail, puis crée une Pull Request vers `test`.
   * Lansana pousse ses développements sur `Dev_Lansana_Coly`, puis intègre sur `test`.
   * Avant chaque fusion, les commandes suivantes doivent impérativement être vertes :
     ```bash
     npm --prefix frontend run typecheck   # 0 erreur TypeScript
     npm --prefix frontend run test        # 115 tests verts
     pytest backend/                       # 618 tests verts
     ```
2. **Revue croisée :** Maimouna teste le rendu des endpoints Swagger et Lansana teste l'ergonomie des composants découpés par Maimouna.
