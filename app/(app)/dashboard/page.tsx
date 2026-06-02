import { CvUploadCard } from "@/components/app/cv-upload-card";
import { DataSourceBanner } from "@/components/app/data-source-banner";
import { EmptyState } from "@/components/app/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/app/page-header";
import { StatCard } from "@/components/app/stat-card";
import { JobsTable } from "@/components/app/jobs-table";
import { StatusBadge } from "@/components/app/status-badge";
import {
  getApplications,
  getCandidateProfileSummary,
  getDashboardStats,
  getJobs,
} from "@/lib/supabase/queries";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [jobsResult, applicationsResult, statsResult, candidateProfileResult] = await Promise.all([
    getJobs(),
    getApplications(),
    getDashboardStats(),
    getCandidateProfileSummary(),
  ]);

  const jobs = jobsResult.data;
  const applications = applicationsResult.data;
  const stats = statsResult.data;
  const source = jobsResult.source === "supabase" ? "supabase" : applicationsResult.source;
  const error = [jobsResult.error, applicationsResult.error, statsResult.error, candidateProfileResult.error]
    .filter(Boolean)
    .join(" ");

  return (
    <div>
      <PageHeader
        title="Tableau de bord"
        description="Pilote ton workflow: offres, scoring IA, génération et suivi des candidatures."
        action={<Button>Nouvelle recherche</Button>}
      />

      <DataSourceBanner source={source} error={error || undefined} />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </section>

      <section className="mt-6">
        <CvUploadCard
          key={`${candidateProfileResult.data.id ?? "fallback"}-${candidateProfileResult.data.targetRole}-${candidateProfileResult.data.preferredKeywords.join("|")}`}
          profile={candidateProfileResult.data}
        />
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[2fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Offres prioritaires</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {jobs.length ? (
              <JobsTable jobs={jobs} limit={5} />
            ) : (
              <div className="p-4">
                <EmptyState
                  title="Aucune offre pour le moment"
                  description="Lance un scraping pour alimenter ton pipeline."
                />
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Candidatures récentes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {applications.length ? (
              applications.map((application) => (
                <div
                  key={application.id}
                  className="rounded-xl border border-white/10 bg-white/5 p-3"
                >
                  <p className="text-sm font-medium text-white">{application.jobTitle}</p>
                  <p className="text-xs text-slate-300">{application.company}</p>
                  <div className="mt-3 flex items-center justify-between">
                    <StatusBadge status={application.status} />
                    <span className="text-xs text-slate-400">{application.updatedAt}</span>
                  </div>
                </div>
              ))
            ) : (
              <EmptyState
                title="Aucune candidature générée"
                description="Clique sur Générer candidature depuis une offre pour commencer."
              />
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
