"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { BoltIcon, BriefcaseIcon, FileTextIcon, GridIcon, ListIcon, TargetIcon, UserIcon } from "@/components/app/icons";
import type { Role } from "@/lib/auth/jwt";

interface NavLinksProps {
  mobile?: boolean;
  role: Role;
  counts?: {
    jobs: number;
    applications: number;
    followups?: number;
  };
}

// Navigation propre à chaque rôle : le pipeline de candidature n'existe que pour le stagiaire,
// « Mon organisme » que pour le responsable, « Admin » que pour l'admin. « Profil » reste commun :
// c'est de là que tout compte s'exporte et se supprime.
function linksFor(role: Role) {
  const candidate = [
    { href: "/jobs", label: "Offres", icon: BriefcaseIcon, countKey: "jobs" as const },
    { href: "/applications", label: "Candidatures", icon: FileTextIcon, countKey: "applications" as const },
    { href: "/suivi", label: "Suivi", icon: TargetIcon, countKey: "followups" as const },
  ];
  return [
    { href: "/dashboard", label: "Tableau de bord", icon: GridIcon },
    ...(role === "responsable" || role === "admin" ? [] : candidate),
    ...(role === "responsable" ? [{ href: "/organisme", label: "Mon organisme", icon: ListIcon }] : []),
    ...(role === "admin" ? [{ href: "/admin", label: "Admin", icon: BoltIcon }] : []),
    { href: "/profil", label: "Profil", icon: UserIcon },
  ];
}

export function NavLinks({ mobile = false, role, counts }: NavLinksProps) {
  const pathname = usePathname();
  const links = linksFor(role);

  return (
    <nav className={cn("flex gap-2", mobile ? "overflow-x-auto pb-1" : "flex-col gap-1")}>
      {links.map((link) => {
        const isActive =
          pathname === link.href || (link.href !== "/dashboard" && pathname.startsWith(link.href));
        const Icon = link.icon;
        const count = "countKey" in link && link.countKey ? counts?.[link.countKey] : undefined;

        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "group flex items-center gap-3 rounded-[11px] border px-3 py-2.5 text-sm transition duration-150",
              mobile ? "min-w-fit whitespace-nowrap" : "",
              isActive
                ? "border-[var(--accent-line)] bg-[var(--accent-soft)] text-[var(--accent-text)]"
                : "border-transparent text-[var(--foreground-dim)] hover:border-[var(--border)] hover:bg-[var(--card-soft)] hover:text-[var(--foreground)]",
            )}
          >
            <Icon size={16} className="opacity-90" />
            <span>{link.label}</span>
            {typeof count === "number" ? (
              <span
                className={cn(
                  "ml-auto rounded-full border px-2 py-0.5 font-mono text-[11px]",
                  isActive
                    ? "border-[var(--accent-line)] text-[var(--accent-text)]"
                    : "border-[var(--border)] text-[var(--foreground-faint)]",
                )}
              >
                {count}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
