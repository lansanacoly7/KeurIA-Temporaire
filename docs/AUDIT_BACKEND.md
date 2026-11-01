# Audit exécutif et détaillé du backend Django — kEur IA

> **Auditeur :** Claude (rôle d'auditeur en chef : diagnostic, architecture, sécurité, bonnes pratiques).
> **Exécutant prévu :** Gemini (implémentation dans l'IDE). Chaque fiche contient une « Instruction pour Gemini » prête à être transmise.
> **Périmètre :** `backend/` (apps `accounts`, `superadmin`, `scolaire`, `progress`, `curriculum`, `learners`, `famille`, `schools`, configuration `keuria/`, outillage racine du backend) + fichiers parasites à la racine du dépôt.
> **Branche auditée :** `feature/v26-septembre` — audit réalisé le 2026-10-08, par lecture du code (aucune correction appliquée par l'auditeur).

---

## Sommaire

1. [Comment lire ce rapport](#1-comment-lire-ce-rapport)
2. [Synthèse exécutive](#2-synthèse-exécutive)
3. [Plan d'action priorisé](#3-plan-daction-priorisé)
4. [Configuration globale `keuria/`](#4-configuration-globale-keuria-et-outillage-backend)
5. [Application `accounts`](#5-application-accounts)
6. [Application `superadmin`](#6-application-superadmin)
7. [Application `scolaire`](#7-application-scolaire)
8. [Application `progress`](#8-application-progress)
9. [Applications `curriculum`, `learners`, `famille`, `schools`](#9-applications-curriculum-learners-famille-schools)
10. [Points transversaux et hygiène du dépôt](#10-points-transversaux-et-hygiène-du-dépôt)
11. [Limites de l'audit](#11-limites-de-laudit)

---

## 1. Comment lire ce rapport

**Niveaux de criticité (inspirés SonarQube) :**

| Niveau | Signification |
|---|---|
| **BLOCKER** | Faille ou bug qui interdit la mise en production. |
| **CRITICAL** | Faille exploitable ou perte de données probable ; à corriger avant tout déploiement réel. |
| **MAJOR** | Défaut significatif (sécurité, fiabilité, performance, vie privée des mineurs, dette lourde) ; à planifier rapidement. |
| **MINOR** | Amélioration, dette technique, hygiène ; à traiter au fil de l'eau. |

**Format de chaque fiche :** `[NIVEAU] IDENTIFIANT — titre`, puis **Fichier / lignes**, **Problème**, **Instruction pour Gemini**.

**Identifiants :** `KEU` (config), `ACC` (accounts), `SUP` (superadmin), `SCO` (scolaire), `PRO` (progress), `CUR` (curriculum), `LRN` (learners), `FAM` (famille), `SCH` (schools), `TRV` (transversal).

**Numéros de ligne :** relevés au moment de l'audit ; ils peuvent glisser après les premières corrections. En cas de doute, retrouver la fonction nommée.

**Règle de collaboration :** Gemini applique **un lot à la fois** (une application), puis l'auditeur relit le diff avant de passer au lot suivant. Chaque correction doit être accompagnée de son test.

**Fiches « à vérifier » :** quand une conclusion dépend d'un fichier non encore relu ou d'une décision produit, la fiche le dit explicitement.

---

## 2. Synthèse exécutive

**Nombre de fiches par zone et par criticité** (compté automatiquement à partir des fiches de ce document ; les chiffres annoncés au fil de l'audit dans la conversation sont remplacés par ceux-ci, qui font foi) :

| Zone | BLOCKER | CRITICAL | MAJOR | MINOR | Total |
|---|---:|---:|---:|---:|---:|
| Configuration `keuria/` | 0 | 1 | 9 | 25 | 35 |
| `accounts` | 0 | 1 | 15 | 26 | 42 |
| `superadmin` | 0 | 0 | 14 | 17 | 31 |
| `scolaire` | 0 | 0 | 9 | 26 | 35 |
| `progress` | 0 | 0 | 14 | 20 | 34 |
| `curriculum` | 0 | 0 | 3 | 9 | 12 |
| `learners` | 0 | 0 | 1 | 5 | 6 |
| `famille` | 0 | 0 | 1 | 4 | 5 |
| `schools` | 0 | 0 | 0 | 4 | 4 |
| Transversal | 0 | 1 | 4 | 5 | 10 |
| **Total** | **0** | **3** | **70** | **141** | **214** |

### Ce qui est solide (à conserver)
- **Authentification par session** HttpOnly, CSRF en place, expiration par inactivité, verrouillage des connexions à trois niveaux, codes à usage unique hachés, anti-énumération sur le mot de passe oublié.
- **Cloisonnement des écoles** : les services reçoivent l'école de la session, jamais un identifiant du client ; périmètre enseignant strict (`_owned_*`).
- **Notation des devoirs scolaires côté serveur** (première réponse définitive, correction révélée après réponse).
- **Clôture d'année encadrée** (verrou, bilan téléchargé, confirmation, annulation 7 jours), neutralisation des formules dans les CSV, logos vérifiés par Pillow (SVG refusé).
- **XP décidée par le serveur** (catalogue), opérations sensibles protégées par `select_for_update`/`get_or_create`.
- **Observabilité** : identifiant de requête, journaux JSON, sondes de santé, checks de déploiement dédiés.
- **Palou** : historique côté serveur, masquage e-mails/téléphones, éteint par défaut tant que le parent ne l'autorise pas ; **Push** : liste blanche anti-SSRF.

### Les cinq risques majeurs
1. **Secrets et comptes** : un mot de passe de super administrateur est écrit en clair dans un fichier suivi par git (`COMPTES_CONNEXION.md`) ; les mots de passe provisoires des comptes (directions, enseignants, **élèves mineurs**) n'offrent que 90 000 combinaisons et ne sont pas à changer à la première connexion.
2. **Prise de contrôle de comptes** par devinette du code à 6 chiffres de réinitialisation (réémission illimitée, aucun verrou par compte) — y compris les comptes administrateurs.
3. **Intégrité de la gamification** : badges attribuables par une seule requête, XP/leçons « terminées » sur simple déclaration du navigateur, bonnes réponses des quiz publiques sans authentification.
4. **Fiabilité sous charge** : envois d'e-mails/push et appels IA *dans* la requête HTTP (2 threads par worker), imports en masse qui dépassent le délai de 60 s, `GET` qui écrivent en base, listes non paginées.
5. **Données des mineurs** : prénoms d'enfants de familles différentes visibles dans le classement général, notifications d'un ancien parent non purgées, journaux d'audit et messages familiaux conservés sans limite, export de données incomplet.

---

## 3. Plan d'action priorisé

**Phase 0 — Immédiat (avant toute mise en ligne, 1 à 2 jours)**
TRV-01 (secret en clair), ACC-01 (brute-force du code de réinitialisation), KEU-01 (jeton envoyé au webhook), PRO-01 (forge de badges), PRO-09 (Palou ouvert à tous les comptes), CUR-01 (réponses publiques), SUP-01 (mots de passe provisoires).

**Phase 1 — Court terme (1 à 2 semaines)**
Corps de requête non-objet partout (TRV-02), envois e-mail/push asynchrones (TRV-03), imports en masse par lots (SCO-01), parsers JSON seuls + login-CSRF (ACC-10), `select_related('school')` sur l'authentification (ACC-07), `suspended_by_admin` (ACC-03/SUP-03), suppression de classe archivée (SCO-02), code de liaison parent (SCO-05), fiabilité des notes de devoirs (SCO-06), mesure de présence côté serveur (PRO-07).

**Phase 2 — Moyen terme (3 à 6 semaines)**
Pagination et agrégats SQL (SCO-03, SUP-04, SUP-07, PRO-04, PRO-11), découpage des modules monolithiques (ACC-06, SUP-11, SCO-04), brouillon/publié du Studio et PATCH partiel (SUP-12/13), tests manquants (un fichier par fiche « tests »), couverture de branches avec seuil en CI, durées de conservation (audit, notifications, messages).

**Phase 3 — Dette et durcissement continu**
Règles ruff étendues (S, DJ, I, N, PERF, C90, DTZ), `pip-audit`, nettoyage des champs hérités (`owner_email`, `learner_email`), unification des sources de vérité (âge, contenu), documentation OpenAPI, hygiène du dépôt.

---

## 4. Configuration globale `keuria/` et outillage backend

**Fichiers lus :** `keuria/settings.py`, `urls.py`, `exceptions.py`, `health.py`, `checks.py`, `observability.py`, `test_runner.py`, `wsgi.py`, `asgi.py`, `tests/test_health_and_observability.py`, ainsi que `requirements*.txt`, `Dockerfile`, `gunicorn.conf.py`, `ruff.toml`, `pytest.ini`, `.coveragerc`, `conftest.py`, `.env.example`, `.dockerignore`.
**Vérifié par commande :** `ruff check keuria` → 2 erreurs F541 ; `db.sqlite3`, `media/`, `mediafiles/`, `.env`, `.dev_secret_key` sont ignorés par git (aucun suivi).

### [CRITICAL] KEU-01 — Le jeton d'API est envoyé à n'importe quelle URL de webhook ; le repli « Meta » est inopérant
- **Fichier :** `keuria/observability.py` lignes 73-79 et 93-103 (`send_whatsapp_alert`).
- **Instruction pour Gemini :** dans `send_whatsapp_alert`, supprime tout le fallback Meta (lignes 73-79) : `if not webhook_url: return False`. N'ajoute l'en-tête `Authorization` que si un jeton dédié est configuré pour ce webhook : renomme `WHATSAPP_API_TOKEN` en `ALERT_WEBHOOK_TOKEN` et documente dans `.env.example` que ce jeton est envoyé à l'URL du webhook. Supprime `WHATSAPP_TO_NUMBER` de `settings.py` (ligne 418). Mets à jour le test `test_send_whatsapp_alert_handles_network_error_gracefully`.

### [MAJOR] KEU-02 — Données potentiellement personnelles envoyées aux canaux d'alerte
- **Fichier :** `keuria/observability.py` lignes 240-250.
- **Instruction pour Gemini :** ligne 250, remplace par `f"- Exception : {type(exc_caught).__name__}"` (type seul). Le détail reste dans les journaux et Sentry (`send_default_pii=False`). Ajoute un test : une exception contenant `secret@example.com` n'apparaît pas dans le `message` passé à `dispatch_critical_alert`.

### [MAJOR] KEU-03 — Un thread par alerte, anti-flood non partagé entre workers
- **Fichier :** `keuria/observability.py` lignes 29-30, 38-52, 155-170.
- **Problème :** chaque 500 sur un chemin différent lance un `threading.Thread` (3 appels réseau de 3 s) ; le cooldown est un dictionnaire par processus (4 workers = 4 alertes pour le même incident). Une panne générale touchant 100 routes crée 100 threads.
- **Instruction pour Gemini :** remplace `threading.Thread` par un `ThreadPoolExecutor(max_workers=2)` de module (`executor.submit(_deliver)`). Remplace `is_alert_throttled` par `cache.add(f"alert:{fingerprint}", 1, timeout=cooldown)` (atomique, partagé via Redis) ; supprime `_alerts_lock`, `_alerts_cooldown` et le nettoyage manuel. Adapte `test_alert_cooldown_throttles_rapid_duplicates`.

### [MAJOR] KEU-04 — Les médias sont servis par Django en production par défaut
- **Fichier :** `keuria/settings.py` ligne 182 ; `keuria/urls.py` (dernière route) ; `.env.example` ligne 24.
- **Problème :** `SERVE_MEDIA = DEBUG or os.environ.get('SERVE_MEDIA', 'True') == 'True'` vaut `True` si la variable est absente. `django.views.static.serve` est documenté comme inadapté à la production (un worker mobilisé par fichier, pas de cache efficace).
- **Instruction pour Gemini :** passe le défaut à `'False'` ; mets `SERVE_MEDIA=False` dans `.env.example` avec le commentaire « True seulement tant qu'aucun serveur web ne sert /media/ ». Ajoute dans `keuria/checks.py` un check `deploy=True` (Warning `keuria.W005`) quand `SERVE_MEDIA` est actif hors DEBUG.

### [MAJOR] KEU-05 — Adresse d'alerte par défaut inventée
- **Fichier :** `keuria/settings.py` lignes 409-414.
- **Problème :** sans `ADMINS_EMAILS`, les rapports d'incident (chemins, identifiants d'utilisateurs) partent vers `alerts@keuria.sn`, dont rien ne prouve qu'elle appartienne à l'équipe.
- **Instruction pour Gemini :** `ADMINS = []` dans le `else`. Ajoute un check `deploy=True` (Warning `keuria.W006`) si `ADMINS` est vide hors DEBUG.

### [MAJOR] KEU-06 — `SECURE_PROXY_SSL_HEADER` fait confiance à l'en-tête de tout appelant ; gunicorn écoute sur toutes les interfaces
- **Fichier :** `keuria/settings.py` ligne 278 ; `gunicorn.conf.py` ligne 11.
- **Problème :** si le port 8000 est joignable sans passer par le proxy Next.js, un client peut forger `X-Forwarded-Proto: https` (contourne `SECURE_SSL_REDIRECT`) et `X-Forwarded-For` (falsifie l'IP prise en compte par les throttles/verrous avec `NUM_PROXIES=1`).
- **Instruction pour Gemini :** `bind` par défaut `127.0.0.1:8000` si le proxy est dans le même conteneur ; sinon vérifie dans `docker-compose.yml` que le port 8000 n'est pas publié (`expose:` et non `ports:`). Ajoute un commentaire en tête du bloc `if not DEBUG:` expliquant que ces réglages exigent que Django ne soit joignable que via le proxy.

### [MAJOR] KEU-07 — Politique de mots de passe trop faible
- **Fichier :** `keuria/settings.py` lignes 146-153.
- **Problème :** `MinimumLengthValidator` sans option = 8 caractères, y compris pour les comptes d'administration et de direction.
- **Instruction pour Gemini :** `{'NAME': '...MinimumLengthValidator', 'OPTIONS': {'min_length': 12}}`. Vérifie que les mots de passe provisoires générés (voir SUP-01) respectent ce minimum et ajuste les tests qui utilisent 8 caractères.

### [MAJOR] KEU-08 — HSTS à 1 heure par défaut
- **Fichier :** `keuria/settings.py` ligne 282 ; contredit `.env.example` (31536000).
- **Instruction pour Gemini :** défaut `'31536000'`.

### [MAJOR] KEU-09 — Couverture de lignes seulement (pas de branches)
- **Fichier :** `.coveragerc` ligne `branch = False`.
- **Problème :** un `if` dont un seul côté est testé est compté comme couvert ; sur du code de permissions, c'est la mesure qui compte.
- **Instruction pour Gemini :** `branch = True` (le pourcentage baissera : normal).

### [MAJOR] KEU-10 — Aucun test du gestionnaire d'exceptions, des checks de déploiement ni du contenu des alertes
- **Fichier :** `keuria/tests/test_health_and_observability.py`.
- **Instruction pour Gemini :** crée `keuria/tests/test_exceptions.py` : vue DRF factice levant `ValueError("secret@example.com")` → 500, clé `error` en français, e-mail absent de la réponse ; cas 403 et 429. Ajoute une assertion sur le contenu de `message` dans les tests d'alerte et des tests des checks de `checks.py` (`override_settings`).

### [MINOR] KEU-11 — F541 (f-string sans variable)
`observability.py` lignes 79 (disparaît avec KEU-01) et 241. **Gemini :** retire le préfixe `f` ligne 241.

### [MINOR] KEU-12 — `request.user` évalué dans le `finally` du middleware
Lignes 225-226 : objet paresseux ; peut déclencher une requête SQL ou une exception qui masque l'erreur d'origine. **Gemini :** entoure de `try/except Exception: user_id = None` ; place `_request_id.reset(token)` (ligne 265) dans un `try/finally` externe.

### [MINOR] KEU-13 — Deux fonctions d'envoi quasi dupliquées et import inutile

### [MINOR] KEU-14 — `fail_silently=True` rend le journal « Alerte e-mail transmise » trompeur
Lignes 55-66. **Gemini :** `fail_silently=False` pour que le `except` journalise l'échec réel.

### [MINOR] KEU-15 — Parseur `.env` de repli maison (code mort)
`settings.py` lignes 11-25 : `python-dotenv` est dans `requirements.txt`. **Gemini :** supprime le `try/except ImportError`.

### [MINOR] KEU-16 — Booléens d'environnement stricts (`== 'True'`)
`SERVE_MEDIA`, `ADMIN_ENABLED`, `SECURE_SSL_REDIRECT`… : `true`/`1` désactive silencieusement la redirection HTTPS. **Gemini :** helper `_env_bool(name, default)` accepté pour `1/true/yes/on`.

### [MINOR] KEU-17 — `.dev_secret_key` écrit dans le dépôt à l'import
Lignes 34-47 (protégé par `.gitignore`/`.dockerignore`, limité à DEBUG). **Gemini :** facultatif, `os.chmod(path, 0o600)`.

### [MINOR] KEU-18 — `CSRF_TRUSTED_ORIGINS` dérivé de `CORS_ALLOWED_ORIGINS` ; origines `5173` dans le repli de développement
Lignes 330-353. **Gemini :** variable séparée avec repli ; retire `5173` sauf si le frontend legacy y est encore servi.

### [MINOR] KEU-19 — SMTP Gmail codé en dur ; `sys.stdout.reconfigure` dans `settings`
Lignes 363-379. **Gemini :** lis `EMAIL_HOST/PORT/USE_TLS` dans l'environnement ; déplace le `reconfigure` dans `manage.py` ou supprime-le.

### [MINOR] KEU-20 — `print` dans les réglages
Ligne 328. **Gemini :** `warnings.warn(...)`.

### [MINOR] KEU-21 — Lignes vides en fin de fichier (W391)
`settings.py` lignes 420-421 et fin du fichier de tests. **Gemini :** supprime.

### [MINOR] KEU-22 — Huit apps montées sur le même préfixe `api/` : collisions silencieuses possibles
`keuria/urls.py` lignes 22-30. **Gemini :** test qui aplatit les motifs d'URL et échoue si deux routes sont identiques.

### [MINOR] KEU-23 — Champ `error` non systématique dans les réponses d'erreur
`keuria/exceptions.py` lignes 18-21 : une `ValidationError` DRF n'a pas de clé `error`. **Gemini :** avant de changer, vérifie par recherche dans `frontend/` qu'aucun code ne lit la forme brute ; ajoute `error` en conservant les clés existantes.

### [MINOR] KEU-24 — Le 500 géré par le handler ne passe pas par `got_request_exception`
Lignes 24-30 ; `ATOMIC_REQUESTS` non activé : vérifier que les vues à écritures multiples utilisent `transaction.atomic` (traité application par application).

### [MINOR] KEU-25 — `health.ready` : route publique non limitée qui touche base et cache
**Gemini :** cache le résultat 5 s.

### [MINOR] KEU-26 — `checks.py` : ligne vide manquante (PEP 8) avant `@register`
Entre `admin_is_not_published_by_default` et `hosts_are_configured`.

### [MINOR] KEU-27 — Checks de déploiement manquants
`SESSION_COOKIE_SECURE`/`CSRF_COOKIE_SECURE` faux, CORS en `http://`/`localhost` en production, HSTS < 31536000. **Gemini :** trois checks `deploy=True` (`keuria.W007` à `W009`).

### [MINOR] KEU-28 — `test_runner.py` patche une méthode privée de Django ; deux chemins de lancement des tests
`SimpleTestCase._setup_and_call` + logique doublée dans `conftest.py`. **Gemini :** garde pytest seul (supprime `test_runner.py` et `TEST_RUNNER`) après avoir vérifié la CI, ou remplace par une classe de base `KeuriaTestCase`.

### [MINOR] KEU-29 — `ruff.toml` sans règles de sécurité/Django
**Gemini :** ajoute `"S","DJ","I","N","PERF","C90","DTZ"` à `select`, `[lint.mccabe] max-complexity = 12`, ignore `S101` dans les tests ; traite les nouveaux avertissements un par un.

### [MINOR] KEU-30 — `pytest.ini` sans couverture ni `--strict-markers`
**Gemini :** ajoute `pytest-cov` à `requirements-dev.txt`, puis `--strict-markers --cov --cov-fail-under=<seuil mesuré>` (mesure d'abord avec `branch = True`).

### [MINOR] KEU-31 — Épinglage hétérogène, pas d'audit de vulnérabilités
`drf-spectacular>=0.30.0`, `pywebpush~=2.5`. **Gemini :** épingle exactement (`pip freeze`), ajoute `pip-audit` en CI.

### [MINOR] KEU-32 — Test d'alerte WhatsApp : `except Exception` masque les erreurs de programmation
Ligne 123 du fichier de tests. **Gemini :** `assertLogs('keuria.alerts', 'WARNING')`.

### [MINOR] KEU-33 — `schema.yml` (2441 lignes) suivi par git, risque de péremption
**Gemini :** si rien ne le consomme, supprime-le et ajoute-le à `.gitignore` ; sinon `manage.py spectacular --validate --fail-on-warn` en CI.

### [MINOR] KEU-34 — `.env.example` : `LOG_JSON=False` contredit le défaut de production
**Gemini :** commente la ligne (« développement seulement »).

### [MINOR] KEU-35 — `Dockerfile` : image `python:3.13-slim` non épinglée
**Gemini :** épingle une version précise.

---

## 5. Application `accounts`

**Fichiers lus :** `models.py`, `views.py`, `serializers.py`, `authentication.py`, `throttling.py`, `permissions.py`, `parsing.py`, `urls.py`, `account.py`, `retention.py`, `admin.py`, `apps.py`, commande `apply_retention`, noms des tests (177 tests, 8 fichiers). Migrations (13) non relues. Couverture non mesurable (`coverage` absent de `.venv`).
**Points solides :** codes à usage unique hachés, verrouillage (compte+IP, compte, IP), expiration par inactivité, enfants toujours filtrés par `request.user.children`, `parse_id` robuste.

### [CRITICAL] ACC-01 — Le code de réinitialisation à 6 chiffres peut être deviné sans limite par compte
- **Fichier :** `accounts/views.py` 507-528 (ForgotPassword) et 551-579 (ResetPassword) ; `accounts/models.py` 190-228 (`OneTimeCode.issue/consume`).
- **Problème :** la limite de 5 essais est **par code**. `ForgotPasswordView` réémet un code à chaque appel, ce qui remet le compteur à zéro. Seul le throttle par IP (60/min) s'applique : avec quelques dizaines d'IP, la prise de contrôle de n'importe quel compte (dont `admin`, `admin_ecole`) est réaliste en quelques heures. `LoginTwoFactorView`, `VerifyEmailView`, `ReactivateAccountView`, `ResendVerificationView` n'utilisent pas `LoginLockout`. Aucun cooldown par adresse : bombardement d'e-mails de la victime.
- **Instruction pour Gemini :** dans `models.py`, `OneTimeCode.issue()` : cooldown par utilisateur `cache.add(f"otp-issue:{cls.__name__}:{user.pk}", 1, timeout=60)` ; si refusé, lève `CodeIssueThrottled` (à créer) ; plafond de 5 émissions par heure. Dans `consume()` : `cls.objects.filter(pk=current.pk).update(attempts=F('attempts') + 1)` (supprime la course) ; compteur d'échecs cumulés par utilisateur dans le cache (`otp-fail:{cls.__name__}:{user.pk}`, TTL 1 h) **non remis à zéro** par `issue()` ; au-delà de 10 échecs, `consume()` renvoie `False`. Dans `views.py` : `ForgotPassword`, `ResendVerification`, `Register` (via `send_verification_code`), `RequestReactivation` interceptent `CodeIssueThrottled` et renvoient la réponse générique habituelle sans envoyer d'e-mail ; `LoginTwoFactor`, `VerifyEmail`, `ResetPassword`, `Reactivate` ajoutent `LoginLockout(email, client_ip(request), scope='<nom>')` (`is_locked()` avant `consume`, `register_failure()` à chaque échec). Tests : 10 cycles « demande + 5 mauvais codes » verrouillent le compte même avec le bon code ; cooldown d'émission ; réponse générique constante.

### [MAJOR] ACC-02 — Corps JSON non-objet → erreur 500 (et alerte d'incident)
- **Fichier :** `views.py` 244-245, 253, 269-270, 292, 345-346, 383-384, 465, 513, 542, 557-559.
- **Instruction pour Gemini :** crée dans `serializers.py` : `EmailCodeSerializer`, `EmailOnlySerializer`, `ResetPasswordSerializer`, `EmailPasswordSerializer`, `PasswordOnlySerializer`. Remplace chaque `str(request.data.get(...))` par `serializer.is_valid()` + `error_response(first_error(...))`. Test paramétré : `[]`, `"x"`, `{"email": []}` sur toutes les routes `/api/auth/*` → 400. (Voir aussi TRV-02, solution commune.)

### [MAJOR] ACC-03 — Suspension « par l'administration » détectée par `label__icontains=user.email` dans le journal d'audit
- **Fichier :** `views.py` 363-365 et 395-397 ; écrit par `superadmin/services.py` 510-516.
- **Problème :** (1) `ta@gmail.com` est contenu dans `data@gmail.com` → faux positifs ; (2) le journal n'est jamais « levé » : après `compte_reactive`, l'ancienne ligne `compte_desactive` reste, et si le parent se désactive lui-même plus tard il est refusé à vie ; (3) `LIKE '%…%'` sur toute la table d'audit ; (4) bloc dupliqué dans deux vues.
- **Instruction pour Gemini :** ajoute `User.suspended_by_admin = BooleanField(default=False)` (migration `0014_...` + migration de données qui le renseigne d'après les `AuditLog(action='compte_desactive')` dont le libellé contient **exactement** l'adresse). Dans `superadmin/services.set_account_status`, écris `user.suspended_by_admin = (value == 'desactive')` avec `update_fields`. Dans `accounts/views.py`, remplace les deux requêtes `AuditLog` par `if user.suspended_by_admin:` via une fonction `_reactivation_refusal(user)` partagée.

### [MAJOR] ACC-04 — Squat d'adresse e-mail pendant 2 ans et énumération à l'inscription
- **Fichier :** `serializers.py` 74-78 ; `views.py` 121-124 ; `retention.py` 139.
- **Problème :** n'importe qui peut inscrire l'adresse d'un tiers (compte non vérifié) et l'empêcher de s'inscrire ; ce compte n'est purgé qu'après 730 jours. Le message « Cette adresse e-mail est déjà utilisée » contredit l'anti-énumération appliquée ailleurs. `is_reserved_login_email` n'est pas appelé à l'inscription (voir SCO).
- **Instruction pour Gemini :** dans `NewAccountSerializer.validate_email`, si le compte existant est `email_verified=False` et `role='parent'`, ne lève pas d'erreur : `RegisterSerializer.create` supprime l'ancien compte non vérifié (`transaction.atomic`) puis crée le nouveau. Pour un compte vérifié, garde le message (compromis documenté). Appelle `is_reserved_login_email(email)` dans `validate_email`. Dans `retention.py`, ajoute `purge_unverified(now, days=7)` appelée au début de `apply_retention`.

### [MAJOR] ACC-05 — L'envoi SMTP est synchrone dans la requête
- **Fichier :** `views.py` 600-648 (`send_code_email`).
- **Problème :** `msg.send()` avec `EMAIL_TIMEOUT=10` dans un thread HTTP (2 threads × 4 workers max) : une lenteur SMTP ou un flot d'inscriptions bloque l'API ; Gmail limite l'envoi quotidien (~500) : un flot épuise le quota et empêche les vrais codes.
- **Instruction pour Gemini :** crée `apps/accounts/mailer.py` (`ThreadPoolExecutor(max_workers=2)`, envoi via `transaction.on_commit`) ; garde le retour synchrone seulement pour `RegisterView`. Ajoute un plafond quotidien par adresse (10) et global (`EMAIL_DAILY_CAP` dans `settings.py`). Voir TRV-03.

### [MAJOR] ACC-06 — `LoginView.post` monolithique ; contrôles de session incohérents entre les chemins qui ouvrent une session
- **Fichier :** `views.py` 152-226 (≈75 lignes, ~15 branches) ; 236-258, 261-281, 376-412.
- **Problème :** `LoginTwoFactorView`, `VerifyEmailView`, `ReactivateAccountView` ouvrent une session mais sautent les contrôles « école suspendue » et « enseignant sans école » de `LoginView` (rattrapés seulement à la requête suivante par l'authentification).
- **Instruction pour Gemini :** extrais `session_refusal(user)` (e-mail vérifié, école suspendue, enseignant sans école) appelée avant chaque `start_session`. Découpe `LoginView.post` en `_check_credentials`, `_handle_inactive_parent`, `_start_or_challenge`. Supprime le repli `request.data.get('role')` (ligne 203) après vérification dans `frontend/`.

### [MAJOR] ACC-07 — Une requête SQL supplémentaire à chaque appel d'API pour les comptes d'école
- **Fichier :** `authentication.py` ligne 42.
- **Problème :** `user.school.is_suspended` charge l'école à chaque requête authentifiée (chemin le plus chaud).
- **Instruction pour Gemini :** crée `apps/accounts/backends.py` : `KeurModelBackend(ModelBackend)` dont `get_user` fait `select_related('school')` ; `AUTHENTICATION_BACKENDS = ['apps.accounts.backends.KeurModelBackend']` ; utilise-le dans `start_session` (ligne 71). Test `assertNumQueries` sur `GET /api/profile` pour un élève.

### [MAJOR] ACC-08 — La tranche d'âge n'est pas validée à la création d'un enfant
- **Fichier :** `serializers.py` 187 et 220.
- **Problème :** `ageGroup` est un `CharField` libre et `create` retombe sur `self.initial_data.get('ageGroup')` (valeur brute) ; sous PostgreSQL > 20 caractères → 500.
- **Instruction pour Gemini :** `ChoiceField(choices=[*CHILD_TRACKS, ''], required=False, default='')` ; supprime le recours à `initial_data`. Test : `ageGroup='x'*50` → 400. (Voir LRN-01 pour la double source de vérité.)

### [MAJOR] ACC-09 — Export des données incomplet (droit d'accès)
- **Fichier :** `account.py` 27-63.
- **Problème :** omet `ParentProfile` (prénom, nom, téléphone), `UserConnectionDay`, `age_group`, école, `last_seen_at`, et (voir FAM-01) les messages familiaux.
- **Instruction pour Gemini :** ajoute `parentProfile`, `connectionDays`, `ageGroup`, `lastSeenAt`, `schoolId`, `familyMessages` ; `Cache-Control: no-store` ; test : le téléphone du parent apparaît dans l'export.

### [MAJOR] ACC-10 — Formulaires HTML acceptés sur les routes sans CSRF (login-CSRF, déconnexion forcée)
- **Fichier :** `views.py` (Login, Logout, Register, vues de codes : `authentication_classes = []`) ; `settings.py` `REST_FRAMEWORK` (parsers par défaut JSON + formulaire + multipart).
- **Problème :** une page tierce peut soumettre un `<form method="post">` vers `/api/auth/login` : la victime est connectée au compte de l'attaquant (un parent saisirait les données de ses enfants dans le mauvais compte).
- **Instruction pour Gemini :** `'DEFAULT_PARSER_CLASSES': ('rest_framework.parsers.JSONParser',)` ; avant cela, cherche les vues qui reçoivent des fichiers (`request.FILES`, `MultiPartParser`) et déclare-leur `parser_classes = [MultiPartParser, JSONParser]`. Test : un POST `application/x-www-form-urlencoded` sur `/api/auth/login` → 415.

### [MAJOR] ACC-11 — Exception avalée et notification de série qui ne se déclenche qu'une fois
- **Fichier :** `models.py` 108-118.
- **Problème :** `except Exception: pass` ; `get_or_create(parent, child, notif_type='streak', defaults=...)` ne contient ni palier ni date dans les critères → dès qu'une notification `streak` existe, les jalons 5, 7, 10, 14, 21, 30 ne créent rien (à vérifier : atténué si les notifications sont supprimées une fois lues). Aucun test de série.
- **Instruction pour Gemini :** `except DatabaseError: logger.exception(...)` ; teste d'abord `ParentNotification.objects.filter(parent_id=..., child=self, notif_type='streak', payload__streakDays=streak).exists()`. Crée `tests/test_streak.py` (3 jours → notification ; 5 jours → seconde ; un trou casse la série ; deux connexions le même jour ne comptent qu'une fois).

### [MAJOR] ACC-12 — L'unicité de l'e-mail est sensible à la casse
- **Fichier :** `models.py` 53.
- **Problème :** `Alice@x.sn` et `alice@x.sn` peuvent coexister (admin, `objects.create`, import) ; la connexion passe en minuscules → compte en casse mixte inaccessible.
- **Instruction pour Gemini :** `UniqueConstraint(Lower('email'), name='uniq_user_email_lower')` ; `User.save()` met `email.lower()` ; retire `db_index=True` redondant ; vérifie d'abord l'absence de doublons dans la base.

### [MAJOR] ACC-13 — Un ancien administrateur garde `is_staff`
- **Fichier :** `models.py` 94-97.
- **Problème :** `save()` met `is_staff=True` pour `admin` mais ne le retire jamais.
- **Instruction pour Gemini :** si le rôle n'est pas `admin` : `is_staff=False` et `is_superuser=False` (sauf superutilisateurs explicitement créés). Test : rétrograder un admin retire `is_staff`.

### [MAJOR] ACC-14 — Codes expirés et sessions jamais purgés
- **Fichier :** `models.py` 190-257 ; `docker-compose.yml` (aucun `clearsessions`).
- **Instruction pour Gemini :** `retention.purge_expired_codes(now)` (codes > 24 h) et `call_command('clearsessions')` dans `apply_retention`.

### [MAJOR] ACC-15 — Une erreur sur un foyer arrête la conservation de tous les suivants
- **Fichier :** `retention.py` 119-168.
- **Problème :** aucun `try/except` par foyer ; la tâche boucle 24 h plus tard sur le même foyer en échec : les suppressions promises ne se font plus pour personne.
- **Instruction pour Gemini :** extrais `_process_household(...)`, appelle-la dans `try/except Exception: logger.exception(...); result['errors'] += 1`. Test : un foyer en exception n'empêche pas le suivant.

### [MAJOR] ACC-16 — Tests : scénarios décisifs absents
Rejeu du code de réinitialisation (ACC-01), corps non-objet (ACC-02), série de connexion (ACC-11), contenu complet de l'export (ACC-09), faux positif `icontains` (ACC-03), `assertNumQueries`, concurrence (même prénom d'enfant, deux consommations parallèles d'un code).
- **Instruction pour Gemini :** crée `tests/test_otp_bruteforce.py`, `test_malformed_bodies.py`, `test_streak.py`, `test_export_completeness.py`, `test_reactivation_suspension.py` ; ajoute `assertNumQueries` sur `GET /api/profile` et `GET /api/parent/children`.

### [MINOR] ACC-17 — Doubles écritures à la connexion
`views.py` 74-77 + `models.py` 105. **Gemini :** `User.objects.filter(pk=...).update(login_count=F('login_count')+1, last_seen_at=...)` et supprime la seconde sauvegarde.

### [MINOR] ACC-18 — Réinitialisation du mot de passe d'un enfant sans confirmation
`views.py` 531-548. **Gemini :** exige le mot de passe du parent via un helper commun `apps/accounts/confirmation.py::require_password` (réutilisé par `DeactivateAccountView` et `account._confirmed`).

### [MINOR] ACC-19 — Un élève d'école peut changer lui-même son nom affiché (à confirmer côté produit)
`views.py` 421-434. **Gemini :** pour `ROLE_STUDENT` avec `school_id`, ignore `displayName`.

### [MINOR] ACC-20 — `delete_cookie` sans `path`/`secure`
`views.py` 310 et 334. **Gemini :** `logout(request)` seul, ou `secure=settings.SESSION_COOKIE_SECURE, path='/'`.

### [MINOR] ACC-21 — Gabarit d'e-mail HTML de 40 lignes dans la vue
**Gemini :** `templates/accounts/email_code.html` et `.txt` + `render_to_string` (supprime les `escape` manuels).

### [MINOR] ACC-22 — Aucune journalisation de sécurité
**Gemini :** logger `keuria.security` (échec de connexion, verrouillage, réinitialisation, désactivation, suppression, changement de mot de passe d'enfant), sans e-mail ; e-mail « mot de passe modifié » après `ResetPasswordView`.

### [MINOR] ACC-23 — Imports à l'intérieur des fonctions pour éviter les cycles, non cohérents
**Gemini :** documente la règle en tête de fichier.

### [MINOR] ACC-24 — `get_streak` charge toutes les dates ; branche inatteignable
`models.py` 122-147 (lignes 143-144 mortes). **Gemini :** limite à 400 jours, arrête à la première rupture, supprime la branche morte.

### [MINOR] ACC-25 — `role` par défaut en dur ; `age_group` CharField(null=True) sans choices
**Gemini :** `default=ROLE_PARENT` ; `age_group` `blank=True, default='', choices=...` + migration `None → ''`.

### [MINOR] ACC-26 — `unique_together` et index redondant
`models.py` 153 et 160. **Gemini :** `UniqueConstraint` ; retire `db_index=True` de `connection_date` si inutile.

### [MINOR] ACC-27 — Index manquants pour la conservation/statistiques
**Gemini :** `indexes = [Index(fields=['role','school']), Index(fields=['last_seen_at'])]`.

### [MINOR] ACC-28 — PEP 8 : une seule ligne vide avant `AccountStatsSnapshot` ; pas de `__str__`
`models.py` 165.

### [MINOR] ACC-29 — Verrouillage : redondance et compromis non documenté
`throttling.py` 45-46 (ligne vide manquante) et 59 (condition redondante) ; 30 échecs répartis sur plusieurs IP verrouillent le propriétaire 15 min (le commentaire dit le contraire) ; débit `auth` 60/min/IP partagé entre toutes les routes (une classe de 35 élèves approche la limite). **Gemini :** `cache.delete_many([k for k in self.keys if ':ip:' not in k])` ; nuance le commentaire ; teste `AUTH_THROTTLE_RATE=120/min` en préproduction.

### [MINOR] ACC-30 — Routes doublées avec/sans `/` (≈20 lignes) ; certaines routes sans variante
`urls.py`. **Gemini :** `re_path(r'^auth/login/?$', ..., name='auth-login')` (conserve les noms d'origine sans suffixe `-slash`, après recherche de leurs usages).

### [MINOR] ACC-31 — Sémantique de `DELETE` ambiguë
`DELETE /parent/children/<id>` détache ; `POST …/delete` supprime. **Gemini :** route `POST /parent/children/<id>/unlink` (ancienne conservée une version avec `Deprecation`).

### [MINOR] ACC-32 — `take_snapshot` : 8 `COUNT` à chaque passage quotidien
`retention.py` 46-58 (`defaults` évalué avant `get_or_create`). **Gemini :** `filter(month=...).first()` d'abord.

### [MINOR] ACC-33 — Tous les parents chargés en mémoire par passage
`retention.py` 117-120. **Gemini :** préfiltre en base + `.iterator(chunk_size=500)`.

### [MINOR] ACC-34 — Passages concurrents possibles (double avertissement)
**Gemini :** verrou `cache.add('retention-lock', 1, timeout=3600)` ou `select_for_update(skip_locked=True)`.

### [MINOR] ACC-35 — Export : nom de fichier fautif, pas de mot de passe exigé
`account.py` 73 (`keria-mes-donnees.json`). **Gemini :** corrige le nom ; exige le mot de passe pour l'export parent.

### [MINOR] ACC-36 — `account_data` charge tout `Progress`/`DailyUsage` en mémoire
Borné à 8 enfants ; envisager `StreamingHttpResponse`.

### [MINOR] ACC-37 — `admin.py` : formulaire d'ajout inutilisable pour un modèle sans `username`
**Gemini :** `UserCreationForm`/`UserChangeForm` dédiés, champs `parent`, `school`, `email_verified`, `suspended_by_admin` dans `fieldsets`, `list_select_related = ('school',)`.

### [MINOR] ACC-38 — `int(last)` sur valeur de session corrompue
`authentication.py` 55. **Gemini :** `try/except (TypeError, ValueError)`.

### [MINOR] ACC-39 — Permissions : pas de `IsSchoolAdmin`/`IsTeacher` centralisés dans `accounts` (redéfinis dans `scolaire`)
### [MINOR] ACC-40 — `apps.py` enregistre les checks de `keuria.checks` (couplage)
**Gemini :** déplace vers un `KeuriaConfig`.

### [MINOR] ACC-41 — Organisation des tests
`test_security.py` (641 lignes) mélange des sujets d'autres apps ; préfixes `T01…` renvoyant à un fichier Excel externe ; `test_student_isolation.py` n'a qu'un test. **Gemini :** déplace les tests d'écoles/analytics/superadmin vers leurs apps ; noms descriptifs.

### [MINOR] ACC-42 — Mesure de couverture
**Gemini :** installe `requirements-dev.txt`, lance `coverage run --branch -m pytest apps/accounts && coverage report -m` et communique le chiffre.

---

## 6. Application `superadmin`

**Fichiers lus :** `models.py`, `views.py`, `curriculum_views.py`, `urls.py`, `services.py` (610 lignes), `school_space.py`, `curriculum_service.py`, `apps.py` ; noms des 25 tests (3 fichiers). Migrations (2) non relues. Pas de `serializers.py` ni de `admin.py`.
**Points solides :** `IsAdminRole` sur toutes les vues, espace école en lecture seule, un admin ne peut ni se désactiver, ni se supprimer, ni se rétrograder, comptes d'école protégés, suspension d'école confirmée par saisie du nom, opérations du Studio atomiques avec leur journal.

### [MAJOR] SUP-01 — Mots de passe provisoires faibles et sans changement obligatoire
- **Fichier :** `scolaire/identifiers.py` 10 et 37-39 ; `superadmin/services.py` 303-312, 384-391, 456-480 ; aussi utilisé pour les directions, enseignants, **élèves mineurs** (SCO).
- **Problème :** 10 mots × 9 000 nombres = 90 000 combinaisons (~16 bits) ; aucun changement forcé ; identifiants élèves prévisibles (`prenom.nom@ecole.keuria.sn`) ; `Lion-4821` (9 caractères) serait refusé par le minimum de 12 recommandé (KEU-07).
- **Instruction pour Gemini :** `generate_temporary_password` : 3 mots parmi ≥ 256 + 4 chiffres, ou `secrets.token_urlsafe(9)` (fiches lisibles par un enfant). Ajoute `User.must_change_password = BooleanField(default=False)` (migration), positionné à `True` dans `_create_admin`, `reset_school_admin_password`, `create_account` (si généré), et dans les services `scolaire` (création/réinitialisation d'enseignants/élèves). `profile_payload` expose `mustChangePassword` ; vue `ChangePasswordView` (ancien mot de passe + `check_password_policy`) ; `KeurSessionAuthentication` refuse (403 `passwordChangeRequired`) tout sauf profil, déconnexion et changement de mot de passe tant que le champ est vrai. Frontend : page de changement forcé.

### [MAJOR] SUP-02 — Comptes de la plateforme sans double authentification ni ré-authentification
- **Fichier :** `services.py` 456-480 (création de comptes admin), 483-502, 519-530 ; `accounts/views.py` 229-233 (`two_factor_enabled` réservé au rôle parent).
- **Problème :** un admin peut créer d'autres admins, réinitialiser le mot de passe de toute direction (renvoyé dans la réponse) et supprimer des comptes ; une session volée suffit.
- **Instruction pour Gemini :** `two_factor_enabled` renvoie toujours `True` pour `ROLE_ADMIN` et `ROLE_SCHOOL_ADMIN` (le code par e-mail `LoginCode` existe). Exige le mot de passe de l'acteur (helper `require_password`, `LoginLockout(scope='sensitive')`) dans `AccountsView.post` (rôle admin), `AccountView.delete`, `SchoolAdminPasswordView.post`, `SchoolAdminsView.post`.

### [MAJOR] SUP-03 — Suspension d'un compte par l'équipe : marqueur dans le journal, jamais levé
Voir **ACC-03**. **Gemini :** dans `set_account_status` (lignes 513-515), écris `user.suspended_by_admin = (value == 'desactive')` avec `update_fields=['is_active','suspended_by_admin']`.

### [MAJOR] SUP-04 — Liste des écoles en ~11 requêtes par école, filtrage en Python
- **Fichier :** `services.py` 223-253 (`_school_row`, `list_schools`).
- **Problème :** `current_year(school)` peut même **écrire** pendant un GET ; 500 requêtes pour 50 écoles.
- **Instruction pour Gemini :** filtre d'abord en base (`Q(name__icontains)|…`), annote avec `Count(..., filter=..., distinct=True)` (classes, élèves, enseignants, actifs de la semaine, classes sans enseignant) et `Prefetch('members', queryset=…admins…, to_attr='school_admins')` ; version « détail » séparée pour `get_school`. `current_year` hors des lectures (création dans `create_school`). Test `assertNumQueries` avec 10 écoles.

### [MAJOR] SUP-05 — `GET` qui écrit : `sync_programme_missions()` à chaque ouverture de la bibliothèque
- **Fichier :** `services.py` 535-540 (et `scolaire/services/enseignant.py` 260, voir SCO-07).
- **Instruction pour Gemini :** retire l'appel de `list_missions` ; appelle-le depuis `curriculum_service` (fin de `save_lesson`, `delete_lesson`, `duplicate_lesson`, `save_module`) via `transaction.on_commit` ; garde la commande `sync_programme_missions`.

### [MAJOR] SUP-06 — Journal d'activité d'une école chargé en entier en mémoire
- **Fichier :** `school_space.py` 354-364.
- **Instruction pour Gemini :** ne charge que `page * PAGE_SIZE` lignes de chaque source (`order_by('-at')[:…]`), fusionne avec `heapq.merge`, `total` par deux `count()` ; index `Index(fields=['school','-at'])` sur `AuditLog` et `SchoolActivity`.

### [MAJOR] SUP-07 — `learners()` renvoie tous les apprenants sans pagination
- **Fichier :** `services.py` 203-211 ; dépend de `progress/services.build_admin_dashboard` (voir PRO-11).
- **Instruction pour Gemini :** restreins à `role=ROLE_STUDENT`, ajoute `page`/`pageSize` (50) et un filtre `schoolId` ; `analytics` en cache 60 s.

### [MAJOR] SUP-08 — Corps de requête non-objet → 500 sur toutes les routes d'écriture
- **Fichier :** `views.py` (`request.data.get('confirmation')`, `'status'`, `'active'`, `'direction'`…), `curriculum_views.py` (`dict(request.data)`).
- **Instruction pour Gemini :** `json_object(request)` dans `scolaire/errors.py` (voir TRV-02) ; surcharge `AdminView.initial()` pour valider une seule fois pour `POST/PATCH/PUT`. Test `[]` → 400.

### [MAJOR] SUP-09 — Journal et action non atomiques ; course sur « dernière direction active »
- **Fichier :** `services.py` : `update_school`, `suspend_school`, `reactivate_school`, `reset_school_admin_password`, `set_school_admin_status` (lignes 400-404), `update_account` (ligne 500 `user.save()` complet), `set_account_status`, `delete_account`, `create_account`, `update_mission`, `set_mission_active`.
- **Problème :** si `audit()` échoue, un mot de passe est réinitialisé ou un compte supprimé sans trace ; deux désactivations simultanées peuvent laisser une école sans direction active ; `save()` complet écrase des champs concurrents.
- **Instruction pour Gemini :** `@transaction.atomic` sur chaque fonction ; `select_for_update()` sur les directions dans `set_school_admin_status` ; `save(update_fields=[...])` dans `update_account`.

### [MAJOR] SUP-10 — Le journal d'audit conserve des adresses e-mail sans limite de durée
- **Fichier :** `services.py` 478, 501, 530 ; `models.py`.
- **Instruction pour Gemini :** `retention.purge_audit_log(now)` (`AUDIT_RETENTION_DAYS`, 730 par défaut) appelée par `apply_retention` ; journalise `Compte #{id} supprimé` (identifiant, pas l'e-mail) ; anonymise les libellés contenant l'adresse dans `delete_household` ; documente dans `docs/DONNEES_PERSONNELLES.md`.

### [MAJOR] SUP-11 — `services.py` : 610 lignes, 5 domaines ; `dashboard()` fait 125 lignes
- **Instruction pour Gemini :** transforme en paquet `services/` : `dashboard.py`, `schools.py`, `accounts.py`, `missions.py`, `audit.py`, `common.py` ; réexporte dans `__init__.py` ; découpe `dashboard()` en `_kpis`, `_to_handle`, `_tracks_progress`, `_achievements`, `_leaderboard` ; supprime les noms privés importés par `school_space.py`.

### [MAJOR] SUP-12 — Un `PATCH` partiel d'une leçon efface le contenu pédagogique et réinitialise les champs
- **Fichier :** `curriculum_service.py` 95-165 (`save_lesson`), 169-232 (`save_module`) ; `curriculum_views.py` 35-42.
- **Problème :** `_clean_content(data.get('content'))` transforme l'absence de `content` en `{}` → tous les champs pédagogiques écrasés par des vides ; `type='histoire'`, `minutes=5`, `xp=20`, `stars=3`, `order=1` remplacent les valeurs non renvoyées ; `PATCH` sur un identifiant inconnu **crée** la leçon. Même défaut dans `save_module` (`icon`, `color`, `description`).
- **Instruction pour Gemini :** sépare `create_lesson` (POST) et `update_lesson(user, lesson_id, data)` (PATCH : charge l'existant, 404 sinon, ne modifie que les clés présentes ; le contenu seulement si `'content' in data`). Idem `create_module` / `update_module`. Tests : PATCH `{title}` conserve contenu, `xp`, `type` ; identifiant inconnu → 404.

### [MAJOR] SUP-13 — Modification et suppression « en direct », sans brouillon ni retour arrière
- **Fichier :** `curriculum_service.py` 235-242 (`delete_lesson`).
- **Problème :** toute édition est immédiatement visible des enfants ; la suppression est définitive ; les `Progress` (clé par chaîne `lesson_id`) deviennent orphelins (les missions liées sont désactivées par `sync_programme_missions`).
- **Instruction pour Gemini :** `Lesson.status` (`draft`/`published`, défaut `draft`) + table `LessonRevision` (leçon, contenu JSON, auteur, date) écrite à chaque `update_lesson` ; les vues élèves ne servent que `published` ; remplace `delete_lesson` par un archivage (`archived_at`) ; suppression définitive refusée si des `Progress` référencent la leçon. Deux migrations. À coordonner avec CUR.

### [MAJOR] SUP-14 — Tests : scénarios absents
PATCH partiel (SUP-12), corps `[]` (SUP-08), `assertNumQueries` (`list_schools`, `search`, `dashboard`, `activity`), course sur la dernière direction, `?schoolId=abc`, journal présent pour chaque action sensible (réinitialisation de mot de passe, suppression, désactivation de direction), `compte_desactive` puis `compte_reactive`, mot de passe provisoire (longueur, unicité, changement obligatoire), création d'un administrateur.
- **Instruction pour Gemini :** crée `tests/test_audit_completeness.py`, `test_query_counts.py`, `test_malformed_bodies.py`, `test_studio_partial_update.py`, `test_temp_passwords.py` ; déplace `TeacherSchoolRouteTests` (route enseignant) vers `schools/tests/`.

### [MINOR] SUP-15 — `AuditLog` : pas d'identifiant de requête ni d'IP, pas d'index sur `action`/(`school`,`-at`), pas de `__str__`
**Gemini :** `request_id` (depuis `keuria.observability.current_request_id()`), `ip`, `indexes = [Index(['school','-at']), Index(['action','-at'])]`.

### [MINOR] SUP-16 — `?schoolId=abc` renvoie les comptes hors école
`services.py` 427-431 : `filter(school_id=None)` = `IS NULL`. **Gemini :** `ApiError('Identifiant d\'école invalide.')` si `parse_id` est `None`.

### [MINOR] SUP-17 — Code mort
`services.py` 491-492 (second `if user.school_id:` inatteignable). **Gemini :** supprime.

### [MINOR] SUP-18 — Validation d'e-mail maison et doublée ; `IntegrityError` non rattrapée dans `create_account`
`EMAIL_RE`, lignes 292-300 et 462-477. **Gemini :** `validate_email` de Django ; `_check_new_email` partagé ; `try/except IntegrityError`.

### [MINOR] SUP-19 — `slug` non-chaîne → 500
`_free_slug`. **Gemini :** `if not isinstance(wanted, str): raise ApiError(...)`.

### [MINOR] SUP-20 — `Count` multiples sur deux relations sans `distinct=True`
Lignes 80-96 (comparaisons `== 0` justes par chance). **Gemini :** `distinct=True`.

### [MINOR] SUP-21 — `last_seen_at__date=` empêche l'usage d'un index
Ligne 186. **Gemini :** plage `gte/lt`.

### [MINOR] SUP-22 — Libellés/couleurs des parcours codés en dur dans le service
Lignes 105-108. **Gemini :** lis `AgeTrack` ; couleurs au frontend.

### [MINOR] SUP-23 — Numérotation `m{max+1}` des missions : doublon sous concurrence
Lignes 564-565. **Gemini :** séquence en base ou retry sur `IntegrityError`.

### [MINOR] SUP-24 — Contenu du Studio validé en surface (listes `questions`, `steps`, `vocabulary`, `activity`)
**Gemini :** serializers `QuestionSerializer`, `StepSerializer`, `ActivitySerializer` (types, bornes, une seule bonne réponse) dans `_clean_content`.

### [MINOR] SUP-25 — `reorder_lesson` : ordres égaux mal résolus
`curriculum_service.py` 245-275 ; `order=1` par défaut. **Gemini :** échange dans la liste puis renumérote 1..n (`bulk_update`) ; défaut `order = count + 1`.

### [MINOR] SUP-26 — `ValueError` comme erreur de validation, `try/except` copié 5 fois ; `dict(request.data)`
**Gemini :** `ApiError` (déjà géré par `ScolaireView`) ; supprime les `try/except` ; `json_object(request)`.

### [MINOR] SUP-27 — `list_curriculum_studio` : tout le programme (avec contenu) en une réponse
**Gemini :** mesure ; si > 500 Ko, ne renvoie que les en-têtes de leçons (détail via `get_lesson_detail`) et retire `content` du `prefetch_related`.

### [MINOR] SUP-28 — Génération d'identifiants par boucles d'`exists()` ; `module_id` non mis en minuscules dans `save_lesson`
**Gemini :** `.lower()` ; génération en une requête.

### [MINOR] SUP-29 — `school_space` : N+1 sur les parents (≤ 20), toutes les écoles chargées pour la recherche, dédoublonnage par libellé, recherche élèves sensible aux accents, pas de longueur maximale
Lignes 387-418. **Gemini :** `Prefetch`, filtre en base `[:SEARCH_LIMIT]`, dédoublonnage par (`kind`, id), normalisation commune, `raw` ≤ 100 caractères.

### [MINOR] SUP-30 — Isolation inter-écoles à confirmer dans `ecole.*`
Vérifiée dans SCO (`get_classroom`, `get_student`, `get_teacher` filtrent bien sur `school`).

### [MINOR] SUP-31 — Routes sans `name=`, pas de serializers (OpenAPI vide), actions sensibles sans throttle dédié
**Gemini :** `name='superadmin-…'`, `superadmin/serializers.py` + `@extend_schema`, `ScopedRateThrottle` (30/min) sur réinitialisation de mot de passe, création d'administrateur, suppression de compte.

---

## 7. Application `scolaire`

**Fichiers lus :** `models.py`, `views.py`, `urls.py`, `permissions.py`, `errors.py`, `identifiers.py`, `levels.py`, `themes.py`, `payloads.py`, `mission_quizzes.py` (en-tête et `quiz_for`), `services/` (`common`, `ecole` 814 lignes, `enseignant`, `eleve`, `liens`, `imports`, `annee`, `classement`, `programme`, `programme_enseignant`), commandes `create_school_admin`, `sync_programme_missions`, début de `seed_demo_school` ; noms des 145 tests (13 fichiers). Non relus : migrations (10), 243 lignes de `seed_demo_school`, données statiques de `mission_quizzes.py` (120-195).
**Points solides :** cloisonnement par école de la session, périmètre enseignant strict, notation côté serveur (première réponse définitive, correction après réponse), clôture d'année encadrée et annulable, `safe_cell` anti-injection de formules, logo vérifié par Pillow (SVG refusé), site web limité à http(s).

### [MAJOR] SCO-01 — Les opérations en masse dépassent le délai de gunicorn (60 s)
- **Fichier :** `services/ecole.py` 668-690 (`create_students`), 498-515 (`create_teachers`), 780-796 (`issue_student_credentials`) ; `services/enseignant.py` 229-250 (`issue_credentials`).
- **Problème :** chaque compte = un hachage PBKDF2 (~0,5 s) + ~10 requêtes (`taken` ligne 647, `students_qs().get`, code parent). `MAX_BULK = 500` est irréaliste : le worker est tué au milieu d'une transaction (502/500, rien créé). Un import de 150 élèves est déjà à risque ; une fiche de connexion de 50 élèves approche la limite.
- **Instruction pour Gemini :** `MAX_BULK = 40`. Le frontend découpe en lots de 40 (requêtes atomiques, progression affichée, erreur avec numéro de ligne global) ; pour garder « tout ou rien », table `ImportBatch` (école, identifiant, statut) et endpoint `import/rollback`. Alternative robuste : `ThreadPoolExecutor` + table `ImportJob` avec polling. Précalcule `taken` une seule fois pour le lot (`User.objects.filter(email__endswith=f'@{school.slug}.keuria.sn')`). Test : 40 élèves créés en moins de 20 s.

### [MAJOR] SCO-02 — Supprimer une classe archivée efface l'historique des devoirs
- **Fichier :** `services/ecole.py` 413-419 ; `models.py` 179, 190, 204 (`CASCADE`).
- **Problème :** seule la présence d'élèves *actuels* empêche la suppression ; après clôture d'année la classe archivée est vide et supprimable → destruction des devoirs, rendus et réponses de l'année.
- **Instruction pour Gemini :** refuse (409) si la classe est archivée **ou** si `Assignment.objects.filter(classroom=classroom).exists()` ; `Assignment.classroom` en `on_delete=models.PROTECT` (migration). Test dédié.

### [MAJOR] SCO-03 — Listes d'élèves non paginées, filtrées en Python, agrégat recalculé partout
- **Fichier :** `services/ecole.py` 560-576, 801-807 ; `payloads.py` 387-392 (`students_qs`).
- **Problème :** `list_students` charge tous les élèves avec agrégat XP/leçons (jointure + `GROUP BY`) puis filtre la recherche en Python ; le même agrégat est rejoué à chaque `get_student` (même pour un contrôle d'appartenance), `_students`, `list_parents`.
- **Instruction pour Gemini :** sépare `students_qs(school)` (sans agrégat) et `students_with_totals(school)` (`Subquery`/`Coalesce`). Pagination (`page`, `pageSize` 50). Recherche en base : `StudentProfile.search_name` (normalisé, rempli dans `save()`, `db_index=True`) + `search_name__contains`. Frontend en pagination serveur.

### [MAJOR] SCO-04 — `ecole.py` : 814 lignes, 8 domaines, importé par d'autres modules pour des noms privés
- **Problème :** `enseignant.py` importe `plural`, `imports.py` importe `_birth_date_problem`/`_email_problem`, `annee.py` importe `plural` ; `EMAIL_RE` dupliqué.
- **Instruction pour Gemini :** paquet `services/ecole/` : `school.py`, `dashboard.py`, `classrooms.py`, `teachers.py`, `students.py`, `parents.py`, `validators.py` (`email_problem`, `birth_date_problem`, `matricule_problem`) ; `plural` dans `services/common.py` ; `validate_email` de Django ; réexport dans `__init__.py`.

### [MAJOR] SCO-05 — Le code de liaison parent peut être deviné par des comptes jetables
- **Fichier :** `services/liens.py` 22-26, 118-141 ; `permissions.py` 25-29 (`LinkCodeRateThrottle` 10/h **par utilisateur**).
- **Problème :** 6 caractères sur 31 symboles (~887 M), stocké en clair (décision assumée) ; l'inscription parent est gratuite : chaque compte ajoute 10 essais/h. Avec 10 000 codes actifs, ~1 chance sur 90 000 par essai ; ~100 comptes jetables suffisent à lier un compte à l'enfant d'une école (accès aux données/notifications de l'enfant). Aucun plafond de foyer dans `redeem`.
- **Instruction pour Gemini :** dans `redeem` : (1) second facteur — prénom de l'élève (comparé avec `normalize_text`) en plus du code, message d'échec identique ; (2) `LoginLockout(f'redeem:{parent.id}', client_ip(request), scope='linkcode')` + compteur par IP, `LinkCodeIpThrottle` (30/h/IP) dans `throttle_classes` ; (3) `CODE_LENGTH = 8` ; (4) plafond `MAX_CHILDREN_PER_PARENT` ; (5) exige `email_verified=True` et compte créé depuis > 10 min. Tests : 11 essais ratés bloquent ; 3 comptes derrière la même IP partagent le compteur.

### [MAJOR] SCO-06 — Les réponses des élèves sont rattachées à la position des questions du contenu *en direct*
- **Fichier :** `mission_quizzes.py` (`quiz_for`), `services/programme.py` 61-71, `services/eleve.py`.
- **Problème :** si l'équipe corrige une leçon pendant qu'un devoir est en cours (ajout/suppression/ordre de questions), les index `AssignmentAnswer.step` pointent vers d'autres questions et les notes deviennent incohérentes. Si le contenu perd toutes ses questions (cf. SUP-12), `quiz_for` retombe sur `DEFAULT_QUIZ` : l'élève passe le quiz générique « Oui, je suis prêt ! » pour un devoir de leçon, avec gain d'XP complet.
- **Instruction pour Gemini :** `Assignment.quiz_snapshot = JSONField(default=list)` (migration + donnée : `quiz_for` pour l'existant), rempli dans `enseignant.assign` ; `eleve.py` et `_question_stats` lisent le snapshot. `assign` refuse (400) si `quiz_for` renvoie `DEFAULT_QUIZ` pour une mission `lecon`/`bilan` ; `quiz_for` ne retombe plus sur `DEFAULT_QUIZ` pour les missions non `libre`. Test : modifier les questions après attribution ne change ni quiz ni note.

### [MAJOR] SCO-07 — `GET` qui écrit : `sync_programme_missions()` à chaque ouverture de la bibliothèque enseignant
- **Fichier :** `services/enseignant.py` 260. **Instruction pour Gemini :** voir SUP-05.

### [MAJOR] SCO-08 — Corps de requête non-objet → 500 sur une vingtaine de routes
- **Fichier :** `views.py` : `TeachersBulkView`, `StudentsBulkView`, `TeacherStatusView`, `StudentMoveView`, `StudentStatusView`, `CredentialsView`, `ImportPreviewView`, `TeacherClassCredentialsView`, `RedeemLinkCodeView` (`liens._parent_identity`).
- **Instruction pour Gemini :** `json_object(request)` dans `errors.py` ; `ScolaireView.initial()` vérifie une fois pour `POST/PATCH/PUT/DELETE` (sauf `ImportReadView` et `SchoolView.patch`, multipart). Test `[]`, `"x"`, `null` → 400.

### [MAJOR] SCO-09 — Tests : scénarios absents
Création de 40+ comptes (durée, atomicité) ; brute-force du code parent multi-comptes/IP ; modification des questions pendant un devoir ; suppression d'une classe archivée avec devoirs ; corps non-objet ; `assertNumQueries` (`list_students`, `list_parents`, `teacher_programme`, `overview`) ; pagination ; création simultanée d'homonymes et de même matricule ; .xlsx à millions de lignes vides ; isolation inter-écoles **paramétrée sur toutes les routes** ; deux enseignants ouvrant la bibliothèque.
- **Instruction pour Gemini :** crée `tests/test_bulk_limits.py`, `test_link_code_bruteforce.py`, `test_quiz_snapshot.py`, `test_delete_archived_classroom.py`, `test_malformed_bodies.py`, `test_query_counts.py`, `test_cross_school_isolation.py` (itère sur `urlpatterns`, deux écoles, identifiants croisés → 403/404). Fusionne `test_seed_guard.py` dans `test_seed_demo_guard.py`.

### [MINOR] SCO-10 — Classements : calculs globaux refaits pour chaque école, jamais invalidés
`ecole.py` 155-281 : `_build_school_leaderboard` mis en cache par école mais calcule 3 agrégats globaux (100 écoles = 100 fois/heure) ; `user_id__in=ids` (limites de paramètres). **Gemini :** `cache.get_or_set('school_ranking_global', …, 3600)` ; `cache.delete(f"classroom_leaderboard_{school.id}")` dans `move_student`, `close_year`, `undo_closure`, `archive_classroom` ; sous-requêtes à la place des listes d'ids.

### [MINOR] SCO-11 — `update_school` : pas de transaction ni de journal ; ancien logo supprimé avant la sauvegarde ; `removeLogo is True` ne marche qu'en JSON
`ecole.py` 120-152. **Gemini :** `transaction.atomic`, suppression du fichier via `on_commit`, `removeLogo in (True,'true','1')`, `log_activity('ecole_modifiee')`.

### [MINOR] SCO-12 — Actions non journalisées / non atomiques
`set_student_status`, `set_teacher_status`, `update_teacher`, `update_student`, `reset_*`. **Gemini :** `log_activity` (`eleve_desactive`, `eleve_reactive`, `enseignant_desactive`, `enseignant_modifie`) et `@transaction.atomic`.

### [MINOR] SCO-13 — `_insert_student` : `IntegrityError` non rattrapée (identifiant), prénom sans caractère latin → `.@ecole.keuria.sn`
`ecole.py` 645-656. **Gemini :** 3 essais sur `IntegrityError` ; rejette un prénom/nom dont `slugify_name` est vide.

### [MINOR] SCO-14 — Matricule : contrôle en code puis contrainte, `IntegrityError` non rattrapée
`ecole.py` 585-590. **Gemini :** `ApiError('Ce matricule vient d\'être attribué.')`.

### [MINOR] SCO-15 — `liens.unlink` non atomique et sans nettoyage
`liens.py` 91-103. **Gemini :** `@transaction.atomic`, supprime `ParentalLimits`, `ParentNotification` et `ScreenTimeCredit` du couple (voir PRO-06).

### [MINOR] SCO-16 — Unicité du code de liaison actif non garantie
`liens.py` 50-52. **Gemini :** `UniqueConstraint(fields=['code'], condition=Q(used_at__isnull=True, revoked_at__isnull=True))`.

### [MINOR] SCO-17 — L'enseignant voit e-mail et téléphone du parent
`liens.link_info` via `enseignant.parent_link`. **Gemini :** paramètre `include_contact` (faux pour l'enseignant).

### [MINOR] SCO-18 — Leçons à identifiant > 18 caractères ignorées sans message
`programme.py` 105-107 (`MAX_ID_LENGTH = 20`) alors que le Studio accepte 100 (`ID_RE`). **Gemini :** refuse > 18 caractères dans `save_lesson` ; `logger.warning` dans `desired_missions`.

### [MINOR] SCO-19 — Vues élève sans permission explicite ; liste de devoirs sans borne
`views.py` 358-382 ; `eleve.py` 168-240. **Gemini :** `IsSchoolStudent` (rôle `eleve` + `school_id`) ; filtre sur les devoirs de moins de 12 mois.

### [MINOR] SCO-20 — `teacher_programme` : le `prefetch_related` est annulé par `.order_by()` (≥ 100 requêtes)
`programme_enseignant.py` 89-98. **Gemini :** `sorted(track.modules.all(), …)` ou `Prefetch(..., queryset=…order_by(...))` ; `assertNumQueries` ≤ 6.

### [MINOR] SCO-21 — `assign` : règle « pas deux fois la même mission » non sûre sous concurrence ; requête par classe
`enseignant.py` 316-320. **Gemini :** `select_for_update()` sur la classe.

### [MINOR] SCO-22 — `class_analytics.needs_help` en O(élèves × rendus × devoirs)
**Gemini :** dictionnaire `completions_by_student` calculé une fois.

### [MINOR] SCO-23 — `MatriculeCheckView` : `ignore.isdigit()` (« ² ») → `int()` lève `ValueError` → 500
`views.py` 136. **Gemini :** `parse_id(ignore)`.

### [MINOR] SCO-24 — `.xlsx` : les lignes vides ne comptent pas dans `MAX_ROWS` (CPU jusqu'au délai) ; pas de plafond de colonnes
`imports.py` 105-110. **Gemini :** compte toutes les lignes parcourues (`> MAX_ROWS * 5` → erreur), tronque à 20 cellules.

### [MINOR] SCO-25 — Aperçu d'import : une requête par ligne ; plafonds incohérents (2000 aperçu / 500 création)
`imports.py` 259-266, `ecole._email_problem`. **Gemini :** `User.objects.filter(email__in=emails)` une fois ; aligne avec le lot de 40 ; supprime la double vérification d'extension et la triple ligne vide (E303).

### [MINOR] SCO-26 — Lecture PDF sans limite de temps
`imports.py` 44-86. **Gemini :** 15 s de plafond ou exécution dans le pool d'import.

### [MINOR] SCO-27 — `close_year` : `DoesNotExist` si pas d'année en cours ; boucles d'écritures individuelles
`annee.py` 172, 187-238. **Gemini :** `current_year(school)` avant ; `bulk_update` par classe de destination.

### [MINOR] SCO-28 — `archive_downloaded_at` enregistré à la génération du CSV, pas au téléchargement
`annee.py` 131-152. **Gemini :** endpoint `years/archive/confirm` ; `close_year` exige ce champ.

### [MINOR] SCO-29 — `undo_closure` : `Classroom.objects.get` par élève, double sauvegarde
`annee.py` 265-275. **Gemini :** dictionnaire de classes + `bulk_update`.

### [MINOR] SCO-30 — Modèle : intégrité et typage
`Classroom.academic_year` (CharField dupliquant `AcademicYear.label`), `archived_student_ids` JSON sans intégrité, `Mission.kind/track/category/difficulty` et `SchoolActivity.kind` sans `choices`, `AssignmentCompletion.score` sans borne, `StaffProfile.school` dupliquant `user.school`, pas d'index (`school`,`-at`) sur `SchoolActivity`. **Gemini :** `TextChoices`, `MaxValueValidator(100)` + `CheckConstraint(score__lte=100)`, `Index(['school','-at'])`, `Index(['school','classroom'])` ; normalisation de `academic_year` en clé étrangère dans une migration séparée ; `__str__` manquants (`Assignment`, `AssignmentCompletion`, `AssignmentAnswer`, `SchoolActivity`, `ParentProfile`, `ParentLinkCode`, `YearClosure`).

### [MINOR] SCO-31 — `current_year()` crée une année pendant un `GET` ; deux premières requêtes simultanées → `IntegrityError` → 500
`payloads.py` 482-489. **Gemini :** `get_or_create` + capture d'`IntegrityError`, ou création à la création de l'école uniquement.

### [MINOR] SCO-32 — Identifiants et mots de passe provisoires : voir SUP-01 (comptes d'élèves mineurs, même priorité) ; `is_reserved_login_email` non appelé à l'inscription publique : voir ACC-04
### [MINOR] SCO-33 — Commandes : `create_school_admin` affiche le mot de passe en sortie standard (journaux d'orchestrateur) et ne force pas le changement ; `seed_demo_school` imports `datetime` séparés
**Gemini :** `must_change_password=True`, option `--no-print-password` (envoi par e-mail) ; fusionne les imports.

### [MINOR] SCO-34 — `urls.py` sans `name=` ; pas de serializers (OpenAPI vide)
Voir SUP-31.

### [MINOR] SCO-35 — Tests : pas de fabriques communes
**Gemini :** `make_school`, `make_teacher`, `make_student` dans `tests/helpers.py`.

---

## 8. Application `progress`

**Fichiers lus :** `models.py`, `views.py` (834 lignes), `parental.py`, `xp.py`, `services.py`, `levels.py`, `leaderboard.py`, `challenge.py`, `riddle.py`, `palou.py`, `push.py`, `mailing.py`, `urls.py`, `admin.py`, 3 commandes ; noms des 215 tests (14 fichiers). Migrations (24) non relues.
**Vérifié par recherche :** aucun code d'exécution ne crée de `QuizAttempt` ; `docker-compose.yml` ne planifie ni `send_weekly_reports` ni `clearsessions`.
**Points solides :** XP lue dans le catalogue serveur, `select_for_update`/`get_or_create` + repli `IntegrityError`, contrôle parental filtré sur `parent.children`, Palou éteint par défaut + masquage e-mails/téléphones, liste blanche anti-SSRF pour le push, classements en prénom + initiale.

### [MAJOR] PRO-01 — Badges attribuables à soi-même avec une seule requête
- **Fichier :** `views.py` 713-757 (`MarkEventSeenView`) et 66-101 (`compute_badges`).
- **Problème :** `POST /api/progress/mark-event-seen {"event":"badge_anim_b_detective"}` crée `EarnedReward(reward_type=BADGE, reward_id='b_detective')` ; `compute_badges` considère comme acquis tout badge présent dans `EarnedReward` → badge gratuit (idem `b_hidden_friend`, `b_persist`, `b_secret`…), visible chez le parent. Chaque chaîne distincte crée une ligne : aucune borne par utilisateur. Cause : la table sert à la fois de « obtenu » et de « animation vue ».
- **Instruction pour Gemini :** liste blanche construite côté serveur (`badge_anim_` + id de `BADGES_DEFINITIONS`, `level_anim_` + nom de `LEVEL_TIERS`, `reward_` + id de diplôme existant, `tuto_done`, `games_tutorial`). Pour `badge_anim_*`, **ne crée jamais** de ligne : `EarnedReward.objects.filter(user=user, event_key=event).update(seen_at=now)`. `EarnedReward.earned = BooleanField(default=False)` mis à `True` uniquement par le serveur (`compute_badges`/`RecordActivityView`) ; `compute_badges` ligne 69 filtre dessus. Plafond de 200 `EarnedReward` par utilisateur. Test : `badge_anim_b_detective` sans condition remplie ne donne pas le badge.

### [MAJOR] PRO-02 — Une leçon est « terminée » dès que le client l'annonce
- **Fichier :** `views.py` 256-353 (`ProgressView.post`) et 763-831 (`RecordActivityView`).
- **Problème :** l'XP vient du catalogue (bien) mais rien ne prouve que la leçon a été jouée : un enfant envoie tous les `lessonId` de son parcours (identifiants publics) et obtient XP, badges, paliers, énigmes (qui dépendent des leçons terminées), première place du classement d'école. `score`/`stars` viennent du client. `RecordActivityView` : `b_persist` = 20 requêtes `type=error`.
- **Instruction pour Gemini :** (1) impose l'ordre du parcours (leçon précédente du module terminée, sinon 409) ; (2) délai minimal entre deux leçons (`lesson.minutes * 20` s, via cache) ; (3) pour les leçons à quiz : endpoint `POST /api/lessons/<id>/submit` qui reçoit les réponses, calcule `score` côté serveur et seul appelle `record_xp` (nécessite CUR-01 : ne plus exposer `correct`). En attendant : `ScopedRateThrottle` 30 leçons/heure et classements déclarés « non fiables ». Test : 20 leçons en 5 s refusées.

### [MAJOR] PRO-03 — E-mails et push envoyés *dans* la requête de l'enfant
- **Fichier :** `views.py` 109-124 et 335-351 ; `mailing.py` ; `push.py` 69-96.
- **Problème :** SMTP (timeout 10 s) + un appel HTTP de 5 s par appareil, jusqu'à une dizaine d'envois bloquants par leçon terminée (leçon + palier + plusieurs badges) ; 2 threads par worker.
- **Instruction pour Gemini :** garde la création de `ParentNotification` (rapide) ; envois via `transaction.on_commit(lambda: executor.submit(_deliver, ...))` dans `apps/progress/delivery.py` (même exécuteur que `accounts/mailer.py`, TRV-03) ; plafond d'1 e-mail + 1 push par parent et par heure par type (`cache.add`) ; regroupe plusieurs badges gagnés ensemble en une alerte.

### [MAJOR] PRO-04 — Une quinzaine de requêtes par enfant à chaque chargement du tableau de bord parent
- **Fichier :** `views.py` 501-533 (`ParentTrackingView`), 413-435 (`time_spent_payload`), 443-494 (`pedagogy_payload`).
- **Problème :** pour 8 enfants > 100 requêtes ; `get_streak()` calculé deux fois ; `time_spent_payload` charge tout l'historique `DailyUsage` à chaque appel.
- **Instruction pour Gemini :** un seul `get_streak()` ; `time_spent_payload` sur 35 jours + `aggregate(Sum, Min)` pour total/`since` ; `compute_badges` accepte `stats`/`rewards` préchargés ; précharge par `values('user').annotate(...)` pour tous les enfants ; cache 30 s (`tracking:{parent.id}`) ; test `assertNumQueries` borné pour 8 enfants.

### [MAJOR] PRO-05 — `GET /progress` écrit en base
- **Fichier :** `views.py` 175-254.
- **Problème :** enregistrement de connexion (`get_or_create` + `UPDATE` + lecture de toutes les dates), création de `LearnerStats`, `EarnedReward` (`compute_badges`, `mark_seen`), `bulk_update` — à chaque affichage du tableau de bord.
- **Instruction pour Gemini :** retire `record_connection_and_get_streak` de `ProgressView.get` (déjà fait par `start_session`) ; `compute_badges` pur (sans écriture) ; enregistre les badges gagnés dans `post`/`RecordActivityView` ; crée `LearnerStats` à l'écriture.

### [MAJOR] PRO-06 — Un ancien parent garde ses notifications et peut encore agir
- **Fichier :** `views.py` 661-680 ; `parental.py` 312-325 ; `scolaire/services/liens.unlink` ; `accounts/views.remove_child`.
- **Problème :** `ParentNotificationsView` liste `filter(parent=user)` sans vérifier que l'enfant est encore rattaché (prénom, scores, leçons, séries restent lisibles) ; `respond_request` accorde du temps à `notif.child` sans contrôler `notif.child.parent_id == parent.id`.
- **Instruction pour Gemini :** filtre `child__parent=user` (liste et `unread_count`) ; refuse (404) dans `respond_request` si `notif.child.parent_id != parent.id` ; supprime `ParentNotification`/`ScreenTimeCredit` du couple dans `unlink` et `remove_child`. Test : après `unlink`, plus de notifications de l'enfant.

### [MAJOR] PRO-07 — Les limites de temps d'écran reposent sur un temps déclaré par le navigateur de l'enfant
- **Fichier :** `parental.py` 106 (`minutes_played_today`), 144-159 (`screen_time_block` appliqué à quelques endpoints seulement) ; `views.py` 373-407 (`DailyUsageView.post`).
- **Problème :** un enfant qui ne remonte pas les battements n'atteint jamais la limite ; le contenu pédagogique et les jeux ne sont pas bloqués.
- **Instruction pour Gemini :** mesure de présence **côté serveur** : pour les élèves avec parent relié, incrémente `presence:{user.id}:{date}` (granularité 1 minute, `cache.add`) à chaque requête authentifiée (dans `KeurSessionAuthentication` ou un middleware) et persiste dans `DailyUsage.presence_minutes` ; utilise-le dans `minutes_played_today` ; permission DRF `NotScreenLocked` sur les endpoints de contenu (`curriculum`). Documente la limite tant que le blocage n'est pas serveur partout. Plafonne `usage.minutes` à 1440/jour et `ScopedRateThrottle` 10/min sur `DailyUsageView.post`.

### [MAJOR] PRO-08 — Omettre `twoFactor` équivaut à demander sa désactivation
- **Fichier :** `parental.py` 164-177, 245-276.
- **Problème :** `default=False` ; enregistrer les limites d'un enfant sans renvoyer `twoFactor` désactive silencieusement la 2FA globale (après saisie du mot de passe) ; toute requête partielle remet `palouEnabled`, `weeklyReport`… à leur défaut.
- **Instruction pour Gemini :** retire les `default=` de `LimitsInputSerializer`, `partial=True`, n'applique que les champs fournis ; `twoFactor` traité seulement s'il est présent **et** `childId` nul (sinon 400). Test : limite d'un enfant sans `twoFactor` ne modifie pas la 2FA.

### [MAJOR] PRO-09 — Palou ouvert à tout compte non élève, sans plafond de coût
- **Fichier :** `palou.py` 438-466 ; `parental.py` 96-103 (`palou_allowed` renvoie `True` hors élève avec parent relié).
- **Problème :** un parent, enseignant ou admin (inscription gratuite) appelle `/api/palou/chat` à 20 messages/min sans limite journalière → accès gratuit à l'API Anthropic aux frais de la plateforme (~1 200 requêtes/h/compte, multipliable par les comptes).
- **Instruction pour Gemini :** refuse (403) tout rôle autre que `ROLE_STUDENT` (et `ROLE_ADMIN` pour les tests) ; quota journalier `PALOU_DAILY_MESSAGES` (défaut 100, `cache.incr`) et plafond global `PALOU_GLOBAL_DAILY_MESSAGES` ; `.env.example` ; tests : parent → 403, 101ᵉ message → 429.

### [MAJOR] PRO-10 — Le classement général expose des prénoms d'enfants à d'autres familles
- **Fichier :** `leaderboard.py` 310-315, 375-410.
- **Problème :** pour les élèves sans école, tous les élèves sans école du même parcours sont classés et affichent prénom + initiale + XP aux autres familles.
- **Instruction pour Gemini :** pseudonyme choisi par l'enfant (`LearnerProfile.nickname`/avatar), jamais le prénom réel, dans le classement `global` ; prénom + initiale seulement pour le classement d'école ; réglage parental `leaderboard_visible` (défaut `False`). **Décision produit à valider avant implémentation.**

### [MAJOR] PRO-11 — `build_admin_dashboard` charge la plateforme entière en mémoire
- **Fichier :** `services.py` 71-153.
- **Problème :** `users = User.objects.all()` filtré en Python ; `Progress.filter(user__in=<liste d'objets>)` ; une boucle Python sur **chaque ligne** de `Progress` de tous les élèves.
- **Instruction pour Gemini :** `build_admin_dashboard(users, page=1, page_size=50)` ; filtre `role=ROLE_STUDENT` en base, pagine avant tout calcul, agrège en SQL (`values('user').annotate(done=Count, xp=Sum, last=Max)`) ; `analytics` par agrégats SQL indépendants de la page, en cache 60 s ; mets à jour `superadmin.learners()`. Retire l'avatar emoji par défaut (ligne 117) côté admin.

### [MAJOR] PRO-12 — `send_weekly_reports` : jamais planifié, incapable de monter en charge
- **Fichier :** `mailing.py` 195-225 ; `docker-compose.yml`.
- **Problème :** aucune tâche planifiée → le réglage « Bilan hebdomadaire » n'a aucun effet en production ; boucle sur tous les parents sans `iterator()`, un e-mail synchrone chacun via Gmail (~500 destinataires/jour) ; rien ne mémorise qui a été servi.
- **Instruction pour Gemini :** service `weekly-reports` dans `docker-compose.yml` (cron dimanche) ; `last_weekly_report_at` (sur `User` ou `ParentalLimits`) pour la reprise (ignore les parents servis < 6 jours) ; `.iterator(chunk_size=200)`, `sleep` entre envois, `EMAIL_DAILY_CAP`, fournisseur transactionnel ; précharge les enfants par lot.

### [MAJOR] PRO-13 — `QuizAttempt` n'est écrit nulle part : fonctionnalité morte
- **Fichier :** `models.py` 47-65 ; `views.py` 58-60, 492, 511.
- **Problème :** `comprehensionRate` toujours `null`, `quizAttempts` toujours 0, la voie « 3 scores à 100 % » de `b_detective` ne fonctionne jamais.
- **Instruction pour Gemini :** trancher avec l'équipe produit : (a) créer `QuizAttempt` dans `ProgressView.post` / l'endpoint de soumission (PRO-02) avec `quiz_id=lessonId`, `score`, `answers` ; (b) supprimer le modèle, les champs du tableau de bord et les tests (migration). Retire les références mortes dans `compute_badges`.

### [MAJOR] PRO-14 — Tests : scénarios absents
Forge de badge (PRO-01) ; achèvement massif/rapide (PRO-02) ; Palou par parent/enseignant/admin et quota (PRO-09) ; notifications d'un enfant détaché et `respond_request` (PRO-06) ; limite d'un enfant sans `twoFactor` (PRO-08) ; `assertNumQueries` (`ParentTrackingView` 8 enfants, `ProgressView.get`, `ParentalLimitsView.get`, `build_admin_dashboard`) ; latence de `create_notifications_for_event` avec SMTP/push lent ; corps `[]` ; rotation déterministe du défi du jour ; planification et reprise de `send_weekly_reports` ; ordre du parcours et délai minimal.
- **Instruction pour Gemini :** `tests/test_badge_forgery.py`, `test_completion_rate_limit.py`, `test_palou_access.py`, `test_detached_child_access.py`, `test_limits_partial_update.py`, `test_query_counts.py`, `test_notification_delivery.py`, `test_weekly_reports.py` ; fabriques communes (`make_parent`, `make_child`, `make_student_with_track`) dans `tests/helpers.py`.

### [MINOR] PRO-15 — `compute_badges` : code mort et badges décoratifs
Lignes 48-51 (`or lessons_count >= 1` rend le reste inutile ; `endswith("-1")` correspondrait à `p12-1`) ; `b_sort`, `b_lynx`, `b_guard`, `b_secret`, `b_eye`, `b_brain` utilisent des seuils génériques sans lien avec leur description. **Gemini :** `has_first_lesson = lessons_count >= 1` ; associe ces badges à des leçons précises (équipe pédagogie).

### [MINOR] PRO-16 — `compute_badges` appelé deux fois dans `post` ; `tutorial_completed` mis à `True` avant le calcul « précédent »
Lignes 285, 338-339 : `b_tuto` déjà acquis dans `prev_badges`, aucune notification. **Gemini :** calcule avant `record_xp` sans écriture, puis après, et compare.

### [MINOR] PRO-17 — `age_track` stocké depuis le client
Lignes 169-173, 293. **Gemini :** déduis-le de `lesson.module.track.key`.

### [MINOR] PRO-18 — `RecordActivityView` : `error_count += 1` non atomique, code de badge dupliqué 3 fois
**Gemini :** `update(error_count=F('error_count') + n)` ; `_unlock(user, 'b_persist')`.

### [MINOR] PRO-19 — `enrich_notification` : ~100 lignes, ~40 de complexité cyclomatique
Lignes 537-658. **Gemini :** table `NOTIFICATION_RENDERERS` + `detect_category`.

### [MINOR] PRO-20 — Imports circulaires par `views.py`
`leaderboard.py`, `challenge.py`, `riddle.py` importent `DAILY_CHALLENGE_PREFIX`, `RIDDLE_PREFIX`, `RIDDLE_XP`, `notify_level_up`, `lesson_progress` depuis `views.py`. **Gemini :** constantes dans `xp.py`, `notifications.py` pour les notifications.

### [MINOR] PRO-21 — Corps non-objet : 500
`DailyUsageView.post`, `MarkEventSeenView`, `RecordActivityView`, `TutorialCompleteView`, `ParentalUnlockView`, `PushSubscribeView`. **Gemini :** `json_object` (TRV-02).

### [MINOR] PRO-22 — Écran de verrouillage : 5-6 requêtes à chaque appel
`parental.py` 106-141, 195-226. **Gemini :** cache 20 s de `child_lock_status`, invalidé dans `grant_credit` et `ParentalLimitsView.post`.

### [MINOR] PRO-23 — Mot de passe parent testé depuis le compte de l'enfant avec un verrou indépendant
`parental.py` 382-387 : 30 essais/15 min contre le parent hors du verrou de connexion. **Gemini :** `LoginLockout(parent.email, client_ip(request), scope='login')`.

### [MINOR] PRO-24 — `timezone.datetime.min.time()`
`parental.py` 48-49. **Gemini :** `from datetime import time`.

### [MINOR] PRO-25 — Palou : exceptions réseau non rattrapées, appel synchrone de 20 s, sortie non filtrée
`palou.py` 389-394 (`ConnectionResetError`, `IncompleteRead` → 500 + alerte). **Gemini :** `except (URLError, OSError, ValueError, http.client.HTTPException)` ; timeout 12 s + disjoncteur (503 après 5 échecs) ; `redact_personal_data` sur `reply`.

### [MINOR] PRO-26 — Classement : `STUDENT_ROLES = ('eleve','enfant')` (rôle `enfant` n'existe plus), recalcul à chaque requête, `index_of = {id(e): i …}` fragile
`leaderboard.py` 283, 328-354, 412, 437. **Gemini :** `(User.ROLE_STUDENT,)` ; cache 60 s par (scope, track, period) invalidé à `record_xp` ; `index` dans chaque entrée.

### [MINOR] PRO-27 — `mailing.py`/`parental.py` : même requête « règle de l'enfant sinon globale » écrite 3 fois (`limits_row`, `limits_for`)
**Gemini :** garde `limits_for`.

### [MINOR] PRO-28 — Push : `keys` non-dict → 500, abonnements illimités, un envoi bloquant par appareil
`push.py` 118-125. **Gemini :** `isinstance(keys, dict)`, plafond 10 abonnements par parent.

### [MINOR] PRO-29 — Défi du jour : `DailyChallenge.objects.filter(is_active=True)` sans `order_by` (deux élèves peuvent voir un défi différent le même jour) ; verrou seulement dans la branche « mauvaise réponse »
`challenge.py` 31-36, 93-113. **Gemini :** `.order_by('id')` ; `transaction.atomic()` + `select_for_update` sur `DailyChallengeAttempt` pour tout `post`.

### [MINOR] PRO-30 — Énigme : écriture sur `GET` (protégée), `lesson_title()` une requête par appel
`riddle.py` 227-265. **Gemini :** `select_related` si `lesson_id` devient clé étrangère.

### [MINOR] PRO-31 — Modèles : dualité `user`/`owner_email` ; index et validateurs
`Progress`, `QuizAttempt`, `DailyUsage` : `user` nullable + `owner_email` hérité + 2 contraintes d'unicité. `EarnedReward.event_key` `db_index` redondant ; `ParentNotification`, `DailyChallengeAttempt`, `RiddleDay` jamais purgés ; `bedtime_*` sans validateur de modèle ; `Progress.score` sans 0-100 ; `PushSubscription.endpoint` limité à 500. **Gemini :** trois migrations (rendre `user` obligatoire après vérification qu'aucune ligne `user IS NULL` n'existe en production, supprimer les contraintes sur `owner_email`, supprimer le champ) ; purge notifications 180 jours, essais/énigmes 90 jours dans `apply_retention` ; `RegexValidator`, `MaxValueValidator(100)`, message d'erreur explicite pour les endpoints trop longs.

### [MINOR] PRO-32 — `urls.py` doublé avec `/`, préfixes incohérents (`daily-challenge`, `charter`, `palou/chat`, `daily-riddle`, `daily-usage`, `push/*` à la racine ; le reste sous `progress/`)
**Gemini :** `re_path(r'^…/?$')`, regroupement sous `progress/` avec alias temporaires, test de non-collision.

### [MINOR] PRO-33 — `admin.py` : `user` sans `list_select_related`, 3 modèles sur 13 enregistrés, XP modifiable à la main
**Gemini :** `list_select_related = ('user',)`, `readonly_fields = ('xp','score')`.

### [MINOR] PRO-34 — Commandes : `seed_leaderboard_demo` supprime sans confirmation les comptes `lbdemo-…` (garde DEBUG présent) ; `generate_vapid_keys` affiche la clé privée en sortie standard
**Gemini :** documente (ne pas lancer dans un orchestrateur qui collecte les journaux).

---

## 9. Applications `curriculum`, `learners`, `famille`, `schools`

### 9.1 Application `curriculum`

**Fichiers lus :** `models.py`, `views.py`, `serializers.py`, `urls.py`, `admin.py`, `parcours79.py` (début), commandes `seed_curriculum`, `check_parcours79`, `slice_pictos79` (début), début de `riddle_data.py` et `data/content_7_9.py`, noms des tests (`tests.py`, `test_parcours79.py`). Migrations (12), données (`tracks_data.py`, `curriculum_dump.json`) et la fin de `parcours79.py` non relues.
**Points solides :** contrôle éditorial automatisé du parcours 7-9 (anti-« vernis », lisibilité, relecture) avec tests ; énigmes liées à une leçon terminée ; `correct_index` des défis/énigmes jamais envoyé avant la réponse.

### [MAJOR] CUR-01 — L'API publique expose les bonnes réponses de tous les quiz et activités
- **Fichier :** `views.py` (`PublicReadView`, `AllowAny`, `LessonDetailView`) ; `serializers.py` 8-23 (`LessonContentSerializer` inclut `questions` et `activity`).
- **Problème :** `GET /api/curriculum/lessons/<id>/` renvoie, sans authentification, `questions` (avec `correct`) et `activity` (`correct`, `success`). Conséquences : l'élève ou n'importe qui lit à l'avance les réponses des devoirs de l'école (les mêmes questions alimentent `programme_quiz`), l'achèvement de leçon est trivial à forger (PRO-02), les énigmes ne protègent rien.
- **Instruction pour Gemini :** crée `LessonContentPublicSerializer` qui supprime `correct`, `success` et `explain` des `questions`/`activity` (garde les libellés). L'endpoint public sert ce serializer ; la correction est fournie par un endpoint de soumission côté serveur (`POST /api/lessons/<id>/submit`, voir PRO-02) ou, à défaut, révélée question par question après réponse. `LessonDetailSerializer` complet réservé à `superadmin` (Studio). Test : la réponse publique ne contient aucune clé `correct`.

### [MAJOR] CUR-02 — N+1 sur l'endpoint public le plus sollicité
- **Fichier :** `serializers.py` 36-37 (`get_has_content` → `hasattr(obj, 'content')`) ; `views.py` (`prefetch_related('modules__lessons')` sans `content`).
- **Problème :** une requête par leçon (`/curriculum/tracks/`, `/overview/`, `/modules/<id>/`) : > 100 requêtes par appel, sur des routes sans authentification.
- **Instruction pour Gemini :** annote `has_content=Exists(LessonContent.objects.filter(lesson=OuterRef('pk')))` dans un `Prefetch('modules__lessons', queryset=Lesson.objects.annotate(...))` et lis l'annotation ; `assertNumQueries` ≤ 4 sur chaque route ; cache (`cache_page` 60 s ou ETag) car le contenu change rarement.

### [MAJOR] CUR-03 — `seed_curriculum` est destructive et écrase les modifications du Studio
- **Fichier :** `management/commands/seed_curriculum.py`.
- **Problème :** `--clean` supprime tous les parcours, modules, leçons et contenus sans garde `DEBUG` ni confirmation ; sans `--clean`, `update_or_create` écrase à chaque exécution tout ce qui a été édité dans le Studio (titres, XP, contenu) avec le contenu du dump JSON ; la commande finit par `sync_programme_missions()`.
- **Instruction pour Gemini :** `--clean` refusé hors `DEBUG` sauf `--i-know-what-i-am-doing` ; mode par défaut « créer seulement ce qui manque » (`get_or_create`) ; `--overwrite` explicite ; marque les leçons modifiées par le Studio (`edited_at`/`source='studio'`) et ne les écrase jamais ; affiche un récapitulatif avant écriture.

### [MINOR] CUR-04 — Aucun état brouillon/publié, aucun versionnement
Voir SUP-13 (à traiter ensemble : `Lesson.status`, `LessonRevision`).

### [MINOR] CUR-05 — `Meta.ordering` à travers une relation sur `Lesson` et `Module`
`['module__order','order']`, `['track__order','order']` : jointure imposée à chaque requête. **Gemini :** ordre explicite dans les vues, `Meta.ordering = ['order','id']`.

### [MINOR] CUR-06 — Validation des modèles : `DailyChallenge`/`Riddle.correct_index` hors bornes ; `Riddle.lesson_id` n'est pas une clé étrangère
Un `correct_index >= len(options)` rend le défi impossible ; une leçon renommée/supprimée laisse des énigmes orphelines. **Gemini :** `clean()` (vérifie bornes et 2 à 5 options) appelé aussi par le Studio/l'admin ; envisage `ForeignKey(to_field='lesson_id')` avec migration de données.

### [MINOR] CUR-07 — `GlossaryTerm.background` : CSS libre injecté côté client
**Gemini :** valide (liste de formats autorisés : couleur hex ou dégradé simple) ; le frontend ne doit pas l'injecter brut.

### [MINOR] CUR-08 — Admin : `module_count`/`lesson_count`/`has_content` = requête par ligne
`admin.py` 485-514. **Gemini :** `annotate(Count(...))` + `list_select_related`.

### [MINOR] CUR-09 — Tests mal placés ; dépendance au dossier `frontend/`
`curriculum/tests.py` et `test_parcours79.py` à la racine de l'app (pas de dossier `tests/`) ; `parcours79.py` lit `Path(settings.BASE_DIR).parent / 'frontend'` : échec dans une image backend seule. **Gemini :** `curriculum/tests/` ; saute (`skipUnless`) les tests de contenu si `frontend/` est absent ; ajoute des tests de la fuite de réponses (CUR-01) et du nombre de requêtes (CUR-02).

### [MINOR] CUR-10 — Plusieurs sources de vérité du contenu (à clarifier)
`data/content_7_9.py` (839 lignes, `PILOT_LESSONS_7_9`), `data/tracks_data.py` (512), `data/curriculum_dump.json`, `frontend/content/parcours79/*.json`, et la base (Studio). **Gemini :** liste les usages de `content_7_9.py` et `tracks_data.py` (`grep`) ; documente dans `docs/` la source de vérité et le sens des synchronisations ; supprime ce qui est mort.

### [MINOR] CUR-11 — Outil de développement livré dans l'image de production
`management/commands/slice_pictos79.py` (écrit dans `frontend/public/images`). **Gemini :** déplace vers `scripts/`.

### [MINOR] CUR-12 — `numeric_id` expose les identifiants de base ; `SerializerMethodField` redondant
**Gemini :** supprime `numeric_id` s'il n'est pas utilisé par le frontend.

### 9.2 Application `learners`

**Fichiers lus :** tous (`models.py`, `views.py`, `serializers.py`, `urls.py`, `admin.py`). Migrations (5) non relues. **Aucun test dédié** (le comportement est testé dans `accounts/tests/test_security.py`, `T01…`).

### [MAJOR] LRN-01 — Deux sources de vérité pour la tranche d'âge, et champs hérités dupliqués
- **Fichier :** `accounts.User.age_group` (`ChildAccountSerializer`) et `learners.LearnerProfile.age_track` (`ProfilesView`) ; `owner_email`, `learner_email` (unique, nullable) dupliquent `learner.parent.email` / `learner.email`.
- **Problème :** l'âge saisi à la création et celui du profil peuvent diverger ; `progress` et `scolaire` lisent `LearnerProfile.age_track`.
- **Instruction pour Gemini :** désigne `LearnerProfile.age_track` comme référence ; migration de données qui recopie `User.age_group` quand le profil manque, puis supprime `User.age_group` ; retire `owner_email`/`learner_email` (migration en deux temps, après vérification qu'aucun code ne les lit) ; `learner` non nullable après nettoyage des orphelins.

### [MINOR] LRN-02 — Deux endpoints créent des comptes enfants avec des règles différentes
`POST /api/profiles` et `POST /api/parent/children` (`accounts`). **Gemini :** `ProfilesView.post` délègue à `ChildAccountSerializer` + une fonction de service unique ; documente l'endpoint à utiliser.

### [MINOR] LRN-03 — Message d'erreur révélant l'existence d'une adresse
`views.py` 114 : « L'adresse X est déjà utilisée par un autre compte » (un parent authentifié peut sonder toutes les adresses). **Gemini :** message générique.

### [MINOR] LRN-04 — Avatar non validé et incohérent
`StudentRowSerializer.avatar` = `CharField(max_length=20)` (défaut emoji `🧒🏾`) alors que `accounts.ProfileSerializer` utilise `AVATAR_IDS`. **Gemini :** `ChoiceField(choices=AVATAR_IDS)` partout ; migre les valeurs emoji.

### [MINOR] LRN-05 — Corps non-objet → 500 ; `students` = `ListField(DictField())` sans borne avant le contrôle de taille
**Gemini :** `ListField(max_length=MAX_STUDENTS_PER_REQUEST)` ; `json_object`.

### [MINOR] LRN-06 — Aucun dossier `tests/` ; `__str__` sans `learner`
**Gemini :** `learners/tests/` (création, tout-ou-rien, isolation entre parents, plafond de 8).

### 9.3 Application `famille` (messagerie parent ↔ enfants)

**Fichiers lus :** tous. Migrations (3) non relues. 1 fichier de tests (85 lignes, non détaillé).

### [MAJOR] FAM-01 — Messages d'enfants conservés sans limite, non exportés, non modérables par le parent
- **Fichier :** `models.py`, `services.py`, `accounts/account.py`, `accounts/retention.py`.
- **Problème :** `FamilyMessage` n'est ni purgé, ni inclus dans l'export de données (ACC-09), ni supprimable/signalable par le parent ; aucune limite de volume par famille.
- **Instruction pour Gemini :** ajoute les messages à `account_data` ; purge à 12 mois dans `apply_retention` (`FAMILY_MESSAGE_RETENTION_DAYS`) ; endpoint `DELETE /api/famille/messages/<id>` réservé au parent de la famille ; plafond de 5 000 messages par famille (les plus anciens supprimés).

### [MINOR] FAM-02 — La lecture n'a aucun throttle
`views.py` 263-264 : `get_throttles()` renvoie `[]` pour GET et neutralise aussi les throttles par défaut. **Gemini :** `ScopedRateThrottle` 120/min sur GET.

### [MINOR] FAM-03 — Corps non-objet → 500 ; texte stocké brut
`clean_text(request.data.get('text'))`. **Gemini :** `json_object` ; documente que le frontend échappe le texte.

### [MINOR] FAM-04 — Index (`family`,`id`) alors que les requêtes trient par (`created_at`,`id`)
**Gemini :** index (`family`,`created_at`,`id`) ou tri par `id`.

### [MINOR] FAM-05 — Tests à compléter
**Gemini :** isolation entre deux familles, enfant désactivé, parent sans enfant actif, `after` invalide, `assertNumQueries`.

### 9.4 Application `schools`

**Fichiers lus :** tous. Migrations (6) non relues. **Aucun dossier de tests** (la page publique et la suspension sont testées dans `scolaire` et `superadmin`).

### [MINOR] SCH-01 — `HEX_COLOR` défini mais jamais utilisé ; couleurs non validées au niveau du modèle
`serializers.py` 7 ; `models.py` 297-299. **Gemini :** supprime la regex ou ajoute `RegexValidator` sur les trois champs de couleur.

### [MINOR] SCH-02 — `School.name` non unique ; slug unique sensible à la casse du modèle
**Gemini :** `UniqueConstraint(Lower('name'), 'city')` (si la règle métier le permet) ; contrôle `slug` en minuscules dans `clean()`.

### [MINOR] SCH-03 — Page publique sans cache
`PublicSchoolView`. **Gemini :** `cache_page(60)` ou en-têtes `Cache-Control` ; elle ne contient aucune donnée interne (vérifié).

### [MINOR] SCH-04 — Aucun test dans l'app
**Gemini :** `schools/tests/` : slug inconnu et école suspendue donnent le même 404 ; la réponse ne contient ni logo ni e-mail du créateur ; couleurs par défaut.

---

## 10. Points transversaux et hygiène du dépôt

### [CRITICAL] TRV-01 — Mot de passe de super administrateur en clair dans un fichier suivi par git
- **Fichier :** `COMPTES_CONNEXION.md` (racine du dépôt, **suivi par git**, présent dans plusieurs commits dont `72442f6`, `1b2f117`, `1f606f1`).
- **Problème :** le fichier donne `local-admin@keur-ia.test` avec un mot de passe en clair (masqué dans ce rapport ; visible dans l'historique git) avec `role=admin`, `is_superuser=True`, l'accès à `/admin` et à la console Django. Même annoncé « local », un mot de passe réutilisé (ou un compte créé par erreur en préproduction/production) donne le contrôle total de la plateforme, y compris les données d'enfants. Il reste dans l'historique git même après suppression du fichier.
- **Instruction pour Gemini :** (1) supprime les identifiants du fichier (remplace par « mot de passe défini par l'équipe, jamais écrit ici ») ; (2) **change** ce mot de passe partout où le compte existe et vérifie qu'aucun compte `local-admin@keur-ia.test` n'existe en production ; (3) si le dépôt est ou sera partagé hors équipe, réécris l'historique (`git filter-repo --path COMPTES_CONNEXION.md --invert-paths` ou remplacement de texte) **après accord de l'équipe** (opération destructive, à coordonner) ; (4) ajoute une étape CI `gitleaks`/`trufflehog` et un hook `pre-commit` de détection de secrets ; (5) crée l'administrateur local par `python manage.py createsuperuser` documenté, jamais par mot de passe fixe.

### [MAJOR] TRV-02 — Corps JSON non-objet : même défaut dans six apps ; formulaires acceptés par défaut
- **Où :** ACC-02, SUP-08, SCO-08, PRO-21, LRN-05, FAM-03 ; parsers par défaut (ACC-10).
- **Problème :** un corps `[]`/`"x"` donne un `AttributeError` → 500 → alerte d'incident ; un script peut inonder le canal d'alerte (KEU-03).
- **Instruction pour Gemini (solution commune) :** crée `apps/common/http.py` avec `json_object(request)` (renvoie `request.data` si `dict`/`QueryDict`, sinon lève une erreur 400 `ApiError('Corps de requête invalide.')`) et un mixin `JsonObjectBodyMixin` dont `initial()` valide une fois pour `POST/PUT/PATCH/DELETE` ; applique-le à `ScolaireView`, `AdminView` et à toutes les `APIView` des apps ; `DEFAULT_PARSER_CLASSES = (JSONParser,)` (exceptions déclarées pour les uploads). Un test d'intégration parcourt `urlpatterns` et poste `[]` sur chaque route d'écriture : aucun 500.

### [MAJOR] TRV-03 — Envois d'e-mails, de notifications push et d'appels IA exécutés dans la requête HTTP
- **Où :** ACC-05, PRO-03, PRO-12, PRO-25, KEU-03.
- **Instruction pour Gemini (solution commune) :** module `apps/common/delivery.py` : un `ThreadPoolExecutor(max_workers=2)` partagé, `submit_after_commit(fn, *args)` (`transaction.on_commit`), plafonds quotidiens par destinataire et global (`EMAIL_DAILY_CAP`), journalisation des échecs sans données personnelles. À terme, une file de tâches (Celery/RQ) avec Redis déjà requis par `keuria.checks`.

### [MAJOR] TRV-04 — Des `GET` qui écrivent en base
- **Où :** PRO-05 (`ProgressView.get`), SUP-05 / SCO-07 (`sync_programme_missions`), SUP-04 / SCO-31 (`current_year`), PRO-30 (`RiddleDay`).
- **Instruction pour Gemini :** règle d'équipe : un `GET` n'écrit pas. Déplace les écritures vers les `POST` ou des tâches planifiées ; test automatique qui exécute chaque `GET` avec un compteur de requêtes d'écriture (`CaptureQueriesContext`) et échoue si un `INSERT/UPDATE` apparaît (liste d'exceptions documentée).

### [MAJOR] TRV-05 — Politique de conservation incomplète (données d'enfants)
- **Où :** SUP-10 (journal d'audit), PRO-31 (notifications, essais, énigmes), FAM-01 (messages), ACC-14 (codes, sessions), ACC-04 (comptes non vérifiés), ACC-09 (export).
- **Instruction pour Gemini :** une seule commande `apply_retention` étendue, avec tableau de durées dans `settings.py` (`AUDIT_RETENTION_DAYS=730`, `NOTIFICATION_RETENTION_DAYS=180`, `FAMILY_MESSAGE_RETENTION_DAYS=365`, `OTP_RETENTION_HOURS=24`, `UNVERIFIED_ACCOUNT_DAYS=7`) et un compte rendu par catégorie ; `docs/DONNEES_PERSONNELLES.md` mis à jour ; export de données couvrant chaque table qui contient des données personnelles.

### [MINOR] TRV-06 — Hygiène du dépôt
- **Constat (vérifié) :** à la racine, **suivis par git** : `COMPTES_CONNEXION.md` (voir TRV-01), `audio.wav` (≈ 175 Ko, binaire sans lien avec le code). **Ignorés par git mais présents** : `1.zip`, `audit.diff`, `audit_utf8.diff`, `diff.txt`, `diff_utf8.txt`, `diffs.txt`, `dashboard_client_diff.txt`, `old_DashboardClient*.txt`, `old_dashboard*.tsx`, `extract.js`, `extract2.js`, `extract_palou.py`, `extracted_content.txt`, `crees_moi_une_video_de_la_masc.mp4`, `frontend/diff_clean.patch`, `frontend/extract3.cjs`, `frontend/tsconfig.tsbuildinfo`, plus `cursor_history.txt`, `history_results.txt`, `transcript_extract.txt`, `overwrite.py`, `antigravity_behaviour.md`, `Design_systeme.md`, `KEURIA_Plan_Taches_Auth_Autorisation.xlsx`.
- **Instruction pour Gemini :** ne supprime **rien** sans accord de l'utilisateur (travail parallèle sur deux éditeurs) ; propose un dossier `_archive/` (ignoré par git) ou une suppression après validation ; retire `audio.wav` de l'index (`git rm --cached`) ; ajoute des motifs (`*.diff`, `*.patch`, `old_*`, `extract*`, `*.zip`, `*.mp4`, `*.wav`) à `.gitignore` ; déplace `Design_systeme.md` / `antigravity_behaviour.md` / le plan Excel vers `docs/` s'ils sont utiles.

### [MINOR] TRV-07 — Outils de test non installés dans l'environnement local
`coverage` (et donc `pytest-cov`) absent de `backend/.venv` alors qu'il figure dans `requirements-dev.txt` : aucune mesure de couverture n'a pu être faite pendant cet audit. **Gemini :** `pip install -r requirements-dev.txt`, puis `coverage run --branch -m pytest && coverage report -m` ; communique le pourcentage par application avant et après corrections.

### [MINOR] TRV-08 — Routes doublées, non nommées, sans OpenAPI pour `superadmin`/`scolaire`
ACC-30, PRO-32, SUP-31, SCO-34, KEU-22. **Gemini :** convention unique `re_path(r'^…/?$', name=…)`, test de non-collision, serializers + `@extend_schema` pour les apps sans schéma, `spectacular --validate` en CI.

### [MINOR] TRV-09 — Migrations
Non relues dans cet audit (accounts 13, scolaire 10, progress 24, curriculum 12, schools 6, learners 5, famille 3, superadmin 2). **Gemini :** `python manage.py makemigrations --check --dry-run` en CI ; envisage de regrouper (`squashmigrations`) `progress` ; vérifie que chaque migration de données est réversible (ou documente).

### [MINOR] TRV-10 — Contrôles de sécurité automatiques absents de la CI
**Gemini :** `ruff` avec règles `S` (Bandit), `pip-audit`, `gitleaks`, `manage.py check --deploy` avec variables de production factices, test de non-régression des 5 priorités de la phase 0.

---

## 11. Limites de l'audit

- **Lecture seule :** aucune ligne du code n'a été modifiée par l'auditeur. Seules deux commandes d'analyse ont été lancées : `ruff check keuria` et des recherches `grep`/`git ls-files`. Les tests n'ont **pas** été exécutés et la **couverture n'a pas été mesurée** (`coverage` absent de `.venv`).
- **Non relus :** toutes les migrations ; `seed_demo_school.py` (sauf début) ; les 120-195 lignes de données de `mission_quizzes.py` ; `curriculum/data/*` (jeux de contenu), la fin de `parcours79.py`, `riddle_data.py` (au-delà du début) ; le contenu des fichiers de tests (seuls les noms ont été lus, sauf `keuria/tests`).
- **Hors périmètre :** le frontend (`frontend/`), le `docker-compose.yml` hors recherches ciblées, la CI, l'infrastructure de production et la configuration réelle (`backend/.env`).
- **Fiches « à vérifier » :** ACC-11 (suppression des notifications lues), PRO-10 (décision produit), CUR-10 (sources de vérité du contenu), SCO-15 (accès résiduel confirmé par PRO-06).
- **Les numéros de ligne** correspondent à l'état du dépôt le 2026-10-08 (branche `feature/v26-septembre`, avec modifications locales non commitées côté frontend).

*Fin du rapport.*
