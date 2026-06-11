"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { BriefcaseIcon, FileTextIcon, GridIcon, TargetIcon, UserIcon } from "@/components/app/icons";

interface NavLinksProps {
  mobile?: boolean;
  counts?: {
    jobs: number;
    applications: number;
    followups?: number;
  };
}

const links = [
  { href: "/dashboard", label: "Tableau de bord", icon: GridIcon },
  { href: "/jobs", label: "Offres", icon: BriefcaseIcon, countKey: "jobs" as const },
  { href: "/applications", label: "Candidatures", icon: FileTextIcon, countKey: "applications" as const },
  { href: "/suivi", label: "Suivi", icon: TargetIcon, countKey: "followups" as const },
  { href: "/profil", label: "Profil", icon: UserIcon },
];

export function NavLinks({ mobile = false, counts }: NavLinksProps) {
  const pathname = usePathname();

  return (
    <nav className={cn("flex gap-2", mobile ? "overflow-x-auto pb-1" : "flex-col gap-1")}>
      {links.map((link) => {
        const isActive =
          pathname === link.href || (link.href !== "/dashboard" && pathname.startsWith(link.href));
        const Icon = link.icon;
        const count = link.countKey ? counts?.[link.countKey] : undefined;

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
