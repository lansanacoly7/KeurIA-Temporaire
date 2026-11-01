# T11 (reprise) — Antigravity — version téléphone des maquettes

Lis `agents/rapports/T11-revue-claude.md`. À faire :
1. **Mise en page responsive réelle** dans `docs/maquettes/eleve-ecole/maquette.css` : en dessous de 900 px, la barre latérale disparaît et le menu devient une **barre du bas** (6 icônes + libellés courts, cibles ≥ 56 px, l'onglet actif en lime) ; l'en-tête (avatar, prénom, classe, étoiles) passe en haut de la page, sur une ou deux lignes ; le contenu prend toute la largeur (aucun défilement horizontal).
2. Reprends les **12 captures 390 px** (vraie fenêtre de 390 px, pas un simulateur dans une page large) : contrôle que `document.documentElement.scrollWidth` vaut 390 sur chaque page et écris-le dans le rapport.
3. Espace enseignant (écrans 08 à 11) : sur 390 px, le tableau de créneaux de « Règles de la classe » doit rester utilisable (défilement interne du tableau ou une carte par jour).
4. Signe tes commits avec `--author="Antigravity <antigravity@keuria.local>"`, message `[antigravity] ... (T11)`, ligne `Agent: antigravity`.
Rapport `agents/rapports/T11-antigravity.md` mis à jour (vrais commits, les 12 mesures `scrollWidth`).
