# Rapport T13 — antigravity — Vérification à l'écran de T9 (cahier de classe élève) et T10 (séances, annonces)

- **Date** : 2026-10-16
- **Auteur** : Antigravity (`antigravity@keuria.local`)
- **Tâche** : `agents/taches/T13-antigravity-verif-T9-T10.md`
- **Branche** : `Dev_Lansana_Coly`
- **Serveurs testés** : Django 5.1 sur `127.0.0.1:8001`, Next.js 15 sur `http://localhost:3000`
- **Identifiants utilisés** :
  - Enseignante : `khady.faye@example.com` / `Demo-Ecole-2026!` (Classe de CE1 A, 22 élèves, Groupe Scolaire Les Baobabs)
  - Élève : `dieynaba.niang@les-baobabs.keuria.sn` / `Ecole-Dev-2026!` (Élève de CE1 A)
  - Compte alternatif vérifié : `yacine.sy@les-baobabs.keuria.sn` / `Demo-1234`
- **Fichiers touchés** :
  - `agents/rapports/T13-antigravity.md` (présent rapport)
  - `agents/rapports/T13-captures/*` (39 captures PNG : 13 états d'écrans en résolutions 390×844, 768×1024 et 1280×800)
- **Contrainte absolue respectée** : **AUCUNE modification du code de l'application** (`frontend/` et `backend/` intacts).

---

## 1. Synthèse de la vérification en conditions réelles

Tous les parcours et cas d'usage exigés par la tâche T13 ont été exécutés et validés dans un navigateur réel (Chrome piloté par Chrome DevTools Protocol) :

### A. Côté Enseignant (`/enseignant/classes/3`) — T10
1. **Séance de classe** :
   - Ouverture d'une séance « Séance Découverte de l’IA », durée 30 min, leçon liée « Bonjour, l’IA ! — C’est quoi une IA ? ».
   - Badge « En cours » vert ok, affichage de la leçon liée, compte à rebours décrémenté en temps réel chaque seconde (`29:59`, `29:58`...).
   - Clôture réussie via le bouton « Terminer » : badge repassé à « Aucune séance » et formulaire réaffiché.
2. **Annonces et sondages** :
   - Publication d'un mot d'encouragement (« Mot du matin ») avec succès.
   - Publication d'un sondage à 3 choix (« Avez-vous aimé la leçon sur l’intelligence artificielle ? », choix : *Beaucoup !*, *Un peu*, *Pas du tout*).
   - Règle métier des 3 annonces actives max vérifiée (rejet serveur avec message explicite au-delà de 3).
   - Consultation des résultats : modalité d'affichage montrant le décompte des votes, pourcentages par barre, nominatif des votants (*Dieynaba Niang* sur *Un peu*) et liste complète des non-répondants (21 élèves).
3. **Parcours d'un élève** (`/enseignant/eleves/1`) :
   - Sélection d'une dérogation de parcours vers « 10-12 ans », enregistrement avec accusé « Parcours enregistré : 10-12 ans. ».
   - Vérification de la prise en compte immédiate sur le payload élève (`track: "10-12"`).

### B. Côté Élève (`/dashboard`) — T9
1. **Accueil « Aujourd’hui »** :
   - En-tête « Séance en cours » actif avec titre de la séance, leçon liée, compte à rebours synchronisé et bouton tactile « Rejoindre la séance » redirigeant vers `/dashboard/parcours`.
   - Nouvelles de la classe : affichage du « Mot du matin » avec date et texte.
   - Sondage interactif : **les pourcentages et résultats sont strictement masqués avant la réponse**.
   - Réponse au sondage : clic sur « Beaucoup ! » -> affichage immédiat de « Ta réponse », de la jauge 100% et du nombre de réponses de la classe.
   - Modification de réponse : clic sur « Un peu » -> mise à jour instantanée du choix et de la répartition.
   - Menu réduit à 6 onglets (*Aujourd’hui*, *Mes devoirs*, *Mon parcours*, *Ma classe*, *Mes étoiles*, *Libre*) parfaitement actif, sans messagerie famille ni tutoriel.
   - Bandeau des règles de classe affichant les phrases d'enfant conformes.
2. **Autres vues du cahier de classe** :
   - `/dashboard/devoirs` : devoirs à rendre avec échéances formatées en langage enfant.
   - `/dashboard/parcours` : carte du monde d'exploration adaptée.
   - `/dashboard/classe` : carte de la classe CE1 A et tableau d'honneur hebdomadaire.
   - `/dashboard/etoiles` : collection des badges de réussite.
   - `/dashboard/libre` : cartes Mini-jeux, Scratch et Défis gérées selon les plages horaires scolaires.

---

## 2. Tableau des Mesures de `scrollWidth` (390, 768 et 1280 px)

Conformément à la consigne, pour chaque écran, les résolutions **390×844 px** (mobile), **768×1024 px** (tablette) et **1280×800 px** (bureau) ont été mesurées au niveau du DOM :

| Écran testé | 390 px (cible: 390) | 768 px (cible: 768) | 1280 px (cible: 1280) | Statut Global |
|---|---|---|---|---|
| `01-enseignant-classe-initial` | **768 px** ⚠️ (déborde) | **768 px** ✅ | **1280 px** ✅ | ⚠️ ÉCART 390px |
| `02-enseignant-seance-active` | **768 px** ⚠️ (déborde) | **768 px** ✅ | **1280 px** ✅ | ⚠️ ÉCART 390px |
| `03-enseignant-annonces-publiees` | **768 px** ⚠️ (déborde) | **768 px** ✅ | **1280 px** ✅ | ⚠️ ÉCART 390px |
| `04-enseignant-parcours-eleve` | **390 px** ✅ | **768 px** ✅ | **1280 px** ✅ | ✅ CONFORME |
| `05-eleve-aujourdhui-avant-vote` | **390 px** ✅ | **768 px** ✅ | **1280 px** ✅ | ✅ CONFORME |
| `06-eleve-aujourdhui-apres-vote` | **390 px** ✅ | **768 px** ✅ | **1280 px** ✅ | ✅ CONFORME |
| `07-eleve-mes-devoirs` | **390 px** ✅ | **768 px** ✅ | **1280 px** ✅ | ✅ CONFORME |
| `08-eleve-mon-parcours` | **390 px** ✅ | **768 px** ✅ | **1280 px** ✅ | ✅ CONFORME |
| `09-eleve-ma-classe` | **390 px** ✅ | **768 px** ✅ | **1280 px** ✅ | ✅ CONFORME |
| `10-eleve-mes-etoiles` | **390 px** ✅ | **768 px** ✅ | **1280 px** ✅ | ✅ CONFORME |
| `11-eleve-libre` | **390 px** ✅ | **768 px** ✅ | **1280 px** ✅ | ✅ CONFORME |
| `12-enseignant-sondage-resultats` | **768 px** ⚠️ (déborde) | **768 px** ✅ | **1280 px** ✅ | ⚠️ ÉCART 390px |
| `13-enseignant-seance-terminee` | **768 px** ⚠️ (déborde) | **768 px** ✅ | **1280 px** ✅ | ⚠️ ÉCART 390px |

> **Observation importante sur le responsive** :
> - **Côté élève (T9)** : **100% des écrans sont strictement conformes** (390px, 768px, 1280px sans aucun débordement).
> - **Côté enseignant (T10)** : La fiche élève (`04`) est 100% conforme. En revanche, sur la vue globale de classe (`/enseignant/classes/3`), la présence du grand tableau des 22 élèves (`DataTable`) sans conteneur de défilement horizontal crée un débordement horizontal à 390px (largeur figée à 768px).

---

## 3. Comparaison avec les maquettes : Liste précise des écarts

Du plus grave au moins grave :

### Écart 1 (Majeur) — Débordement horizontal sur la page classe enseignant à 390 px
- **Constat** : À 390 px de large, la page `/enseignant/classes/3` a un `scrollWidth` de 768 px.
- **Réf. maquette** : Dans la maquette statique `08-enseignant-seance.html`, le tableau d'état des élèves et les grilles de créneaux sont encapsulés dans `.table-responsive-container` avec `-webkit-overflow-scrolling: touch`, ce qui garantit un `scrollWidth` de 390 px.
- **Réf. application** : Dans `TeacherClassView.tsx`, le composant `<DataTable>` n'a pas de wrapper à défilement horizontal dédié sur petit écran.
- **Captures** :
  - Application : `01-enseignant-classe-initial-390.png`, `02-enseignant-seance-active-390.png`, `03-enseignant-annonces-publiees-390.png`
  - Maquette de référence : `docs/maquettes/eleve-ecole/captures/08-enseignant-seance-390.png`

### Écart 2 (Moyen) — Hauteur des boutons d'options de sondage élève
- **Constat** : Les boutons d'option du sondage élève mesurent environ 42 à 44 px de haut dans l'application.
- **Réf. maquette** : Dans `01-aujourdhui.html` et `maquette.css`, les boutons d'options de sondage `.poll-option-btn` ont `min-height: 56px` (`--touch-target-child`) avec effet tactile 3D pour les doigts d'enfants de CE1 (6-9 ans).
- **Réf. application** : `frontend/app/dashboard/cahier/cahier.css` applique des boutons standards sans la contrainte `min-height: 56px`.
- **Captures** :
  - Application : `05-eleve-aujourdhui-avant-vote-390.png`, `06-eleve-aujourdhui-apres-vote-390.png`
  - Maquette de référence : `docs/maquettes/eleve-ecole/captures/01-aujourdhui-390.png`

### Écart 3 (Mineur) — Tableau d'honneur « Ma classe » étendu à l'école entière
- **Constat** : La vue élève « Ma classe » affiche « Tous les apprenants de l'école » au lieu d'isoler les seuls 22 camarades de la classe de CE1 A.
- **Réf. maquette** : Dans `04-ma-classe.html`, la table d'honneur bienveillante présente les élèves de la classe de Mme Faye avec leurs prénoms seuls et sans classement stigmatisant.
- **Réf. application** : Comme documenté par OpenCode dans son rapport T9, l'endpoint backend actuel est global à l'école (`GET /api/progress/leaderboard/weekly?period=weekly&view=general`), ce qui est honnêtement mentionné dans l'UI.
- **Capture** : `09-eleve-ma-classe-1280.png`

### Écart 4 (Mineur) — Bouton « Rejoindre la séance » dans le bandeau élève
- **Constat** : Le bouton « Rejoindre la séance » dans l'en-tête de séance est présent et fonctionnel (il redirige vers `/dashboard/parcours`), mais utilise un style de lien sobre plutôt que le gros bouton vert lime solaire à bordure 3D de la maquette.
- **Réf. maquette** : `.btn-big-touch.primary` avec fond `#D8F05B` et texte vert impérial `#103B39`.
- **Capture** : `05-eleve-aujourdhui-avant-vote-1280.png`

---

## 4. Index des 39 Captures d'Écran Archivées (`agents/rapports/T13-captures/`)

| N° | Scénario d'écran testé | Fichiers PNG (1280, 768, 390 px) |
|---|---|---|
| 01 | Enseignant — Vue classe initiale | `01-enseignant-classe-initial-*.png` |
| 02 | Enseignant — Séance active avec chrono live | `02-enseignant-seance-active-*.png` |
| 03 | Enseignant — Mot et sondage publiés | `03-enseignant-annonces-publiees-*.png` |
| 04 | Enseignant — Dérogation parcours élève (10-12 ans) | `04-enseignant-parcours-eleve-*.png` |
| 05 | Élève — Aujourd'hui avant vote (résultats masqués) | `05-eleve-aujourdhui-avant-vote-*.png` |
| 06 | Élève — Aujourd'hui après vote (résultats et jauge) | `06-eleve-aujourdhui-apres-vote-*.png` |
| 07 | Élève — Mes devoirs | `07-eleve-mes-devoirs-*.png` |
| 08 | Élève — Mon parcours (carte d'exploration) | `08-eleve-mon-parcours-*.png` |
| 09 | Élève — Ma classe (carte classe + tableau d'honneur) | `09-eleve-ma-classe-*.png` |
| 10 | Élève — Mes étoiles (badges débloqués) | `10-eleve-mes-etoiles-*.png` |
| 11 | Élève — Libre (mini-jeux et créneaux horaires) | `11-eleve-libre-*.png` |
| 12 | Enseignant — Résultats du sondage (modal votants) | `12-enseignant-sondage-resultats-*.png` |
| 13 | Enseignant — Séance terminée avec succès | `13-enseignant-seance-terminee-*.png` |
