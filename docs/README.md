# Documentation de kEur IA : par où commencer

## Pour mettre en ligne et exploiter (à jour)

| Document | Pour quoi faire |
|---|---|
| [`../CHECKLIST_PROD.md`](../CHECKLIST_PROD.md) | La liste à cocher avant le go-live (variables, ordre des commandes, tests de pré-production) |
| [`DEPLOIEMENT_DEBIAN_NGINX.md`](DEPLOIEMENT_DEBIAN_NGINX.md) | Déploiement natif sur Debian : nginx, systemd, certificat TLS (fichiers dans `../deploy/`) |
| [`DEPLOIEMENT.md`](DEPLOIEMENT.md) | Déploiement avec Docker Compose (pré-production) et intégration continue |
| [`EXPLOITATION.md`](EXPLOITATION.md) | Surveillance, erreurs (Sentry et rapports des navigateurs), sauvegardes, restauration, incidents courants |
| [`DONNEES_PERSONNELLES.md`](DONNEES_PERSONNELLES.md) | Quelles données sont collectées, combien de temps elles sont gardées, ce qui reste à décider (juridique) |

## Pour travailler sur le contenu

| Dossier | Contenu |
|---|---|
| [`voix-palou/`](voix-palou/) | Les phrases de Palou par module et par leçon, et comment générer les voix |
| [`images-histoires/`](images-histoires/) | La liste des images d'histoires à produire (Antigravity), avec les règles de style |
| [`carte-iles/`](carte-iles/) | Les prompts des images de l'archipel |

## Historique (ne pas s'y fier pour l'état actuel)

Ces documents sont des photos à une date donnée ; plusieurs de leurs points sont depuis corrigés.

- [`AUDIT_PRODUCTION_2026-10-08.md`](AUDIT_PRODUCTION_2026-10-08.md) : audit de mise en production du 8 octobre (blocages B1 à B5, tous traités ; voir la CHECKLIST pour la suite).
- [`AUDIT_BACKEND.md`](AUDIT_BACKEND.md), [`AUDIT_FRONTEND.md`](AUDIT_FRONTEND.md) : lectures de code du 10 octobre.
- [`PLAN_ACTIONS_DUO_NOTE_MAXIMALE.md`](PLAN_ACTIONS_DUO_NOTE_MAXIMALE.md), [`RAPPORT_AMELIORATIONS_EXECUTIVE.html`](RAPPORT_AMELIORATIONS_EXECUTIVE.html) : plan et rapport de début octobre.

## Règles de l'équipe (rappel)

- Rien ne se met en ligne si la CI est rouge. Chaque commit doit garder la CI verte.
- Le mode développeur (`isDevMode`) n'existe que sous `next dev` ; il ne doit jamais être actif par défaut.
- Aucun secret dans le dépôt (clés, mots de passe) : variables d'environnement uniquement.
