# syntax=docker/dockerfile:1

# ApplyBot — image de production (Next.js standalone + migration Drizzle au démarrage).
#
# Choix pour la migration (scripts/migrate.ts) : le script est exécuté avec `tsx` embarqué dans
# l'image plutôt que compilé en JS pur au build (esbuild/tsc → dist/migrate.mjs). Avantage : le
# script reste identique dev/prod (mêmes imports TypeScript relatifs, lib/db/client.ts inclus),
# sans étape de build supplémentaire à maintenir. Coût : quelques Mo de plus dans l'image finale.
# Si la taille de l'image devient un problème, basculer vers un
# `esbuild scripts/migrate.ts --bundle --platform=node --format=esm --outfile=dist/migrate.mjs`
# ajouté au stage `build`, et changer le CMD pour `node dist/migrate.mjs`.
#
# Choix pour node_modules dans le runner : `output: "standalone"` (next.config.ts) ne trace que ce
# que le serveur Next.js importe réellement — pas forcément `tsx`, `drizzle-orm` ou `pg`, puisque
# scripts/migrate.ts est en dehors du bundle applicatif. Plutôt que recopier ces paquets un par un
# (risque d'oublier une dépendance transitive hissée à la racine de node_modules par npm, ex.
# pg-connection-string, pg-pool, esbuild, get-tsconfig — vérifié dans ce dépôt : npm hisse tout,
# rien n'est imbriqué sous node_modules/pg ou node_modules/tsx), le runner copie l'intégralité du
# node_modules du stage `build` (post `npm ci`, devDependencies comprises) par-dessus le
# node_modules élagué de la sortie standalone. Plus simple et plus sûr à l'aveugle (pas de Docker
# disponible pour vérifier localement) ; l'image est plus grosse que le minimum théorique.

# ---- deps : dépendances npm complètes (nécessaires pour builder Next.js et pour la migration) ----
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ---- build : build Next.js (sortie standalone) ----
FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Next.js embarque les variables NEXT_PUBLIC_* au build ; aucune n'existe dans ce projet
# (pas de code client dépendant d'une clé publique), donc aucun --build-arg n'est nécessaire pour ça.
#
# DATABASE_URL et JWT_SECRET, en revanche, DOIVENT être présentes ici, même avec des valeurs
# factices : lib/db/client.ts et lib/auth/session.ts lisent process.env dès l'import du module (effet
# de bord au chargement, pas seulement à l'appel), et `next build` importe les modules de toutes les
# routes API pour les analyser (phase « Collecting page data ») — sans ces deux variables, le build
# échoue ici (vérifié en local : retrait des deux fait échouer `npm run build` avec « DATABASE_URL
# manquante »). Ces valeurs ne sont utilisées que pendant cette étape de build : Next.js ne les
# embarque pas dans le bundle (seules les variables NEXT_PUBLIC_* le sont), le serveur standalone les
# relit depuis l'environnement du conteneur à l'exécution — les vraies valeurs, saisies par Lucas
# dans Coolify (voir deploy/coolify.md), prennent le dessus au démarrage réel.
#
# Passées en préfixe de la commande (pas en ENV de stage) : une ENV persiste dans les métadonnées de
# l'image (visible via `docker history`/`docker inspect`) et déclenche l'avertissement BuildKit
# SecretsUsedInArgOrEnv sur toute variable au nom qui ressemble à un secret — ici sans objet
# puisqu'aucune vraie valeur n'y transite, mais autant ne pas laisser une fausse alerte dans l'image.
RUN DATABASE_URL=postgres://build:build@localhost:5432/build \
    JWT_SECRET=build-time-placeholder-not-a-real-secret-000000 \
    npm run build

# ---- runner : image finale ----
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Utilisateur non-root fourni par l'image node officielle.
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

# Sortie standalone Next.js : server.js + son node_modules élagué.
COPY --from=build --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=build --chown=nextjs:nodejs /app/public ./public

# Migration au démarrage (scripts/migrate.ts, et scripts/create-admin.ts / purge-inactive.ts lancés
# à la main depuis le terminal Coolify, voir deploy/coolify.md) : fichiers SQL + métadonnées Drizzle,
# les scripts eux-mêmes, et TOUT ce qu'ils importent — scripts/*.ts importe lib/db/client.ts en
# relatif (../lib/...), qui lui-même importe une partie de lib/ (queries, auth) via l'alias
# TypeScript "@/..." (lib/db/queries/users.ts, lib/db/queries/organisations.ts, lib/auth/jwt.ts...).
# Sans lib/ ici, ces imports relatifs échouent (module introuvable) ; sans tsconfig.json, tsx ne sait
# pas résoudre "@/..." (il lit compilerOptions.paths via get-tsconfig) et échoue pareillement — les
# deux sont nécessaires, pas seulement scripts/ et drizzle/. node_modules complet copié en dernier,
# par-dessus celui de la sortie standalone : voir le commentaire en tête de fichier (garantit tsx,
# drizzle-orm, pg et leurs dépendances hissées).
COPY --from=build --chown=nextjs:nodejs /app/drizzle ./drizzle
COPY --from=build --chown=nextjs:nodejs /app/scripts ./scripts
COPY --from=build --chown=nextjs:nodejs /app/lib ./lib
COPY --from=build --chown=nextjs:nodejs /app/tsconfig.json ./tsconfig.json
COPY --from=build --chown=nextjs:nodejs /app/node_modules ./node_modules

USER nextjs
EXPOSE 3000

# Vérifie que le serveur répond réellement (pas seulement que le process tourne) : /login est une
# page statique (pas de dépendance DB dans son rendu), donc ce healthcheck reste fiable même si la
# base est momentanément indisponible après le démarrage.
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s CMD wget -qO- http://127.0.0.1:3000/login >/dev/null || exit 1

# Migration Drizzle (idempotente : ne rejoue que les migrations non encore appliquées) puis
# démarrage du serveur Next.js standalone. `&&` : si la migration échoue, le conteneur s'arrête au
# lieu de démarrer un serveur pointant vers un schéma incomplet.
CMD ["sh", "-c", "node node_modules/tsx/dist/cli.mjs scripts/migrate.ts && node server.js"]
