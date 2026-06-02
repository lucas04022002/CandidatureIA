interface JoobleSearchOptions {
  keywords?: string;
  limit?: number;
  location?: string;
  radiusKm?: number;
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

interface JoobleJob {
  title?: string;
  company?: string;
  location?: string;
  type?: string;
  link?: string;
  snippet?: string;
}

interface JoobleSearchResponse {
  jobs?: JoobleJob[];
}

const JOOBLE_API_BASE = "https://jooble.org/api";
const QUERY_TIMEOUT_MS = 12000;

function withTimeoutSignal(timeoutMs: number) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  return { signal: controller.signal, clear: () => clearTimeout(timeout) };
}

function isConfigured() {
  return Boolean(process.env.JOOBLE_API_KEY);
}

function mapRadiusKmToJooble(radiusKm: number) {
  const allowed = [0, 4, 8, 16, 26, 40, 80];
  const normalized = Math.max(0, Math.min(radiusKm, 80));

  let nearest = allowed[0];
  let minDiff = Math.abs(normalized - nearest);
  for (const value of allowed) {
    const diff = Math.abs(normalized - value);
    if (diff < minDiff) {
      nearest = value;
      minDiff = diff;
    }
  }
  return String(nearest);
}

function mapJoobleJob(job: JoobleJob): ScrapedJob | null {
  const title = job.title?.trim();
  if (!title) return null;

  return {
    title,
    company: job.company?.trim() || "Entreprise non précisée",
    location: job.location?.trim() || "France",
    contract: job.type?.trim() || "Contrat non précisé",
    source: "Jooble",
    jobUrl: job.link?.trim() || null,
    jobDescription: job.snippet?.trim() || null,
    score: 80,
    status: "Nouveau",
  };
}

export async function scrapeJoobleJobs(options: JoobleSearchOptions = {}) {
  if (!isConfigured()) {
    return {
      ok: false as const,
      reason: "Configuration Jooble absente. Ajoute JOOBLE_API_KEY.",
      jobs: [] as ScrapedJob[],
    };
  }

  const apiKey = process.env.JOOBLE_API_KEY?.trim();
  if (!apiKey) {
    return {
      ok: false as const,
      reason: "Clé Jooble invalide.",
      jobs: [] as ScrapedJob[],
    };
  }

  const limit = Math.max(1, Math.min(options.limit ?? 20, 50));
  const radius = mapRadiusKmToJooble(options.radiusKm ?? 20);

  const payload = {
    keywords: options.keywords?.trim() || "emploi",
    location: options.location?.trim() || "France",
    radius,
    page: "1",
    ResultOnPage: String(limit),
    SearchMode: "0",
    companysearch: "false",
  };

  const errors: string[] = [];
  const endpoints = [
    { url: `${JOOBLE_API_BASE}/${apiKey}`, body: payload },
    { url: `${JOOBLE_API_BASE}/`, body: { ...payload, api_key: apiKey } },
  ];

  for (const endpoint of endpoints) {
    const { signal, clear } = withTimeoutSignal(QUERY_TIMEOUT_MS);
    try {
      const response = await fetch(endpoint.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(endpoint.body),
        signal,
      });

      if (!response.ok) {
        const text = await response.text();
        errors.push(`${endpoint.url} -> ${response.status} ${text.slice(0, 180)}`);
        continue;
      }

      const data = (await response.json()) as JoobleSearchResponse;
      const jobs = (data.jobs || [])
        .map(mapJoobleJob)
        .filter((job): job is ScrapedJob => job !== null);

      return { ok: true as const, jobs };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erreur inconnue";
      errors.push(`${endpoint.url} -> ${message}`);
    } finally {
      clear();
    }
  }

  try {
    return {
      ok: false as const,
      reason: `Erreur Jooble. Détails: ${errors.slice(0, 2).join(" | ")}`,
      jobs: [] as ScrapedJob[],
    };
  } catch {
    return {
      ok: false as const,
      reason: "Erreur Jooble inconnue.",
      jobs: [] as ScrapedJob[],
    };
  }
}
