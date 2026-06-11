import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type ButtonVariant = "primary" | "secondary" | "ghost";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "border border-transparent bg-[var(--accent)] text-white shadow-[var(--shadow-1),0_8px_20px_-12px_var(--accent)] hover:bg-[var(--accent-press)] focus-visible:outline-[var(--accent)]",
  secondary:
    "border border-[var(--border-strong)] bg-[var(--card)] text-[var(--foreground)] hover:bg-[var(--card-hi)] focus-visible:outline-[var(--accent)]",
  ghost:
    "border border-transparent bg-transparent text-[var(--foreground-dim)] hover:bg-[var(--card-soft)] hover:text-[var(--foreground)] focus-visible:outline-[var(--accent)]",
};

export function Button({
  className,
  variant = "primary",
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-[11px] px-4 py-2 text-sm font-medium transition duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50 active:translate-y-px",
        variantClasses[variant],
        className,
      )}
      {...props}
    />
  );
}
