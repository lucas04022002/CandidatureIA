# ApplyBot

**SaaS B2B de suivi de candidatures pour organismes de formation.** Chaque organisme
inscrit ses stagiaires, qui préparent leurs candidatures depuis l'outil.

[**Voir le produit en ligne →**](https://applybot.lucasguilhot.fr) · [Étude de cas complète](https://lucasguilhot.fr/projets/applybot) · [Portfolio](https://lucasguilhot.fr)

`Next.js` `TypeScript` `Node` `PostgreSQL` `Docker`

<img src="https://raw.githubusercontent.com/lucas04022002/CandidatureIA/main/assets/apercu-applybot.jpg" alt="Page d'accueil d'ApplyBot." width="100%">

---

## La décision qui compte

Le produit s'appelait CandidatureIA et reposait sur un modèle de langage pour rédiger
lettres et messages. Mesuré : le résultat n'était pas meilleur que ce qu'un stagiaire
obtient gratuitement ailleurs, et il coûtait un abonnement par utilisateur — une
dépense qui grandit avec le nombre d'utilisateurs, sur un produit vendu au forfait
à l'organisme.

**Le fournisseur d'IA a été retiré.** La génération de lettres, d'e-mails et de
messages LinkedIn ainsi que le scoring des offres sont désormais **heuristiques** :
aucun appel à une API tierce, aucune dépendance payante, et un coût par candidature
de **0 €**.

## Chiffres

- **202 tests automatisés**, de la base de données aux composants d'interface
- **7 sources d'offres** publiques, dédupliquées par URL
- **3 rôles** — stagiaire, responsable d'organisme, administration
- **0 €** de coût d'IA par candidature
- **100** en performance, accessibilité, bonnes pratiques et SEO (Lighthouse)

## Les écrans

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

- `DATABASE_URL=pglite://./data/dev` : base Postgres locale, un dossier sous
  `data/` (ignoré par Git). Pas d'installation Postgres nécessaire pour
  développer. **Créer `data/` avant la première migration** : PGlite crée bien
  `data/dev`, mais pas son dossier parent (`mkdir data`).
- `JWT_SECRET` : générer une chaîne aléatoire d'au moins 32 caractères, par
  exemple `openssl rand -hex 32`.
- `TRUSTED_PROXY_HOPS=0` en local (pas de reverse proxy devant l'appli : la
  limite anti-flood par IP est alors désactivée plutôt que de regrouper tout le
  monde sous une même adresse). `1` derrière Coolify/Traefik en production.
- Les autres variables (`FRANCE_TRAVAIL_*`, `ADZUNA_*`, `JOOBLE_API_KEY`,
  `LBA_API_KEY`, `SOURCE_LBA`, `GREENHOUSE_BOARD_TOKENS`,
  `LEVER_COMPANY_TOKENS`, `SMARTRECRUITERS_COMPANY_TOKENS`) sont facultatives :
  une source sans clé est simplement désactivée, sans erreur.

Puis :

```bash
mkdir data             # dossier parent de la base PGlite (une seule fois)
npm run db:migrate     # applique les migrations Drizzle (drizzle/) sur DATABASE_URL
npm run create-admin   # crée le premier compte administrateur (invite e-mail + mot de passe) — SERVEUR ARRÊTÉ
npm run dev            # http://127.0.0.1:3000 — préférer 127.0.0.1 à localhost (voir note plus bas)
```

> **Une seule application à la fois sur la base PGlite** : arrêtez `npm run dev` avant de lancer
> `create-admin`, `purge-inactive` ou un script maison, puis relancez-le. Deux processus sur le même
> dossier `data/` corrompent la base (à reconstruire avec `rm -rf data/dev && npm run db:migrate`).
>
> Les scripts `db:migrate`, `create-admin` et `purge-inactive` tournent sous
> `tsx`, hors de Next.js : ils lisent `.env.local` puis `.env` eux-mêmes
> (`scripts/load-env.ts`). Une variable déjà présente dans l'environnement
> l'emporte sur le fichier, et l'absence de fichier n'est pas une erreur —
> c'est le cas en production, où tout vient de l'environnement du conteneur.

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
| `npm run create-admin` | crée le compte administrateur (un seul, refuse si un existe déjà) — en production : `node dist/scripts/create-admin.cjs` |
| `npm run purge-inactive` | purge RGPD des comptes sans connexion depuis 12 mois (`lib/legal.ts`, `RETENTION_MONTHS`) — en production : `node dist/scripts/purge-inactive.cjs`, voir `deploy/crontab.txt` |

## Interface

Direction visuelle « Bleu Klein » (spec
[`docs/superpowers/specs/2026-09-11-applybot-front-design.md`](docs/superpowers/specs/2026-09-11-applybot-front-design.md)) :
une seule couleur forte — le bleu `#1F2FD6` — posée en grand (barre de
navigation, accueil, score de correspondance, tampon d'état) et jamais
dispersée ; autour, du blanc cassé, du blanc, de l'encre et du gris. Les
titres sont en Syne, le texte en Instrument Sans, les métadonnées d'offre,
horodatages et codes d'organisme en JetBrains Mono, et le tampon d'état en
Barlow Condensed penché. Thématique claire unique, pas de mode sombre. Toutes
les couleurs viennent des jetons `@theme` de `app/globals.css`
(`klein`, `paper`, `ink`, `grey`, `line`, `good`/`warn`/`bad`) : deux tests
gardent la porte, l'un interdisant toute couleur écrite en dur dans `app/` et
`components/`, l'autre vérifiant le contraste AA des paires texte/fond. Les
composants partagés vivent à plat dans `components/` (`Shell`, `PageTitle`,
`Button`, `Field`, `Stamp`, `Score`, `OfferTile`, `Kpi`, `Table`, `Empty`,
`Toast`) ; aucune bibliothèque d'interface n'est installée.

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
