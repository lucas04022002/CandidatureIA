import { ScrapeJobsButton } from "@/components/app/scrape-jobs-button";

export function Topbar() {
  return (
    <header className="hidden items-center justify-between border-b border-white/10 bg-[#070d1fcc] px-8 py-4 backdrop-blur md:flex">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">ApplyBot</p>
        <p className="text-sm text-slate-200">Dashboard IA de candidatures</p>
      </div>
      <div className="flex items-center gap-3">
        <ScrapeJobsButton showFeedback={false} />
        <div className="h-9 w-9 rounded-full bg-gradient-to-br from-indigo-400 to-sky-400" />
      </div>
    </header>
  );
}
