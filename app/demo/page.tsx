import type { Metadata } from "next";
import Link from "next/link";
import { DemoEntry } from "@/components/demo-entry";
import { LegalFooter } from "@/components/legal-footer";
import { PublicBar } from "@/components/shell";

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
            Entrez dans un compte d&apos;exemple.
          </h1>
          <p className="mt-5 max-w-[58ch] font-body text-[16.5px] leading-[1.6] text-grey">
            Vous arrivez dans le compte d&apos;une stagiaire fictive, Camille Perrin, sortie de
            formation en électricité. Cinq offres classées selon son profil, des candidatures à
            différents stades, et une relance qui arrive à échéance.
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
              <h2 className="font-display text-[17px] font-bold">Ce que vous pouvez faire</h2>
              <ul className="mt-3 space-y-2 font-body text-[15px] leading-[1.55] text-grey">
                <li>Parcourir les offres et leur score de correspondance.</li>
                <li>Ouvrir une candidature, lire la lettre et l&apos;e-mail préparés.</li>
                <li>Voir une relance prête à partir, quatre jours après l&apos;envoi.</li>
              </ul>
            </div>
            <div>
              <h2 className="font-display text-[17px] font-bold">Ce que vous ne verrez pas</h2>
              <ul className="mt-3 space-y-2 font-body text-[15px] leading-[1.55] text-grey">
                <li>L&apos;espace responsable d&apos;organisme, réservé aux comptes d&apos;organisme.</li>
                <li>De vraies données : tout ce compte est fictif.</li>
              </ul>
            </div>
          </div>

          <p className="mt-10 font-body text-[14.5px] leading-[1.6] text-grey">
            Vous représentez un organisme de formation ?{" "}
            <Link href="/organisme/inscription" className="text-klein underline underline-offset-[3px]">
              Ouvrez des places pour votre promo
            </Link>
            .
          </p>
        </section>
      </main>

      <LegalFooter />
    </div>
  );
}
