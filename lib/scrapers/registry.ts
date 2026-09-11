import { scrapeAdzunaJobs } from "@/lib/scrapers/adzuna";
import { scrapeFranceTravailJobs } from "@/lib/scrapers/france-travail";
import { scrapeGreenhouseJobs } from "@/lib/scrapers/greenhouse";
import { scrapeJoobleJobs } from "@/lib/scrapers/jooble";
import { scrapeLaBonneAlternanceJobs } from "@/lib/scrapers/la-bonne-alternance";
import { scrapeLeverJobs } from "@/lib/scrapers/lever";
import { scrapeSmartRecruitersJobs } from "@/lib/scrapers/smartrecruiters";

export interface ScrapeOptions {
  keywords?: string;
  limit?: number;
  location?: string;
  contract?: string;
  remoteOnly?: boolean;
  radiusKm?: number;
}

export interface ScrapedJob {
  title: string;
  company: string;
  location: string;
  contract: string;
  source: string;
  jobUrl: string | null;
  jobDescription: string | null;
  score: number;
  status: "Nouveau";
}

type RawScraperResult =
  | { ok: true; jobs: ScrapedJob[]; warnings?: string[] }
  | { ok: false; reason?: string };

export interface Scraper {
  source: string;
  run: (options: ScrapeOptions) => Promise<RawScraperResult>;
}

export interface SourceResult {
  source: string;
  ok: boolean;
  jobs: ScrapedJob[];
  reason?: string;
  warnings: string[];
}

// Les 7 connecteurs, dans l'ordre d'interrogation historique de la route de scraping.
export const SCRAPERS: Scraper[] = [
  {
    source: "France Travail",
    run: (o) =>
      scrapeFranceTravailJobs({
        keywords: o.keywords,
        limit: o.limit,
        location: o.location,
        contract: o.contract,
        remoteOnly: o.remoteOnly,
        radiusKm: o.radiusKm,
      }),
  },
  {
    source: "Adzuna",
    run: (o) => scrapeAdzunaJobs({ keywords: o.keywords, limit: o.limit, location: o.location }),
  },
  {
    source: "Jooble",
    run: (o) => scrapeJoobleJobs({ keywords: o.keywords, limit: o.limit, location: o.location, radiusKm: o.radiusKm }),
  },
  {
    source: "Greenhouse",
    run: (o) => scrapeGreenhouseJobs({ keywords: o.keywords, limit: o.limit, location: o.location }),
  },
  {
    source: "La bonne alternance",
    run: (o) =>
      scrapeLaBonneAlternanceJobs({ keywords: o.keywords, limit: o.limit, location: o.location, radiusKm: o.radiusKm }),
  },
  {
    source: "Lever",
    run: (o) => scrapeLeverJobs({ keywords: o.keywords, limit: o.limit, location: o.location }),
  },
  {
    source: "SmartRecruiters",
    run: (o) => scrapeSmartRecruitersJobs({ keywords: o.keywords, limit: o.limit, location: o.location }),
  },
];

// Interrogation séquentielle : une source qui échoue n'interrompt jamais les suivantes, son motif
// est simplement remonté dans `reason`.
export async function scrapeAll(options: ScrapeOptions): Promise<SourceResult[]> {
  const results: SourceResult[] = [];

  for (const scraper of SCRAPERS) {
    try {
      const result = await scraper.run(options);
      if (result.ok) {
        results.push({ source: scraper.source, ok: true, jobs: result.jobs, warnings: result.warnings ?? [] });
      } else {
        results.push({ source: scraper.source, ok: false, jobs: [], reason: result.reason, warnings: [] });
      }
    } catch (error) {
      results.push({
        source: scraper.source,
        ok: false,
        jobs: [],
        reason: error instanceof Error ? error.message : `${scraper.source} indisponible.`,
        warnings: [],
      });
    }
  }

  return results;
}
