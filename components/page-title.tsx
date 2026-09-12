import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

interface PageTitleProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  className?: string;
}

export function PageTitle({ title, subtitle, actions, className }: PageTitleProps) {
  return (
    <div className={cn("flex flex-wrap items-start justify-between gap-4", className)}>
      <div className="flex flex-col gap-1">
        <h1 className="font-display font-extrabold text-ink text-[28px] leading-none">{title}</h1>
        {subtitle ? <p className="font-body text-[15px] text-grey">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </div>
  );
}
