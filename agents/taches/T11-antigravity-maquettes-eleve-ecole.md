# T11 — Antigravity — Maquettes de l'espace « cahier de classe » (élève d'école) et de l'espace enseignant

Tu es libre : cette tâche ne dépend pas du backend. Lis `docs/ECOLE_ELEVE_CONCEPTION.md` en entier (sections 3, 4 et 8). Tu produis le **design** que OpenCode codera ensuite (T9 et T10).

## À livrer : des maquettes HTML/CSS statiques, cliquables, dans `docs/maquettes/eleve-ecole/`

Une page HTML par écran, avec une feuille `maquette.css` commune (aucune dépendance, ouvrable en double-clic) ; mêmes polices et couleurs que le site (tokens du projet : Fredoka, vert/lime kEur IA ; couleurs de l'école en variables `--school-primary`, `--school-secondary`, `--school-accent`). Pour chaque écran : version 390 px (téléphone/tablette de classe) et 1440 px, plus une capture PNG de chaque dans `docs/maquettes/eleve-ecole/captures/`.

**Élève d'école (enfant de 6 à 9 ans, ton « cahier de classe », très lisible, grands boutons ≥ 56 px) :**
1. **Aujourd'hui** : en-tête (avatar, prénom, « CE1 A · Mme Faye · Groupe Scolaire Les Baobabs »), carte « Séance en cours » (leçon, temps restant, bouton « Rejoindre »), « Le mot de Mme Faye » (annonce texte), un **sondage** (3 réponses à toucher, résultat « tu as répondu »), « À faire aujourd'hui » (prochaine leçon donnée), « Devoirs à rendre » (dates), bandeau de règles (« Les jeux : coupé par ton enseignant »).
2. **Mes devoirs** (à rendre / rendus / notés). 3. **Mon parcours** (la carte des îles reste celle de l'archipel : seulement le cadre). 4. **Ma classe** (classe, enseignant, tableau d'honneur en prénoms seuls). 5. **Mes étoiles** (étoiles, badges, niveau). 6. **Libre** (jeux, arcade, Scratch ; version avec un onglet verrouillé « Coupé par ton enseignant »).
7. Écrans d'état : **« Ce n'est pas l'heure »** (horaires fixés par l'école/l'enseignant), **séance terminée**, **aucun devoir**.
8. Le **menu** (barre du bas sur téléphone, barre latérale sur ordinateur) : Aujourd'hui, Mes devoirs, Mon parcours, Ma classe, Mes étoiles, Libre.

**Enseignant (adulte, sobre) :** 9. **Ouvrir une séance** (leçon + durée) et séance en cours avec temps restant. 10. **Annonces** : créer un mot / un sondage (2 à 5 réponses, date de fin), résultats d'un sondage (compteurs + qui a répondu). 11. **Parcours d'un élève** (menu sur la fiche élève).
**Direction/enseignant :** 12. **Règles de la classe** (cases jours/heures pour les horaires, interrupteurs, aperçu « ce que voit l'élève » en phrases) — OpenCode a livré une première version en JSON : propose le bon design.

## Critères
- Contrastes AA, cibles tactiles ≥ 48 px (≥ 56 px côté enfant), textes courts, aucun texte à saisir pour l'élève.
- Un fichier `docs/maquettes/eleve-ecole/LISEZMOI.md` : liste des écrans, décisions de design, composants réutilisables à créer (carte, bandeau, sondage…), et ce qui s'écarte du site actuel.
- Ne touche à aucun code de l'application (seulement `docs/maquettes/`). Rapport `agents/rapports/T11-antigravity.md` (vrais commits, captures). Commits `[antigravity] ... (T11)`, branche `Dev_Lansana_Coly`, dossier `KerIA-agents/antigravity/`.
