import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export function Chip({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-[10px] border border-[var(--border)] bg-[var(--card-soft)] px-2.5 py-1 text-xs text-[var(--foreground-dim)]",
        className,
      )}
      {...props}
    />
  );
}
