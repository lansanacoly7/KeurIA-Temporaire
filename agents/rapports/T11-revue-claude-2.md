# Revue Claude n°2 — T11 (reprise Antigravity, commit 3079927)

**Verdict : validé.** Les maquettes servent de spécification visuelle pour T9 et T10.

## Ce que j'ai vérifié (mesure indépendante, pas seulement le rapport)

Export de l'arbre du commit 3079927, Chrome headless (CDP), chaque page ouverte en 390×844 puis 1440×900.

| Contrôle | Résultat |
|---|---|
| `scrollWidth` à 390 px, 11 écrans + hub | 390 sur les 12 (aucun débordement horizontal de la page) |
| Barre latérale « bureau » à 390 px | masquée partout |
| Barre du bas à 390 px | présente partout (élève : 6 onglets ; enseignant : 4) |
| Tableaux larges (08 séance, 11 règles) | contenus dans un conteneur qui défile ; indication « faites glisser » visible |
| Bureau 1440 px | barre latérale visible, pas de barre du bas, aucun débordement |
| Fichiers touchés | uniquement `docs/maquettes/eleve-ecole/` et le rapport (aucun code applicatif) |
| Signature du commit | `Antigravity <antigravity@keuria.local>` (corrigé) |

Captures relues : 01 (Aujourd'hui), 08 (séance), 11 (règles de la classe) en 390 px : lisibles, cibles tactiles larges, onglet actif net.

## Remarques mineures (non bloquantes)

- Le rapport cite deux commits dont l'un « (reprise) » sans numéro : un seul commit a été poussé (3079927).
- La barre « T11 MAQUETTE » (sélecteur + Galerie + LISEZMOI) est un outil de démonstration qui se chevauche légèrement en 390 px : elle ne doit **pas** être reprise dans l'application.
- Le tableau de l'écran 11 montre seulement Lun/Mar sans défiler : normal, c'est la zone qui défile.

## Pour OpenCode (T9 et T10)

Reprendre la structure (en-tête compact, barre du bas, cartes, onglets de 56 px minimum), pas la barre de démonstration. Les maquettes ne sont pas du code de production : composants React et classes CSS du projet à écrire.
