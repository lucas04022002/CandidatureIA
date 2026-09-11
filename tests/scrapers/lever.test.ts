import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import fixture from "../fixtures/lever.json";
import { scrapeLeverJobs } from "@/lib/scrapers/lever";

describe("scrapeLeverJobs", () => {
  beforeEach(() => {
    delete process.env.LEVER_COMPANY_TOKENS;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.LEVER_COMPANY_TOKENS;
  });

  it("sans entreprise configurée, ne fait aucun appel réseau", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const result = await scrapeLeverJobs({});

    expect(result.ok).toBe(false);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("renvoie des offres normalisées à partir de la réponse de l'API", async () => {
    process.env.LEVER_COMPANY_TOKENS = "exemple-entreprise";
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify(fixture), { status: 200 })),
    );

    const result = await scrapeLeverJobs({});

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
