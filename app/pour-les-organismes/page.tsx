import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/button";
import { Kpi } from "@/components/kpi";
import { LegalFooter } from "@/components/legal-footer";
import { PublicBar } from "@/components/shell";

export const metadata: Metadata = {
  title: "Pour les organismes de formation",
  description:
    "Ouvrez des places pour une promo, suivez qui est inscrit et combien de places restent. Les CV et les candidatures de vos étudiants restent privés.",
};

/** Ce qui compte pour un responsable d'organisme : le suivi, et ce qu'il ne voit pas. */
const POINTS = [
  {
    titre: "Des places, pas des licences",
    texte:
      "Vous ouvrez un nombre de places pour une promo. Chaque étudiant s'inscrit avec le code de l'organisme et occupe une place, jusqu'à ce que vous la libériez en retirant son compte — à la fin de la promo, par exemple.",
  },
  {
    titre: "Le suivi de la promo",
    texte:
      "L'adresse de chaque étudiant, sa date d'inscription, sa dernière connexion, et les places qui restent. De quoi savoir si l'outil sert vraiment, sans avoir à demander.",
  },
  {
    titre: "Ce que vous ne voyez pas",
    texte:
      "Ni les CV, ni les offres, ni les candidatures, ni les lettres. Ce sont les données personnelles de vos étudiants, et elles ne vous regardent pas.",
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
              <h1 className="mt-4 font-display text-[clamp(31px,4.6vw,56px)] font-bold leading-[1.04] tracking-[-0.022em]">
                Votre promo postule.
                <br />
                Vous suivez l&apos;essentiel.
              </h1>
              <p className="mt-5 max-w-[48ch] font-body text-[16.5px] leading-[1.6] text-klein-soft">
                Vous ouvrez des places, vos étudiants s&apos;inscrivent avec un code, et l&apos;outil
                cherche pour eux sur sept sites à la fois, lettre comprise. Vous voyez qui est
                inscrit, quand il s&apos;est connecté, et combien de places restent — jamais leurs CV,
                jamais leurs candidatures.
              </p>
              <div className="mt-7 flex flex-wrap items-center gap-4">
                <Button variant="onBlue" href="/organisme/inscription">
                  Ouvrir des places
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
          {POINTS.map((p) => (
            <div key={p.titre}>
              <h2 className="font-display text-[18px] font-bold leading-[1.2] tracking-[-0.02em]">{p.titre}</h2>
              <p className="mt-1.5 font-body text-[14.5px] leading-[1.55] text-grey">{p.texte}</p>
            </div>
          ))}
        </section>

        <section className="mx-auto max-w-6xl px-5 pb-14 sm:px-6">
          <div className="min-w-0 rounded-tile border border-line bg-white p-5 sm:p-7">
            <h2 className="font-display text-[22px] font-bold leading-[1.15] tracking-[-0.02em]">
              Trois places d&apos;essai, tout de suite
            </h2>
            <p className="mt-3 max-w-[62ch] font-body text-[15px] leading-[1.6] text-grey">
              Créer un organisme prend une minute et ne demande aucune validation de notre part :
              vous repartez avec votre code et trois places, de quoi faire essayer l&apos;outil à
              quelques étudiants avant d&apos;en parler. Écrivez-nous quand vous voulez en ouvrir
              davantage.
            </p>
            <Button variant="primary" href="/organisme/inscription" className="mt-5">
              Ouvrir des places
            </Button>
          </div>
        </section>
      </main>

      <LegalFooter />
    </div>
  );
}
