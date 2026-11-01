# Comment les trois agents travaillent ensemble

## Le lien entre les agents : les issues GitHub

Chaque tâche est une **issue** du dépôt (https://github.com/issabathily/keuria-v2/issues), avec une étiquette :

| Étiquette | Pour qui |
|---|---|
| `agent:antigravity` | Antigravity : images, vérification visuelle dans un vrai navigateur, Lighthouse, mobile |
| `agent:opencode` | OpenCode : code (fonctionnalités, nettoyage, tests) |
| `agent:claude` | Claude : revue, sécurité, CI, déblocage |
| `à vérifier` | Un agent a fini : Claude relit avant de fermer |

Cycle d'une tâche :
1. L'agent prend une issue à son nom (il commente « je commence »).
2. Il travaille **dans son propre dossier** (voir plus bas), sur `Dev_Lansana_Coly`, avec ses commits signés (`docs/REGLES_AGENTS.md`).
3. Il commente l'issue (commits, ce qu'il a vérifié) et ajoute l'étiquette `à vérifier`.
4. Claude relit les commits, relance les contrôles et la CI, commente, puis ferme l'issue ou la renvoie avec des remarques.

Un agent bloqué ou qui sort de son rôle ouvre une nouvelle issue étiquetée `agent:claude` (ou celle de l'agent concerné) au lieu d'attendre.

## Agents sans accès à GitHub (OpenCode)

OpenCode ne peut ni lire les issues ni y écrire. Le lien passe par des fichiers : gents/taches/ (la tâche complète, écrite par Claude) et gents/rapports/ (le compte rendu de l'agent, puis la décision de Claude). Voir gents/README.md.

## Un dossier de travail par agent

Pour ne pas se marcher dessus (une seule branche active par dossier), chaque agent a un clone séparé, déjà sur la branche `Dev_Lansana_Coly` :

| Agent | Dossier |
|---|---|
| Lansana / Claude | `KerIA/` (dossier principal) |
| Antigravity | `KerIA-agents/antigravity/` |
| OpenCode | `KerIA-agents/opencode/` |

Dans son clone, on ne change jamais de branche et on ne touche pas aux autres dossiers. Pour lancer le site depuis un clone : `cd frontend && npm ci && npm run dev`
(Django utilise le `venv` du dossier principal : `..\..\KerIA\venv\Scripts\python.exe`). Mettre à jour son clone : `git fetch` puis intégrer `origin/Dev_Lansana_Coly`.

## Tâches en cours

Voir les issues #1 à #6 :
- #1 Vérifier à l'écran le découpage des CSS (Antigravity)
- #2 Audit Lighthouse mobile et accessibilité (Antigravity)
- #3 Terminer et intégrer le travail « mobile responsiveness » (Antigravity)
- #4 Tableau de bord enseignant : « Élèves bloqués » par leçon (OpenCode)
- #5 Supprimer le CSS et le code morts de la vue « Carte » et du carnet (OpenCode)
- #6 Relire et valider le travail des deux autres agents (Claude)

## Studio 7-9 — tâches ouvertes (2026-10-17)

Référence : `docs/STUDIO79.md`. Fichiers de tâche dans `agents/taches/`.

| Tâche | Agent | Contenu | État |
|---|---|---|---|
| T17 | OpenCode | lecteur enfant qui lit le contenu publié, `import_content79`, `check_parcours79 --db`, limites de débit, `schema.yml`, tests, vérification à l'écran de la validation des parents | à donner |
| T18 | Antigravity | éditeur de leçon (`LessonEditor`, `PublishPanel`, historique, accueil `StudioHome`, `studio79.css`), menu, parcours de vérification en 11 points | à donner |
| T19 | OpenCode | mise en page par écran : position de l'image (haut, bas, gauche, droite), taille du texte, boutons ; nouveau contenu `layout` dans `types.ts`, `LessonPlayer79`, validateur serveur, champs du studio | après T17 |
| T20 | OpenCode | nouveaux blocs : vidéo (lien YouTube/Vimeo et petit fichier), lien, bouton ; nouvel écran « média » dans le lecteur, le validateur et le studio | après T19 |
| T21 | Antigravity | création de nouvelles leçons et de nouveaux modules depuis le studio (modèles), suppression/réordonnancement, vérification visuelle | après T18 |
| T22 | OpenCode + Antigravity | studios des devoirs (missions), jeux et défis du jour : même cycle brouillon / publication différée / historique | après T21 |
| T23 | OpenCode | gestion des médias (utilisation, suppression des médias inutilisés, recherche) et relecture en commentaires | après T22 |

### Changement d'équipe (2026-10-18)

**OpenCode ne travaille plus sur le projet** (décision de Lansana : trop lent). Reste : Antigravity (interface, vérification dans un vrai navigateur) et Claude (code serveur et lecteur, revue).
Ses parties A, B et C de T17 sont commitées et relues (`c0838f86`, `7cc8e5d1`, `d58dbe14`) ; la partie D (vérification à l'écran de la validation des parents) passe à Antigravity (`T17-D`). Les tâches ci-dessus attribuées à OpenCode passent à Claude :

| Tâche | Qui désormais |
|---|---|
| T18-bis (réserves de T18) | Antigravity |
| T17-D (vérifier la validation des parents) | Antigravity |
| T19 mise en page par écran (données, lecteur, validateur, commandes du studio) | Antigravity (gents/taches/T19-antigravity-mise-en-page.md, après T17-D) |
| T20 nouveaux blocs (vidéo, lien, bouton) | Claude (lecteur, serveur), Antigravity (studio) |
| T22, T23 | Claude et Antigravity, selon la nature du travail |
