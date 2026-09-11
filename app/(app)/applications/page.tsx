import { redirect } from "next/navigation";
import { Button } from "@/components/button";
import { Empty } from "@/components/empty";
import { OfferTile } from "@/components/offer-tile";
import { PageTitle } from "@/components/page-title";
import { getSession } from "@/lib/auth/session";
import { getApplications } from "@/lib/db/queries/applications";
import type { Application, ApplicationStatus, Job } from "@/lib/types";

export const dynamic = "force-dynamic";

/**
 * Ordre de lecture : ce qui attend une relecture d'abord, ce qui est clos ensuite. « Nouveau » ferme
 * la marche — aucune candidature n'est créée dans cet état aujourd'hui, mais le groupe existe pour
 * qu'un dossier ne disparaisse jamais silencieusement de la page.
 */
const GROUPS: ApplicationStatus[] = ["À valider", "Brouillon", "Envoyé", "Refusé", "Nouveau"];

/**
 * Une candidature porte le titre et l'entreprise de son offre, mais pas son lieu, son contrat ni sa
 * source (la jointure ne les remonte pas) : la ligne mono de la tuile se réduit à l'entreprise.
 */
function asJob(application: Application): Job {
  return {
    id: application.jobId ?? application.id,
    title: application.jobTitle,
    company: application.company,
    location: "",
    contract: "",
    source: "",
    sourceLabels: [],
    jobUrl: application.jobUrl,
    jobDescription: null,
    postedAt: application.updatedAt,
    score: application.jobScore ?? 0,
    status: application.status,
  };
}

export default async function ApplicationsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const applications = await getApplications(session.id);

  const groups = GROUPS.map((status) => ({
    status,
    items: applications.filter((application) => application.status === status),
  })).filter((group) => group.items.length > 0);

  return (
    <div className="flex flex-col gap-6">
      <PageTitle
        title="Tes candidatures"
        subtitle="Relis, puis marque envoyée quand c'est parti."
      />

      {groups.length ? (
        groups.map((group) => (
          <section key={group.status} className="flex flex-col gap-3.5">
            <h2 className="font-mono text-[12.5px] uppercase tracking-[0.06em] text-grey">
              {group.status} · {group.items.length}
            </h2>
            <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2 lg:grid-cols-3">
              {group.items.map((application) => (
                <OfferTile
                  key={application.id}
                  job={asJob(application)}
                  application={application}
                />
              ))}
            </div>
          </section>
        ))
      ) : (
        <Empty
          text="Aucune candidature pour l'instant. Choisis une offre et prépare ta candidature."
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
