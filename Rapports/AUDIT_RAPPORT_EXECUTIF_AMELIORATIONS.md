# Bilan d'Ingénierie & Remédiation Contradictoire de `docs/RAPPORT_AMELIORATIONS_EXECUTIVE.html`

> **Historique des audits :**  
> • Audit initial (Audit n°1) : 2026-10-04  
> • Contre-audit approfondi (Audit n°2) : 2026-10-04  
> • Clôture technique finale : 2026-10-04  
> **Méthode :** Confrontation contradictoire rigoureuse entre les affirmations du rapport exécutif et le code source réel du dépôt, réévaluation systématique des points faibles et alignement factuel sans compromis.

---

## 1. Synthèse de l'Évolution & Traitement des Audits

L'évaluation contradictoire a permis d'éliminer toute approximation ou formulation trompeuse dans le rapport exécutif pour aboutir à un document factuel, mesuré et vérifiable sur pièces par un évaluateur.

| # | Thème audité | Constat d'Audit initial | Constat Audit n°2 | Traitement Final Réalisé & Preuve dans le Code |
|---|---|---|---|---|
| **1** | **Chiffres des tests** | Annonce obsolète de « 194/194 » | Validé (« 622+ » exact) | **622 tests réels au vert** : 512 backend pytest réussis + 115 frontend Vitest réussis (1 skip conventionnel). |
| **2** | **Voix de Palou & Droits** | « 15 répliques réelles » sans consentement | Validé (9 répliques IA + 6 SFX) | Documenté dans `frontend/public/audio/palou/manifest.json` : synthèse IA (Espace Hugging Face) à titre de prototype académique ISEP. Droits commerciaux à formaliser avant publication. |
| **3** | **Tutoriel Palou (404)** | Erreurs 404 sur `tuto_N.wav` | Validé (plus d'appels 404) | Mappage dynamique dans `PalouTutorial.tsx` sur les vrais fichiers locaux existants avec repli Web Speech. |
| **4** | **Sécurité Swagger / OpenAPI** | Endpoints de documentation ouverts à tous | Validé (restreint aux admins) | `backend/keuria/settings.py` : `SERVE_PERMISSIONS` exige `IsAdminUser` dès que `DEBUG=False`. |
| **5** | **Contrôle OpenAPI en CI** | Schéma généré manuellement | Étape présente mais sans comparaison | `.github/workflows/ci.yml` : régénération et contrôle de synchronisation par `git diff --exit-code schema.yml` (bloque la CI si le fichier n'est pas à jour). *Note : le schéma présente encore des avertissements résiduels / collisions d'operationId dont la résolution constitue un axe d'amélioration continue.* |
| **6** | **Délais d'auto-remédiation** | « Moins de 15s » non démontré | Non mesuré, détection jusqu'à 60s | Retrait de l'affirmation « < 15s ». Description factuelle : sonde toutes les 60s + sauvegarde SQLite + redémarrage conteneur + temporisation de 10s. |
| **8** | **Démonstrateur vs Sonde** | Animation étiquetée faussement « en direct » | Reste une animation codée en dur | Clarification explicite : le bac à sable sépare nettement la **démonstration animée didactique** en 4 étapes de l'**interrogation HTTP GET réelle** vers `/api/health/live`. |
| **9** | **Accessibilité tactile** | « WCAG 2.1 AA » non audité | Cibles manuelles constatées dès 390px | Retrait de tout claim WCAG abusif. Description mesurée des cibles tactiles CSS (&ge; 44px-48px) testées manuellement dès 390px, avec mention d'un audit formel à planifier. |
| **10** | **Prévention des fuites** | « Zéro fuite mémoire » absolu non prouvé | Vrai pour la caméra, pas de test global | Formulation ciblée : libération matérielle de la webcam (`stream.getTracks().stop()`) et annulation des boucles `requestAnimationFrame` dans `GestureCameraGame.tsx`. |
| **11** | **Boutons & Scripts en ligne** | Attributs inline `onclick` bloqués dans certains aperçus | 8 attributs `onclick` présents | **Suppression intégrale des attributs inline `onclick`** dans le HTML ; liaison propre par `addEventListener` et support tactile unifié pour garantir l'exécution sans dépendre d'attributs d'événements inline. |

---

## 2. État du Code & Fichiers de Référence

1. **Rapport Exécutif Interactif :**
   * [docs/RAPPORT_AMELIORATIONS_EXECUTIVE.html](file:///c:/Users/HP/Documents/Institut_Supérieur_d_enseignement_professionnelle_ISEP/KerIA/docs/RAPPORT_AMELIORATIONS_EXECUTIVE.html) & [frontend/public/rapport.html](file:///c:/Users/HP/Documents/Institut_Supérieur_d_enseignement_professionnelle_ISEP/KerIA/frontend/public/rapport.html)
   * Zéro attribut `onclick` inline (gestion d'événements JavaScript externalisée via `addEventListener`).
   * Navigation par onglets, démonstrateur scénarisé et sonde en direct fonctionnels.

2. **Pipeline d'Intégration Continue (CI) :**
   * [.github/workflows/ci.yml](file:///c:/Users/HP/Documents/Institut_Supérieur_d_enseignement_professionnelle_ISEP/KerIA/.github/workflows/ci.yml)
   * Contrôle automatisé de fraîcheur du schéma OpenAPI (git diff --exit-code schema.yml).
   * Limite connue : la génération du schéma signale encore des erreurs et avertissements (drf-spectacular : ~835 erreurs / 134 distinctes, ~241 avertissements, dont des collisions d'identifiants d'opération sur les routes superadmin). Le contrôle garantit que le fichier est à jour, pas qu'il est sans défaut.

   * ID de workflow normalisé (`keuria_workflow_01`), importé dans SQLite, actif sur `http://localhost:5678`.
   * Bannières de cadrage explicatives positionnées au-dessus des 4 sous-systèmes.

4. **Traçabilité Audio & Éthique :**
   * [frontend/public/audio/palou/manifest.json](file:///c:/Users/HP/Documents/Institut_Supérieur_d_enseignement_professionnelle_ISEP/KerIA/frontend/public/audio/palou/manifest.json)
   * Origine Hugging Face et réserve légale pour mise en production commerciale explicitement mentionnées.
