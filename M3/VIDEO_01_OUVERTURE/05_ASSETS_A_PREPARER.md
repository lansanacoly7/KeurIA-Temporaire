# MISSION M3 — VIDÉO 01 : OUVERTURE DU VOYAGE
## DOCUMENT 05 — PLAN DE PRÉPARATION TECHNIQUE DES ASSETS D'ANIMATION

> **Projet :** Maïmouna — Les vacances à Dakar  
> **Objectif :** Préparation modulaire des éléments graphiques pour l'animation 2D (Cut-out, Puppet Rigging & IA)  
> **Règle absolue :** Préservation stricte des illustrations originales (aucune altération des visages, proportions, vêtements, couleurs ou poses).

---

### 1. ÉTAT DES LIEUX DU DÉCOUPAGE ACTUEL

| Catégorie | Asset source | État de séparation | Prêt pour animation directe ? | Opération technique recommandée |
| :--- | :--- | :---: | :---: | :--- |
| **Car rapide (Profil)** | `car-profil-droite.png` | Détouré (fond alpha) | **OUI** (Global) / **Partiel** (Roues) | Isoler les deux roues en calques circulaires pour rotation autonome. |
| **Car rapide (Arrière)** | `car-arriere-porte-ouverte.png` | Détouré (fond alpha) | **OUI** (Scène 5) | Isoler le battant de porte gauche pour animer la fermeture en fin d'embarquement. |
| **Papa Ibou (Cabine)** | `papa-ibou-volant-salut.png` | Détouré (fond & baie alpha) | **OUI** (Scène 3) | Prêt à l'emploi. Le pare-brise transparent laisse voir le décor. |
| **Enfants (Marche)** | `enfants-marchent.png` | Détouré (fond alpha) | **OUI** (Groupe) | Pour un cycle décalé en cut-out pur, isoler Fatou, Moussa et Palou en 3 calques distincts. |
| **Enfants (Embarquement)** | `enfants-montent.png` | Détouré (fond alpha) | **OUI** (Scène 5) | Prêt pour animation de morphing / interpolation 2D. |
| **Enfants (Aux vitres)** | `enfants-assis-car.png` | Détouré (fond alpha) | **OUI** (Scène 6) | Prêt à l'emploi avec le car en translation. |
| **Décors** | `village.png`, `route.png` | Plein format 1600 × 900 | **OUI** | Parfait pour fonds fixes ou travellings 1920 × 1080. |

---

### 2. DÉCOUPES TECHNIQUES RECOMMANDÉES (SANS TOUCHER AUX ORIGINAUX)

Pour un compositing 2D professionnel (After Effects, Spine, Rive ou moteur cut-out), 4 découpes secondaires non-destructives permettront un contrôle total des mouvements :

#### A. Les Roues du Car Rapide (Profil Droit)
- **Objectif :** Faire tourner les jantes colorées à la vitesse exacte du déplacement sans faire osciller la carrosserie.
- **Opération :**
  1. Extraire la roue avant (`x in [755, 865], y in [420, 530]` dans la référence de profil).
  2. Extraire la roue arrière (`x in [275, 385], y in [420, 530]`).
  3. Combler le passage de roue sur la carrosserie par un aplat noir/sombre neutre (`#1A1A1A`) pour éviter tout trou lors de la rotation.
  4. Placer le point de pivot (Anchor Point) au centre géométrique exact du moyeu bleu.

#### B. La Porte Battante Arrière du Car
- **Objectif :** Permettre d'animer la porte qui se referme doucement après la montée de Moussa.
- **Opération :**
  1. Isoler le battant de porte ouvert à gauche avec ses charnières.
  2. Créer une interpolation de fermeture vers l'axe central.

#### C. Les 3 Personnages Isolés (Cycle de Marche)
- Dans `enfants-marchent.png`, les trois personnages sont sur une même planche avec leurs ombres naturelles.
- Pour une animation IA (Google Flow / Veo), l'image de groupe est **idéale et directement utilisable** car elle garantit la cohérence d'interaction.
- Pour un compositing 2D traditionnel, les fichiers individuels existants dans `frontend/public/images/parcours1012/decoupes/` (`fatou-profil.png`, `moussa-profil.png`, `palou-profil.png`) sont **déjà disponibles** et parfaitement détourés.

#### D. Effets d'Ambiance 2D (Overlays)
- **Poussière de piste (Scènes 2 et 6) :** 2 à 3 volutes stylisées 2D ocre semi-transparentes (`#E2BA78` opacité 40%).
- **Lueur solaire matinale (Scène 1 et 7) :** Calque de dégradé radial doré en mode fusion *Écran* / *Add* (opacité 15%).

---

### 3. VÉRIFICATION DES CONTRAINTES INTANGIBLES

| Élément sous surveillance | Statut | Garantie de non-altération |
| :--- | :---: | :--- |
| **Chaussettes blanches de Moussa** | **Conforme** | Restent 100% opaques et d'un blanc pur (#FEFEFE) sur toutes les poses. |
| **Visages et expressions** | **Conforme** | Aucun redraw ni modification de trait ; expressions d'origine rigoureusement préservées. |
| **Costumes et accessoires** | **Conforme** | Sac bleu de Moussa, robe bleue et besace de Fatou, crinière de Palou, chemise et casquette de Papa Ibou identiques sur tous les plans. |
| **Graphismes du Car Rapide** | **Conforme** | Échelle arrière, lion héraldique, yeux protecteurs, frises géométriques et porte-bagages intacts. |
| **Absence de texte / logo** | **Conforme** | Aucun texte généré à l'écran, générique ou sous-titres exclus. |

---

### 4. SYNTHÈSE DE PRÉPARATION POUR LA PRODUCTION

Tous les assets essentiels sont **disponibles, détourés et conformes** dans le projet :
- 100% des décors nécessaires (Village, Route, Dakar) sont présents.
- 100% des poses clés narratives (Arrivée, Salutation, Marche, Embarquement, Passagers aux vitres, Départ) sont prêtes.
- Aucun asset manquant bloquant pour la fabrication de la Vidéo 01.

