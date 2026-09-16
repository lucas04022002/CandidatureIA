import Link from "next/link";
import { Button } from "@/components/button";
import { Kpi } from "@/components/kpi";
import { LegalFooter } from "@/components/legal-footer";
import { Score } from "@/components/score";
import { PublicBar } from "@/components/shell";
import { Stamp } from "@/components/stamp";

const COLUMNS = [
  {
    title: "Sept sources d'offres",
    text: "France Travail, Adzuna, Jooble, La Bonne Alternance, Greenhouse, Lever, SmartRecruiters. Dédoublonnées, classées selon le profil.",
  },
  {
    title: "Lettre et e-mail prêts",
    text: "Pour chaque offre, une lettre, un e-mail et un message LinkedIn à copier. Le stagiaire postule sur le site de l'offre, en un clic.",
  },
  {
    title: "Relance à quatre jours",
    text: "Une candidature envoyée sans réponse déclenche une relance prête à partir. Rien n'est envoyé sans le stagiaire.",
  },
];

export default function Home() {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-paper">
      <PublicBar />

      <main className="flex-1">
        <section className="bg-klein text-white">
          <div className="mx-auto grid max-w-6xl gap-10 px-6 py-14 [&>*]:min-w-0 md:grid-cols-[1fr_380px] md:items-end md:py-16">
            <div className="motion-safe:animate-[rise_400ms_ease-out]">
              {/* Le titre nomme le métier et la cible. L'ancien — « Chaque stagiaire
                  postule. Chaque jour. » — sonnait bien et n'apprenait rien : un
                  visiteur ne savait pas ce qu'est le produit ni s'il le concerne. */}
              <p className="font-mono text-[11.5px] uppercase tracking-[0.16em] text-klein-soft">
                Logiciel pour organismes de formation
              </p>
              <h1 className="mt-4 font-display text-[clamp(31px,4.6vw,56px)] font-bold leading-[1.04] tracking-[-0.022em]">
                Vos stagiaires postulent.
                <br />
                Vous suivez la promo.
              </h1>
              <p className="mt-5 max-w-[48ch] font-body text-[16.5px] leading-[1.6] text-klein-soft">
                Chaque stagiaire reçoit les offres qui correspondent à son profil — France Travail,
                Adzuna, Jooble et les sites d&apos;entreprises — avec la lettre et l&apos;e-mail déjà
                préparés, et une relance au bout de quatre jours. Vous voyez qui est inscrit et
                combien de places restent. Jamais les CV, jamais les candidatures.
              </p>
              <div className="mt-7 flex flex-wrap items-center gap-4">
                <Button variant="onBlue" href="/demo">
                  Voir la démonstration
                </Button>
                <Link
                  href="/organisme/inscription"
                  className="font-body text-[14px] text-white underline underline-offset-[3px]"
                >
                  Ouvrir des places pour ma promo
                </Link>
                {/* `Link` et non `<a>` : c'était le seul lien interne de l'accueil à provoquer un
                    rechargement complet du document — perte du préchargement et du rendu client,
                    alors que le bouton juste à côté (`Button href`) passe déjà par `Link`. */}
                <Link
                  href="/login"
                  className="font-body text-[14px] text-klein-soft underline underline-offset-[3px]"
                >
                  J&apos;ai un code d&apos;organisme
                </Link>
              </div>
            </div>

            {/* La carte blanche qui flotte sur le bleu, avec son tampon, est l'image de l'accueil :
                pas de photo (spec §« Décisions »). Contenu d'exemple, relevé d'une offre réelle. */}
            <div className="rounded-tile bg-white p-5 text-ink shadow-hero motion-safe:animate-[rise_400ms_ease-out_120ms_backwards]">
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

        <section className="mx-auto grid max-w-6xl gap-8 px-6 py-11 [&>*]:min-w-0 md:grid-cols-3">
          {COLUMNS.map((column) => (
            <div key={column.title}>
              <h2 className="font-display text-[18px] font-bold leading-[1.2] tracking-[-0.02em]">
                {column.title}
              </h2>
              <p className="mt-1.5 font-body text-[14.5px] leading-[1.55] text-grey">{column.text}</p>
            </div>
          ))}
        </section>

        <section className="mx-auto grid max-w-6xl items-center gap-8 px-6 pb-12 [&>*]:min-w-0 md:grid-cols-2">
          <div>
            <h2 className="font-display text-[30px] font-extrabold leading-[1.05] tracking-[-0.03em]">
              Pour les organismes de formation
            </h2>
            <p className="mt-2.5 max-w-[46ch] font-body text-[15px] leading-[1.55] text-grey">
              Vous achetez des places pour une promo. Chaque stagiaire s&apos;inscrit avec le code de
              l&apos;organisme. Vous voyez qui est inscrit et combien de places restent. Jamais les CV,
              jamais les candidatures.
            </p>
            <Button variant="primary" href="/organisme/inscription" className="mt-5">
              Ouvrir des places
            </Button>
          </div>

          <div className="min-w-0 rounded-tile border border-line bg-white p-5 sm:p-6">
            <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-grey">
              Exemple · code d&apos;organisme · promo électricité
            </p>
            {/* Un mot de huit caractères insécable en 44 px mesure 442 px de large :
                comme aucun enfant de grille ne peut être plus étroit que son contenu
                minimal, il imposait 491 px à toute la page, soit 37 % de débordement
                horizontal sur un écran de 375. Il rétrécit donc avant l'écran. */}
            <p className="tnum mt-2 mb-4 break-all font-display text-[30px] font-extrabold leading-none tracking-[0.06em] sm:text-[44px]">
              K7MZ4P2R
            </p>
            <div className="flex flex-wrap gap-7">
              <Kpi value="12 / 20" label="places utilisées" />
              <Kpi value="47" label="candidatures cette semaine" />
            </div>
          </div>
        </section>
      </main>

      <LegalFooter />
    </div>
  );
}
