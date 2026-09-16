import { beforeAll, describe, expect, it, vi } from "vitest";
import { sql } from "drizzle-orm";
import { resetDatabase } from "../setup-db";
import { db } from "@/lib/db/client";
import { organisations } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { createOrganisation, registerTraineeWithCode } from "@/lib/db/queries/organisations";
import { signSession } from "@/lib/auth/jwt";

// Aucune clé dans .env → aucune source active. La recherche doit le dire clairement (503) et ne
// PAS consommer le quota horaire : pendant l'installation, chaque essai bloquerait une heure.
vi.mock("@/lib/scrapers/registry", () => ({
  SCRAPERS: [],
  activeScrapers: () => [],
  scrapeAll: async () => ({ jobs: [], sources: [] }),
}));

let cookie = "";
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => (cookie ? { value: cookie } : undefined) }) }));

describe("scrape-jobs sans source configurée", () => {
  beforeAll(async () => {
    await resetDatabase();
    const org = await createOrganisation({ name: "OF sans clés" });
    await db.update(organisations).set({ active: true, seats: 1 }).where(eq(organisations.id, org.id));
    const user = await registerTraineeWithCode({ email: "s@ex.fr", passwordHash: "x", code: org.code });
    cookie = await signSession({ userId: user.id, role: "etudiant" });
  });

  it("répond 503 avec un message d'installation et ne consomme pas le quota", async () => {
    const { POST } = await import("@/app/api/scrape-jobs/route");
    const req = () => new Request("http://localhost/api/scrape-jobs", { method: "POST", headers: { "content-type": "application/json", host: "localhost", "sec-fetch-site": "same-origin" }, body: JSON.stringify({ keywords: "électricien", location: "Lyon" }) });
    const first = await POST(req(), {});
    expect(first.status).toBe(503);
    expect((await first.json()).error).toMatch(/Aucune source d'offres configurée/);
    const runs = await db.execute(sql`select count(*)::int as n from search_runs`);
    expect((runs.rows[0] as { n: number }).n).toBe(0);
    const second = await POST(req(), {});
    expect(second.status).toBe(503); // pas 429 : le quota n'a pas été entamé
  });
});
