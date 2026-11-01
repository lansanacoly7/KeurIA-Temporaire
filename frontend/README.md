# Kër IA : frontend

Application Next.js 16 / React 19 (TypeScript). Elle sert l'interface et relaie `/api/*` vers l'API Django
(`backend/`) : le navigateur ne parle qu'à une seule origine, ce qui permet les cookies de session HttpOnly.

## Démarrer

```bash
npm install
npm run dev        # http://localhost:3001 (l'API Django doit tourner sur 127.0.0.1:8000)
```

| Commande | Rôle |
|---|---|
| `npm run dev` | serveur de développement (port 3001) |
| `npm run build` / `npm run start` | build et serveur de production |
| `npm run lint` | ESLint |
| `npx tsc --noEmit` | vérification des types |

## Configuration

- `DJANGO_API_URL` : adresse de l'API Django (aussi utilisée par le rendu serveur, `app/local-auth.ts`) (défaut `http://127.0.0.1:8000`). Lue au **build** par `next.config.ts`
  (réécriture de `/api/*`) : la fixer avant `npm run build`.
- En-têtes de sécurité (anti-clickjacking, nosniff, Referrer-Policy, Permissions-Policy) : `next.config.ts`.

## Organisation

- `app/dashboard/` : espace de l'enfant (parcours, jeux, classement, Palou).
- `app/parent/`, `app/enseignant/`, `app/ecole/`, `app/admin/` : espaces adulte, école et administration.
- `app/level-tiers.ts` : paliers de niveau. Ils sont **dupliqués côté serveur** (`backend/apps/progress/levels.py`) ;
  un test du backend échoue si les deux divergent.

L'XP n'est jamais calculée par le navigateur : le serveur la lit dans son catalogue à chaque activité validée.
