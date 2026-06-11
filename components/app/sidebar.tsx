import Link from "next/link";
import { getApplications, getJobs } from "@/lib/supabase/queries";
import { BoltIcon, UserIcon } from "@/components/app/icons";
import { NavLinks } from "@/components/app/nav-links";
import { ScoreGauge } from "@/components/app/score-gauge";

export async function Sidebar() {
  const [jobsResult, applicationsResult] = await Promise.all([getJobs(), getApplications()]);
  const counts = {
    jobs: jobsResult.data.length,
    applications: applicationsResult.data.length,
    followups: applicationsResult.data.filter((application) => application.status === "Envoyé").length,
  };

  return (
    <>
      <header className="surface-elevated sticky top-0 z-40 border-b px-4 py-3 backdrop-blur md:hidden">
        <div className="mx-auto flex max-w-7xl flex-col gap-3">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3 text-[var(--foreground)]">
              <span className="grid h-8 w-8 place-items-center rounded-[10px] bg-[linear-gradient(145deg,var(--accent),var(--accent-press))] text-white shadow-[var(--shadow-1),0_6px_18px_-8px_var(--accent)]">
                <BoltIcon size={15} />
              </span>
              <span>
                <span className="block text-sm font-semibold tracking-[-0.02em]">ApplyBot</span>
                <span className="block text-[11px] text-[var(--foreground-faint)]">AI Career OS</span>
              </span>
            </Link>
            <ScoreGauge value={92} size={38} thickness={5} />
          </div>
          <NavLinks mobile counts={counts} />
        </div>
      </header>

      <aside className="surface-elevated fixed inset-y-0 left-0 hidden w-[248px] flex-col border-r px-4 py-5 md:flex">
        <Link href="/" className="flex items-center gap-3 px-2">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-[linear-gradient(145deg,var(--accent),var(--accent-press))] text-white shadow-[var(--shadow-1),0_6px_18px_-8px_var(--accent)]">
            <BoltIcon size={18} />
          </span>
          <span>
            <span className="block text-base font-semibold tracking-[-0.02em] text-white">ApplyBot</span>
            <span className="block text-[11px] text-[var(--foreground-faint)]">Agent de candidature</span>
          </span>
        </Link>

        <div className="mt-7">
          <div className="label-xs px-3 pb-2">Navigation</div>
          <NavLinks counts={counts} />
        </div>

        <div className="mt-7">
          <div className="label-xs px-3 pb-2">Compte</div>
          <div className="flex flex-col gap-1">
            <Link
              href="/profil"
              className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-[var(--foreground-dim)] transition hover:bg-[var(--card-soft)] hover:text-[var(--foreground)]"
            >
              <UserIcon size={16} />
              <span>Profil & réglages</span>
            </Link>
          </div>
        </div>

        <div className="mt-auto rounded-[14px] border border-[var(--border)] bg-[linear-gradient(160deg,var(--card-hi),var(--card))] p-4 shadow-[var(--shadow-1)]">
          <div className="flex items-start gap-3">
            <ScoreGauge value={92} size={52} thickness={6} />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[var(--foreground)]">Profil prêt</p>
              <p className="mt-1 text-xs leading-5 text-[var(--foreground-dim)]">
                CV importé, scoring actif, pipeline prêt pour générer et suivre les candidatures.
              </p>
            </div>
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-[var(--card-soft)]">
            <div className="h-full w-[92%] rounded-full bg-[linear-gradient(90deg,var(--accent),var(--good))]" />
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2 text-[11px] text-[var(--foreground-faint)]">
            <div className="rounded-lg border border-[var(--border)] bg-[var(--card-soft)] px-2 py-2">
              <div className="mb-1 text-[var(--foreground)]">{counts.jobs}</div>
              <div>Offres</div>
            </div>
            <div className="rounded-lg border border-[var(--border)] bg-[var(--card-soft)] px-2 py-2">
              <div className="mb-1 text-[var(--foreground)]">{counts.applications}</div>
              <div>Brouillons</div>
            </div>
            <div className="rounded-lg border border-[var(--border)] bg-[var(--card-soft)] px-2 py-2">
              <div className="mb-1 text-[var(--foreground)]">{counts.followups}</div>
              <div>Relances</div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
