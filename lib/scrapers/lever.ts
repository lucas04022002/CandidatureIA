interface LeverSearchOptions {
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

interface LeverJob {
  text?: string;
  descriptionPlain?: string;
  description?: string;
  hostedUrl?: string;
  applyUrl?: string;
  categories?: {
    location?: string;
    commitment?: string;
    team?: string;
    department?: string;
    allLocations?: string[];
  };
  workplaceType?: string;
}

const LEVER_API_BASE = "https://api.lever.co/v0/postings";
const QUERY_TIMEOUT_MS = 12000;

function withTimeoutSignal(timeoutMs: number) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  return { signal: controller.signal, clear: () => clearTimeout(timeout) };
}

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function slugToCompanyName(token: string) {
  return token
    .split(/[-_]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function parseCompanyTokens() {
  const raw = process.env.LEVER_COMPANY_TOKENS?.trim();
  if (!raw) return [];

  return Array.from(
    new Set(
      raw
        .split(/[,\n;]/)
        .map((token) => token.trim())
        .filter(Boolean),
    ),
  );
}

function isConfigured() {
  return parseCompanyTokens().length > 0;
}

function matchesKeywords(job: LeverJob, keywords?: string) {
  const query = keywords?.trim();
  if (!query) return true;

  const haystack = normalizeText(
    [
      job.text,
      job.descriptionPlain,
      job.description,
      job.categories?.team,
      job.categories?.department,
      job.categories?.location,
    ]
      .filter(Boolean)
      .join(" "),
  );

  const terms = normalizeText(query)
    .split(/\s+/)
    .filter((term) => term.length >= 2);

  if (!terms.length) return true;

  return terms.every((term) => haystack.includes(term));
}

function detectContract(job: LeverJob) {
  const combined = normalizeText(
    [
      job.text,
      job.descriptionPlain,
      job.description,
      job.categories?.commitment,
      job.workplaceType,
    ]
      .filter(Boolean)
      .join(" "),
  );

  if (combined.includes("alternance")) return "Alternance";
  if (combined.includes("stage")) return "Stage";
  if (combined.includes("intern")) return "Stage";
  if (combined.includes("apprenticeship")) return "Alternance";
  if (combined.includes("freelance") || combined.includes("contractor")) return "Freelance";
  if (combined.includes("part time") || combined.includes("part-time")) return "Temps partiel";
  if (combined.includes("full time") || combined.includes("full-time")) return "Temps plein";
  if (combined.includes("cdd") || combined.includes("fixed term")) return "CDD";
  if (combined.includes("cdi") || combined.includes("permanent")) return "CDI";

  return job.categories?.commitment?.trim() || "Contrat non précisé";
}

function mapLeverJob(job: LeverJob, companyToken: string): ScrapedJob | null {
  const title = job.text?.trim();
  if (!title) return null;

  const allLocations = Array.isArray(job.categories?.allLocations)
    ? job.categories?.allLocations.filter(Boolean)
    : [];
  const location =
    job.categories?.location?.trim() ||
    allLocations.join(", ").trim() ||
    "Localisation non précisée";

  return {
    title,
    company: slugToCompanyName(companyToken),
    location,
    contract: detectContract(job),
    source: "Lever",
    jobUrl: job.hostedUrl?.trim() || job.applyUrl?.trim() || null,
    jobDescription: job.descriptionPlain?.trim() || job.description?.trim() || null,
    score: 80,
    status: "Nouveau",
  };
}

async function fetchCompanyJobs(companyToken: string) {
  const params = new URLSearchParams({
    mode: "json",
  });

  const { signal, clear } = withTimeoutSignal(QUERY_TIMEOUT_MS);
  try {
    const response = await fetch(
      `${LEVER_API_BASE}/${encodeURIComponent(companyToken)}?${params.toString()}`,
      {
        method: "GET",
        headers: { Accept: "application/json" },
        signal,
      },
    );

    if (!response.ok) {
      throw new Error(`${companyToken}: requête refusée (${response.status})`);
    }

    const payload = (await response.json()) as LeverJob[] | { ok?: false; error?: string };
    if (!Array.isArray(payload)) {
      throw new Error(
        `${companyToken}: ${typeof payload.error === "string" ? payload.error : "réponse Lever invalide"}`,
      );
    }

    return payload;
  } finally {
    clear();
  }
}

export async function scrapeLeverJobs(options: LeverSearchOptions = {}) {
  if (!isConfigured()) {
    return {
      ok: false as const,
      reason: "Configuration Lever absente. Ajoute LEVER_COMPANY_TOKENS.",
      jobs: [] as ScrapedJob[],
    };
  }

  const companyTokens = parseCompanyTokens();
  const limit = Math.max(1, Math.min(options.limit ?? 20, 100));
  const errors: string[] = [];
  const jobs: ScrapedJob[] = [];

  for (const companyToken of companyTokens) {
    try {
      const companyJobs = await fetchCompanyJobs(companyToken);
      const mapped = companyJobs
        .filter((job) => matchesKeywords(job, options.keywords))
        .map((job) => mapLeverJob(job, companyToken))
        .filter((job): job is ScrapedJob => job !== null);

      jobs.push(...mapped);
    } catch (error) {
      errors.push(error instanceof Error ? error.message : `${companyToken}: erreur inconnue`);
    }
  }

  if (!jobs.length) {
    return {
      ok: false as const,
      reason: errors.length
        ? `Aucune offre Lever récupérée. Détails: ${errors.slice(0, 3).join(" | ")}`
        : "Aucune offre Lever ne correspond aux filtres.",
      jobs: [] as ScrapedJob[],
    };
  }

  return {
    ok: true as const,
    jobs: jobs.slice(0, limit),
    warnings: errors,
  };
}
