# T17-D-bis — Antigravity — preuves de l'étape 5, e-mails, encodage et rapport (reprise courte)

Ta T17-D est acceptée sous réserve : le parcours marche et la plupart des captures sont bonnes (voir `agents/rapports/T17-D-revue-claude.md`). Il reste quatre choses, rapides. Ne fais pas T19 avant d'avoir fini celle-ci.
**Rappel de la règle** : ne commite que tes propres fichiers (`git status`, puis `git add` un par un).

## 1. Étape 5 : montrer pour de bon que le parent accepté et son enfant arrivent sur leur espace

Rejoue uniquement la fin du scénario avec **la même famille** du début (parent « Fatou Sow », enfant « Moussa Sow ») : après « Accepter finalement », connecte le parent puis l'enfant.
- Capture du **tableau de bord du parent** chargé (on doit lire « Bonjour Fatou Sow » et l'enfant « Moussa Sow » dans « Explorateurs du foyer ») à 1440 et 390 px.
- Capture de l'**espace de l'enfant** chargé (pas l'écran « Palou prépare ton espace… » : attends la fin du chargement ; on doit voir l'archipel ou la carte), à 1440 et 390 px.
- Remplace les captures vides `D5-parent-connecte-*` et celle de chargement `D5-enfant-connecte-1440` ; supprime la capture d'Awa Talla si elle ne sert plus.
- `preuves.json` (étape 5) : le texte lu dans la page (nom du parent, nom de l'enfant dans le foyer) en plus des URL.

## 2. Les deux e-mails

Les e-mails s'affichent dans la console de Django (mode développement, `EMAIL_BACKEND=console`). Pour l'**e-mail de refus avec motif** et l'**e-mail d'acceptation** : récupère le texte réel dans la sortie du serveur et enregistre-le dans `agents/rapports/T17-captures/emails.txt` (objet, destinataire, corps ; **sans** lien ni code de connexion, il n'y en a pas ici). Fais une capture de l'écran de la console ou de la fenêtre du terminal **seulement si elle montre bien le texte** ; sinon le fichier texte suffit.

## 3. `preuves.json` en UTF-8

Réécris le fichier en UTF-8 sans BOM (les accents sont aujourd'hui illisibles : « Ã© »). Ajoute l'entrée de la preuve côté enfant du studio (capture `D7-enfant-lecon-publiee-studio-1440.png` : texte lu dans le lecteur de l'enfant).

## 4. Rapport exact

Réécris `agents/rapports/T17-D-antigravity.md` :
- **Chaque nom de capture cité doit exister dans le dossier** (vérifie par un petit script avant de commiter : un nom absent = tu corriges) ;
- retire ou corrige les trois « défauts » inexacts : la gestion de `EMAIL_BACKEND` (dis simplement que `EMAIL_BACKEND=console` n'était pas pris en compte quand des identifiants existaient, et que tu l'as corrigé), le rappel du tableau de bord (la clé du serveur est `toHandle`, rien ne l'affichait), la saisie du motif (c'est une astuce de ton script de test, pas un défaut du produit) ;
- signale les changements hors périmètre (`settings.py`, `PlatformDashboardView.tsx`) comme tels, avec la raison.

## Contrôles et rendu

`npm run typecheck`, `npm run lint` (0 erreur), `npm test`. Un seul profil Chrome temporaire (`--disk-cache-size=1`), supprimé après. Commit `[antigravity] test(inscriptions): … (T17-D-bis)` + `Agent: antigravity`, auteur `Antigravity <antigravity@keuria.local>`, fichiers un par un, push sur `Dev_Lansana_Coly`. Pas de rapport séparé : mets à jour `T17-D-antigravity.md`. Ne dis « terminé » que si les quatre points sont faits et vérifiés.
