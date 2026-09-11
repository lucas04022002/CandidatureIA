import { isConfigured as isAdzunaConfigured, scrapeAdzunaJobs } from "@/lib/scrapers/adzuna";
import {
  isConfigured as isFranceTravailConfigured,
  scrapeFranceTravailJobs,
} from "@/lib/scrapers/france-travail";
import { isConfigured as isGreenhouseConfigured, scrapeGreenhouseJobs } from "@/lib/scrapers/greenhouse";
import { isConfigured as isJoobleConfigured, scrapeJoobleJobs } from "@/lib/scrapers/jooble";
import {
  isConfigured as isLaBonneAlternanceConfigured,
  scrapeLaBonneAlternanceJobs,
} from "@/lib/scrapers/la-bonne-alternance";
import { isConfigured as isLeverConfigured, scrapeLeverJobs } from "@/lib/scrapers/lever";
import {
  isConfigured as isSmartRecruitersConfigured,
  scrapeSmartRecruitersJobs,
} from "@/lib/scrapers/smartrecruiters";

export interface CommonSearchOptions {
  keywords?: string;
  limit?: number;
  location?: string;
  contract?: string;
  remoteOnly?: boolean;
  radiusKm?: number;
}

export interface NormalizedJob {
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

// Alias conservés pour ne pas casser le reste de l'app, qui a été écrit avec ces noms.
export type ScrapeOptions = CommonSearchOptions;
export type ScrapedJob = NormalizedJob;

export interface ScraperEntry {
  key: string;
  label: string;
  isConfigured: () => boolean;
  enabled: () => boolean;
  scrape: (options: CommonSearchOptions) => Promise<NormalizedJob[]>;
}

export interface SourceOutcome {
  key: string;
  count: number;
  error?: string;
}

const alwaysEnabled = () => true;

interface RawScraperResult {
  ok: boolean;
  jobs: NormalizedJob[];
  reason?: string;
}

// Chaque connecteur renvoie déjà `{ ok, jobs, reason }` sans jamais lever d'exception : on convertit
// ici un `ok: false` en rejet, pour que `Promise.allSettled` dans `scrapeAll` traite uniformément les
// échecs (source non joignable, comme source sans résultat après filtrage).
async function runOrThrow(label: string, result: RawScraperResult): Promise<NormalizedJob[]> {
  if (!result.ok) {
    throw new Error(result.reason?.trim() || `${label} indisponible.`);
  }
  return result.jobs;
}

// Les 7 connecteurs, dans l'ordre d'interrogation historique de la route de scraping. La Bonne
// Alternance reste active par défaut et se coupe via `SOURCE_LBA=off`.
export const SCRAPERS: ScraperEntry[] = [
  {
    key: "france-travail",
    label: "France Travail",
    isConfigured: isFranceTravailConfigured,
    enabled: alwaysEnabled,
    scrape: async (o) =>
      runOrThrow(
        "France Travail",
        await scrapeFranceTravailJobs({
          keywords: o.keywords,
          limit: o.limit,
          location: o.location,
          contract: o.contract,
          remoteOnly: o.remoteOnly,
          radiusKm: o.radiusKm,
        }),
      ),
  },
  {
    key: "adzuna",
    label: "Adzuna",
    isConfigured: isAdzunaConfigured,
    enabled: alwaysEnabled,
    scrape: async (o) =>
      runOrThrow(
        "Adzuna",
        await scrapeAdzunaJobs({ keywords: o.keywords, limit: o.limit, location: o.location }),
      ),
  },
  {
    key: "jooble",
    label: "Jooble",
    isConfigured: isJoobleConfigured,
    enabled: alwaysEnabled,
    scrape: async (o) =>
      runOrThrow(
        "Jooble",
        await scrapeJoobleJobs({
          keywords: o.keywords,
          limit: o.limit,
          location: o.location,
          radiusKm: o.radiusKm,
        }),
      ),
  },
  {
    key: "greenhouse",
    label: "Greenhouse",
    isConfigured: isGreenhouseConfigured,
    enabled: alwaysEnabled,
    scrape: async (o) =>
      runOrThrow(
        "Greenhouse",
        await scrapeGreenhouseJobs({ keywords: o.keywords, limit: o.limit, location: o.location }),
      ),
  },
  {
    key: "la-bonne-alternance",
    label: "La bonne alternance",
    isConfigured: isLaBonneAlternanceConfigured,
    // Interrupteur dédié : actif par défaut, coupable sans toucher à la configuration de l'API.
    enabled: () => (process.env.SOURCE_LBA ?? "on") === "on",
    scrape: async (o) =>
      runOrThrow(
        "La bonne alternance",
        await scrapeLaBonneAlternanceJobs({
          keywords: o.keywords,
          limit: o.limit,
          location: o.location,
          radiusKm: o.radiusKm,
        }),
      ),
  },
  {
    key: "lever",
    label: "Lever",
    isConfigured: isLeverConfigured,
    enabled: alwaysEnabled,
    scrape: async (o) =>
      runOrThrow(
        "Lever",
        await scrapeLeverJobs({ keywords: o.keywords, limit: o.limit, location: o.location }),
      ),
  },
  {
    key: "smartrecruiters",
    label: "SmartRecruiters",
    isConfigured: isSmartRecruitersConfigured,
    enabled: alwaysEnabled,
    scrape: async (o) =>
      runOrThrow(
        "SmartRecruiters",
        await scrapeSmartRecruitersJobs({ keywords: o.keywords, limit: o.limit, location: o.location }),
      ),
  },
];

// Configurés (clé/jeton présents) ET activés (interrupteur, le cas échéant).
export function activeScrapers(): ScraperEntry[] {
  return SCRAPERS.filter((scraper) => scraper.isConfigured() && scraper.enabled());
}

// Promise.allSettled : une source en erreur (réseau, API, ou "aucun résultat") n'annule jamais les
// autres. Aucune source active ⇒ on ne lance aucun appel réseau.
export async function scrapeAll(
  options: CommonSearchOptions,
): Promise<{ jobs: NormalizedJob[]; sources: SourceOutcome[] }> {
  const scrapers = activeScrapers();
  if (!scrapers.length) {
    return { jobs: [], sources: [] };
  }

  const settled = await Promise.allSettled(scrapers.map((scraper) => scraper.scrape(options)));

  const jobs: NormalizedJob[] = [];
  const sources: SourceOutcome[] = settled.map((result, index) => {
    const scraper = scrapers[index];
    if (result.status === "fulfilled") {
      jobs.push(...result.value);
      return { key: scraper.key, count: result.value.length };
    }

    const reason = result.reason;
    return {
      key: scraper.key,
      count: 0,
      error: reason instanceof Error ? reason.message : String(reason),
    };
  });

  return { jobs, sources };
}
