# Suivi d'avancement pour l'organisme — plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** le responsable voit, pour chaque étudiant qui l'accepte, le nombre de candidatures envoyées, la date de la dernière et s'il a trouvé une entreprise — jamais le contenu.

**Architecture:** trois colonnes sur `users` (accord, date de l'accord, date « entreprise trouvée ») ; le nombre et la dernière date sont calculés à la lecture dans `listMembers`, filtrés sur l'accord. Une route `POST /api/account/progress` pour l'étudiant ; une case à l'inscription ; un encart, un bouton et un réglage côté étudiant ; une colonne et un résumé côté organisme.

**Tech Stack:** Next.js 16 (App Router), Drizzle ORM (Postgres 16 / PGlite en test), Zod, Vitest + Testing Library (jsdom), Tailwind 4.

Spec : `docs/superpowers/specs/2026-10-07-suivi-avancement-design.md`.

## Global Constraints

- Branche `feat/suivi-avancement`. Commandes depuis `C:\Users\lucas\OneDrive\Desktop\CandidatureIA`.
- Tests : `npx vitest run <fichier>` ; suite : `npx vitest run` ; types : `npx tsc --noEmit` ; lint : `npx eslint .`.
- Vocabulaire interdit dans `app/` et `components/` (test `tests/ui/vocabulary.test.ts`) : « IA », « AI », « intelligence artificielle », « pronostic », « garanti » — y compris dans les commentaires.
- Tutoiement côté étudiant, vouvoiement côté organisme et pages publiques organismes.
- L'organisme ne doit jamais recevoir d'autre donnée de candidature que `count` et `max(sent_at)`.
- Migration écrite à la main dans `drizzle/`, déclarée dans `drizzle/meta/_journal.json` (comme `0001`).
- Format de date affichée : `Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" })` → « 3 oct. ».

---

### Task 1: colonnes, migration, export de données

**Files:**
- Create: `drizzle/0002_suivi_avancement.sql`
- Modify: `drizzle/meta/_journal.json`, `lib/db/schema.ts` (table `users`), `lib/db/queries/users.ts` (`exportUserData`, type `UserDataExport`)
- Test: `tests/rgpd/delete-export.test.ts`

**Interfaces:**
- Produces: colonnes Drizzle `users.shareProgress: boolean | null`, `users.shareProgressAt: Date | null`, `users.foundCompanyAt: Date | null` ; `exportUserData(userId)` renvoie en plus `progress: { shareProgress, shareProgressAt, foundCompanyAt }`.

- [ ] **Step 1: test qui échoue** — dans `tests/rgpd/delete-export.test.ts`, dans le test d'export existant (ou un nouveau `it` qui crée un étudiant via `registerTraineeWithCode` puis appelle `exportUserData`) :

```ts
it("l'export contient le réglage de partage d'avancement", async () => {
  const data = await exportUserData(userId);
  expect(data.progress).toEqual({ shareProgress: null, shareProgressAt: null, foundCompanyAt: null });
});
```

- [ ] **Step 2:** `npx vitest run tests/rgpd/delete-export.test.ts` → FAIL (`progress` undefined).

- [ ] **Step 3: migration**

`drizzle/0002_suivi_avancement.sql` :

```sql
-- Suivi d'avancement partagé avec l'organisme, sur accord de l'étudiant.
--
-- share_progress : NULL = jamais répondu, true = accepté, false = refusé.
-- share_progress_at : date du dernier choix, preuve de l'accord.
-- found_company_at : date à laquelle l'étudiant a déclaré avoir trouvé une entreprise.
-- Le nombre de candidatures envoyées n'est pas stocké : il se calcule sur applications.sent_at.
ALTER TABLE "users" ADD COLUMN "share_progress" boolean;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "share_progress_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "found_company_at" timestamp with time zone;
```

`drizzle/meta/_journal.json`, ajouter après l'entrée `0001_role_etudiant` :

```json
    {
      "idx": 2,
      "version": "7",
      "when": 1791331200000,
      "tag": "0002_suivi_avancement",
      "breakpoints": true
    }
```

`lib/db/schema.ts`, table `users`, après `lastLoginAt` :

```ts
  shareProgress: boolean("share_progress"),
  shareProgressAt: timestamp("share_progress_at", { withTimezone: true }),
  foundCompanyAt: timestamp("found_company_at", { withTimezone: true }),
```

`lib/db/queries/users.ts`, `exportUserData` : lire la ligne `users` en plus et ajouter au retour

```ts
    progress: {
      shareProgress: userRow?.shareProgress ?? null,
      shareProgressAt: userRow?.shareProgressAt ?? null,
      foundCompanyAt: userRow?.foundCompanyAt ?? null,
    },
```

(avec `db.select({ shareProgress: users.shareProgress, shareProgressAt: users.shareProgressAt, foundCompanyAt: users.foundCompanyAt }).from(users).where(eq(users.id, userId)).limit(1)` dans le `Promise.all`) et le champ `progress` dans le type `UserDataExport`.

- [ ] **Step 4:** `npx vitest run tests/rgpd/delete-export.test.ts` → PASS ; `npx tsc --noEmit` → 0.
- [ ] **Step 5:** commit `feat(db): colonnes de partage d'avancement et export`.

---

### Task 2: requêtes — réglage de l'étudiant et lecture côté organisme

**Files:**
- Create: `lib/db/queries/progress.ts`
- Modify: `lib/db/queries/organisations.ts` (`listMembers`, `registerTraineeWithCode`)
- Test: `tests/org/progress.test.ts`

**Interfaces:**
- Produces:
  - `setShareProgress(userId: string, share: boolean): Promise<void>` — pose `share_progress` et `share_progress_at = now()`.
  - `setFoundCompany(userId: string, found: boolean): Promise<void>` — `found` vrai : pose `found_company_at = now()` seulement s'il est vide ; faux : `NULL`.
  - `getProgressSettings(userId: string): Promise<{ organisationId: string | null; shareProgress: boolean | null; foundCompanyAt: Date | null }>`.
  - `registerTraineeWithCode(p: { email; passwordHash; code; shareProgress?: boolean })` — pose `shareProgress` (défaut `false`) et `shareProgressAt = now()`.
  - `listMembers(organisationId)` renvoie `{ id, email, createdAt, lastLoginAt, shareProgress: boolean | null, sentCount: number | null, lastSentAt: Date | null, foundCompanyAt: Date | null }[]` ; `sentCount`, `lastSentAt`, `foundCompanyAt` valent `null` si `shareProgress !== true`.

- [ ] **Step 1: tests qui échouent** — `tests/org/progress.test.ts` :

```ts
import { beforeAll, describe, expect, it } from "vitest";
import { resetDatabase } from "../setup-db";
import { db } from "@/lib/db/client";
import { applications, jobs } from "@/lib/db/schema";
import { createOrganisation, listMembers, registerTraineeWithCode } from "@/lib/db/queries/organisations";
import { setShareProgress, setFoundCompany, getProgressSettings } from "@/lib/db/queries/progress";

const MEMBER_KEYS = ["createdAt", "email", "foundCompanyAt", "id", "lastLoginAt", "lastSentAt", "sentCount", "shareProgress"];

async function sentApplication(userId: string, title: string, sentAt: Date | null, status: "Envoyé" | "Refusé" | "À valider") {
  const [job] = await db.insert(jobs).values({
    userId, title, company: "Entreprise secrète", location: "Lyon", contract: "CDI", source: "Test",
    jobUrl: `https://exemple.test/${encodeURIComponent(title)}`, jobDescription: "", score: 50,
  }).returning();
  await db.insert(applications).values({ userId, jobId: job.id, status, sentAt });
}

describe("suivi d'avancement", () => {
  let orgId = "";
  let partage = "";
  let refus = "";
  beforeAll(async () => {
    await resetDatabase();
    const org = await createOrganisation({ name: "Promo test" });
    orgId = org.id;
    partage = (await registerTraineeWithCode({ email: "oui@ex.fr", passwordHash: "x", code: org.code, shareProgress: true })).id;
    refus = (await registerTraineeWithCode({ email: "non@ex.fr", passwordHash: "x", code: org.code })).id;
    await sentApplication(partage, "A", new Date("2026-10-01T10:00:00Z"), "Envoyé");
    await sentApplication(partage, "B", new Date("2026-10-03T10:00:00Z"), "Refusé");
    await sentApplication(partage, "C", null, "À valider");
    await sentApplication(refus, "D", new Date("2026-10-02T10:00:00Z"), "Envoyé");
  });

  it("compte les candidatures envoyées (Refusé compris) et donne la dernière date", async () => {
    const m = (await listMembers(orgId)).find((x) => x.id === partage)!;
    expect(m.shareProgress).toBe(true);
    expect(m.sentCount).toBe(2);
    expect(m.lastSentAt?.toISOString()).toBe("2026-10-03T10:00:00.000Z");
  });

  it("ne renvoie rien pour un étudiant qui ne partage pas", async () => {
    const m = (await listMembers(orgId)).find((x) => x.id === refus)!;
    expect(m.shareProgress).toBe(false);
    expect(m.sentCount).toBeNull();
    expect(m.lastSentAt).toBeNull();
  });

  it("ne renvoie aucune autre clé que la liste autorisée", async () => {
    for (const m of await listMembers(orgId)) expect(Object.keys(m).sort()).toEqual(MEMBER_KEYS);
  });

  it("« entreprise trouvée » se pose une fois et s'annule", async () => {
    await setFoundCompany(partage, true);
    const first = (await getProgressSettings(partage)).foundCompanyAt;
    expect(first).toBeInstanceOf(Date);
    await setFoundCompany(partage, true);
    expect((await getProgressSettings(partage)).foundCompanyAt?.getTime()).toBe(first!.getTime());
    await setFoundCompany(partage, false);
    expect((await getProgressSettings(partage)).foundCompanyAt).toBeNull();
  });

  it("retirer l'accord masque tout immédiatement, « trouvée » compris", async () => {
    await setFoundCompany(partage, true);
    await setShareProgress(partage, false);
    const m = (await listMembers(orgId)).find((x) => x.id === partage)!;
    expect(m.sentCount).toBeNull();
    expect(m.foundCompanyAt).toBeNull();
    await setShareProgress(partage, true);
    expect((await listMembers(orgId)).find((x) => x.id === partage)!.sentCount).toBe(2);
  });
});
```

(Vérifier les colonnes obligatoires de `jobs` et `applications` dans `lib/db/schema.ts` et compléter les `values` si l'insertion échoue pour une colonne `notNull` manquante.)

- [ ] **Step 2:** `npx vitest run tests/org/progress.test.ts` → FAIL (module `progress` introuvable).

- [ ] **Step 3: implémentation**

`lib/db/queries/progress.ts` :

```ts
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";

// Le partage d'avancement appartient à l'étudiant : lui seul le règle, et le retirer prend effet à
// la lecture suivante côté organisme (rien n'est recopié chez lui, tout est calculé à la lecture).
export async function setShareProgress(userId: string, share: boolean) {
  await db.update(users).set({ shareProgress: share, shareProgressAt: new Date() }).where(eq(users.id, userId));
}

// « J'ai trouvé mon entreprise » : une date, jamais un nom. Re-déclarer ne déplace pas la date.
export async function setFoundCompany(userId: string, found: boolean) {
  if (!found) {
    await db.update(users).set({ foundCompanyAt: null }).where(eq(users.id, userId));
    return;
  }
  const current = await getProgressSettings(userId);
  if (current.foundCompanyAt) return;
  await db.update(users).set({ foundCompanyAt: new Date() }).where(eq(users.id, userId));
}

export async function getProgressSettings(userId: string) {
  const rows = await db
    .select({ organisationId: users.organisationId, shareProgress: users.shareProgress, foundCompanyAt: users.foundCompanyAt })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return rows[0] ?? { organisationId: null, shareProgress: null, foundCompanyAt: null };
}
```

`lib/db/queries/organisations.ts` :

- `registerTraineeWithCode(p: { email: string; passwordHash: string; code: string; shareProgress?: boolean })`, dans `.values({...})` ajouter `shareProgress: p.shareProgress ?? false, shareProgressAt: new Date()`.
- `listMembers` (imports `applications`, `count`, `max`, `sql` depuis drizzle-orm) :

```ts
// Ce que le responsable a le droit de voir de ses étudiants : l'e-mail, deux dates et, seulement
// pour ceux qui l'ont accepté, un nombre de candidatures envoyées, la date de la dernière et la
// date « entreprise trouvée ». Jamais une entreprise, un intitulé ni un texte : la sous-requête ne
// lit que `sent_at`, et seulement pour les étudiants qui partagent.
export async function listMembers(organisationId: string) {
  const envoyees = db
    .select({
      userId: applications.userId,
      sentCount: count(applications.sentAt).as("sent_count"),
      lastSentAt: max(applications.sentAt).as("last_sent_at"),
    })
    .from(applications)
    .groupBy(applications.userId)
    .as("envoyees");

  const rows = await db
    .select({
      id: users.id,
      email: users.email,
      createdAt: users.createdAt,
      lastLoginAt: users.lastLoginAt,
      shareProgress: users.shareProgress,
      foundCompanyAt: users.foundCompanyAt,
      sentCount: envoyees.sentCount,
      lastSentAt: envoyees.lastSentAt,
    })
    .from(users)
    // Jointure conditionnée à l'accord : pour un étudiant qui ne partage pas, la base ne lit même
    // pas ses candidatures.
    .leftJoin(envoyees, and(eq(envoyees.userId, users.id), eq(users.shareProgress, true)))
    .where(and(eq(users.organisationId, organisationId), eq(users.role, "etudiant"), isNull(users.deletedAt)))
    .orderBy(desc(users.createdAt));

  return rows.map((r) => {
    const shared = r.shareProgress === true;
    return {
      id: r.id,
      email: r.email,
      createdAt: r.createdAt,
      lastLoginAt: r.lastLoginAt,
      shareProgress: r.shareProgress,
      sentCount: shared ? Number(r.sentCount ?? 0) : null,
      lastSentAt: shared && r.lastSentAt ? new Date(r.lastSentAt) : null,
      foundCompanyAt: shared ? r.foundCompanyAt : null,
    };
  });
}
```

Le `shared ? … : null` en sortie double la jointure conditionnée : `foundCompanyAt`, qui vit sur `users`, doit aussi être masqué.

- [ ] **Step 4:** `npx vitest run tests/org/progress.test.ts tests/org/organisation.test.ts tests/auth/register.test.ts` → PASS.
- [ ] **Step 5:** commit `feat(org): avancement des étudiants qui le partagent`.

---

### Task 3: routes — inscription et réglage de l'étudiant

**Files:**
- Create: `app/api/account/progress/route.ts`
- Modify: `app/api/auth/register/route.ts`
- Test: `tests/api/progress-route.test.ts`, `tests/auth/register.test.ts`

**Interfaces:**
- Consumes: `setShareProgress`, `setFoundCompany`, `registerTraineeWithCode({ …, shareProgress })` (Task 2).
- Produces: `POST /api/account/progress` corps `{ shareProgress?: boolean; foundCompany?: boolean }` → `200 { ok: true }` ; 401 sans session ; 403 pour un rôle autre que `etudiant` ; 403 cross-origin. `POST /api/auth/register` accepte `shareProgress?: boolean`.

- [ ] **Step 1: tests qui échouent**

`tests/auth/register.test.ts`, deux `it` (adresses neuves, organisme avec places — en créer un dédié si celui du fichier est plein) :

```ts
it("case de partage cochée → share_progress = true, avec sa date", async () => {
  const r = await post({ email: "partage@ex.fr", password: "0123456789", acceptedTerms: true, orgCode: freeCode, shareProgress: true });
  expect(r.status).toBe(201);
  const [u] = await db.select().from(users).where(eq(users.email, "partage@ex.fr"));
  expect(u.shareProgress).toBe(true);
  expect(u.shareProgressAt).not.toBeNull();
});

it("case absente → share_progress = false (la question est répondue)", async () => {
  const r = await post({ email: "sans-partage@ex.fr", password: "0123456789", acceptedTerms: true, orgCode: freeCode });
  expect(r.status).toBe(201);
  const [u] = await db.select().from(users).where(eq(users.email, "sans-partage@ex.fr"));
  expect(u.shareProgress).toBe(false);
});
```

`tests/api/progress-route.test.ts` (même mock de cookies que `tests/api/candidate-flow.test.ts`) :

```ts
import { beforeAll, describe, expect, it, vi } from "vitest";
import { resetDatabase } from "../setup-db";
import { signSession } from "@/lib/auth/jwt";
import { SESSION_COOKIE } from "@/lib/auth/session";
import { createOrganisation, registerTraineeWithCode, registerResponsableWithNewOrganisation } from "@/lib/db/queries/organisations";
import { getProgressSettings } from "@/lib/db/queries/progress";

const mockCookies = new Map<string, string>();
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: (n: string) => (mockCookies.has(n) ? { name: n, value: mockCookies.get(n)! } : undefined) }),
}));

const call = async (body: unknown, headers: Record<string, string> = {}) => {
  const { POST } = await import("@/app/api/account/progress/route");
  return POST(new Request("http://localhost/api/account/progress", {
    method: "POST",
    headers: { host: "localhost", "sec-fetch-site": "same-origin", "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  }), {});
};

describe("POST /api/account/progress", () => {
  let etudiant = "";
  let responsable = "";
  beforeAll(async () => {
    await resetDatabase();
    const org = await createOrganisation({ name: "Promo" });
    etudiant = (await registerTraineeWithCode({ email: "e@ex.fr", passwordHash: "x", code: org.code })).id;
    responsable = (await registerResponsableWithNewOrganisation({ organisationName: "Autre", email: "r@ex.fr", passwordHash: "x" })).user.id;
  });

  it("sans session → 401", async () => {
    mockCookies.clear();
    expect((await call({ shareProgress: true })).status).toBe(401);
  });

  it("l'étudiant accepte puis refuse le partage", async () => {
    mockCookies.set(SESSION_COOKIE, await signSession({ userId: etudiant, role: "etudiant" }));
    expect((await call({ shareProgress: true })).status).toBe(200);
    expect((await getProgressSettings(etudiant)).shareProgress).toBe(true);
    expect((await call({ shareProgress: false })).status).toBe(200);
    expect((await getProgressSettings(etudiant)).shareProgress).toBe(false);
  });

  it("l'étudiant déclare puis annule « entreprise trouvée »", async () => {
    mockCookies.set(SESSION_COOKIE, await signSession({ userId: etudiant, role: "etudiant" }));
    await call({ foundCompany: true });
    expect((await getProgressSettings(etudiant)).foundCompanyAt).toBeInstanceOf(Date);
    await call({ foundCompany: false });
    expect((await getProgressSettings(etudiant)).foundCompanyAt).toBeNull();
  });

  it("un responsable → 403", async () => {
    mockCookies.set(SESSION_COOKIE, await signSession({ userId: responsable, role: "responsable" }));
    expect((await call({ shareProgress: true })).status).toBe(403);
  });

  it("cross-origin → 403", async () => {
    mockCookies.set(SESSION_COOKIE, await signSession({ userId: etudiant, role: "etudiant" }));
    expect((await call({ shareProgress: true }, { "sec-fetch-site": "cross-site" })).status).toBe(403);
  });
});
```

- [ ] **Step 2:** `npx vitest run tests/api/progress-route.test.ts tests/auth/register.test.ts` → FAIL.

- [ ] **Step 3: implémentation**

`app/api/account/progress/route.ts` :

```ts
import { z } from "zod";
import { assertSameOrigin, handle, json, readJson } from "@/lib/http";
import { requireRole } from "@/lib/auth/session";
import { setFoundCompany, setShareProgress } from "@/lib/db/queries/progress";

const Body = z.object({ shareProgress: z.boolean().optional(), foundCompany: z.boolean().optional() });

// Réglage de l'étudiant : partager son avancement avec son organisme, et déclarer « entreprise
// trouvée ». Seul l'étudiant y a accès : c'est sa donnée, l'organisme ne fait que la lire.
export const POST = handle(async (req) => {
  assertSameOrigin(req);
  const user = await requireRole("etudiant");
  const b = await readJson(req, Body);
  if (b.shareProgress !== undefined) await setShareProgress(user.id, b.shareProgress);
  if (b.foundCompany !== undefined) await setFoundCompany(user.id, b.foundCompany);
  return json({ ok: true });
});
```

`app/api/auth/register/route.ts` : `Body` gagne `shareProgress: z.boolean().optional()` ; l'appel devient `registerTraineeWithCode({ email, passwordHash, code: b.orgCode, shareProgress: b.shareProgress === true })`.

- [ ] **Step 4:** les deux fichiers de test → PASS ; `npx tsc --noEmit` → 0.
- [ ] **Step 5:** commit `feat(api): réglage du partage d'avancement et case à l'inscription`.

---

### Task 4: interface étudiant — case, encart, bouton, réglage

**Files:**
- Create: `components/actions/progress-actions.tsx`
- Modify: `components/forms/login-form.tsx`, `app/(app)/dashboard/page.tsx`, `app/(app)/profil/page.tsx`
- Test: `tests/ui/progress-actions.test.tsx`, `tests/ui/login-form.test.tsx`

**Interfaces:**
- Consumes: `POST /api/account/progress` (Task 3), `getProgressSettings(userId)` (Task 2).
- Produces (tous composants client) :
  - `SharePrompt()` — encart « Ton organisme peut voir ton avancement… » + boutons « Oui, partager » / « Non ».
  - `ShareSetting({ shareProgress }: { shareProgress: boolean | null })` — état + bouton « Partager » / « Ne plus partager ».
  - `FoundCompanyAction({ foundCompanyAt }: { foundCompanyAt: string | null })` — bouton « J'ai trouvé mon entreprise » ou « Entreprise trouvée le 5 oct. — Annuler » (date passée en ISO).

- [ ] **Step 1: tests qui échouent** — `tests/ui/progress-actions.test.tsx` (jsdom, `next/navigation` mocké, rendu dans `<Toast>`, `fetch` stubbé comme dans `tests/ui/login-form.test.tsx`) :

```tsx
// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { Toast } from "@/components/toast";
import { FoundCompanyAction, SharePrompt, ShareSetting } from "@/components/actions/progress-actions";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh }) }));

function stubFetch() {
  const f = vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ ok: true }) }));
  vi.stubGlobal("fetch", f);
  return f;
}
const sent = (f: ReturnType<typeof stubFetch>) => JSON.parse((f.mock.calls[0] as unknown as [string, RequestInit])[1].body as string);

afterEach(() => vi.unstubAllGlobals());

describe("partage d'avancement — côté étudiant", () => {
  it("l'encart envoie l'accord", async () => {
    const f = stubFetch();
    render(<Toast><SharePrompt /></Toast>);
    expect(screen.getByText(/jamais le contenu/i)).toBeInTheDocument();
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Oui, partager" })));
    expect(sent(f)).toEqual({ shareProgress: true });
  });

  it("l'encart envoie le refus", async () => {
    const f = stubFetch();
    render(<Toast><SharePrompt /></Toast>);
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Non" })));
    expect(sent(f)).toEqual({ shareProgress: false });
  });

  it("le réglage propose de retirer un accord donné", async () => {
    const f = stubFetch();
    render(<Toast><ShareSetting shareProgress /></Toast>);
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Ne plus partager" })));
    expect(sent(f)).toEqual({ shareProgress: false });
  });

  it("« J'ai trouvé mon entreprise », puis l'annulation", async () => {
    const f = stubFetch();
    const { rerender } = render(<Toast><FoundCompanyAction foundCompanyAt={null} /></Toast>);
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "J'ai trouvé mon entreprise" })));
    expect(sent(f)).toEqual({ foundCompany: true });
    rerender(<Toast><FoundCompanyAction foundCompanyAt="2026-10-05T09:00:00.000Z" /></Toast>);
    expect(screen.getByText(/Entreprise trouvée le 5 oct\./)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Annuler" })).toBeInTheDocument();
  });
});
```

`tests/ui/login-form.test.tsx`, un `it` dans le bloc inscription : remplir e-mail, mot de passe, code, cocher les CGU **et** la case « Partager mon avancement », soumettre ; le corps envoyé à `/api/auth/register` contient `shareProgress: true`.

- [ ] **Step 2:** `npx vitest run tests/ui/progress-actions.test.tsx tests/ui/login-form.test.tsx` → FAIL.

- [ ] **Step 3: implémentation**

`components/actions/progress-actions.tsx` :

```tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/button";
import { useToast } from "@/components/toast";

const dayFormat = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" });

export const SHARE_EXPLANATION =
  "Ton organisme voit alors le nombre de candidatures que tu as envoyées, la date de la dernière, et si tu as trouvé une entreprise. Jamais le contenu : ni les entreprises, ni les offres, ni tes lettres.";

function useProgress() {
  const router = useRouter();
  const { show } = useToast();
  const [busy, setBusy] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  async function send(body: { shareProgress?: boolean; foundCompany?: boolean }, done: string) {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/account/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = (await res.json()) as { ok: boolean; error?: string };
      if (!res.ok || !payload.ok) {
        setError(payload.error ?? "Le réglage n'a pas pu être enregistré. Réessaie dans un instant.");
        return;
      }
      show(done);
      startTransition(() => router.refresh());
    } catch {
      setError("Connexion perdue. Vérifie ta connexion et réessaie.");
    } finally {
      setBusy(false);
    }
  }

  return { send, waiting: busy || pending, error };
}

function ErrorLine({ error }: { error: string }) {
  return error ? <p role="alert" className="font-body text-[13px] text-bad">{error}</p> : null;
}

export function SharePrompt() {
  const { send, waiting, error } = useProgress();
  return (
    <section className="flex flex-col gap-3 rounded-tile border-l-[3px] border-klein bg-white px-6 py-5">
      <h2 className="font-display text-[19px] font-bold leading-[1.2] text-ink">
        Partager ton avancement avec ton organisme ?
      </h2>
      <p className="max-w-[62ch] font-body text-[14.5px] leading-[1.55] text-grey">{SHARE_EXPLANATION}</p>
      <div className="flex flex-wrap gap-3">
        <Button variant="primary" pending={waiting} onClick={() => send({ shareProgress: true }, "Avancement partagé avec ton organisme.")}>
          Oui, partager
        </Button>
        <Button variant="quiet" pending={waiting} onClick={() => send({ shareProgress: false }, "C'est noté : rien n'est partagé.")}>
          Non
        </Button>
      </div>
      <ErrorLine error={error} />
    </section>
  );
}

export function ShareSetting({ shareProgress }: { shareProgress: boolean | null }) {
  const { send, waiting, error } = useProgress();
  const shared = shareProgress === true;
  return (
    <div className="flex flex-col gap-3">
      <p className="font-body text-[15px] text-ink">
        {shared ? "Tu partages ton avancement avec ton organisme." : "Tu ne partages pas ton avancement avec ton organisme."}
      </p>
      <p className="max-w-[62ch] font-body text-[13.5px] leading-[1.55] text-grey">{SHARE_EXPLANATION}</p>
      <div>
        {shared ? (
          <Button variant="secondary" pending={waiting} onClick={() => send({ shareProgress: false }, "Ton organisme ne voit plus ton avancement.")}>
            Ne plus partager
          </Button>
        ) : (
          <Button variant="primary" pending={waiting} onClick={() => send({ shareProgress: true }, "Avancement partagé avec ton organisme.")}>
            Partager
          </Button>
        )}
      </div>
      <ErrorLine error={error} />
    </div>
  );
}

export function FoundCompanyAction({ foundCompanyAt }: { foundCompanyAt: string | null }) {
  const { send, waiting, error } = useProgress();
  if (!foundCompanyAt) {
    return (
      <div className="flex flex-col gap-2">
        <Button variant="secondary" pending={waiting} onClick={() => send({ foundCompany: true }, "Bravo ! C'est noté.")}>
          J&apos;ai trouvé mon entreprise
        </Button>
        <ErrorLine error={error} />
      </div>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-3">
      <p className="font-body text-[15px] font-semibold text-good">
        Entreprise trouvée le {dayFormat.format(new Date(foundCompanyAt))}
      </p>
      <Button variant="quiet" pending={waiting} onClick={() => send({ foundCompany: false }, "C'est annulé.")}>
        Annuler
      </Button>
      <ErrorLine error={error} />
    </div>
  );
}
```

`app/(app)/dashboard/page.tsx` : ajouter `getProgressSettings(session.id)` au `Promise.all` ; sous le `PageTitle`, si `progress.organisationId && progress.shareProgress === null` → `<SharePrompt />` ; dans la rangée d'actions du `PageTitle` (à côté de « Chercher des offres ») ou juste sous les KPI, `<FoundCompanyAction foundCompanyAt={progress.foundCompanyAt?.toISOString() ?? null} />`.

`app/(app)/profil/page.tsx` : si `session.role === "etudiant" && session.organisationId`, lire `getProgressSettings(session.id)` et ajouter avant « Tes données » :

```tsx
<Card title="Ton organisme">
  <ShareSetting shareProgress={progress.shareProgress} />
</Card>
```

`components/forms/login-form.tsx` : état `const [shareProgress, setShareProgress] = useState(false);`, une seconde `Checkbox` (non requise) sous celle des CGU, libellé « Partager mon avancement avec mon organisme : le nombre de candidatures envoyées et si j'ai trouvé une entreprise. Jamais leur contenu. », et le corps `{ email, password, orgCode, acceptedTerms, shareProgress }`.

- [ ] **Step 4:** tests → PASS ; `npx vitest run tests/ui` → PASS ; `npx tsc --noEmit` → 0.
- [ ] **Step 5:** commit `feat(ui): partage d'avancement côté étudiant`.

---

### Task 5: interface organisme — colonne Avancement et résumé

**Files:**
- Modify: `components/organisation-view.tsx`, `app/(app)/organisme/page.tsx` (aucun changement si `members` est passé tel quel)
- Test: `tests/ui/organisme-page.test.tsx`

**Interfaces:**
- Consumes: le type de `listMembers` (Task 2).
- Produces: `OrganisationMember` gagne `shareProgress: boolean | null; sentCount: number | null; lastSentAt: Date | null; foundCompanyAt: Date | null`.

- [ ] **Step 1: tests qui échouent** — dans `tests/ui/organisme-page.test.tsx`, compléter `MEMBERS` (premier : partage, 7 envoyées, dernière 3 oct. ; second : `shareProgress: null`) et ajouter un troisième (partage, `foundCompanyAt` 5 oct.) ; les autres tests du fichier qui construisent des membres reçoivent les quatre champs à `null`.

```tsx
it("affiche l'avancement de ceux qui partagent, et « Non partagé » sinon", () => {
  renderView();
  expect(screen.getByText("7 envoyées · dernière le 3 oct. · En recherche")).toBeInTheDocument();
  expect(screen.getByText("Entreprise trouvée le 5 oct.")).toBeInTheDocument();
  expect(screen.getByText("Non partagé")).toBeInTheDocument();
});

it("résume les étudiants placés et ceux qui partagent", () => {
  renderView();
  expect(screen.getByText("1 a trouvé une entreprise · 2 partagent leur avancement sur 3 inscrits")).toBeInTheDocument();
});
```

- [ ] **Step 2:** `npx vitest run tests/ui/organisme-page.test.tsx` → FAIL.

- [ ] **Step 3: implémentation** — dans `components/organisation-view.tsx` :

```tsx
const dayFormat = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" });

// Ce que la colonne dit d'un étudiant : rien s'il ne partage pas, sinon un nombre, une date et un
// statut. Jamais une entreprise ni une offre : la requête ne les lit même pas.
function avancement(m: OrganisationMember): string {
  if (m.shareProgress !== true) return "Non partagé";
  if (m.foundCompanyAt) return `Entreprise trouvée le ${dayFormat.format(m.foundCompanyAt)}`;
  const n = m.sentCount ?? 0;
  const envoyees = `${n} envoyée${n > 1 ? "s" : ""}`;
  const derniere = m.lastSentAt ? ` · dernière le ${dayFormat.format(m.lastSentAt)}` : "";
  return `${envoyees}${derniere} · En recherche`;
}

function resume(members: OrganisationMember[]): string {
  const partagent = members.filter((m) => m.shareProgress === true);
  const trouve = partagent.filter((m) => m.foundCompanyAt).length;
  const a = trouve > 1 ? "ont" : "a";
  const p = partagent.length > 1 ? "partagent" : "partage";
  const s = members.length > 1 ? "s" : "";
  return `${trouve} ${a} trouvé une entreprise · ${partagent.length} ${p} leur avancement sur ${members.length} inscrit${s}`;
}
```

`MemberRow` gagne `avancement: string` ; `COLUMNS` insère `{ key: "avancement", label: "Avancement" }` avant `retirer` ; les lignes reçoivent `avancement: avancement(member)` ; au-dessus du tableau (si `rows.length`), `<p className="font-body text-[14px] text-grey">{resume(members)}</p>` ; sous-titre de `PageTitle` : « Le code d'inscription de vos étudiants, vos places et les comptes ouverts. Vous voyez l'avancement de ceux qui l'acceptent, jamais leurs CV ni leurs candidatures. »

- [ ] **Step 4:** `npx vitest run tests/ui/organisme-page.test.tsx` → PASS ; `npx tsc --noEmit` → 0.
- [ ] **Step 5:** commit `feat(org): colonne Avancement et résumé`.

---

### Task 6: textes, démo, vérification finale

**Files:**
- Modify: `app/pour-les-organismes/page.tsx` (BENEFICES « Suivez l'utilisation » et « Les candidatures restent privées »), `app/pour-les-etudiants/page.tsx` (bloc « Vous gardez toujours le contrôle. »), `app/mentions-legales/page.tsx:51`, `app/cgu/page.tsx:38`, `scripts/seed-demo.ts`
- Test: suite complète

- [ ] **Step 1: textes** (chaque phrase vérifiée contre `listMembers`) :
  - organismes, « Suivez l'utilisation » : « Depuis votre espace, vous voyez quels étudiants ont créé leur compte, leur dernière connexion et le nombre de places disponibles. Pour ceux qui l'acceptent, vous voyez aussi combien de candidatures ils ont envoyées, la date de la dernière, et s'ils ont trouvé une entreprise. »
  - organismes, « Les candidatures restent privées » : « Vous n'avez accès ni aux CV, ni aux offres enregistrées, ni aux lettres, ni au contenu des candidatures de vos étudiants. Le partage d'avancement est leur choix, et ils peuvent le retirer à tout moment. »
  - étudiants, bloc contrôle, ajouter : « Si tu l'acceptes, ton organisme voit le nombre de candidatures que tu as envoyées et si tu as trouvé une entreprise — jamais leur contenu. Tu peux changer d'avis à tout moment dans ton profil. »
  - mentions légales, phrase du rôle du responsable : « Le responsable de l'organisme voit la liste de ses étudiants : adresse e-mail, date d'inscription et date de dernière connexion. Pour les étudiants qui l'acceptent, il voit aussi le nombre de candidatures envoyées, la date de la dernière et la date à laquelle l'étudiant a déclaré avoir trouvé une entreprise. Il n'a jamais accès à leur CV, à leurs offres ni au contenu de leurs candidatures. » ; ajouter « le choix de partager son avancement avec son organisme, et sa date » à la liste des données traitées (`lib/legal.ts`).
  - CGU l. 38 : même contenu, au registre de la page.
- [ ] **Step 2: démo** — `scripts/seed-demo.ts` : l'étudiante est créée/mise à jour avec `shareProgress: true, shareProgressAt: new Date()` ; les candidatures au statut « Envoyé » ou « Refusé » reçoivent une `sentAt` (date du jour − 6 jours, cohérente avec la relance « il y a quatre jours » qui apparaît après envoi).
- [ ] **Step 3:** `npx vitest run` → tout PASS ; `npx tsc --noEmit` → 0 ; `npx eslint .` → 0.
- [ ] **Step 4: parcours réel en local** (base PGlite `pglite://./data/dev`, serveur `dev.cmd`, port 3001) : appliquer la migration (`npm run db:migrate`) ; créer un organisme ; inscrire deux étudiants avec le code (un avec la case, un sans) ; marquer une candidature « Envoyé » pour le premier ; vérifier sur `/organisme` : « 1 envoyée · dernière le … · En recherche », « Non partagé », le résumé ; déclarer « entreprise trouvée » puis retirer l'accord, et vérifier « Non partagé ».
- [ ] **Step 5:** commit `copy: le partage d'avancement dans les pages, les mentions et la démo`, push de la branche, PR vers `main`.
