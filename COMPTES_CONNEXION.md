# Comptes de développement et de démonstration

> Ce document ne contient **aucun mot de passe** et aucune adresse personnelle. Les comptes de démonstration n'existent que sur un poste
> de développement (`DEBUG=True`) et ne doivent jamais être créés sur un serveur en ligne.

## Liens locaux

| Espace | Adresse |
| :--- | :--- |
| Accueil | http://localhost:3000/ |
| Connexion | http://localhost:3000/connexion |
| Super administration | http://localhost:3000/admin |
| École (direction) | http://localhost:3000/ecole |
| Enseignant | http://localhost:3000/enseignant |
| Élève et parent | http://localhost:3000/dashboard |

Le port du frontend est celui de `npm run dev` (3000). Si le port 8000 est déjà pris sur votre machine, lancez Django sur un autre
port et renseignez-le dans `frontend/.env.local` (`DJANGO_API_URL=http://127.0.0.1:8001`).

## Créer les comptes

**Administrateur de la plateforme** (jamais de compte par défaut) :

```bash
cd backend
python manage.py createsuperuser
```

Choisir un mot de passe unique et long ; ne jamais le noter dans le dépôt.

**École de démonstration** (enseignants, parents, élèves, 11 classes) :

```bash
cd backend
python manage.py seed_curriculum
python manage.py seed_demo_school --reset   # affiche le mot de passe de démonstration généré (ou utilise DEMO_PASSWORD)
python manage.py seed_leaderboard_demo      # élèves fictifs pour le classement ; --clear les supprime
```

Le mot de passe de démonstration est affiché une seule fois par `seed_demo_school` (ou fixé par la variable `DEMO_PASSWORD`).
Ces commandes refusent de s'exécuter si `DEBUG` n'est pas `True`.

## Retrouver les identifiants d'un élève d'école

Dans l'espace école, onglet **Élèves**, bouton **« Fiche de connexion »** : il affiche ou réinitialise le mot de passe temporaire de l'élève.
