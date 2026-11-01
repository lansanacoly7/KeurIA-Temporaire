# Rapport T14 — Claude — classement de la classe + « Mon parcours » suit le parcours effectif

- Date : 2026-10-16
- Base : sommet `origin/Dev_Lansana_Coly` = `3b15419`, exporté dans `KerIA-agents/claude-review` (dossier de travail local, branche locale et dossier d'OpenCode non touchés).
- Reprise d'OpenCode : travail non poussé lu dans `KerIA-agents/opencode` (5 fichiers backend, rien côté écran).

## 0. Base de départ (T12 déjà poussé)
| Contrôle sur `3b15419`, avant T14 | Résultat |
|---|---|
| pytest | `788 passed, 595 warnings in 434.53s` |
| tsc | `tsc exit 0` |
| `NODE_ENV=test node --test tests/*.test.mjs` | `# tests 216 / # pass 216 / # fail 0` |

Revue T12 : `agents/rapports/T12-revue-claude.md` (validé).

## 1. Ce qui vient d'OpenCode, jugé ligne par ligne
| Élément d'OpenCode | Verdict | Ce que j'en ai fait |
|---|---|---|
| `errors.py` : `ApiError(..., extra=)` et `{'error', **extra}` dans la réponse | juste | repris ; `error` écrit en dernier pour qu'un `extra` ne puisse jamais l'écraser ; docstring de `ScolaireView` laissée telle quelle (la changer réécrivait la description de ~60 routes dans `schema.yml`) |
| `urls.py` / `views.py` : `eleve/classement` → `StudentClassLeaderboardView` | juste | repris (docstring : débit) |
| Périmètre : `get_school_student_profile` + `classroom_id`, 403 sinon | juste | repris, message plus clair + `reason: "no_class"` |
| Filtre `user__is_active=True, left_in_year=''` | juste | repris |
| Prénom + initiale | juste sur le principe | réécrit : espaces nettoyés, initiale = première lettre (accents compris), mise en majuscule |
| Phrase du 403 : « Le classement est fermé : coupé par … » | **écart** : pas la phrase de `/eleve/restrictions` (« Le classement : coupé par … ») | phrase unique `restrictions.rule_message()`, utilisée par les deux routes ; testé que la phrase du 403 figure dans `messages` de `/eleve/restrictions` |
| Import tardif de `regles._who` (contournement d'un import circulaire) | fragile (fonction privée) | `who_label` et `rule_message` déplacés dans `restrictions.py`, qui n'importe aucun service : plus de cycle |
| Calcul via `rank_students()` (une requête profils + une agrégée + une pour les noms d'affichage du compte) | correct mais ne répond pas à la demande « une requête agrégée » ; semaine = maintenant − 7 j (pas l'heure de Dakar), noms triés sur `User.display_name` | remplacé par **une** requête `StudentProfile` annotée (`Sum` + `Count` filtrés) ; semaine à l'heure de Dakar ; tri des ex æquo sur le nom affiché, sans accents |
| Champs `position`, `badge`, `totalXp` | inutiles pour l'écran | retirés (moins de données exposées) ; ajout de `period` (dates), `classroom`, `me` |
| Tests (`test_classement_eleve.py`, 8 tests) | bons | repris comme base et complétés (20 tests) |

## 2. Serveur : `GET /api/eleve/classement`
- **Périmètre** : élèves actifs de la classe de l'élève connecté, même école ; enfant de famille, élève sans classe, adulte : 403 (`reason: "no_class"`).
- **Règle** : `restrictions.effective(user)['leaderboard']` fermée → 403 `{error: "Le classement : coupé par la direction de l'école." | "… par ton enseignant.", reason: "closed", by: "school" | "class"}`.
- **Données** : `{scopeLabel, classroom, period: {label, range, timezone, start, end}, classSize, participants, entries: [{rank, displayName, xp, lessons, isMe}], me}`. Aucun e-mail, matricule ni identifiant (testé sur le JSON complet).
- **Semaine** : 7 derniers jours glissants à l'heure de Dakar (aujourd'hui − 6 jours à minuit → maintenant).
- **Égalités** : même rang (1, 2, 2, 4), ordre alphabétique sans accents.
- **Performance** : `_class_rows` = 1 requête (`assertNumQueries(1)`, 12 élèves) ; la route complète fait 10 requêtes avec 2 ou 17 élèves (testé : le nombre ne grandit pas avec la classe ; la toute 1re requête d'une session en fait 3 de plus pour l'enregistrer).
- **Débit** : mêmes limites que `eleve/aujourdhui` (UserRateThrottle par défaut, testé).
- `schema.yml` régénéré (seul ajout : `/api/eleve/classement`) ; route documentée en section 9 de `docs/ECOLE_ELEVE_CONCEPTION.md` (et ligne 3 du même fichier réparée : deux caractères de contrôle à la place de `` `b `` et `` `a ``).

## 3. « Mon parcours » suit le parcours effectif
- Cause : le tableau de bord prenait `User.age_group` (vide pour un élève d'école → 7-9), jamais l'exception de l'enseignant.
- Correctif serveur, une seule source : `levels.effective_track(profile)` (exception, sinon niveau de la classe), utilisée par `GET /api/profile` (`ageGroup` d'un élève d'école), `GET /eleve/aujourdhui` (`track`) et `sync_learner_track` (profil d'apprentissage). Carte, modules, leçons, temps du jour, Palou suivent car ils lisent tous ce même `age`.
- Pas de cache périmé : la page `/dashboard` est dynamique et lit `/api/profile` en `no-store` à chaque chargement ; le service worker ne met en cache ni les pages ni `/api` ; aucun parcours n'est gardé dans `localStorage` (vérifié : seules la progression et des préférences y sont).
- Enfant de famille : `ageGroup` inchangé (test + navigateur).
- « Ma classe » affiche le parcours effectif (« Parcours 10–12 ans » pendant l'exception).

## 4. Écran « Ma classe »
Libellé « Classement de la classe ». Vrai `<table>` (caption, `th scope`), ligne de l'élève marquée « (toi) » + `aria-current`. États : chargement (squelette, `role=status`, jamais blanc), classe vide, classement fermé (phrase du serveur), erreur réseau avec « Réessayer » (cible 133 × 44 px), élève sans points (« Tu n'as pas encore de points cette semaine… »), sans classe. Contrastes : texte `#173e3c`, `#475569`, `#92400e`, `#0b6b59` sur fond clair (≥ 4,5:1).

## 5. Vérifications (sorties copiées)
| Commande (sur l'export, avec T14) | Résultat |
|---|---|
| `pytest -q` | `808 passed in 258.29s` (788 + 20) |
| `ruff check .` | `All checks passed!` |
| `manage.py check` / `makemigrations --check --dry-run` / `check_parcours79` | `no issues` / `No changes detected` / `Contenu conforme.` |
| `spectacular --file schema.yml` puis comparaison | `identique` au fichier versionné |
| `tsc --noEmit` | `tsc exit 0` |
| `eslint .` | `0 errors, 159 warnings` : aucun dans les fichiers touchés (les 159 sont existants, ailleurs) |
| `NODE_ENV=test node --test tests/*.test.mjs` | `# tests 221 / # pass 221 / # fail 0` (216 + 5) |
| `next build --webpack` | `Compiled successfully in 6.3min`, exit 0 |

Non lancé localement : `coverage` (absent du venv local ; la CI le fait).

### Vrai navigateur (Chrome headless piloté par CDP, `next start` + Django sur l'export)
Comptes de démonstration créés dans la base de l'export seulement. Résultats bruts : `T14-captures/mesures.json`.
| Vérification | Résultat |
|---|---|
| Élève CE1 A (Yacine) | 14 lignes, toutes de CE1 A, sa ligne « (toi) » au rang 10 ; ex æquo 4-4-4 et 11-11 |
| Élève CE1 B (Elhadji) | 12 lignes de CE1 B ; noms communs avec CE1 A : **aucun** ; e-mail/matricule/id dans la réponse : **aucun** |
| Direction ferme « Le classement » sur `/ecole/regles` (interrupteur + « Enregistrer les règles ») | « Enregistré avec succès. » ; élève : « Le classement : coupé par la direction de l'école. » (écran, 403 et `/eleve/restrictions` identiques) |
| Direction rouvre | élève : tableau de nouveau (14 lignes) |
| Enseignante pose 10-12 sur la fiche élève | « Parcours enregistré : 10-12 ans. » ; élève au chargement suivant : `ageGroup 10-12`, `track 10-12`, écran « Mes modules, étape par étape » (plus la carte 7-9) |
| Enseignante retire l'exception | « Par défaut — parcours du niveau (7-9 ans) » ; élève : retour à « L'île des Petits Explorateurs » |
| Enfant de famille | thème 7-9, menu famille (pas le cahier), `ageGroup 7-9`, classement de classe → 403 `no_class` |
| États | chargement (requête retenue), classe vide (CI A), élève absent (0 point), erreur réseau puis « Réessayer » → 14 lignes |

| Largeur | `document.documentElement.scrollWidth` |
|---|---|
| 390 | 390 (toutes les captures 390) |
| 768 | 768 |
| 1280 | 1280 (le `body.scrollWidth` vaut 1506 = 1280 / 0,85 : effet du zoom 85 % du site, même valeur pour l'enfant de famille ; pas de débordement) |

Captures (`T14-captures/`) : 01 (CE1 A en 1280, 768, 390), 02 (CE1 B), 03 (absent), 04 (classe vide), 05 (chargement), 06 (erreur réseau), 07 (écran direction), 08 (fermé, 390 et 1280), 09 (rouvert), 10 (parcours avant), 11 (écran enseignante), 12 (parcours avec exception), 13 (Ma classe « Parcours 10–12 ans »), 14 (exception retirée), 15 (enfant de famille), 16 (enfant de famille en 10-12, pour comparaison).

## 6. Limites honnêtes
- **Ports** : la demande disait Django 8001 et Next 3000. Ces deux ports étaient déjà pris par des serveurs lancés depuis le dossier de travail local ; je ne les ai pas arrêtés. L'export a tourné sur 8011 et 3011.
- **Build** : `next build` (Turbopack) refuse le `node_modules` de l'export, qui est une jonction vers celui du dossier local (« Symlink node_modules could not be resolved ») ; build fait avec `--webpack`. La CI fait le build Turbopack sur Linux avec un vrai `npm ci`.
- **Mémoire** : un premier `next dev` est tombé en « out of memory » (RAM saturée par d'autres travaux en cours, dont un rendu Remotion de la vidéo Parents) ; d'où `next start`.
- **Défaut existant découvert, non corrigé ici** : hors thème 7-9, le corps de page est en Times New Roman. `globals.css` utilise `var(--font-geist)`, une variable qui n'est définie nulle part. Même rendu pour un enfant de famille en 10-12 (capture 16), donc antérieur à T14 ; le corriger changerait le rendu des comptes famille. Confié à OpenCode (T15 § 5).
- Les captures pleine page montrent la barre d'onglets du bas (fixe) au milieu de la page à 390 px : effet de la capture, pas de l'écran.
- Le classement ne compte que les élèves qui ont des points sur la semaine (comme les classements existants) ; `classSize` donne l'effectif.
