import Link from "next/link";
import { cn } from "@/lib/cn";

// Accès permanent aux textes légaux : rendu sur la page d'accueil, la connexion, l'inscription
// d'organisme et dans l'application connectée.
export function LegalFooter({ className }: { className?: string }) {
  return (
    <footer
      className={cn(
        "mt-10 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 border-t border-[var(--border)] pt-5 text-xs text-[var(--foreground-faint)]",
        className,
      )}
    >
      <span>© ApplyBot</span>
      <Link href="/mentions-legales" className="transition hover:text-[var(--foreground)]">
        Mentions légales
      </Link>
      <Link href="/cgu" className="transition hover:text-[var(--foreground)]">
        CGU
      </Link>
    </footer>
  );
}
