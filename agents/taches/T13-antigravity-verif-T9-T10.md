# T13 — Antigravity — vérification à l'écran de T9 (cahier de classe élève) et T10 (séances, annonces)

OpenCode a livré T9 (`agents/rapports/T9-opencode.md`) et T10 (`agents/rapports/T10-opencode.md`). Ton rôle : **vérifier dans un vrai navigateur** que ce qui est construit correspond à tes maquettes (`docs/maquettes/eleve-ecole/`) et fonctionne. Tu ne modifies pas le code de l'application.

## À faire
1. Lance l'application en local depuis ton clone à jour de `Dev_Lansana_Coly` (Django sur 8001, Next sur 3000 ; `manage.py migrate` d'abord). Les identifiants de test te sont donnés par Lansana (élève de CE1 A et son enseignante, base locale).
2. **Côté enseignant** (`/enseignant/classes/<id>`) : ouvrir une séance (titre, durée, leçon), la voir décompter, la terminer ; publier un mot, puis un sondage à 3 réponses ; voir les résultats ; changer le parcours d'un élève.
3. **Côté élève** (connexion élève) : la séance apparaît sur « Aujourd'hui » avec « Rejoindre » ; le mot et le sondage s'affichent ; répondre au sondage, changer d'avis ; les résultats n'apparaissent qu'après la réponse ; le menu réduit (Aujourd'hui, Mes devoirs, Mon parcours, Ma classe, Mes étoiles, Libre) ; le bandeau des règles (« qui a restreint quoi »).
4. Pour chaque écran, captures **390×844, 768×1024 et 1280×800**, et `document.documentElement.scrollWidth` mesuré (doit égaler la largeur).
5. Compare avec tes maquettes : liste précise des écarts (manquant, différent, cassé), du plus grave au moins grave, chacun avec sa capture.

## Livrable
`agents/rapports/T13-antigravity.md` + `agents/rapports/T13-captures/`. Aucune modification hors de ces deux chemins. Commits `--author="Antigravity <antigravity@keuria.local>"`, `[antigravity] … (T13)`, ligne `Agent: antigravity`, push sur `Dev_Lansana_Coly` uniquement.
