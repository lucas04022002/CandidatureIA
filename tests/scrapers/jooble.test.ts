import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import fixture from "../fixtures/jooble.json";
import { scrapeJoobleJobs } from "@/lib/scrapers/jooble";

describe("scrapeJoobleJobs", () => {
  beforeEach(() => {
    delete process.env.JOOBLE_API_KEY;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.JOOBLE_API_KEY;
  });

  it("sans clé configurée, ne fait aucun appel réseau", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const result = await scrapeJoobleJobs({ keywords: "vente" });

    expect(result.ok).toBe(false);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("renvoie des offres normalisées à partir de la réponse de l'API", async () => {
    process.env.JOOBLE_API_KEY = "test-key";
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify(fixture), { status: 200 })),
    );

    const result = await scrapeJoobleJobs({ keywords: "vente" });

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
