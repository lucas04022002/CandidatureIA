import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { OrganisationSeatsAction } from "@/components/actions/organisation-seats";
import { Empty } from "@/components/empty";
import { Kpi } from "@/components/kpi";
import { PageTitle } from "@/components/page-title";
import { Table, type TableColumn } from "@/components/table";
import { getSession } from "@/lib/auth/session";
import { listOrganisations } from "@/lib/db/queries/organisations";

export const dynamic = "force-dynamic";

const dateFormat = new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" });

type OrganisationRow = {
  key: string;
  organisme: ReactNode;
  responsable: string;
  etat: ReactNode;
  stagiaires: string;
  ouvert: string;
  reglages: ReactNode;
};

const COLUMNS: TableColumn<OrganisationRow>[] = [
  { key: "organisme", label: "Organisme" },
  { key: "responsable", label: "Responsable" },
  { key: "etat", label: "État" },
  { key: "stagiaires", label: "Stagiaires" },
  { key: "ouvert", label: "Ouvert le" },
  { key: "reglages", label: "Réglages" },
];

export default async function AdminPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "admin") redirect("/dashboard");

  const organisations = await listOrganisations();
  const activeCount = organisations.filter((organisation) => organisation.active).length;
  const traineeCount = organisations.reduce((total, organisation) => total + organisation.traineeCount, 0);

  const rows: OrganisationRow[] = organisations.map((organisation) => ({
    key: organisation.id,
    organisme: (
      <span className="flex flex-col">
        <span className="font-medium text-ink">{organisation.name}</span>
        <span className="font-mono text-[12px] uppercase tracking-[0.08em] text-grey">
          {organisation.code}
        </span>
      </span>
    ),
    responsable: organisation.responsableEmail ?? "Aucun",
    etat: (
      <span
        className={
          organisation.active
            ? "inline-block rounded-full bg-klein-soft px-2.5 py-0.5 font-mono text-[12px] uppercase tracking-[0.08em] text-klein-deep"
            : "inline-block rounded-full border border-line px-2.5 py-0.5 font-mono text-[12px] uppercase tracking-[0.08em] text-grey"
        }
      >
        {organisation.active ? "Actif" : "Inactif"}
      </span>
    ),
    stagiaires: `${organisation.traineeCount} / ${organisation.seats}`,
    ouvert: dateFormat.format(organisation.createdAt),
    reglages: (
      <OrganisationSeatsAction
        id={organisation.id}
        name={organisation.name}
        active={organisation.active}
        seats={organisation.seats}
      />
    ),
  }));

  return (
    <div className="flex flex-col gap-6">
      <PageTitle
        title="Administration"
        subtitle="Activez un organisme et fixez son nombre de places. Un organisme inactif refuse toute inscription. Le champ e-mail ne sert qu'à rattacher un responsable à un organisme qui n'en a plus : laissé vide, il ne change rien."
      />

      {organisations.length ? (
        <>
          <section className="grid grid-cols-3 gap-4 rounded-tile border border-line bg-white px-6 py-5">
            <Kpi value={organisations.length} label="organismes" />
            <Kpi value={activeCount} label="actifs" />
            <Kpi value={traineeCount} label="stagiaires" />
          </section>

          <div className="overflow-x-auto rounded-tile border border-line bg-white px-2 py-1">
            <Table columns={COLUMNS} rows={rows} getRowKey={(row) => row.key} />
          </div>
        </>
      ) : (
        <Empty text="Aucun organisme pour l'instant. Le premier apparaîtra ici dès qu'un responsable aura créé son espace depuis la page d'inscription." />
      )}
    </div>
  );
}
