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
    "Sept sites d'offres interrogés d'un coup, les résultats classés selon votre CV, et la lettre écrite en un bouton.",
};

/**
 * Les trois blocs, écrits du point de vue de l'étudiant.
 *
 * Et vérifiés contre le produit : une première version annonçait « sept sites
 * relevés pendant la nuit », alors qu'il n'existe aucune collecte planifiée —
 * l'étudiant lance lui-même la recherche, une fois par heure au maximum
 * (lib/rate-limit.ts, SEARCH_MAX). Un texte qui promet ce que le code ne fait
 * pas se retourne contre le produit dès la première utilisation.
 */
const ETAPES = [
  {
    titre: "Un clic, sept sites",
    texte:
      "France Travail, Adzuna, Jooble, La Bonne Alternance et trois sites d'entreprises, interrogés d'un coup. Les doublons tombent, le reste arrive classé par ce qui colle à votre profil.",
  },
  {
    titre: "La lettre, en un bouton",
    texte:
      "Sur une offre qui vous plaît, un bouton écrit la lettre, l'e-mail et le message LinkedIn à partir de votre CV et de l'annonce. Vous relisez, vous copiez, et vous retouchez ce qui ne vous ressemble pas avant d'envoyer.",
  },
  {
    titre: "On vous dit quand relancer",
    texte:
      "Dès qu'une candidature est marquée envoyée, « préparer la relance » entre dans vos actions du jour. Le bouton l'écrit et la date à quatre jours après l'envoi. C'est souvent elle qui déclenche un retour, et c'est ce qu'on oublie le plus vite.",
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
                Étudiants et alternants
              </p>
              <h1 className="mt-4 font-display text-[clamp(31px,4.6vw,56px)] font-bold leading-[1.04] tracking-[-0.022em]">
                Vous avez une formation à finir.
                <br />
                Pas quarante lettres à écrire.
              </h1>
              <p className="mt-5 max-w-[48ch] font-body text-[16.5px] leading-[1.6] text-klein-soft">
                Chercher les annonces sur sept sites, réécrire la même lettre, se souvenir de qui
                n&apos;a pas répondu. Trois corvées, et c&apos;est la troisième qui fait abandonner.
                ApplyBot s&apos;en charge. Vous gardez la seule qui compte : relire, et envoyer.
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
              Dix minutes, une fois pour toutes
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
                Vous créez votre compte avec ce code, et vous déposez votre CV. Une seule fois.
              </li>
              <li>
                <span className="font-mono text-[12px] tracking-[0.12em] text-klein">03</span>
                <br />
                Vous lancez votre première recherche. Les offres arrivent classées ; la lettre s&apos;écrit sur celles que vous gardez.
              </li>
            </ol>
            <p className="mt-6 border-l-2 border-klein pl-4 font-body text-[14.5px] leading-[1.6] text-ink">
              <strong className="font-semibold">Rien ne part en votre nom.</strong> Vous postulez
              vous-même, sur le site de l&apos;employeur, avec un texte que vous avez relu. ApplyBot
              n&apos;envoie aucun e-mail à votre place.
            </p>

            <p className="mt-5 font-body text-[14.5px] leading-[1.6] text-grey">
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
