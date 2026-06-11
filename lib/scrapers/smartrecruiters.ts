interface SmartRecruitersSearchOptions {
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

interface SmartRecruitersPosting {
  id?: string;
  name?: string;
  refNumber?: string;
  company?: {
    identifier?: string;
    name?: string;
  };
  location?: {
    city?: string;
    region?: string;
    country?: string;
    fullLocation?: string;
    remote?: boolean;
    hybrid?: boolean;
  };
  typeOfEmployment?: {
    id?: string;
    label?: string;
  };
  customField?: Array<{
    fieldLabel?: string;
    valueLabel?: string;
  }>;
  ref?: string;
}

interface SmartRecruitersPostingDetail extends SmartRecruitersPosting {
  postingUrl?: string;
  applyUrl?: string;
  jobAd?: {
    sections?: Record<
      string,
      {
        title?: string;
        text?: string;
      }
    >;
  };
}

interface SmartRecruitersResponse {
  totalFound?: number;
  content?: SmartRecruitersPosting[];
}

const SMARTRECRUITERS_API_BASE = "https://api.smartrecruiters.com/v1/companies";
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

function parseCompanyTokens() {
  const raw = process.env.SMARTRECRUITERS_COMPANY_TOKENS?.trim();
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

function matchesKeywords(job: SmartRecruitersPosting, keywords?: string) {
  const query = keywords?.trim();
  if (!query) return true;

  const haystack = normalizeText(
    [
      job.name,
      job.location?.fullLocation,
      job.typeOfEmployment?.label,
      ...(job.customField?.flatMap((field) => [field.fieldLabel, field.valueLabel]) ?? []),
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

function matchesLocation(job: SmartRecruitersPosting, location?: string) {
  const query = location?.trim();
  if (!query) return true;

  const haystack = normalizeText(
    [job.location?.city, job.location?.region, job.location?.country, job.location?.fullLocation]
      .filter(Boolean)
      .join(" "),
  );

  const terms = normalizeText(query)
    .split(/\s+/)
    .filter((term) => term.length >= 2);

  if (!terms.length) return true;

  return terms.every((term) => haystack.includes(term));
}

function stripHtml(value: string) {
  return value
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<li>/gi, "- ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&#xa0;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function detectContractLabel(job: SmartRecruitersPosting | SmartRecruitersPostingDetail) {
  const fields = job.customField ?? [];
  const fieldValues = fields.flatMap((field) => [field.fieldLabel, field.valueLabel]).filter(Boolean);
  const combined = normalizeText(
    [job.name, job.typeOfEmployment?.label, ...fieldValues].filter(Boolean).join(" "),
  );

  if (combined.includes("alternance") || combined.includes("apprentice")) return "Alternance";
  if (combined.includes("stage") || combined.includes("intern")) return "Stage";
  if (combined.includes("cdd") || combined.includes("fixed term")) return "CDD";
  if (combined.includes("part time") || combined.includes("part-time")) return "Temps partiel";
  if (combined.includes("full time") || combined.includes("full-time")) return "Temps plein";
  if (combined.includes("freelance") || combined.includes("contractor")) return "Freelance";

  if (job.location?.remote) return "Télétravail";
  if (job.location?.hybrid) return "Hybride";

  return job.typeOfEmployment?.label?.trim() || "Contrat non précisé";
}

function formatLocation(job: SmartRecruitersPosting | SmartRecruitersPostingDetail) {
  if (job.location?.fullLocation?.trim()) return job.location.fullLocation.trim();

  return [job.location?.city, job.location?.region, job.location?.country]
    .filter(Boolean)
    .join(", ")
    .trim() || "Localisation non précisée";
}

function buildDescription(detail: SmartRecruitersPostingDetail) {
  const sections = detail.jobAd?.sections;
  if (!sections) return null;

  const ordered = Object.values(sections)
    .map((section) => {
      const title = section.title?.trim();
      const text = section.text ? stripHtml(section.text) : "";
      if (!title && !text) return null;
      if (!title) return text;
      if (!text) return title;
      return `${title}\n${text}`;
    })
    .filter((value): value is string => Boolean(value));

  return ordered.join("\n\n").trim() || null;
}

function mapJob(
  job: SmartRecruitersPosting,
  detail: SmartRecruitersPostingDetail | null,
  companyToken: string,
): ScrapedJob | null {
  const title = detail?.name?.trim() || job.name?.trim();
  if (!title) return null;

  return {
    title,
    company:
      detail?.company?.name?.trim() ||
      job.company?.name?.trim() ||
      job.company?.identifier?.trim() ||
      companyToken,
    location: formatLocation(detail ?? job),
    contract: detectContractLabel(detail ?? job),
    source: "SmartRecruiters",
    jobUrl: detail?.postingUrl?.trim() || detail?.applyUrl?.trim() || null,
    jobDescription: detail ? buildDescription(detail) : null,
    score: 80,
    status: "Nouveau",
  };
}

async function fetchCompanyJobs(companyToken: string) {
  const params = new URLSearchParams({
    limit: "100",
  });

  const { signal, clear } = withTimeoutSignal(QUERY_TIMEOUT_MS);
  try {
    const response = await fetch(
      `${SMARTRECRUITERS_API_BASE}/${encodeURIComponent(companyToken)}/postings?${params.toString()}`,
      {
        method: "GET",
        headers: { Accept: "application/json" },
        signal,
      },
    );

    if (!response.ok) {
      throw new Error(`${companyToken}: requête refusée (${response.status})`);
    }

    const payload = (await response.json()) as SmartRecruitersResponse;
    return payload.content ?? [];
  } finally {
    clear();
  }
}

async function fetchPostingDetail(companyToken: string, postingId: string) {
  const { signal, clear } = withTimeoutSignal(QUERY_TIMEOUT_MS);
  try {
    const response = await fetch(
      `${SMARTRECRUITERS_API_BASE}/${encodeURIComponent(companyToken)}/postings/${encodeURIComponent(postingId)}`,
      {
        method: "GET",
        headers: { Accept: "application/json" },
        signal,
      },
    );

    if (!response.ok) {
      throw new Error(`${companyToken}/${postingId}: détail refusé (${response.status})`);
    }

    return (await response.json()) as SmartRecruitersPostingDetail;
  } finally {
    clear();
  }
}

export async function scrapeSmartRecruitersJobs(options: SmartRecruitersSearchOptions = {}) {
  if (!isConfigured()) {
    return {
      ok: false as const,
      reason: "Configuration SmartRecruiters absente. Ajoute SMARTRECRUITERS_COMPANY_TOKENS.",
      jobs: [] as ScrapedJob[],
    };
  }

  const companyTokens = parseCompanyTokens();
  const limit = Math.max(1, Math.min(options.limit ?? 20, 100));
  const errors: string[] = [];
  const jobs: ScrapedJob[] = [];

  for (const companyToken of companyTokens) {
    try {
      const postings = await fetchCompanyJobs(companyToken);
      const filtered = postings
        .filter((job) => matchesKeywords(job, options.keywords))
        .filter((job) => matchesLocation(job, options.location))
        .slice(0, limit);

      const detailed = await Promise.all(
        filtered.map(async (job) => {
          if (!job.id) return { job, detail: null as SmartRecruitersPostingDetail | null };
          try {
            const detail = await fetchPostingDetail(companyToken, job.id);
            return { job, detail };
          } catch {
            return { job, detail: null as SmartRecruitersPostingDetail | null };
          }
        }),
      );

      for (const entry of detailed) {
        const mapped = mapJob(entry.job, entry.detail, companyToken);
        if (mapped) {
          jobs.push(mapped);
        }
      }
    } catch (error) {
      errors.push(error instanceof Error ? error.message : `${companyToken}: erreur inconnue`);
    }
  }

  if (!jobs.length) {
    return {
      ok: false as const,
      reason: errors.length
        ? `Aucune offre SmartRecruiters récupérée. Détails: ${errors.slice(0, 3).join(" | ")}`
        : "Aucune offre SmartRecruiters ne correspond aux filtres.",
      jobs: [] as ScrapedJob[],
    };
  }

  return {
    ok: true as const,
    jobs: jobs.slice(0, limit),
    warnings: errors,
  };
}
