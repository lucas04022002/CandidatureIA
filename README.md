# ApplyBot

ApplyBot est une base SaaS IA pour automatiser la préparation de candidatures:

- dashboard (`/dashboard`)
- pipeline d'offres (`/jobs`)
- candidatures générées (`/applications`)

## Stack

- Next.js App Router + TypeScript
- Tailwind CSS
- Supabase (DB)

## Lancer le projet

```bash
npm install
npm run dev
```

## Configurer Supabase

Créer un fichier `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
FRANCE_TRAVAIL_CLIENT_ID=...
FRANCE_TRAVAIL_CLIENT_SECRET=...
# optionnel:
FRANCE_TRAVAIL_TOKEN_URL=https://entreprise.francetravail.fr/connexion/oauth2/access_token?realm=/partenaire
FRANCE_TRAVAIL_API_BASE_URL=https://api.francetravail.io/partenaire/offresdemploi/v2
FRANCE_TRAVAIL_SCOPE=api_offresdemploiv2 o2dsoffre
ADZUNA_APP_ID=...
ADZUNA_APP_KEY=...
ADZUNA_COUNTRY=fr
JOOBLE_API_KEY=...
OPENAI_API_KEY=...
OPENAI_MODEL=gpt-4.1-mini
SCORING_MODE=heuristic
MAX_OPENAI_SCORES_PER_RUN=5
```

Sans ces variables, l'UI ne peut pas lire/écrire les données.

## Créer la base Supabase

Exécuter le SQL de migration:

- `supabase/migrations/20260519_000001_init_applybot.sql`

Le script crée:

- `jobs`
- `applications`
- status enum + indexes + seed initial

## Scraping MVP

Endpoint disponible:

- `POST /api/scrape-jobs`
- `POST /api/generate-application`
- `POST /api/rescore-jobs`

Comportement:

- tente un scraping réel via France Travail, Adzuna et Jooble (si configurés)
- renvoie une erreur explicite si credentials absents/erreur API
- évite les doublons (titre + entreprise + lieu)
- insère les nouvelles offres dans `jobs`
- met à jour les anciennes offres avec les nouveaux liens/descriptions quand possible
- accepte des filtres (`keywords`, `location`, `contract`, `limit`, `remoteOnly`)
- score chaque offre automatiquement (OpenAI si configuré, sinon heuristique locale)

Modes de scoring:

- `SCORING_MODE=heuristic`: gratuit, aucun appel OpenAI
- `SCORING_MODE=hybrid`: scoring mixte (OpenAI limité par `MAX_OPENAI_SCORES_PER_RUN`)
- `SCORING_MODE=openai`: OpenAI prioritaire (fallback heuristique si échec OpenAI)

`POST /api/generate-application`:

- prend `jobId` en entrée
- génère lettre, email et message LinkedIn personnalisés
- crée ou met à jour la table `applications`

`POST /api/rescore-jobs`:

- recalcule les scores des offres déjà en base
- utile après changement de logique de scoring

## Vérification

```bash
npm run lint
npm run build
```
