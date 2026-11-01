# T18-bis — Antigravity — lever les trois réserves de la reprise (petite tâche)

Ta reprise T18 est acceptée (voir `agents/rapports/T18-revue-claude.md`, section « Revue de la reprise »). Il reste trois réserves, toutes petites. Pars du sommet de `Dev_Lansana_Coly`.

## 1. Limiter la règle de focus au studio

Dans `frontend/app/admin/_components/studio79/studio79.css`, la règle `:focus-visible { outline: 3px solid var(--sx-brand) !important; … }` (vers la ligne 56) est globale : elle s'applique à toute page qui charge cette feuille. Limite-la aux conteneurs du studio (`.sx-editor`, la classe racine de l'accueil, les modals et tiroirs du studio) et vérifie qu'une autre page admin ouverte ensuite (Comptes, Inscriptions) garde son propre focus.
Fais le même contrôle pour tout autre sélecteur de ce fichier qui ne commence pas par `.sx-` (reset, `body`, `*`, `button`…). Ajoute un test dans `frontend/tests/` qui échoue si `studio79.css` contient une règle de niveau racine sans préfixe `.sx-`.

## 2. Preuve du clavier (étape 11), pour de bon

Un anneau de focus n'apparaît qu'avec de **vrais appuis de touche** : donner le focus par programme (`element.focus()`) ne l'affiche pas. Refais l'étape 11 avec des événements de clavier réels (`Input.dispatchKeyEvent` : Tab, Maj+Tab, Entrée, Échap) :
1. Depuis l'éditeur ouvert, Tab jusqu'à « Quitter », « Annuler », « Problèmes », « Historique », « Aperçu grand format », le premier écran du rail, le champ de texte de l'inspecteur : **sept captures** où l'anneau est visible.
2. Rends « Publier » actif (modifie un texte), Tab jusqu'à lui : capture. Entrée ouvre la fenêtre de publication ; Tab y circule sans en sortir (piège de focus) : capture du premier contrôle focalisé dans la fenêtre ; Échap la ferme et le focus revient sur « Publier » : capture.
3. `preuves.json` : pour chaque capture, le texte de `document.activeElement` (nom accessible) et la valeur calculée de son contour. Écris la **vraie couleur** de l'anneau (le code met le vert de marque, pas du citron) et corrige le rapport.
4. Supprime les anciennes 11a à 11f.

## 3. Nettoyage des preuves

- Étape 1 : lis réellement les trois chiffres de l'accueil et le nombre de cartes de leçons (40) ; si le sélecteur ne trouve rien, corrige le sélecteur.
- Étape 3 : ajoute un écran « À toi de jouer » vide, montre l'erreur de **structure** (le panneau des problèmes avec les lignes rouges, bouton « Publier » refusé), puis la correction ; ne supprime aucun autre écran. La leçon `p1-1` doit garder ses 7 écrans d'origine pendant tout le parcours (le brouillon de test ne doit pas perdre « Bonjour ! Moi, c'est… »).
- Ferme le menu « Quel écran ajouter ? » avant les captures 04, 05 et 06.
- Dans ton rapport : ne réécris pas les chiffres des contrôles ; renvoie à `preuves.json`.

## Contrôles et rendu

`npm run typecheck`, `npm run lint` (0 erreur), `npm test`. Un seul profil Chrome temporaire, `--disk-cache-size=1`, supprimé après. Commits `[antigravity] … (T18-bis)` + `Agent: antigravity`, auteur `Antigravity <antigravity@keuria.local>`, fichiers un par un, push sur `Dev_Lansana_Coly`. Rapport : `agents/rapports/T18-bis-antigravity.md`. Aucun cookie ni en-tête de requête dans les fichiers du dépôt (rappel).
