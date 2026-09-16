import type { Metadata } from "next";
import Link from "next/link";
import { DemoEntry } from "@/components/demo-entry";
import { LegalFooter } from "@/components/legal-footer";
import { PublicBar } from "@/components/shell";

/**
 * Rendu à chaque requête, et non à la construction.
 *
 * Cette page lit DEMO_EMAIL et DEMO_PASSWORD, qui sont des variables
 * d'exécution — elles n'existent pas quand l'image est construite. Sans cette
 * ligne, Next pré-rend la page au build, y fige « la démonstration n'est pas
 * configurée », et aucune variable posée ensuite ne peut plus rien y changer.
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Démonstration",
  description:
    "Entrer dans un compte ApplyBot d'exemple, avec des offres et des candidatures déjà présentes.",
  robots: { index: false, follow: true },
};

/**
 * La porte d'entrée du visiteur.
 *
 * Sans elle, quelqu'un qui découvre ApplyBot ne peut rien voir : créer un
 * organisme le laisse en attente d'activation, et le code d'organisme, il ne
 * l'a pas. Cette page le fait entrer en un clic dans un compte garni.
 *
 * Les identifiants sont publics par construction — le compte ne contient que
 * des données d'exemple. Ils sont affichés plutôt que cachés : un visiteur qui
 * veut se connecter depuis son téléphone plus tard doit pouvoir les recopier.
 */
export default function DemoPage() {
  const email = process.env.DEMO_EMAIL ?? "";
  const password = process.env.DEMO_PASSWORD ?? "";
  const configure = Boolean(email && password);

  return (
    <div className="flex min-h-full flex-1 flex-col bg-paper">
      <PublicBar />

      <main className="flex-1">
        <section className="mx-auto max-w-3xl px-5 py-12 sm:px-6 sm:py-16">
          <p className="font-mono text-[11.5px] uppercase tracking-[0.16em] text-grey">
            Démonstration
          </p>
          <h1 className="mt-4 font-display text-[clamp(28px,4.4vw,42px)] font-bold leading-[1.08] tracking-[-0.022em]">
            Regardez par-dessus l&apos;épaule de Camille.
          </h1>
          <p className="mt-5 max-w-[58ch] font-body text-[16.5px] leading-[1.6] text-grey">
            Camille sort d&apos;une formation en électricité et cherche son premier poste autour de
            Lyon. Son compte est ouvert : six offres du jour, quatre candidatures à des stades
            différents, et une relance qui attend depuis hier.
          </p>
          <p className="mt-3 max-w-[58ch] font-body text-[16.5px] leading-[1.6] text-grey">
            Entrez, cliquez partout. Camille n&apos;existe pas, et rien de ce que vous ferez ne
            compte.
          </p>

          <div className="mt-8 rounded-tile border border-line bg-white p-5 sm:p-6">
            {configure ? (
              <DemoEntry email={email} password={password} />
            ) : (
              <p className="font-body text-[15px] leading-[1.6] text-grey">
                La démonstration n&apos;est pas configurée sur cette installation. Écrivez-moi et je
                vous ouvre un accès :{" "}
                <a className="text-klein underline underline-offset-[3px]" href="mailto:lucasguilhot7@gmail.com">
                  lucasguilhot7@gmail.com
                </a>
              </p>
            )}
          </div>

          <div className="mt-10 grid gap-6 sm:grid-cols-2">
            <div>
              <h2 className="font-display text-[17px] font-bold">Ce qu&apos;il faut regarder</h2>
              <ul className="mt-3 space-y-2 font-body text-[15px] leading-[1.55] text-grey">
                <li>Le score en face de chaque offre : d&apos;où il vient, et ce qu&apos;il classe.</li>
                <li>Une candidature ouverte : la lettre et l&apos;e-mail, écrits à partir du CV.</li>
                <li>La relance de chez Ortec, échue depuis hier et prête à partir.</li>
              </ul>
            </div>
            <div>
              <h2 className="font-display text-[17px] font-bold">Ce que vous ne verrez pas</h2>
              <ul className="mt-3 space-y-2 font-body text-[15px] leading-[1.55] text-grey">
                <li>
                  L&apos;espace du responsable d&apos;organisme : c&apos;est un autre rôle, et il ne
                  donne accès ni aux CV ni aux candidatures.
                </li>
                <li>La moindre donnée réelle. Offres, entreprises, candidatures : tout est inventé.</li>
              </ul>
            </div>
          </div>

          <p className="mt-10 font-body text-[14.5px] leading-[1.6] text-grey">
Vous formez une promo et vous voulez l&apos;ouvrir à vos étudiants ?{" "}
            <Link href="/organisme/inscription" className="text-klein underline underline-offset-[3px]">
              Ouvrez des places
            </Link>
            .
          </p>
        </section>
      </main>

      <LegalFooter />
    </div>
  );
}
