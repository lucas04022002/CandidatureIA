import Link from "next/link";
import { NavLinks } from "@/components/app/nav-links";

export function Sidebar() {
  return (
    <>
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#070d1fcc] px-4 py-3 backdrop-blur md:hidden">
        <div className="mx-auto flex max-w-7xl flex-col gap-3">
          <div className="flex items-center justify-between">
            <Link href="/" className="text-lg font-semibold tracking-tight text-white">
              ApplyBot
            </Link>
            <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs text-slate-200">
              MVP
            </span>
          </div>
          <NavLinks mobile />
        </div>
      </header>

      <aside className="fixed inset-y-0 left-0 hidden w-72 border-r border-white/10 bg-[#070d1f] p-6 md:flex md:flex-col">
        <Link href="/" className="text-xl font-semibold tracking-tight text-white">
          ApplyBot
        </Link>
        <p className="mt-2 text-sm text-slate-400">Agent IA de candidature</p>

        <div className="mt-8">
          <NavLinks />
        </div>

        <div className="mt-auto rounded-2xl border border-indigo-500/20 bg-indigo-500/10 p-4">
          <p className="text-sm font-medium text-indigo-200">Mode V1</p>
          <p className="mt-1 text-xs text-indigo-100/80">
            Front prêt. Prochaine étape: Supabase + OpenAI.
          </p>
        </div>
      </aside>
    </>
  );
}
