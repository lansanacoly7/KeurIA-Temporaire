# T16 — Antigravity — audit à l'écran des espaces adultes (parent, direction d'école, enseignant)

Même méthode que T13 (vrai navigateur, captures, `scrollWidth` mesuré), mais sur les espaces **adultes**, page par page. Tu ne modifies pas le code de l'application.

## Périmètre
- **Parent** (`/dashboard` avec un compte parent) : Journal du Foyer, fenêtre « Inscrire un enfant » (3 étapes + fenêtre des codes), Carnets d'Explorateurs (tous les onglets), Équilibre & Sérénité (toutes les sections), « Relier mon enfant », cloche des notifications. Plus l'inscription parent sur `/connexion` (onglet « Créer mon compte »).
- **Direction d'école** (`/ecole/*`) : tableau de bord, classes (+ fenêtre « Nouvelle classe »), enseignants, élèves, fiches & connexions (+ import), parents, règles, paramètres, classement.
- **Enseignant** (`/enseignant/*`) : vue d'ensemble, mes classes, programme (+ une fiche de leçon), missions & devoirs (+ fenêtre « Assigner »), classement, analytiques, paramètres.

## Pour chaque écran
1. Captures **390×844, 768×1024, 1280×800 et 1440×900**.
2. `document.documentElement.scrollWidth` mesuré à chaque largeur.
3. Défauts visibles, du plus grave au moins grave : débordement, texte coupé ou passé à la ligne au mauvais endroit (ex. un bouton « Mèr / e »), éléments qui se chevauchent, cibles tactiles < 44 px sur téléphone, contraste insuffisant, bande vide sous le contenu sur ordinateur portable (zoom 85 %), écran de chargement qui ne se termine pas.

Comptes de test : demande-les à Lansana (base locale) ; parent de démonstration `parent.test@keuria.test`, direction `demo.ecole@keuria.test`, enseignante `khady.faye@example.com`.

## Livrable
`agents/rapports/T16-antigravity.md` (tableau écran × largeur avec `scrollWidth`, puis la liste des défauts avec capture et fichier probable) + `agents/rapports/T16-captures/`. Commits `--author="Antigravity <antigravity@keuria.local>"`, `[antigravity] … (T16)`, `Agent: antigravity`, push sur `Dev_Lansana_Coly` uniquement.
