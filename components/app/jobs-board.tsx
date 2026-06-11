"use client";

import { useMemo, useState } from "react";
import { ApplyOfferButton } from "@/components/app/apply-offer-button";
import { ColumnsIcon, ListIcon } from "@/components/app/icons";
import { JobsTable } from "@/components/app/jobs-table";
import { ScoreGauge } from "@/components/app/score-gauge";
import { StatusBadge } from "@/components/app/status-badge";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Job } from "@/lib/types";
import { GenerateApplicationButton } from "./generate-application-button";

interface JobsBoardProps {
  jobs: Job[];
}

type ViewMode = "list" | "kanban";

const STATUS_ORDER: Job["status"][] = ["Nouveau", "À valider", "Brouillon", "Envoyé", "Refusé"];

export function JobsBoard({ jobs }: JobsBoardProps) {
  const [view, setView] = useState<ViewMode>("list");

  const columns = useMemo(
    () =>
      STATUS_ORDER.map((status) => ({
        status,
        jobs: jobs.filter((job) => job.status === status),
      })),
    [jobs],
  );

  return (
    <Card>
      <CardHeader className="flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle>Pipeline d&apos;offres</CardTitle>
          <p className="mt-1 text-sm text-[var(--foreground-dim)]">
            Explore les opportunites par priorite ou par etat d&apos;avancement.
          </p>
        </div>

        <div className="inline-flex rounded-[12px] border border-[var(--border)] bg-[var(--card-soft)] p-1">
          <button
            type="button"
            onClick={() => setView("list")}
            className={`inline-flex items-center gap-2 rounded-[10px] px-3 py-2 text-sm transition ${
              view === "list"
                ? "bg-[var(--card-hi)] text-[var(--foreground)] shadow-[inset_0_0_0_1px_var(--border)]"
                : "text-[var(--foreground-dim)] hover:text-[var(--foreground)]"
            }`}
          >
            <ListIcon size={15} />
            Liste
          </button>
          <button
            type="button"
            onClick={() => setView("kanban")}
            className={`inline-flex items-center gap-2 rounded-[10px] px-3 py-2 text-sm transition ${
              view === "kanban"
                ? "bg-[var(--card-hi)] text-[var(--foreground)] shadow-[inset_0_0_0_1px_var(--border)]"
                : "text-[var(--foreground-dim)] hover:text-[var(--foreground)]"
            }`}
          >
            <ColumnsIcon size={15} />
            Kanban
          </button>
        </div>
      </CardHeader>

      <CardContent className={view === "list" ? "p-0" : "pt-0"}>
        {view === "list" ? (
          <JobsTable jobs={jobs} />
        ) : (
          <div className="grid gap-4 xl:grid-cols-5">
            {columns.map((column) => (
              <div
                key={column.status}
                className="rounded-[20px] border border-[var(--border)] bg-[var(--card-soft)]/50 p-3"
              >
                <div className="mb-3 flex items-center justify-between gap-3">
                  <StatusBadge status={column.status} />
                  <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--foreground-faint)]">
                    {column.jobs.length}
                  </span>
                </div>

                <div className="space-y-3">
                  {column.jobs.length ? (
                    column.jobs.map((job) => (
                      <div
                        key={job.id}
                        className="rounded-[18px] border border-[var(--border)] bg-[var(--card)] p-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-medium leading-5 text-[var(--foreground)]">
                              {job.title}
                            </p>
                            <p className="mt-1 text-xs text-[var(--foreground-faint)]">
                              {job.company}
                            </p>
                          </div>
                          <ScoreGauge value={job.score} size={38} thickness={4.5} />
                        </div>

                        <div className="mt-3 flex flex-wrap gap-2">
                          {job.sourceLabels.slice(0, 2).map((label) => (
                            <Badge key={`${job.id}-${label}`} variant="info">
                              {label}
                            </Badge>
                          ))}
                        </div>

                        <p className="mt-3 text-xs text-[var(--foreground-dim)]">
                          {job.location} · {job.contract}
                        </p>

                        <div className="mt-3 space-y-2">
                          <GenerateApplicationButton jobId={job.id} />
                          <ApplyOfferButton jobId={job.id} jobUrl={job.jobUrl} />
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-[16px] border border-dashed border-[var(--border)] px-3 py-5 text-center text-xs text-[var(--foreground-faint)]">
                      Rien ici pour le moment
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
