import Link from "next/link";

/**
 * Gabarit commun aux pages légales. Le texte est passé en données (chaînes) plutôt qu'en JSX : les
 * paragraphes juridiques restent lisibles à la relecture, sans échappement d'apostrophes.
 */
export type LegalBlock = string | { subtitle: string } | { list: string[] };

export interface LegalSection {
  title: string;
  blocks: LegalBlock[];
}

const paragraph = "mt-3 text-sm leading-7 text-[var(--foreground-dim)]";

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
    <div className="mx-auto w-full max-w-[760px] px-4 py-12 md:py-16">
      <Link href="/" className="flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-[linear-gradient(145deg,var(--accent),var(--accent-press))] text-white shadow-[var(--shadow-1),0_6px_18px_-8px_var(--accent)]">
          A
        </span>
        <span>
          <span className="block text-base font-semibold tracking-[-0.02em] text-[var(--foreground)]">ApplyBot</span>
          <span className="block text-[11px] text-[var(--foreground-faint)]">Agent de candidature</span>
        </span>
      </Link>

      <p className="label-xs mt-10">{eyebrow}</p>
      <h1 className="mt-2 text-[32px] font-semibold tracking-[-0.03em] text-[var(--foreground)]">{title}</h1>
      <p className="mt-2 text-sm text-[var(--foreground-faint)]">{`Dernière mise à jour : ${lastUpdate}.`}</p>
      {intro ? <p className={paragraph}>{intro}</p> : null}

      {sections.map((section) => (
        <section key={section.title} className="mt-10 border-t border-[var(--border)] pt-8">
          <h2 className="text-[20px] font-semibold tracking-[-0.02em] text-[var(--foreground)]">{section.title}</h2>
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
                <h3 key={index} className="mt-6 text-[15px] font-semibold text-[var(--foreground)]">
                  {block.subtitle}
                </h3>
              );
            }
            return (
              <ul key={index} className="mt-3 list-disc space-y-1 pl-5 text-sm leading-7 text-[var(--foreground-dim)]">
                {block.list.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            );
          })}
        </section>
      ))}

      <nav className="mt-12 flex flex-wrap gap-4 border-t border-[var(--border)] pt-6 text-sm">
        <Link href={otherPage.href} className="text-[var(--accent)] hover:underline">
          {otherPage.label}
        </Link>
        <Link href="/" className="text-[var(--foreground-dim)] hover:underline">
          Retour à l&apos;accueil
        </Link>
      </nav>
    </div>
  );
}
