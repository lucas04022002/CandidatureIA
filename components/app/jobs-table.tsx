import { ApplyOfferButton } from "@/components/app/apply-offer-button";
import { GenerateApplicationButton } from "@/components/app/generate-application-button";
import { ScoreGauge } from "@/components/app/score-gauge";
import { StatusBadge } from "@/components/app/status-badge";
import { Badge } from "@/components/ui/badge";
import type { Job } from "@/lib/types";

interface JobsTableProps {
  jobs: Job[];
  limit?: number;
}

export function JobsTable({ jobs, limit }: JobsTableProps) {
  const visibleJobs = typeof limit === "number" ? jobs.slice(0, limit) : jobs;

  return (
    <>
      <div className="space-y-3 p-4 md:hidden">
        {visibleJobs.map((job) => (
          <div
            key={job.id}
            className="rounded-[18px] border border-[var(--border)] bg-[var(--card-soft)]/45 p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-medium text-[var(--foreground)]">{job.title}</p>
                <p className="mt-1 text-xs text-[var(--foreground-dim)]">
                  {job.company} • {job.location} • {job.contract}
                </p>
              </div>
              <ScoreGauge value={job.score} size={42} thickness={5} />
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {job.sourceLabels.map((sourceLabel) => (
                <Badge key={`${job.id}-${sourceLabel}`} variant="info">
                  {sourceLabel}
                </Badge>
              ))}
              <StatusBadge status={job.status} />
            </div>

            <div className="mt-4 flex flex-col gap-2">
              <GenerateApplicationButton jobId={job.id} />
              <ApplyOfferButton jobId={job.id} jobUrl={job.jobUrl} />
            </div>
          </div>
        ))}
      </div>

      <div className="hidden overflow-x-auto md:block">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-[var(--border)] text-[10.5px] uppercase tracking-[0.16em] text-[var(--foreground-faint)]">
            <tr>
              <th className="px-4 py-3 font-medium">Poste</th>
              <th className="px-4 py-3 font-medium">Source</th>
              <th className="px-4 py-3 font-medium">Score IA</th>
              <th className="px-4 py-3 font-medium">Statut</th>
              <th className="px-4 py-3 font-medium">Action</th>
            </tr>
          </thead>
          <tbody>
            {visibleJobs.map((job) => (
              <tr
                key={job.id}
                className="border-b border-[var(--border)] transition hover:bg-[var(--card-soft)]/55 last:border-none"
              >
                <td className="px-4 py-4">
                  <p className="font-medium text-[var(--foreground)]">{job.title}</p>
                  <p className="text-xs text-[var(--foreground-dim)]">
                    {job.company} • {job.location} • {job.contract}
                  </p>
                </td>
                <td className="px-4 py-4">
                  <div className="flex flex-wrap gap-2">
                    {job.sourceLabels.map((sourceLabel) => (
                      <Badge key={`${job.id}-${sourceLabel}`} variant="info">
                        {sourceLabel}
                      </Badge>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-4">
                  <div className="flex items-center gap-2">
                    <ScoreGauge value={job.score} size={42} thickness={5} />
                    {job.score >= 85 ? (
                      <span className="rounded-full border border-[color:color-mix(in_srgb,var(--good)_35%,transparent)] bg-[var(--good-soft)] px-2.5 py-1 text-[11px] font-medium text-[var(--good)]">
                        Prioritaire
                      </span>
                    ) : null}
                  </div>
                </td>
                <td className="px-4 py-4">
                  <StatusBadge status={job.status} />
                </td>
                <td className="px-4 py-4">
                  <div className="flex flex-col items-start gap-2">
                    <GenerateApplicationButton jobId={job.id} />
                    <ApplyOfferButton jobId={job.id} jobUrl={job.jobUrl} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
