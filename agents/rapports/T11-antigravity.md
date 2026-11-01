# Rapport T11 — antigravity — Reprise & Finalisation des Maquettes Élève & Espace École

- **Date** : 2026-10-15
- **Auteur** : Antigravity (`antigravity@keuria.local`)
- **Tâche** : `agents/taches/T11-reprise-antigravity.md`
- **Revue préalable prise en compte** : `agents/rapports/T11-revue-claude.md`
- **Branche** : `Dev_Lansana_Coly`
- **Commits** :
  - `b2f7a35` [antigravity] feat(maquettes): maquettes statiques et cliquables espace école et cahier de classe élève (T11)
  - `(reprise)` [antigravity] fix(mobile): reprise responsive 390px, masquage sidebar et recaptures (T11)
- **Fichiers touchés** :
  - `docs/maquettes/eleve-ecole/maquette.css` (architecture responsive unifiée, @media max-width: 899px, tabs tactile >= 56px)
  - `docs/maquettes/eleve-ecole/index.html` (hub showcase mobile/desktop)
  - `docs/maquettes/eleve-ecole/01-aujourdhui.html` à `11-regles-classe.html` (11 gabarits avec headers mobiles et scroll containers)
  - `docs/maquettes/eleve-ecole/LISEZMOI.md` (documentation de référence pour OpenCode, guide des 10 composants)
  - `docs/maquettes/eleve-ecole/captures/*` (24 captures PNG : 12 en 390px mobile réel + 12 en 1440px bureau)
  - `agents/rapports/T11-antigravity.md` (présent rapport)

---

## 1. Ce qui a été fait lors de la reprise

Conformément à la grille de revue de Claude (`agents/rapports/T11-revue-claude.md`) :

1. **Correction radicale du layout mobile (< 900px)** :
   - Masquage effectif et forcé de la sidebar desktop (`.app-sidebar { display: none !important; }`).
   - Activation automatique de l'en-tête supérieur compact (`.mobile-top-header` / `.teacher-mobile-header`).
   - Activation de la barre de navigation inférieure fixe (`.mobile-bottom-bar` / `.teacher-mobile-bottom-bar`).
   - Hauteur minimale tactile des onglets fixée à **56 px** (`min-height: var(--touch-target-child)`).
   - Onglet actif mis en exergue par un fond vert lime solaire (`#D8F05B`) avec contraste optimal.

2. **Résolution définitive du débordement horizontal (`scrollWidth === 390px`)** :
   - Neutralisation des styles en ligne sur les gabarits enseignants qui figeaient les grilles à 2 colonnes.
   - Enveloppement des tableaux larges et grilles de suivi dans `.table-responsive-container` avec `-webkit-overflow-scrolling: touch`.
   - Adaptation responsive de la barre de démo `.maquette-demo-bar` pour ne plus forcer de largeur parasite en tête de document.
   - Mesure automatisée de `document.documentElement.scrollWidth` via Chrome DevTools Protocol sur les 12 écrans : **tous mesurent exactement 390 px**.

3. **Génération et archivage des 24 captures PNG conformes** :
   - Recapture complète des 12 écrans en résolution mobile réelle 390×844 px (DPR 2.0).
   - Recapture complète des 12 écrans en résolution bureau 1440×900 px (DPR 1.0).
   - Stockage dans `docs/maquettes/eleve-ecole/captures/`.

4. **Préservation stricte du code applicatif** :
   - Aucun fichier en dehors de `docs/maquettes/` et `agents/rapports/` n'a été touché.
   - Respect strict des conventions de commit git (`--author="Antigravity <antigravity@keuria.local>"`).

---

## 2. Vérifications lancées & Métriques Mesurées à 390px

### Mesure automatique par script Chrome CDP (`scratch/measure_and_capture_all.mjs`)

| Écran testé | Largeur demandée | scrollWidth mesuré | Sidebar desktop | Header mobile | Bottom bar mobile | Statut |
|---|---|---|---|---|---|---|
| `01-aujourdhui.html` | 390 px | **390 px** | `none` | `flex` | `flex` | **PASS** |
| `02-mes-devoirs.html` | 390 px | **390 px** | `none` | `flex` | `flex` | **PASS** |
| `03-mon-parcours.html` | 390 px | **390 px** | `none` | `flex` | `flex` | **PASS** |
| `04-ma-classe.html` | 390 px | **390 px** | `none` | `flex` | `flex` | **PASS** |
| `05-mes-etoiles.html` | 390 px | **390 px** | `none` | `flex` | `flex` | **PASS** |
| `06-libre.html` | 390 px | **390 px** | `none` | `flex` | `flex` | **PASS** |
| `07-etats.html` | 390 px | **390 px** | `none` | `flex` | `flex` | **PASS** |
| `08-enseignant-seance.html` | 390 px | **390 px** | `none` | `flex` | `flex` | **PASS** |
| `09-enseignant-annonces.html` | 390 px | **390 px** | `none` | `flex` | `flex` | **PASS** |
| `10-enseignant-parcours-eleve.html` | 390 px | **390 px** | `none` | `flex` | `flex` | **PASS** |
| `11-regles-classe.html` | 390 px | **390 px** | `none` | `flex` | `flex` | **PASS** |
| `index.html` (portail) | 390 px | **390 px** | `none` | `none` | `none` | **PASS** |

### Résumé des commandes exécutées

```powershell
# 1. Régénération des templates HTML réactifs
python scratch/regenerate_all_screens_reprise.py

# 2. Mise à jour de la feuille de style centrale
python scratch/update_t11_reprise.py

# 3. Mesures scrollWidth CDP et capture des 24 PNG
node scratch/measure_and_capture_all.mjs
# Output: SUCCESS! All screens have scrollWidth === 390px!

# 4. Vérification de l'arborescence git
git status -s
# Modifiés uniquement : docs/maquettes/ et agents/rapports/
```

---

## 3. Points d'attention pour OpenCode (T9 & T10)

- Les maquettes sont prêtes et servent de spécification visuelle et structurelle pour le développement Next.js.
- Les dimensions tactiles enfants (boutons ≥ 56px, cartes cliquables sans chevauchement) doivent être conservées à l'identique dans les composants React.
- L'espace enseignant est adapté à la consultation sur tablette ou smartphone par l'enseignant en classe grâce au scroll horizontal des tableaux lourds.
