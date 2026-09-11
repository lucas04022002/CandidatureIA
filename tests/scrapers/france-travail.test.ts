import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import fixture from "../fixtures/france-travail.json";
import { scrapeFranceTravailJobs } from "@/lib/scrapers/france-travail";

describe("scrapeFranceTravailJobs", () => {
  beforeEach(() => {
    delete process.env.FRANCE_TRAVAIL_CLIENT_ID;
    delete process.env.FRANCE_TRAVAIL_CLIENT_SECRET;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.FRANCE_TRAVAIL_CLIENT_ID;
    delete process.env.FRANCE_TRAVAIL_CLIENT_SECRET;
  });

  it("sans identifiants configurés, ne fait aucun appel réseau", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const result = await scrapeFranceTravailJobs({ keywords: "technicien" });

    expect(result.ok).toBe(false);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("renvoie des offres normalisées après authentification OAuth", async () => {
    process.env.FRANCE_TRAVAIL_CLIENT_ID = "test-client-id";
    process.env.FRANCE_TRAVAIL_CLIENT_SECRET = "test-client-secret";

    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const href = String(input);
        if (href.includes("oauth2/access_token")) {
          return new Response(JSON.stringify({ access_token: "test-token", token_type: "Bearer" }), {
            status: 200,
          });
        }
        if (href.includes("/offres/search")) {
          return new Response(JSON.stringify(fixture), { status: 200 });
        }
        return new Response("not found", { status: 404 });
      }),
    );

    const result = await scrapeFranceTravailJobs({ keywords: "technicien" });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.jobs).toHaveLength(2);
    for (const job of result.jobs) {
      expect(job.title).toBeTruthy();
      expect(job.company).toBeTruthy();
      expect(job.location).toBeTruthy();
      expect(job.jobUrl).toBeTruthy();
    }
  });
});
