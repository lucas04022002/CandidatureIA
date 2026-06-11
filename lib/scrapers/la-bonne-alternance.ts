interface LaBonneAlternanceSearchOptions {
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

interface GeocodedLocation {
  latitude: number;
  longitude: number;
  departmentCode?: string | null;
}

interface LaBonneAlternanceApiJob {
  identifier?: {
    id?: string | null;
    partner_job_id?: string | null;
    partner_label?: string | null;
  };
  workplace?: {
    name?: string | null;
    brand?: string | null;
    legal_name?: string | null;
    description?: string | null;
    website?: string | null;
    location?: {
      address?: string | null;
      geopoint?: {
        coordinates?: [number, number] | number[] | null;
      } | null;
    } | null;
  };
  apply?: {
    url?: string | null;
    phone?: string | null;
    recipient_id?: string | null;
  };
  contract?: {
    type?: string[] | null;
    remote?: "onsite" | "remote" | "hybrid" | null;
  };
  offer?: {
    title?: string | null;
    description?: string | null;
    desired_skills?: string[] | null;
    to_be_acquired_skills?: string[] | null;
    access_conditions?: string[] | null;
  };
}

interface LaBonneAlternanceApiResponse {
  jobs?: LaBonneAlternanceApiJob[];
  recruiters?: unknown[];
  warnings?: Array<{
    code?: string;
    message?: string;
  }>;
}

interface CommuneSearchResponseItem {
  centre?: {
    coordinates?: [number, number] | null;
  };
  codeDepartement?: string;
}

const DEFAULT_API_BASE = "https://api.apprentissage.beta.gouv.fr/api";
const GEO_API_BASE = "https://geo.api.gouv.fr";
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

function normalizeApiBaseUrl(raw: string | undefined) {
  const fallback = DEFAULT_API_BASE;
  if (!raw?.trim()) return fallback;

  let base = raw.trim().replace(/\/+$/, "");
  base = base.replace(/\/job\/v1\/search$/i, "");
  return base;
}

function parseApiKey() {
  return (
    process.env.LBA_API_KEY?.trim() ||
    process.env.APPRENTISSAGE_API_KEY?.trim() ||
    process.env.LA_BONNE_ALTERNANCE_API_KEY?.trim() ||
    ""
  );
}

function isConfigured() {
  return Boolean(parseApiKey());
}

function normalizeQueryTerms(value?: string) {
  const query = value?.trim();
  if (!query) return [];

  return Array.from(
    new Set(
      normalizeText(query)
        .split(/[^a-z0-9]+/)
        .map((term) => term.trim())
        .filter((term) => term.length >= 2),
    ),
  );
}

function matchesKeywords(job: LaBonneAlternanceApiJob, keywords?: string) {
  const terms = normalizeQueryTerms(keywords);
  if (!terms.length) return true;

  const haystack = normalizeText(
    [
      job.offer?.title,
      job.offer?.description,
      ...(job.offer?.desired_skills ?? []),
      ...(job.offer?.to_be_acquired_skills ?? []),
      ...(job.offer?.access_conditions ?? []),
      job.workplace?.name,
      job.workplace?.brand,
      job.workplace?.legal_name,
      job.workplace?.description,
      job.workplace?.location?.address,
    ]
      .filter(Boolean)
      .join(" "),
  );

  return terms.every((term) => haystack.includes(term));
}

function detectContract(job: LaBonneAlternanceApiJob) {
  const types = Array.isArray(job.contract?.type) ? job.contract.type.filter(Boolean) : [];
  const remote = job.contract?.remote;

  if (types.includes("Apprentissage") || types.includes("Professionnalisation")) {
    if (remote === "remote") return "Alternance - Télétravail";
    if (remote === "hybrid") return "Alternance - Hybride";
    return "Alternance";
  }

  if (remote === "remote") return "Télétravail";
  if (remote === "hybrid") return "Hybride";

  return "Alternance";
}

function formatLocation(job: LaBonneAlternanceApiJob) {
  const address = job.workplace?.location?.address?.trim();
  if (address) return address;

  return job.workplace?.name?.trim() || job.workplace?.brand?.trim() || "France";
}

function mapJob(job: LaBonneAlternanceApiJob): ScrapedJob | null {
  const title = job.offer?.title?.trim();
  if (!title) return null;

  const company =
    job.workplace?.brand?.trim() ||
    job.workplace?.name?.trim() ||
    job.workplace?.legal_name?.trim() ||
    "Entreprise non précisée";

  const descriptionParts = [
    job.offer?.description?.trim(),
    job.workplace?.description?.trim(),
    ...(job.offer?.desired_skills ?? []),
    ...(job.offer?.to_be_acquired_skills ?? []),
  ].filter(Boolean);

  return {
    title,
    company,
    location: formatLocation(job),
    contract: detectContract(job),
    source: "La bonne alternance",
    jobUrl: job.apply?.url?.trim() || null,
    jobDescription: descriptionParts.join("\n\n") || null,
    score: 80,
    status: "Nouveau",
  };
}

function parseDepartmentCode(location?: string) {
  if (!location) return null;
  const match = location.match(/\b(\d{2,3})\b/);
  return match?.[1] ?? null;
}

async function geocodeLocation(location: string): Promise<GeocodedLocation | null> {
  const trimmed = location.trim();
  if (!trimmed) return null;

  const departmentCode = parseDepartmentCode(trimmed);
  const params = new URLSearchParams({
    nom: trimmed,
    fields: "centre,codeDepartement",
    boost: "population",
    limit: "1",
  });

  const { signal, clear } = withTimeoutSignal(QUERY_TIMEOUT_MS);
  try {
    const response = await fetch(`${GEO_API_BASE}/communes?${params.toString()}`, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal,
    });

    if (!response.ok) {
      return departmentCode ? { latitude: 0, longitude: 0, departmentCode } : null;
    }

    const payload = (await response.json()) as CommuneSearchResponseItem[];
    const first = Array.isArray(payload) ? payload[0] : null;
    const coordinates = first?.centre?.coordinates;
    if (Array.isArray(coordinates) && coordinates.length >= 2) {
      const [longitude, latitude] = coordinates;
      if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
        return {
          latitude,
          longitude,
          departmentCode: first?.codeDepartement || departmentCode || null,
        };
      }
    }

    return departmentCode ? { latitude: 0, longitude: 0, departmentCode } : null;
  } catch {
    return departmentCode ? { latitude: 0, longitude: 0, departmentCode } : null;
  } finally {
    clear();
  }
}

async function fetchJobSearch(
  baseUrl: string,
  apiKey: string,
  options: LaBonneAlternanceSearchOptions,
) {
  const limit = Math.max(1, Math.min(options.limit ?? 20, 150));
  const radius = Math.max(0, Math.min(options.radiusKm ?? 20, 200));
  const resolvedLocation = options.location ? await geocodeLocation(options.location) : null;

  const params = new URLSearchParams();
  params.set("radius", String(radius));

  if (resolvedLocation) {
    if (resolvedLocation.latitude && resolvedLocation.longitude) {
      params.set("latitude", String(resolvedLocation.latitude));
      params.set("longitude", String(resolvedLocation.longitude));
    } else if (resolvedLocation.departmentCode) {
      params.append("departements", resolvedLocation.departmentCode);
    }
  }

  const endpoint = `${baseUrl}/job/v1/search?${params.toString()}`;
  const headers: Record<string, string> = {
    Accept: "application/json",
    Authorization: `Bearer ${apiKey}`,
  };

  const { signal, clear } = withTimeoutSignal(QUERY_TIMEOUT_MS);
  try {
    const response = await fetch(endpoint, {
      method: "GET",
      headers,
      signal,
    });

    const text = await response.text();
    if (!response.ok) {
      return {
        ok: false as const,
        reason: `API La bonne alternance refusée (${response.status}). Détails: ${text.slice(0, 240)}`,
        jobs: [] as ScrapedJob[],
      };
    }

    const payload = JSON.parse(text) as LaBonneAlternanceApiResponse;
    const jobs = Array.isArray(payload.jobs) ? payload.jobs : [];
    const mappedJobs = jobs
      .filter((job) => matchesKeywords(job, options.keywords))
      .map(mapJob)
      .filter((job): job is ScrapedJob => job !== null)
      .slice(0, limit);

    const warnings =
      payload.warnings?.map((warning) => warning.message?.trim()).filter((value): value is string => Boolean(value)) ?? [];

    return {
      ok: true as const,
      jobs: mappedJobs,
      warnings,
      recruitersCount: Array.isArray(payload.recruiters) ? payload.recruiters.length : 0,
    };
  } catch (error) {
    return {
      ok: false as const,
      reason: error instanceof Error ? `Erreur La bonne alternance: ${error.message}` : "Erreur La bonne alternance inconnue.",
      jobs: [] as ScrapedJob[],
    };
  } finally {
    clear();
  }
}

export async function scrapeLaBonneAlternanceJobs(options: LaBonneAlternanceSearchOptions = {}) {
  if (!isConfigured()) {
    return {
      ok: false as const,
      reason:
        "Configuration La bonne alternance absente. Ajoute LBA_API_KEY (ou APPRENTISSAGE_API_KEY).",
      jobs: [] as ScrapedJob[],
    };
  }

  const apiKey = parseApiKey();
  const apiBase = normalizeApiBaseUrl(process.env.LBA_API_BASE_URL);
  const result = await fetchJobSearch(apiBase, apiKey, options);

  if (!result.ok) {
    return result;
  }

  if (!result.jobs.length) {
    const notes = [...result.warnings];
    if (result.recruitersCount > 0) {
      notes.push(
        `${result.recruitersCount} recruteur(s) potentiel(s) détecté(s) par La bonne alternance mais non importé(s) dans cette version.`,
      );
    }

    return {
      ok: false as const,
      reason: notes.length
        ? `Aucune offre La bonne alternance ne correspond aux filtres. Détails: ${notes.slice(0, 2).join(" | ")}`
        : "Aucune offre La bonne alternance ne correspond aux filtres.",
      jobs: [] as ScrapedJob[],
    };
  }

  const warnings = [...result.warnings];
  if (result.recruitersCount > 0) {
    warnings.push(
      `${result.recruitersCount} recruteur(s) potentiel(s) détecté(s) par La bonne alternance mais non importé(s) dans cette version.`,
    );
  }

  return {
    ok: true as const,
    jobs: result.jobs,
    warnings,
  };
}
