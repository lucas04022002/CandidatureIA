interface FranceTravailSearchOptions {
  keywords?: string;
  limit?: number;
  location?: string;
  contract?: string;
  remoteOnly?: boolean;
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

interface FranceTravailApiJob {
  id?: string;
  intitule?: string;
  typeContrat?: string;
  typeContratLibelle?: string;
  lieuTravail?: {
    libelle?: string;
    commune?: string;
    latitude?: number | string;
    longitude?: number | string;
  };
  entreprise?: {
    nom?: string;
  };
  origineOffre?: {
    urlOrigine?: string;
  };
  contact?: {
    urlPostulation?: string;
  };
  description?: string;
}

interface FranceTravailTokenResponse {
  access_token?: string;
  token_type?: string;
}

interface FranceTravailOffersResponse {
  resultats?: FranceTravailApiJob[];
  results?: FranceTravailApiJob[];
  offres?: FranceTravailApiJob[];
}

const DEFAULT_TOKEN_URL =
  "https://entreprise.francetravail.fr/connexion/oauth2/access_token?realm=/partenaire";
const ALTERNATE_TOKEN_URL = "https://entreprise.francetravail.fr/connexion/oauth2/access_token";
const DEFAULT_API_BASE_URL = "https://api.francetravail.io/partenaire/offresdemploi/v2";
const QUERY_TIMEOUT_MS = 12000;

function normalizeApiBaseUrl(raw: string) {
  let base = raw.trim().replace(/\/+$/, "");
  base = base.replace(/\/offres\/search$/i, "");
  base = base.replace(/\/offres$/i, "");
  return base;
}

function withTimeoutSignal(timeoutMs: number) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  return { signal: controller.signal, clear: () => clearTimeout(timeout) };
}

function isConfigured() {
  return Boolean(process.env.FRANCE_TRAVAIL_CLIENT_ID && process.env.FRANCE_TRAVAIL_CLIENT_SECRET);
}

function normalizeEnvValue(value: string | undefined) {
  if (!value) return "";
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

function mapFranceTravailJob(job: FranceTravailApiJob): ScrapedJob | null {
  const title = job.intitule?.trim();
  if (!title) {
    return null;
  }

  return {
    title,
    company: job.entreprise?.nom?.trim() || "Entreprise non précisée",
    location: job.lieuTravail?.libelle?.trim() || job.lieuTravail?.commune?.trim() || "France",
    contract: job.typeContratLibelle?.trim() || job.typeContrat?.trim() || "Contrat non précisé",
    source: "France Travail",
    jobUrl: job.origineOffre?.urlOrigine?.trim() || job.contact?.urlPostulation?.trim() || null,
    jobDescription: job.description?.trim() || null,
    score: 80,
    status: "Nouveau",
  };
}

interface MappedJob {
  job: ScrapedJob;
  latitude: number | null;
  longitude: number | null;
}

function parseCoordinate(value: number | string | undefined) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.replace(",", "."));
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function mapFranceTravailJobWithCoordinates(job: FranceTravailApiJob): MappedJob | null {
  const mapped = mapFranceTravailJob(job);
  if (!mapped) return null;

  return {
    job: mapped,
    latitude: parseCoordinate(job.lieuTravail?.latitude),
    longitude: parseCoordinate(job.lieuTravail?.longitude),
  };
}

async function getAccessToken() {
  const clientId = normalizeEnvValue(process.env.FRANCE_TRAVAIL_CLIENT_ID);
  const clientSecret = normalizeEnvValue(process.env.FRANCE_TRAVAIL_CLIENT_SECRET);

  if (!clientId || !clientSecret) {
    throw new Error("FRANCE_TRAVAIL_CLIENT_ID / FRANCE_TRAVAIL_CLIENT_SECRET manquants.");
  }

  const configuredTokenUrl = process.env.FRANCE_TRAVAIL_TOKEN_URL;
  const tokenUrls = Array.from(
    new Set([configuredTokenUrl, DEFAULT_TOKEN_URL, ALTERNATE_TOKEN_URL].filter(Boolean)),
  ) as string[];

  const scopeEnv = process.env.FRANCE_TRAVAIL_SCOPE?.trim();
  const scopes = Array.from(
    new Set(
      [
        scopeEnv,
        "api_offresdemploiv2 o2dsoffre",
        "api_offresdemploiv2",
        "o2dsoffre",
        "",
      ].filter((value): value is string => typeof value === "string"),
    ),
  );

  const errors: string[] = [];

  for (const tokenUrl of tokenUrls) {
    for (const scope of scopes) {
      for (const authMode of ["body", "basic"] as const) {
        const body = new URLSearchParams({
          grant_type: "client_credentials",
        });

        if (authMode === "body") {
          body.set("client_id", clientId);
          body.set("client_secret", clientSecret);
        }

        if (scope) {
          body.set("scope", scope);
        }

        const headers: Record<string, string> = {
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "application/json",
        };

        if (authMode === "basic") {
          headers.Authorization = `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString(
            "base64",
          )}`;
        }

        const { signal, clear } = withTimeoutSignal(QUERY_TIMEOUT_MS);
        try {
          const response = await fetch(tokenUrl, {
            method: "POST",
            headers,
            body,
            signal,
          });

          const text = await response.text();

          if (!response.ok) {
            errors.push(
              `url=${tokenUrl} auth=${authMode} scope="${scope || "(none)"}" status=${response.status} body=${text.slice(0, 240)}`,
            );
            continue;
          }

          const payload = JSON.parse(text) as FranceTravailTokenResponse;
          if (!payload.access_token) {
            errors.push(
              `url=${tokenUrl} auth=${authMode} scope="${scope || "(none)"}" status=${response.status} body=access_token absent`,
            );
            continue;
          }

          return payload.access_token;
        } catch (error) {
          const message = error instanceof Error ? error.message : "Erreur inconnue";
          errors.push(
            `url=${tokenUrl} auth=${authMode} scope="${scope || "(none)"}" error=${message}`,
          );
        } finally {
          clear();
        }
      }
    }
  }

  throw new Error(`Token OAuth refusé. Détails: ${errors.slice(0, 4).join(" | ")}`);
}

async function queryOffersEndpoint(
  accessToken: string,
  endpoint: string,
  options: FranceTravailSearchOptions,
) {
  const keywords = options.keywords?.trim() || "emploi";
  const locationQuery = options.location?.trim();
  const limit = Math.max(1, Math.min(options.limit ?? 20, 50));
  const fullQuery = locationQuery ? `${keywords} ${locationQuery}` : keywords;
  const params = new URLSearchParams({
    motsCles: fullQuery,
    range: `0-${limit - 1}`,
  });

  const { signal, clear } = withTimeoutSignal(QUERY_TIMEOUT_MS);
  try {
    const response = await fetch(`${endpoint}?${params.toString()}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
      signal,
    });

    if (!response.ok) {
      throw new Error(`Recherche refusée (${response.status}).`);
    }

    return (await response.json()) as FranceTravailOffersResponse | FranceTravailApiJob[];
  } finally {
    clear();
  }
}

interface Coordinates {
  latitude: number;
  longitude: number;
}

function toRadians(degrees: number) {
  return (degrees * Math.PI) / 180;
}

function computeDistanceKm(a: Coordinates, b: Coordinates) {
  const earthRadiusKm = 6371;
  const dLat = toRadians(b.latitude - a.latitude);
  const dLon = toRadians(b.longitude - a.longitude);
  const lat1 = toRadians(a.latitude);
  const lat2 = toRadians(b.latitude);

  const haversine =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;

  return 2 * earthRadiusKm * Math.asin(Math.sqrt(haversine));
}

async function geocodeCityCenter(location: string): Promise<Coordinates | null> {
  const query = location.trim();
  if (!query) return null;

  const params = new URLSearchParams({
    q: query,
    limit: "1",
    type: "municipality",
    autocomplete: "0",
  });

  const { signal, clear } = withTimeoutSignal(QUERY_TIMEOUT_MS);
  try {
    const response = await fetch(`https://api-adresse.data.gouv.fr/search/?${params.toString()}`, {
      signal,
    });
    if (!response.ok) return null;

    const payload = (await response.json()) as {
      features?: Array<{ geometry?: { coordinates?: [number, number] } }>;
    };
    const coordinates = payload.features?.[0]?.geometry?.coordinates;
    if (!coordinates || coordinates.length < 2) return null;

    return { longitude: coordinates[0], latitude: coordinates[1] };
  } catch {
    return null;
  } finally {
    clear();
  }
}

async function applyLocalFilters(jobs: MappedJob[], options: FranceTravailSearchOptions) {
  const contractFilter = options.contract?.trim().toLowerCase() || "";
  const locationFilter = options.location?.trim().toLowerCase() || "";
  const radiusKm = Math.max(0, Math.min(options.radiusKm ?? 20, 100));
  const remoteOnly = options.remoteOnly === true;
  const cityCenter = locationFilter ? await geocodeCityCenter(locationFilter) : null;

  return jobs.filter((job) => {
    const currentJob = job.job;

    if (locationFilter) {
      const jobLocation = currentJob.location.toLowerCase();
      const cityTextMatch =
        jobLocation === locationFilter ||
        jobLocation.startsWith(`${locationFilter} `) ||
        jobLocation.includes(` ${locationFilter} `) ||
        jobLocation.includes(`${locationFilter} (`) ||
        jobLocation.includes(`, ${locationFilter}`);

      if (cityCenter && job.latitude !== null && job.longitude !== null) {
        const distanceKm = computeDistanceKm(cityCenter, {
          latitude: job.latitude,
          longitude: job.longitude,
        });
        if (distanceKm > radiusKm) return false;
      } else if (!cityTextMatch) {
        return false;
      }
    }

    if (contractFilter && contractFilter !== "all") {
      if (!currentJob.contract.toLowerCase().includes(contractFilter)) {
        return false;
      }
    }

    if (remoteOnly) {
      const location = currentJob.location.toLowerCase();
      const isRemote =
        location.includes("remote") ||
        location.includes("télétravail") ||
        location.includes("teletravail");
      if (!isRemote) return false;
    }

    return true;
  });
}

export async function scrapeFranceTravailJobs(options: FranceTravailSearchOptions = {}) {
  if (!isConfigured()) {
    return {
      ok: false as const,
      reason:
        "Configuration France Travail absente. Ajoute FRANCE_TRAVAIL_CLIENT_ID et FRANCE_TRAVAIL_CLIENT_SECRET.",
      jobs: [] as ScrapedJob[],
    };
  }

  try {
    const accessToken = await getAccessToken();
    const configuredBase = process.env.FRANCE_TRAVAIL_API_BASE_URL || DEFAULT_API_BASE_URL;
    const baseUrl = normalizeApiBaseUrl(configuredBase);
    const candidateEndpoints = Array.from(new Set([`${baseUrl}/offres/search`, `${baseUrl}/offres`]));

    let rawPayload: FranceTravailOffersResponse | FranceTravailApiJob[] | null = null;
    const endpointErrors: string[] = [];

    for (const endpoint of candidateEndpoints) {
      try {
        rawPayload = await queryOffersEndpoint(accessToken, endpoint, options);
        break;
      } catch (error) {
        endpointErrors.push(
          `${endpoint} -> ${error instanceof Error ? error.message : "Erreur inconnue"}`,
        );
      }
    }

    if (!rawPayload) {
      throw new Error(
        `Aucun endpoint France Travail disponible. Détails: ${endpointErrors.join(" | ")}`,
      );
    }

    const rawJobs = Array.isArray(rawPayload)
      ? rawPayload
      : rawPayload.resultats || rawPayload.results || rawPayload.offres || [];

    const jobs = rawJobs
      .map(mapFranceTravailJobWithCoordinates)
      .filter((job): job is MappedJob => job !== null);

    const filteredJobs = await applyLocalFilters(jobs, options);
    return { ok: true as const, jobs: filteredJobs.map((item) => item.job) };
  } catch (error) {
    return {
      ok: false as const,
      reason: error instanceof Error ? error.message : "Erreur France Travail inconnue.",
      jobs: [] as ScrapedJob[],
    };
  }
}
