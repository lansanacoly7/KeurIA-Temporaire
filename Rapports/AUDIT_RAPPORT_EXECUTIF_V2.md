# Audit n°2 de `docs/RAPPORT_AMELIORATIONS_EXECUTIVE.html`

> **Instantané historique** : ce document décrit l'état du dépôt au moment de l'audit n°2. Depuis, les 8 `onclick` ont été remplacés par des écouteurs, la CI contrôle la fraîcheur de `schema.yml` et un défaut de double déclenchement tactile a été corrigé (voir l'audit de suivi). Les points ❌ ci-dessous ne sont donc plus tous d'actualité.

Refait le 2026-10-04 sur l'état actuel du dépôt (branche `test`), en re-vérifiant chaque point du premier audit. Tests relancés : backend 622 ✅ (OK, 730 s), frontend 116 (115 réussis, 1 ignoré, 0 échec).
Légende : ✅ corrigé / vérifié · ⚠️ partiel · ❌ toujours présent.

## Verdict
Le rapport est **nettement plus fiable** qu'au premier audit : les fausses affirmations les plus graves ont été corrigées. Il reste quelques points non mesurés ou légèrement trompeurs, listés ci-dessous. Le fichier `AUDIT_RAPPORT_EXECUTIF_AMELIORATIONS.md` (modifié depuis) annonce « 100 % conforme » : **c'est trop fort**, voir la section 2.

## 1. Points du premier audit : état actuel
| # | Point initial | État | Preuve |
|---|---|---|---|
| 1 | « 194/194 tests » | ✅ | Le rapport dit « 622+ validés » ; réel : 622 backend OK + 115 frontend. |
| 2 | « 15 répliques vocales réelles » | ✅ | Reformulé « 9 répliques synthétisées par IA + 6 SFX » (9 + 6 fichiers présents). Le manifeste documente maintenant la source (Qwen3-TTS, prototype académique, droits à clarifier avant mise en production). |
| 3 | « Remplacement du TTS navigateur » | ✅ | Reformulé « moteur hybride… relais Web Speech pour les cours » : exact (`voice.ts` joue un clip seulement sur mots-clés). |
| 4 | « Latence 0 ms, 100 % hors-ligne » | ✅ | Affirmation retirée du rapport. Un `sw.js` existe désormais. |
| 5 | Fichiers `tuto_N.wav` absents | ✅ | `PalouTutorial.tsx` ne les référence plus. |
| 6 | Boutons Telegram sans effet | ✅ | Le workflow a maintenant un déclencheur Telegram, un aiguillage `cmd_force_restart` / `cmd_show_logs` et les nœuds de réponse. **Non testé en réel** (nécessite un bot Telegram configuré). |
| 7 | Commande de redémarrage qui se déclare toujours réussie | ✅ | Le `|| echo` a disparu : `backup && (docker compose restart … \|\| systemctl restart …)`. |
| 8 | Docs d'API publiques | ✅ | `/api/docs/` réservé aux administrateurs sauf `DEBUG` ou `ENABLE_PUBLIC_API_DOCS=True`. |
| 9 | « Export YAML en CI » | ⚠️ | La CI exécute bien `spectacular --file schema.yml`, mais le fichier est généré dans l'exécuteur : **le `schema.yml` versionné n'est pas mis à jour ni comparé** ; le rapport dit « générée et validée » alors qu'il n'y a pas de validation. |
| 10 | « Rollback prêt » | ✅ | Retiré du rapport (toujours absent de `cd.yml`). |
| 11 | « WCAG 2.1 AA » | ✅ | Retiré, remplacé par « cibles tactiles ≥ 44-48 px ». |
| 12 | Simulateur d'incident factice | ⚠️ | Le bouton « Tester la sonde » fait maintenant un vrai `fetch`. Le « simulateur » reste une animation codée en dur (4 `setTimeout`), désormais étiquetée « Démonstration… (Scénario) », mais le texte au-dessus dit encore « visualiser **en direct** le comportement du workflow ». |

## 2. Ce qui reste à corriger ❌ ⚠️
1. **« Redémarrage en moins de 15 s »** (ligne 1166) : jamais mesuré. Le workflow attend 10 s *après* une détection qui peut elle-même prendre jusqu'à 60 s.
3. **WhatsApp « avec Request-ID »** (ligne 1354) : le message du workflow ne contient pas de Request-ID (une seule occurrence de `request_id` dans tout le workflow, à vérifier) ; la requête par défaut (CallMeBot) ne marche qu'avec une variable d'environnement.
4. **Cibles ≥ 44-48 px et « 0 débordement à 320 px »** : aucun outil d'audit (axe, Lighthouse) n'est branché ; non démontré. Ce que j'ai testé moi-même : à 390 px, onglets et boutons répondent au toucher.
5. **« Zéro fuite mémoire »** : vrai pour la caméra (`getTracks().stop()`, `cancelAnimationFrame`), mais l'absolu « zéro » n'est couvert par aucun test.
6. **Boutons du rapport** : les 8 attributs `onclick` sont toujours là (mon correctif a été perdu avec le retour de la branche). Ils fonctionnent dans un vrai navigateur ; ils échouent dans les aperçus qui bloquent les scripts en ligne (visionneuse de fichiers, messagerie, certains téléphones).
7. **Voix** : sans consentement/licence clarifiés, ne pas publier le clone vocal (déjà noté dans le manifeste, à garder visible).

## 3. À propos de l'audit « 100 % conforme »
`AUDIT_RAPPORT_EXECUTIF_AMELIORATIONS.md` affirme que les 16 points sont traités et que « le simulateur interroge la véritable API ». C'est **inexact pour le simulateur** (animation), pour le point 9 (pas de validation) et pour les points 2-5 ci-dessus. Les commits `7aa7a14` / `1d6d012` cités n'ont pas pu être vérifiés (git absent du PATH sur cette machine).

## 4. Non vérifiable
« 7/7 recommandations de l'audit d'origine » (le document source n'est pas cité) ; synchronisation avec `origin/test`.
