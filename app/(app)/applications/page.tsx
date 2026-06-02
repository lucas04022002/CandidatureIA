import Link from "next/link";
import { DataSourceBanner } from "@/components/app/data-source-banner";
import { EmptyState } from "@/components/app/empty-state";
import { PageHeader } from "@/components/app/page-header";
import { StatusBadge } from "@/components/app/status-badge";
import { ApplicationStatusActions } from "@/components/app/application-status-actions";
import { Card, CardContent } from "@/components/ui/card";
import { getApplications } from "@/lib/supabase/queries";

export const dynamic = "force-dynamic";

export default async function ApplicationsPage() {
  const applicationsResult = await getApplications();
  const applications = applicationsResult.data;

  return (
    <div>
      <PageHeader
        title="Candidatures générées"
        description="Validation manuelle avant création du brouillon Gmail."
      />

      <DataSourceBanner source={applicationsResult.source} error={applicationsResult.error} />

      {applications.length ? (
        <section className="grid gap-4 md:grid-cols-2">
          {applications.map((application) => (
            <Card key={application.id}>
              <CardContent className="space-y-4 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-semibold text-white">{application.jobTitle}</h2>
                    <p className="text-sm text-slate-300">{application.company}</p>
                  </div>
                  <StatusBadge status={application.status} />
                </div>

                <div className="grid grid-cols-3 gap-2 text-xs">
                  <span className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-slate-200">
                    Lettre: {application.assets.letter ? "OK" : "À faire"}
                  </span>
                  <span className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-slate-200">
                    Email: {application.assets.email ? "OK" : "À faire"}
                  </span>
                  <span className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-slate-200">
                    LinkedIn: {application.assets.linkedIn ? "OK" : "À faire"}
                  </span>
                </div>

                {application.content?.emailText ? (
                  <p className="rounded-lg border border-white/10 bg-white/5 p-2 text-xs text-slate-300">
                    {application.content.emailText.slice(0, 140)}...
                  </p>
                ) : null}

                <div className="flex items-center justify-between">
                  <p className="text-xs text-slate-400">Mis à jour: {application.updatedAt}</p>
                  <Link
                    href={`/applications/${application.id}`}
                    className="inline-flex items-center justify-center rounded-xl bg-white/10 px-4 py-2 text-xs font-medium text-white transition hover:bg-white/15"
                  >
                    Voir brouillon
                  </Link>
                </div>

                <ApplicationStatusActions
                  applicationId={application.id}
                  currentStatus={application.status}
                />

                {application.content?.letterText ? (
                  <details className="rounded-lg border border-white/10 bg-white/5 p-3">
                    <summary className="cursor-pointer text-xs font-medium text-slate-200">
                      Voir la lettre
                    </summary>
                    <pre className="mt-2 whitespace-pre-wrap text-xs text-slate-300">
                      {application.content.letterText}
                    </pre>
                  </details>
                ) : null}

                {application.content?.linkedInText ? (
                  <details className="rounded-lg border border-white/10 bg-white/5 p-3">
                    <summary className="cursor-pointer text-xs font-medium text-slate-200">
                      Voir le message LinkedIn
                    </summary>
                    <pre className="mt-2 whitespace-pre-wrap text-xs text-slate-300">
                      {application.content.linkedInText}
                    </pre>
                  </details>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </section>
      ) : (
        <EmptyState
          title="Aucune candidature en base"
          description="Quand tu généreras des candidatures, elles apparaîtront ici."
        />
      )}
    </div>
  );
}
