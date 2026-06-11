import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type BadgeVariant = "info" | "warning" | "draft" | "success" | "danger";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

const variantClasses: Record<BadgeVariant, string> = {
  info: "border-[var(--accent-line)] bg-[var(--accent-soft)] text-[var(--accent-text)]",
  warning: "border-[color:color-mix(in_srgb,var(--mid)_35%,transparent)] bg-[var(--mid-soft)] text-[var(--mid)]",
  draft: "border-[var(--border-strong)] bg-[var(--card-hi)] text-[var(--foreground-dim)]",
  success: "border-[color:color-mix(in_srgb,var(--good)_35%,transparent)] bg-[var(--good-soft)] text-[var(--good)]",
  danger: "border-[color:color-mix(in_srgb,var(--danger)_35%,transparent)] bg-[var(--danger-soft)] text-[var(--danger)]",
};

export function Badge({ className, variant = "info", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-[11.5px] font-semibold",
        variantClasses[variant],
        className,
      )}
      {...props}
    />
  );
}
