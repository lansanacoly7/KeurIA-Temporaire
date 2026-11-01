# L'élève rattaché à une école : note de conception (à valider avant de construire)

> État : **décisions validées le 15/10/2026**. Étape 1 (règles en couches, backend) **construite** : `backend/apps/scolaire/restrictions.py, routes /api/ecole/restrictions, /api/enseignant/classes/<id>/restrictions, /api/eleve/restrictions. Étapes 2 à 4 : voir `agents/taches/.

## 1. Où on en est

Un élève d'école arrive par `/school/<slug>` (page refaite le 15/10), se connecte avec la fiche de connexion donnée par l'école, puis retrouve **le même tableau de bord qu'un enfant de famille**, avec les couleurs de l'école, un bandeau et un onglet « Devoirs ». Aucune restriction propre à l'école : les limites parentales n'ont pas de sens pour lui et rien ne les remplace.

## 2. Décisions déjà prises

- **Usage : en classe et à la maison, à parts égales.** → deux contextes à gérer : « en classe » (séance guidée) et « à la maison » (devoirs, parcours).
- **Contrôle : l'enseignant décide par classe.**
- **Restrictions : trois profils (direction, enseignant, parent) ont chacun un niveau de restriction selon leur rôle sur l'enfant.**
- **Ton : « cahier de classe »** : ludique mais cadré, la classe et l'enseignant visibles.

## 3. Proposition : des règles en couches

Chaque réglage peut être posé à trois niveaux. **Le réglage effectif est le plus strict des niveaux qui s'appliquent** (une couche basse ne peut jamais assouplir une couche haute).

| Niveau | Qui | Ce qu'il peut faire |
|---|---|---|
| 1. École | Direction | Règles par défaut et limites dures (Palou autorisé ou non dans l'école, heures interdites, partage de classement) |
| 2. Classe | Enseignant | Affiner pour sa classe, **dans les limites de l'école** (programme de la semaine, jeux, Scratch, créneaux de classe) |
| 3. Maison | Parent lié | **Resserrer seulement** (temps à la maison, coucher, Palou à la maison) ; voit les règles de l'école en lecture seule |

Un élève **sans parent lié** n'a que les niveaux 1 et 2.

Réglages à couvrir : Palou (activé ou non), jeux et défis, Studio Scratch, programme visible (« à faire seulement » ou « + parcours libre »), créneaux horaires (heures de classe, heures à la maison), durée quotidienne, classement visible, notifications.

L'élève voit toujours **qui** a posé une restriction : « Ton enseignant a coupé les jeux jusqu'à 16 h » (jamais un blocage muet).

## 4. À quoi ressemble l'interface élève (« cahier de classe »)

- **Aujourd'hui en classe** : ce que l'enseignant a ouvert (leçon du jour, durée de la séance).
- **Mes devoirs** : à rendre, avec dates ; rendus et notés.
- **Mon parcours** : le parcours 7-9 / 10-12 / 13-15, si les règles l'autorisent.
- **Ma classe** : tableau d'honneur de la classe, enseignant, camarades (sans données personnelles).
- Bandeau de règles actives (qui a restreint quoi).

Côté adultes : la direction a « Règles de l'école » ; l'enseignant a « Règles de la classe » avec un aperçu « ce que voit l'élève » ; le parent garde ses limites actuelles, plus un encart « règles de l'école ».

## 5. Mise en œuvre par étapes (chaque étape livrable seule)

1. **Modèle de règles et calcul du réglage effectif** (backend, tests d'isolation) : Claude.
2. **Écrans de règles** direction et enseignant, avec aperçu : OpenCode.
3. **Interface élève « cahier de classe »** : OpenCode (code) + Antigravity (design et vérification à l'écran).
4. **Mode « séance de classe »** : l'enseignant ouvre une séance (leçon, durée) ; connexion rapide par fiche/QR.

## 6. Réponses aux questions (validées par Lansana, 15/10/2026)

1. L'enseignant **ne peut pas assouplir** ce que la direction a posé (refusé à l'enregistrement avec une explication ; le calcul le garantit aussi).
2. Le parent **peut couper Palou à la maison** même si l'école l'autorise : il ne peut que resserrer.
3. Pendant une séance de classe, **seule la classe compte** (les restrictions du parent ne s'appliquent pas).
4. Les créneaux horaires suivent **l'heure du serveur** (fuseau Africa/Dakar).
5. Classement de classe : **prénom seul, avec l'accord de l'école** (réglage « leaderboard »).

## 7. Ce qui est construit (étape 1)

- Modèle `RestrictionPolicy` (une ligne par école, une par classe) ; réglages : `palou`, `games`, `scratch`, `free_path`, `leaderboard` (booléens), `daily_limit_minutes`, `windows` (créneaux autorisés, jours 0 = lundi).
- `restrictions.effective(user)` : réglage effectif le plus strict, avec **qui** l'a posé (`school` / `class` / `parent`).
- Palou (`palou_allowed`) suit déjà ces règles pour un élève d'école.
- La couche « maison » vient des limites parentales existantes (Palou, heure du coucher) quand un parent est lié.
- `class_session_active()` renvoie pour l'instant toujours « pas de séance » : la séance de classe est l'étape 4.
## 8. Conception détaillée (décisions du 15/10/2026, soir)

### 8.1 Menu de l'élève d'école : « cahier de classe » (menu réduit)

| Onglet | Contenu | Visible si |
|---|---|---|
| **Aujourd'hui** (accueil) | Séance en cours (« Rejoindre »), mot ou sondage de l'enseignant, prochaine leçon donnée, devoirs à rendre, bandeau de règles | toujours |
| **Mes devoirs** | À rendre (dates), rendus, notés | toujours |
| **Mon parcours** | Le parcours de son niveau (7-9, 10-12 ou 13-15) | règle `free_path` autorisée (sinon seulement les leçons données) |
| **Ma classe** | Classe, enseignant, tableau d'honneur (prénoms seuls) | règle `leaderboard` autorisée pour le classement |
| **Mes étoiles** | Étoiles, badges, niveau | toujours |
| **Libre** (Jeux, Arcade, Scratch) | Les jeux et le Studio de programmation | règles `games` / `scratch` autorisées |

Retirés pour un élève d'école : messagerie familiale, réglages parent, tutoriel « famille » (remplacé par une visite « ta classe »). L'élève ne modifie que son avatar (pas son nom, pas d'e-mail).

### 8.2 Messages de l'enseignant : annonces, jamais de discussion

L'enseignant publie, pour sa classe, des **annonces** typées, affichées sur « Aujourd'hui » :
- `text` : un mot (consigne, encouragement), lecture seule ;
- `poll` : un **sondage** à choix (2 à 5 réponses) ; l'élève répond une fois en touchant une option (il peut changer d'avis tant que le sondage est ouvert) ; l'enseignant voit les résultats agrégés et qui a répondu ;
- (plus tard) d'autres types dans la même logique : quiz éclair, vote « j'ai compris / pas compris ».
Aucun champ de texte libre pour l'élève : pas de discussion, pas de modération à faire. Une annonce a une date de fin ; au plus 3 annonces actives par classe.

### 8.3 Séance de classe : ouverte par l'enseignant

L'enseignant ouvre une séance (leçon ou activité + durée, par exemple 40 min). Les élèves de la classe voient « Séance en cours » sur Aujourd'hui et rejoignent d'un geste ; la séance se termine **toute seule** à l'heure prévue (heure du serveur) ou quand l'enseignant la ferme. Pendant la séance, seules les règles de l'école et de la classe s'appliquent (pas celles du parent).

### 8.4 Parcours d'un élève d'école

Par défaut **fixé par le niveau de la classe** (CI, CP, CE1, CE2 → 7-9 ; CM1, CM2, 6e → 10-12 ; 5e et plus → 13-15). **L'enseignant peut le changer pour un élève** (élève en avance ou en difficulté) ; l'élève ne choisit jamais.

### 8.5 Qui configure quoi

| | École (direction) | Enseignant | Élève |
|---|---|---|---|
| Comptes, classes, fiches de connexion | oui | fiche de sa classe | — |
| Règles | règles de l'école | règles de sa classe (jamais plus souples) | — |
| Programme, devoirs, séances, annonces | — | oui | — |
| Parcours | niveau → parcours par défaut | change pour un élève | — |
| Profil | — | — | avatar seulement |

### 8.6 Mise en œuvre

- **T8 (Claude, backend)** : séances, annonces (texte et sondage), parcours (niveau de classe + exception par élève), endpoints, tests d'isolation ; `class_session_active` devient réel.
- **T9 (OpenCode + Antigravity, remplace T7)** : interface élève d'école « cahier de classe » (menu, Aujourd'hui, Ma classe, Libre, annonces et sondages, rejoindre une séance, bandeau de règles).
- **T10 (OpenCode)** : côté enseignant : ouvrir/fermer une séance, publier une annonce ou un sondage et voir les résultats, changer le parcours d'un élève.
## 9. API construite (T8) pour les tâches T9 et T10

Toutes les routes sont sous `/api/`. Les corps sont en JSON ; les erreurs `{error: "..."}` (400 invalide, 403 pas votre classe/élève, 404 introuvable).

**Enseignant (ses classes seulement)**
| Route | Rôle |
|---|---|
| `GET /enseignant/classes/<id>/seance` | Séance en cours : `{session: {id, title, lessonId, startedAt, endsAt, remainingSeconds} \| null}` |
| `POST /enseignant/classes/<id>/seance` `{title, lessonId?, minutes (5 à 120)}` | Ouvre (remplace la séance en cours) → 201 |
| `DELETE /enseignant/classes/<id>/seance` | Termine la séance |
| `GET /enseignant/classes/<id>/annonces` | Les 30 dernières : `{announcements: [{id, kind, title, text, options, createdAt, endsAt, closed, active}], maxActive: 3}` |
| `POST /enseignant/classes/<id>/annonces` `{kind: "text"\|"poll", title?, text, options? (2 à 5, 60 car.), endsInDays? (1 à 30, défaut 7)}` | Publie (au plus 3 actives) → 201 |
| `GET /enseignant/annonces/<id>` | Résultats : `{announcement, counts: [n,...], answered: [{studentId, name, choice}], notAnswered: [{studentId, name}]}` |
| `DELETE /enseignant/annonces/<id>` | Ferme l'annonce |
| `PUT /enseignant/students/<id>/parcours` `{track: "7-9"\|"10-12"\|"13-15"\|""}` | Impose un parcours à un élève (`""` retire l'exception) → `{studentId, trackOverride}` |

**Élève d'école**
| Route | Rôle |
|---|---|
| `GET /eleve/aujourdhui` | `{session, announcements: [{... , myChoice, counts?}], track, restrictions}` : séance de SA classe, annonces actives (les `counts` d'un sondage n'apparaissent qu'après sa réponse), son parcours effectif, et les règles effectives (voir section 7) |
| `POST /eleve/annonces/<id>/reponse` `{choice: index}` | Répond à un sondage (modifiable tant qu'il est ouvert) → `{myChoice, counts}` |
| `GET /eleve/classement` (T14) | Classement de la semaine de **sa** classe : `{scopeLabel: "Classement de la classe", classroom: "CE1 A", period: {label, range: "du 10 au 16 octobre", timezone: "Africa/Dakar", start, end}, classSize, participants, entries: [{rank, displayName, xp, lessons, isMe}], me: {rank, xp, lessons} \| null}` |

**Classement de la classe (T14)** — décision du 15/10 : prénom seul (ici prénom et initiale du nom), avec l'accord de l'école.
- Uniquement les élèves actifs de la classe de l'élève connecté (compte actif, pas partis en cours d'année) ; jamais une autre classe ni une autre école. Aucun e-mail, matricule ni identifiant d'un autre élève.
- Semaine : les 7 derniers jours glissants à l'heure de Dakar, d'aujourd'hui moins 6 jours (minuit) jusqu'à maintenant. Points = XP gagnée sur la période (défis et énigmes du jour compris) ; leçons = réalisations hors défis et énigmes.
- Seuls les élèves qui ont des points sont classés ; ex æquo = même rang (1, 2, 2, 4), dans l'ordre alphabétique sans tenir compte des accents. `me` vaut `null` quand l'élève n'a pas encore de points.
- 403 `{error, reason: "closed", by: "school" | "class"}` quand la règle effective `leaderboard` est coupée ; `error` est la phrase de `/eleve/restrictions` (« Le classement : coupé par ton enseignant. »). 403 `{error, reason: "no_class"}` pour un enfant de famille ou un élève sans classe.
- Une seule requête agrégée pour toute la classe (nombre de requêtes indépendant de la taille de la classe, testé) ; débit : la limite par utilisateur commune aux routes élève.

**Parcours effectif côté écran (T14)** : `GET /api/profile` renvoie, pour un élève d'école, `ageGroup` = son parcours effectif (exception de l'enseignant, sinon niveau de la classe), relu à chaque chargement du tableau de bord ; l'enfant de famille garde la tranche d'âge de son compte.

Le parcours effectif d'un élève = l'exception de l'enseignant, sinon le niveau de sa classe. `class_session_active` est maintenant réel : pendant une séance, les règles du parent ne s'appliquent plus.