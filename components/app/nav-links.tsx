"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

interface NavLinksProps {
  mobile?: boolean;
}

const links = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/jobs", label: "Offres" },
  { href: "/applications", label: "Candidatures" },
];

export function NavLinks({ mobile = false }: NavLinksProps) {
  const pathname = usePathname();

  return (
    <nav className={cn("flex gap-2", mobile ? "overflow-x-auto pb-1" : "flex-col")}>
      {links.map((link) => {
        const isActive =
          pathname === link.href || (link.href !== "/dashboard" && pathname.startsWith(link.href));

        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "rounded-xl px-3 py-2 text-sm transition",
              mobile ? "whitespace-nowrap" : "",
              isActive
                ? "bg-indigo-500/20 text-indigo-200"
                : "text-slate-300 hover:bg-white/5 hover:text-white",
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
