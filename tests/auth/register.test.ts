import { beforeAll, describe, expect, it } from "vitest";
import { resetDatabase } from "../setup-db";
import { createOrganisation } from "@/lib/db/queries/organisations";
import { db } from "@/lib/db/client";
import { organisations } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { POST as register } from "@/app/api/auth/register/route";

// IP dédiée à ce fichier : évite tout compartiment anti-flood partagé avec les autres fichiers de
// test (qui tournent en principe déjà dans des bases isolées, mais chacun sa propre adresse rend
// l'isolation explicite plutôt que dépendante d'un détail d'implémentation de Vitest).
const TEST_IP = "198.51.100.10";

const post = (body: unknown) =>
  register(
    new Request("http://localhost/api/auth/register", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        host: "localhost",
        "sec-fetch-site": "same-origin",
        "x-forwarded-for": TEST_IP,
      },
      body: JSON.stringify(body),
    }),
    {},
  );

const postWithHeaders = (body: unknown, headers: Record<string, string>) =>
  register(
    new Request("http://localhost/api/auth/register", {
      method: "POST",
      headers: { "content-type": "application/json", host: "localhost", "x-forwarded-for": TEST_IP, ...headers },
      body: JSON.stringify(body),
    }),
    {},
  );

describe("inscription par code", () => {
  let code: string;
  let conflictCode: string;
  let inactiveCode: string;

  beforeAll(async () => {
    await resetDatabase();
    const org = await createOrganisation({ name: "AFPA Test" });
    code = org.code;
    await db.update(organisations).set({ active: true, seats: 1 }).where(eq(organisations.id, org.id));

    const conflictOrg = await createOrganisation({ name: "AFPA Conflit" });
    conflictCode = conflictOrg.code;
    await db.update(organisations).set({ active: true, seats: 2 }).where(eq(organisations.id, conflictOrg.id));

    const inactiveOrg = await createOrganisation({ name: "AFPA Inactif" });
    inactiveCode = inactiveOrg.code;
    // Un organisme naît désormais actif : on le désactive explicitement, sinon
    // ce test ne vérifie plus rien. Le cas reste réel — l'administration peut
    // couper l'accès d'un organisme après coup.
    await db.update(organisations).set({ active: false }).where(eq(organisations.id, inactiveOrg.id));
  });

  it("code inconnu → 400", async () => {
    const r = await post({ email: "a@ex.fr", password: "0123456789", acceptedTerms: true, orgCode: "ZZZZZZZZ" });
    expect(r.status).toBe(400);
    expect((await r.json()).error).toMatch(/inconnu/);
  });

  it("ok → 201 + cookie", async () => {
    const r = await post({ email: "a@ex.fr", password: "0123456789", acceptedTerms: true, orgCode: code });
    expect(r.status).toBe(201);
    expect(r.headers.get("set-cookie")).toMatch(/ab_session=/);
  });

  it("plus de place → 400", async () => {
    const r = await post({ email: "b@ex.fr", password: "0123456789", acceptedTerms: true, orgCode: code });
    expect(r.status).toBe(400);
    expect((await r.json()).error).toMatch(/place/);
  });

  it("mot de passe court → 400", async () => {
    const r = await post({ email: "c@ex.fr", password: "court", acceptedTerms: true, orgCode: code });
    expect(r.status).toBe(400);
  });

  it("origine cross-site (sec-fetch-site) → 403", async () => {
    const r = await postWithHeaders(
      { email: "cross-site@ex.fr", password: "0123456789", acceptedTerms: true, orgCode: conflictCode },
      { "sec-fetch-site": "cross-site" },
    );
    expect(r.status).toBe(403);
  });

  it("origine différente du host → 403", async () => {
    const r = await postWithHeaders(
      { email: "origin-mismatch@ex.fr", password: "0123456789", acceptedTerms: true, orgCode: conflictCode },
      { origin: "https://evil.example" },
    );
    expect(r.status).toBe(403);
  });

  it("e-mail déjà utilisé → 409", async () => {
    const first = await post({ email: "conflit@ex.fr", password: "0123456789", acceptedTerms: true, orgCode: conflictCode });
    expect(first.status).toBe(201);
    const second = await post({ email: "conflit@ex.fr", password: "0123456789", acceptedTerms: true, orgCode: conflictCode });
    expect(second.status).toBe(409);
    expect((await second.json()).error).toMatch(/existe déjà/);
  });

  it("CGU non acceptées → 400", async () => {
    const sans = await post({ email: "sans-cgu@ex.fr", password: "0123456789", orgCode: conflictCode });
    expect(sans.status).toBe(400);

    const refus = await post({
      email: "refus-cgu@ex.fr",
      password: "0123456789",
      acceptedTerms: false,
      orgCode: conflictCode,
    });
    expect(refus.status).toBe(400);
  });

  it("organisme inactif → 400", async () => {
    const r = await post({ email: "inactif@ex.fr", password: "0123456789", acceptedTerms: true, orgCode: inactiveCode });
    expect(r.status).toBe(400);
    expect((await r.json()).error).toMatch(/inactif/);
  });
});
