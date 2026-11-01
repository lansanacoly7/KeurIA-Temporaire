# T2 — Antigravity — Audit Lighthouse mobile + accessibilité, corrections simples

(Issue GitHub n° 2, copie ici.)

Mesurer pour la première fois performances et accessibilité. Avec Lighthouse (mobile), mesure `/`, `/connexion`, `/school/les-baobabs` et le tableau de bord enfant 7-9. Note les scores (Performance, Accessibilité, Bonnes pratiques) et les 10 problèmes les plus graves. Corrige ce qui est purement CSS/HTML (contrastes, tailles de cibles tactiles, `alt`, ordre de focus, `lang`, titres), sans toucher à la logique.

**Objectif** (CHECKLIST_PROD) : Accessibilité ≥ 90 et Performance ≥ 80 sur `/connexion` (mobile).
**Périmètre** : CSS (`frontend/app/**/styles/`, `school/school-space.css`), balisage des pages concernées ; rapport `docs/LIGHTHOUSE_2026-10.md`.
**Attendu** : `agents/rapports/T2-antigravity.md` (scores avant/après, liste des corrections). Commits `[antigravity] ... (T2)`.