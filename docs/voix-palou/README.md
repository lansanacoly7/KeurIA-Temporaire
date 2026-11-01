# Voix officielle de Palou : leçons du parcours 7-9

**Méthode retenue : leçon par leçon, toutes les vagues ensemble.** À chaque étape, on enregistre tout ce qui manque pour une leçon (histoire, jeux, explications), puis on passe à la suivante. Le lecteur est branché sur les 3 vagues : ce qui n'est pas encore enregistré reste lu par la voix du navigateur, donc rien ne casse en route.

| Vague | Ce que Palou dit | Fichiers |
|---|---|---|
| **1 · première version** | L'histoire : récits, mot découverte, « Je retiens », félicitations de fin (+ 4 phrases communes de fin de leçon) | **227** (≈ 21 à 25 par module) |
| 2 | Les jeux : consignes, bravos, écrans d'activité | 359 |
| 3 | Les explications après une erreur, petites phrases communes | 292 |

## Comment travailler
1. Ouvrir le dossier du module (`m01-p1/`, `m02-p2/`…) puis le fichier de la leçon (`p1-1.csv`…). Une ligne = un fichier audio ; les lignes de la **vague 1** sont en haut.
2. Générer chaque phrase de la colonne **`texte_a_generer`** avec la voix de Palou (`texte` est le texte affiché ; `texte_a_generer` ajoute les prononciations : « IA » → « I A », « Baye » → « Baï », « Mme » → « Madame »… à ajuster si la voix officielle lit mal un mot).
3. Enregistrer en **MP3** (mono, 24 kHz ou plus), au **nom et à l'endroit** indiqués dans `fichier_a_deposer` (ex. `frontend/public/audio/palou/lecons/m01/p1-1/p1-1_e01.mp3`).
4. Suivre l'avancement dans `_recapitulatif.csv` (fichiers par leçon et par vague).

## Ordre conseillé
- **Vague 1 du module 1 d'abord (21 fichiers)** : c'est de quoi tester le branchement dans le lecteur avec de vrais fichiers.
- Puis la vague 1 des autres modules, puis la vague 2, puis la vague 3.
- Un texte définitif **avant** de générer : si un texte change, son fichier de voix doit être refait.
- Les phrases communes sont dans `commun.csv` (4 en vague 1, 3 en vague 3).

## Noms de fichiers
`<leçon>_e03` = texte de l'écran 3 · `_e07-bravo` = félicitations de fin · `_e07-retiens` = « Je retiens » · `_e05-m1-q` = consigne de la manche 1 · `_e05-m1-ok` = bravo de la manche 1 · `_e05-m1-o2` = explication de l'option 2 (mauvaise réponse) · `_e05-m1-i3` = explication de l'objet 3 à ranger.

## Ce qui n'est jamais enregistré
- Le **prénom de l'enfant** : « Bravo {prénom} ! » est enregistré sans prénom (le lecteur fait déjà la même chose quand il n'y a pas de prénom).
- Les **mots wolof** (pastilles de la leçon) : ils ne sont pas lus par la voix.

## Régénérer les listes
Si les textes des leçons changent : `venv\Scripts\python.exe scripts\export_voice79.py` (ou `… export_voice79.py m03` pour un seul module).
