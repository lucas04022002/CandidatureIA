import { afterEach, describe, expect, it, vi } from "vitest";
import { activeScrapers, scrapeAll } from "@/lib/scrapers/registry";
import joobleFixture from "../fixtures/jooble.json";

const SCRAPER_ENV_KEYS = [
  "FRANCE_TRAVAIL_CLIENT_ID",
  "FRANCE_TRAVAIL_CLIENT_SECRET",
  "ADZUNA_APP_ID",
  "ADZUNA_APP_KEY",
  "JOOBLE_API_KEY",
  "GREENHOUSE_BOARD_TOKENS",
  "LBA_API_KEY",
  "APPRENTISSAGE_API_KEY",
  "LA_BONNE_ALTERNANCE_API_KEY",
  "SOURCE_LBA",
  "LEVER_COMPANY_TOKENS",
  "SMARTRECRUITERS_COMPANY_TOKENS",
];

function clearScraperEnv() {
  for (const key of SCRAPER_ENV_KEYS) delete process.env[key];
}

describe("registre des connecteurs", () => {
  afterEach(() => {
    clearScraperEnv();
    vi.unstubAllGlobals();
  });

  it("SOURCE_LBA=off retire La bonne alternance même si elle est configurée", () => {
    clearScraperEnv();
    process.env.LBA_API_KEY = "test-key";
    process.env.SOURCE_LBA = "off";

    const keys = activeScrapers().map((scraper) => scraper.key);
    expect(keys).not.toContain("la-bonne-alternance");
  });

  it("La bonne alternance reste active par défaut (SOURCE_LBA absent)", () => {
    clearScraperEnv();
    process.env.LBA_API_KEY = "test-key";

    const keys = activeScrapers().map((scraper) => scraper.key);
    expect(keys).toContain("la-bonne-alternance");
  });

  it("sans aucune clé d'environnement, aucune source n'est active et scrapeAll ne lance rien", async () => {
    clearScraperEnv();
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    expect(activeScrapers()).toHaveLength(0);

    const result = await scrapeAll({ keywords: "developpeur" });

    expect(result).toEqual({ jobs: [], sources: [] });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  // Promise.allSettled : une source en échec (Adzuna, ici en erreur réseau) ne doit ni annuler ni
  // vider les offres d'une source qui répond correctement (Jooble).
  it("une source en erreur n'empêche pas les autres sources de remonter leurs offres", async () => {
    clearScraperEnv();
    process.env.ADZUNA_APP_ID = "test-app-id";
    process.env.ADZUNA_APP_KEY = "test-app-key";
    process.env.JOOBLE_API_KEY = "test-key";

    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const href = String(input);
        if (href.includes("api.adzuna.com")) {
          throw new Error("Adzuna injoignable (réseau simulé).");
        }
        if (href.includes("jooble.org")) {
          return new Response(JSON.stringify(joobleFixture), { status: 200 });
        }
        return new Response("not found", { status: 404 });
      }),
    );

    const result = await scrapeAll({ keywords: "developpeur" });

    expect(result.jobs).toHaveLength(2);
    expect(result.jobs.every((job) => job.source === "Jooble")).toBe(true);

    const adzunaOutcome = result.sources.find((source) => source.key === "adzuna");
    const joobleOutcome = result.sources.find((source) => source.key === "jooble");
    expect(adzunaOutcome?.error).toBeTruthy();
    expect(joobleOutcome?.error).toBeUndefined();
    expect(joobleOutcome?.count).toBe(2);
  });
});
