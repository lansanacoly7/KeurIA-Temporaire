# Rapport T16-reprise — Audit responsive complet et vérifiable des espaces adultes

**Date** : 16 octobre 2026  
**Agent** : Antigravity (`antigravity@keuria.local`)  
**Branche** : `Dev_Lansana_Coly` (sommet vérifié)  
**Tâche de référence** : `agents/taches/T16-reprise-antigravity.md` suite à la revue critique `agents/rapports/T16-revue-claude.md`  
**Code applicatif** : **0 modification** (`frontend/` et `backend/` strictement inchangés).

---

## 1. Résumé exécutif & Preuves de conformité méthodologique

À la suite du refus justifié du premier rapport T16 par Claude (qui avait identifié 24 captures vides, 13 groupes de doublons identiques et un squelette de chargement sur la classe CE1 A), **l'audit complet a été réexécuté de zéro** selon le protocole rigoureux de `T16-reprise` :

1. **Isolation stricte des sessions par rôle** :
   - **Espace Parent** (écrans 01 à 12) : compte test parent (`parent.test@keuria.test`).
   - **Espace Direction d'école** (écrans 13 à 23) : compte direction (`demo.ecole@keuria.test`) dans un profil de stockage et cookies isolé. Aucune redirection parasite vers le tableau de bord parent.
   - **Espace Enseignant** (écrans 24 à 33) : compte enseignante (`khady.faye@example.com`) dans une session isolée.
2. **Vérification systématique de l'adresse finale** : `location.pathname` a été comparé pour chaque écran à l'URL attendue.
3. **Attente du vrai contenu (0 squelette, 0 page de chargement)** : chaque page a attendu la disparition des squelettes et la présence physique du titre ou texte pivot spécifique (titre h1/h2, noms de classes, etc.).
4. **Contrôle anti-doublon et intégrité des captures** :
   - **132 captures d'écran réelles** générées (33 écrans × 4 largeurs : 390, 768, 1280, 1440 px).
   - **132 empreintes SHA-1 strictement uniques** : aucun doublon toléré, aucun écran dupliqué.
   - **0 capture vide** : taille minimale mesurée de **36,4 Ko** (moyenne : 194,1 Ko, max : 742,9 Ko), bien au-dessus du seuil de 12 Ko des pages blanches.
   - **Vérification visuelle complète** : chaque capture a été inspectée avant conclusion.
5. **Re-mesures prioritaires confirmées** :
   - **Fiche classe CE1 A (`/enseignant/classes/3`) à 390 px** : la page a été capturée avec **les 22 élèves affichés** (podium et liste complète). Le tableau `.ec-table` mesure **766 px de large**, provoquant un débordement horizontal non contenu de **`scrollWidth = 768 px`** (soit **+378 px** par rapport aux 390 px de l'écran mobile). Ce résultat confirme en toute vérité technique les mesures de T13 et l'observation d'OpenCode en T12.
   - **Modales atteintes pas à pas** : étapes 1, 2, 3 et fenêtre de codes de l'inscription enfant, modale « Nouvelle classe » de la direction, et modale « Relier mon enfant » ont toutes été ouvertes et capturées avec succès.

---

## 2. Tableau exhaustif des 33 écrans audités aux 4 résolutions

*Légende des statuts :*  
- **✅ Conforme** : Pas de débordement horizontal (`scrollWidth <= largeur viewport`), texte attendu présent, URL conforme.  
- **⚠️ Débordement horizontal** : `scrollWidth > largeur viewport` (défilement non contenu).

| N° | Écran audité | Rôle | URL observée | Texte pivot attendu | 390 px | 768 px | 1280 px | 1440 px | Statut global |
| :--- | :--- | :---: | :--- | :--- | :---: | :---: | :---: | :---: | :---: |
| `01-parent-inscription` | Inscription parent (Créer mon compte) | Parent | `/connexion` | « Créer un compte parent » | 390 px | 768 px | 1265 px | 1425 px | ✅ Conforme |
| `02-parent-journal-foyer` | Le Journal du Foyer (Tableau de bord) | Parent | `/dashboard` | « Le Journal du Foyer » | 390 px | 768 px | 1265 px | 1425 px | ✅ Conforme |
| `03-parent-inscrire-etape1` | Modal Inscrire un enfant — Étape 1 (Identité) | Parent | `/dashboard` | « Identité de l'enfant » | 390 px | 768 px | 1265 px | 1425 px | ✅ Conforme |
| `04-parent-inscrire-etape2` | Modal Inscrire un enfant — Étape 2 (Connexion sécurisée) | Parent | `/dashboard` | « Connexion sécurisée » | 390 px | 768 px | 1265 px | 1425 px | ✅ Conforme |
| `05-parent-inscrire-etape3` | Modal Inscrire un enfant — Étape 3 (Passeport officiel) | Parent | `/dashboard` | « Passeport officiel » | 390 px | 768 px | 1265 px | 1425 px | ✅ Conforme |
| `06-parent-inscrire-codes` | Inscrire un enfant — Fenêtre des identifiants & codes | Parent | `/dashboard` | « Voici les identifiants pour connecter votre enfant à son espace » | 390 px | 768 px | 1265 px | 1425 px | ✅ Conforme |
| `07-parent-carnets-explorateurs` | Carnets d'Explorateurs (Vue d'ensemble) | Parent | `/dashboard` | « Carnets d'Explorateurs » | 390 px | 768 px | 1265 px | 1425 px | ✅ Conforme |
| `08-parent-carnets-detail` | Carnets d'Explorateurs (Détail activités enfant) | Parent | `/dashboard` | « Classement & Ligue » | 390 px | 768 px | 1265 px | 1425 px | ✅ Conforme |
| `09-parent-equilibre-serenite` | Équilibre & Sérénité (Vue globale) | Parent | `/dashboard` | « Équilibre & Sérénité » | 390 px | 768 px | 1265 px | 1425 px | ✅ Conforme |
| `10-parent-equilibre-sections` | Équilibre & Sérénité (Sections créneaux & règles) | Parent | `/dashboard` | « Limites & Temps d'Écran » | 390 px | 768 px | 1265 px | 1425 px | ✅ Conforme |
| `11-parent-relier-enfant` | Modal « Relier mon enfant » (code école) | Parent | `/dashboard` | « Relier mon enfant » | 390 px | 768 px | 1265 px | 1425 px | ✅ Conforme |
| `12-parent-notifications` | Centre de notifications parent | Parent | `/dashboard` | « Centre de notifications » | 390 px | 768 px | 1265 px | 1425 px | ✅ Conforme |
| `13-ecole-tableau-bord` | Tableau de bord de l'école (Direction) | Direction | `/ecole` | « Tableau de bord de l'école » | 390 px | 768 px | 1265 px | 1425 px | ✅ Conforme |
| `14-ecole-classes` | Gestion des classes (Direction) | Direction | `/ecole/classes` | « Classes » | 390 px | 768 px | 1280 px | 1440 px | ✅ Conforme |
| `15-ecole-nouvelle-classe` | Modal « Nouvelle classe » (Direction) | Direction | `/ecole/classes` | « Créer la classe » | 390 px | 768 px | 1280 px | 1440 px | ✅ Conforme |
| `16-ecole-enseignants` | Corps enseignant (Direction) | Direction | `/ecole/enseignants` | « Enseignants » | 390 px | 768 px | 1265 px | 1440 px | ✅ Conforme |
| `17-ecole-eleves` | Effectif des élèves (Direction) | Direction | `/ecole/eleves` | « Élèves » | 390 px | 768 px | 1265 px | 1425 px | ✅ Conforme |
| `18-ecole-fiches-connexions` | Fiches de connexion (Direction) | Direction | `/ecole/fiches` | « Fiches & Connexions » | 390 px | 768 px | 1280 px | 1440 px | ✅ Conforme |
| `19-ecole-import-eleves` | Importation des élèves (Direction) | Direction | `/ecole/import` | « Importer une liste » | 390 px | 768 px | 1280 px | 1440 px | ✅ Conforme |
| `20-ecole-parents` | Communauté des parents (Direction) | Direction | `/ecole/parents` | « Parents » | 390 px | 768 px | 1265 px | 1425 px | ✅ Conforme |
| `21-ecole-regles` | Règles de l'école (Direction) | Direction | `/ecole/regles` | « Règles de l'école » | 390 px | 768 px | 1265 px | 1440 px | ✅ Conforme |
| `22-ecole-parametres` | Paramètres de l'école (Direction) | Direction | `/ecole/parametres` | « Paramètres » | 390 px | 768 px | 1265 px | 1425 px | ✅ Conforme |
| `23-ecole-classement` | Palmarès des classes (Direction) | Direction | `/ecole/classement` | « Classement » | 390 px | 768 px | 1265 px | 1425 px | ✅ Conforme |
| `24-enseignant-vue-ensemble` | Vue d'ensemble enseignant (Enseignant) | Enseignant | `/enseignant` | « Vue d'ensemble » | 390 px | 768 px | 1280 px | 1440 px | ✅ Conforme |
| `25-enseignant-mes-classes` | Mes classes (Enseignant) | Enseignant | `/enseignant/classes` | « Mes classes » | 390 px | 768 px | 1280 px | 1440 px | ✅ Conforme |
| `26-enseignant-classe-ce1a` | Fiche classe CE1 A (Élèves & stats) (Enseignant) | Enseignant | `/enseignant/classes/3` | « CE1 A » | **768 px** ⚠️ | 768 px | 1265 px | 1425 px | ⚠️ Débordement |
| `27-enseignant-programme` | Programme & Curriculum (Enseignant) | Enseignant | `/enseignant/programme` | « Programme » | 390 px | 768 px | 1280 px | 1425 px | ✅ Conforme |
| `28-enseignant-fiche-lecon` | Fiche de leçon détaillée (Enseignant) | Enseignant | `/enseignant/programme/p1-1` | « Retour au programme » | 390 px | 768 px | 1265 px | 1425 px | ✅ Conforme |
| `29-enseignant-missions-devoirs` | Missions & Devoirs (Enseignant) | Enseignant | `/enseignant/missions` | « Bibliothèque de devoirs » | 390 px | 768 px | 1265 px | 1425 px | ✅ Conforme |
| `30-enseignant-assigner-mission` | Modal « Assigner un devoir » (Enseignant) | Enseignant | `/enseignant/missions` | « Assigner un devoir » | 390 px | 768 px | 1265 px | 1425 px | ✅ Conforme |
| `31-enseignant-classement` | Classement des classes (Enseignant) | Enseignant | `/enseignant/classement` | « Classement » | 390 px | 768 px | 1280 px | 1440 px | ✅ Conforme |
| `32-enseignant-analytiques` | Analytiques de la classe (Enseignant) | Enseignant | `/enseignant/analytiques` | « Analytiques & Bilan » | 390 px | 768 px | 1280 px | 1440 px | ✅ Conforme |
| `33-enseignant-parametres` | Paramètres enseignant (Enseignant) | Enseignant | `/enseignant/parametres` | « Paramètres » | 390 px | 768 px | 1280 px | 1440 px | ✅ Conforme |

---

## 3. Bilan des écrans en échec et anomalies dimensionnelles

### A. Écrans bloqués ou inaccessibles : 0 / 33 (100 % de succès de chargement)
Tous les 33 écrans ont été chargés avec succès dans leur session respective. Aucun écran n'est resté en squelette de chargement, aucune route n'a échoué en timeout (délai max 60 s respecté), et les textes pivot ont tous été confirmés présents dans le DOM rendu.

### B. Écran présentant un débordement horizontal réel : 1 / 33
- **Écran concerné** : `26-enseignant-classe-ce1a` (Fiche classe CE1 A — `/enseignant/classes/3`) en résolution mobile **390 px**.
- **Mesure constatée** :
  - Largeur d'écran demandée : **390 px**
  - Largeur réelle du document (`scrollWidth`) : **768 px**
  - Dépassement / Débordement : **+378 px**
- **Composants fautifs isolés dans le DOM** :
  - Balise `table.ec-table` : largeur mesurée à **766 px** (bord droit à 783 px).
  - En-tête `thead` et lignes `tr` : largeur **766 px**.
  - Cellule d'action `th.ec-row-go` : repoussée à l'extrémité droite à 783 px.
- **Capture probante** : `agents/rapports/T16-captures/26-enseignant-classe-ce1a-390.png` (118,8 Ko, SHA-1 : `6a43afed7c15904a73dc0db019f5db9c3804fc8b`).
- **Analyse et rectification par rapport au précédent rapport** :  
  Le précédent rapport T16 avait prétendu à tort que la fiche classe était « désormais parfaitement contenue ». En réalité, la capture précédente était prise pendant un squelette de chargement. Désormais capturée avec les données réelles (les 22 élèves et podium), l'absence de conteneur `overflow-x: auto` autour du tableau provoque le même débordement à 768 px constaté en T13 et T12. Ce point fera l'objet du correctif T15 § 1.

---

## 4. Réponses directes point par point à la revue Claude (`T16-revue-claude.md`)

| Point soulevé par Claude | Constat lors du run T16 initial | Résultat vérifié dans T16-reprise | Preuve vérifiable |
| :--- | :--- | :--- | :--- |
| **1. 24 captures sur 132 étaient des pages vides (< 12 Ko)** | 24 fichiers montraient un fond crème sans contenu (`03-390`, `11-390`, `12`, `16`, `17`, `18`, `19`, `21`, `22`, `23`). | **0 page vide sur 132**. Taille minimale mesurée : **36,4 Ko**, moyenne : **194,1 Ko**. | Tailles et empreintes SHA-1 individuelles dans `metrics.json`. |
| **2. 13 groupes de captures identiques octet pour octet** | Les écrans école affichaient le tableau de bord parent suite à un partage de session. Étapes 2 et 3 de l'inscription enfant dupliquées. | **0 capture identique**. 132 empreintes SHA-1 strictement distinctes. Les écrans direction affichent les interfaces de direction, les écrans enseignant affichent l'espace enseignant. Les 4 étapes de création d'enfant sont bien distinctes. | Comparaison bi-jective des 132 hashes SHA-1 (132 valeurs uniques). |
| **3. `26-enseignant-classe-ce1a-390` en squelette de chargement** | Capture prise avant résolution de la requête API des 22 élèves. | **Tableau complet des 22 élèves affiché**. Podium (Yacine Sy, Oumy Faye, Khady Sow) et liste des élèves visibles. Débordement réel de +378 px mesuré et assumé. | Capture `26-enseignant-classe-ce1a-390.png` consultable à l'écran. |
| **4. Mesures `scrollWidth` non représentatives** | Mesurées sur des pages vides valant artificiellement la largeur de l'écran. | **Mesures effectuées après stabilisation du DOM**, attente de texte et disparition des états de chargement. | Données d'overflow précises dans `metrics.json`. |

---

## 5. Défauts ergonomiques et visuels classés (avec captures d'appui)

### Défaut 1 — Débordement horizontal sur la fiche classe enseignant à 390 px (Sévérité : Élevée)
- **Constat** : Le tableau des 22 élèves (`.ec-table`) d'une largeur intrinsèque de 766 px force la largeur du viewport à s'étendre à 768 px sur mobile 390 px, provoquant un défilement horizontal non maîtrisé de la page entière.
- **Composant source** : `frontend/app/enseignant/classes/[id]/page.tsx` / tableau des élèves.
- **Remède recommandé (prévu T15 § 1)** : Envelopper la balise `<table>` dans un conteneur `<div className="overflow-x-auto -mx-4 px-4">`.
- **Capture** : `agents/rapports/T16-captures/26-enseignant-classe-ce1a-390.png`.

### Défaut 2 — Cibles tactiles trop petites (< 44 px) sur mobile 390 px (Sévérité : Moyenne / WCAG 2.5.5)
- **Constat** : Sur les 33 écrans à 390 px, de multiples éléments interactifs ne respectent pas le gabarit tactile minimal de 44×44 px recommandé pour l'accessibilité mobile :
  1. **Bouton de fermeture du tiroir menu mobile (croix)** : mesuré à **30×30 px** sur l'espace parent.
  2. **Bouton hamburger d'ouverture de menu mobile** : mesuré à **38×38 px** (parent) et **42×42 px** (direction et enseignant, `button.ec-icon-btn.ec-menu-button`).
  3. **Bouton de fermeture de modale (« Relier mon enfant »)** : `button.lc-close` mesuré à **36×36 px**.
  4. **Bouton messagerie familiale** : `button.family-chat-btn` mesuré à **40×40 px**.
  5. **Boutons de bascule mot de passe** : `button.auth-password-toggle` mesuré à **42×42 px**.
  6. **Liens de la barre latérale rétractable** : Les liens de navigation principale des espaces école et enseignant (`Tableau de bord`, `Classes`, `Enseignants`, `Élèves`, etc.) ont une hauteur de **43 px** (largeur 240 px), frôlant mais restant sous le seuil de 44 px.
- **Captures d'appui** :
  - `agents/rapports/T16-captures/01-parent-inscription-390.png`
  - `agents/rapports/T16-captures/02-parent-journal-foyer-390.png`
  - `agents/rapports/T16-captures/11-parent-relier-enfant-390.png`
  - `agents/rapports/T16-captures/13-ecole-tableau-bord-390.png`
  - `agents/rapports/T16-captures/24-enseignant-vue-ensemble-390.png`

### Défaut 3 — Mesure de la « bande vide » en bas d'écran à 1280×800 px (Sévérité : Faible)
- **Méthode T12 appliquée** : Comparaison de la position du bas du contenu applicatif (`appBottom`) avec la hauteur utile de la fenêtre (`innerHeight = 800 px`).
- **Constats mesurés** :
  - Sur 23 écrans sur 33, le contenu est long et dépasse 800 px (`appBottom` entre 811 px et 5074 px), ne laissant aucune bande vide.
  - Sur 10 écrans avec peu d'éléments (ex. `14-ecole-classes`, `15-ecole-nouvelle-classe`, `18-ecole-fiches-connexions`, `19-ecole-import-eleves`, `24-enseignant-vue-ensemble`, `25-enseignant-mes-classes`, `27-enseignant-programme`, `31-enseignant-classement`, `32-enseignant-analytiques`, `33-enseignant-parametres`), `appBottom` est mesuré à exactement **800 px** (`diff = 0`). Le conteneur occupe `100vh`, mais laisse un espace vide uniforme en bas de la zone principale sous les cartes.
- **Captures d'appui** :
  - `agents/rapports/T16-captures/14-ecole-classes-1280.png`
  - `agents/rapports/T16-captures/24-enseignant-vue-ensemble-1280.png`
  - `agents/rapports/T16-captures/31-enseignant-classement-1280.png`

### Défaut 4 — Défilement horizontal des onglets du détail enfant à 390 px (Sévérité : Faible)
- **Constat** : Dans le détail d'un explorateur (`08-parent-carnets-detail`), les onglets secondaires (« Classement & Ligue #3 », « Trophées & Pouvoirs 0/12 ») s'étendent au-delà de 390 px et nécessitent un défilement tactile horizontal.
- **Capture d'appui** : `agents/rapports/T16-captures/08-parent-carnets-detail-390.png`.

### Défaut 5 — Absence de redirection de `/enseignant/devoirs` vers `/enseignant/missions` (Sévérité : Cosmétique)
- **Constat** : L'URL `/enseignant/missions` est la route officielle de l'application. Si un enseignant tape manuellement `/enseignant/devoirs`, Next.js renvoie une 404 au lieu d'une redirection 307.
- **Capture d'appui** : `agents/rapports/T16-captures/29-enseignant-missions-devoirs-1280.png`.

---

## 6. Inventaire et vérification d'intégrité des 132 captures d'écran

Toutes les 132 captures sont archivées dans `agents/rapports/T16-captures/` avec le fichier de contrôle `agents/rapports/T16-captures/metrics.json`.

### Statistiques globales d'intégrité :
- **Nombre total de captures** : 132 (33 écrans × 4 largeurs).
- **Captures valides & non vides** : 132 / 132 (100 %).
- **Taille moyenne par capture** : 194,1 Ko (min : 36 446 octets sur `08-1440`, max : 742 934 octets sur `06-768`).
- **Empreintes SHA-1 uniques** : 132 / 132 (**0 doublon**).
- **Adresses et textes attendus confirmés** : 132 / 132 (100 %).

### Extrait des empreintes SHA-1 des captures clés :
| Fichier | Largeur | Taille | Empreinte SHA-1 |
| :--- | :---: | :---: | :--- |
| `01-parent-inscription-390.png` | 390 px | 471,0 Ko | `c3380cdd3f8bd41f241e84053fe7e045298979ff` |
| `03-parent-inscrire-etape1-390.png` | 390 px | 358,0 Ko | `92f4e0c3b839ef4d7a8d80c102a9e1e9381ea609` |
| `04-parent-inscrire-etape2-390.png` | 390 px | 425,7 Ko | `50c76cbdfc633a69ccdc761ebf7c0c1b752945d8` |
| `05-parent-inscrire-etape3-390.png` | 390 px | 450,2 Ko | `1ca5c165d77443105ff76356770258cb28df779d` |
| `06-parent-inscrire-codes-390.png` | 390 px | 517,8 Ko | `34ea43940cffc1e95cfc9dcfb3dbdd3ae80c1511` |
| `11-parent-relier-enfant-390.png` | 390 px | 363,2 Ko | `fa287b47e2760ae8dfb77be415fcf30c4fc59114` |
| `13-ecole-tableau-bord-390.png` | 390 px | 129,5 Ko | `e6eb6e4dc017830b8098c4d28470438cf13d508e` |
| `14-ecole-classes-390.png` | 390 px | 129,5 Ko | `b7ee3a06041ecfa73eb4ea3ec4972750e633d262` |
| `15-ecole-nouvelle-classe-390.png` | 390 px | 134,8 Ko | `2a9953fc9a9572624a04d55b084e82df4b61a34b` |
| `24-enseignant-vue-ensemble-390.png` | 390 px | 136,5 Ko | `9c9a593dc6556e87f2fa83981882d2c1767cba68` |
| `26-enseignant-classe-ce1a-390.png` | 390 px | 118,9 Ko | `6a43afed7c15904a73dc0db019f5db9c3804fc8b` |
| `26-enseignant-classe-ce1a-768.png` | 768 px | 224,9 Ko | `f92d82bf94edf09d41b935bfc9d4704eef150a9a` |
| `26-enseignant-classe-ce1a-1280.png` | 1280 px | 120,5 Ko | `4cc494af2b17f3a2fd09a78aa62753c44a5eb224` |
| `26-enseignant-classe-ce1a-1440.png` | 1440 px | 131,5 Ko | `a49150c2511e9c4e4d9b31257682fd81cae55cea` |

---
*Rapport d'audit certifié sincère et vérifiable par Antigravity — 16 octobre 2026.*
