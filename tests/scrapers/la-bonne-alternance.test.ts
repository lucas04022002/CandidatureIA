import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import fixture from "../fixtures/la-bonne-alternance.json";
import { scrapeLaBonneAlternanceJobs } from "@/lib/scrapers/la-bonne-alternance";

const KEY_ENV_VARS = ["LBA_API_KEY", "APPRENTISSAGE_API_KEY", "LA_BONNE_ALTERNANCE_API_KEY"];

function clearKeys() {
  for (const key of KEY_ENV_VARS) delete process.env[key];
}

describe("scrapeLaBonneAlternanceJobs", () => {
  beforeEach(clearKeys);
  afterEach(() => {
    vi.unstubAllGlobals();
    clearKeys();
  });

  it("sans clé configurée, ne fait aucun appel réseau", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const result = await scrapeLaBonneAlternanceJobs({ keywords: "alternance" });

    expect(result.ok).toBe(false);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("renvoie des offres normalisées à partir de la réponse de l'API", async () => {
    process.env.LBA_API_KEY = "test-key";
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify(fixture), { status: 200 })),
    );

    const result = await scrapeLaBonneAlternanceJobs({ keywords: "alternance" });

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
