import { OfferTile } from "@/components/offer-tile";
import type { Application, Job } from "@/lib/types";

interface OfferListProps {
  jobs: Job[];
  applications?: Application[];
  /** En-tête de liste : « 14 offres · électricien · Lyon + 30 km · relevé de 07:30 ». */
  summary?: string;
}

/** Grille de `OfferTile` : trois colonnes sur écran large, une seule sur mobile. */
export function OfferList({ jobs, applications = [], summary }: OfferListProps) {
  const byJobId = new Map(
    applications.filter((application) => application.jobId).map((application) => [application.jobId as string, application]),
  );

  return (
    <section className="flex flex-col gap-3.5">
      <p className="font-mono text-[12.5px] uppercase tracking-[0.06em] text-grey">
        {summary ?? `${jobs.length} offre${jobs.length > 1 ? "s" : ""}`}
      </p>
      <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2 lg:grid-cols-3">
        {jobs.map((job) => (
          <OfferTile key={job.id} job={job} application={byJobId.get(job.id)} />
        ))}
      </div>
    </section>
  );
}
