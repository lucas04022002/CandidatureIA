import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ScoreGauge } from "@/components/app/score-gauge";
import { Chip } from "@/components/ui/chip";

export default function Home() {
  return (
    <div className="mx-auto flex w-full max-w-[1180px] flex-1 flex-col px-4 py-6 md:px-8 md:py-10">
      <header className="mb-10 flex items-center justify-between rounded-[18px] border border-[var(--border)] bg-[color-mix(in_srgb,var(--background-elev)_85%,transparent)] px-4 py-3 backdrop-blur md:px-6">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-[linear-gradient(145deg,var(--accent),var(--accent-press))] text-white shadow-[var(--shadow-1),0_6px_18px_-8px_var(--accent)]">
            A
          </div>
          <div>
            <p className="text-sm font-semibold text-white">ApplyBot</p>
            <p className="text-xs text-[var(--foreground-faint)]">AI Career OS</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/onboarding">
            <Button variant="ghost">Se connecter</Button>
          </Link>
          <Link href="/onboarding">
            <Button>Commencer</Button>
          </Link>
        </div>
      </header>

      <main className="space-y-8">
        <section className="surface-panel relative overflow-hidden rounded-[28px] px-6 py-8 md:px-10 md:py-12">
          <div className="pointer-events-none absolute -right-16 top-0 h-60 w-60 rounded-full bg-[var(--accent-soft)] blur-3xl" />
          <div className="pointer-events-none absolute -left-16 bottom-0 h-56 w-56 rounded-full bg-[rgba(88,160,255,0.12)] blur-3xl" />

          <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[var(--accent-line)] bg-[var(--accent-soft)] px-3 py-1 text-xs text-[var(--accent-text)]">
                <span className="label-xs !text-[var(--accent-text)]">ApplyBot • Refonte</span>
              </div>
              <h1 className="mt-5 max-w-4xl text-4xl font-semibold tracking-[-0.035em] text-white md:text-6xl md:leading-[1.04]">
                Trouve les bonnes offres, génère les bons messages, avance plus vite.
              </h1>
              <p className="mt-5 max-w-2xl text-base text-[var(--foreground-dim)] md:text-lg">
                ApplyBot centralise la recherche, le scoring et la préparation de candidature pour
                tous les profils, du développeur au chargé d&apos;affaires.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link href="/onboarding">
                  <Button className="w-full sm:w-auto">Importer mon CV</Button>
                </Link>
                <Link href="/jobs">
                  <Button variant="secondary" className="w-full sm:w-auto">
                    Voir une démo
                  </Button>
                </Link>
              </div>

              <div className="mt-6 flex flex-wrap gap-2">
                <Chip>France Travail</Chip>
                <Chip>Adzuna</Chip>
                <Chip>Jooble</Chip>
                <Chip>La bonne alternance</Chip>
                <Chip>SmartRecruiters</Chip>
                <Chip>Scoring multi-profils</Chip>
              </div>
            </div>

            <Card className="rounded-[24px] bg-[linear-gradient(160deg,var(--card-hi),var(--card))]">
              <CardContent className="space-y-5 p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="label-xs">Top match</p>
                    <h2 className="mt-2 text-lg font-semibold text-white">Chargé d&apos;affaires B2B</h2>
                    <p className="mt-1 text-sm text-[var(--foreground-dim)]">
                      Toulouse • CDI • France Travail
                    </p>
                  </div>
                  <ScoreGauge value={91} size={72} thickness={7} />
                </div>
                <div className="grid gap-3">
                  <div className="rounded-2xl border border-[var(--border)] bg-white/5 p-4">
                    <p className="label-xs">Pourquoi ce score</p>
                    <p className="mt-2 text-sm text-[var(--foreground-dim)]">
                      Métier cible aligné, localisation compatible, expérience client et contrat CDI.
                    </p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    {[
                      ["24", "offres détectées"],
                      ["6", "top matchs"],
                      ["3", "brouillons prêts"],
                    ].map(([value, label]) => (
                      <div
                        key={label}
                        className="rounded-2xl border border-[var(--border)] bg-white/5 p-4"
                      >
                        <p className="font-mono text-2xl font-semibold text-white">{value}</p>
                        <p className="mt-1 text-xs text-[var(--foreground-faint)]">{label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          {[
            ["1. Scraper", "Collecte multi-source avec dédoublonnage et mise à jour intelligente du pipeline."],
            ["2. Scorer", "Matching métier, mots-clés favoris, localisation et niveau d’expérience."],
            ["3. Générer", "Email, lettre et message LinkedIn prêts à relire avant l’envoi."],
          ].map(([title, description]) => (
            <Card key={title}>
              <CardContent className="p-5">
                <p className="text-sm font-semibold text-white">{title}</p>
                <p className="mt-2 text-sm text-[var(--foreground-dim)]">{description}</p>
              </CardContent>
            </Card>
          ))}
        </section>
      </main>
    </div>
  );
}
