import Link from "next/link";
import { notFound } from "next/navigation";
import { CopyTextButton } from "@/components/app/copy-text-button";
import { DataSourceBanner } from "@/components/app/data-source-banner";
import { GenerateFollowupButton } from "@/components/app/generate-followup-button";
import { PageHeader } from "@/components/app/page-header";
import { StatusBadge } from "@/components/app/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getApplicationById } from "@/lib/supabase/queries";

export const dynamic = "force-dynamic";

type ApplicationDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ApplicationDetailPage({ params }: ApplicationDetailPageProps) {
  const { id } = await params;
  const applicationResult = await getApplicationById(id);
  const application = applicationResult.data;

  if (!application) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Brouillon - ${application.company}`}
        description={application.jobTitle}
        action={
          <Link
            href="/applications"
            className="inline-flex items-center justify-center rounded-xl bg-white/10 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/15"
          >
            Retour candidatures
          </Link>
        }
      />

      <DataSourceBanner source={applicationResult.source} error={applicationResult.error} />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>État du dossier</CardTitle>
          <StatusBadge status={application.status} />
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-slate-300">
          <p>Dernière mise à jour: {application.updatedAt}</p>
          {application.sentAt ? <p>Candidature envoyée: {application.sentAt}</p> : null}
          {application.jobUrl ? (
            <a
              href={application.jobUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center justify-center rounded-xl bg-white/10 px-4 py-2 text-xs font-medium text-white transition hover:bg-white/15"
            >
              Ouvrir l&apos;offre source
            </a>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <CardTitle>Relance J+4</CardTitle>
          <GenerateFollowupButton applicationId={application.id} />
        </CardHeader>
        <CardContent>
          {application.content?.followupEmailText ? (
            <div className="space-y-3">
              <CopyTextButton label="Copier relance" text={application.content.followupEmailText} />
              <pre className="whitespace-pre-wrap rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-slate-200">
                {application.content.followupEmailText}
              </pre>
            </div>
          ) : (
            <p className="text-sm text-slate-400">
              Génère la relance pour préparer un message de suivi personnalisé.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <CardTitle>Email de candidature</CardTitle>
          {application.content?.emailText ? (
            <CopyTextButton label="Copier email" text={application.content.emailText} />
          ) : null}
        </CardHeader>
        <CardContent>
          {application.content?.emailText ? (
            <pre className="whitespace-pre-wrap rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-slate-200">
              {application.content.emailText}
            </pre>
          ) : (
            <p className="text-sm text-slate-400">Email non généré.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <CardTitle>Lettre de motivation</CardTitle>
          {application.content?.letterText ? (
            <CopyTextButton label="Copier lettre" text={application.content.letterText} />
          ) : null}
        </CardHeader>
        <CardContent>
          {application.content?.letterText ? (
            <pre className="whitespace-pre-wrap rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-slate-200">
              {application.content.letterText}
            </pre>
          ) : (
            <p className="text-sm text-slate-400">Lettre non générée.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <CardTitle>Message LinkedIn</CardTitle>
          {application.content?.linkedInText ? (
            <CopyTextButton label="Copier message" text={application.content.linkedInText} />
          ) : null}
        </CardHeader>
        <CardContent>
          {application.content?.linkedInText ? (
            <pre className="whitespace-pre-wrap rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-slate-200">
              {application.content.linkedInText}
            </pre>
          ) : (
            <p className="text-sm text-slate-400">Message LinkedIn non généré.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
