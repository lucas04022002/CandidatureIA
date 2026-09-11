import { redirect } from "next/navigation";
import { EmptyState } from "@/components/app/empty-state";
import { OrganisationSeatsForm } from "@/components/app/organisation-seats-form";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getSession } from "@/lib/auth/session";
import { listOrganisations } from "@/lib/db/queries/organisations";

export const dynamic = "force-dynamic";

const dateFormat = new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" });

export default async function AdminPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "admin") redirect("/dashboard");

  const organisations = await listOrganisations();
  const activeCount = organisations.filter((organisation) => organisation.active).length;
  const traineeCount = organisations.reduce((total, organisation) => total + organisation.traineeCount, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Administration"
        description="Activer un organisme et fixer son nombre de places. Un organisme inactif refuse toute inscription de stagiaire."
      />

      {organisations.length ? (
        <Card>
          <CardHeader>
            <CardTitle>Organismes</CardTitle>
            <span className="text-xs text-[var(--foreground-faint)]">
              {organisations.length} organisme(s) · {activeCount} actif(s) · {traineeCount} stagiaire(s)
            </span>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)] text-left text-[11px] uppercase tracking-[0.14em] text-[var(--foreground-faint)]">
                    <th className="px-[18px] py-3 font-medium">Organisme</th>
                    <th className="px-[18px] py-3 font-medium">Responsable</th>
                    <th className="px-[18px] py-3 font-medium">Statut</th>
                    <th className="px-[18px] py-3 font-medium">Places</th>
                    <th className="px-[18px] py-3 font-medium">Stagiaires</th>
                    <th className="px-[18px] py-3 font-medium">Créé le</th>
                    <th className="px-[18px] py-3" />
                  </tr>
                </thead>
                <tbody>
                  {organisations.map((organisation) => (
                    <tr key={organisation.id} className="border-b border-[var(--border)] last:border-0">
                      <td className="px-[18px] py-3">
                        <p className="text-[var(--foreground)]">{organisation.name}</p>
                        <p className="font-mono text-xs text-[var(--foreground-faint)]">{organisation.code}</p>
                      </td>
                      <td className="px-[18px] py-3 text-[var(--foreground-dim)]">
                        {organisation.responsableEmail ?? "Aucun"}
                      </td>
                      <td className="px-[18px] py-3">
                        <span
                          className={
                            organisation.active
                              ? "rounded-full border border-[var(--accent-line)] bg-[var(--accent-soft)] px-2 py-0.5 text-xs text-[var(--accent-text)]"
                              : "rounded-full border border-[var(--border)] px-2 py-0.5 text-xs text-[var(--foreground-faint)]"
                          }
                        >
                          {organisation.active ? "Actif" : "Inactif"}
                        </span>
                      </td>
                      <td className="px-[18px] py-3 font-mono text-[var(--foreground)]">{organisation.seats}</td>
                      <td className="px-[18px] py-3 font-mono text-[var(--foreground)]">
                        {organisation.traineeCount}
                      </td>
                      <td className="px-[18px] py-3 text-[var(--foreground-dim)]">
                        {dateFormat.format(organisation.createdAt)}
                      </td>
                      <td className="px-[18px] py-3">
                        <OrganisationSeatsForm
                          id={organisation.id}
                          active={organisation.active}
                          seats={organisation.seats}
                          hasResponsable={organisation.responsableEmail !== null}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : (
        <EmptyState
          title="Aucun organisme"
          description="Les organismes apparaîtront ici dès qu'un responsable aura créé son espace depuis la page d'inscription."
        />
      )}
    </div>
  );
}
