# ApplyBot

ApplyBot est une base SaaS IA pour automatiser la préparation de candidatures:

- dashboard (`/dashboard`)
- pipeline d'offres (`/jobs`)
- candidatures générées (`/applications`)

Roadmap monétisation (plans, quotas, points de vigilance): voir [`docs/PRICING.md`](docs/PRICING.md).

## Stack

- Next.js App Router + TypeScript
- Tailwind CSS
- Supabase (DB + Auth)

## Authentification

L'app est protégée par Supabase Auth (email + mot de passe):

- `/login`: connexion / inscription
- `proxy.ts`: redirige les visiteurs non connectés et renvoie 401 sur `/api/*`
- chaque table porte un `user_id` avec des policies RLS `auth.uid() = user_id`

Configuration côté Supabase:

1. activer le provider Email dans Authentication > Providers
2. appliquer la migration `supabase/migrations/20260611_000012_add_user_auth_rls.sql`
3. pour rattacher des données existantes à ton compte, suivre le bloc commenté de la migration (backfill `user_id`)

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
LBA_API_KEY=...
LBA_API_BASE_URL=https://api.apprentissage.beta.gouv.fr/api
GREENHOUSE_BOARD_TOKENS=acme,another-company
LEVER_COMPANY_TOKENS=plaid,company-two
SMARTRECRUITERS_COMPANY_TOKENS=Believe,AccorCorpo,KIABI
OPENAI_API_KEY=...
OPENAI_MODEL=gpt-4.1-mini
SCORING_MODE=heuristic
MAX_OPENAI_SCORES_PER_RUN=5
```

Sans ces variables, l'UI ne peut pas lire/écrire les données.

## Créer la base Supabase

Exécuter le SQL de migration:

- tous les fichiers de `supabase/migrations/` dans l'ordre

Le script init crée:

- `jobs`
- `applications`
- status enum + indexes

Les données de démonstration sont dans `supabase/seed.sql` (optionnel).

## Scraping MVP

Endpoint disponible:

- `POST /api/scrape-jobs`
- `POST /api/generate-application`
- `POST /api/rescore-jobs`

Comportement:

- tente un scraping réel via France Travail, Adzuna, Jooble, La bonne alternance, Greenhouse, Lever et SmartRecruiters (si configurés)
- renvoie une erreur explicite si credentials absents/erreur API
- évite les doublons (titre + entreprise + lieu)
- insère les nouvelles offres dans `jobs`
- met à jour les anciennes offres avec les nouveaux liens/descriptions quand possible
- accepte des filtres (`keywords`, `location`, `contract`, `limit`, `remoteOnly`)
- score chaque offre automatiquement (OpenAI si configuré, sinon heuristique locale)

Configuration Greenhouse:

- `GREENHOUSE_BOARD_TOKENS` accepte une liste séparée par virgules de `board tokens`
- exemple: `GREENHOUSE_BOARD_TOKENS=doctolib,alan,backmarket`
- chaque token correspond au segment `{board_token}` de l'API publique Greenhouse  
  Source: [Greenhouse Job Board API](https://developers.greenhouse.io/job-board.html)

Configuration Lever:

- `LEVER_COMPANY_TOKENS` accepte une liste séparée par virgules de `company tokens`
- exemple: `LEVER_COMPANY_TOKENS=plaid,convex`
- le scraper utilise l'endpoint public `https://api.lever.co/v0/postings/{company}?mode=json`

Configuration SmartRecruiters:

- `SMARTRECRUITERS_COMPANY_TOKENS` accepte une liste séparée par virgules de `company tokens`
- exemple orienté profils non-tech / mass market:
  `SMARTRECRUITERS_COMPANY_TOKENS=Believe,AccorCorpo,KIABI`
- le scraper utilise les endpoints publics :
  `https://api.smartrecruiters.com/v1/companies/{company}/postings`
  et `https://api.smartrecruiters.com/v1/companies/{company}/postings/{id}`

Exemples de packs de tokens utiles:

- Greenhouse: `doctolib,mirakl`
- Lever: `malt,aircall,spendesk`
- SmartRecruiters: `Believe,AccorCorpo,KIABI`

Configuration La bonne alternance:

- `LBA_API_KEY` accepte le jeton obtenu sur l'espace développeurs officiel
- optionnel: `LBA_API_BASE_URL=https://api.apprentissage.beta.gouv.fr/api`
- le scraper utilise `GET /job/v1/search`
- source officielle: [API Apprentissage](https://api.apprentissage.beta.gouv.fr/)
- cette source est particulièrement utile pour l'alternance
- l'API est annoncée comme réservée aux usages non lucratifs dans la documentation officielle

Modes de scoring:

- `SCORING_MODE=heuristic`: gratuit, aucun appel OpenAI
- `SCORING_MODE=hybrid`: scoring mixte (OpenAI limité par `MAX_OPENAI_SCORES_PER_RUN`)
- `SCORING_MODE=openai`: OpenAI prioritaire (fallback heuristique si échec OpenAI)

`POST /api/generate-application`:

- prend `jobId` en entrée
- génère lettre, email et message LinkedIn personnalisés
- utilise OpenAI si `OPENAI_API_KEY` est défini, sinon un mode heuristique local
- crée ou met à jour la table `applications`

`POST /api/rescore-jobs`:

- recalcule les scores des offres déjà en base
- utile après changement de logique de scoring

## Vérification

```bash
npm run lint
npm run build
```
