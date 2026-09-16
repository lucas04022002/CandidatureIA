import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/button";
import { LegalFooter } from "@/components/legal-footer";
import { Score } from "@/components/score";
import { PublicBar } from "@/components/shell";
import { Stamp } from "@/components/stamp";

export const metadata: Metadata = {
  title: "Pour les étudiants",
  description:
    "Les offres qui correspondent à votre profil, la lettre et l'e-mail déjà préparés, et une relance au bout de quatre jours.",
};

/** Ce que l'outil fait pour l'étudiant, de son point de vue à lui. */
const ETAPES = [
  {
    titre: "Les offres viennent à vous",
    texte:
      "Sept sources relevées chaque jour — France Travail, Adzuna, Jooble, La Bonne Alternance, Greenhouse, Lever, SmartRecruiters. Dédoublonnées, et classées selon votre profil.",
  },
  {
    titre: "La lettre est déjà écrite",
    texte:
      "Pour chaque offre, une lettre, un e-mail et un message LinkedIn à relire et à copier. Vous postulez sur le site de l'offre, en un clic.",
  },
  {
    titre: "La relance part quatre jours après",
    texte:
      "Une candidature sans réponse au bout de quatre jours déclenche une relance prête à envoyer. Rien ne part sans vous.",
  },
];

export default function PourLesEtudiants() {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-paper">
      <PublicBar />

      <main className="flex-1">
        <section className="bg-klein text-white">
          <div className="mx-auto grid max-w-6xl gap-10 px-5 py-14 [&>*]:min-w-0 sm:px-6 md:grid-cols-[1fr_360px] md:items-end md:py-16">
            <div className="motion-safe:animate-[rise_400ms_ease-out]">
              <p className="font-mono text-[11.5px] uppercase tracking-[0.16em] text-klein-soft">
                Pour les étudiants
              </p>
              <h1 className="mt-4 font-display text-[clamp(31px,4.6vw,56px)] font-bold leading-[1.04] tracking-[-0.022em]">
                Postulez tous les jours,
                <br />
                sans y passer vos soirées.
              </h1>
              <p className="mt-5 max-w-[48ch] font-body text-[16.5px] leading-[1.6] text-klein-soft">
                Vous déposez votre CV une fois. Chaque jour, les offres qui correspondent à votre
                profil arrivent classées, avec la lettre et l&apos;e-mail déjà préparés. Vous relisez,
                vous envoyez, et l&apos;outil vous rappelle de relancer.
              </p>
              <div className="mt-7 flex flex-wrap items-center gap-4">
                <Button variant="onBlue" href="/demo">
                  Voir la démonstration
                </Button>
                <Link
                  href="/login"
                  className="font-body text-[14px] text-white underline underline-offset-[3px]"
                >
                  J&apos;ai un code d&apos;organisme
                </Link>
              </div>
            </div>

            <div className="min-w-0 rounded-tile bg-white p-5 text-ink shadow-hero motion-safe:animate-[rise_400ms_ease-out_120ms_backwards]">
              <p className="font-display text-[17px] font-bold leading-[1.2]">Électricien bâtiment H/F</p>
              <p className="mt-1.5 font-mono text-[12.5px] leading-[1.6] text-grey">
                Spie Batignolles · Vénissieux · CDI
                <br />
                France Travail · relevé de 07:30
              </p>
              <div className="mt-4 flex items-center justify-between gap-3">
                <Score value={86} size="hero" />
                <Stamp status="Envoyé" />
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto grid max-w-6xl gap-8 px-5 py-11 [&>*]:min-w-0 sm:px-6 md:grid-cols-3">
          {ETAPES.map((e) => (
            <div key={e.titre}>
              <h2 className="font-display text-[18px] font-bold leading-[1.2] tracking-[-0.02em]">{e.titre}</h2>
              <p className="mt-1.5 font-body text-[14.5px] leading-[1.55] text-grey">{e.texte}</p>
            </div>
          ))}
        </section>

        <section className="mx-auto max-w-6xl px-5 pb-14 sm:px-6">
          <div className="min-w-0 rounded-tile border border-line bg-white p-5 sm:p-7">
            <h2 className="font-display text-[22px] font-bold leading-[1.15] tracking-[-0.02em]">
              Comment on commence
            </h2>
            <ol className="mt-4 grid gap-4 font-body text-[15px] leading-[1.55] text-grey sm:grid-cols-3">
              <li>
                <span className="font-mono text-[12px] tracking-[0.12em] text-klein">01</span>
                <br />
                Votre organisme de formation vous donne un code à huit caractères.
              </li>
              <li>
                <span className="font-mono text-[12px] tracking-[0.12em] text-klein">02</span>
                <br />
                Vous créez votre compte avec ce code et vous déposez votre CV.
              </li>
              <li>
                <span className="font-mono text-[12px] tracking-[0.12em] text-klein">03</span>
                <br />
                Les offres arrivent dès le lendemain, classées selon votre profil.
              </li>
            </ol>
            <p className="mt-6 font-body text-[14.5px] leading-[1.6] text-grey">
              Vous n&apos;avez pas de code ?{" "}
              <Link href="/pour-les-organismes" className="text-klein underline underline-offset-[3px]">
                Parlez d&apos;ApplyBot à votre organisme
              </Link>
              . C&apos;est lui qui ouvre les places.
            </p>
          </div>
        </section>
      </main>

      <LegalFooter />
    </div>
  );
}
