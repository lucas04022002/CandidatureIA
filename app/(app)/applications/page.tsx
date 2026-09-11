import { ApplicationsBoard } from "@/components/app/applications-board";
import { EmptyState } from "@/components/app/empty-state";
import { PageHeader } from "@/components/app/page-header";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getApplications } from "@/lib/db/queries/applications";

export const dynamic = "force-dynamic";

export default async function ApplicationsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const applications = await getApplications(session.id);
  const readyCount = applications.filter((application) => application.status === "À valider").length;
  const sentCount = applications.filter((application) => application.status === "Envoyé").length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Candidatures générées"
        description="Relis, valide et fais avancer chaque dossier avant l’envoi ou la relance."
      />

      {applications.length ? (
        <>
          <section className="grid gap-4 md:grid-cols-3">
            <div className="rounded-[20px] border border-[var(--border)] bg-[var(--card)] p-4">
              <p className="text-[11px] uppercase tracking-[0.14em] text-[var(--foreground-faint)]">
                Dossiers actifs
              </p>
              <p className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-[var(--foreground)]">
                {applications.length}
              </p>
              <p className="mt-2 text-sm text-[var(--foreground-dim)]">
                Toutes les candidatures gerees dans ton pipeline.
              </p>
            </div>
            <div className="rounded-[20px] border border-[var(--border)] bg-[var(--card)] p-4">
              <p className="text-[11px] uppercase tracking-[0.14em] text-[var(--foreground-faint)]">
                A relire
              </p>
              <p className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-[var(--foreground)]">
                {readyCount}
              </p>
              <p className="mt-2 text-sm text-[var(--foreground-dim)]">
                Dossiers en attente de validation manuelle.
              </p>
            </div>
            <div className="rounded-[20px] border border-[var(--border)] bg-[var(--card)] p-4">
              <p className="text-[11px] uppercase tracking-[0.14em] text-[var(--foreground-faint)]">
                Envoyees
              </p>
              <p className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-[var(--foreground)]">
                {sentCount}
              </p>
              <p className="mt-2 text-sm text-[var(--foreground-dim)]">
                Candidatures deja poussees vers l&apos;exterieur.
              </p>
            </div>
          </section>

          <ApplicationsBoard applications={applications} />
        </>
      ) : (
        <EmptyState
          title="Aucune candidature en base"
          description="Quand tu généreras des candidatures, elles apparaîtront ici."
        />
      )}
    </div>
  );
}
