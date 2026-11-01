FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# DJANGO_API_URL est lu par next.config.ts (réécriture /api/*) : il est figé au build, on le passe donc en ARG.
ARG DJANGO_API_URL=http://backend:8000
ENV DJANGO_API_URL=$DJANGO_API_URL
RUN npm run build
# Les outils de développement (lint, TypeScript, tests...) ne servent plus une fois le build terminé : ils ne partent pas en production.
RUN npm prune --omit=dev

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
# Les fichiers appartiennent à l'utilisateur « node » : Next écrit son cache d'images dans .next/cache au fonctionnement.
COPY --from=build --chown=node:node /app ./
USER node
EXPOSE 3001
# Santé du conteneur : le serveur répond (robots.txt est statique, sans dépendance au backend).
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3001/robots.txt >/dev/null || exit 1
CMD ["npm", "run", "start"]
