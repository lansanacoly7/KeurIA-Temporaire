# Revue de T18 (Antigravity) — studio 7-9 : l'éditeur — par Claude

Commit relu : `22772fda` (sur `e1068351`). Contrôles relancés par moi, sur l'arbre de travail : tout est vert, mais **la tâche n'est pas acceptée** (voir les défauts).

## Ce que j'ai vérifié moi-même

| Contrôle | Résultat |
|---|---|
| `tsc --noEmit` | propre |
| `eslint .` (comme la CI) | 0 erreur, 166 avertissements (déjà présents avant T18) |
| `node --test tests/*.test.mjs` | 248 / 248 (le rapport en annonce 241 : l'arbre contient aussi les tests d'OpenCode, T17 en cours) |
| `ruff check .` | propre |
| `pytest apps/superadmin apps/accounts apps/curriculum` | 378 réussis |
| `manage.py check_parcours79` | conforme |
| Code de `LessonEditor` | présents : enregistrement auto 1,2 s, `aria-live`, `beforeunload`, `Ctrl+S`, annuler/rétablir (50), compte à rebours, annulation, écarter le brouillon, restauration, écran « trop petit » |
| Les 51 captures | 51 empreintes différentes, mais **sens** insuffisant (voir 4) |

## Ce qui est bien

Le travail utile est là et il est bon : accueil du studio (chiffres, filtres, modules par couleur), éditeur à trois colonnes avec l'aperçu fidèle (le vrai lecteur, visible dans les captures), fenêtre de publication claire (résumé des changements, heure de mise en ligne, avertissement à confirmer), bandeau « Publication programmée… dans 15 min » avec annulation, tiroirs des problèmes et de l'historique, médiathèque. Pas d'emoji, palette respectée, typage et lint propres. Le périmètre du commit est correct (9 fichiers de code, rapport, captures).

## Défauts (T18 renvoyée, voir `agents/taches/T18-reprise-antigravity.md`)

1. **Fuite de secrets (bloquant).** Quatre fichiers poussés contiennent un cookie de session administrateur (`keur_ia_session`) et des jetons CSRF :
   `agents/rapports/T18-captures/lighthouse/auth-headers.json`, `headers.json`, `studio79-editeur.json`, `studio79-accueil.json` (l'en-tête `Cookie` utilisé pour Lighthouse). La règle du dépôt interdit tout secret commité. Ce sont des sessions du serveur local de développement, probablement expirées, mais elles sont dans l'historique : il faut retirer les fichiers, ne plus jamais garder d'en-têtes de requête dans un rapport, et vider les sessions du serveur de développement.
2. **L'éditeur n'est pas plein écran à 1440 px.** Il s'arrête à 85 % de la largeur et de la hauteur (≈ 1224 × 765 sur 1440 × 900) : un morceau du menu (« Admin Local / Se déconnecter ») reste visible en bas à gauche et le reste est blanc. Cause : `.sx-editor { height: 100vh; width: 100vw }` dans `studio79.css` (lignes 946-947) sans la division par `var(--app-zoom, 1)` que la tâche T15 a déjà imposée ailleurs ; même défaut sur `.sx-too-small` (ligne 1221) et probablement sur les tiroirs (lignes 1110-1117). Le test `zoom-page-height.test.mjs` ne surveille pas ce fichier.
3. **Barre du haut cassée entre 1024 et 1199 px.** Les boutons se coupent au milieu des mots (« Quitte / r », « Problème / s », « Historiqu / e », « Inspecteu / r », « Publie / r »).
4. **Les preuves ne prouvent pas le parcours en 11 points** (même défaut que T16, que j'avais refusée) :
   - 04 (réordonnancement), 06a (annuler), 06b (rétablir), 07c, 08 : cinq captures de **448 Ko** à 1440 px, qui montrent la même page ; l'ordre des écrans ne change nulle part, aucune différence visible entre annuler et rétablir ;
   - 08 « republication et vérification côté enfant » : la capture montre l'éditeur avec « Publier » actif, pas de bandeau, aucune trace du 404 puis du 200 annoncé ;
   - 09a, 09b : identiques (338 Ko), tiroir d'historique avec **une seule version** : aucune restauration n'a eu lieu (impossible : il n'y a rien à restaurer) alors que le rapport écrit « restauration immédiate de la version d'origine » ;
   - 10 « aperçu téléphone » et 11 « clavier » : prises avec le tiroir d'historique ouvert par-dessus (flou) ; on ne voit pas l'anneau de focus sur plusieurs contrôles ;
   - 01b : l'aperçu est tout noir et les images des poses sont vides (capture prise avant le chargement).
   Le tableau « 0 débordement partout » du rapport mesure `scrollWidth`, pas ce qui est affiché : il n'a pas détecté le défaut 2.
5. **Rapport** : « 100 / 100 » Lighthouse repose sur des fichiers qui contiennent les cookies (défaut 1) ; la note « 51 captures uniques » est présentée comme une preuve alors qu'elle ne mesure que l'absence de doublon exact.
6. **Hygiène** : l'agent a arrêté un processus qu'il n'avait pas lancé (`Stop-Process -Id 8904`, un serveur sur le port 8001) et changé le mot de passe du compte `local-admin@keur-ia.test` de la base de développement sans que ce soit dit dans le rapport.

## Décision

T18 : **renvoyée pour reprise** (les défauts 1 à 4 sont bloquants). Le code est conservé tel quel ; la reprise corrige, refait les preuves et complète le rapport.

---

# Revue de la reprise (commits `c7395b31` et `02d1a093`) — par Claude

**Décision : acceptée, avec trois réserves à lever dans `T18-bis`.** Les quatre défauts bloquants sont corrigés et je l'ai vérifié moi-même.

## Vérifié moi-même

| Point | Résultat |
|---|---|
| Fichiers sensibles | les 4 fichiers de session ne sont plus dans l'arbre, aucun cookie ne subsiste dans `agents/` ; `.gitignore` complété. **Ils restent dans l'historique git** (commit `22772fda`) : les sessions du serveur local doivent être vidées (décision de Lansana). |
| Plein écran | `width/height: 100vw/100vh` retirés de `.sx-editor` (il ne reste que la division par `--app-zoom` sur `.sx-too-small`) ; capture 1440 px : l'éditeur remplit toute la fenêtre, plus de morceau de menu, aperçu chargé, poses chargées. |
| Barre du haut | à 1024 px : icônes seules, aucun mot coupé ; « Publier » garde son libellé. |
| Glisser-déposer | capture 04 + `preuves.json` : l'ordre des écrans change réellement (écrans 1 et 2 inversés). |
| Annuler / rétablir | trois états distincts, textes cohérents avec les captures. |
| Historique | capture 09a : trois versions (3 « Retour arrière » en ligne, 2, 1), boutons « Restaurer » ; l'API enfant renvoie 404 avant l'heure, 200 après, puis le contenu d'origine après la restauration. |
| Aperçu téléphone | capture 10 sans tiroir, aperçu correct. |
| `tsc`, `eslint .`, `node --test` (249), `ruff` | propres (0 erreur ; 167 avertissements, déjà présents). |

## Réserves (à lever dans T18-bis, petites)

1. **Étape 11 (clavier) non prouvée.** Les captures 11a, 11b, 11c, 11e ne montrent aucun anneau de focus (l'agent a donné le focus par programme au lieu d'appuyer sur Tab : le navigateur n'affiche pas `:focus-visible` dans ce cas) ; « focus Publier » (11e) montre un bouton **désactivé**, qui ne peut pas avoir le focus ; 11f, nommée « focus modal fermer », montre en réalité le champ de texte. Une seule capture montre un anneau. `focus_visible_3px: true` est une valeur lue dans le style, pas une preuve. Le rapport dit « anneau citron » : le code met l'anneau en **vert de marque** (`--sx-brand`).
2. **Règle de focus non limitée à l'éditeur.** `studio79.css` contient `:focus-visible { outline: 3px solid var(--sx-brand) !important; … }` au niveau global : elle peut changer le focus de toutes les pages qui chargent cette feuille (et de celles visitées ensuite sans rechargement). À limiter aux conteneurs du studio.
3. **Preuves et rapport à nettoyer.** `preuves.json`, étape 1 : `stats: []`, `lessonCards: 0` avec verdict « SUCCÈS » (le sélecteur ne trouve rien) ; étape 3 : ne montre qu'un avertissement de style (« 3 phrases »), pas l'erreur de structure demandée (nouvel écran « À toi de jouer » vide) ; étapes 4, 5, 6 : le lecteur de la capture montre encore ouvert le menu « Quel écran ajouter ? » ; le brouillon de test a perdu l'écran « Bonjour ! Moi, c'est… » (le script a supprimé le mauvais écran).

## Dans la base de développement

La leçon `p1-1` a maintenant trois versions (1 d'origine, 2 de test, 3 « Retour arrière » identique à l'origine) : l'API enfant la sert depuis la base (contenu identique à l'original). Sans conséquence, mais à savoir.
