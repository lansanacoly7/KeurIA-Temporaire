# MISSION M3 — VIDÉO 01 : OUVERTURE DU VOYAGE
## DOCUMENT 03 — PLAN TECHNIQUE D'ANIMATION ET COMPOSITING 2D

> **Projet :** Maïmouna — Les vacances à Dakar  
> **Type d'animation :** 2D Cut-out / Puppet Animation & Compositing multicouche  
> **Fréquence :** 24 images/seconde | Espace colorimétrique : sRGB  
> **Format :** 1920 × 1080 Full HD

---

### 1. HIÉRARCHIE DES CALQUES (Z-ORDER) PAR SCÈNE

Pour chaque scène, la superposition rigoureuse des calques garantit l'immersion et la propreté des interactions.

#### Scène 2 : Arrivée du Car au Village
- **Z-10 (Arrière-plan) :** `decor_village.png` (ciel, cases du fond, baobabs).
- **Z-20 (Milieu) :** Arbres et clôtures intermédiaires.
- **Z-30 (Piste/Sol) :** Sol sablonneux du village.
- **Z-35 (Ombre portée) :** Ombre dynamique ovale étirée sous le car (`#1E293B` à 35% d'opacité avec flou gaussien 8px).
- **Z-40 (Effets de sol) :** Poussière ocre en volutes (particules 2D semi-transparentes derrière les roues).
- **Z-50 (Véhicule) :** `car-profil-droite.png` (carrosserie, échelle ajourée, Papa Ibou dans la cabine).
- **Z-60 (Roues animées) :** Roues avant et arrière détourées en calques rotatifs centrés sur leurs essieux respectifs.
- **Z-70 (Premier plan décor) :** Éléments de végétation au bas de cadre (optionnel pour la profondeur).

#### Scène 3 : Salutation de Papa Ibou
- **Z-10 (Arrière-plan) :** `decor_village.png` avec flou de profondeur de champ (Depth of Field, flou 12px).
- **Z-20 (Cabine intérieure) :** Paroi arrière bleue de la cabine (`#2A4B7C`).
- **Z-30 (Buste conducteur) :** Torse et épaule gauche de Papa Ibou (chemise à carreaux).
- **Z-40 (Volant) :** Volant noir incliné.
- **Z-50 (Bras & Main saluant) :** Bras droit de Papa Ibou articulé (épaule -> coude -> poignet).
- **Z-60 (Tête & Casquette) :** Tête souriante de Papa Ibou avec micro-hochement bienveillant.
- **Z-70 (Montants cabine & Rétroviseur) :** Montant de pare-brise jaune, pompon rouge suspendu et portière avant.

#### Scène 4 : Arrivée des Enfants
- **Z-10 :** `decor_village.png`.
- **Z-20 :** Car rapide à l'arrêt en arrière-plan à droite.
- **Z-30 :** Ombres portées douces sous les pieds des enfants et les pattes de Palou.
- **Z-40 :** Fatou (marche déterminée, besace en bandoulière oscillant légèrement).
- **Z-50 :** Moussa (sac à dos bleu, tee-shirt jaune, chaussettes blanches 100% opaques).
- **Z-60 :** Palou (lionceau bondissant au premier plan, queue ondulant en S).

#### Scène 5 : L'embarquement à l'arrière du Car
- **Z-10 :** `decor_village.png`.
- **Z-20 :** `car-arriere-porte-ouverte.png` (carrosserie arrière, toit et bagages).
- **Z-30 (Intérieur car) :** Banquettes et allée centrale visibles par l'ouverture de la porte.
- **Z-40 :** Fatou déjà montée sur la marche arrière, se tournant vers l'intérieur.
- **Z-50 :** Moussa au sol, mains sous les pattes avant de Palou.
- **Z-60 :** Palou hissé par Moussa, pattes arrière prenant appui sur le marchepied.
- **Z-70 :** Battant de porte ouvert à gauche et échelle arrière à droite.

#### Scène 6 : Démarrage et Enfants aux Vitres
- **Z-10 :** `decor_village.png` amorçant un panoramique vers `route.png`.
- **Z-20 :** Ombre portée du véhicule.
- **Z-30 :** `enfants-assis-car.png` :
  - Papa Ibou dans la cabine avant.
  - Moussa à la vitre 1 agitant la main.
  - Fatou à la vitre 2 souriant et saluant.
  - Palou à la vitre 3 passant la tête joyeusement.
- **Z-40 :** Roues en rotation accélérée.
- **Z-50 :** Volute de fumée stylisée bleue/blanche à l'échappement arrière.

---

### 2. DÉCOMPOSITION CINÉMATIQUE ET CYCLES D'ANIMATION

#### A. Le Car Rapide (Véhicule)
1. **Cycle de roulement :**
   - Vitesse de rotation des roues : $\omega = v / r$. À 30 km/h à l'échelle écran, rotation de ~ 360° toutes les 12 images (0,5s).
   - Déformation pneumatique : micro-écrasement de 2% sur l'axe Y au point de contact avec le sol.
2. **Dynamique de suspension (Secondary Motion) :**
   - Démarrage : cabrage léger de l'avant (+1,5° sur l'axe Z) pendant 6 frames.
   - Freinage : plongée de l'avant (-2° sur l'axe Z) puis rebond d'amortissement sur 8 frames.
   - Vibrations moteur au ralenti : micro-oscillation verticale de ±1 pixel à une fréquence de 12 Hz.

#### B. Les Personnages (Puppet Rigging)
1. **Papa Ibou :**
   - Articulation de la salutation : pivot d'épaule fixe, oscillation de l'avant-bras de 15°, balancement de la main de ±20° avec traînée souple (overlap de 2 frames).
   - Clignement d'yeux : 2 frames fermé à $t = 1.2s$.
2. **Moussa :**
   - Cycle de marche en 24 frames (1 pas complet par seconde).
   - Respect strict des **chaussettes blanches** : aucun masque de découpe ne doit mordre sur le blanc pur des chaussettes.
   - Balancement du sac à dos bleu en retard de phase de 3 frames par rapport au buste.
3. **Fatou :**
   - Cycle de marche régulier et gracieux.
   - Oscillation pendulaire de la besace en cuir sur la hanche gauche.
   - Nœud papillon vert dans les cheveux oscillant avec le vent.
4. **Palou le Lionceau :**
   - Démarche bondissante caractéristique (sauts légers plutôt que marche stricte).
   - Queue articulée en 3 segments de courbe de Bézier ondulant en phase inversée.

---

### 3. PROTOCOLE DE GESTION DES COULEURS ET DE LA LUMIÈRE

- **Température de couleur :** Ambiance matinale sahélienne (5400 K), dominante ocre, sable et ciel azur pur.
- **Lumière directionnelle :** Soleil rasant venant de la gauche (Est) créant des ombres portées étirées vers la droite à 45°.
- **Grading de transition :** Passage de la lumière douce du village à la lumière éclatante de la route ouverte vers Dakar.
