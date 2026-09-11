"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/cn";
import { LegalFooter } from "@/components/legal-footer";
import type { Role } from "@/lib/auth/jwt";
import type { SessionUser } from "@/lib/auth/session";

interface NavLink {
  href: string;
  label: string;
}

/**
 * Navigation propre à chaque rôle. Le stagiaire est le seul à avoir un parcours de candidature ;
 * le responsable ne voit que son organisme (jamais les CV ni les candidatures de ses stagiaires) ;
 * l'admin ne voit que l'administration. « Profil » est commun : c'est de là que tout compte
 * s'exporte et se supprime.
 */
const LINKS: Record<Role, NavLink[]> = {
  stagiaire: [
    { href: "/jobs", label: "Offres" },
    { href: "/applications", label: "Candidatures" },
    { href: "/suivi", label: "Suivi" },
    { href: "/profil", label: "Profil" },
  ],
  responsable: [
    { href: "/organisme", label: "Mon organisme" },
    { href: "/profil", label: "Profil" },
  ],
  admin: [
    { href: "/admin", label: "Admin" },
    { href: "/profil", label: "Profil" },
  ],
};

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function useSignOut() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function signOut() {
    setPending(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      router.push("/login");
      router.refresh();
    }
  }

  return { pending, signOut };
}

/**
 * Barre bleue de l'application : marque, liens du rôle, e-mail et déconnexion. Remplace l'ancienne
 * paire barre latérale + barre du haut. Sur mobile, les liens se replient dans un `<details>` :
 * l'ouverture est native, sans état React ni script supplémentaire.
 */
export function Shell({ user, children }: { user: SessionUser; children: ReactNode }) {
  const pathname = usePathname() ?? "";
  const links = LINKS[user.role];
  const { pending, signOut } = useSignOut();

  return (
    <div className="flex min-h-full flex-1 flex-col bg-paper">
      <header className="bg-klein text-white">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-6 py-4">
          <Link href="/" className="font-display text-[20px] font-extrabold tracking-[-0.01em] text-white">
            ApplyBot
          </Link>

          <nav aria-label="Navigation principale" className="ml-auto hidden items-center gap-6 md:flex">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                aria-current={isActive(pathname, link.href) ? "page" : undefined}
                className={cn(
                  "font-body text-[13.5px] text-white transition duration-150",
                  isActive(pathname, link.href)
                    ? "border-b-2 border-white pb-[3px] font-semibold"
                    : "opacity-90 hover:opacity-100",
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="ml-6 hidden items-center gap-4 md:flex">
            <span className="font-body text-[12.5px] text-white opacity-90">{user.email}</span>
            <button
              type="button"
              onClick={signOut}
              disabled={pending}
              className="rounded-full border border-white px-3.5 py-1.5 font-body text-[13px] font-medium text-white transition duration-150 hover:bg-white hover:text-klein disabled:opacity-50"
            >
              Se déconnecter
            </button>
          </div>

          <details className="relative ml-auto md:hidden">
            <summary className="cursor-pointer list-none rounded-full border border-white px-3.5 py-1.5 font-body text-[13px] font-medium text-white">
              Menu
            </summary>
            <div className="absolute right-0 z-50 mt-3 flex w-64 flex-col gap-3 rounded-tile border border-line bg-white p-4 text-ink">
              <nav aria-label="Navigation principale (mobile)" className="flex flex-col gap-2">
                {links.map((link) => (
                  <Link key={link.href} href={link.href} className="font-body text-[15px] text-ink">
                    {link.label}
                  </Link>
                ))}
              </nav>
              <p className="border-t border-line pt-3 font-body text-[12.5px] text-grey">{user.email}</p>
              <button
                type="button"
                onClick={signOut}
                disabled={pending}
                className="self-start rounded-full border border-ink px-3.5 py-1.5 font-body text-[13px] font-medium text-ink transition duration-150 hover:bg-paper disabled:opacity-50"
              >
                Se déconnecter
              </button>
            </div>
          </details>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">{children}</main>

      <LegalFooter />
    </div>
  );
}

/**
 * Même barre, pour les pages publiques : pas de compte, donc pas d'e-mail ni de déconnexion, mais
 * les deux portes d'entrée — le code d'organisme pour le stagiaire, la création d'espace pour
 * l'organisme. Le lien de la page courante est omis plutôt que désactivé.
 */
export function PublicBar() {
  const pathname = usePathname() ?? "";

  return (
    <header className="bg-klein text-white">
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-6 py-4">
        <Link href="/" className="font-display text-[20px] font-extrabold tracking-[-0.01em] text-white">
          ApplyBot
        </Link>
        <nav aria-label="Navigation publique" className="ml-auto flex items-center gap-5">
          {pathname === "/login" ? null : (
            <Link href="/login" className="font-body text-[13.5px] text-white opacity-90 hover:opacity-100">
              Connexion
            </Link>
          )}
          {pathname.startsWith("/organisme/inscription") ? null : (
            <Link
              href="/organisme/inscription"
              className="rounded-full bg-white px-3.5 py-2 font-body text-[13.5px] font-semibold text-klein transition duration-150 hover:bg-klein-soft"
            >
              Créer un organisme
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
