import { redirect } from "next/navigation";
import { OrganisationView } from "@/components/organisation-view";
import { getSession } from "@/lib/auth/session";
import { findOrganisationById, listMembers } from "@/lib/db/queries/organisations";

export const dynamic = "force-dynamic";

export default async function OrganismePage() {
  const session = await getSession();
  if (!session) redirect("/login");
  // Page réservée au responsable : un étudiant n'a rien à y voir, et l'admin passe par /admin.
  if (session.role !== "responsable" || !session.organisationId) redirect("/dashboard");

  const [organisation, members] = await Promise.all([
    findOrganisationById(session.organisationId),
    listMembers(session.organisationId),
  ]);
  if (!organisation) redirect("/dashboard");

  // Le rendu vit dans `components/organisation-view.tsx` : la page ne fait que lire la base et
  // passer des données déjà résolues, ce qui rend l'écran testable sans base ni session.
  return (
    <OrganisationView
      name={organisation.name}
      code={organisation.code}
      seats={organisation.seats}
      active={organisation.active}
      createdAt={organisation.createdAt}
      members={members}
    />
  );
}
