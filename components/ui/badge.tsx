import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type BadgeVariant = "info" | "warning" | "draft" | "success" | "danger";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

const variantClasses: Record<BadgeVariant, string> = {
  info: "bg-sky-500/15 text-sky-300 border-sky-500/30",
  warning: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  draft: "bg-slate-500/20 text-slate-200 border-slate-400/30",
  success: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  danger: "bg-rose-500/15 text-rose-300 border-rose-500/30",
};

export function Badge({ className, variant = "info", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium",
        variantClasses[variant],
        className,
      )}
      {...props}
    />
  );
}
