"use client";

import { usePathname } from "next/navigation";
import { BellIcon, SearchIcon } from "@/components/app/icons";
import { ScrapeJobsButton } from "@/components/app/scrape-jobs-button";

const routeLabels: Record<string, string> = {
  "/dashboard": "Tableau de bord",
  "/jobs": "Offres",
  "/applications": "Candidatures",
  "/suivi": "Suivi",
  "/onboarding": "Onboarding",
  "/profil": "Profil",
};

function resolveLabel(pathname: string) {
  if (pathname.startsWith("/applications/")) return "Brouillon";
  if (pathname.startsWith("/jobs/")) return "Détail offre";
  return routeLabels[pathname] ?? "ApplyBot";
}

export function Topbar() {
  const pathname = usePathname();
  const label = resolveLabel(pathname);

  return (
    <header className="glass-topbar hidden items-center gap-4 border-b border-[var(--border)] px-6 py-4 xl:px-8 md:flex">
      <div className="min-w-0">
        <p className="label-xs">ApplyBot</p>
        <p className="mt-1 text-sm font-medium text-[var(--foreground)]">{label}</p>
      </div>

      <div className="ml-auto flex items-center gap-3">
        <button
          type="button"
          className="hidden min-w-[220px] items-center gap-2 rounded-[11px] border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-left text-sm text-[var(--foreground-faint)] transition hover:border-[var(--border-strong)] lg:flex"
        >
          <SearchIcon size={15} />
          <span className="flex-1">Rechercher une offre, une action…</span>
          <kbd className="rounded-md border border-[var(--border-strong)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--foreground-faint)]">
            ⌘K
          </kbd>
        </button>

        <button
          type="button"
          className="relative grid h-10 w-10 place-items-center rounded-full border border-[var(--border)] bg-[var(--card)] text-[var(--foreground-dim)] transition hover:bg-[var(--card-hi)] hover:text-[var(--foreground)]"
          aria-label="Notifications"
        >
          <BellIcon size={16} />
          <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-[var(--accent)]" />
        </button>

        <ScrapeJobsButton showFeedback={false} />

        <div className="grid h-10 w-10 place-items-center rounded-full bg-[linear-gradient(145deg,var(--accent),var(--accent-press))] text-xs font-semibold text-white shadow-[var(--shadow-1)]">
          AB
        </div>
      </div>
    </header>
  );
}
