import { beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { resetDatabase } from "../setup-db";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { createOrganisation } from "@/lib/db/queries/organisations";
import { POST as register } from "@/app/api/auth/register/route";

// IP dédiée à ce fichier, comme dans tests/auth/register.test.ts.
const TEST_IP = "198.51.100.40";

const post = (body: unknown) =>
  register(
    new Request("http://localhost/api/auth/register", {
      method: "POST",
      headers: { "content-type": "application/json", host: "localhost", "sec-fetch-site": "same-origin", "x-forwarded-for": TEST_IP },
      body: JSON.stringify(body),
    }),
    {},
  );

const row = async (email: string) => (await db.select().from(users).where(eq(users.email, email)))[0];

describe("inscription : la case « partager mon avancement »", () => {
  let code = "";
  beforeAll(async () => {
    await resetDatabase();
    code = (await createOrganisation({ name: "Promo partage" })).code;
  });

  it("cochée → partage accepté, avec sa date", async () => {
    const r = await post({ email: "partage@ex.fr", password: "0123456789", acceptedTerms: true, orgCode: code, shareProgress: true });
    expect(r.status).toBe(201);
    const u = await row("partage@ex.fr");
    expect(u.shareProgress).toBe(true);
    expect(u.shareProgressAt).not.toBeNull();
  });

  it("absente → refus : la question est répondue, l'encart ne la reposera pas", async () => {
    const r = await post({ email: "sans-partage@ex.fr", password: "0123456789", acceptedTerms: true, orgCode: code });
    expect(r.status).toBe(201);
    expect((await row("sans-partage@ex.fr")).shareProgress).toBe(false);
  });
});
