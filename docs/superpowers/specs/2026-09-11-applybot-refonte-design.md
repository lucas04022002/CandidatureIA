# ApplyBot — refonte B2B organismes de formation (spec, 11/09/2026)

## Décisions prises avec Lucas

- Le parcours candidat existant est conservé tel quel : CV → profil → offres agrégées → score → textes de candidature → « Postuler » vers l'offre d'origine → suivi → relance J+4. L'app n'envoie jamais rien à la place du candidat.
- Le client est l'**organisme de formation**, qui achète des places pour ses stagiaires. Le stagiaire s'inscrit avec un **code d'organisme**.
- **Pas d'IA** : le chemin heuristique (déjà le seul utilisé en pratique) devient le chemin unique. Tout le code OpenAI sort.
- **Supabase remplacé** par Postgres 16 sur le VPS + authentification maison, sur le modèle de RushPlay.
- **Une seule base de code Next.js** (voie 1) : les connecteurs, le parser de CV et le scoring TypeScript sont réutilisés tels quels.
- **La Bonne Alternance reste** tant que rien n'est vendu, derrière un interrupteur.
- Le nom reste **ApplyBot**.
- Hors périmètre de cette spec : Stripe, envoi d'e-mails, compteurs de supervision pour l'organisme, refonte du front (spec séparée, en dernier).

## 1. Architecture

| Couche | Choix |
|---|---|
| Application | Next.js 16 App Router, TypeScript strict, React 19, Tailwind 4 (UI maison existante conservée jusqu'à la refonte du front) |
| Base | Postgres 16 (Docker Compose en local, ressource Coolify en prod) |
| Accès données | Drizzle ORM + `drizzle-kit` pour les migrations versionnées dans `drizzle/` ; une migration initiale `0000_init` remplace les 12 migrations Supabase (même contenu, plus `organisations` et `users`) |
| Auth | Mot de passe haché **argon2id** ; jeton JWT HS256 (`JWT_SECRET`, 7 jours) dans un cookie `ab_session` `httpOnly` `SameSite=Lax` `Secure` en prod ; `lib/auth/session.ts` expose `getSession()` / `requireUser()` / `requireRole()` |
| Garde | Plus de `proxy.ts` Supabase. Un `middleware.ts` minimal redirige vers `/login` les pages privées sans cookie ; **chaque route API appelle `requireUser()` elle-même**, et refuse (401) si le cookie manque ou est invalide. Aucun mode « config absente = ouvert » |
| Fichiers | Le CV téléversé n'est pas conservé : seul le texte extrait l'est (`raw_text`), comme aujourd'hui |
| Déploiement | `Dockerfile` standalone Next (multi-stage), `docker-compose.yml` local (app + Postgres), CI GitHub Actions (`lint`, `typecheck`, `test`, `build`, grep des secrets), service Coolify à côté de RushPlay |
| Config | `.env.example` complet ; secrets saisis par Lucas dans Coolify ; `SOURCE_LBA=on|off` |

Structure cible (déplacements, pas de réécriture des modules réutilisés) :

```
app/                      pages (inchangées) + app/api/*  (routes réécrites sur requireUser)
lib/auth/                 password.ts (argon2), jwt.ts, session.ts, org-code.ts
lib/db/                   client.ts (drizzle + pg), schema.ts, queries/ (jobs, applications, profiles, organisations, users)
lib/scrapers/             7 connecteurs, inchangés, + registry.ts (liste + interrupteur LBA)
lib/scoring/job-scoring.ts  heuristique seule
lib/cv-parser.ts          inchangé (un seul parseur PDF : pdf-parse)
lib/application-generation.ts  gabarits heuristiques seuls
lib/rate-limit.ts         quota de recherche par utilisateur
drizzle/                  migrations
tests/                    Vitest (voir §6)
```

## 2. Données et rôles

Rôles : `stagiaire`, `responsable`, `admin`.

```
organisations
  id uuid pk, name text, code char(8) unique, seats int (≥ 0), active bool,
  created_at, updated_at
users
  id uuid pk, email citext unique, password_hash text, role enum,
  organisation_id uuid fk (null pour admin), last_login_at, created_at,
  deleted_at (null = actif)
candidate_profiles   (existant) + user_id fk not null unique
jobs                 (existant) + user_id fk not null
applications         (existant) + user_id fk not null
```

Règles :
- Un `stagiaire` et un `responsable` appartiennent toujours à une organisation ; l'`admin` (Lucas) à aucune.
- Places : `count(users where organisation_id = X and role = 'stagiaire' and deleted_at is null) < seats`, vérifié dans une transaction à l'inscription.
- Le code d'organisme : 8 caractères en majuscules et chiffres sans ambiguïté (pas de O/0, I/1), régénérable par le responsable ; l'ancien cesse de fonctionner immédiatement.
- Suppression de compte : `deleted_at` posé, puis effacement physique des lignes `candidate_profiles`, `jobs`, `applications` de l'utilisateur dans la même transaction ; l'e-mail est remplacé par `deleted-<uuid>@invalid` pour libérer l'adresse. Une organisation ne se supprime que par l'admin, et seulement sans stagiaire actif.
- Toutes les requêtes de données sont filtrées par `user_id` de la session, côté serveur, sans exception. Pas de RLS Postgres (une seule application, un seul rôle SQL).

## 3. Parcours et routes

### Comptes
- `POST /api/auth/register` : `{ email, password, orgCode }` → crée un `stagiaire` si le code existe, l'organisation est active et il reste une place ; sinon 400 avec un message précis (« code inconnu », « organisme inactif », « plus de place disponible »). Mot de passe ≥ 10 caractères.
- `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`.
- `POST /api/auth/register-organisation` : `{ organisationName, email, password }` → crée l'organisation **inactive** avec `seats = 0` et son `responsable`. L'admin l'active et fixe les places depuis `/admin` (pas de paiement au lancement).
- `DELETE /api/account` : suppression de compte (stagiaire ou responsable), voir §2.
- `GET /api/account/export` : JSON de toutes les données de l'utilisateur (profil, offres, candidatures).

### Organisme (`responsable`)
- `GET /organisme` : nom, code, places utilisées / achetées, liste des stagiaires (e-mail, date d'inscription, dernière connexion). **Aucune donnée de CV, d'offre ni de candidation n'est visible par le responsable.**
- `POST /api/organisation/regenerate-code`.
- `POST /api/organisation/remove-member` : retire un stagiaire (suppression de compte identique à `DELETE /api/account`, sur demande du responsable).

### Admin (`admin`)
- `GET /admin` : organisations, activation, places, dernier accès. `POST /api/admin/organisation` : `{ id, active, seats }`.
- Un seul compte admin, créé par script `npm run create-admin` (e-mail et mot de passe saisis dans le terminal, jamais en variable d'environnement).

### Candidat (`stagiaire`) — routes existantes réécrites sur `requireUser()`
`import-cv`, `update-candidate-profile`, `scrape-jobs`, `rescore-jobs`, `generate-application`, `generate-followup`, `update-application-status`, `mark-job-applied`, `delete-application`. Même contrat d'entrée/sortie qu'aujourd'hui, mêmes pages.

### Quotas et protection
- `scrape-jobs` : **1 recherche par utilisateur par heure** (table `search_runs(user_id, started_at)` ; 429 avec l'heure de la prochaine recherche). Les résultats sont conservés, l'utilisateur relit ses offres sans relancer.
- `import-cv` : 5 Mo, PDF ou texte, 10 imports par jour.
- Connexion : 10 essais par e-mail par 15 minutes (429).
- Origine vérifiée sur les mutations (`sec-fetch-site` / `Origin` = hôte) comme dans RushPlay.

## 4. Ce qui sort

- `lib/application-generation.ts` : suppression de la branche OpenAI (`callOpenAI`, `response_format`, `OPENAI_*`) ; les gabarits heuristiques deviennent le seul chemin, sans changement de sortie.
- `lib/scoring/job-scoring.ts` : suppression du mode `openai`/`hybrid` et de `MAX_OPENAI_SCORES_PER_RUN`.
- `lib/supabase/*`, `@supabase/ssr`, `@supabase/supabase-js`, `proxy.ts`, `app/auth/callback`.
- `pdf2json` (doublon) ; `pdf-parse` reste.
- `tmp/` entier (tests orphelins avec des données personnelles réelles) ; `tsconfig.tsbuildinfo` et `.next/` ignorés.
- `.env.local` retiré du suivi git et **purgé de l'historique** (`git filter-repo`) puis force push, **après** révocation des clés par Lucas et son accord explicite. `.gitignore` durci et CI qui échoue si un fichier `.env*` autre que `.env.example` est suivi.
- La Bonne Alternance : conservée, activée par `SOURCE_LBA=on` (défaut `on`), à passer à `off` le jour de la première facture (rappel dans `docs/PRICING.md`).

## 5. RGPD et textes

- Données traitées : e-mail, hash, texte de CV extrait, profil dérivé, offres et candidatures de l'utilisateur, horodatages de connexion. Aucun transfert à un tiers (plus d'OpenAI) ; les connecteurs n'envoient aux sources que les critères de recherche (mots-clés, lieu), jamais le CV.
- Droits : export JSON et suppression en un clic depuis `/profil` ; suppression par le responsable (`remove-member`).
- Conservation : comptes sans connexion depuis **12 mois** supprimés par une tâche planifiée `npm run purge-inactive` (cron Coolify hebdomadaire), après un e-mail d'avertissement **quand l'envoi d'e-mail existera** (d'ici là, simple suppression documentée dans les CGU).
- Pages `/mentions-legales`, `/cgu` (contrat organisme : places, durée, résiliation, sous-traitance RGPD art. 28 ; notice stagiaire : finalités, droits, durée) sur le modèle de RushPlay (`lib/legal.ts` avec champs « À COMPLÉTER » et garde CI `CI_STRICT_LEGAL`).
- Hébergement : Hetzner (Allemagne, UE).

## 6. Tests et qualité

- Vitest (`npm test`), CI verte obligatoire.
- Connecteurs : chaque connecteur testé sur une **réponse enregistrée** (`tests/fixtures/<source>.json`, anonymisée) → normalisation, dédoublonnage, `isConfigured()` sans clé.
- Parser de CV : 3 CV **fictifs** (créés pour les tests, aucune personne réelle) en texte, plus un PDF fictif généré.
- Scoring : cas bornés (0, 100, mots-clés absents).
- Génération : sorties des gabarits (lettre, e-mail, LinkedIn, relance) stables, sans le vocabulaire IA.
- Auth et organisation : inscription par code (inconnu, inactif, plein, ok), régénération de code, rôles (un stagiaire ne voit pas `/organisme`, un responsable ne voit pas les données d'un stagiaire), suppression de compte (données physiquement absentes après), export.
- Quotas : deuxième `scrape-jobs` dans l'heure → 429.
- Routes : chaque route API sans cookie → 401 (test paramétré sur la liste des routes).
- Migrations : `drizzle-kit` génère, un test applique `0000_init` sur un Postgres de CI (service GitHub Actions) et vérifie les tables.
- Grep CI : aucun `OPENAI`, `supabase`, `sk-` dans `app/ lib/` ; aucun fichier `.env*` suivi.

## 7. Ordre de livraison (pour le plan)

1. Mise au propre du dépôt : commit de l'état actuel, retrait de `tmp/` et des données perso, `.gitignore`, CI squelette.
2. Base et auth : schéma Drizzle, migration initiale, Docker Compose local, `lib/auth`, routes `auth/*`, script admin.
3. Organisations : tables, code, inscription par code, pages `/organisme` et `/admin`.
4. Réécriture des 9 routes candidat sur `requireUser()` + `lib/db/queries`, retrait de Supabase.
5. Retrait de l'IA, du doublon PDF, interrupteur LBA, quotas.
6. RGPD : suppression, export, purge des inactifs, pages légales.
7. Docker, CI complète, documentation de déploiement Coolify (à la suite de RushPlay).
8. Purge des secrets de l'historique (après révocation et accord de Lucas).

Ensuite, spec séparée : refonte du front.
