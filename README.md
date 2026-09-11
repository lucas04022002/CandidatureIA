# ApplyBot

ApplyBot est un SaaS **B2B** pour organismes de formation : chaque organisme
inscrit ses stagiaires, qui utilisent l'outil pour préparer leurs
candidatures. Pas d'IA (aucun appel OpenAI ni équivalent) : la génération de
lettres/e-mails/messages LinkedIn et le scoring des offres sont **heuristiques**,
pas de dépendance à une API tierce payante pour la partie génération.

- `/dashboard` : tableau de bord du stagiaire
- `/jobs` : pipeline d'offres collectées
- `/applications` : candidatures générées, suivi de statut
- `/organisme` : espace responsable d'organisme (activation, places, membres)
- `/admin` : administration ApplyBot (validation des organismes)

Roadmap monétisation (plans, quotas, points de vigilance) : voir
[`docs/PRICING.md`](docs/PRICING.md).

## Stack

- Next.js App Router + TypeScript, Tailwind CSS
- **Postgres** (Drizzle ORM) — [`drizzle-orm/node-postgres`](https://orm.drizzle.team/)
  en production, [PGlite](https://pglite.dev/) (Postgres compilé en WASM, un
  fichier local) en développement — même schéma, même SQL, deux pilotes
  interchangeables via `DATABASE_URL` (voir `lib/db/client.ts`)
- Authentification maison (pas de service tiers) : mot de passe haché
  (`hash-wasm`), session signée en JWT (`jose`) — voir `lib/auth/`

## Lancer le projet en local

```bash
npm install
cp .env.example .env
```

Éditer `.env` :

- `DATABASE_URL=pglite://./data/dev` : base Postgres locale, un fichier sous
  `data/` (créé automatiquement, ignoré par Git). Pas d'installation Postgres
  nécessaire pour développer.
- `JWT_SECRET` : générer une chaîne aléatoire d'au moins 32 caractères, par
  exemple `openssl rand -hex 32`.
- Les autres variables (`FRANCE_TRAVAIL_*`, `ADZUNA_*`, `JOOBLE_API_KEY`,
  `LBA_API_KEY`, `GREENHOUSE_BOARD_TOKENS`, `LEVER_COMPANY_TOKENS`,
  `SMARTRECRUITERS_COMPANY_TOKENS`) sont facultatives : une source sans clé
  est simplement désactivée, sans erreur.

Puis :

```bash
npm run db:migrate    # applique les migrations Drizzle (drizzle/) sur DATABASE_URL
npm run create-admin  # crée le premier compte administrateur (invite e-mail + mot de passe)
npm run dev            # http://127.0.0.1:3000 — préférer 127.0.0.1 à localhost (voir note plus bas)
```

> Sur Windows, `http://localhost` peut ajouter plusieurs secondes de latence
> par requête (résolution IPv6 avant repli IPv4) ; utiliser `127.0.0.1`
> directement.

## Scripts

| Commande | Rôle |
| --- | --- |
| `npm run dev` | serveur de développement |
| `npm run build` | build de production (`output: "standalone"`, voir `next.config.ts`) |
| `npm run start` | démarre le build de production |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | suite de tests (Vitest) |
| `npm run db:generate` | génère une migration Drizzle à partir de `lib/db/schema.ts` |
| `npm run db:migrate` | applique les migrations sur `DATABASE_URL` |
| `npm run create-admin` | crée le compte administrateur (un seul, refuse si un existe déjà) |
| `npm run purge-inactive` | purge RGPD des comptes sans connexion depuis 12 mois (`lib/legal.ts`, `RETENTION_MONTHS`) — cron en production, voir `deploy/crontab.txt` |

## Tests

```bash
npm test
```

Vitest, environnement Node. Les tests qui touchent la base utilisent PGlite
par défaut (`tests/setup.ts` fixe `DATABASE_URL=pglite://memory` si elle
n'est pas déjà définie) — aucune base à installer pour lancer la suite. La CI
(`.github/workflows/ci.yml`) exécute en plus la même suite sur un vrai
Postgres 16, pour couvrir les deux pilotes de `lib/db/client.ts`.

## Sources d'offres

`POST /api/scrape-jobs` interroge, selon les clés configurées : France
Travail, Adzuna, Jooble, La Bonne Alternance, Greenhouse, Lever et
SmartRecruiters. Détail de configuration de chaque source (tokens, formats,
liens vers les API publiques) : voir les commentaires de `.env.example` et
`lib/scrapers/`.

## Déploiement

Guide complet (Hetzner + Coolify, variables d'environnement, migration
automatique au démarrage, cron de purge RGPD, étapes avant ouverture au
public) : [`deploy/coolify.md`](deploy/coolify.md).
