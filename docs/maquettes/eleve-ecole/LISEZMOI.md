# Maquettes HTML/CSS — Espace École & Cahier de Classe Élève (T11 - Reprise)

> **Projet** : kEur IA (Plateforme d'apprentissage IA pour enfants au Sénégal et en Afrique de l'Ouest)  
> **Contexte T11** : Reprise et mise en conformité responsive mobile (390×844 px) et desktop (1440×900 px)  
> **Auteur** : Antigravity (`antigravity@keuria.local`)  
> **Destinataire** : OpenCode (Tâches T9 et T10 d'implémentation Next.js / Django)  
> **Localisation** : `docs/maquettes/eleve-ecole/`

---

## 1. Vue d'Ensemble & Périmètre

Cet ensemble de 12 maquettes statiques et autonomes couvre l'intégralité du parcours **Cahier de classe élève (6-9 ans, cycle élémentaire / CE1)** et de l'**Espace Enseignant & Direction (adulte)** :

1. `index.html` : Portail Showcase & Hub de navigation vers toutes les maquettes
2. `01-aujourdhui.html` : Cahier de classe du jour (séance en direct, mot de la maîtresse, mini-sondage, devoirs du jour)
3. `02-mes-devoirs.html` : Devoirs à faire, devoirs rendus, corrigés & feedback enseignant
4. `03-mon-parcours.html` : Carte d'exploration (archipel CE1 adapté, îles de calcul, lecture et découverte)
5. `04-ma-classe.html` : Tableau d'honneur bienveillant (prénoms seuls, célébration des efforts) et grille des 22 camarades
6. `05-mes-etoiles.html` : Progression, étoiles accumulées, niveau 4 explorateur et vitrine des badges débloqués
7. `06-libre.html` : Espace d'exploration libre (Scratch, jeux de logique, arcade) avec verrouillage horaire amical jusqu'à 16h
8. `07-etats.html` : Gestion des états limites (« Ce n'est pas l'heure », « Séance terminée », « Aucun devoir en cours »)
9. `08-enseignant-seance.html` : Pilotage enseignant (lancement de séance, chrono géant, tableau temps réel avec alertes de blocage)
10. `09-enseignant-annonces.html` : Publication de mots et mini-sondages (2 à 5 options) avec résultats et votants en direct
11. `10-enseignant-parcours-eleve.html` : Fiche élève Moussa Diallo et outil de dérogation de parcours (motif pédagogique obligatoire)
12. `11-regles-classe.html` : Matrice de règles de classe par créneaux horaires jours/heures, interrupteurs et prévisualisation élève

---

## 2. Conformité Responsive Mobile Stricte (Reprise Validée)

Suite à la revue de Claude (`agents/rapports/T11-revue-claude.md`), l'architecture CSS (`maquette.css`) et les 12 gabarits HTML ont été restructurés :

- **Masquage de la barre latérale sur mobile** : En dessous de 900px, `.app-sidebar` passe à `display: none !important`.
- **En-tête supérieur mobile** (`.mobile-top-header` / `.teacher-mobile-header`) : Affiche l'avatar élève/enseignant, prénom, classe et badge XP.
- **Barre d'onglets tactile inférieure** (`.mobile-bottom-bar` / `.teacher-mobile-bottom-bar`) :
  - Hauteur tactile child-friendly : `min-height: 56px` (classe `.mobile-tab-btn`).
  - 6 onglets clés pour l'élève (Aujourd'hui, Devoirs, Parcours, Classe, Étoiles, Libre).
  - Onglet actif mis en valeur avec fond lime (`#D8F05B`) et texte vert sombre.
- **Zéro débordement horizontal (`scrollWidth === 390px`)** :
  - Tables larges enveloppées dans `.table-responsive-container` avec défilement tactile fluide.
  - Grille des règles de classe adaptée à 1 colonne (`grid-template-columns: 1fr`).
  - `document.documentElement.scrollWidth` mesuré via Chrome DevTools Protocol à **strictement 390 px** sur les 12 écrans.

### Métriques Mesurées à 390px (Chrome Headless CDP)

| Écran | scrollWidth | Sidebar Desktop | Header Mobile | Bottom Bar Mobile | Statut |
|---|---|---|---|---|---|
| `01-aujourdhui.html` | **390 px** | `none` | `flex` | `flex` (6 onglets ≥ 56px) | ✅ CONFORME |
| `02-mes-devoirs.html` | **390 px** | `none` | `flex` | `flex` (6 onglets ≥ 56px) | ✅ CONFORME |
| `03-mon-parcours.html` | **390 px** | `none` | `flex` | `flex` (6 onglets ≥ 56px) | ✅ CONFORME |
| `04-ma-classe.html` | **390 px** | `none` | `flex` | `flex` (6 onglets ≥ 56px) | ✅ CONFORME |
| `05-mes-etoiles.html` | **390 px** | `none` | `flex` | `flex` (6 onglets ≥ 56px) | ✅ CONFORME |
| `06-libre.html` | **390 px** | `none` | `flex` | `flex` (6 onglets ≥ 56px) | ✅ CONFORME |
| `07-etats.html` | **390 px** | `none` | `flex` | `flex` (6 onglets ≥ 56px) | ✅ CONFORME |
| `08-enseignant-seance.html` | **390 px** | `none` | `flex` | `flex` (actions rapides) | ✅ CONFORME |
| `09-enseignant-annonces.html` | **390 px** | `none` | `flex` | `flex` (actions rapides) | ✅ CONFORME |
| `10-enseignant-parcours-eleve.html` | **390 px** | `none` | `flex` | `flex` (actions rapides) | ✅ CONFORME |
| `11-regles-classe.html` | **390 px** | `none` | `flex` | `flex` (actions rapides) | ✅ CONFORME |
| `index.html` (portail) | **390 px** | `none` | `none` | `none` (hub 1 col) | ✅ CONFORME |

---

## 3. Tokens de Design & Charte Graphique

| Token CSS | Valeur Hex | Rôle & Usage |
|---|---|---|
| `--school-primary` | `#1B4D3E` | Vert impérial école (sérieux, institutionnel, rassurant) |
| `--school-primary-light` | `#256653` | Vert sauge foncé pour survol et bordures actives |
| `--school-primary-dark` | `#12352B` | Vert sombre d'ancrage pour les ombres 3D (`box-shadow`) |
| `--school-secondary` | `#D8F05B` | Lime kEur IA solaire (énergie, validation, call-to-action) |
| `--school-secondary-dark`| `#B6CE3B` | Ombre d'appui tactile du bouton lime |
| `--school-accent` | `#E8A631` | Ocre jaune / doré (étoiles, badges de maîtrise, trophées) |
| `--school-terracotta` | `#C85A32` | Terre cuite sénégalaise (règles de classe, alertes pédagogiques) |
| `--bg-cream` | `#FAF8F2` | Fond crème doux (évite la fatigue oculaire sur tablette/ordinateur) |
| `--text-ink` | `#132A26` | Encre textuelle à haut contraste (ratio WCAG > 12:1) |
| `--font-kid` | `'Fredoka', sans-serif` | Typographie ronde, accessible et chaleureuse pour l'élève |
| `--font-sans` | `'Plus Jakarta Sans'` | Typographie de précision pour les enseignants et métadonnées |

---

## 4. Guide des Composants à Coder pour OpenCode (T9 & T10)

1. `<SchoolAppShell>` : Layout réactif gérant la bascule Sidebar desktop (≥ 900px) / Header + Bottom Bar mobile (< 900px).
2. `<LiveSessionHero>` : Carte d'état de séance avec point clignotant (`pulse-dot`), timer dynamique et bouton d'action principal.
3. `<TeacherNoticeCard>` : Mot de la maîtresse avec photo, date, contenu formaté et acquittement de lecture.
4. `<StudentPollCard>` : Mini-sondage avec boutons d'option tactiles géants (hauteur 56px), choix unique ou multiple, et jauge de résultats.
5. `<HomeworkTaskCard>` : Tâche de devoir avec badge de discipline (Maths, Français, Éveil), statut (À faire / Rendu / Corrigé) et bouton d'accès.
6. `<KindLeaderboard>` : Tableau d'honneur sans compétition toxique, affichant les prénoms seuls et les étoiles d'efforts.
7. `<StarsBadgeShowcase>` : Grille de badges débloqués avec verrouillage amical des prochains niveaux.
8. `<TeacherLiveMonitor>` : Tableau temps réel d'état des élèves (en cours, terminé, besoin d'aide avec alerte sonore/visuelle).
9. `<RuleMatrixEditor>` : Grille d'activation des règles de classe par plage horaire avec traduction en langage naturel.
10. `<StudentCourseOverride>` : Modale de dérogation de parcours avec sélection de matière, niveau dérogé et saisie du motif pédagogique obligatoire.

---

## 5. Captures d'Écran Archivées (`docs/maquettes/eleve-ecole/captures/`)

24 captures PNG haute fidélité générées par script CDP automatisé :
- 12 captures en résolution bureau **1440×900 px** (`*-1440.png`)
- 12 captures en résolution mobile **390×844 px** (`*-390.png`)
