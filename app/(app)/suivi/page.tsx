import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { Button } from "@/components/button";
import { Empty } from "@/components/empty";
import { PageTitle } from "@/components/page-title";
import { Stamp } from "@/components/stamp";
import { Table, type TableColumn } from "@/components/table";
import { getSession } from "@/lib/auth/session";
import { getApplications } from "@/lib/db/queries/applications";
import type { Application } from "@/lib/types";

export const dynamic = "force-dynamic";

type SuiviRow = {
  key: string;
  date: string;
  offre: ReactNode;
  etat: ReactNode;
  action: string;
};

/** Ce qu'il reste à faire, dit avec le verbe du bouton correspondant. */
function nextAction(application: Application) {
  switch (application.status) {
    case "Refusé":
      return "Rien à faire";
    case "Envoyé":
      return application.content?.followupEmailText ? "Relancer" : "Préparer la relance";
    case "Brouillon":
      return "Marquer envoyée";
    default:
      return "Relire et postuler";
  }
}

const COLUMNS: TableColumn<SuiviRow>[] = [
  { key: "date", label: "Date" },
  { key: "offre", label: "Offre" },
  { key: "etat", label: "État" },
  { key: "action", label: "Prochaine action" },
];

export default async function SuiviPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const applications = await getApplications(session.id);

  const rows: SuiviRow[] = applications.map((application) => ({
    key: application.id,
    date: application.sentAt ?? application.updatedAt,
    offre: (
      <Link
        href={`/applications/${application.id}`}
        className="font-medium text-klein-deep hover:underline"
      >
        {application.jobTitle} · {application.company}
      </Link>
    ),
    etat: (
      <Stamp
        status={
          application.status === "Envoyé" && application.content?.followupEmailText
            ? "À relancer"
            : application.status
        }
      />
    ),
    action: nextAction(application),
  }));

  return (
    <div className="flex flex-col gap-6">
      <PageTitle title="Ton suivi" subtitle="Où en est chaque candidature, et ce qui vient après." />

      {rows.length ? (
        <div className="overflow-x-auto rounded-tile border border-line bg-white px-2 py-1">
          <Table columns={COLUMNS} rows={rows} getRowKey={(row) => row.key} />
        </div>
      ) : (
        <Empty
          text="Rien à suivre pour l'instant. Prépare une candidature, elle apparaîtra ici."
          action={
            <Button variant="primary" href="/jobs">
              Chercher des offres
            </Button>
          }
        />
      )}
    </div>
  );
}
