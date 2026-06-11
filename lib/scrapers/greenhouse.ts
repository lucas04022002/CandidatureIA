interface GreenhouseSearchOptions {
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

interface GreenhouseJob {
  id?: number;
  title?: string;
  absolute_url?: string;
  updated_at?: string;
  content?: string;
  location?: {
    name?: string;
  };
  metadata?: Array<{ name?: string; value?: string }>;
}

interface GreenhouseJobsResponse {
  jobs?: GreenhouseJob[];
}

const GREENHOUSE_API_BASE = "https://boards-api.greenhouse.io/v1/boards";
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

function parseBoardTokens() {
  const raw = process.env.GREENHOUSE_BOARD_TOKENS?.trim();
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
  return parseBoardTokens().length > 0;
}

function matchesKeywords(job: GreenhouseJob, keywords?: string) {
  const query = keywords?.trim();
  if (!query) return true;

  const haystack = normalizeText(
    [job.title, job.content, job.location?.name]
      .filter(Boolean)
      .join(" "),
  );

  const terms = normalizeText(query)
    .split(/\s+/)
    .filter((term) => term.length >= 2);

  if (!terms.length) return true;

  return terms.every((term) => haystack.includes(term));
}

function detectContract(job: GreenhouseJob) {
  const metadata = Array.isArray(job.metadata) ? job.metadata : [];
  const metadataText = metadata
    .flatMap((entry) => [entry.name, entry.value])
    .filter(Boolean)
    .join(" ");

  const combined = normalizeText(`${job.title || ""} ${job.content || ""} ${metadataText}`);

  if (combined.includes("alternance")) return "Alternance";
  if (combined.includes("stage")) return "Stage";
  if (combined.includes("freelance")) return "Freelance";
  if (combined.includes("internship")) return "Stage";
  if (combined.includes("apprenticeship")) return "Alternance";
  if (combined.includes("part-time") || combined.includes("part time")) return "Temps partiel";
  if (combined.includes("full-time") || combined.includes("full time")) return "Temps plein";
  if (combined.includes("cdd") || combined.includes("fixed-term")) return "CDD";
  if (combined.includes("cdi") || combined.includes("permanent")) return "CDI";

  return "Contrat non précisé";
}

function mapGreenhouseJob(job: GreenhouseJob, boardToken: string): ScrapedJob | null {
  const title = job.title?.trim();
  if (!title) return null;

  return {
    title,
    company: slugToCompanyName(boardToken),
    location: job.location?.name?.trim() || "Localisation non précisée",
    contract: detectContract(job),
    source: "Greenhouse",
    jobUrl: job.absolute_url?.trim() || null,
    jobDescription: job.content?.trim() || null,
    score: 80,
    status: "Nouveau",
  };
}

async function fetchBoardJobs(boardToken: string) {
  const params = new URLSearchParams({
    content: "true",
  });

  const { signal, clear } = withTimeoutSignal(QUERY_TIMEOUT_MS);
  try {
    const response = await fetch(
      `${GREENHOUSE_API_BASE}/${encodeURIComponent(boardToken)}/jobs?${params.toString()}`,
      {
        method: "GET",
        headers: { Accept: "application/json" },
        signal,
      },
    );

    if (!response.ok) {
      throw new Error(`${boardToken}: requête refusée (${response.status})`);
    }

    const payload = (await response.json()) as GreenhouseJobsResponse;
    return payload.jobs ?? [];
  } finally {
    clear();
  }
}

export async function scrapeGreenhouseJobs(options: GreenhouseSearchOptions = {}) {
  if (!isConfigured()) {
    return {
      ok: false as const,
      reason: "Configuration Greenhouse absente. Ajoute GREENHOUSE_BOARD_TOKENS.",
      jobs: [] as ScrapedJob[],
    };
  }

  const boardTokens = parseBoardTokens();
  const limit = Math.max(1, Math.min(options.limit ?? 20, 100));
  const errors: string[] = [];
  const jobs: ScrapedJob[] = [];

  for (const boardToken of boardTokens) {
    try {
      const boardJobs = await fetchBoardJobs(boardToken);
      const mapped = boardJobs
        .filter((job) => matchesKeywords(job, options.keywords))
        .map((job) => mapGreenhouseJob(job, boardToken))
        .filter((job): job is ScrapedJob => job !== null);

      jobs.push(...mapped);
    } catch (error) {
      errors.push(error instanceof Error ? error.message : `${boardToken}: erreur inconnue`);
    }
  }

  if (!jobs.length) {
    return {
      ok: false as const,
      reason: errors.length
        ? `Aucune offre Greenhouse récupérée. Détails: ${errors.slice(0, 3).join(" | ")}`
        : "Aucune offre Greenhouse ne correspond aux filtres.",
      jobs: [] as ScrapedJob[],
    };
  }

  return {
    ok: true as const,
    jobs: jobs.slice(0, limit),
    warnings: errors,
  };
}
