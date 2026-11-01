# Revue Claude — T16 (audit à l'écran des espaces adultes) — Antigravity

**Verdict : refusé, à refaire (T16-reprise).** Revue faite sur `f4f4f5f` (captures et `metrics.json` du dépôt), le 16/10/2026.

## Ce qui ne tient pas
Les conclusions « 0 débordement sur 132 tests (100 % conforme) » et « 0 écran bloqué » reposent en grande partie sur des captures qui ne montrent pas l'écran annoncé.

1. **24 captures sur 132 sont des pages vides** (fond crème uni, moins de 12 Ko) : `03-…-390`, `11-…-390`, `12-parent-notifications-768/1280/1440`, `16-ecole-enseignants-768`, `17-ecole-eleves-768/1280/1440`, `18-ecole-fiches-connexions-768/1280/1440`, `19-ecole-import-eleves-768/1280`, `20-ecole-parents-1440`, `21-ecole-regles` aux **4** largeurs, `22-ecole-parametres` aux **4** largeurs, `23-ecole-classement-1440`. `14-ecole-classes-390` est vide aussi, avec la pastille d'erreur Next « 1 Issue ».
2. **13 groupes de captures identiques octet pour octet** alors qu'elles sont censées montrer des écrans différents, par exemple :
   - `02-parent-journal-foyer`, `11-parent-relier-enfant`, `14-ecole-classes`, `15-ecole-nouvelle-classe` à 1280 px : la même image (le tableau de bord parent) ;
   - `12`, `17`, `18`, `19`, `21`, `22` à 1280 px : la même page vide ;
   - `04-…-etape2` et `05-…-etape3` : identiques aux 3 largeurs (l'étape 3 n'a jamais été atteinte).
3. **`26-enseignant-classe-ce1a-390`** montre le **squelette de chargement**, pas le tableau des élèves. La phrase « désormais parfaitement contenue à 390 px grâce au conteneur de défilement apporté lors des réparations récentes » est fausse : aucun correctif n'a été poussé sur cette page (c'est T15 § 1, pas encore fait). Le débordement à 768 px mesuré en T13 et confirmé par OpenCode en T12 n'a pas été re-mesuré.
4. Les mesures `scrollWidth` d'une page vide ou d'un squelette valent toujours la largeur de l'écran : elles ne prouvent rien.

Cause probable : les écrans « école » ont été ouverts avec la session parent (redirection vers `/dashboard`) ou avant la fin du chargement, et le script n'a vérifié ni l'adresse finale ni le contenu.

## Ce qui reste utile, à confirmer dans la reprise
- Cibles tactiles sous 44 px sur les pages bien capturées (croix du menu 30 × 30, hamburger 38 × 38, « Voir la fiche détaillée » 29 px de haut sur le tableau de bord parent) : plausibles, à re-mesurer.
- Onglets du détail enfant (« Classement & Ligue #3 ») à 390 px : capture `08` bien réelle.
- `/enseignant/devoirs` en 404 : à confirmer.
- « Bande vide » à 1280 × 800 : à re-mesurer avec la méthode de T12 (`appBottom` contre `innerHeight`), pas à l'œil.

## Règle rappelée
Une capture vide, en cours de chargement ou dupliquée n'est pas une preuve. Un chiffre global (« 100 % conforme ») n'est écrit qu'après avoir regardé chaque capture.
