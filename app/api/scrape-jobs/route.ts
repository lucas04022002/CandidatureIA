import { z } from "zod";
import { assertSameOrigin, handle, json, readJson } from "@/lib/http";
import { requireUser } from "@/lib/auth/session";
import { checkSearchQuota } from "@/lib/rate-limit";
import { recordSearchRun } from "@/lib/db/queries/quotas";
import { getActiveCandidateProfile } from "@/lib/candidate-profile";
import { scoreJob } from "@/lib/scoring/job-scoring";
import { SCRAPERS, activeScrapers, scrapeAll, type ScrapedJob } from "@/lib/scrapers/registry";
import { sanitizeJobDescription } from "@/lib/sanitize-text";
import {
  backfillJobs,
  deleteJobs,
  getJobRows,
  insertJobs,
  jobFingerprint,
  type JobBackfill,
  type NewJobInput,
} from "@/lib/db/queries/jobs";

const Body = z.object({
  keywords: z.string().max(200).optional(),
  limit: z.number().int().min(1).max(200).optional(),
  location: z.string().max(200).optional(),
  contract: z.string().max(100).optional(),
  remoteOnly: z.boolean().optional(),
  radiusKm: z.number().int().min(0).max(500).optional(),
});

type ScrapePayload = z.infer<typeof Body>;

function pushUnique(list: string[], value: string | null | undefined) {
  if (!value) return;
  if (!list.includes(value)) {
    list.push(value);
  }
}

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

// Message générique renvoyé au client quand une source tombe pour une raison qui ne lui apprend
// rien d'actionnable. Le détail technique, lui, n'a rien à faire dans une réponse HTTP.
const SOURCE_INDISPONIBLE = "Source indisponible pour le moment.";

/**
 * Traduit l'échec d'un connecteur en un message destiné à l'utilisateur — ou en `null` quand il n'y
 * a rien à dire (connecteur non configuré, zéro résultat après filtrage : ce n'est pas une panne).
 *
 * Le message brut d'un connecteur n'est JAMAIS relayé tel quel. Celui de
 * `lib/scrapers/france-travail.ts` ressemble à `url=… auth=… scope="…" status=401 body={…}` : il
 * porte des URLs d'API internes, le mode d'authentification retenu, les codes HTTP et un extrait de
 * la réponse de l'API tierce — parfois un fragment d'identifiant. C'est précieux pour diagnostiquer,
 * et c'est exactement pour ça que ça reste dans les logs du serveur (`console.error`) au lieu de
 * partir dans le navigateur d'un stagiaire.
 */
function normalizeSourceIssue(reason: string | undefined, source: string) {
  const message = reason?.trim();
  if (!message) {
    return `${source} : ${SOURCE_INDISPONIBLE}`;
  }

  const normalized = normalizeText(message);

  if (normalized.includes("configuration greenhouse absente")) return null;
  if (normalized.includes("configuration lever absente")) return null;
  if (normalized.includes("configuration la bonne alternance absente")) return null;
  if (normalized.includes("aucune offre greenhouse ne correspond aux filtres")) return null;
  if (normalized.includes("aucune offre lever ne correspond aux filtres")) return null;
  if (normalized.includes("aucune offre smartrecruiters ne correspond aux filtres")) return null;
  if (normalized.includes("aucune offre la bonne alternance ne correspond aux filtres")) return null;
  if (normalized.includes("recruteur potentiel") && normalized.includes("non importe")) return null;

  // Panne réelle : le diagnostic part dans les logs, l'utilisateur reçoit une phrase.
  console.error(`[scrape-jobs] source="${source}" échec : ${message}`);

  if (
    source === "La bonne alternance" &&
    (normalized.includes("internal server error") ||
      normalized.includes("server was unable to complete your request") ||
      // `normalizeText` remplace toute ponctuation par une espace : chercher « (500 » ici ne
      // pourrait jamais correspondre.
      normalized.includes("api la bonne alternance refusee 500"))
  ) {
    return "La bonne alternance temporairement indisponible.";
  }
  if (source === "La bonne alternance" && normalized.includes("401")) {
    return "La bonne alternance refuse le jeton d'acces configure.";
  }

  return `${source} : ${SOURCE_INDISPONIBLE}`;
}

const labelByScraperKey = new Map(SCRAPERS.map((scraper) => [scraper.key, scraper.label]));

function normalizeFilterValue(value: string | undefined) {
  return value?.trim().toLowerCase() || "";
}

function locationMatches(jobLocation: string, locationFilter: string) {
  const normalizedLocation = normalizeText(jobLocation);
  const normalizedFilter = normalizeText(locationFilter);
  if (!normalizedFilter) return true;

  return (
    normalizedLocation === normalizedFilter ||
    normalizedLocation.startsWith(`${normalizedFilter} `) ||
    normalizedLocation.endsWith(` ${normalizedFilter}`) ||
    normalizedLocation.includes(` ${normalizedFilter} `)
  );
}

function filterJobsWithPayload(scraped: ScrapedJob[], payload: ScrapePayload) {
  const locationFilter = normalizeFilterValue(payload.location);
  const contractFilter = normalizeFilterValue(payload.contract);
  const remoteOnly = payload.remoteOnly === true;

  return scraped.filter((job) => {
    if (locationFilter && !locationMatches(job.location, locationFilter)) {
      return false;
    }

    if (contractFilter && contractFilter !== "all" && !job.contract.toLowerCase().includes(contractFilter)) {
      return false;
    }

    if (remoteOnly) {
      const jobLocation = job.location.toLowerCase();
      const isRemote =
        jobLocation.includes("remote") ||
        jobLocation.includes("télétravail") ||
        jobLocation.includes("teletravail");
      if (!isRemote) return false;
    }

    return true;
  });
}

function pickBetterDuplicateJob(current: ScrapedJob, incoming: ScrapedJob) {
  const currentHasUrl = Boolean(current.jobUrl);
  const incomingHasUrl = Boolean(incoming.jobUrl);
  if (incomingHasUrl && !currentHasUrl) return incoming;
  if (currentHasUrl && !incomingHasUrl) return current;

  const currentDescLength = current.jobDescription?.length ?? 0;
  const incomingDescLength = incoming.jobDescription?.length ?? 0;
  if (incomingDescLength > currentDescLength) return incoming;

  const priorityBySource: Record<string, number> = {
    Greenhouse: 4,
    Lever: 4,
    SmartRecruiters: 4,
    "La bonne alternance": 4,
    "France Travail": 3,
    Adzuna: 2,
    Jooble: 1,
  };

  const currentPriority = priorityBySource[current.source] ?? 0;
  const incomingPriority = priorityBySource[incoming.source] ?? 0;
  return incomingPriority > currentPriority ? incoming : current;
}

function mergeSourceLabels(current: string[] | null | undefined, incoming: string) {
  const labels = current?.length ? [...current] : [];
  if (!labels.includes(incoming)) {
    labels.push(incoming);
  }
  return labels;
}

export const POST = handle(async (req) => {
  assertSameOrigin(req);
  const user = await requireUser();
  // Sans aucune source configurée (aucune clé dans .env), il n'y a rien à chercher : on le dit tout
  // de suite, sans consommer le quota horaire — sinon, pendant l'installation, chaque essai bloque
  // l'utilisateur une heure pour un résultat vide.
  if (activeScrapers().length === 0) {
    return json(
      { ok: false, error: "Aucune source d'offres configurée. Ajoutez les clés des sources (France Travail, Adzuna, Jooble…) dans le fichier .env, puis relancez le serveur." },
      { status: 503 },
    );
  }

  await checkSearchQuota(user.id);
  const payload = await readJson(req, Body);

  // La recherche est comptabilisée avant l'appel aux connecteurs : une recherche lancée consomme le
  // quota horaire même si toutes les sources échouent.
  await recordSearchRun(user.id);

  const existingRows = await getJobRows(user.id);
  const fingerprintToExisting = new Map(
    existingRows.map((row) => [
      jobFingerprint(row),
      {
        id: row.id,
        source: row.source,
        sourceLabels: row.sourceLabels?.length ? row.sourceLabels : [row.source],
        jobUrl: row.jobUrl,
        hasDescription: Boolean(row.jobDescription && row.jobDescription.trim().length > 0),
      },
    ]),
  );

  const { jobs: aggregatedJobs, sources } = await scrapeAll(payload);
  const sourceErrors: string[] = [];
  const successfulSources: string[] = [];

  for (const outcome of sources) {
    const label = labelByScraperKey.get(outcome.key) ?? outcome.key;
    if (outcome.error) {
      pushUnique(sourceErrors, normalizeSourceIssue(outcome.error, label));
    } else {
      successfulSources.push(label);
    }
  }

  if (!successfulSources.length) {
    const details = sourceErrors.length ? ` Détails: ${sourceErrors.join(" | ")}` : "";
    return json({ ok: false, error: `Aucune source active.${details}` }, { status: 502 });
  }

  const uniqueJobsByFingerprint = new Map<string, ScrapedJob>();
  for (const job of aggregatedJobs) {
    const fingerprint = jobFingerprint(job);
    const current = uniqueJobsByFingerprint.get(fingerprint);
    if (!current) {
      uniqueJobsByFingerprint.set(fingerprint, job);
      continue;
    }
    uniqueJobsByFingerprint.set(fingerprint, pickBetterDuplicateJob(current, job));
  }

  const scrapedJobs = filterJobsWithPayload(Array.from(uniqueJobsByFingerprint.values()), payload);
  const sourceMode = "multi-source-api";
  const scrapedFingerprints = new Set(scrapedJobs.map((job) => jobFingerprint(job)));

  const jobsToInsert: NewJobInput[] = scrapedJobs
    .filter((job) => !fingerprintToExisting.has(jobFingerprint(job)))
    .map((job) => ({
      title: job.title,
      company: job.company,
      location: job.location,
      contract: job.contract,
      source: job.source,
      sourceLabels: [job.source],
      jobUrl: job.jobUrl,
      jobDescription: sanitizeJobDescription(job.jobDescription),
      score: job.score,
      status: job.status,
    }));

  const jobsToBackfill = scrapedJobs
    .map((job): JobBackfill | null => {
      const existing = fingerprintToExisting.get(jobFingerprint(job));
      if (!existing) return null;
      const mergedSourceLabels = mergeSourceLabels(existing.sourceLabels, job.source);
      const sourceLabelsChanged = mergedSourceLabels.length !== existing.sourceLabels.length;
      const preferred = pickBetterDuplicateJob(
        {
          title: job.title,
          company: job.company,
          location: job.location,
          contract: job.contract,
          source: existing.source,
          jobUrl: existing.jobUrl,
          jobDescription: existing.hasDescription ? job.jobDescription : null,
          score: job.score,
          status: "Nouveau",
        },
        job,
      );
      const primarySourceChanged = preferred.source !== existing.source;
      const shouldUpdateUrl = !existing.jobUrl && Boolean(job.jobUrl);
      const shouldUpdateDescription = !existing.hasDescription && Boolean(job.jobDescription);
      if (!sourceLabelsChanged && !primarySourceChanged && !shouldUpdateUrl && !shouldUpdateDescription) {
        return null;
      }
      return {
        id: existing.id,
        source: preferred.source,
        sourceLabels: mergedSourceLabels,
        jobUrl: job.jobUrl ?? existing.jobUrl,
        jobDescription: shouldUpdateDescription ? sanitizeJobDescription(job.jobDescription) : null,
      };
    })
    .filter((value): value is JobBackfill => value !== null);

  // Nettoyage : une offre d'une source interrogée avec succès qui n'apparaît plus dans les résultats
  // est retirée, sauf si l'utilisateur a déjà travaillé dessus (statut avancé ou clic "postuler").
  const refreshableSources = new Set(successfulSources);
  const jobsToRemove = existingRows
    .filter((row) => {
      const labels = row.sourceLabels?.length ? row.sourceLabels : [row.source];
      return labels.some((label) => refreshableSources.has(label));
    })
    .filter((row) => {
      if (scrapedFingerprints.has(jobFingerprint(row))) return false;
      return row.status === "Nouveau" && !row.appliedClickedAt;
    })
    .map((row) => row.id);

  if (!jobsToInsert.length && !jobsToBackfill.length && !jobsToRemove.length) {
    return json({
      ok: true,
      inserted: 0,
      backfilled: 0,
      removed: 0,
      skipped: scrapedJobs.length,
      total: scrapedJobs.length,
      sourceMode,
      message: "Aucune nouvelle offre (déjà importées).",
      sourcesUsed: successfulSources,
      sourceErrors,
    });
  }

  const candidateProfile = await getActiveCandidateProfile(user.id);

  const scoredJobs = jobsToInsert.map((job) => {
    const scoring = scoreJob(
      {
        title: job.title,
        company: job.company,
        location: job.location,
        contract: job.contract,
        source: job.source,
        description: job.jobDescription,
      },
      { candidateProfile },
    );
    return { ...job, score: scoring.score };
  });

  const inserted = await insertJobs(user.id, scoredJobs);
  const backfilled = await backfillJobs(user.id, jobsToBackfill);
  const removed = await deleteJobs(user.id, jobsToRemove);

  return json({
    ok: true,
    inserted: inserted.length,
    backfilled,
    removed,
    skipped: Math.max(0, scrapedJobs.length - inserted.length - backfilled),
    total: scrapedJobs.length,
    sourceMode,
    sourcesUsed: successfulSources,
    sourceErrors,
    message:
      inserted.length > 0 || backfilled > 0 || removed > 0
        ? `${inserted.length} offre(s) ajoutée(s), ${backfilled} lien(s) mis à jour, ${removed} offre(s) obsolète(s) retirée(s).`
        : "Aucune nouvelle offre (déjà importées).",
  });
});
