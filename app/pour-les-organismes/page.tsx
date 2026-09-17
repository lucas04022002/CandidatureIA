import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/button";
import { Kpi } from "@/components/kpi";
import { LegalFooter } from "@/components/legal-footer";
import { PublicBar } from "@/components/shell";
import { PLACES_ESSAI } from "@/lib/places";

export const metadata: Metadata = {
  title: "Pour les organismes de formation",
  description:
    "Ouvrez des accès pour votre promo, voyez qui utilise l'outil. Les CV et les candidatures de vos étudiants restent privés.",
};

/**
 * Les trois bénéfices, du point de vue du responsable.
 *
 * Une formulation du guide a été ajustée : « Vous choisissez le nombre de
 * places dont vous avez besoin. » L'inscription ouvre un nombre FIXE de places
 * d'essai (PLACES_ESSAI, dans lib/db/queries/organisations.ts) ; le responsable
 * n'en choisit pas le nombre à la création. Il peut en demander davantage
 * ensuite. Promettre un choix qui n'existe pas se découvre au premier écran.
 */
const BENEFICES = [
  {
    titre: "Donnez un accès à votre promo",
    texte: `Votre inscription ouvre ${PLACES_ESSAI} places d'essai et vous donne un code d'organisme. Chaque étudiant s'inscrit avec ce code et utilise ApplyBot pendant sa recherche. Écrivez-nous pour en ouvrir davantage.`,
  },
  {
    titre: "Suivez l'utilisation",
    texte:
      "Depuis votre espace, vous voyez quels étudiants ont créé leur compte, leur dernière connexion, et le nombre de places encore disponibles. Vous savez simplement si l'outil est utilisé.",
  },
  {
    titre: "Les candidatures restent privées",
    texte:
      "Vous n'avez accès ni aux CV, ni aux offres enregistrées, ni aux lettres, ni aux candidatures de vos étudiants. Ces informations ne sont visibles que par eux.",
  },
];

const ETAPES = [
  {
    numero: "01",
    titre: "Créez votre espace organisme",
    texte: "Vous renseignez votre organisme et repartez avec votre code d'accès.",
  },
  {
    numero: "02",
    titre: "Partagez le code avec vos étudiants",
    texte: "Ils créent leur compte et ajoutent leur CV dans leur espace personnel.",
  },
  {
    numero: "03",
    titre: "Suivez les inscriptions",
    texte:
      "Vous voyez les comptes créés, les dernières connexions et les places disponibles depuis votre tableau de bord.",
  },
];

export default function PourLesOrganismes() {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-paper">
      <PublicBar />

      <main className="flex-1">
        <section className="bg-klein text-white">
          <div className="mx-auto grid max-w-6xl gap-10 px-5 py-14 [&>*]:min-w-0 sm:px-6 md:grid-cols-[1fr_360px] md:items-end md:py-16">
            <div className="motion-safe:animate-[rise_400ms_ease-out]">
              <p className="font-mono text-[11.5px] uppercase tracking-[0.16em] text-klein-soft">
                Pour les organismes de formation
              </p>
              <h1 className="mt-4 max-w-[20ch] font-display text-[clamp(31px,4.6vw,56px)] font-bold leading-[1.04] tracking-[-0.022em]">
                Aidez vos étudiants à trouver plus facilement une entreprise
              </h1>
              <p className="mt-5 max-w-[48ch] font-body text-[16.5px] leading-[1.6] text-klein-soft">
                ApplyBot aide vos étudiants à trouver des offres, préparer leurs candidatures et
                suivre leurs relances au même endroit. Vous ouvrez les accès pour votre promo et
                vous voyez qui utilise l&apos;outil, sans accéder aux CV ni aux candidatures.
              </p>
              <div className="mt-7 flex flex-wrap items-center gap-4">
                <Button variant="onBlue" href="/organisme/inscription">
                  Essayer ApplyBot
                </Button>
                <Link
                  href="/demo"
                  className="font-body text-[14px] text-white underline underline-offset-[3px]"
                >
                  Voir la démonstration
                </Link>
              </div>
            </div>

            <div className="min-w-0 rounded-tile bg-white p-5 text-ink shadow-hero motion-safe:animate-[rise_400ms_ease-out_120ms_backwards]">
              <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-grey">
                Exemple · code d&apos;organisme · promo électricité
              </p>
              <p className="tnum mt-2 mb-4 break-all font-display text-[30px] font-extrabold leading-none tracking-[0.06em] sm:text-[40px]">
                K7MZ4P2R
              </p>
              {/* Ce que l'écran réel affiche, et rien de plus : une jauge de places et la
                  liste des comptes. Une première version montrait « 47 candidatures cette
                  semaine » — un chiffre que le responsable ne voit jamais, sur une page qui
                  promet précisément qu'il ne le verra pas. */}
              <Kpi value="12 / 20" label="places utilisées" />
              <dl className="mt-5 grid grid-cols-[auto_1fr] gap-x-5 gap-y-1.5 border-t border-line pt-4 font-mono text-[12px] text-grey">
                <dt>E-mail</dt>
                <dd className="m-0 truncate text-ink">c.perrin@…</dd>
                <dt>Inscrit le</dt>
                <dd className="m-0 text-ink">02/09</dd>
                <dt>Connexion</dt>
                <dd className="m-0 text-ink">hier</dd>
              </dl>
            </div>
          </div>
        </section>

        <section className="mx-auto grid max-w-6xl gap-8 px-5 py-11 [&>*]:min-w-0 sm:px-6 md:grid-cols-3">
          {BENEFICES.map((b) => (
            <div key={b.titre}>
              <h2 className="font-display text-[18px] font-bold leading-[1.2] tracking-[-0.02em]">
                {b.titre}
              </h2>
              <p className="mt-1.5 font-body text-[14.5px] leading-[1.55] text-grey">{b.texte}</p>
            </div>
          ))}
        </section>

        <section className="mx-auto max-w-6xl px-5 pb-11 sm:px-6">
          <div className="min-w-0 rounded-tile border border-line bg-white p-5 sm:p-7">
            <h2 className="font-display text-[22px] font-bold leading-[1.15] tracking-[-0.02em]">
              Commencez avec quelques étudiants
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

        <section className="mx-auto max-w-6xl px-5 pb-14 sm:px-6">
          <div className="min-w-0 rounded-tile border border-line bg-white p-5 sm:p-7">
            <h2 className="font-display text-[22px] font-bold leading-[1.15] tracking-[-0.02em]">
              Essayez avant de déployer à toute la promo
            </h2>
            <p className="mt-3 max-w-[62ch] font-body text-[15px] leading-[1.6] text-grey">
              Créer un organisme prend une minute et ne demande aucune validation de notre part :
              vous repartez avec votre code et {PLACES_ESSAI} places, de quoi faire essayer
              l&apos;outil à quelques étudiants. Si ApplyBot vous convient, vous pourrez ouvrir les
              places nécessaires pour le reste de votre promo.
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-4">
              <Button variant="primary" href="/organisme/inscription">
                Créer mon espace organisme
              </Button>
              <Link
                href="/demo"
                className="font-body text-[14px] text-klein-deep underline underline-offset-[3px]"
              >
                Voir la démonstration
              </Link>
            </div>
          </div>
        </section>
      </main>

      <LegalFooter />
    </div>
  );
}
