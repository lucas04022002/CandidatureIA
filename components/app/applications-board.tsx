"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ApplicationStatusActions } from "@/components/app/application-status-actions";
import { CopyTextButton } from "@/components/app/copy-text-button";
import { ScoreGauge } from "@/components/app/score-gauge";
import { StatusBadge } from "@/components/app/status-badge";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { Application, ApplicationStatus } from "@/lib/types";

interface ApplicationsBoardProps {
  applications: Application[];
}

const FILTERS: Array<{ label: string; value: ApplicationStatus | "all" }> = [
  { label: "Toutes", value: "all" },
  { label: "À valider", value: "À valider" },
  { label: "Brouillons", value: "Brouillon" },
  { label: "Envoyées", value: "Envoyé" },
];

function getAssetItems(application: Application) {
  return [
    { label: "Lettre", ready: application.assets.letter },
    { label: "Email", ready: application.assets.email },
    { label: "LinkedIn", ready: application.assets.linkedIn },
  ];
}

export function ApplicationsBoard({ applications }: ApplicationsBoardProps) {
  const [filter, setFilter] = useState<ApplicationStatus | "all">("all");

  const filteredApplications = useMemo(() => {
    if (filter === "all") return applications;
    return applications.filter((application) => application.status === filter);
  }, [applications, filter]);

  return (
    <div className="space-y-5">
      <div className="inline-flex flex-wrap gap-2 rounded-[14px] border border-[var(--border)] bg-[var(--card-soft)] p-1">
        {FILTERS.map((item) => {
          const count =
            item.value === "all"
              ? applications.length
              : applications.filter((application) => application.status === item.value).length;
          const isActive = filter === item.value;

          return (
            <button
              key={item.value}
              type="button"
              onClick={() => setFilter(item.value)}
              className={`inline-flex items-center gap-2 rounded-[10px] px-3 py-2 text-sm transition ${
                isActive
                  ? "bg-[var(--card-hi)] text-[var(--foreground)] shadow-[inset_0_0_0_1px_var(--border)]"
                  : "text-[var(--foreground-dim)] hover:text-[var(--foreground)]"
              }`}
            >
              <span>{item.label}</span>
              <span className="rounded-full border border-[var(--border)] px-2 py-0.5 text-[11px] text-[var(--foreground-faint)]">
                {count}
              </span>
            </button>
          );
        })}
      </div>

      <section className="grid gap-4 xl:grid-cols-2">
        {filteredApplications.map((application) => (
          <Card
            key={application.id}
            className="transition duration-150 hover:border-[var(--border-strong)] hover:-translate-y-0.5"
          >
            <CardContent className="space-y-4 p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex min-w-0 items-center gap-3">
                  {application.jobScore ? (
                    <ScoreGauge
                      value={application.jobScore}
                      size={48}
                      thickness={5}
                    />
                  ) : null}
                  <div className="min-w-0">
                    <h2 className="truncate text-[15px] font-semibold tracking-[-0.015em] text-[var(--foreground)]">
                      {application.jobTitle}
                    </h2>
                    <p className="mt-1 text-sm text-[var(--foreground-dim)]">{application.company}</p>
                  </div>
                </div>
                <StatusBadge status={application.status} />
              </div>

              <div className="grid grid-cols-3 gap-2">
                {getAssetItems(application).map((asset) => (
                  <div
                    key={`${application.id}-${asset.label}`}
                    className="flex items-center justify-center gap-2 rounded-[12px] border border-[var(--border)] bg-[var(--card-soft)]/55 px-3 py-2 text-xs text-[var(--foreground-dim)]"
                  >
                    <span
                      className={`h-2 w-2 rounded-full ${
                        asset.ready ? "bg-[var(--good)]" : "bg-[var(--foreground-faint)]"
                      }`}
                    />
                    {asset.label}
                  </div>
                ))}
              </div>

              {application.content?.emailText ? (
                <div className="rounded-[16px] border border-[var(--border)] bg-[var(--card-soft)]/55 p-4">
                  <p className="mb-2 text-[11px] uppercase tracking-[0.14em] text-[var(--foreground-faint)]">
                    Extrait email
                  </p>
                  <p className="text-sm leading-6 text-[var(--foreground-dim)]">
                    {application.content.emailText
                      .replace(/\n+/g, " ")
                      .replace(/\s+/g, " ")
                      .trim()
                      .slice(0, 180)}
                    ...
                  </p>
                </div>
              ) : null}

              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="draft">Mis à jour: {application.updatedAt}</Badge>
                  {application.sentAt ? <Badge variant="success">Envoyée: {application.sentAt}</Badge> : null}
                </div>

                <Link
                  href={`/applications/${application.id}`}
                  className="inline-flex items-center justify-center rounded-[11px] border border-[var(--border)] bg-[var(--card-soft)] px-4 py-2 text-sm font-medium text-[var(--foreground)] transition hover:bg-[var(--card-hi)]"
                >
                  Relire le brouillon
                </Link>
              </div>

              <div className="space-y-3 rounded-[18px] border border-[var(--border)] bg-[var(--card-soft)]/40 p-4">
                <ApplicationStatusActions
                  applicationId={application.id}
                  currentStatus={application.status}
                />
              </div>

              <div className="flex flex-wrap gap-2">
                {application.content?.emailText ? (
                  <CopyTextButton label="Copier email" text={application.content.emailText} />
                ) : null}
                {application.content?.letterText ? (
                  <CopyTextButton label="Copier lettre" text={application.content.letterText} />
                ) : null}
                {application.content?.linkedInText ? (
                  <CopyTextButton label="Copier LinkedIn" text={application.content.linkedInText} />
                ) : null}
              </div>
            </CardContent>
          </Card>
        ))}
      </section>
    </div>
  );
}
