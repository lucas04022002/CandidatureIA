import { beforeAll, describe, expect, it } from "vitest";
import { resetDatabase } from "../setup-db";
import { createOrganisation } from "@/lib/db/queries/organisations";
import { db } from "@/lib/db/client";
import { organisations } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { POST as register } from "@/app/api/auth/register/route";

const post = (body: unknown) =>
  register(
    new Request("http://localhost/api/auth/register", {
      method: "POST",
      headers: { "content-type": "application/json", host: "localhost", "sec-fetch-site": "same-origin" },
      body: JSON.stringify(body),
    }),
    {},
  );

describe("inscription par code", () => {
  let code: string;

  beforeAll(async () => {
    await resetDatabase();
    const org = await createOrganisation({ name: "AFPA Test" });
    code = org.code;
    await db.update(organisations).set({ active: true, seats: 1 }).where(eq(organisations.id, org.id));
  });

  it("code inconnu → 400", async () => {
    const r = await post({ email: "a@ex.fr", password: "0123456789", orgCode: "ZZZZZZZZ" });
    expect(r.status).toBe(400);
    expect((await r.json()).error).toMatch(/inconnu/);
  });

  it("ok → 201 + cookie", async () => {
    const r = await post({ email: "a@ex.fr", password: "0123456789", orgCode: code });
    expect(r.status).toBe(201);
    expect(r.headers.get("set-cookie")).toMatch(/ab_session=/);
  });

  it("plus de place → 400", async () => {
    const r = await post({ email: "b@ex.fr", password: "0123456789", orgCode: code });
    expect(r.status).toBe(400);
    expect((await r.json()).error).toMatch(/place/);
  });

  it("mot de passe court → 400", async () => {
    const r = await post({ email: "c@ex.fr", password: "court", orgCode: code });
    expect(r.status).toBe(400);
  });
});
