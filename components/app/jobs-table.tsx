import { ApplyOfferButton } from "@/components/app/apply-offer-button";
import { GenerateApplicationButton } from "@/components/app/generate-application-button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/app/status-badge";
import type { Job } from "@/lib/types";

interface JobsTableProps {
  jobs: Job[];
  limit?: number;
}

export function JobsTable({ jobs, limit }: JobsTableProps) {
  const visibleJobs = typeof limit === "number" ? jobs.slice(0, limit) : jobs;

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-left text-sm">
        <thead className="border-b border-white/10 text-xs uppercase tracking-[0.14em] text-slate-400">
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
            <tr key={job.id} className="border-b border-white/5 last:border-none">
              <td className="px-4 py-4">
                <p className="font-medium text-white">{job.title}</p>
                <p className="text-xs text-slate-300">
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
                  <span className="rounded-md bg-indigo-500/20 px-2 py-1 text-xs font-medium text-indigo-200">
                    {job.score}/100
                  </span>
                  {job.score >= 85 ? (
                    <span className="rounded-md bg-emerald-500/15 px-2 py-1 text-[11px] font-medium text-emerald-300">
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
  );
}
