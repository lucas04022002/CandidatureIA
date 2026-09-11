import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/cn";

export type ButtonVariant = "primary" | "secondary" | "onBlue" | "quiet" | "danger";
export type ButtonSize = "md" | "sm";

interface ButtonSharedProps {
  variant: ButtonVariant;
  size?: ButtonSize;
  pending?: boolean;
  className?: string;
  children: ReactNode;
}

type ButtonAsButton = ButtonSharedProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className" | "children"> & {
    href?: undefined;
  };

type ButtonAsAnchor = ButtonSharedProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "className" | "children"> & {
    href: string;
  };

export type ButtonProps = ButtonAsButton | ButtonAsAnchor;

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: "bg-klein text-white hover:bg-klein-deep",
  secondary: "border border-ink text-ink bg-white hover:bg-paper",
  onBlue: "bg-white text-klein hover:bg-klein-soft",
  quiet: "text-klein-deep bg-transparent hover:bg-klein-soft",
  // Même dessin que `quiet`, en rouge sémantique : une action destructrice (supprimer une
  // candidature, un compte) doit se distinguer sans hurler. Déclarée ici plutôt qu'ajoutée par
  // `className` : deux utilitaires de couleur ont la même spécificité, c'est leur ordre dans la
  // feuille qui tranche, pas leur ordre dans l'attribut — `text-bad` posé après `text-klein-deep`
  // sortait bleu (constaté au navigateur).
  danger: "text-bad bg-transparent hover:bg-bad-soft",
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  md: "px-5 py-2.5 text-[15px]",
  sm: "px-3.5 py-1.5 text-[13px]",
};

export function Button({
  variant,
  size = "md",
  pending = false,
  className,
  children,
  href,
  ...rest
}: ButtonProps) {
  const classes = cn(
    "inline-flex items-center justify-center gap-2 rounded-full font-body font-medium transition duration-150 disabled:cursor-not-allowed disabled:opacity-50",
    VARIANT_CLASSES[variant],
    SIZE_CLASSES[size],
    className,
  );

  const content = (
    <>
      {children}
      {pending ? "…" : null}
    </>
  );

  if (href !== undefined) {
    // `Link` et non `<a>` : un bouton d'action qui recharge toute la page fait perdre la navigation
    // client de l'App Router (et le préchargement au survol). Le rendu reste une balise <a>.
    return (
      <Link href={href} className={classes} {...(rest as AnchorHTMLAttributes<HTMLAnchorElement>)}>
        {content}
      </Link>
    );
  }

  const { disabled, ...buttonRest } = rest as ButtonHTMLAttributes<HTMLButtonElement>;

  return (
    <button type="button" className={classes} disabled={pending || disabled} {...buttonRest}>
      {content}
    </button>
  );
}
