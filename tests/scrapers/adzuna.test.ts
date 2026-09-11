import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import fixture from "../fixtures/adzuna.json";
import { scrapeAdzunaJobs } from "@/lib/scrapers/adzuna";

// Pas de clé configurée : le connecteur doit se déclarer indisponible sans appeler `fetch`.
describe("scrapeAdzunaJobs", () => {
  beforeEach(() => {
    delete process.env.ADZUNA_APP_ID;
    delete process.env.ADZUNA_APP_KEY;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.ADZUNA_APP_ID;
    delete process.env.ADZUNA_APP_KEY;
  });

  it("sans clé configurée, ne fait aucun appel réseau", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const result = await scrapeAdzunaJobs({ keywords: "developpeur" });

    expect(result.ok).toBe(false);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("renvoie des offres normalisées à partir de la réponse de l'API", async () => {
    process.env.ADZUNA_APP_ID = "test-app-id";
    process.env.ADZUNA_APP_KEY = "test-app-key";
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify(fixture), { status: 200 })),
    );

    const result = await scrapeAdzunaJobs({ keywords: "developpeur" });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.jobs).toHaveLength(3);
    for (const job of result.jobs) {
      expect(job.title).toBeTruthy();
      expect(job.company).toBeTruthy();
      expect(job.location).toBeTruthy();
      expect(job.jobUrl).toBeTruthy();
    }
  });
});
