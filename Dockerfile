# syntax=docker/dockerfile:1

# ApplyBot — image de production (Next.js standalone + migration Drizzle au démarrage).
#
# Choix pour les scripts de maintenance (migration au démarrage, et création d'administrateur,
# purge, jeu de démonstration lancés à la main depuis le terminal Coolify) : ils sont compilés en
# bundles autonomes par esbuild à l'étape `build`, et l'image finale n'embarque que ces bundles.
#
# L'image portait auparavant TOUT le node_modules du stage de build, devDependencies comprises,
# pour garantir que `tsx` et les dépendances des scripts soient présents — la sortie `standalone`
# de Next ne trace que ce que le serveur importe, pas ce que des scripts hors bundle utilisent.
# C'était simple et sûr, et ça coûtait plus d'un gigaoctet : l'image pesait 1,57 Go alors que le
# site lui-même en fait moins de 100 Mo. Neuf déploiements du portfolio construits de la même
# façon ont rempli le disque du serveur et fait tomber Coolify ; on ne garde plus ce genre de
# marge « au cas où ».
#
# Chaque script devient un fichier unique de 1,5 Mo, dépendances incluses. `pg-native` et
# `cpu-features` sont exclus : ce sont des modules natifs optionnels que `pg` et ses dépendances
# chargent dynamiquement s'ils existent, et qui ne sont pas installés ici.

# ---- deps : dépendances complètes, nécessaires pour construire ----
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ---- prod-deps : les dépendances d'exécution seules ----
#
# `pdf-parse` est chargé dynamiquement par l'application au moment de l'import d'un CV, hors du
# bundle Next : la sortie standalone ne le trace pas, et il réclame ses propres dépendances
# (@napi-rs/canvas et les polyfills DOMMatrix) à l'exécution. Une image sans node_modules casse
# donc l'import de CV — constaté par le test de fumée, pas deviné.
#
# On garde donc un node_modules, mais celui des dépendances d'exécution uniquement : les seize
# devDependencies (TypeScript, ESLint, vitest, tsx, drizzle-kit…) restent dans les étapes de
# construction. tsx n'est plus nécessaire à l'exécution depuis que les scripts sont compilés.
FROM node:22-alpine AS prod-deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

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

# Les scripts de maintenance, compilés en bundles autonomes. `--packages=bundle` force l'inclusion
# des dépendances dans le fichier produit : sans lui, esbuild les laisserait en imports externes et
# le bundle réclamerait un node_modules que l'image n'a plus.
RUN npx esbuild scripts/migrate.ts scripts/create-admin.ts scripts/purge-inactive.ts scripts/seed-demo.ts     --bundle --platform=node --format=cjs --target=node22 --packages=bundle     --external:pg-native --external:cpu-features     --outdir=dist/scripts --out-extension:.js=.cjs

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

# Les fichiers SQL de migration, lus au démarrage par le bundle de migration, et les bundles
# eux-mêmes. Ni scripts/, ni lib/, ni tsconfig.json : tout ce dont ils ont besoin est déjà
# à l'intérieur des bundles.
COPY --from=build --chown=nextjs:nodejs /app/drizzle ./drizzle
COPY --from=build --chown=nextjs:nodejs /app/dist/scripts ./dist/scripts

# Ce que Next ne trace pas, et rien de plus.
#
# Copier tout le node_modules de production coûtait encore 618 Mo, dont 384 pour `next` et
# `@next` — déjà présents, en version élaguée, dans la sortie standalone — et 25 pour PGlite,
# qui n'est que le pilote de développement local.
#
# L'arbre de pdf-parse est clos et vérifié : pdf-parse dépend de @napi-rs/canvas et de
# pdfjs-dist, pdfjs-dist n'a que @napi-rs/canvas en dépendance optionnelle. Trois copies
# suffisent donc, et le test de fumée importe un vrai PDF par l'API pour le prouver à chaque
# exécution — c'est lui qui a détecté que l'import était cassé quand l'image n'avait aucun
# node_modules.
COPY --from=prod-deps --chown=nextjs:nodejs /app/node_modules/pdf-parse ./node_modules/pdf-parse
COPY --from=prod-deps --chown=nextjs:nodejs /app/node_modules/pdfjs-dist ./node_modules/pdfjs-dist
COPY --from=prod-deps --chown=nextjs:nodejs /app/node_modules/@napi-rs ./node_modules/@napi-rs

USER nextjs
EXPOSE 3000

# Vérifie que le serveur répond réellement (pas seulement que le process tourne) : /login est une
# page statique (pas de dépendance DB dans son rendu), donc ce healthcheck reste fiable même si la
# base est momentanément indisponible après le démarrage.
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s CMD wget -qO- http://127.0.0.1:3000/login >/dev/null || exit 1

# Migration Drizzle (idempotente : ne rejoue que les migrations non encore appliquées) puis
# démarrage du serveur Next.js standalone. `&&` : si la migration échoue, le conteneur s'arrête au
# lieu de démarrer un serveur pointant vers un schéma incomplet.
#
# Les trois autres scripts se lancent à la main depuis le terminal Coolify :
#   node dist/scripts/create-admin.cjs
#   node dist/scripts/purge-inactive.cjs
#   node dist/scripts/seed-demo.cjs
CMD ["sh", "-c", "node dist/scripts/migrate.cjs && node server.js"]
