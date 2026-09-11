import { redirect } from "next/navigation";
import { Empty } from "@/components/empty";
import { OfferList } from "@/components/offer-list";
import { PageTitle } from "@/components/page-title";
import { SearchControls } from "@/components/search-controls";
import { getSession } from "@/lib/auth/session";
import { getApplications } from "@/lib/db/queries/applications";
import { getJobRows, mapJobRow } from "@/lib/db/queries/jobs";
import { getCandidateProfileSummary } from "@/lib/db/queries/profiles";
import type { Job } from "@/lib/types";

export const dynamic = "force-dynamic";

type JobsPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function normalizeParamValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
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

function filterDisplayedJobs(jobs: Job[], params: Record<string, string | string[] | undefined>) {
  const keywords = normalizeParamValue(params.keywords).trim().toLowerCase();
  const location = normalizeParamValue(params.location).trim().toLowerCase();
  const contract = normalizeParamValue(params.contract).trim().toLowerCase();
  const remoteOnly = normalizeParamValue(params.remoteOnly) === "true";
  const keywordTokens = normalizeText(keywords)
    .split(" ")
    .map((token) => token.trim())
    .filter((token) => token.length >= 2);

  return jobs.filter((job) => {
    if (keywordTokens.length) {
      const haystack = normalizeText(
        `${job.title} ${job.company} ${job.location} ${job.contract} ${job.jobDescription || ""}`,
      );
      const matchesKeywords = keywordTokens.every((token) => haystack.includes(token));
      if (!matchesKeywords) {
        return false;
      }
    }

    if (location && !locationMatches(job.location, location)) {
      return false;
    }

    if (contract && contract !== "all" && !job.contract.toLowerCase().includes(contract)) {
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

function hourLabel(date: Date | null) {
  if (!date || Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Europe/Paris",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

export default async function JobsPage({ searchParams }: JobsPageProps) {
  const session = await getSession();
  if (!session) redirect("/login");

  // `getJobRows` plutôt que `getJobs` : la même donnée, plus l'heure exacte du relevé (`createdAt`),
  // que le libellé de `Job.postedAt` a déjà arrondie au jour.
  const [jobRows, applications, candidateProfile] = await Promise.all([
    getJobRows(session.id),
    getApplications(session.id),
    getCandidateProfileSummary(session.id),
  ]);

  const jobs = jobRows.map(mapJobRow);
  const resolvedSearchParams = (await searchParams) ?? {};
  const sortedJobs = [...filterDisplayedJobs(jobs, resolvedSearchParams)].sort(
    (a, b) => b.score - a.score,
  );

  const defaultKeywords =
    candidateProfile.preferredKeywords[0] ||
    candidateProfile.targetRole ||
    (candidateProfile.role && candidateProfile.role !== "Profil candidat"
      ? candidateProfile.role
      : "emploi");
  const defaultLocation =
    candidateProfile.location && candidateProfile.location !== "Non renseigne"
      ? candidateProfile.location
      : "";

  const lastRun = jobRows.reduce<Date | null>((latest, row) => {
    if (!row.createdAt) return latest;
    return !latest || row.createdAt > latest ? row.createdAt : latest;
  }, null);
  const lastRunLabel = hourLabel(lastRun);

  const shownKeywords = normalizeParamValue(resolvedSearchParams.keywords).trim() || defaultKeywords;
  const shownLocation = normalizeParamValue(resolvedSearchParams.location).trim() || defaultLocation;
  const shownRadius = normalizeParamValue(resolvedSearchParams.radiusKm).trim();

  const summary = [
    `${sortedJobs.length} offre${sortedJobs.length > 1 ? "s" : ""}`,
    shownKeywords || null,
    shownLocation ? (shownRadius ? `${shownLocation} + ${shownRadius} km` : shownLocation) : null,
    lastRunLabel ? `relevé de ${lastRunLabel}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="flex flex-col gap-6">
      <PageTitle title="Offres pour toi" subtitle="Classées selon ton profil, la plus proche en haut." />

      <SearchControls defaultKeywords={defaultKeywords} defaultLocation={defaultLocation} />

      {sortedJobs.length ? (
        <OfferList jobs={sortedJobs} applications={applications} summary={summary} />
      ) : (
        <Empty text="Aucune offre pour l'instant. Lance une recherche." />
      )}
    </div>
  );
}
