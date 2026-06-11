import Link from "next/link";
import { BriefcaseIcon, BoltIcon, FileTextIcon, UserIcon } from "@/components/app/icons";
import { CvUploadCard } from "@/components/app/cv-upload-card";
import { DataSourceBanner } from "@/components/app/data-source-banner";
import { EmptyState } from "@/components/app/empty-state";
import { GenerateApplicationButton } from "@/components/app/generate-application-button";
import { ScoreGauge } from "@/components/app/score-gauge";
import { StatCard } from "@/components/app/stat-card";
import { StatusBadge } from "@/components/app/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import type { Application, CandidateProfileSummary, Job } from "@/lib/types";
import {
  getApplications,
  getCandidateProfileSummary,
  getDashboardStats,
  getJobs,
} from "@/lib/supabase/queries";

export const dynamic = "force-dynamic";

function getFirstName(fullName: string) {
  return fullName.trim().split(/\s+/)[0] ?? "toi";
}

function buildActivity(
  jobs: Job[],
  applications: Application[],
  profile: CandidateProfileSummary,
) {
  const items: Array<{ id: string; text: string; time: string; tone: "info" | "good" }> = [];

  if (applications[0]) {
    items.push({
      id: `app-${applications[0].id}`,
      text: `Candidature ${applications[0].status.toLowerCase()} pour ${applications[0].company}`,
      time: applications[0].updatedAt,
      tone: applications[0].status === "Envoyé" ? "good" : "info",
    });
  }

  if (jobs.length) {
    const topCount = jobs.filter((job) => job.score >= 80).length;
    items.push({
      id: "jobs-priority",
      text: `${topCount} offre(s) prioritaires detectees dans le pipeline`,
      time: "Mise a jour live",
      tone: "info",
    });
  }

  items.push({
    id: "profile",
    text:
      profile.source === "imported"
        ? `Profil CV importe et recale sur ${profile.targetRole || profile.role}`
        : "Profil par defaut actif en attendant un CV importe",
    time: profile.source === "imported" ? "Profil actif" : "A completer",
    tone: profile.source === "imported" ? "good" : "info",
  });

  const sentApplication = applications.find((application) => application.status === "Envoyé");
  if (sentApplication) {
    items.push({
      id: `sent-${sentApplication.id}`,
      text: `Candidature envoyee a ${sentApplication.company}`,
      time: sentApplication.sentAt ?? sentApplication.updatedAt,
      tone: "good",
    });
  }

  return items.slice(0, 4);
}

function getPriorityJobs(jobs: Job[]) {
  return [...jobs].sort((a, b) => b.score - a.score).slice(0, 5);
}

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
  const profile = candidateProfileResult.data;
  const priorityJobs = getPriorityJobs(jobs);
  const activity = buildActivity(jobs, applications, profile);
  const source = jobsResult.source === "supabase" ? "supabase" : applicationsResult.source;
  const error = [jobsResult.error, applicationsResult.error, statsResult.error, candidateProfileResult.error]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-3">
          <p className="label-xs">Workspace</p>
          <div className="space-y-2">
            <h1 className="text-[clamp(2rem,4vw,3rem)] font-semibold tracking-[-0.045em] text-[var(--foreground)]">
              Bonjour {getFirstName(profile.fullName)}.
            </h1>
            <p className="max-w-3xl text-[15px] leading-7 text-[var(--foreground-dim)]">
              Voici l&apos;etat de ton pipeline. ApplyBot centralise les offres, re-score selon
              ton profil actif, puis prepare les candidatures qui meritent vraiment ton attention.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/jobs"
            className="inline-flex items-center justify-center gap-2 rounded-[11px] border border-transparent bg-transparent px-4 py-2 text-sm font-medium text-[var(--foreground-dim)] transition duration-150 hover:bg-[var(--card-soft)] hover:text-[var(--foreground)]"
          >
            <BriefcaseIcon size={16} />
            Voir les offres
          </Link>
          <Link
            href="/applications"
            className="inline-flex items-center justify-center gap-2 rounded-[11px] border border-transparent bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white shadow-[var(--shadow-1),0_8px_20px_-12px_var(--accent)] transition duration-150 hover:bg-[var(--accent-press)]"
          >
            <BoltIcon size={16} />
            Ouvrir le pipeline
          </Link>
        </div>
      </section>

      <DataSourceBanner source={source} error={error || undefined} />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <CvUploadCard
          key={`${profile.id ?? "fallback"}-${profile.targetRole}-${profile.preferredKeywords.join("|")}-${profile.baseLetterTemplate.length}`}
          profile={profile}
        />

        <Card className="overflow-hidden">
          <CardContent className="flex h-full flex-col gap-5">
            <div className="flex items-start gap-4">
              <ScoreGauge value={Math.min(96, 50 + profile.technicalSkills.length * 4)} size={72} thickness={6} />
              <div className="space-y-2">
                <p className="label-xs">Cible active</p>
                <p className="text-lg font-semibold tracking-[-0.02em] text-[var(--foreground)]">
                  {profile.targetRole || profile.role}
                </p>
                <p className="text-sm leading-6 text-[var(--foreground-dim)]">
                  Profil utilise pour la recherche, le scoring et la generation des candidatures.
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-[18px] border border-[var(--border)] bg-[var(--card-soft)]/55 p-4">
                <div className="mb-2 flex items-center gap-2 text-[var(--foreground)]">
                  <UserIcon size={16} />
                  <p className="text-sm font-medium">Profil</p>
                </div>
                <p className="text-sm text-[var(--foreground-dim)]">{profile.location}</p>
                <p className="mt-1 text-sm text-[var(--foreground-dim)]">{profile.email}</p>
              </div>

              <div className="rounded-[18px] border border-[var(--border)] bg-[var(--card-soft)]/55 p-4">
                <div className="mb-2 flex items-center gap-2 text-[var(--foreground)]">
                  <FileTextIcon size={16} />
                  <p className="text-sm font-medium">Recherche</p>
                </div>
                <p className="text-sm text-[var(--foreground-dim)]">
                  {profile.preferredKeywords.length
                    ? `${profile.preferredKeywords.length} mot(s)-cles favoris`
                    : "Mots-cles auto depuis le CV"}
                </p>
                <p className="mt-1 text-sm text-[var(--foreground-dim)]">
                  Source: {profile.source === "imported" ? "CV importe" : "Profil par defaut"}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <p className="label-xs">Mots-cles pilotes</p>
              <div className="flex flex-wrap gap-2">
                {(profile.preferredKeywords.length
                  ? profile.preferredKeywords
                  : profile.technicalSkills.slice(0, 6)
                ).map((keyword) => (
                  <Chip key={keyword}>{keyword}</Chip>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.55fr_0.9fr]">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Offres prioritaires</CardTitle>
              <p className="mt-1 text-sm text-[var(--foreground-dim)]">
                Les meilleures opportunites du moment selon ton profil actif.
              </p>
            </div>
            <Link
              href="/jobs"
              className="inline-flex items-center justify-center rounded-[11px] border border-transparent px-4 py-2 text-sm font-medium text-[var(--foreground-dim)] transition duration-150 hover:bg-[var(--card-soft)] hover:text-[var(--foreground)]"
            >
              Tout voir
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {priorityJobs.length ? (
              <>
                <div className="space-y-3 p-4 md:hidden">
                  {priorityJobs.map((job) => (
                    <div
                      key={job.id}
                      className="rounded-[18px] border border-[var(--border)] bg-[var(--card-soft)]/45 p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium text-[var(--foreground)]">{job.title}</p>
                          <p className="mt-1 text-xs text-[var(--foreground-faint)]">
                            {job.company} · {job.location}
                          </p>
                        </div>
                        <ScoreGauge value={job.score} size={42} thickness={4.5} />
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <StatusBadge status={job.status} />
                        {job.score >= 90 ? (
                          <span className="rounded-full border border-[color:color-mix(in_srgb,var(--good)_35%,transparent)] bg-[var(--good-soft)] px-2.5 py-1 text-[11px] font-medium text-[var(--good)]">
                            Top match
                          </span>
                        ) : null}
                      </div>
                      <div className="mt-4">
                        <GenerateApplicationButton jobId={job.id} />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="hidden overflow-x-auto md:block">
                  <table className="min-w-full text-left text-sm">
                    <thead className="border-b border-[var(--border)] text-[10.5px] uppercase tracking-[0.16em] text-[var(--foreground-faint)]">
                      <tr>
                        <th className="px-4 py-3 font-medium">Poste</th>
                        <th className="px-4 py-3 font-medium">Score IA</th>
                        <th className="px-4 py-3 font-medium">Statut</th>
                        <th className="px-4 py-3 font-medium text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {priorityJobs.map((job) => (
                        <tr
                          key={job.id}
                          className="border-b border-[var(--border)] transition hover:bg-[var(--card-soft)]/55 last:border-none"
                        >
                          <td className="px-4 py-4 align-top">
                            <p className="font-medium text-[var(--foreground)]">{job.title}</p>
                            <p className="mt-1 text-xs text-[var(--foreground-faint)]">
                              {job.company} · {job.location}
                            </p>
                          </td>
                          <td className="px-4 py-4 align-top">
                            <div className="flex items-center gap-3">
                              <ScoreGauge value={job.score} size={42} thickness={4.5} />
                              {job.score >= 90 ? (
                                <span className="rounded-full border border-[color:color-mix(in_srgb,var(--good)_35%,transparent)] bg-[var(--good-soft)] px-2.5 py-1 text-[11px] font-medium text-[var(--good)]">
                                  Top match
                                </span>
                              ) : null}
                            </div>
                          </td>
                          <td className="px-4 py-4 align-top">
                            <StatusBadge status={job.status} />
                          </td>
                          <td className="px-4 py-4 align-top text-right">
                            <div className="flex justify-end">
                              <GenerateApplicationButton jobId={job.id} />
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <div className="p-4">
                <EmptyState
                  title="Aucune offre prioritaire"
                  description="Lance un scraping ou ajuste ta cible pour alimenter le pipeline."
                />
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Activite de l&apos;agent</CardTitle>
              <p className="mt-1 text-sm text-[var(--foreground-dim)]">
                Les derniers signaux utiles remontes par ApplyBot.
              </p>
            </div>
          </CardHeader>
          <CardContent className="pt-1">
            {activity.length ? (
              <div className="space-y-0">
                {activity.map((item, index) => (
                  <div
                    key={item.id}
                    className={`flex gap-3 py-3 ${
                      index < activity.length - 1 ? "border-b border-[var(--border)]" : ""
                    }`}
                  >
                    <span
                      className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{
                        background:
                          item.tone === "good" ? "var(--good)" : "var(--accent)",
                        boxShadow:
                          item.tone === "good"
                            ? "0 0 0 5px var(--good-soft)"
                            : "0 0 0 5px var(--accent-soft)",
                      }}
                    />
                    <div>
                      <p className="text-sm leading-6 text-[var(--foreground)]">{item.text}</p>
                      <p className="mt-1 text-[11px] uppercase tracking-[0.14em] text-[var(--foreground-faint)]">
                        {item.time}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                title="Aucune activite recente"
                description="Les actions du bot apparaitront ici apres les premiers imports et generations."
              />
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
