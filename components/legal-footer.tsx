import Link from "next/link";
import { cn } from "@/lib/cn";

/**
 * Pied légal, présent sur toutes les pages publiques et dans l'application connectée : l'accès aux
 * mentions légales et aux CGU ne doit jamais dépendre de l'endroit où l'on se trouve. La phrase sur
 * les tiers est la promesse du produit, pas un ornement : elle reste affichée en permanence.
 */
export function LegalFooter({ className }: { className?: string }) {
  return (
    <footer className={cn("border-t border-line", className)}>
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-5 gap-y-2 px-6 py-4 font-body text-[13px] text-grey">
        <Link href="/mentions-legales" className="transition duration-150 hover:text-ink">
          Mentions légales
        </Link>
        <Link href="/cgu" className="transition duration-150 hover:text-ink">
          CGU
        </Link>
        <span>ApplyBot ne transmet aucune donnée à un tiers.</span>
      </div>
    </footer>
  );
}
