import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function Home() {
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 py-10 md:px-8 md:py-16">
      <main className="relative overflow-hidden rounded-3xl border border-white/10 bg-[#0a1224cc] p-8 shadow-2xl shadow-indigo-950/30 md:p-12">
        <div className="pointer-events-none absolute -top-28 -right-24 h-72 w-72 rounded-full bg-indigo-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-16 h-64 w-64 rounded-full bg-sky-500/20 blur-3xl" />

        <div className="relative">
          <span className="inline-flex rounded-full border border-indigo-300/25 bg-indigo-500/15 px-3 py-1 text-xs text-indigo-200">
            ApplyBot • MVP V1
          </span>
          <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight text-white md:text-5xl">
            Ton agent IA pour accélérer chaque candidature, quel que soit le métier.
          </h1>
          <p className="mt-5 max-w-2xl text-base text-slate-300 md:text-lg">
            Scrape les offres, score leur pertinence et génère lettre, email et message LinkedIn
            avant validation.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/dashboard">
              <Button className="w-full sm:w-auto">Ouvrir le dashboard</Button>
            </Link>
            <Link href="/jobs">
              <Button variant="secondary" className="w-full sm:w-auto">
                Voir les offres
              </Button>
            </Link>
          </div>
        </div>

        <div className="relative mt-10 grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="p-4">
              <p className="text-sm font-medium text-white">1. Scraper</p>
              <p className="mt-1 text-sm text-slate-300">Collecte d’offres depuis plusieurs sources.</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm font-medium text-white">2. Générer</p>
              <p className="mt-1 text-sm text-slate-300">Lettre, email et message LinkedIn personnalisés.</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm font-medium text-white">3. Valider & Envoyer</p>
              <p className="mt-1 text-sm text-slate-300">Relecture rapide puis brouillon Gmail prêt à partir.</p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
