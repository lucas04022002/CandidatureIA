import { redirect } from "next/navigation";
import { EmptyState } from "@/components/app/empty-state";
import { PageHeader } from "@/components/app/page-header";
import { RegenerateCodeButton } from "@/components/app/regenerate-code-button";
import { RemoveMemberButton } from "@/components/app/remove-member-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getSession } from "@/lib/auth/session";
import { findOrganisationById, listMembers } from "@/lib/db/queries/organisations";

export const dynamic = "force-dynamic";

const dateFormat = new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" });
const dateTimeFormat = new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" });

export default async function OrganismePage() {
  const session = await getSession();
  if (!session) redirect("/login");
  // Page réservée au responsable : un stagiaire n'a rien à y voir, et l'admin passe par /admin.
  if (session.role !== "responsable" || !session.organisationId) redirect("/dashboard");

  const [organisation, members] = await Promise.all([
    findOrganisationById(session.organisationId),
    listMembers(session.organisationId),
  ]);
  if (!organisation) redirect("/dashboard");

  const used = members.length;
  const remaining = Math.max(organisation.seats - used, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mon organisme"
        description="Le code d'inscription de vos stagiaires, vos places et la liste des comptes ouverts. Leurs CV, offres et candidatures restent privés."
      />

      {organisation.active ? null : (
        <div className="rounded-[14px] border border-[var(--accent-line)] bg-[var(--accent-soft)] px-4 py-3 text-sm text-[var(--accent-text)]">
          Organisme en attente d&apos;activation : les inscriptions de stagiaires sont refusées tant
          qu&apos;il n&apos;est pas activé.
        </div>
      )}

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle>{organisation.name}</CardTitle>
            <span className="text-xs text-[var(--foreground-faint)]">
              Créé le {dateFormat.format(organisation.createdAt)}
            </span>
          </CardHeader>
          <CardContent className="space-y-5">
            <div>
              <p className="label-xs">Code d&apos;inscription</p>
              <p className="mt-2 font-mono text-[40px] font-semibold tracking-[0.18em] text-[var(--foreground)]">
                {organisation.code}
              </p>
              <p className="mt-2 text-sm text-[var(--foreground-dim)]">
                Vos stagiaires saisissent ce code à la création de leur compte.
              </p>
            </div>
            <RegenerateCodeButton />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Places</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="font-mono text-[40px] font-semibold tracking-[-0.03em] text-[var(--foreground)]">
              {used} / {organisation.seats}
            </p>
            <div className="h-2 overflow-hidden rounded-full bg-[var(--card-soft)]">
              <div
                className="h-full rounded-full bg-[linear-gradient(90deg,var(--accent),var(--good))]"
                style={{ width: `${organisation.seats ? Math.min(100, (used / organisation.seats) * 100) : 0}%` }}
              />
            </div>
            <p className="text-sm text-[var(--foreground-dim)]">
              {remaining > 0
                ? `${remaining} place(s) disponible(s). Retirer un stagiaire en libère une.`
                : "Plus aucune place disponible : les nouvelles inscriptions sont refusées."}
            </p>
          </CardContent>
        </Card>
      </section>

      {members.length ? (
        <Card>
          <CardHeader>
            <CardTitle>Stagiaires</CardTitle>
            <span className="text-xs text-[var(--foreground-faint)]">{members.length} compte(s)</span>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)] text-left text-[11px] uppercase tracking-[0.14em] text-[var(--foreground-faint)]">
                    <th className="px-[18px] py-3 font-medium">E-mail</th>
                    <th className="px-[18px] py-3 font-medium">Inscrit le</th>
                    <th className="px-[18px] py-3 font-medium">Dernière connexion</th>
                    <th className="px-[18px] py-3" />
                  </tr>
                </thead>
                <tbody>
                  {members.map((member) => (
                    <tr key={member.id} className="border-b border-[var(--border)] last:border-0">
                      <td className="px-[18px] py-3 text-[var(--foreground)]">{member.email}</td>
                      <td className="px-[18px] py-3 text-[var(--foreground-dim)]">
                        {dateFormat.format(member.createdAt)}
                      </td>
                      <td className="px-[18px] py-3 text-[var(--foreground-dim)]">
                        {member.lastLoginAt ? dateTimeFormat.format(member.lastLoginAt) : "Jamais"}
                      </td>
                      <td className="px-[18px] py-3 text-right">
                        <RemoveMemberButton userId={member.id} email={member.email} />
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
          title="Aucun stagiaire inscrit"
          description="Communiquez le code d'inscription à vos stagiaires : leur compte apparaîtra ici dès leur première connexion."
        />
      )}
    </div>
  );
}
