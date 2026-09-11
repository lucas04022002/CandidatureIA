import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import fixture from "../fixtures/greenhouse.json";
import { scrapeGreenhouseJobs } from "@/lib/scrapers/greenhouse";

describe("scrapeGreenhouseJobs", () => {
  beforeEach(() => {
    delete process.env.GREENHOUSE_BOARD_TOKENS;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.GREENHOUSE_BOARD_TOKENS;
  });

  it("sans board configuré, ne fait aucun appel réseau", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const result = await scrapeGreenhouseJobs({});

    expect(result.ok).toBe(false);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("renvoie des offres normalisées à partir de la réponse de l'API", async () => {
    process.env.GREENHOUSE_BOARD_TOKENS = "exemple-entreprise";
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify(fixture), { status: 200 })),
    );

    const result = await scrapeGreenhouseJobs({});

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
