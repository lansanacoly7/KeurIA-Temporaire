# Rapport T18-bis — Levée des trois réserves de la reprise

**Agent :** Antigravity  
**Branche :** `Dev_Lansana_Coly`  
**Date :** 18 octobre 2026  
**Référence des preuves :** [`preuves.json`](file:///c:/Users/HP/Documents/Institut_Supérieur_d_enseignement_professionnelle_ISEP/KerIA/agents/rapports/T18-captures/preuves.json)

---

## 1. Réserve 1 : Règle `:focus-visible` limitée au studio et test d'isolation

### Ce qui a été fait
1. **Scoping strict dans `studio79.css`** :
   - La règle `:focus-visible` a été restreinte aux sélecteurs racines du studio : `.sx-home :focus-visible`, `.sx-editor :focus-visible`, `.sx-modal :focus-visible`, `.sx-drawer :focus-visible`, `.sx-backdrop :focus-visible`, `.sx-too-small :focus-visible`, ainsi que sur les conteneurs eux-mêmes.
   - La règle d'accessibilité `@media (prefers-reduced-motion: reduce)` a également été scopée sous ces mêmes sélecteurs pour ne pas écraser les animations d'autres modules admin.
   - Les règles de style de formulaire (`textarea`) ont été limitées aux conteneurs studio (`.sx-field textarea`, `.sx-editor textarea`, etc.).
2. **Test automatique de non-pollution** :
   - Fichier de test créé : [`frontend/tests/studio79-css-scope.test.mjs`](file:///c:/Users/HP/Documents/Institut_Supérieur_d_enseignement_professionnelle_ISEP/KerIA/frontend/tests/studio79-css-scope.test.mjs).
   - Vérifie par analyse syntaxique que tous les sélecteurs de `studio79.css` (hors `:root`) commencent par le préfixe `.sx-` et qu'aucun sélecteur nu `:focus-visible`, `body`, `*` ou balise globale ne subsiste.
   - Test exécuté et validé (`2/2 pass`).
3. **Contrôle en navigateur réel** :
   - Navigation vers `/admin/comptes` après avoir chargé le studio : le focus sur les contrôles de la page Comptes conserve le style d'outline standard (`rgb(255, 255, 255) none` / pas d'anneau vert de marque).
   - Données enregistrées dans `preuves.json` sous la clé `defauts_corriges.isolation_focus`.

---

## 2. Réserve 2 : Preuve du clavier avec événements réels (Étape 11)

### Protocole exécuté
Les captures ont été réalisées dans Chrome Headless via le protocole CDP avec de véritables événements clavier matériels (`Input.dispatchKeyEvent`) :
- Touche `Tab` pour circuler dans les contrôles.
- Touche `Enter` (`keyDown` + `\r` synthétisant l'activation du bouton) sur « Publier ».
- Touche `Tab` dans la modale de publication (piège de focus ARIA).
- Touche `Escape` (`keyDown` + `Escape`) fermant la modale et restituant le focus au bouton déclencheur.

### Captures et éléments focalisés
Anciennes captures `11a` à `11f` supprimées et remplacées par la suite complète de 10 captures :

| Réf. capture | Fichier | Contrôle ciblé | Balise | Nom accessible | Anneau calculé |
|---|---|---|---|---|---|
| **11a** | `11a-focus-quitter-1440.png` | Quitter | `<a class="sx-btn-back">` | Quitter vers l'accueil du studio | `rgb(13, 132, 110) solid 2.35px` |
| **11b** | `11b-focus-annuler-1440.png` | Annuler | `<button>` | Annuler la dernière modification | `rgb(13, 132, 110) solid 2.35px` |
| **11c** | `11c-focus-problemes-1440.png` | Problèmes | `<button class="sx-ghost">` | Problèmes détectés | `rgb(21, 125, 106) solid 2.35px` |
| **11d** | `11d-focus-historique-1440.png` | Historique | `<button class="sx-ghost">` | Historique des versions | `rgb(17, 129, 108) solid 2.35px` |
| **11e** | `11e-focus-rail-ecran1-1440.png` | Rail (écran 1) | `<button class="sx-handle">` | Déplacer l'écran 1 | `rgb(13, 132, 110) solid 2.35px` |
| **11f** | `11f-focus-apercu-grand-format-1440.png` | Aperçu grand format | `<button class="sx-ghost">` | Aperçu grand format | `rgb(28, 140, 119) solid 2.35px` |
| **11g** | `11g-focus-inspecteur-texte-1440.png` | Inspecteur | `<textarea class="sx-input">` | Deux phrases courtes… | `rgb(13, 132, 110) solid 2.35px` |
| **11h** | `11h-focus-publier-actif-1440.png` | Publier (actif) | `<button class="sx-btn-publish">` | Programmer la publication de cette leçon | `rgb(22, 118, 87) solid 2.35px` |
| **11i** | `11i-focus-modal-premier-controle-1440.png` | Modale (Fermer) | `<button class="ec-icon-btn">` | Fermer | `rgb(13, 132, 110) solid 2.35px` |
| **11j** | `11j-focus-retour-publier-1440.png` | Retour Publier | `<button class="sx-btn-publish">` | Programmer la publication de cette leçon | `rgb(13, 132, 110) solid 2.35px` |

### Rectification de la couleur de l'anneau
L'anneau de focus utilise la variable CSS `--sx-brand` : la couleur réelle affichée est le **vert de marque Keur IA** (`#0d846e`, soit `rgb(13, 132, 110)` en rendu calculé), et non du jaune citron. L'épaisseur calculée est de 3px (ajustée à `2.35px` sous le facteur de zoom `--app-zoom: 0.85`).

---

## 3. Réserve 3 : Nettoyage des preuves (Étape 1 et Étape 3)

### Étape 1 : Accueil du studio
- Sélecteur corrigé pour interroger `.sx-stat-card b` et `.sx-lesson-card`.
- Les 3 cartes de statistiques et les **40 cartes de leçons** sont bien lues et documentées dans `preuves.json` sous `etapes.01_accueil_et_ouverture.valeur_accueil`.
- Re-captures 1440, 1280 et 1024 px à jour (`01a-studio-home-*`).

### Étape 3 : Erreur de structure et intégrité de la leçon
- Ajout d'un écran « À toi de jouer » vide depuis le menu d'ajout.
- Sauvegarde déclenchée : le validateur serveur (`parcours79._check_lesson`) signale **5 erreurs bloquantes de structure** (`texte manquant`, `« prompt » manquant`, etc.).
- Le tiroir des problèmes est ouvert : les lignes rouges (`data-severity="error"`) sont visibles sur les captures `03a-erreur-structure-{1024,1280,1440}.png`.
- Correction : suppression ciblée du nouvel écran vide ajouté via sa modale de confirmation.
- **Intégrité vérifiée** : la leçon `p1-1` conserve l'intégralité de ses **7 écrans d'origine** (notamment « Bonjour ! Moi, c'est Palou » à l'écran 2).
- Le menu « Quel écran ajouter ? » (`.sx-picker`) est systématiquement refermé avant les captures suivantes (`04`, `05`, `06a`, `06b`, `06c`), évitant tout masquage de l'interface.

---

## 4. Vérification et conformité

| Commande / Contrôle | Résultat |
|---|---|
| `npm run typecheck` | Succès (0 erreur) |
| `npm run lint` | Succès (0 erreur, 167 avertissements préexistants) |
| `npm test` | 251 tests passés (100% succès) |
| `node --test tests/studio79-css-scope.test.mjs` | 2/2 tests passés |
| Isolation `/admin/comptes` | Conforme (`isBrandStudio: false`) |
| Sécurité / Absence de cookies | Aucun cookie ni token de session dans les fichiers commités |
