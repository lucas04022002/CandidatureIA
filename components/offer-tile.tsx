import Link from "next/link";
import { GenerateApplicationAction } from "@/components/actions/generate-application";
import { Score } from "@/components/score";
import { Stamp, type StampStatus } from "@/components/stamp";
import { cn } from "@/lib/cn";
import type { Application, Job } from "@/lib/types";

interface OfferTileProps {
  job: Job;
  application?: Application;
  className?: string;
}

/**
 * Le tampon d'une candidature envoyée dont la relance est déjà écrite dit « À relancer » : c'est
 * l'action qui reste à faire, pas l'état administratif. Pour tous les autres cas, le tampon reprend
 * l'état tel quel.
 */
function stampStatus(application: Application): StampStatus {
  if (application.status === "Envoyé" && application.content?.followupEmailText) {
    return "À relancer";
  }
  return application.status;
}

/**
 * Tuile d'offre : titre, ligne mono `entreprise · lieu · contrat · source`, pied
 * `Score` + tampon (candidature existante) ou étiquette « Nouveau ».
 *
 * Composant serveur : seule l'action « Préparer ma candidature » est un îlot client.
 */
export function OfferTile({ job, application, className }: OfferTileProps) {
  const meta = [job.company, job.location, job.contract, job.source].filter(Boolean).join(" · ");
  // Une candidature dont l'offre a disparu de la base n'a plus de score : « 0 correspondance »
  // serait un jugement inventé. On n'affiche rien plutôt qu'un chiffre faux.
  const hasScore = application ? application.jobScore !== null && application.jobScore !== undefined : true;

  return (
    <article
      className={cn(
        "flex flex-col gap-1.5 rounded-tile border border-line bg-white p-[18px]",
        className,
      )}
    >
      <h3 className="font-display text-[16px] font-bold leading-[1.25] text-ink">
        {application ? (
          <Link
            href={`/applications/${application.id}`}
            className="text-ink transition duration-150 hover:text-klein-deep"
          >
            {job.title}
          </Link>
        ) : (
          job.title
        )}
      </h3>

      <p className="font-mono text-[12.5px] leading-[1.5] text-grey">{meta}</p>

      <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-2.5">
        {hasScore ? <Score value={job.score} size="tile" /> : <span />}
        {application ? (
          <Stamp status={stampStatus(application)} />
        ) : (
          <span className="rounded-full bg-klein-soft px-3 py-1 font-body text-[12.5px] font-medium text-klein-deep">
            Nouveau
          </span>
        )}
      </div>

      {application ? null : (
        <div className="pt-1.5">
          <GenerateApplicationAction jobId={job.id} />
        </div>
      )}
    </article>
  );
}
