import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import fixture from "../fixtures/smartrecruiters.json";
import { scrapeSmartRecruitersJobs } from "@/lib/scrapers/smartrecruiters";

describe("scrapeSmartRecruitersJobs", () => {
  beforeEach(() => {
    delete process.env.SMARTRECRUITERS_COMPANY_TOKENS;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.SMARTRECRUITERS_COMPANY_TOKENS;
  });

  it("sans entreprise configurée, ne fait aucun appel réseau", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const result = await scrapeSmartRecruitersJobs({});

    expect(result.ok).toBe(false);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("renvoie des offres normalisées après récupération du détail de chaque offre", async () => {
    process.env.SMARTRECRUITERS_COMPANY_TOKENS = "groupe-mu";
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const href = String(input);
        if (href.includes("/postings/posting-1")) {
          return new Response(JSON.stringify(fixture.details["posting-1"]), { status: 200 });
        }
        if (href.includes("/postings/posting-2")) {
          return new Response(JSON.stringify(fixture.details["posting-2"]), { status: 200 });
        }
        if (href.includes("/postings?")) {
          return new Response(JSON.stringify(fixture.list), { status: 200 });
        }
        return new Response("not found", { status: 404 });
      }),
    );

    const result = await scrapeSmartRecruitersJobs({});

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
