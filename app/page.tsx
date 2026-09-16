import Link from "next/link";
import { LegalFooter } from "@/components/legal-footer";
import { PublicBar } from "@/components/shell";

/**
 * La porte d'entrée.
 *
 * L'accueil mélangeait les deux publics : un étudiant lisait des arguments de
 * vente destinés à son organisme, et un responsable d'organisme lisait comment
 * postuler. Les deux repartaient sans savoir si le produit était pour eux.
 *
 * Il pose désormais une seule question, et chaque page derrière ne parle qu'à
 * son public.
 */
const PORTES = [
  {
    href: "/pour-les-etudiants",
    eyebrow: "Je cherche un emploi ou une alternance",
    titre: "Je suis étudiant",
    texte:
      "Sept sites d'offres interrogés d'un coup, les résultats classés selon votre CV, et la lettre écrite en un bouton.",
    cta: "Voir ce que ça donne",
  },
  {
    href: "/pour-les-organismes",
    eyebrow: "Je forme une promo",
    titre: "Je suis un organisme",
    texte:
      "Ouvrez des places pour votre promo, suivez qui est inscrit. Les CV et les candidatures restent privés.",
    cta: "Ouvrir des places",
  },
];

export default function Home() {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-paper">
      <PublicBar />

      <main className="flex flex-1 items-center">
        <div className="mx-auto w-full max-w-6xl px-5 py-14 sm:px-6 sm:py-20">
          <div className="motion-safe:animate-[rise_400ms_ease-out]">
            <p className="font-mono text-[11.5px] uppercase tracking-[0.16em] text-grey">
              Logiciel de candidatures pour organismes de formation
            </p>
            <h1 className="mt-4 max-w-[20ch] font-display text-[clamp(30px,4.4vw,52px)] font-bold leading-[1.04] tracking-[-0.022em]">
              Vous êtes ici pour quoi&nbsp;?
            </h1>
          </div>

          <div className="mt-10 grid gap-4 [&>*]:min-w-0 md:grid-cols-2 md:gap-5">
            {PORTES.map((p, i) => (
              <Link
                key={p.href}
                href={p.href}
                className="group flex min-w-0 flex-col rounded-tile border border-line bg-white p-6 transition duration-150 hover:border-klein hover:shadow-hero sm:p-8"
                style={{ animationDelay: `${i * 90}ms` }}
              >
                <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-grey">{p.eyebrow}</p>
                <p className="mt-4 font-display text-[clamp(24px,3vw,32px)] font-extrabold leading-[1.08] tracking-[-0.025em]">
                  {p.titre}
                </p>
                <p className="mt-3 max-w-[40ch] font-body text-[15px] leading-[1.55] text-grey">{p.texte}</p>
                <span className="mt-6 inline-flex items-center gap-2 font-body text-[15px] font-semibold text-klein">
                  {p.cta}
                  <span aria-hidden className="transition-transform duration-200 group-hover:translate-x-1">
                    →
                  </span>
                </span>
              </Link>
            ))}
          </div>

          <p className="mt-9 font-body text-[14.5px] leading-[1.6] text-grey">
            Vous voulez seulement regarder à quoi ça ressemble ?{" "}
            <Link href="/demo" className="text-klein underline underline-offset-[3px]">
              Entrez dans la démonstration
            </Link>{" "}
            — aucune inscription, aucun code.
          </p>
        </div>
      </main>

      <LegalFooter />
    </div>
  );
}
