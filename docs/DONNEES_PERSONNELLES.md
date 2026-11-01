| Canaux d'alerte d'exploitation (e-mail des administrateurs, webhook) | chemin de la page en erreur, code d'erreur, identifiant numérique de l'utilisateur, type de l'exception : **jamais** le texte de l'exception, le corps de la requête ni une adresse e-mail | seulement si `ADMINS_EMAILS` ou `WHATSAPP_ALERT_WEBHOOK_URL` sont définis |
# Données personnelles et services tiers

Ce document décrit **ce que le code fait réellement** des données des familles et des élèves (mineurs de 7 à 15 ans).
Il ne remplace pas un avis juridique : les points « À décider » demandent une décision de l'équipe (base légale, durée de conservation).

## Ce que KeurIA conserve

| Donnée | Où | Qui y accède |
|---|---|---|
| Compte (nom affiché, e-mail ou identifiant, rôle, date d'acceptation des conditions) | base de données | la personne, son parent, son école, l'équipe Keur IA |
| Progression, XP, badges, temps d'usage, réglages parentaux | base de données | l'élève, son parent, l'enseignant et la direction de son école (élèves d'école) |
| Messagerie familiale | base de données | uniquement la famille (le serveur déduit la famille du compte connecté) |
| Conversation avec Palou | **cache** (Redis en production), 1 h par défaut (`PALOU_MEMORY_SECONDS`) | personne : jamais écrite en base, jamais consultable |
| Abonnement aux alertes push d'un parent | base de données | le parent |

## Ce qui part vers des tiers

| Service | Quoi | Condition |
|---|---|---|
| **Anthropic** (assistant Palou) | le texte des messages de l'enfant et les réponses précédentes de Palou de la conversation en cours, plus sa tranche d'âge (7-9, 10-12 ou 13-15) | seulement si `ANTHROPIC_API_KEY` est défini ; sans clé, Palou répond « indisponible » |
| Fournisseur SMTP | e-mail du parent, code de vérification ou alerte | selon `EMAIL_HOST` |
| Services de push des navigateurs (Google, Mozilla, Apple, Microsoft) | titre et texte de l'alerte, chiffrés | seulement pour un parent abonné |
| Polices et jeu de reconnaissance de gestes | *aucune donnée n'est envoyée à un tiers* : les polices (rontend/public/fonts) et le moteur et le modèle MediaPipe (rontend/public/mediapipe) sont servis par le site lui-même | sans objet |

**Jamais envoyés à Anthropic** : nom, e-mail, identifiant, numéro d'utilisateur, école, résultats.
**Masqués avant l'envoi** : toute adresse e-mail et tout numéro de téléphone tapés dans un message (remplacés par
« [e-mail masqué] » et « [numéro masqué] »). Un enfant peut encore écrire un prénom ou une adresse postale dans une phrase :
le masquage ne remplace pas la consigne donnée à Palou (« ne demande jamais d'informations personnelles »).

## Droits des personnes (déjà en place)

- **Accès et portabilité** : `GET /api/account/export` (bouton « Télécharger mes données », espace parent).
- **Effacement** : `POST /api/account/delete` (compte parent et enfants) et suppression d'un enfant, avec mot de passe exigé.
- **Choix du parent** : `palouEnabled` par foyer ou par enfant (`POST /api/progress/parental-limits`), inclus dans l'export.
- **Désactivation** : `POST /api/auth/deactivate` (compte parent), réversible par code e-mail.
- Les comptes d'école (enseignant, direction, élève rattaché) sont gérés par leur établissement.

## Conservation limitée (en place)

Les comptes **familiaux** inactifs ne sont pas gardés indéfiniment (`python manage.py apply_retention`, à planifier une fois par jour) :

1. Un foyer (un parent et ses enfants) est inactif quand **aucun** de ses comptes ne s'est connecté depuis **2 ans**.
2. Le parent reçoit un e-mail d'avertissement (« connectez-vous d'ici 30 jours »).
3. Sans connexion, le compte parent est **désactivé** 30 jours plus tard (réversible : code envoyé par e-mail).
4. 30 jours après, le foyer est **supprimé** (parent et enfants créés par lui).

Garanties : jamais de suppression sans avertissement préalable, une seule étape par passage, et toute connexion (même celle d'un
enfant) remet le foyer à zéro. Si l'e-mail d'avertissement ne part pas, rien n'avance. Un compte jamais activé (adresse jamais
confirmée) est nettoyé sans message. Sont **exclus** : comptes d'école (enseignant, direction, élève rattaché, qui relèvent de leur
établissement) et équipe Keur IA. Un élève d'école relié à un parent n'est jamais effacé : il est simplement détaché.

**Les statistiques ne disparaissent pas** : avant toute suppression, les chiffres du mois (comptes par type, comptes actifs, XP totale,
foyers avertis, désactivés et supprimés) sont figés dans `AccountStatsSnapshot` (un instantané par mois, lisible par l'équipe Keur IA
sur `GET /api/superadmin/stats-history`).

Durées réglables : `RETENTION_INACTIVE_DAYS` (730), `RETENTION_NOTICE_DAYS` (30), `RETENTION_GRACE_DAYS` (30).
Essai sans risque : `python manage.py apply_retention --dry-run`.

## À décider (hors du code)

1. **Base légale de Palou** pour des mineurs : le parent peut désormais autoriser ou interdire Palou pour tout le foyer ou pour un enfant
   (espace parent → Paramètres → Limites & Temps → « Discuter avec Palou »). Palou est **éteint par défaut** : il ne répond à un enfant que si son parent l'a autorisé
   (un élève d'école sans parent relié dépend de son établissement, qui reste responsable). À faire valider par un juriste.
2. **Durée de conservation** : fixée à 2 ans d'inactivité pour les comptes familiaux ; à confirmer, et à définir pour les comptes
   d'école (aujourd'hui gérés par l'établissement, sans purge automatique).
3. **Mention d'information** affichée aux parents à l'inscription : liste ci-dessus à reprendre dans les conditions d'utilisation.
