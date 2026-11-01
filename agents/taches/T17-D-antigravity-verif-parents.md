# T17-D — Antigravity — vérifier à l'écran la validation des inscriptions de parents

OpenCode ne travaille plus sur le projet : cette partie de T17 est reprise par toi. Elle se fait dans un vrai navigateur, comme un utilisateur, après `T18-bis` (ou en parallèle si tu préfères, ce sont deux sujets séparés).
Pars du sommet de `Dev_Lansana_Coly` ; lis `docs/REGLES_AGENTS.md`.

## La règle à vérifier

Un parent qui s'inscrit (page publique) n'a plus d'accès tant que l'équipe kEur IA n'a pas accepté sa demande ; ses enfants non plus.
Code (écrit et testé côté serveur par Claude, jamais joué à l'écran) : `backend/apps/accounts/approval.py`, `backend/apps/accounts/views.py` (`approval_block_response`, `VerifyEmailView`), `backend/apps/superadmin/services.py` (`list_registrations`, `decide_registration`),
`frontend/app/connexion/PendingApproval.tsx`, `frontend/app/connexion/ConnexionClient.tsx`, `frontend/app/admin/_components/RegistrationsView.tsx`, `frontend/app/admin/inscriptions/page.tsx`. Interrupteur : `PARENT_REGISTRATION_REQUIRES_APPROVAL` (`backend/keuria/settings.py`).

## Le scénario (captures à 1440 px **et** 390 px ; dossier `agents/rapports/T17-captures/`)

Utilise un compte admin dédié que tu crées pour le test et que tu **supprimes à la fin** (dis-le dans le rapport) ; les e-mails s'affichent dans la console de Django (mode développement).
1. **Inscription** d'un parent avec un enfant (formulaire complet) → saisie du code e-mail reçu → écran **« Demande bien reçue ! »** (les trois étapes, la seconde « en cours »). Vérifie par l'API qu'aucune session n'est ouverte (`GET /api/profile` → 401).
2. **Reconnexion du parent** (profil « Parent ») → le même écran d'attente, pas une erreur brute. **Connexion de l'enfant du foyer** (profil « Élève », identifiant du type `prenom.nom@keuria.sn`) → un message clair (« Le compte de ton parent doit d'abord être validé… »), sans écran d'attente du parent.
3. **Compte admin** (`/connexion/admin`) → menu **Inscriptions** avec la **pastille de compteur** (1) → la **carte** du parent : nom, e-mail, téléphone, statut (père/mère…), enfant et tranche d'âge, « Demandée il y a… » → **Refuser** avec un motif (fenêtre dédiée) → message de confirmation (« Le parent a été prévenu par e-mail ») → l'onglet « Refusées » contient la demande, la pastille a disparu. Capture de l'e-mail du motif (console).
4. **Reconnexion du parent refusé** → l'écran « Demande non acceptée » avec le **motif**.
5. Retour dans l'admin : **Accepter finalement** (fenêtre de confirmation avec les conséquences) → e-mail → le parent **et** l'enfant se connectent et arrivent sur leur espace.
6. Le **rappel du tableau de bord admin** (« N demande d'inscription attend votre réponse ») apparaît quand une demande est en attente et disparaît quand elle est traitée.
7. **Interrupteur** : avec `PARENT_REGISTRATION_REQUIRES_APPROVAL=False` (relance le serveur), un nouveau parent entre directement après le code, comme avant. Remets la valeur par défaut ensuite.
8. **Au clavier seul** : tout le parcours du parent (inscription, écran d'attente, retour à la connexion) et la décision dans l'admin (focus visible, fenêtres qui piègent le focus, Échap).

## Preuves

Comme pour T18-bis : captures qui montrent le **résultat** de chaque étape (aucune capture floue ou doublon), et un fichier `agents/rapports/T17-captures/preuves.json` (étape → valeur lue dans la page ou par l'API : codes HTTP, textes affichés, valeur de la pastille). Aucun cookie ni en-tête de requête dans le dépôt.

## À corriger si tu trouves un défaut

Défauts de texte, de mise en page, d'état de chargement ou d'accessibilité : corrige-les (fichiers listés plus haut), sans changer la règle ni les réponses de l'API. Pour un défaut de logique serveur, ne le corrige pas : décris-le précisément dans le rapport (étape, résultat attendu, résultat obtenu) ; Claude le traitera.

## Rendu

Contrôles `npm run typecheck`, `npm run lint` (0 erreur), `npm test`, `python -m ruff check .`, `python -m pytest -q apps/accounts apps/superadmin`. Un seul profil Chrome temporaire (`--disk-cache-size=1`), supprimé après. Commits `[antigravity] … (T17-D)` + `Agent: antigravity`, auteur `Antigravity <antigravity@keuria.local>`, fichiers un par un, push sur `Dev_Lansana_Coly`.
Rapport `agents/rapports/T17-D-antigravity.md` : une ligne par étape (fait / pas fait, preuve), les défauts trouvés et corrigés, ceux qui restent. Ne dis « terminé » que si les huit étapes sont prouvées.
