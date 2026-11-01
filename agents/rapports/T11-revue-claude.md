# Revue T11 (Antigravity) : À REPRENDRE (version téléphone)

Commits `c9ed379` et `a1880ff`. Contenu : 11 maquettes + hub, 24 captures, uniquement dans `docs/maquettes/` et `agents/rapports/`, aucune ressource externe (rien à télécharger), pas de code d'application touché. Le design 1440 px est bon (j'ai regardé « Règles de la classe » : grille de créneaux jours/heures, interrupteurs, phrase « ce que voit l'élève » : conforme).

**Mais les captures 390 px montrent que la version téléphone n'existe pas** (j'ai ouvert `01-aujourdhui-390.png` et `06-libre-390.png`) :
1. La **barre latérale du bureau reste affichée** (≈ 370 px de large) et le contenu est poussé à droite, **coupé et débordant** : on ne voit que la moitié de chaque carte. Le critère de la tâche était « version 390 px (téléphone/tablette de classe) » avec menu en **barre du bas** sur téléphone.
2. L'avatar, le nom de l'élève et les étoiles se retrouvent en bas de la barre latérale, écrasés (« Moussa · CE1 A », « Mme Faye · Baobabs » sur 4 lignes).
3. Les 12 écrans 390 px sont donc à refaire ; les maquettes ne peuvent pas servir de référence à OpenCode pour mobile tant que ce n'est pas corrigé.

Auteur des commits : `godussop7 <lassrmg07@gmail.com>` au lieu de `Antigravity <antigravity@keuria.local>` (le préfixe `[antigravity]` du message est bon, mais l'auteur ne l'est pas : `--author` obligatoire).

Reprise : `agents/taches/T11-reprise-antigravity.md`.