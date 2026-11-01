# Rapport T5 — opencode — suppression du CSS mort (carte/carnet, écrans d'école) — reprise

- Date : 2026-10-15
- Commits :
  - `f1225bd` [opencode] chore(T5): suppression des regles CSS inutilisees parcours79 (T5) — 176 lignes de CSS mort (11 classes) + tests
  - `c25b61d` [opencode] réserves T5: suppression des règles .p79-hero* mortes et de l'ancienne page publique d'école (T5) — les 3 réserves de la revue
- Fichiers touchés par la reprise (commit `c25b61d`) :
  - `frontend/app/responsive.css` (−5)
  - `frontend/app/dashboard/parcours79/styles/01-parcours-7-9-ans-carte-des-iles-fenetre.css` (−1)
  - `frontend/app/dashboard/parcours79/styles/02-palou-compagnon-sur-la-carte-taille-prop.css` (−1)
  - `frontend/app/globals.css` (−3 blocs, diff réel : `git diff --numstat` → 3/3)
  - `agents/rapports/T5-captures/` (4 captures avant/après)

## Réponse aux 3 réserves de la revue

### Réserve 1 — règles `.p79-hero*` inutilisées : SUPPRIMÉES

Commande de recherche (exécutée après suppression, `frontend/`), pour chaque règle :

```powershell
Get-ChildItem app -Recurse -Include *.tsx,*.ts,*.mjs | Select-String -Pattern "p79-hero"     # code
Get-ChildItem app -Recurse -Include *.css       | Select-String -Pattern "p79-hero"         # CSS restant
```

| Règle | Fichier d'origine | Avant (code .tsx/.ts/.mjs) | Après (code) | Après (.css restant) |
|---|---|---|---|---|
| `.p79-hero { flex-wrap: wrap; }` | `app/responsive.css` | **0 hit** | 0 | 0 |
| `.p79-hero-bubble { … }` | `app/responsive.css` | **0 hit** | 0 | 0 |
| `.p79-hero-text { … }` | `app/responsive.css` | **0 hit** | 0 | 0 |
| `.p79-hero-palou { … }` | `app/responsive.css` | **0 hit** | 0 | 0 |
| `.p79 .p79-hero-text { font-size: 21px; }` | `styles/01-parcours-7-9-ans-carte-des-iles-fenetre.css:27` | **0 hit** | 0 | 0 |
| `.p79-hero-palou { width: 120px; }` | `styles/02-palou-compagnon-sur-la-carte-taille-prop.css:18` | **0 hit** | 0 | 0 |

Recherche avant suppression (sur le commit `f1225bd`, la revue avait déjà noté « aucune utilisation ») :

```powershell
Get-ChildItem app -Recurse -Include *.tsx,*.ts,*.mjs | Select-String -Pattern "p79-hero"
# -> (aucun résultat)
```

Aussi supprimé : le commentaire orphelin `/* « On continue ? » (carte des modules) : la bulle de Palou passe sous lui… */`
de `responsive.css` qui ne décrivait plus rien (le bloc `@media (max-width: 760px)` conserve les
règles `#ki-stats`, `.gm-stats` et `.game-map`, inchangées).

### Réserve 2 — anciennes règles de la page publique d'école dans `globals.css` : SUPPRIMÉES

La page `/school/[slug]` a été réécrite en classes `ss-*` dans `app/school/school-space.css`
(importée par `app/school/[slug]/page.tsx:5`) ; les anciennes règles `.school-*` de `globals.css`
ne sont plus référencées nulle part.

Commande de recherche exécutée, classe par classe :

```powershell
$classes = @("\.school-space\b","\.school-login\b","\.school-hero\b","\.school-hero-art",
              "\.school-tracks\b","\.school-track-grid","\.school-not-found")
foreach ($c in $classes) {
  $tsx = @(Get-ChildItem app -Recurse -Include *.tsx,*.ts,*.mjs | Select-String -Pattern $c)
  $css = @(Get-ChildItem app -Recurse -Include *.css            | Select-String -Pattern $c)
  "$c -> .tsx/.ts/.mjs: $($tsx.Count) | .css: $($css.Count)"
}
```

| Règle (famille) | Avant (code) | Après (code) | Après (.css restant) |
|---|---|---|---|
| `.school-space` (+ `>header`, `>header>a/div/small/strong`, `>footer`, `>footer small`) | 0 hit | 0 | 0 |
| `.school-login` | 0 hit | 0 | 0 |
| `.school-hero` (+ `>div>span`, `h1`, `p`, `a`, media 1000px et 700px) | 0 hit | 0 | 0 |
| `.school-hero-art` (+ `>span`, `i`, `b`, `em`) | 0 hit | 0 | 0 |
| `.school-tracks` (+ `>div`, `h2`, `small`, `p`) | 0 hit | 0 | 0 |
| `.school-track-grid` (+ `a`, `h3`, `p`, `b`) | 0 hit | 0 | 0 |
| `.school-not-found` (+ `>span`, `h1`, `p`, `a`) | 0 hit | 0 | 0 |

Note : la seule occurrence de `school-space` dans le code est l'**import de fichier**
`import "../school-space.css"` (`app/school/[slug]/page.tsx:5`) — un autre fichier, qui définit
les classes `ss-*` utilisées par la page : ce n'est pas la classe `.school-space` supprimée.

**Ce qui est conservé dans `globals.css` (encore utilisés, vérifiés par la même commande) :**

| Règle conservée | Utilisée dans |
|---|---|
| `.school-branded …` | `app/dashboard/useDashboardState.tsx:657` |
| `.school-dashboard-banner …` | `app/dashboard/sections/ParentLinkBanner.tsx:22` |
| `.school-form …` | `app/admin/_components/SchoolsView.tsx:116,120` |
| `.school-admin-*`, `.school-card-*`, `.school-swatches`, `.color-fields`, `.school-live-preview`, `.school-empty` | 0 hit — **hors périmètre de la tâche** (ancien bloc admin, non listé dans la revue) : non supprimés, réserves signalées ici |

### Réserve 3 — rapport (vrais numéros de commit, commandes, captures) : CORRIGÉ

Ce document remplace la version « pending » : numéros de commit réels, commande de recherche +
résultat pour chaque règle supprimée (tableaux ci-dessus), captures avant/après ci-dessous.

## Vérifications lancées (après réserves)

| Commande | Résultat |
|---|---|
| `npm run typecheck` | 0 erreur |
| `npm run lint` | 0 erreur (160 warnings préexistants) |
| `NODE_ENV=test npm test` | 175 tests verts — dont `css-split.test.mjs` (équilibre des accolades des morceaux CSS : `globals.css` 1396/1396, `responsive.css` équilibré) |
| `git diff --numstat` | diffs minimaux : responsive.css 0/5, styles 0/1 + 0/1, globals.css 3/3 (aucune conversion de fins de ligne — vérifiée, le fichier conserve ses `\r\n`) |

## Captures avant/après (`agents/rapports/T5-captures/`)

Prises avec Chrome headless (CDP) sur `http://localhost:3100` (jamais `127.0.0.1` — piège déjà signalé en T4/T6).

| Écran | Avant | Après | Résultat |
|---|---|---|---|
| Page publique d'école `/school/les-baobabs` (règles `.school-hero*`/`.school-tracks*`/`.school-login`/`.school-not-found*` supprimées) | `avant-ecole-publique.png` | `apres-ecole-publique.png` | **SHA256 identique** : `AA8B94A9C7562C3348198EBA8D9A6A6F18D8CDEE751076C72E76415DAD9374DD` pour les deux → pixel à pixel identique, rien de cassé |
| Carte du parcours 7-9 `/dashboard/modules` (« L'île des Petits Explorateurs », règles `.p79-hero*` supprimées) | `avant-parcours79.png` | `apres-parcours79.png` | Les deux écrans sont identiques visuellement (hors confettis animés en vol, qui changent à chaque rendu) : titre, album d'autocollants, 10 îles, barre « Île 1 sur 10 », Palou inchangés |

Méthode de la capture « avant » du parcours : `git stash push` des 4 fichiers CSS → capture →
`git stash pop` → capture « après », même compte élève (`pape.kane@les-baobabs.keuria.sn`, mot de
passe démo réinitialisé dans la base locale de dev pour l'occasion), modale trophée refermée via le
script CDP avant chaque capture pour que les deux images soient comparables.

## Points d'attention / réserves ouvertes

- Les classes du **bloc admin** de `globals.css` (`.school-admin-shortcut`, `.school-admin-grid`,
  `.school-card-*`, `.school-swatches`, `.color-fields`, `.school-live-preview`, `.school-empty`)
  sont également à **0 hit** dans le code. Elles ne font pas partie des familles listées dans la
  revue T5 (qui vise l'ancienne page publique) : **non supprimées ici**, à traiter dans une tâche
  dédiée si souhaité (`.school-form`, elle, est encore utilisée → bloc à découper si on va plus loin).
- Comme T4/T6 : commits **non signés GPG** (aucune clé secrète sur la machine ; les commits
  antérieurs le sont aussi non). Auteur : `OpenCode <opencode@keuria.local>`.
