import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/button";
import { Empty } from "@/components/empty";
import { Kpi } from "@/components/kpi";
import { PageTitle } from "@/components/page-title";
import { getSession } from "@/lib/auth/session";
import { parisDay } from "@/lib/dates";
import { getApplications } from "@/lib/db/queries/applications";
import { getJobRows } from "@/lib/db/queries/jobs";
import { getCandidateProfileSummary } from "@/lib/db/queries/profiles";
import type { Application } from "@/lib/types";

export const dynamic = "force-dynamic";

function firstName(fullName: string) {
  return fullName.trim().split(/\s+/)[0] || "toi";
}

// « Aujourd'hui » au sens du stagiaire, c'est-à-dire à Paris — et non dans le fuseau du serveur,
// qui est UTC en production : une offre relevée après 22:00 UTC porte déjà la date du lendemain à
// Paris, et l'inverse en heure d'été. On compare deux jours civils parisiens, pas deux horloges.
function isToday(date: Date | null, today: string | null) {
  const day = parisDay(date);
  return day !== null && day === today;
}

/**
 * Les trois choses à faire maintenant, dans l'ordre où elles font avancer une candidature :
 * relire ce qui est écrit, marquer ce qui est parti, relancer ce qui reste sans réponse.
 */
function nextActions(applications: Application[]) {
  const steps: Array<{ id: string; label: string; href: string }> = [];

  for (const application of applications) {
    if (application.status === "À valider") {
      steps.push({
        id: application.id,
        label: `Relire ta candidature chez ${application.company}`,
        href: `/applications/${application.id}`,
      });
    }
  }

  for (const application of applications) {
    if (application.status === "Brouillon") {
      steps.push({
        id: application.id,
        label: `Marquer envoyée ta candidature chez ${application.company}`,
        href: `/applications/${application.id}`,
      });
    }
  }

  for (const application of applications) {
    if (application.status === "Envoyé" && !application.content?.followupEmailText) {
      steps.push({
        id: application.id,
        label: `Préparer la relance chez ${application.company}`,
        href: `/applications/${application.id}`,
      });
    }
  }

  return steps.slice(0, 3);
}

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const [jobRows, applications, profile] = await Promise.all([
    getJobRows(session.id),
    getApplications(session.id),
    getCandidateProfileSummary(session.id),
  ]);

  const today = parisDay(new Date());
  const jobsToday = jobRows.filter((row) => isToday(row.createdAt, today)).length;
  const sent = applications.filter((application) => application.sentAt).length;
  const awaiting = applications.filter((application) => application.status === "Envoyé").length;
  const followupsToDo = applications.filter(
    (application) => application.status === "Envoyé" && !application.content?.followupEmailText,
  ).length;

  const steps = nextActions(applications);

  return (
    <div className="flex flex-col gap-6">
      <PageTitle
        title={`Bonjour ${firstName(profile.fullName)}`}
        subtitle="Voilà où tu en es aujourd'hui."
        actions={
          <Button variant="primary" href="/jobs">
            Chercher des offres
          </Button>
        }
      />

      <section className="grid grid-cols-2 gap-4 rounded-tile border border-line bg-white px-6 py-5 lg:grid-cols-4">
        <Kpi value={jobsToday} label="offres du jour" />
        <Kpi value={sent} label="candidatures envoyées" />
        <Kpi value={awaiting} label="réponses attendues" />
        <Kpi value={followupsToDo} label="relances à faire" />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-[22px] font-extrabold leading-none text-ink">
          Prochaines actions
        </h2>
        {steps.length ? (
          <ul className="flex flex-col gap-2">
            {steps.map((step) => (
              <li
                key={`${step.href}-${step.label}`}
                className="rounded-tile border border-line bg-white px-5 py-4"
              >
                <Link
                  href={step.href}
                  className="font-body text-[15px] font-medium text-klein-deep hover:underline"
                >
                  {step.label}
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <Empty
            text="Rien qui attende ton geste. Cherche des offres pour remplir ta journée."
            action={
              <Button variant="primary" href="/jobs">
                Chercher des offres
              </Button>
            }
          />
        )}
      </section>
    </div>
  );
}
