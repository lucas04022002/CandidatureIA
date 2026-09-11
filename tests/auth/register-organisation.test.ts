import { beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { resetDatabase } from "../setup-db";
import { db } from "@/lib/db/client";
import { organisations, users } from "@/lib/db/schema";
import { POST as registerOrganisation } from "@/app/api/auth/register-organisation/route";

// IP dédiée à ce fichier : voir la même remarque dans tests/auth/register.test.ts.
const TEST_IP = "198.51.100.30";

const post = (body: unknown, headers: Record<string, string> = {}) =>
  registerOrganisation(
    new Request("http://localhost/api/auth/register-organisation", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        host: "localhost",
        "sec-fetch-site": "same-origin",
        "x-forwarded-for": TEST_IP,
        ...headers,
      },
      body: JSON.stringify(body),
    }),
    {},
  );

describe("création d'organisme", () => {
  beforeAll(resetDatabase);

  it("ok → 201, organisme inactif à 0 place, responsable créé", async () => {
    const r = await post({ organisationName: "AFPA Nouvelle", email: "resp@ex.fr", password: "0123456789", acceptedTerms: true });
    expect(r.status).toBe(201);

    const body = await r.json();
    expect(body.role).toBe("responsable");
    expect(body.organisation.active).toBe(false);
    expect(r.headers.get("set-cookie")).toMatch(/ab_session=/);

    const [org] = await db.select().from(organisations).where(eq(organisations.id, body.organisation.id));
    expect(org.active).toBe(false);
    expect(org.seats).toBe(0);

    const [user] = await db.select().from(users).where(eq(users.id, body.id));
    expect(user.role).toBe("responsable");
    expect(user.organisationId).toBe(org.id);
  });

  it("CGU non acceptées → 400", async () => {
    const r = await post({ organisationName: "AFPA Sans CGU", email: "sans-cgu-org@ex.fr", password: "0123456789" });
    expect(r.status).toBe(400);
  });

  it("origine cross-site (sec-fetch-site) → 403", async () => {
    const r = await post(
      { organisationName: "AFPA Cross", email: "cross@ex.fr", password: "0123456789", acceptedTerms: true },
      { "sec-fetch-site": "cross-site" },
    );
    expect(r.status).toBe(403);
  });

  it("origine différente du host → 403", async () => {
    const r = await post(
      { organisationName: "AFPA Origin", email: "origin@ex.fr", password: "0123456789", acceptedTerms: true },
      { origin: "https://evil.example" },
    );
    expect(r.status).toBe(403);
  });
});
