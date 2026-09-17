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
    "ApplyBot cherche les offres sur plusieurs sites, les classe selon votre CV et vous aide à préparer vos candidatures.",
};

/**
 * Les trois fonctions, dans l'ordre où on les utilise.
 *
 * Deux formulations du guide ont été ajustées, pour la même raison : le produit
 * ne les fait pas.
 *
 * — « Vous pouvez ensuite relire et MODIFIER le texte » : le texte généré n'est
 *   pas modifiable dans ApplyBot. Il s'affiche en lecture seule avec un bouton
 *   « Copier » (TextBlock, dans le détail d'une candidature). La retouche se
 *   fait après le collage, chez l'employeur ou dans la boîte mail.
 *
 * — « ApplyBot vous indique quand il est temps de relancer » : la relance entre
 *   dans les actions du jour dès qu'une candidature est marquée envoyée, pas à
 *   une date. Les quatre jours sont la date d'envoi CONSEILLÉE, écrite dans la
 *   lettre une fois le bouton pressé (app/api/generate-followup).
 */
const FONCTIONS = [
  {
    titre: "Cherchez sur plusieurs sites à la fois",
    texte:
      "ApplyBot interroge sept sites d'offres d'un coup et regroupe les résultats au même endroit. Les doublons sont retirés, et les offres sont classées selon votre profil.",
  },
  {
    titre: "Préparez votre candidature",
    texte:
      "Quand une offre vous intéresse, un bouton prépare votre lettre, votre e-mail et votre message LinkedIn à partir de votre CV et de l'annonce. Vous relisez, vous copiez, et vous retouchez ce qui ne vous ressemble pas avant d'envoyer.",
  },
  {
    titre: "N'oubliez plus les relances",
    texte:
      "Vos candidatures restent enregistrées avec leur statut et leur date d'envoi. Dès qu'une candidature est marquée envoyée, « préparer la relance » entre dans vos actions du jour, et le message se prépare comme le reste.",
  },
];

const ETAPES = [
  {
    numero: "01",
    titre: "Créez votre compte",
    texte: "Votre organisme de formation vous donne un code d'accès à huit caractères.",
  },
  {
    numero: "02",
    titre: "Ajoutez votre CV",
    texte:
      "Vous le déposez une seule fois. ApplyBot l'utilise ensuite pour classer les offres et préparer vos candidatures.",
  },
  {
    numero: "03",
    titre: "Lancez votre recherche",
    texte:
      "Les offres sont regroupées et classées selon votre profil. Vous choisissez celles qui vous intéressent, et vous préparez votre candidature.",
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
              <h1 className="mt-4 max-w-[19ch] font-display text-[clamp(31px,4.6vw,56px)] font-bold leading-[1.04] tracking-[-0.022em]">
                Trouvez plus facilement votre emploi ou votre alternance
              </h1>
              <p className="mt-5 max-w-[48ch] font-body text-[16.5px] leading-[1.6] text-klein-soft">
                ApplyBot cherche les offres sur plusieurs sites, les classe selon votre CV et vous
                aide à préparer vos candidatures. Vous gardez toutes vos offres, candidatures et
                relances au même endroit.
              </p>
              <div className="mt-7 flex flex-wrap items-center gap-4">
                <Button variant="onBlue" href="/demo">
                  Voir la démonstration
                </Button>
                <Link
                  href="/login"
                  className="font-body text-[14px] text-white underline underline-offset-[3px]"
                >
                  J&apos;ai déjà un code
                </Link>
              </div>
            </div>

            <div className="min-w-0 rounded-tile bg-white p-5 text-ink shadow-hero motion-safe:animate-[rise_400ms_ease-out_120ms_backwards]">
              <p className="font-display text-[17px] font-bold leading-[1.2]">
                Électricien bâtiment H/F
              </p>
              <p className="mt-1.5 font-mono text-[12.5px] leading-[1.6] text-grey">
                Spie Batignolles · Vénissieux · CDI
                <br />
                France Travail
              </p>
              <div className="mt-4 flex items-center justify-between gap-3">
                <Score value={86} size="hero" />
                <Stamp status="Envoyé" />
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto grid max-w-6xl gap-8 px-5 py-11 [&>*]:min-w-0 sm:px-6 md:grid-cols-3">
          {FONCTIONS.map((f) => (
            <div key={f.titre}>
              <h2 className="font-display text-[18px] font-bold leading-[1.2] tracking-[-0.02em]">
                {f.titre}
              </h2>
              <p className="mt-1.5 font-body text-[14.5px] leading-[1.55] text-grey">{f.texte}</p>
            </div>
          ))}
        </section>

        <section className="mx-auto max-w-6xl px-5 pb-11 sm:px-6">
          <div className="min-w-0 rounded-tile border border-line bg-white p-5 sm:p-7">
            <h2 className="font-display text-[22px] font-bold leading-[1.15] tracking-[-0.02em]">
              Commencez en quelques minutes
            </h2>
            <ol className="mt-4 grid gap-4 font-body text-[15px] leading-[1.55] text-grey sm:grid-cols-3">
              {ETAPES.map((e) => (
                <li key={e.numero}>
                  <span className="font-mono text-[12px] tracking-[0.12em] text-klein">
                    {e.numero}
                  </span>
                  <br />
                  <strong className="font-semibold text-ink">{e.titre}</strong>
                  <br />
                  {e.texte}
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Le bloc qui répond à la crainte « un robot va-t-il postuler à ma
            place ? ». Court et visible : c'est la question qu'on se pose avant
            toutes les autres. */}
        <section className="mx-auto max-w-6xl px-5 pb-11 sm:px-6">
          <div className="min-w-0 rounded-tile border-l-[3px] border-klein bg-white px-5 py-6 sm:px-7">
            <h2 className="font-display text-[22px] font-bold leading-[1.15] tracking-[-0.02em]">
              Vous gardez toujours le contrôle.
            </h2>
            <p className="mt-3 max-w-[62ch] font-body text-[15px] leading-[1.6] text-ink">
              ApplyBot n&apos;envoie aucune candidature à votre place. Vous postulez vous-même, sur
              le site de l&apos;employeur, avec un texte que vous avez relu.
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-5 pb-14 sm:px-6">
          <div className="min-w-0 rounded-tile border border-line bg-white p-5 sm:p-7">
            <h2 className="font-display text-[22px] font-bold leading-[1.15] tracking-[-0.02em]">
              Vous n&apos;avez pas encore de code d&apos;accès&nbsp;?
            </h2>
            <p className="mt-3 max-w-[62ch] font-body text-[15px] leading-[1.6] text-grey">
              ApplyBot est proposé par votre organisme de formation. Vous pouvez lui parler de
              l&apos;outil pour qu&apos;il ouvre des accès à votre promo.
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-4">
              <Button variant="primary" href="/pour-les-organismes">
                Découvrir ApplyBot pour les organismes
              </Button>
              <Link
                href="/login"
                className="font-body text-[14px] text-klein-deep underline underline-offset-[3px]"
              >
                Déjà un code&nbsp;? Se connecter
              </Link>
            </div>
          </div>
        </section>
      </main>

      <LegalFooter />
    </div>
  );
}
