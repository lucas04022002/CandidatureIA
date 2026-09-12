import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ApplicationStatusActions } from "@/components/actions/application-status";
import { ApplyOfferAction } from "@/components/actions/apply-offer";
import { CopyTextAction } from "@/components/actions/copy-text";
import { GenerateFollowupAction } from "@/components/actions/generate-followup";
import { Score } from "@/components/score";
import { Stamp } from "@/components/stamp";
import { getSession } from "@/lib/auth/session";
import { formatParisDate } from "@/lib/dates";
import { getApplicationById, getApplicationRow } from "@/lib/db/queries/applications";
import { getJobById } from "@/lib/db/queries/jobs";

export const dynamic = "force-dynamic";

const FOLLOWUP_DELAY_MS = 4 * 24 * 60 * 60 * 1000;

type ApplicationDetailPageProps = {
  params: Promise<{ id: string }>;
};

function publishedLabel(date: Date | null | undefined) {
  const label = formatParisDate(date, { day: "2-digit", month: "2-digit" });
  return label && `publiée le ${label}`;
}

function dayLabel(date: Date | null | undefined) {
  return formatParisDate(date);
}

function TextBlock({
  title,
  text,
  copyLabel,
  emptyLabel,
}: {
  title: string;
  text?: string | null;
  copyLabel: string;
  emptyLabel: string;
}) {
  return (
    <section className="rounded-tile border border-line bg-white px-5 py-4.5">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-[15px] font-bold text-ink">{title}</h2>
        {text ? <CopyTextAction label={copyLabel} text={text} /> : null}
      </div>
      {text ? (
        <p className="whitespace-pre-wrap font-body text-[14px] leading-[1.6] text-ink">{text}</p>
      ) : (
        <p className="font-body text-[14px] text-grey">{emptyLabel}</p>
      )}
    </section>
  );
}

export default async function ApplicationDetailPage({ params }: ApplicationDetailPageProps) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { id } = await params;
  // La ligne brute d'abord : elle porte l'offre visée et les dates. `Application.sentAt` n'est qu'un
  // libellé formaté, impossible d'en déduire la date de relance ; et `jobId` est nécessaire pour
  // aller chercher l'offre.
  const row = await getApplicationRow(session.id, id);
  const [application, job] = await Promise.all([
    getApplicationById(session.id, id),
    row?.jobId ? getJobById(session.id, row.jobId) : Promise.resolve(null),
  ]);

  if (!application) {
    notFound();
  }

  // Ligne mono de la maquette 04 : entreprise · lieu · contrat · source · publiée le JJ/MM. Quand
  // l'offre n'est plus en base (purge, suppression), il reste l'entreprise et la date du dossier.
  const meta = (
    job
      ? [job.company, job.location, job.contract, job.source, publishedLabel(job.createdAt)]
      : [application.company, application.updatedAt]
  )
    .filter(Boolean)
    .join(" · ");
  const sentLabel = dayLabel(row?.sentAt);
  const followupDue =
    row?.followupDueAt ??
    (row?.sentAt ? new Date(row.sentAt.getTime() + FOLLOWUP_DELAY_MS) : null);
  const followupLabel = dayLabel(followupDue);

  return (
    <div className="flex flex-col gap-4">
      <Link
        href="/applications"
        className="font-body text-[13.5px] font-medium text-klein-deep hover:underline"
      >
        ← Toutes mes candidatures
      </Link>

      <header className="grid items-center gap-6 rounded-tile border border-line bg-white px-6 py-5 md:grid-cols-[1fr_auto_auto]">
        <div>
          <h1 className="font-display text-[26px] font-extrabold leading-[1.1] tracking-[-0.03em] text-ink">
            {application.jobTitle}
          </h1>
          <p className="mt-1 font-mono text-[12.5px] text-grey">{meta}</p>
        </div>
        {typeof application.jobScore === "number" ? (
          <Score value={application.jobScore} size="hero" />
        ) : null}
        <Stamp status={application.status} />
      </header>

      <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
        <div className="flex flex-col gap-3">
          <TextBlock
            title="Lettre de motivation"
            text={application.content?.letterText}
            copyLabel="Copier la lettre"
            emptyLabel="La lettre n'est pas encore écrite."
          />
          <TextBlock
            title="E-mail"
            text={application.content?.emailText}
            copyLabel="Copier l'e-mail"
            emptyLabel="L'e-mail n'est pas encore écrit."
          />
          <TextBlock
            title="Message LinkedIn"
            text={application.content?.linkedInText}
            copyLabel="Copier le message"
            emptyLabel="Le message n'est pas encore écrit."
          />
          {application.content?.followupEmailText ? (
            <TextBlock
              title="Relance"
              text={application.content.followupEmailText}
              copyLabel="Copier la relance"
              emptyLabel=""
            />
          ) : null}
        </div>

        <aside className="flex flex-col gap-2.5">
          {application.jobId ? (
            <ApplyOfferAction jobId={application.jobId} jobUrl={application.jobUrl} />
          ) : null}
          <GenerateFollowupAction applicationId={application.id} />
          <ApplicationStatusActions applicationId={application.id} status={application.status} />
          {sentLabel ? (
            <p className="font-body text-[12.5px] leading-[1.5] text-grey">
              Envoyée le {sentLabel}.
              {followupLabel ? ` Sans réponse, la relance sera prête le ${followupLabel}.` : ""}
            </p>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
