import Link from "next/link";
import { DataSourceBanner } from "@/components/app/data-source-banner";
import { EmptyState } from "@/components/app/empty-state";
import { GenerateFollowupButton } from "@/components/app/generate-followup-button";
import { PageHeader } from "@/components/app/page-header";
import { ScoreGauge } from "@/components/app/score-gauge";
import { StatusBadge } from "@/components/app/status-badge";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getApplications } from "@/lib/supabase/queries";
import type { Application } from "@/lib/types";

export const dynamic = "force-dynamic";

type FollowupStage = "envoyee" | "relance" | "refus";

function deriveStage(application: Application): FollowupStage {
  if (application.status === "Refusé") return "refus";
  if (application.content?.followupEmailText) return "relance";
  return "envoyee";
}

function stageMeta(stage: FollowupStage) {
  switch (stage) {
    case "relance":
      return {
        label: "À relancer",
        badge: "warning" as const,
        nextAction: "Relancer par email",
      };
    case "refus":
      return {
        label: "Refus",
        badge: "danger" as const,
        nextAction: "Archiver le dossier",
      };
    default:
      return {
        label: "Envoyée",
        badge: "info" as const,
        nextAction: "Attendre ou préparer une relance",
      };
  }
}

function buildTrackingApplications(applications: Application[]) {
  return applications.filter(
    (application) =>
      application.status === "Envoyé" ||
      application.status === "Refusé" ||
      Boolean(application.sentAt) ||
      Boolean(application.content?.followupEmailText),
  );
}

export default async function SuiviPage() {
  const applicationsResult = await getApplications();
  const applications = applicationsResult.data;
  const trackedApplications = buildTrackingApplications(applications);

  const generatedCount = applications.length;
  const sentCount = applications.filter((application) => application.status === "Envoyé").length;
  const followupReadyCount = applications.filter((application) => application.content?.followupEmailText).length;
  const refusedCount = applications.filter((application) => application.status === "Refusé").length;
  const activeTrackedCount = trackedApplications.filter(
    (application) => deriveStage(application) !== "refus",
  ).length;

  const funnel = [
    { label: "Générées", value: generatedCount },
    { label: "Envoyées", value: sentCount },
    { label: "À relancer", value: followupReadyCount },
    { label: "Actives", value: activeTrackedCount },
    { label: "Refus", value: refusedCount },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Suivi candidatures"
        description="Pilote les dossiers déjà partis, les relances prêtes et les prochaines actions à mener."
      />

      <DataSourceBanner source={applicationsResult.source} error={applicationsResult.error} />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {funnel.map((item, index) => (
          <Card key={item.label}>
            <CardContent className="relative overflow-hidden p-4">
              <div
                className="absolute bottom-0 left-0 h-1 rounded-r-full bg-[linear-gradient(90deg,var(--accent),var(--good))]"
                style={{ width: `${Math.max(18, Math.min(100, (item.value / Math.max(generatedCount || 1, 1)) * 100))}%` }}
              />
              <p className="text-[11px] uppercase tracking-[0.14em] text-[var(--foreground-faint)]">
                {item.label}
              </p>
              <p className="mt-2 font-mono text-[30px] font-semibold tracking-[-0.03em] text-[var(--foreground)]">
                {item.value}
              </p>
              <p className="mt-2 text-xs text-[var(--foreground-dim)]">
                {index === 0 ? "Base pipeline" : "Mise à jour live"}
              </p>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Pipeline de suivi</CardTitle>
              <p className="mt-1 text-sm text-[var(--foreground-dim)]">
                Les candidatures pour lesquelles il y a encore une action utile à faire.
              </p>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {trackedApplications.length ? (
              trackedApplications.map((application) => {
                const stage = deriveStage(application);
                const meta = stageMeta(stage);

                return (
                  <div
                    key={application.id}
                    className="rounded-[20px] border border-[var(--border)] bg-[var(--card-soft)]/45 p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="flex min-w-[260px] flex-1 items-start gap-3">
                        {typeof application.jobScore === "number" ? (
                          <ScoreGauge value={application.jobScore} size={48} thickness={5} />
                        ) : null}
                        <div>
                          <p className="text-[15px] font-semibold tracking-[-0.015em] text-[var(--foreground)]">
                            {application.jobTitle}
                          </p>
                          <p className="mt-1 text-sm text-[var(--foreground-dim)]">
                            {application.company}
                          </p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <StatusBadge status={application.status} />
                            <Badge variant={meta.badge}>{meta.label}</Badge>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col items-start gap-2 text-left">
                        <p className="text-[11px] uppercase tracking-[0.14em] text-[var(--foreground-faint)]">
                          Prochaine action
                        </p>
                        <p className="text-sm text-[var(--foreground)]">{meta.nextAction}</p>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3 md:grid-cols-3">
                      <div className="rounded-[16px] border border-[var(--border)] bg-[var(--card)] px-3 py-3">
                        <p className="text-[11px] uppercase tracking-[0.12em] text-[var(--foreground-faint)]">
                          Dernière activité
                        </p>
                        <p className="mt-2 text-sm text-[var(--foreground)]">{application.updatedAt}</p>
                      </div>
                      <div className="rounded-[16px] border border-[var(--border)] bg-[var(--card)] px-3 py-3">
                        <p className="text-[11px] uppercase tracking-[0.12em] text-[var(--foreground-faint)]">
                          Envoi initial
                        </p>
                        <p className="mt-2 text-sm text-[var(--foreground)]">
                          {application.sentAt ?? "Non renseigné"}
                        </p>
                      </div>
                      <div className="rounded-[16px] border border-[var(--border)] bg-[var(--card)] px-3 py-3">
                        <p className="text-[11px] uppercase tracking-[0.12em] text-[var(--foreground-faint)]">
                          Relance
                        </p>
                        <p className="mt-2 text-sm text-[var(--foreground)]">
                          {application.content?.followupEmailText ? "Prête à copier" : "Pas encore générée"}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-3">
                      <Link
                        href={`/applications/${application.id}`}
                        className="inline-flex items-center justify-center rounded-[11px] border border-[var(--border)] bg-[var(--card)] px-4 py-2 text-sm font-medium text-[var(--foreground)] transition hover:bg-[var(--card-hi)]"
                      >
                        Ouvrir le dossier
                      </Link>
                      {stage !== "refus" ? (
                        <GenerateFollowupButton applicationId={application.id} />
                      ) : null}
                    </div>
                  </div>
                );
              })
            ) : (
              <EmptyState
                title="Aucun dossier à suivre"
                description="Les candidatures envoyées et les relances apparaîtront ici dès que ton pipeline avancera."
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Vue rapide</CardTitle>
              <p className="mt-1 text-sm text-[var(--foreground-dim)]">
                Ce qui mérite ton attention en priorité.
              </p>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-[18px] border border-[var(--border)] bg-[var(--card-soft)]/55 p-4">
              <p className="text-[11px] uppercase tracking-[0.14em] text-[var(--foreground-faint)]">
                Relances prêtes
              </p>
              <p className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-[var(--foreground)]">
                {followupReadyCount}
              </p>
              <p className="mt-2 text-sm text-[var(--foreground-dim)]">
                Messages déjà générés et prêts à être copiés.
              </p>
            </div>

            <div className="rounded-[18px] border border-[var(--border)] bg-[var(--card-soft)]/55 p-4">
              <p className="text-[11px] uppercase tracking-[0.14em] text-[var(--foreground-faint)]">
                Dossiers actifs
              </p>
              <p className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-[var(--foreground)]">
                {activeTrackedCount}
              </p>
              <p className="mt-2 text-sm text-[var(--foreground-dim)]">
                Candidatures envoyées qui restent encore ouvertes.
              </p>
            </div>

            <div className="rounded-[18px] border border-[var(--border)] bg-[var(--card-soft)]/40 p-4">
              <p className="text-sm leading-6 text-[var(--foreground-dim)]">
                Bonne routine: génère la relance quand une candidature passe en <b className="text-[var(--foreground)]">Envoyé</b>, puis reviens ici pour piloter les prochains contacts.
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <Link
                  href="/applications"
                  className="inline-flex items-center justify-center rounded-[11px] border border-[var(--border)] bg-[var(--card)] px-4 py-2 text-sm font-medium text-[var(--foreground)] transition hover:bg-[var(--card-hi)]"
                >
                  Voir les candidatures
                </Link>
                <Link
                  href="/jobs"
                  className="inline-flex items-center justify-center rounded-[11px] border border-transparent bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[var(--accent-press)]"
                >
                  Trouver d&apos;autres offres
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
