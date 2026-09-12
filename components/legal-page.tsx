import Link from "next/link";
import { LegalFooter } from "@/components/legal-footer";
import { PublicBar } from "@/components/shell";

/**
 * Gabarit commun aux pages légales. Le texte est passé en données (chaînes) plutôt qu'en JSX : les
 * paragraphes juridiques restent lisibles à la relecture, sans échappement d'apostrophes.
 * Mise en page : une colonne de lecture de 65 caractères, titres en Syne (spec §3).
 */
export type LegalBlock = string | { subtitle: string } | { list: string[] };

export interface LegalSection {
  title: string;
  blocks: LegalBlock[];
}

const paragraph = "mt-3 font-body text-[15px] leading-[1.7] text-ink";

export function LegalPage({
  eyebrow,
  title,
  lastUpdate,
  intro,
  sections,
  otherPage,
}: {
  eyebrow: string;
  title: string;
  lastUpdate: string;
  intro?: string;
  sections: LegalSection[];
  otherPage: { href: string; label: string };
}) {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-paper">
      <PublicBar />

      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-12">
        <article className="max-w-[65ch]">
          <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-grey">{eyebrow}</p>
          <h1 className="mt-2 font-display text-[40px] font-extrabold leading-[1.05] tracking-[-0.03em]">
            {title}
          </h1>
          <p className="mt-2 font-mono text-[12.5px] text-grey">{`Dernière mise à jour : ${lastUpdate}.`}</p>
          {intro ? <p className={paragraph}>{intro}</p> : null}

          {sections.map((section) => (
            <section key={section.title} className="mt-10 border-t border-line pt-7">
              <h2 className="font-display text-[22px] font-bold leading-[1.2] tracking-[-0.02em]">
                {section.title}
              </h2>
              {section.blocks.map((block, index) => {
                if (typeof block === "string") {
                  return (
                    <p key={index} className={paragraph}>
                      {block}
                    </p>
                  );
                }
                if ("subtitle" in block) {
                  return (
                    <h3 key={index} className="mt-6 font-display text-[17px] font-bold tracking-[-0.01em]">
                      {block.subtitle}
                    </h3>
                  );
                }
                return (
                  <ul key={index} className="mt-3 list-disc space-y-1 pl-5 font-body text-[15px] leading-[1.7] text-ink">
                    {block.list.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                );
              })}
            </section>
          ))}

          <nav className="mt-12 flex flex-wrap gap-5 border-t border-line pt-6 font-body text-[14px]">
            <Link href={otherPage.href} className="text-klein-deep underline underline-offset-2">
              {otherPage.label}
            </Link>
            <Link href="/" className="text-grey underline underline-offset-2">
              Retour à l&apos;accueil
            </Link>
          </nav>
        </article>
      </main>

      <LegalFooter />
    </div>
  );
}
