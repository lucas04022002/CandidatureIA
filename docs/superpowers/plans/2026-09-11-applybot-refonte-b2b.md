# ApplyBot — refonte B2B : plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remplacer Supabase et l'IA d'ApplyBot par Postgres + auth maison, ajouter les organismes de formation (code d'inscription, places, page responsable, page admin), la conformité RGPD, les quotas, les tests et le Docker, sans changer le parcours candidat.

**Architecture:** Une seule application Next.js 16 App Router. `lib/db` (Drizzle + pg) remplace `lib/supabase` ; `lib/auth` (argon2 + JWT en cookie httpOnly) remplace Supabase Auth et `proxy.ts` ; chaque route API appelle `requireUser()`. Les modules réutilisés tels quels : `lib/scrapers/*`, `lib/cv-parser.ts`, `lib/scoring/job-scoring.ts` (branche heuristique), `lib/application-generation.ts` (gabarits).

**Tech Stack:** Next.js 16.2.6, React 19, TypeScript 5 strict, Tailwind 4, Postgres 16, drizzle-orm + drizzle-kit + pg, argon2, jose (JWT), zod, Vitest + @testing-library/react, Docker (standalone), GitHub Actions.

## Global Constraints

- Spec : `docs/superpowers/specs/2026-09-11-applybot-refonte-design.md`. Le parcours candidat (CV → profil → offres → score → textes → « Postuler » vers l'offre → suivi → relance J+4) ne change pas ; mêmes pages, mêmes contrats d'entrée/sortie des 9 routes candidat.
- Branche `refonte-b2b` du dépôt `C:\Users\lucas\OneDrive\Desktop\CandidatureIA` (Windows, Git Bash). Commits en français, terminés par `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.
- Interdit dans `app/`, `lib/`, `components/` après la tâche 5 : `OPENAI`, `openai`, `supabase`, `sk-`. La CI l'impose (tâche 7).
- Aucun fichier `.env*` suivi sauf `.env.example`. **Ne jamais coller de clé dans le chat, les commits ou les tests.** Les tests n'appellent jamais le réseau (fixtures enregistrées, anonymisées).
- Rôles : `stagiaire`, `responsable`, `admin`. Toute requête de données filtrée par `user_id` de la session, côté serveur.
- Cookie de session `ab_session`, JWT HS256 signé avec `JWT_SECRET` (≥ 32 caractères, refus au démarrage sinon), 7 jours, `httpOnly`, `SameSite=Lax`, `Secure` quand `NODE_ENV=production`.
- Mot de passe ≥ 10 caractères, haché **argon2id**.
- Code d'organisme : 8 caractères parmi `ABCDEFGHJKLMNPQRSTUVWXYZ23456789`.
- Quotas : `scrape-jobs` 1/utilisateur/heure ; `import-cv` 10/jour et 5 Mo ; connexion 10 essais/e-mail/15 min.
- La Bonne Alternance : `SOURCE_LBA=on` (défaut `on`).
- Local : Postgres via `docker-compose.yml` (`postgres:16`, base `applybot`, port 5432), `DATABASE_URL=postgres://applybot:applybot@127.0.0.1:5432/applybot`. Tests d'intégration : même base, schéma recréé avant la suite (`tests/setup-db.ts`).
- Scripts npm attendus à la fin : `dev`, `build`, `start`, `lint`, `typecheck`, `test`, `db:generate`, `db:migrate`, `create-admin`, `purge-inactive`.

---

## Carte des fichiers

| Fichier | Rôle |
|---|---|
| `drizzle.config.ts`, `drizzle/0000_init.sql` | Config drizzle-kit, migration initiale (reprend les 12 migrations Supabase + `organisations`, `users`, `search_runs`, `login_attempts`, `cv_imports`) |
| `lib/db/client.ts` | `db` (drizzle sur `pg.Pool`), `closeDb()` |
| `lib/db/schema.ts` | Tables Drizzle et enums |
| `lib/db/queries/{users,organisations,profiles,jobs,applications,quotas}.ts` | Requêtes typées, toutes paramétrées par `userId` |
| `lib/auth/password.ts` | `hashPassword`, `verifyPassword` (argon2id) |
| `lib/auth/jwt.ts` | `signSession`, `verifySession` (jose) |
| `lib/auth/session.ts` | `getSession`, `requireUser`, `requireRole`, `setSessionCookie`, `clearSessionCookie` |
| `lib/auth/org-code.ts` | `generateOrgCode`, `ORG_CODE_ALPHABET` |
| `lib/http.ts` | `json`, `error`, `assertSameOrigin`, `readJson` (zod) |
| `lib/rate-limit.ts` | `checkSearchQuota`, `checkImportQuota`, `checkLoginAttempts` (sur tables Postgres) |
| `lib/scrapers/registry.ts` | Liste des connecteurs + interrupteur LBA |
| `middleware.ts` | Redirection `/login` des pages privées sans cookie (remplace `proxy.ts`) |
| `app/api/auth/{register,login,logout,me,register-organisation}/route.ts` | Comptes |
| `app/api/account/route.ts` (DELETE), `app/api/account/export/route.ts` (GET) | RGPD |
| `app/api/organisation/{regenerate-code,remove-member}/route.ts` | Responsable |
| `app/api/admin/organisation/route.ts` | Admin |
| `app/(app)/organisme/page.tsx`, `app/(app)/admin/page.tsx` | Pages responsable et admin |
| `app/login/page.tsx`, `components/app/login-form.tsx` | Connexion + inscription (avec champ code) + lien « Créer un organisme » |
| `app/organisme/inscription/page.tsx` | Inscription d'un organisme |
| `scripts/create-admin.ts`, `scripts/purge-inactive.ts` | Scripts CLI |
| `lib/legal.ts`, `app/mentions-legales/page.tsx`, `app/cgu/page.tsx` | Textes légaux |
| `Dockerfile`, `docker-compose.yml`, `.github/workflows/ci.yml`, `deploy/coolify.md` | Infra |
| `tests/**` | Vitest |

---

### Task 1 : Mise au propre du dépôt et outillage de test

**Files:**
- Modify: `.gitignore`, `package.json`, `tsconfig.json`
- Delete: `tmp/` (4 fichiers), `lib/application-generation.js` (déjà supprimé dans l'arbre, à commiter), `tsconfig.tsbuildinfo` du suivi
- Create: `vitest.config.ts`, `tests/setup.ts`, `tests/smoke.test.ts`, `docker-compose.yml`, `.env.example` (réécrit)

**Interfaces:**
- Produces : `npm test` (Vitest), `npm run typecheck` (`tsc --noEmit`), `docker compose up -d db` fournit Postgres sur 5432.

- [ ] **Step 1 : Commiter l'état actuel tel quel** (les 30 fichiers en attente), pour que la refonte parte d'une base traçable. Vérifier d'abord qu'aucun fichier ajouté ne contient de secret :

```bash
git add -A && git diff --cached --name-only | grep -v "^.env" | xargs grep -lE "sk-[A-Za-z0-9]{20,}|eyJ[A-Za-z0-9_-]{30,}" ; echo "exit=$?"   # attendu : aucun fichier listé, exit=123 (grep sans résultat)
git commit -m "chore: état du projet au 11/09/2026 avant refonte (auth Supabase, pages login, docs)"
```

- [ ] **Step 2 : Retirer les données personnelles et les artefacts**

```bash
git rm -r tmp/ && git rm --cached tsconfig.tsbuildinfo
```

`.gitignore` (remplacer entièrement) :

```
node_modules/
.next/
out/
coverage/
*.tsbuildinfo
.env
.env.*
!.env.example
.DS_Store
tmp/
```

- [ ] **Step 3 : Retirer `.env.local` du suivi** (la purge de l'historique est la tâche 8) :

```bash
git rm --cached .env.local
```

- [ ] **Step 4 : `.env.example` réécrit** (aucune valeur réelle) :

```bash
# Base de données (Postgres 16)
DATABASE_URL=postgres://applybot:applybot@127.0.0.1:5432/applybot
# Session : ≥ 32 caractères aléatoires, jamais commité
JWT_SECRET=
NODE_ENV=development
# Sources d'offres (facultatives : une source sans clé est simplement désactivée)
FRANCE_TRAVAIL_CLIENT_ID=
FRANCE_TRAVAIL_CLIENT_SECRET=
ADZUNA_APP_ID=
ADZUNA_APP_KEY=
ADZUNA_COUNTRY=fr
JOOBLE_API_KEY=
LBA_API_KEY=
SOURCE_LBA=on
GREENHOUSE_BOARD_TOKENS=
LEVER_COMPANY_TOKENS=
SMARTRECRUITERS_COMPANY_TOKENS=
```

- [ ] **Step 5 : Dépendances et scripts**

```bash
npm install drizzle-orm pg argon2 jose zod
npm install -D drizzle-kit @types/pg vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom tsx
```

`package.json` → `scripts` :

```json
{
  "dev": "next dev --webpack --hostname 127.0.0.1",
  "build": "next build",
  "start": "next start",
  "lint": "eslint",
  "typecheck": "tsc --noEmit",
  "test": "vitest run",
  "db:generate": "drizzle-kit generate",
  "db:migrate": "tsx scripts/migrate.ts",
  "create-admin": "tsx scripts/create-admin.ts",
  "purge-inactive": "tsx scripts/purge-inactive.ts"
}
```

- [ ] **Step 6 : Vitest**

`vitest.config.ts` :

```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";
export default defineConfig({
  plugins: [react()],
  test: { environment: "node", setupFiles: ["tests/setup.ts"], include: ["tests/**/*.test.{ts,tsx}"], testTimeout: 15000 },
  resolve: { alias: { "@": path.resolve(__dirname) } },
});
```

`tests/setup.ts` :

```ts
process.env.JWT_SECRET ??= "test-secret-at-least-32-characters-long-000";
process.env.DATABASE_URL ??= "postgres://applybot:applybot@127.0.0.1:5432/applybot";
process.env.NODE_ENV = "test";
```

`tests/smoke.test.ts` :

```ts
import { describe, expect, it } from "vitest";
describe("outillage", () => { it("vitest tourne", () => { expect(1 + 1).toBe(2); }); });
```

- [ ] **Step 7 : Postgres local**

`docker-compose.yml` :

```yaml
services:
  db:
    image: postgres:16
    environment: { POSTGRES_USER: applybot, POSTGRES_PASSWORD: applybot, POSTGRES_DB: applybot }
    ports: ["5432:5432"]
    volumes: [pgdata:/var/lib/postgresql/data]
volumes: { pgdata: {} }
```

- [ ] **Step 8 : Vérifier** : `npm test` → 1 test vert ; `npm run typecheck` → 0 erreur (ou lister les erreurs préexistantes et les laisser telles quelles, elles seront résolues par le retrait de Supabase en tâche 4).

- [ ] **Step 9 : Commit**

```bash
git add -A && git commit -m "chore: retrait de tmp/ et des données personnelles, .env.local hors suivi, Vitest, Postgres local, dépendances Drizzle/argon2/jose/zod"
```

---

### Task 2 : Base Drizzle et migration initiale

**Files:**
- Create: `drizzle.config.ts`, `lib/db/schema.ts`, `lib/db/client.ts`, `scripts/migrate.ts`, `tests/setup-db.ts`, `tests/db/schema.test.ts`
- Generate: `drizzle/0000_init.sql` (par `npm run db:generate`, puis relu)

**Interfaces:**
- Produces : `db` (Drizzle), tables `organisations`, `users`, `candidateProfiles`, `jobs`, `applications`, `searchRuns`, `loginAttempts`, `cvImports` ; enums `roleEnum('stagiaire'|'responsable'|'admin')`, `applicationStatusEnum` (5 statuts existants) ; `resetDatabase()` pour les tests.

- [ ] **Step 1 : Test qui échoue** — `tests/db/schema.test.ts` :

```ts
import { describe, expect, it, beforeAll } from "vitest";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { resetDatabase } from "../setup-db";
describe("schéma", () => {
  beforeAll(resetDatabase);
  it("crée les tables attendues", async () => {
    const rows = await db.execute(sql`select table_name from information_schema.tables where table_schema='public' order by 1`);
    const names = rows.rows.map((r) => r.table_name);
    for (const t of ["organisations","users","candidate_profiles","jobs","applications","search_runs","login_attempts","cv_imports"]) expect(names).toContain(t);
  });
});
```

- [ ] **Step 2 : Lancer** `npm test -- tests/db` → échec (module `@/lib/db/client` absent).

- [ ] **Step 3 : Schéma** — `lib/db/schema.ts` (reprendre colonne par colonne les 12 migrations Supabase pour `candidate_profiles`, `jobs`, `applications` : lire `supabase/migrations/*.sql` et reporter chaque `alter table add column` ; les colonnes ci-dessous sont celles du socle, compléter avec celles des migrations 2 à 11 — `job_url`, `job_description`, `posted_at`, `source_labels text[]`, `applied_clicked_at`, `letter_text`, `email_text`, `linkedin_text`, `followup_email_text`, `followup_due_at`, `sent_at`, `target_role`, `preferred_keywords text[]`, `base_letter_template`) :

```ts
import { pgTable, pgEnum, uuid, text, integer, boolean, timestamp, char, index, uniqueIndex } from "drizzle-orm/pg-core";
export const roleEnum = pgEnum("user_role", ["stagiaire", "responsable", "admin"]);
export const applicationStatusEnum = pgEnum("application_status", ["Nouveau", "À valider", "Brouillon", "Envoyé", "Refusé"]);
export const organisations = pgTable("organisations", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  code: char("code", { length: 8 }).notNull().unique(),
  seats: integer("seats").notNull().default(0),
  active: boolean("active").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull(),
  passwordHash: text("password_hash").notNull(),
  role: roleEnum("role").notNull(),
  organisationId: uuid("organisation_id").references(() => organisations.id),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
}, (t) => [uniqueIndex("users_email_lower_idx").on(sqlLower(t.email))]);
// sqlLower : import { sql } from "drizzle-orm"; const sqlLower = (c) => sql`lower(${c})`
export const candidateProfiles = pgTable("candidate_profiles", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
  fileName: text("file_name").notNull(),
  rawText: text("raw_text").notNull(),
  fullName: text("full_name").notNull().default(""),
  role: text("role").notNull().default(""),
  location: text("location").notNull().default(""),
  email: text("email").notNull().default(""),
  phone: text("phone").notNull().default(""),
  github: text("github").notNull().default(""),
  linkedin: text("linkedin").notNull().default(""),
  summary: text("summary").notNull().default(""),
  technicalSkills: text("technical_skills").array().notNull().default([]),
  softSkills: text("soft_skills").array().notNull().default([]),
  experienceHighlights: text("experience_highlights").array().notNull().default([]),
  targetRole: text("target_role").notNull().default(""),
  preferredKeywords: text("preferred_keywords").array().notNull().default([]),
  baseLetterTemplate: text("base_letter_template").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
export const jobs = pgTable("jobs", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(), company: text("company").notNull(), location: text("location").notNull(),
  contract: text("contract").notNull(), source: text("source").notNull(),
  sourceLabels: text("source_labels").array().notNull().default([]),
  jobUrl: text("job_url"), jobDescription: text("job_description"),
  postedAt: timestamp("posted_at", { withTimezone: true }),
  score: integer("score").notNull(),
  status: applicationStatusEnum("status").notNull().default("Nouveau"),
  appliedClickedAt: timestamp("applied_clicked_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("jobs_user_idx").on(t.userId), index("jobs_created_idx").on(t.createdAt)]);
export const applications = pgTable("applications", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  jobId: uuid("job_id").references(() => jobs.id, { onDelete: "cascade" }),
  status: applicationStatusEnum("status").notNull().default("À valider"),
  letterGenerated: boolean("letter_generated").notNull().default(false),
  emailGenerated: boolean("email_generated").notNull().default(false),
  linkedinGenerated: boolean("linkedin_generated").notNull().default(false),
  letterText: text("letter_text"), emailText: text("email_text"), linkedinText: text("linkedin_text"),
  followupEmailText: text("followup_email_text"),
  followupDueAt: timestamp("followup_due_at", { withTimezone: true }),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("applications_user_idx").on(t.userId)]);
export const searchRuns = pgTable("search_runs", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("search_runs_user_idx").on(t.userId, t.startedAt)]);
export const cvImports = pgTable("cv_imports", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  importedAt: timestamp("imported_at", { withTimezone: true }).notNull().defaultNow(),
});
export const loginAttempts = pgTable("login_attempts", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull(),
  attemptedAt: timestamp("attempted_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("login_attempts_email_idx").on(t.email, t.attemptedAt)]);
```

Si une colonne d'une migration Supabase n'est pas listée ici, l'ajouter (la source de vérité est `supabase/migrations/`). Conserver le dossier `supabase/` jusqu'à la tâche 4 pour référence, puis le supprimer.

- [ ] **Step 4 : Client et migration**

`lib/db/client.ts` :

```ts
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";
const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL manquante");
export const pool = new Pool({ connectionString: url, max: 10 });
export const db = drizzle(pool, { schema });
export async function closeDb() { await pool.end(); }
```

`drizzle.config.ts` :

```ts
import { defineConfig } from "drizzle-kit";
export default defineConfig({ schema: "./lib/db/schema.ts", out: "./drizzle", dialect: "postgresql", dbCredentials: { url: process.env.DATABASE_URL! } });
```

`scripts/migrate.ts` :

```ts
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { db, closeDb } from "../lib/db/client";
migrate(db, { migrationsFolder: "drizzle" }).then(closeDb).catch((e) => { console.error(e); process.exit(1); });
```

`tests/setup-db.ts` :

```ts
import { sql } from "drizzle-orm";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { db } from "@/lib/db/client";
export async function resetDatabase() {
  await db.execute(sql`drop schema public cascade; create schema public;`);
  await migrate(db, { migrationsFolder: "drizzle" });
}
```

Générer : `npx drizzle-kit generate --name init` → `drizzle/0000_init.sql`. Relire le SQL : les enums, les FK `on delete cascade`, l'index unique `lower(email)`.

- [ ] **Step 5 : Lancer** `docker compose up -d db && npm test -- tests/db` → vert.

- [ ] **Step 6 : Commit** `git add -A && git commit -m "feat(db): schéma Drizzle et migration initiale (organisations, users, profils, offres, candidatures, quotas)"`

---

### Task 3 : Authentification maison

**Files:**
- Create: `lib/auth/password.ts`, `lib/auth/jwt.ts`, `lib/auth/session.ts`, `lib/auth/org-code.ts`, `lib/http.ts`, `lib/rate-limit.ts`, `lib/db/queries/users.ts`, `lib/db/queries/organisations.ts`, `lib/db/queries/quotas.ts`, `app/api/auth/register/route.ts`, `app/api/auth/login/route.ts`, `app/api/auth/logout/route.ts`, `app/api/auth/me/route.ts`, `app/api/auth/register-organisation/route.ts`, `middleware.ts`, `scripts/create-admin.ts`
- Delete: `proxy.ts`, `app/auth/` (callback/signout Supabase), `lib/supabase/browser.ts`
- Modify: `components/app/login-form.tsx` (champ « code d'organisme » à l'inscription, appels `fetch` vers `/api/auth/*`), `app/login/page.tsx`
- Test: `tests/auth/password.test.ts`, `tests/auth/jwt.test.ts`, `tests/auth/org-code.test.ts`, `tests/auth/register.test.ts`, `tests/auth/login.test.ts`, `tests/auth/rate-limit.test.ts`

**Interfaces:**
- Produces :
  - `hashPassword(p: string): Promise<string>`, `verifyPassword(hash, p): Promise<boolean>`
  - `signSession({ userId, role }): Promise<string>`, `verifySession(token): Promise<{ userId: string; role: Role } | null>`
  - `getSession(): Promise<SessionUser | null>` (`SessionUser = { id, email, role, organisationId }`), `requireUser(): Promise<SessionUser>` (lance `HttpError(401)`), `requireRole(...roles): Promise<SessionUser>` (lance `HttpError(403)`), `setSessionCookie(res: NextResponse, token)`, `clearSessionCookie(res)`
  - `generateOrgCode(): string`
  - `lib/http.ts` : `class HttpError extends Error { constructor(public status: number, message: string) }`, `json(data, init?)`, `handle(fn)` (wrapper de route qui convertit `HttpError` et `ZodError` en réponses `{ error: string }` avec le bon statut, 500 sinon), `assertSameOrigin(req: Request)` (lance 403 si `sec-fetch-site` est `cross-site` ou si `Origin` présent ≠ hôte), `readJson<T>(req, schema: z.ZodType<T>): Promise<T>`
  - `queries/users.ts` : `findUserByEmail(email)`, `createUser({ email, passwordHash, role, organisationId })`, `touchLogin(userId)`, `softDeleteUser(userId)` (tâche 6)
  - `queries/organisations.ts` : `findOrganisationByCode(code)`, `createOrganisation({ name })` (code généré, `active=false`, `seats=0`), `countActiveTrainees(orgId)`, `registerTraineeWithCode({ email, passwordHash, code })` → transaction : verrouille l'organisation (`select ... for update`), vérifie `active`, compte les places, crée l'utilisateur ; erreurs typées `OrgCodeError('unknown'|'inactive'|'full')`
  - `queries/quotas.ts` : `countSearchRunsSince(userId, since)`, `recordSearchRun(userId)`, `countCvImportsSince`, `recordCvImport`, `countLoginAttemptsSince(email, since)`, `recordLoginAttempt(email)`
  - `lib/rate-limit.ts` : `checkSearchQuota(userId)` (lance `HttpError(429, "Prochaine recherche possible à HH:MM")`), `checkImportQuota(userId)`, `checkLoginAttempts(email)`

- [ ] **Step 1 : Tests unitaires purs (échec d'abord)**

`tests/auth/password.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
describe("mot de passe", () => {
  it("hache en argon2id et vérifie", async () => {
    const h = await hashPassword("motdepasse-solide");
    expect(h.startsWith("$argon2id$")).toBe(true);
    expect(await verifyPassword(h, "motdepasse-solide")).toBe(true);
    expect(await verifyPassword(h, "autre")).toBe(false);
  });
});
```

`tests/auth/jwt.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import { signSession, verifySession } from "@/lib/auth/jwt";
describe("jeton de session", () => {
  it("signe et relit", async () => {
    const t = await signSession({ userId: "u1", role: "stagiaire" });
    expect(await verifySession(t)).toEqual({ userId: "u1", role: "stagiaire" });
  });
  it("refuse un jeton altéré", async () => { expect(await verifySession("a.b.c")).toBeNull(); });
});
```

`tests/auth/org-code.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import { generateOrgCode, ORG_CODE_ALPHABET } from "@/lib/auth/org-code";
describe("code d'organisme", () => {
  it("8 caractères sans O/0/I/1", () => {
    for (let i = 0; i < 200; i++) { const c = generateOrgCode(); expect(c).toHaveLength(8); for (const ch of c) expect(ORG_CODE_ALPHABET).toContain(ch); }
    expect(ORG_CODE_ALPHABET).not.toMatch(/[O0I1]/);
  });
});
```

- [ ] **Step 2 : Implémentations**

`lib/auth/password.ts` :

```ts
import argon2 from "argon2";
export const hashPassword = (p: string) => argon2.hash(p, { type: argon2.argon2id });
export const verifyPassword = (hash: string, p: string) => argon2.verify(hash, p).catch(() => false);
```

`lib/auth/jwt.ts` :

```ts
import { SignJWT, jwtVerify } from "jose";
export type Role = "stagiaire" | "responsable" | "admin";
const secret = () => { const s = process.env.JWT_SECRET; if (!s || s.length < 32) throw new Error("JWT_SECRET absent ou trop court (32 caractères minimum)"); return new TextEncoder().encode(s); };
export async function signSession(p: { userId: string; role: Role }) {
  return new SignJWT({ role: p.role }).setProtectedHeader({ alg: "HS256" }).setSubject(p.userId).setIssuedAt().setExpirationTime("7d").sign(secret());
}
export async function verifySession(token: string): Promise<{ userId: string; role: Role } | null> {
  try { const { payload } = await jwtVerify(token, secret(), { algorithms: ["HS256"] }); return { userId: payload.sub!, role: payload.role as Role }; } catch { return null; }
}
```

`lib/auth/org-code.ts` :

```ts
import { randomInt } from "node:crypto";
export const ORG_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export function generateOrgCode() { let c = ""; for (let i = 0; i < 8; i++) c += ORG_CODE_ALPHABET[randomInt(ORG_CODE_ALPHABET.length)]; return c; }
```

`lib/auth/session.ts` :

```ts
import { cookies } from "next/headers";
import type { NextResponse } from "next/server";
import { verifySession, type Role } from "./jwt";
import { HttpError } from "@/lib/http";
import { findUserById } from "@/lib/db/queries/users";
export const SESSION_COOKIE = "ab_session";
export interface SessionUser { id: string; email: string; role: Role; organisationId: string | null }
export async function getSession(): Promise<SessionUser | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value; if (!token) return null;
  const s = await verifySession(token); if (!s) return null;
  const u = await findUserById(s.userId); if (!u || u.deletedAt) return null;
  return { id: u.id, email: u.email, role: u.role, organisationId: u.organisationId };
}
export async function requireUser() { const s = await getSession(); if (!s) throw new HttpError(401, "Connexion requise"); return s; }
export async function requireRole(...roles: Role[]) { const s = await requireUser(); if (!roles.includes(s.role)) throw new HttpError(403, "Accès refusé"); return s; }
export function setSessionCookie(res: NextResponse, token: string) {
  res.cookies.set(SESSION_COOKIE, token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 7 * 24 * 3600 });
}
export function clearSessionCookie(res: NextResponse) { res.cookies.set(SESSION_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 }); }
```

`lib/http.ts` :

```ts
import { NextResponse } from "next/server";
import { ZodError, type ZodType } from "zod";
export class HttpError extends Error { constructor(public status: number, message: string) { super(message); } }
export const json = (data: unknown, init?: ResponseInit) => NextResponse.json(data, init);
export function handle(fn: (req: Request, ctx: unknown) => Promise<Response>) {
  return async (req: Request, ctx: unknown) => {
    try { return await fn(req, ctx); }
    catch (e) {
      if (e instanceof HttpError) return json({ error: e.message }, { status: e.status });
      if (e instanceof ZodError) return json({ error: "Données invalides", details: e.issues }, { status: 400 });
      console.error(e); return json({ error: "Erreur interne" }, { status: 500 });
    }
  };
}
export function assertSameOrigin(req: Request) {
  const site = req.headers.get("sec-fetch-site");
  if (site && site !== "same-origin" && site !== "none") throw new HttpError(403, "Origine refusée");
  const origin = req.headers.get("origin"); const host = req.headers.get("host");
  if (origin && host && new URL(origin).host !== host) throw new HttpError(403, "Origine refusée");
}
export async function readJson<T>(req: Request, schema: ZodType<T>): Promise<T> { return schema.parse(await req.json().catch(() => { throw new HttpError(400, "JSON attendu"); })); }
```

- [ ] **Step 3 : Tests d'intégration des routes (échec d'abord)** — `tests/auth/register.test.ts` (appelle les handlers directement avec un `Request`) :

```ts
import { beforeAll, describe, expect, it } from "vitest";
import { resetDatabase } from "../setup-db";
import { createOrganisation } from "@/lib/db/queries/organisations";
import { db } from "@/lib/db/client"; import { organisations } from "@/lib/db/schema"; import { eq } from "drizzle-orm";
import { POST as register } from "@/app/api/auth/register/route";
const post = (body: unknown) => register(new Request("http://localhost/api/auth/register", { method: "POST", headers: { "content-type": "application/json", host: "localhost", "sec-fetch-site": "same-origin" }, body: JSON.stringify(body) }), {});
describe("inscription par code", () => {
  let code: string;
  beforeAll(async () => { await resetDatabase(); const org = await createOrganisation({ name: "AFPA Test" }); code = org.code; await db.update(organisations).set({ active: true, seats: 1 }).where(eq(organisations.id, org.id)); });
  it("code inconnu → 400", async () => { const r = await post({ email: "a@ex.fr", password: "0123456789", orgCode: "ZZZZZZZZ" }); expect(r.status).toBe(400); expect((await r.json()).error).toMatch(/inconnu/); });
  it("ok → 201 + cookie", async () => { const r = await post({ email: "a@ex.fr", password: "0123456789", orgCode: code }); expect(r.status).toBe(201); expect(r.headers.get("set-cookie")).toMatch(/ab_session=/); });
  it("plus de place → 400", async () => { const r = await post({ email: "b@ex.fr", password: "0123456789", orgCode: code }); expect(r.status).toBe(400); expect((await r.json()).error).toMatch(/place/); });
  it("mot de passe court → 400", async () => { const r = await post({ email: "c@ex.fr", password: "court", orgCode: code }); expect(r.status).toBe(400); });
});
```

`tests/auth/login.test.ts` : bon mot de passe → 200 + cookie ; mauvais → 401 ; 11e essai en 15 min → 429 ; `GET /api/auth/me` avec le cookie → `{ email, role, organisationId }` ; sans cookie → 401 ; `POST /api/auth/logout` → cookie vidé.

- [ ] **Step 4 : Routes**

`app/api/auth/register/route.ts` :

```ts
import { z } from "zod";
import { handle, json, assertSameOrigin, readJson, HttpError } from "@/lib/http";
import { hashPassword } from "@/lib/auth/password";
import { signSession } from "@/lib/auth/jwt";
import { setSessionCookie } from "@/lib/auth/session";
import { registerTraineeWithCode, OrgCodeError } from "@/lib/db/queries/organisations";
const Body = z.object({ email: z.string().email().max(200), password: z.string().min(10).max(200), orgCode: z.string().trim().toUpperCase().length(8) });
const MESSAGES = { unknown: "Code d'organisme inconnu", inactive: "Organisme inactif", full: "Plus de place disponible dans cet organisme" } as const;
export const POST = handle(async (req) => {
  assertSameOrigin(req);
  const b = await readJson(req, Body);
  try {
    const user = await registerTraineeWithCode({ email: b.email.toLowerCase(), passwordHash: await hashPassword(b.password), code: b.orgCode });
    const res = json({ id: user.id, email: user.email, role: user.role }, { status: 201 });
    setSessionCookie(res, await signSession({ userId: user.id, role: user.role }));
    return res;
  } catch (e) {
    if (e instanceof OrgCodeError) throw new HttpError(400, MESSAGES[e.reason]);
    if ((e as { code?: string }).code === "23505") throw new HttpError(409, "Un compte existe déjà avec cet e-mail");
    throw e;
  }
});
```

`login` : `checkLoginAttempts(email)` → `recordLoginAttempt` → `findUserByEmail` → `verifyPassword` (toujours exécuté, même si l'utilisateur n'existe pas, contre un hash factice constant) → `touchLogin` → cookie. `logout` : `clearSessionCookie`. `me` : `requireUser()` → `{ id, email, role, organisationId }`. `register-organisation` : `Body = { organisationName: z.string().min(2).max(120), email, password }` → transaction `createOrganisation` + `createUser(role='responsable')` → 201 + cookie ; la réponse indique `active: false` et le message « Votre organisme sera activé après validation ».

`middleware.ts` :

```ts
import { NextResponse, type NextRequest } from "next/server";
const PUBLIC = ["/", "/login", "/organisme/inscription", "/mentions-legales", "/cgu"];
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (PUBLIC.includes(pathname) || pathname.startsWith("/api/") || pathname.startsWith("/_next/")) return NextResponse.next();
  if (!req.cookies.get("ab_session")) return NextResponse.redirect(new URL(`/login?next=${encodeURIComponent(pathname)}`, req.url));
  return NextResponse.next();
}
export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] };
```

Le middleware ne vérifie que la présence du cookie (pas de crypto en edge) ; la vérification réelle est dans chaque page (`getSession()`) et chaque route (`requireUser()`).

`scripts/create-admin.ts` : lit e-mail et mot de passe via `readline` (masquage non requis), refuse si un admin existe déjà, `createUser({ role: "admin", organisationId: null })`.

- [ ] **Step 5 : Formulaire** — `components/app/login-form.tsx` : deux onglets (Connexion / Inscription) ; inscription = e-mail, mot de passe, **code d'organisme** (8 caractères, majuscules forcées) ; erreurs affichées telles que renvoyées par l'API ; lien « Vous êtes un organisme de formation ? Créer un organisme » vers `/organisme/inscription` (page avec nom, e-mail, mot de passe). Après succès, `router.push(next ?? "/dashboard")`.

- [ ] **Step 6 : Lancer** `npm test -- tests/auth` → vert ; `npm run typecheck`.

- [ ] **Step 7 : Commit** `git commit -am "feat(auth): argon2 + JWT en cookie, inscription par code d'organisme, connexion avec limite d'essais, création d'organisme, middleware"`

---

### Task 4 : Routes candidat sur Postgres, retrait de Supabase

**Files:**
- Create: `lib/db/queries/profiles.ts`, `lib/db/queries/jobs.ts`, `lib/db/queries/applications.ts`
- Modify: les 9 routes `app/api/{import-cv,update-candidate-profile,scrape-jobs,rescore-jobs,generate-application,generate-followup,update-application-status,mark-job-applied,delete-application}/route.ts`, les 6 pages `app/(app)/**/page.tsx`, `lib/candidate-profile.ts` (`getActiveCandidateProfile(userId)`), `components/app/sidebar.tsx` (bouton déconnexion → `POST /api/auth/logout`)
- Delete: `lib/supabase/` (après migration de `queries.ts`), `supabase/` (migrations et seed, remplacés par `drizzle/`), dépendances `@supabase/*`
- Test: `tests/api/routes-auth.test.ts`, `tests/api/candidate-flow.test.ts`

**Interfaces:**
- Consumes : `requireUser`, `handle`, `assertSameOrigin`, `readJson`, `db`, schéma.
- Produces (`lib/db/queries`) :
  - `profiles.ts` : `getProfile(userId): Promise<CandidateProfileRow | null>`, `upsertProfile(userId, data)`, `getCandidateProfileSummary(userId): Promise<CandidateProfileSummary>` (même forme que l'ancien `lib/supabase/queries.ts`)
  - `jobs.ts` : `getJobs(userId): Promise<Job[]>`, `insertJobs(userId, jobs[])` (dédoublonnage titre+entreprise+lieu contre l'existant de l'utilisateur), `updateJobScore(userId, jobId, score)`, `markJobApplied(userId, jobId)`, `getDashboardStats(userId)`
  - `applications.ts` : `getApplications(userId)`, `getApplicationById(userId, id)`, `createApplication(userId, jobId, texts)`, `updateApplicationStatus(userId, id, status)`, `setFollowup(userId, id, text, dueAt)`, `deleteApplication(userId, id)`
  - Toutes les fonctions prennent `userId` en premier argument et filtrent dessus ; aucune n'accepte un id sans `userId`.

- [ ] **Step 1 : Test paramétré 401 (échec d'abord)** — `tests/api/routes-auth.test.ts` :

```ts
import { describe, expect, it } from "vitest";
const ROUTES = ["import-cv","update-candidate-profile","scrape-jobs","rescore-jobs","generate-application","generate-followup","update-application-status","mark-job-applied","delete-application"];
describe("routes candidat sans session", () => {
  for (const r of ROUTES) it(`${r} → 401`, async () => {
    const mod = await import(`@/app/api/${r}/route`);
    const res = await mod.POST(new Request(`http://localhost/api/${r}`, { method: "POST", headers: { host: "localhost", "sec-fetch-site": "same-origin", "content-type": "application/json" }, body: "{}" }), {});
    expect(res.status).toBe(401);
  });
});
```

(Si une route est en `DELETE` ou `PATCH`, adapter la méthode dans la liste : `{ name, method }`.)

- [ ] **Step 2 : Test du parcours (échec d'abord)** — `tests/api/candidate-flow.test.ts` : `resetDatabase`, crée un organisme actif + un stagiaire via `registerTraineeWithCode`, fabrique un cookie avec `signSession`, puis, en mockant `next/headers` `cookies()` pour renvoyer ce cookie (`vi.mock("next/headers", ...)`) :
  1. `POST /api/import-cv` avec un fichier texte fictif (`FormData`, CV inventé « Camille Test ») → 200, `getProfile(userId).fullName === "Camille Test"`.
  2. `POST /api/scrape-jobs` avec **tous les connecteurs mockés** (`vi.mock("@/lib/scrapers/registry", ...)` renvoyant 3 offres fictives) → 200, `getJobs(userId).length === 3`, `search_runs` a 1 ligne.
  3. `POST /api/generate-application` `{ jobId }` → 200, `letterText` non vide et contient « Camille Test ».
  4. `POST /api/update-application-status` `{ id, status: "Envoyé" }` → 200, `sentAt` non nul.
  5. `POST /api/generate-followup` `{ id }` → 200, `followupEmailText` non vide.
  6. `POST /api/delete-application` `{ id }` → 200, `getApplications(userId).length === 0`.
  7. Un second utilisateur ne voit rien : `getJobs(user2).length === 0`, `getApplicationById(user2, id) === null`.

- [ ] **Step 3 : Réécrire les requêtes** en Drizzle dans `lib/db/queries/*.ts` en reprenant la logique de `lib/supabase/queries.ts` (lire ce fichier : les mappings `Job`, `Application`, `DashboardStat`, `CandidateProfileSummary` de `lib/types.ts` restent identiques).

- [ ] **Step 4 : Réécrire chaque route** sur ce gabarit :

```ts
import { z } from "zod";
import { handle, json, assertSameOrigin, readJson } from "@/lib/http";
import { requireUser } from "@/lib/auth/session";
import { updateApplicationStatus } from "@/lib/db/queries/applications";
import { APPLICATION_STATUSES } from "@/lib/types";
const Body = z.object({ id: z.string().uuid(), status: z.enum(APPLICATION_STATUSES) });
export const POST = handle(async (req) => {
  assertSameOrigin(req);
  const user = await requireUser();
  const b = await readJson(req, Body);
  const updated = await updateApplicationStatus(user.id, b.id, b.status);
  if (!updated) return json({ error: "Candidature introuvable" }, { status: 404 });
  return json({ ok: true, application: updated });
});
```

`scrape-jobs` : `checkSearchQuota(user.id)` puis `recordSearchRun` avant d'appeler les connecteurs via `lib/scrapers/registry.ts` (tâche 5 ; en attendant, `registry.ts` exporte simplement la liste actuelle des 7 connecteurs et `scrapeAll(options)`). `import-cv` : `checkImportQuota(user.id)` + `recordCvImport`. Les pages serveur appellent `getSession()` et redirigent vers `/login` si nulle, puis passent `user.id` aux requêtes.

- [ ] **Step 5 : Supprimer Supabase** : `git rm -r lib/supabase supabase`, `npm uninstall @supabase/ssr @supabase/supabase-js`, supprimer `hasSupabaseEnv` et tout message « Supabase non configuré » dans les pages. `grep -rn supabase app lib components` → 0 résultat.

- [ ] **Step 6 : Lancer** `npm test` (tout), `npm run typecheck`, `npm run lint`, `npm run build` → verts.

- [ ] **Step 7 : Commit** `git commit -am "feat(data): routes candidat et pages sur Postgres/Drizzle avec requireUser, retrait de Supabase"`

---

### Task 5 : Retrait de l'IA, interrupteur LBA, doublon PDF

**Files:**
- Modify: `lib/application-generation.ts` (supprimer `callOpenAI` et tout `process.env.OPENAI_*` ; `generateApplicationTexts` devient synchrone et n'appelle que `buildLetter`/`buildEmail`/`buildLinkedIn`), `lib/scoring/job-scoring.ts` (supprimer `ScoringMode`, `getScoringMode`, `getMaxOpenAIScoresPerRun`, la branche OpenAI ; `scoreJob` devient synchrone, heuristique seule), `app/api/import-cv/route.ts` (un seul parseur : `pdf-parse`), `app/api/scrape-jobs/route.ts` et `app/api/rescore-jobs/route.ts` (plus de mode)
- Create: `lib/scrapers/registry.ts`
- Delete: dépendance `pdf2json`
- Test: `tests/generation/templates.test.ts`, `tests/scoring/heuristic.test.ts`, `tests/scrapers/registry.test.ts`, `tests/scrapers/<source>.test.ts` (7 fichiers) avec `tests/fixtures/<source>.json`

**Interfaces:**
- Produces : `lib/scrapers/registry.ts` :

```ts
export interface ScraperEntry { key: string; label: string; isConfigured: () => boolean; enabled: () => boolean; scrape: (o: CommonSearchOptions) => Promise<NormalizedJob[]> }
export const SCRAPERS: ScraperEntry[];            // 7 entrées, LBA avec enabled = () => (process.env.SOURCE_LBA ?? "on") === "on"
export function activeScrapers(): ScraperEntry[]; // configurés ET activés
export async function scrapeAll(o: CommonSearchOptions): Promise<{ jobs: NormalizedJob[]; sources: { key: string; count: number; error?: string }[] }>; // Promise.allSettled, une source en erreur n'annule pas les autres
```

(`CommonSearchOptions` et `NormalizedJob` : extraire de l'existant les types communs aux 7 connecteurs, ils partagent déjà la même forme de sortie — vérifier dans `lib/scrapers/*.ts`.)

- [ ] **Step 1 : Tests (échec d'abord)**
  - `tests/scrapers/registry.test.ts` : avec `SOURCE_LBA=off`, `activeScrapers()` ne contient pas `la-bonne-alternance` ; sans aucune clé d'env, `activeScrapers()` ne contient que Greenhouse/Lever/SmartRecruiters si leurs tokens sont vides ⇒ liste vide, et `scrapeAll` renvoie `{ jobs: [], sources: [] }` sans lancer.
  - `tests/scrapers/<source>.test.ts` (pour chaque connecteur) : `vi.stubGlobal("fetch", ...)` renvoie `tests/fixtures/<source>.json` (une réponse réelle de l'API, **anonymisée et réduite à 2 ou 3 offres, sans données personnelles** ; à construire à la main d'après la doc de chaque API si aucune réponse enregistrée n'est disponible, en respectant la forme lue par le connecteur) → le connecteur renvoie N offres normalisées avec `title`, `company`, `location`, `jobUrl` non vides.
  - `tests/generation/templates.test.ts` : `generateApplicationTexts(job, profile)` renvoie lettre/e-mail/LinkedIn contenant le nom du candidat et le titre du poste ; aucune des trois sorties ne contient « IA », « intelligence artificielle », « généré par ».
  - `tests/scoring/heuristic.test.ts` : offre sans aucun mot-clé du profil → score ≤ 30 ; offre reprenant le rôle cible et 3 compétences → score ≥ 70 ; bornes 0..100.

- [ ] **Step 2 : Implémenter** les suppressions et `registry.ts` ; `grep -rn "OPENAI\|openai" app lib components` → 0.

- [ ] **Step 3 : Lancer** `npm test`, `typecheck`, `lint`, `build`.

- [ ] **Step 4 : Commit** `git commit -am "feat: retrait complet de l'IA (gabarits et scoring heuristiques seuls), registre des sources avec interrupteur LBA, un seul parseur PDF, tests des 7 connecteurs sur fixtures"`

---

### Task 6 : Organisme, admin, RGPD, textes légaux

**Files:**
- Create: `app/api/organisation/regenerate-code/route.ts`, `app/api/organisation/remove-member/route.ts`, `app/api/admin/organisation/route.ts`, `app/api/account/route.ts`, `app/api/account/export/route.ts`, `app/(app)/organisme/page.tsx`, `app/(app)/admin/page.tsx`, `app/organisme/inscription/page.tsx`, `scripts/purge-inactive.ts`, `lib/legal.ts`, `app/mentions-legales/page.tsx`, `app/cgu/page.tsx`
- Modify: `lib/db/queries/organisations.ts` (`regenerateCode`, `listMembers`, `listOrganisations`, `setOrganisationStatus`), `lib/db/queries/users.ts` (`deleteUserAndData(userId)` : transaction qui efface `candidate_profiles`, `jobs`, `applications`, `search_runs`, `cv_imports` puis pose `deleted_at` et remplace l'e-mail par `deleted-<uuid>@invalid`), `app/(app)/profil/page.tsx` (boutons « Exporter mes données » et « Supprimer mon compte » avec confirmation), `components/app/sidebar.tsx` (lien « Mon organisme » si `responsable`, « Admin » si `admin`)
- Test: `tests/org/organisation.test.ts`, `tests/org/admin.test.ts`, `tests/rgpd/delete-export.test.ts`, `tests/rgpd/purge.test.ts`, `tests/legal.test.ts`

**Interfaces:**
- Consumes : `requireRole("responsable")`, `requireRole("admin")`, `generateOrgCode`.
- Produces : `deleteUserAndData(userId): Promise<void>`, `exportUserData(userId): Promise<{ profile, jobs, applications, exportedAt }>`, `purgeInactiveUsers(before: Date): Promise<number>`.

- [ ] **Step 1 : Tests (échec d'abord)**
  - `organisation.test.ts` : un responsable régénère le code → l'ancien code donne `OrgCodeError('unknown')` à l'inscription, le nouveau fonctionne ; `remove-member` sur un stagiaire d'un **autre** organisme → 404 ; sur le sien → le stagiaire est supprimé et la place libérée (`countActiveTrainees` décrémenté) ; un stagiaire appelant `regenerate-code` → 403.
  - `admin.test.ts` : `POST /api/admin/organisation { id, active: true, seats: 20 }` par l'admin → 200 ; par un responsable → 403 ; une organisation inactive refuse l'inscription (`inactive`).
  - `delete-export.test.ts` : après `DELETE /api/account`, `getProfile`, `getJobs`, `getApplications` sont vides pour cet id, `findUserByEmail(email)` est `null` (e-mail libéré), et une nouvelle inscription avec le même e-mail réussit ; `GET /api/account/export` renvoie un JSON avec `profile`, `jobs`, `applications` du seul utilisateur.
  - `purge.test.ts` : un utilisateur `last_login_at` à −13 mois est purgé, un à −11 mois non, l'admin jamais.
  - `legal.test.ts` : `/mentions-legales` et `/cgu` rendent sans erreur ; si `CI_STRICT_LEGAL === "1"`, aucun champ de `LEGAL` ne vaut « À COMPLÉTER ».

- [ ] **Step 2 : Implémenter** routes, requêtes, pages. Page `/organisme` : nom, code en gros caractères avec bouton « Régénérer », « places utilisées / places », tableau des stagiaires (e-mail, inscrit le, dernière connexion, bouton « Retirer » avec confirmation). Page `/admin` : tableau des organisations (nom, responsable, actif, places, stagiaires actifs, créé le) avec formulaire inline actif + places. Textes légaux : reprendre la structure de RushPlay (`C:\Users\lucas\OneDrive\Desktop\Saas--main - Copie\frontend\lib\legal.ts` et ses deux pages) en adaptant : éditeur « À COMPLÉTER », hébergeur Hetzner, données traitées (e-mail, hash, texte de CV extrait, profil, offres, candidatures, horodatages), aucun transfert à un tiers, sources d'offres citées (France Travail, Adzuna, Jooble, La Bonne Alternance, Greenhouse, Lever, SmartRecruiters), conservation 12 mois après la dernière connexion, droits et contact, cookie unique `ab_session`. CGU : contrat organisme (places, activation, durée, résiliation, sous-traitance RGPD art. 28 avec l'organisme comme responsable de traitement et ApplyBot comme sous-traitant pour les données des stagiaires) + notice stagiaire (compte personnel, 18 ans ou accord de l'organisme, usage personnel, pas de scraping, suppression).

- [ ] **Step 3 : Lancer** `npm test`, `typecheck`, `lint`, `build`.

- [ ] **Step 4 : Commit** `git commit -am "feat(org,rgpd): page organisme (code, places, stagiaires), page admin, suppression et export de compte, purge des inactifs, mentions légales et CGU B2B"`

---

### Task 7 : Docker, CI, déploiement

**Files:**
- Create: `Dockerfile`, `.dockerignore`, `.github/workflows/ci.yml`, `deploy/coolify.md`, `deploy/crontab.txt`
- Modify: `next.config.ts` (`output: "standalone"`), `README.md` (réécrit : produit, lancement local, scripts, déploiement)

- [ ] **Step 1 : `next.config.ts`** : `output: "standalone"` ; en-têtes de sécurité (`X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `X-Frame-Options: DENY`) via `headers()`.

- [ ] **Step 2 : `Dockerfile`** (multi-stage `node:22-alpine` : deps → build → runner, copie `.next/standalone`, `.next/static`, `public`, `drizzle/`, `scripts/`, `node_modules/drizzle-orm`, `node_modules/pg` ; `CMD ["sh","-c","node node_modules/tsx/dist/cli.mjs scripts/migrate.ts && node server.js"]` — ou compiler `scripts/migrate.ts` en JS au build pour éviter tsx en prod, au choix de l'implémenteur, documenté). `.dockerignore` : `node_modules`, `.next`, `.env*`, `tests`, `docs`.

- [ ] **Step 3 : CI** — `.github/workflows/ci.yml` : job `checks` sur `ubuntu-latest` avec service `postgres:16` (`POSTGRES_USER/PASSWORD/DB = applybot`, healthcheck) ; étapes : `npm ci`, `npm run lint`, `npm run typecheck`, `npm test` (env `DATABASE_URL`, `JWT_SECRET` de test), `npm run build`, puis les gardes :

```bash
! git ls-files | grep -E '^\.env($|\.)' | grep -v '^\.env\.example$'
! grep -rniE "openai|supabase|sk-[a-z0-9]{20}" app lib components
```

- [ ] **Step 4 : Vérifier** : pousser la branche, CI verte sur GitHub.

- [ ] **Step 5 : `deploy/coolify.md`** : même plan que RushPlay (ressource Postgres 16, service Docker sur `master` racine du dépôt, variables saisies par Lucas dans Coolify : `DATABASE_URL`, `JWT_SECRET`, clés des sources, `SOURCE_LBA`, `NODE_ENV=production` ; premier déploiement = migration auto au démarrage ; `npm run create-admin` depuis le terminal Coolify ; cron hebdomadaire `purge-inactive` dans `deploy/crontab.txt` ; domaine et HTTPS ; étape « avant ouverture au public » : `lib/legal.ts`, `CI_STRICT_LEGAL=1`, `SOURCE_LBA=off` dès la première facture).

- [ ] **Step 6 : Commit** `git commit -am "chore: Dockerfile standalone, CI GitHub Actions avec Postgres et gardes (secrets, IA, Supabase), guide de déploiement Coolify"`

---

### Task 8 : Purge des secrets de l'historique (après révocation par Lucas)

**Préconditions (bloquantes) :** Lucas a révoqué et régénéré les clés France Travail, Adzuna, Jooble et La Bonne Alternance, et a donné son accord explicite pour réécrire l'historique du dépôt public.

- [ ] **Step 1 : Sauvegarde** : `git clone --mirror https://github.com/lucas04022002/CandidatureIA.git ../CandidatureIA-backup.git`

- [ ] **Step 2 : Purge** (nécessite `git-filter-repo` : `pip install git-filter-repo`) :

```bash
git filter-repo --invert-paths --path .env.local --force
git remote add origin https://github.com/lucas04022002/CandidatureIA.git
git push --force --all origin && git push --force --tags origin
```

- [ ] **Step 3 : Vérifier** : `git log --all --oneline -- .env.local` → vide ; sur GitHub, l'ancien commit `01f37f8` n'est plus accessible (GitHub peut garder des objets orphelins quelques temps : demander la purge des caches via le support si nécessaire, en indiquant les anciens SHA).

- [ ] **Step 4 : Fusion** : ouvrir la PR `refonte-b2b` → `main`, CI verte, fusion, puis suppression de la branche.

---

## Auto-revue

- Couverture de la spec : §1 architecture → T1, T2, T3, T7 ; §2 données et rôles → T2, T3, T6 ; §3 parcours et routes (comptes, organisme, admin, candidat, quotas) → T3, T4, T6 ; §4 ce qui sort → T1, T4, T5, T8 ; §5 RGPD → T6 ; §6 tests → chaque tâche + T7 (CI) ; §7 ordre → respecté.
- Noms constants entre tâches : `requireUser`, `requireRole`, `handle`, `assertSameOrigin`, `readJson`, `HttpError`, `registerTraineeWithCode`, `OrgCodeError`, `generateOrgCode`, `deleteUserAndData`, `scrapeAll`, `activeScrapers`, cookie `ab_session`.
- Points laissés au choix de l'implémenteur, explicitement : exécution de la migration en prod (tsx ou JS compilé), méthode HTTP exacte de chaque route candidat existante (conserver l'actuelle).
