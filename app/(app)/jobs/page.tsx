import { DataSourceBanner } from "@/components/app/data-source-banner";
import { EmptyState } from "@/components/app/empty-state";
import { JobsTable } from "@/components/app/jobs-table";
import { PageHeader } from "@/components/app/page-header";
import { RescoreJobsButton } from "@/components/app/rescore-jobs-button";
import { ScrapeJobsControls } from "@/components/app/scrape-jobs-controls";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCandidateProfileSummary, getJobs } from "@/lib/supabase/queries";
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

    if (location) {
      if (!locationMatches(job.location, location)) {
        return false;
      }
    }

    if (contract && contract !== "all") {
      if (!job.contract.toLowerCase().includes(contract)) {
        return false;
      }
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

export default async function JobsPage({ searchParams }: JobsPageProps) {
  const [jobsResult, candidateProfileResult] = await Promise.all([
    getJobs(),
    getCandidateProfileSummary(),
  ]);
  const jobs = jobsResult.data;
  const resolvedSearchParams = (await searchParams) ?? {};
  const filteredJobs = filterDisplayedJobs(jobs, resolvedSearchParams);
  const sortedJobs = [...filteredJobs].sort((a, b) => b.score - a.score);
  const defaultKeywords =
    candidateProfileResult.data.preferredKeywords[0] ||
    candidateProfileResult.data.targetRole ||
    (candidateProfileResult.data.role && candidateProfileResult.data.role !== "Profil candidat"
      ? candidateProfileResult.data.role
      : "emploi");
  const defaultLocation =
    candidateProfileResult.data.location && candidateProfileResult.data.location !== "Non renseigne"
      ? candidateProfileResult.data.location
      : "";

  return (
    <div>
      <PageHeader
        title="Offres d’emploi"
        description="Toutes les offres récupérées par l’agent avec leur score de compatibilité."
        action={
          <ScrapeJobsControls
            defaultKeywords={defaultKeywords}
            defaultLocation={defaultLocation}
          />
        }
      />

      <DataSourceBanner source={jobsResult.source} error={jobsResult.error} />
      <RescoreJobsButton />

      <Card>
        <CardHeader>
        <CardTitle>Pipeline d’offres</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {sortedJobs.length ? (
            <JobsTable jobs={sortedJobs} />
          ) : (
            <div className="p-4">
              <EmptyState
                title="Aucune offre pour ce filtre"
                description="Ajuste la ville/périmètre ou relance un scraping filtré."
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
