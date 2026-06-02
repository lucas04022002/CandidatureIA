interface AdzunaSearchOptions {
  keywords?: string;
  limit?: number;
  location?: string;
}

interface ScrapedJob {
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

interface AdzunaJob {
  title?: string;
  description?: string;
  redirect_url?: string;
  contract_type?: string;
  contract_time?: string;
  company?: {
    display_name?: string;
  };
  location?: {
    display_name?: string;
  };
}

interface AdzunaSearchResponse {
  results?: AdzunaJob[];
}

const DEFAULT_ADZUNA_COUNTRY = "fr";
const ADZUNA_API_BASE = "https://api.adzuna.com/v1/api/jobs";
const QUERY_TIMEOUT_MS = 12000;

function withTimeoutSignal(timeoutMs: number) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  return { signal: controller.signal, clear: () => clearTimeout(timeout) };
}

function isConfigured() {
  return Boolean(process.env.ADZUNA_APP_ID && process.env.ADZUNA_APP_KEY);
}

function mapContract(job: AdzunaJob) {
  const typeRaw = (job.contract_type || "").toLowerCase();
  const timeRaw = (job.contract_time || "").toLowerCase();

  if (typeRaw.includes("permanent")) return "CDI";
  if (typeRaw.includes("contract")) return "CDD";
  if (timeRaw.includes("part")) return "Temps partiel";
  if (timeRaw.includes("full")) return "Temps plein";
  return "Contrat non précisé";
}

function mapAdzunaJob(job: AdzunaJob): ScrapedJob | null {
  const title = job.title?.trim();
  if (!title) return null;

  return {
    title,
    company: job.company?.display_name?.trim() || "Entreprise non précisée",
    location: job.location?.display_name?.trim() || "France",
    contract: mapContract(job),
    source: "Adzuna",
    jobUrl: job.redirect_url?.trim() || null,
    jobDescription: job.description?.trim() || null,
    score: 80,
    status: "Nouveau",
  };
}

export async function scrapeAdzunaJobs(options: AdzunaSearchOptions = {}) {
  if (!isConfigured()) {
    return {
      ok: false as const,
      reason: "Configuration Adzuna absente. Ajoute ADZUNA_APP_ID et ADZUNA_APP_KEY.",
      jobs: [] as ScrapedJob[],
    };
  }

  const appId = process.env.ADZUNA_APP_ID?.trim();
  const appKey = process.env.ADZUNA_APP_KEY?.trim();
  const country = (process.env.ADZUNA_COUNTRY || DEFAULT_ADZUNA_COUNTRY).trim().toLowerCase();

  if (!appId || !appKey) {
    return {
      ok: false as const,
      reason: "Clés Adzuna invalides.",
      jobs: [] as ScrapedJob[],
    };
  }

  const limit = Math.max(1, Math.min(options.limit ?? 20, 50));
  const params = new URLSearchParams({
    app_id: appId,
    app_key: appKey,
    results_per_page: String(limit),
    what: options.keywords?.trim() || "emploi",
    "content-type": "application/json",
  });

  if (options.location?.trim()) {
    params.set("where", options.location.trim());
  }

  const { signal, clear } = withTimeoutSignal(QUERY_TIMEOUT_MS);
  try {
    const response = await fetch(`${ADZUNA_API_BASE}/${country}/search/1?${params.toString()}`, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal,
    });

    if (!response.ok) {
      throw new Error(`Recherche Adzuna refusée (${response.status}).`);
    }

    const payload = (await response.json()) as AdzunaSearchResponse;
    const jobs = (payload.results || [])
      .map(mapAdzunaJob)
      .filter((job): job is ScrapedJob => job !== null);

    return { ok: true as const, jobs };
  } catch (error) {
    return {
      ok: false as const,
      reason: error instanceof Error ? error.message : "Erreur Adzuna inconnue.",
      jobs: [] as ScrapedJob[],
    };
  } finally {
    clear();
  }
}
