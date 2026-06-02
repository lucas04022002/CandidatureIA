import { NextResponse } from "next/server";
import { getActiveCandidateProfile } from "@/lib/candidate-profile";
import {
  getMaxOpenAIScoresPerRun,
  getScoringMode,
  scoreJob,
} from "@/lib/scoring/job-scoring";
import { scrapeAdzunaJobs } from "@/lib/scrapers/adzuna";
import { scrapeFranceTravailJobs } from "@/lib/scrapers/france-travail";
import { scrapeJoobleJobs } from "@/lib/scrapers/jooble";
import { createSupabaseServerClient } from "@/lib/supabase/server";

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

interface ExistingJobRow {
  id: string;
  source: string;
  source_labels: string[] | null;
  title: string;
  company: string;
  location: string;
  job_url: string | null;
  job_description: string | null;
  status: "Nouveau" | "À valider" | "Brouillon" | "Envoyé" | "Refusé";
  applied_clicked_at: string | null;
}

interface ScrapePayload {
  keywords?: string;
  limit?: number;
  location?: string;
  contract?: string;
  remoteOnly?: boolean;
  radiusKm?: number;
}

function jobFingerprint(job: Pick<ScrapedJob, "title" | "company" | "location">) {
  return `${job.title.trim().toLowerCase()}::${job.company.trim().toLowerCase()}::${job.location
    .trim()
    .toLowerCase()}`;
}

function normalizeFilterValue(value: string | undefined) {
  return value?.trim().toLowerCase() || "";
}

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
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

function filterJobsWithPayload(jobs: ScrapedJob[], payload: ScrapePayload) {
  const locationFilter = normalizeFilterValue(payload.location);
  const contractFilter = normalizeFilterValue(payload.contract);
  const remoteOnly = payload.remoteOnly === true;

  return jobs.filter((job) => {
    if (locationFilter) {
      if (!locationMatches(job.location, locationFilter)) {
        return false;
      }
    }

    if (contractFilter && contractFilter !== "all") {
      const jobContract = job.contract.toLowerCase();
      if (!jobContract.includes(contractFilter)) {
        return false;
      }
    }

    if (remoteOnly) {
      const jobLocation = job.location.toLowerCase();
      const isRemote =
        jobLocation.includes("remote") ||
        jobLocation.includes("télétravail") ||
        jobLocation.includes("teletravail");
      if (!isRemote) {
        return false;
      }
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

export async function POST(request: Request) {
  const payload = (await request.json().catch(() => ({}))) as ScrapePayload;
  const supabase = createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json(
      {
        ok: false,
        error: "Supabase non configuré. Ajoute NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY.",
      },
      { status: 500 },
    );
  }

  const jobsTable = supabase.from("jobs");
  const { data: existingRows, error: existingError } = await jobsTable.select(
    "id,source,source_labels,title,company,location,job_url,job_description,status,applied_clicked_at",
  );

  if (existingError) {
    return NextResponse.json(
      { ok: false, error: `Impossible de lire les jobs existants: ${existingError.message}` },
      { status: 500 },
    );
  }

  const rows = (existingRows ?? []) as unknown as ExistingJobRow[];

  const fingerprintToExisting = new Map<
    string,
    {
      id: string;
      source: string;
      sourceLabels: string[];
      jobUrl: string | null;
      hasDescription: boolean;
    }
  >(
    rows.map((row) => [
      jobFingerprint({
        title: String(row.title),
        company: String(row.company),
        location: String(row.location),
      }),
      {
        id: String(row.id),
        source: row.source,
        sourceLabels: row.source_labels?.length ? row.source_labels : [row.source],
        jobUrl: row.job_url,
        hasDescription: Boolean(row.job_description && row.job_description.trim().length > 0),
      },
    ]),
  );

  const sourceErrors: string[] = [];
  const successfulSources: string[] = [];
  const aggregatedJobs: ScrapedJob[] = [];

  const franceTravailResult = await scrapeFranceTravailJobs({
    keywords: payload.keywords,
    limit: payload.limit,
    location: payload.location,
    contract: payload.contract,
    remoteOnly: payload.remoteOnly,
    radiusKm: payload.radiusKm,
  });

  if (franceTravailResult.ok) {
    aggregatedJobs.push(...franceTravailResult.jobs);
    successfulSources.push("France Travail");
  } else {
    sourceErrors.push(franceTravailResult.reason || "France Travail indisponible.");
  }

  const adzunaResult = await scrapeAdzunaJobs({
    keywords: payload.keywords,
    limit: payload.limit,
    location: payload.location,
  });

  if (adzunaResult.ok) {
    aggregatedJobs.push(...adzunaResult.jobs);
    successfulSources.push("Adzuna");
  } else {
    sourceErrors.push(adzunaResult.reason || "Adzuna indisponible.");
  }

  const joobleResult = await scrapeJoobleJobs({
    keywords: payload.keywords,
    limit: payload.limit,
    location: payload.location,
    radiusKm: payload.radiusKm,
  });

  if (joobleResult.ok) {
    aggregatedJobs.push(...joobleResult.jobs);
    successfulSources.push("Jooble");
  } else {
    sourceErrors.push(joobleResult.reason || "Jooble indisponible.");
  }

  if (!successfulSources.length) {
    return NextResponse.json(
      {
        ok: false,
        error: `Aucune source active. Détails: ${sourceErrors.join(" | ")}`,
      },
      { status: 502 },
    );
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

  const jobsToInsert = scrapedJobs
    .filter((job) => !fingerprintToExisting.has(jobFingerprint(job)))
    .map((job) => ({
      id: crypto.randomUUID(),
      title: job.title,
      company: job.company,
      location: job.location,
      contract: job.contract,
      source: job.source,
      source_labels: [job.source],
      job_url: job.jobUrl,
      job_description: job.jobDescription,
      score: job.score,
      status: job.status,
    }));

  const jobsToBackfill = scrapedJobs
    .map((job) => {
      const fingerprint = jobFingerprint(job);
      const existing = fingerprintToExisting.get(fingerprint);
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
      if (
        !sourceLabelsChanged &&
        !primarySourceChanged &&
        !shouldUpdateUrl &&
        !shouldUpdateDescription
      ) {
        return null;
      }
      return {
        id: existing.id,
        source: preferred.source,
        source_labels: mergedSourceLabels,
        job_url: job.jobUrl ?? existing.jobUrl,
        job_description: shouldUpdateDescription ? job.jobDescription : null,
      };
    })
    .filter(
      (
        value,
      ): value is {
        id: string;
        source: string;
        source_labels: string[];
        job_url: string | null;
        job_description: string | null;
      } =>
        value !== null,
    );

  const refreshableSources = new Set(successfulSources);
  const jobsToRemove = rows
    .filter((row) => {
      const labels = row.source_labels?.length ? row.source_labels : [row.source];
      return labels.some((label) => refreshableSources.has(label));
    })
    .filter((row) => {
      const fingerprint = jobFingerprint({
        title: row.title,
        company: row.company,
        location: row.location,
      });
      const inCurrentResults = scrapedFingerprints.has(fingerprint);
      if (inCurrentResults) return false;

      const hasProgress = row.status !== "Nouveau";
      const wasAppliedClicked = Boolean(row.applied_clicked_at);
      return !hasProgress && !wasAppliedClicked;
    })
    .map((row) => row.id);

  if (!jobsToInsert.length && !jobsToBackfill.length && !jobsToRemove.length) {
    return NextResponse.json({
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

  const scoringMode = getScoringMode();
  const maxOpenAIScores = getMaxOpenAIScoresPerRun(scoringMode);
  const candidateProfile = await getActiveCandidateProfile();

  const scoredJobs = await Promise.all(
    jobsToInsert.map(async (job, index) => {
      const allowOpenAI = index < maxOpenAIScores;

      const scoring = await scoreJob({
        title: job.title,
        company: job.company,
        location: job.location,
        contract: job.contract,
        source: job.source,
        description: job.job_description,
      }, {
        mode: scoringMode,
        allowOpenAI,
        candidateProfile,
      });
      return {
        ...job,
        score: scoring.score,
      };
    }),
  );

  if (scoredJobs.length > 0) {
    const { error: insertError } = await jobsTable.insert(scoredJobs as never);

    if (insertError) {
      return NextResponse.json(
        { ok: false, error: `Échec de l'insertion des offres: ${insertError.message}` },
        { status: 500 },
      );
    }
  }

  let backfilled = 0;
  if (jobsToBackfill.length > 0) {
    const updates = await Promise.all(
      jobsToBackfill.map((job) =>
        jobsTable
          .update(
            {
              job_url: job.job_url || null,
              job_description: job.job_description,
              source: job.source,
              source_labels: job.source_labels,
              updated_at: new Date().toISOString(),
            } as never,
          )
          .eq("id", job.id),
      ),
    );

    const failedUpdate = updates.find((result) => result.error);
    if (failedUpdate?.error) {
      return NextResponse.json(
        { ok: false, error: `Échec de la mise à jour des liens d'offres: ${failedUpdate.error.message}` },
        { status: 500 },
      );
    }
    backfilled = jobsToBackfill.length;
  }

  let removed = 0;
  if (jobsToRemove.length > 0) {
    const { error: removeError } = await jobsTable.delete().in("id", jobsToRemove);
    if (removeError) {
      return NextResponse.json(
        { ok: false, error: `Échec du nettoyage des anciennes offres: ${removeError.message}` },
        { status: 500 },
      );
    }
    removed = jobsToRemove.length;
  }

  return NextResponse.json({
    ok: true,
    inserted: scoredJobs.length,
    backfilled,
    removed,
    skipped: Math.max(0, scrapedJobs.length - scoredJobs.length - backfilled),
    total: scrapedJobs.length,
    sourceMode,
    sourcesUsed: successfulSources,
    sourceErrors,
    scoringMode,
    message:
      scoredJobs.length > 0 || backfilled > 0 || removed > 0
        ? `${scoredJobs.length} offre(s) ajoutée(s), ${backfilled} lien(s) mis à jour, ${removed} offre(s) obsolète(s) retirée(s).`
        : "Aucune nouvelle offre (déjà importées).",
  });
}
