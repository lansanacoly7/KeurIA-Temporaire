# T18 — reprise — Antigravity — corriger l'éditeur du studio 7-9 et refaire les preuves

Lis `agents/rapports/T18-revue-claude.md` (ma revue de ton commit `22772fda`) et `docs/STUDIO79.md`. Le code utile est bon et reste ; on corrige quatre défauts bloquants et on refait des preuves qui prouvent.
Pars du sommet de `Dev_Lansana_Coly`. N'écris pas dans les fichiers d'OpenCode (tâche T17 : `backend/apps/superadmin/studio79*.py`, `frontend/app/dashboard/parcours79/`, `frontend/tests/`).

## 0. URGENT — retirer les secrets (à faire en premier, commit séparé)

Quatre fichiers de `agents/rapports/T18-captures/lighthouse/` contiennent un cookie de session administrateur et des jetons CSRF : `auth-headers.json`, `headers.json`, `studio79-editeur.json`, `studio79-accueil.json`.
1. Supprime ces quatre fichiers du dépôt (`git rm`) — ce sont les tiens, tu as le droit — et fais un commit à part : `[antigravity] fix(securite): retire des en-têtes de session des rapports (T18)`.
2. Ne remets **jamais** un en-tête `Cookie`, `Authorization` ou `Set-Cookie` dans un fichier du dépôt. Si tu gardes un rapport Lighthouse, écris à la place un petit `scores.json` avec les notes seulement (comme `lighthouse/scores.json`, qui est bon), et supprime l'option qui inscrit les en-têtes dans les résultats.
3. Ajoute à `.gitignore` : `agents/rapports/**/lighthouse/*headers*.json`.
4. Dis dans ton rapport que les sessions étaient celles de ton serveur local de développement, et **ne vide pas les sessions toi-même** : Lansana ou Claude s'en chargent.
5. Dis aussi, dans le rapport, ce que tu as changé dans la base de développement (mot de passe du compte `local-admin@keur-ia.test`, brouillons supprimés…) et pourquoi. Ne coupe plus un processus que tu n'as pas lancé.

## 1. L'éditeur doit remplir tout l'écran (défaut 2)

`.sx-editor` (et `.sx-too-small`, les tiroirs `position: fixed` autour des lignes 1110-1117, tout `100vw` / `100vh` de `studio79.css`) : entre 1025 et 1599 px le site applique un zoom de page (`--app-zoom`, 0,85 à 1440 px) ; une boîte `fixed` en `100vw`/`100vh` n'en couvre que 85 %. Même correctif que T12/T15 : diviser par `var(--app-zoom, 1)`, ou retirer `width`/`height` pour laisser `inset: 0` faire le travail si cela suffit — mesure pour décider.
- **Preuve** : à 1440, 1366, 1280 et 1100 px, `document.querySelector('.sx-editor').getBoundingClientRect()` recouvre toute la fenêtre (aucun pixel du menu ni du fond de page visible) ; capture avant/après à 1440.
- **Test** : étends `frontend/tests/zoom-page-height.test.mjs` pour qu'il échoue si `studio79.css` contient un `100vh`/`100vw` sans division par `--app-zoom` (ou sans `inset: 0` seul).

## 2. La barre du haut ne casse plus les mots (défaut 3)

Entre 900 et 1199 px, les boutons « Quitter », « Problèmes », « Historique », « Inspecteur », « Publier » se coupent au milieu des mots. `white-space: nowrap` sur les boutons, et en dessous de 1200 px : icônes seules avec `aria-label` et `title` (sauf « Publier », qui garde son texte), la barre ne défile jamais, le titre de la leçon se tronque avec des points de suspension.
- **Preuve** : à 900, 1024, 1100 et 1199 px, aucun bouton de la barre n'a de texte sur deux lignes (`scrollHeight <= clientHeight` et hauteur ≤ 44 px), capture de la barre à chaque largeur.

## 3. Refaire les preuves du parcours en 11 points (défaut 4)

Le but des captures est de **montrer le résultat de chaque étape**, pas de prouver que le fichier existe. Règles :
- Chaque capture montre l'état **après** l'action, sans tiroir ni modal flou par-dessus (sauf si le tiroir ou le modal est le sujet de l'étape). Attends que l'aperçu soit chargé (`.p79-lesson` présent dans l'iframe) et que les images des poses soient décodées avant de capturer. Aucune capture avec un aperçu noir.
- Pour chaque étape, ton script lit **dans la page ou par l'API** une valeur qui prouve l'effet, et la garde dans un fichier `agents/rapports/T18-captures/preuves.json` (étape → valeur avant / après / verdict) : par exemple l'ordre des écrans (titres lus dans le rail) avant et après le glisser-déposer ; le texte du champ avant / après annuler / après rétablir ; le texte du bandeau de publication ; le code HTTP de `GET /api/curriculum/content79/p1-1/`.
- **Étape 4** (glisser-déposer) : fais réellement glisser un écran (événements de souris par CDP) ; le rail doit changer d'ordre, et l'aperçu aussi.
- **Étape 6** : trois captures distinctes (texte modifié ; après annuler : texte d'origine ; après rétablir : texte modifié).
- **Étape 8** : publie, **force la mise en ligne** (`ContentVersion.objects.filter(key='p1-1', publish_at__gt=now).update(publish_at=now - 1 s)` par `manage.py shell`) ; montre `GET content79/p1-1/` : 404 avant, 200 après, avec le texte modifié.
- **Étape 9** : il faut **au moins trois versions** dans l'historique (version 1 d'origine, une modification publiée et passée en ligne, puis la restauration) : restaure la version 1 depuis le tiroir ; capture du tiroir avec les trois versions et de l'état après (aperçu = texte d'origine, `GET content79/p1-1/` = contenu d'origine, nouvelle version « Retour arrière »).
- **Étape 10** : l'aperçu en mode téléphone, **sans** aucun tiroir.
- **Étape 11 (clavier seul)** : une série de captures pendant un parcours sans souris (Tab dans la barre, dans le rail, dans l'inspecteur, ouverture du modal de publication avec Entrée, fermeture avec Échap) où l'on **voit l'anneau de focus** sur au moins cinq contrôles différents.
- Garde 1440, 1280 et 1024 px pour les étapes 1, 2, 3, 7, 10 ; une résolution suffit pour les autres. Mieux vaut 25 captures qui prouvent que 51 qui se ressemblent. Supprime toutes les captures de l'ancien lot.
- Le tableau « scrollWidth » n'est plus une preuve de non-débordement du rendu : ajoute la mesure du rectangle de `.sx-editor` (point 1).

## 4. Rapport

Remplace `agents/rapports/T18-antigravity.md` : ce qui est corrigé (défaut par défaut), les preuves (renvoi vers `preuves.json` et les captures), ce qui reste imparfait. N'écris pas « 100/100 » ni « 51 captures uniques » comme preuves de qualité.

## Contrôles et rendu

`npm run typecheck`, `npm run lint` (0 erreur), `npm test`, `python -m ruff check .`, `python -m pytest -q apps/superadmin`. Utilise UN seul profil Chrome temporaire avec `--disk-cache-size=1` supprimé après chaque série ; vérifie `Get-PSDrive C` avant.
Commits : d'abord le commit de sécurité (point 0), puis les corrections, signés `[antigravity] … (T18 reprise)` + `Agent: antigravity`, auteur `Antigravity <antigravity@keuria.local>`, fichiers un par un, push sur `Dev_Lansana_Coly`. Ne dis « terminé » que si les points 0 à 3 sont vérifiés par les preuves ci-dessus.
