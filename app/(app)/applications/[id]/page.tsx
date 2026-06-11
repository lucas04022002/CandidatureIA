import Link from "next/link";
import { notFound } from "next/navigation";
import { ApplicationStatusActions } from "@/components/app/application-status-actions";
import { CopyTextButton } from "@/components/app/copy-text-button";
import { DataSourceBanner } from "@/components/app/data-source-banner";
import { GenerateFollowupButton } from "@/components/app/generate-followup-button";
import { ScoreGauge } from "@/components/app/score-gauge";
import { StatusBadge } from "@/components/app/status-badge";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getApplicationById } from "@/lib/supabase/queries";

export const dynamic = "force-dynamic";

type ApplicationDetailPageProps = {
  params: Promise<{ id: string }>;
};

function DraftSection({
  title,
  text,
  copyLabel,
  emptyLabel,
  serif = false,
}: {
  title: string;
  text?: string | null;
  copyLabel: string;
  emptyLabel: string;
  serif?: boolean;
}) {
  return (
    <Card>
      <CardHeader className="gap-4">
        <CardTitle>{title}</CardTitle>
        {text ? <CopyTextButton label={copyLabel} text={text} /> : null}
      </CardHeader>
      <CardContent>
        {text ? (
          <div
            className={`rounded-[18px] border border-[var(--border)] bg-[var(--card-soft)]/50 p-4 text-sm leading-7 text-[var(--foreground)] ${
              serif ? "font-serif" : ""
            }`}
          >
            <pre className="whitespace-pre-wrap font-inherit text-inherit">{text}</pre>
          </div>
        ) : (
          <p className="text-sm text-[var(--foreground-faint)]">{emptyLabel}</p>
        )}
      </CardContent>
    </Card>
  );
}

export default async function ApplicationDetailPage({ params }: ApplicationDetailPageProps) {
  const { id } = await params;
  const applicationResult = await getApplicationById(id);
  const application = applicationResult.data;

  if (!application) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-3">
          <Link
            href="/applications"
            className="inline-flex items-center gap-2 text-sm text-[var(--foreground-dim)] transition hover:text-[var(--foreground)]"
          >
            ← Retour aux candidatures
          </Link>
          <div className="space-y-2">
            <p className="label-xs">Brouillon candidature</p>
            <h1 className="text-[clamp(2rem,4vw,2.8rem)] font-semibold tracking-[-0.045em] text-[var(--foreground)]">
              {application.company}
            </h1>
            <p className="text-[15px] leading-7 text-[var(--foreground-dim)]">
              {application.jobTitle}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-[20px] border border-[var(--border)] bg-[var(--card)] px-4 py-3">
          {typeof application.jobScore === "number" ? (
            <ScoreGauge value={application.jobScore} size={54} thickness={5} />
          ) : null}
          <div className="space-y-1">
            <p className="text-[11px] uppercase tracking-[0.14em] text-[var(--foreground-faint)]">
              Etat du dossier
            </p>
            <StatusBadge status={application.status} />
          </div>
        </div>
      </section>

      <DataSourceBanner source={applicationResult.source} error={applicationResult.error} />

      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Pilotage du dossier</CardTitle>
              <p className="mt-1 text-sm text-[var(--foreground-dim)]">
                Fais avancer le statut, ouvre l&apos;offre source ou prepare la relance.
              </p>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-[18px] border border-[var(--border)] bg-[var(--card-soft)]/55 p-4">
                <p className="text-[11px] uppercase tracking-[0.14em] text-[var(--foreground-faint)]">
                  Derniere mise a jour
                </p>
                <p className="mt-2 text-sm text-[var(--foreground)]">{application.updatedAt}</p>
              </div>
              <div className="rounded-[18px] border border-[var(--border)] bg-[var(--card-soft)]/55 p-4">
                <p className="text-[11px] uppercase tracking-[0.14em] text-[var(--foreground-faint)]">
                  Envoi
                </p>
                <p className="mt-2 text-sm text-[var(--foreground)]">
                  {application.sentAt ?? "Pas encore envoyee"}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-[16px] border border-[var(--border)] bg-[var(--card-soft)]/40 p-3 text-center">
                <p className="text-[11px] uppercase tracking-[0.12em] text-[var(--foreground-faint)]">
                  Lettre
                </p>
                <p className="mt-2 text-sm font-medium text-[var(--foreground)]">
                  {application.assets.letter ? "Prete" : "A faire"}
                </p>
              </div>
              <div className="rounded-[16px] border border-[var(--border)] bg-[var(--card-soft)]/40 p-3 text-center">
                <p className="text-[11px] uppercase tracking-[0.12em] text-[var(--foreground-faint)]">
                  Email
                </p>
                <p className="mt-2 text-sm font-medium text-[var(--foreground)]">
                  {application.assets.email ? "Pret" : "A faire"}
                </p>
              </div>
              <div className="rounded-[16px] border border-[var(--border)] bg-[var(--card-soft)]/40 p-3 text-center">
                <p className="text-[11px] uppercase tracking-[0.12em] text-[var(--foreground-faint)]">
                  LinkedIn
                </p>
                <p className="mt-2 text-sm font-medium text-[var(--foreground)]">
                  {application.assets.linkedIn ? "Pret" : "A faire"}
                </p>
              </div>
            </div>

            <div className="rounded-[18px] border border-[var(--border)] bg-[var(--card-soft)]/40 p-4">
              <ApplicationStatusActions
                applicationId={application.id}
                currentStatus={application.status}
              />
            </div>

            {application.jobUrl ? (
              <a
                href={application.jobUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex items-center justify-center rounded-[11px] border border-[var(--border)] bg-[var(--card-soft)] px-4 py-2 text-sm font-medium text-[var(--foreground)] transition hover:bg-[var(--card-hi)]"
              >
                Ouvrir l&apos;offre source
              </a>
            ) : (
              <Badge variant="draft">Lien d&apos;offre indisponible</Badge>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="gap-4">
            <div>
              <CardTitle>Relance J+4</CardTitle>
              <p className="mt-1 text-sm text-[var(--foreground-dim)]">
                Prepare un suivi propre quand la candidature est partie.
              </p>
            </div>
            <GenerateFollowupButton applicationId={application.id} />
          </CardHeader>
          <CardContent>
            {application.content?.followupEmailText ? (
              <div className="space-y-3">
                <CopyTextButton label="Copier relance" text={application.content.followupEmailText} />
                <div className="rounded-[18px] border border-[var(--border)] bg-[var(--card-soft)]/50 p-4 text-sm leading-7 text-[var(--foreground)]">
                  <pre className="whitespace-pre-wrap font-inherit text-inherit">
                    {application.content.followupEmailText}
                  </pre>
                </div>
              </div>
            ) : (
              <p className="text-sm text-[var(--foreground-faint)]">
                Genere la relance pour preparer un message de suivi personnalise.
              </p>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="space-y-6">
        <DraftSection
          title="Email de candidature"
          text={application.content?.emailText}
          copyLabel="Copier email"
          emptyLabel="Email non genere."
        />

        <DraftSection
          title="Lettre de motivation"
          text={application.content?.letterText}
          copyLabel="Copier lettre"
          emptyLabel="Lettre non generee."
          serif
        />

        <DraftSection
          title="Message LinkedIn"
          text={application.content?.linkedInText}
          copyLabel="Copier message"
          emptyLabel="Message LinkedIn non genere."
        />
      </section>
    </div>
  );
}
