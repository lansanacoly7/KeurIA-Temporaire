# MISSION M3 — VIDÉO 01 : OUVERTURE DU VOYAGE
## DOCUMENT 02 — STORYBOARD TECHNIQUE PROFESSIONNEL (18 À 20 SECONDES)

> **Projet :** Maïmouna — Les vacances à Dakar  
> **Séquence :** Ouverture du voyage — Du village vers Dakar  
> **Cadence :** 24 images/seconde | Format : 1920 × 1080  
> **Durée totale cible :** 19,5 secondes

---

### DÉCOUPAGE SCÈNE PAR SCÈNE

```
[00:00 - 00:02.5]  SCÈNE 1 : Le village au petit matin (Ambiance)
[00:02.5 - 00:05.5] SCÈNE 2 : L'arrivée du car rapide (Ralentissement)
[00:05.5 - 00:08.0] SCÈNE 3 : Salutation chaleureuse de Papa Ibou (Plan cabine)
[00:08.0 - 00:11.0] SCÈNE 4 : Arrivée des enfants et de Palou (Marche avec bagages)
[00:11.0 - 00:14.5] SCÈNE 5 : L'embarquement à l'arrière du car (Moussa hisse Palou)
[00:14.5 - 00:17.0] SCÈNE 6 : Le démarrage du car rapide (Enfants aux vitres)
[00:17.0 - 00:19.5] SCÈNE 7 : La route vers Dakar & Fondu au noir (Transition finale)
```

---

#### SCÈNE 1 — LE VILLAGE AU PETIT MATIN
- **Durée :** 2,5 secondes (00:00 – 00:02.5)
- **Décor utilisé :** `frontend/public/images/parcours1012/decors/village.png`
- **Personnages présents :** Aucun au premier plan (mise en place de l'univers).
- **Illustrations exactes :** `decor_village.png`
- **Cadrage :** Plan d'ensemble (Wide Shot).
- **Mouvement de caméra :** Travelling lent panoramique horizontal (pan de gauche à droite) avec un très léger zoom avant (scale 100% -> 105%).
- **Animation :** Légère oscillation des feuilles des arbres/acacias, lumière dorée du soleil levant qui monte doucement.
- **Transition vers scène 2 :** Coupe franche (Cut) synchronisée avec l'amorce sonore du moteur du car rapide.
- **Difficulté technique :** Maintenir une sensation de calme avant l'arrivée du véhicule.

---

#### SCÈNE 2 — ARRIVÉE DU CAR RAPIDE
- **Durée :** 3,0 secondes (00:02.5 – 00:05.5)
- **Décor utilisé :** `frontend/public/images/parcours1012/decors/village.png` (cadré sur la piste centrale).
- **Personnages présents :** Papa Ibou au volant dans le car.
- **Illustrations exactes :** `decor_village.png` + `car-profil-droite.png`
- **Position des éléments :** Le car entre par la gauche du cadre (X: -400px), traverse la piste et ralentit au centre-droit (X: 550px).
- **Mouvements à réaliser :**
  - Translation horizontale avec courbe de décélération (Ease-Out).
  - Léger amorti vertical de la carrosserie au freinage (balancement de suspension 2D).
  - Rotation des roues calée sur la vitesse de déplacement.
  - Petit nuage de poussière stylisé 2D sous les pneus arrière.
- **Mouvement de caméra :** Caméra fixe, accompagnant l'arrêt du car.
- **Transition vers scène 3 :** Coupe franche (Cut) pour passer au gros plan cabine.
- **Difficulté technique :** Veiller à ce que l'arrêt du véhicule soit souple sans glissement artificiel.

---

#### SCÈNE 3 — SALUTATION DE PAPA IBOU
- **Durée :** 2,5 secondes (00:05.5 – 00:08.0)
- **Décor utilisé :** `frontend/public/images/parcours1012/decors/village.png` (en arrière-plan flouté à 15% / bokeh 2D).
- **Personnages présents :** Papa Ibou (conducteur bienveillant).
- **Illustrations exactes :** `papa-ibou-volant-salut.png` (baie de cabine transparente, montants nets).
- **Cadrage :** Plan moyen rapproché (Medium Close-Up) sur la cabine avant.
- **Mouvements à réaliser :**
  - Papa Ibou agite joyeusement la main droite par la fenêtre en signe de salutation amicale (cycle de balancement de la main sur l'axe du poignet).
  - Sourire expressif, clin d'œil ou hochement de tête bienveillant.
  - Légère vibration continue du volant et de la carrosserie (moteur au ralenti).
- **Mouvement de caméra :** Caméra fixe avec très léger recadrage respiratoire.
- **Transition vers scène 4 :** Coupe franche (Cut) vers le plan large des enfants qui arrivent.
- **Difficulté technique :** Animation naturelle de la main sans déformer les doigts originaux.

---

#### SCÈNE 4 — ARRIVÉE DES ENFANTS
- **Durée :** 3,0 secondes (00:08.0 – 00:11.0)
- **Décor utilisé :** `frontend/public/images/parcours1012/decors/village.png`
- **Personnages présents :** Fatou, Moussa, Palou.
- **Illustrations exactes :** `enfants-marchent.png` (ou calques séparés `fatou-profil.png`, `moussa-profil.png`, `palou-profil.png`).
- **Position des personnages :** Entrent par la gauche du cadre et s'avancent joyeusement vers le car rapide stationné à droite.
- **Mouvements à réaliser :**
  - Cycle de marche synchronisé : Fatou d'un pas assuré avec sa besace, Moussa avec son sac à dos, Palou bondissant joyeusement.
  - Balancement dynamique des bras et des queues (Palou).
- **Mouvement de caméra :** Travelling latéral accompagnant la marche des enfants de gauche à droite.
- **Transition vers scène 5 :** Raccord dans l'axe / Cut sur l'arrière du car rapide.
- **Difficulté technique :** Respecter le rythme sautillant de Palou par rapport à la marche cadencée des enfants.

---

#### SCÈNE 5 — L'EMBARQUEMENT
- **Durée :** 3,5 secondes (00:11.0 – 00:14.5)
- **Décor utilisé :** `frontend/public/images/parcours1012/decors/village.png`
- **Personnages présents :** Fatou, Moussa, Palou, arrière du car.
- **Illustrations exactes :** `car-arriere-porte-ouverte.png` + `enfants-montent.png`
- **Cadrage :** Plan taille / plan moyen sur l'arrière du véhicule.
- **Mouvements à réaliser :**
  - Fatou monte sur la marche arrière et entre dans l'allée centrale du car.
  - Moussa soulève délicatement Palou sous les pattes pour l'aider à gravir la marche arrière.
  - Palou s'appuie sur la marche arrière, frétille de la queue et pénètre dans le car.
  - Moussa monte à son tour et s'apprête à refermer la porte battante.
- **Mouvement de caméra :** Caméra fixe, légère plongée douce valorisant l'entraide entre les enfants.
- **Transition vers scène 6 :** Coupe franche (Cut) sur le car vu de profil avec les passagers installés.
- **Difficulté technique :** Respecter rigoureusement la porte arrière du car rapide (seul point d'entrée réel des passagers).

---

#### SCÈNE 6 — LE DÉPART DU CAR RAPIDE
- **Durée :** 2,5 secondes (00:14.5 – 00:17.0)
- **Décor utilisé :** `frontend/public/images/parcours1012/decors/village.png` en transition vers `route.png`.
- **Personnages présents :** Papa Ibou au volant, Moussa, Fatou et Palou aux vitres.
- **Illustrations exactes :** `enfants-assis-car.png`
- **Position dans le cadre :** Le car rapide est cadré de profil droit.
- **Mouvements à réaliser :**
  - Les enfants et Palou font de grands gestes de la main par les vitres ouvertes pour saluer le village.
  - Le car s'ébroue, légère fumée stylisée à l'échappement, accélération progressive (Ease-In) vers la droite.
  - Rotation des roues proportionnelle à la vitesse d'accélération.
- **Mouvement de caméra :** Caméra en travelling d'accompagnement qui se laisse distancer par le véhicule.
- **Transition vers scène 7 :** Fondu enchaîné doux (Cross-Dissolve, 12 frames / 0,5s) vers le grand paysage routier.
- **Difficulté technique :** Animation des petites mains aux fenêtres sans distorsion des têtes des enfants.

---

#### SCÈNE 7 — TRANSITION : LA ROUTE DE DAKAR
- **Durée :** 2,5 secondes (00:17.0 – 00:19.5)
- **Décor utilisé :** `frontend/public/images/parcours1012/decors/route.png` (route fuyante vers l'horizon).
- **Personnages présents :** Le car rapide vu de dos ou de 3/4 arrière s'éloignant sur la route.
- **Illustrations exactes :** `decor_route.png` + `car-face-arriere_reference.jpg` (ou `car-arriere-porte-ouverte.png` porte fermée).
- **Position dans le cadre :** Centre de la route, diminuant progressivement de taille vers le point de fuite.
- **Mouvements à réaliser :**
  - Éloignement du véhicule vers l'horizon (réduction d'échelle de 100% à 25%).
  - Soleil éclatant à l'horizon.
- **Mouvement de caméra :** Plan fixe contemplatif en plan large d'horizon.
- **Fin de la vidéo :** Fondu au noir complet (Fade to Black, durée 1 seconde de 00:18.5 à 00:19.5).
- **Difficulté technique :** Perspective fuyante naturelle du véhicule sans écrasement de texture.
