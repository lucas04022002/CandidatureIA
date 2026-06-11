import Link from "next/link";
import { DataSourceBanner } from "@/components/app/data-source-banner";
import { FileTextIcon, MapPinIcon, TargetIcon, UserIcon } from "@/components/app/icons";
import { PageHeader } from "@/components/app/page-header";
import { ScoreGauge } from "@/components/app/score-gauge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import {
  getApplications,
  getCandidateProfileSummary,
  getJobs,
} from "@/lib/supabase/queries";
import {
  getActiveCandidateProfile,
  getCandidateSearchKeywords,
  getEffectiveCandidateRole,
} from "@/lib/candidate-profile";

export const dynamic = "force-dynamic";

function computeProfileReadiness(profile: Awaited<ReturnType<typeof getActiveCandidateProfile>>) {
  return Math.min(
    98,
    42 +
      (profile.summary ? 12 : 0) +
      (profile.location && profile.location !== "Non renseigne" ? 8 : 0) +
      (profile.email && profile.email !== "Non renseigne" ? 8 : 0) +
      Math.min(profile.technicalSkills.length * 3, 15) +
      Math.min(profile.softSkills.length * 2, 8) +
      (profile.targetRole ? 5 : 0),
  );
}

export default async function ProfilPage() {
  const [profileSummaryResult, profile, jobsResult, applicationsResult] = await Promise.all([
    getCandidateProfileSummary(),
    getActiveCandidateProfile(),
    getJobs(),
    getApplications(),
  ]);

  const sourceCounts = jobsResult.data.reduce<Record<string, number>>((accumulator, job) => {
    for (const label of job.sourceLabels) {
      accumulator[label] = (accumulator[label] ?? 0) + 1;
    }
    return accumulator;
  }, {});

  const effectiveRole = getEffectiveCandidateRole(profile);
  const searchKeywords = getCandidateSearchKeywords(profile);
  const readiness = computeProfileReadiness(profile);
  const sentCount = applicationsResult.data.filter((application) => application.status === "Envoyé").length;
  const draftCount = applicationsResult.data.filter((application) => application.status === "Brouillon").length;
  const sourceError = [profileSummaryResult.error, jobsResult.error, applicationsResult.error]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Profil candidat"
        description="Pilote le profil actif utilise par ApplyBot pour la recherche, le scoring et la generation."
        action={
          <div className="flex flex-wrap gap-3">
            <Link href="/onboarding" className="inline-flex items-center justify-center rounded-[11px] border border-[var(--border)] bg-[var(--card-soft)] px-4 py-2 text-sm font-medium text-[var(--foreground)] transition hover:bg-[var(--card-hi)]">
              Reprendre l&apos;onboarding
            </Link>
            <Link href="/dashboard" className="inline-flex items-center justify-center rounded-[11px] border border-transparent bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white shadow-[var(--shadow-1),0_8px_20px_-12px_var(--accent)] transition hover:bg-[var(--accent-press)]">
              Retour dashboard
            </Link>
          </div>
        }
      />

      <DataSourceBanner source={profileSummaryResult.source} error={sourceError || undefined} />

      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <Card>
          <CardContent className="space-y-5 p-6">
            <div className="flex flex-wrap items-start gap-5">
              <ScoreGauge value={readiness} size={76} thickness={6} />
              <div className="min-w-[260px] flex-1 space-y-3">
                <div>
                  <p className="label-xs">
                    Profil actif · {profileSummaryResult.data.source === "imported" ? "CV importe" : "profil par defaut"}
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-[var(--foreground)]">
                    {profile.fullName}
                  </h2>
                  <p className="text-sm text-[var(--foreground-dim)]">{profile.role}</p>
                </div>

                <p className="max-w-3xl text-sm leading-7 text-[var(--foreground-dim)]">
                  {profile.summary}
                </p>

                <div className="flex flex-wrap gap-2">
                  <Chip>
                    <TargetIcon size={13} />
                    {effectiveRole}
                  </Chip>
                  <Chip>
                    <MapPinIcon size={13} />
                    {profile.location}
                  </Chip>
                  <Chip>
                    <UserIcon size={13} />
                    {profile.email}
                  </Chip>
                </div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-[18px] border border-[var(--border)] bg-[var(--card-soft)]/55 p-4">
                <p className="text-[11px] uppercase tracking-[0.14em] text-[var(--foreground-faint)]">
                  Offres suivies
                </p>
                <p className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-[var(--foreground)]">
                  {jobsResult.data.length}
                </p>
              </div>
              <div className="rounded-[18px] border border-[var(--border)] bg-[var(--card-soft)]/55 p-4">
                <p className="text-[11px] uppercase tracking-[0.14em] text-[var(--foreground-faint)]">
                  Brouillons
                </p>
                <p className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-[var(--foreground)]">
                  {draftCount}
                </p>
              </div>
              <div className="rounded-[18px] border border-[var(--border)] bg-[var(--card-soft)]/55 p-4">
                <p className="text-[11px] uppercase tracking-[0.14em] text-[var(--foreground-faint)]">
                  Envoyees
                </p>
                <p className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-[var(--foreground)]">
                  {sentCount}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Recherche pilote</CardTitle>
              <p className="mt-1 text-sm text-[var(--foreground-dim)]">
                Les parametres actuellement utilises pour nourrir le pipeline.
              </p>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-[18px] border border-[var(--border)] bg-[var(--card-soft)]/55 p-4">
              <p className="text-[11px] uppercase tracking-[0.14em] text-[var(--foreground-faint)]">
                Metier cible
              </p>
              <p className="mt-2 text-base font-semibold text-[var(--foreground)]">
                {effectiveRole}
              </p>
            </div>
            <div className="rounded-[18px] border border-[var(--border)] bg-[var(--card-soft)]/55 p-4">
              <p className="text-[11px] uppercase tracking-[0.14em] text-[var(--foreground-faint)]">
                Mots-cles favoris
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {searchKeywords.length ? (
                  searchKeywords.map((keyword) => <Chip key={keyword}>{keyword}</Chip>)
                ) : (
                  <p className="text-sm text-[var(--foreground-faint)]">
                    Aucun mot-cle explicite: ApplyBot s&apos;appuie sur le role et le CV.
                  </p>
                )}
              </div>
            </div>
            <div className="rounded-[18px] border border-[var(--border)] bg-[var(--card-soft)]/55 p-4">
              <p className="text-[11px] uppercase tracking-[0.14em] text-[var(--foreground-faint)]">
                Liens & presence
              </p>
              <div className="mt-3 space-y-2 text-sm text-[var(--foreground-dim)]">
                <p>Telephone: {profile.phone || "Non renseigne"}</p>
                <p>GitHub: {profile.github || "Non renseigne"}</p>
                <p>LinkedIn: {profile.linkedin || "Non renseigne"}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Competences & signaux</CardTitle>
              <p className="mt-1 text-sm text-[var(--foreground-dim)]">
                Ce que le moteur utilise pour evaluer les offres.
              </p>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div>
              <p className="mb-3 text-[11px] uppercase tracking-[0.14em] text-[var(--foreground-faint)]">
                Competences techniques
              </p>
              <div className="flex flex-wrap gap-2">
                {profile.technicalSkills.length ? (
                  profile.technicalSkills.map((skill) => <Chip key={skill}>{skill}</Chip>)
                ) : (
                  <p className="text-sm text-[var(--foreground-faint)]">
                    Aucune competence technique structuree detectee.
                  </p>
                )}
              </div>
            </div>

            <div>
              <p className="mb-3 text-[11px] uppercase tracking-[0.14em] text-[var(--foreground-faint)]">
                Soft skills
              </p>
              <div className="flex flex-wrap gap-2">
                {profile.softSkills.length ? (
                  profile.softSkills.map((skill) => <Chip key={skill}>{skill}</Chip>)
                ) : (
                  <p className="text-sm text-[var(--foreground-faint)]">
                    Aucune soft skill explicite detectee.
                  </p>
                )}
              </div>
            </div>

            <div>
              <p className="mb-3 text-[11px] uppercase tracking-[0.14em] text-[var(--foreground-faint)]">
                Highlights d&apos;experience
              </p>
              <div className="space-y-2">
                {profile.experienceHighlights.length ? (
                  profile.experienceHighlights.map((highlight) => (
                    <div
                      key={highlight}
                      className="rounded-[16px] border border-[var(--border)] bg-[var(--card-soft)]/40 p-3 text-sm leading-6 text-[var(--foreground-dim)]"
                    >
                      {highlight}
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-[var(--foreground-faint)]">
                    Aucun highlight d&apos;experience detecte.
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Sources du pipeline</CardTitle>
              <p className="mt-1 text-sm text-[var(--foreground-dim)]">
                Repartition des offres presentes dans la base actuelle.
              </p>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {Object.keys(sourceCounts).length ? (
              Object.entries(sourceCounts)
                .sort(([, a], [, b]) => b - a)
                .map(([label, count]) => (
                  <div
                    key={label}
                    className="flex items-center justify-between rounded-[16px] border border-[var(--border)] bg-[var(--card-soft)]/55 px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent-text)]">
                        <FileTextIcon size={16} />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-[var(--foreground)]">{label}</p>
                        <p className="text-xs text-[var(--foreground-faint)]">
                          Source active dans le pipeline
                        </p>
                      </div>
                    </div>
                    <span className="font-mono text-lg font-semibold text-[var(--foreground)]">
                      {count}
                    </span>
                  </div>
                ))
            ) : (
              <p className="text-sm text-[var(--foreground-faint)]">
                Aucune source n&apos;a encore alimente le pipeline.
              </p>
            )}

            <div className="rounded-[18px] border border-[var(--border)] bg-[var(--card-soft)]/40 p-4">
              <p className="text-sm leading-6 text-[var(--foreground-dim)]">
                Tu peux ajuster le profil actif, reimporter un CV ou recadrer la cible depuis
                l&apos;onboarding pour influencer toute la suite du workflow.
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <Link
                  href="/onboarding"
                  className="inline-flex items-center justify-center rounded-[11px] border border-[var(--border)] bg-[var(--card)] px-4 py-2 text-sm font-medium text-[var(--foreground)] transition hover:bg-[var(--card-hi)]"
                >
                  Modifier le profil
                </Link>
                <Link
                  href="/jobs"
                  className="inline-flex items-center justify-center rounded-[11px] border border-transparent bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[var(--accent-press)]"
                >
                  Explorer les offres
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
