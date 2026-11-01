# T10 — OpenCode — Espace enseignant : séances, annonces et sondages, parcours d'un élève

T8 (backend) est **prêt** : routes décrites dans `docs/ECOLE_ELEVE_CONCEPTION.md` section 9. Contenu (voir section 8) :
1. Dans une classe : bouton **« Ouvrir une séance »** (leçon ou activité + durée), séance en cours avec temps restant et bouton « Terminer ».
2. **Annonces** : publier un mot ou un **sondage** (2 à 5 réponses, date de fin), voir les résultats (compteurs + qui a répondu), clore ; au plus 3 annonces actives.
3. Fiche élève : **changer son parcours** (par défaut celui du niveau de la classe).
Style : composants existants de l'espace enseignant. Tests de la logique, tsc, lint, CI verte, captures. Rapport `agents/rapports/T10-opencode.md`. Commits `[opencode] ... (T10)`.
