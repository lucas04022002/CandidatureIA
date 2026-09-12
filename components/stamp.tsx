import { cn } from "@/lib/cn";
import type { ApplicationStatus } from "@/lib/types";

export type StampStatus = ApplicationStatus | "À relancer";

interface StampConfig {
  rotation: number;
  color: string;
  border: string;
}

const STAMP_CONFIG: Record<StampStatus, StampConfig> = {
  Envoyé: { rotation: -5, color: "text-klein", border: "border-klein" },
  "À relancer": { rotation: 3, color: "text-klein", border: "border-klein" },
  Refusé: { rotation: -2, color: "text-bad", border: "border-bad" },
  Nouveau: { rotation: 0, color: "text-grey", border: "border-grey" },
  "À valider": { rotation: 0, color: "text-grey", border: "border-grey" },
  Brouillon: { rotation: 0, color: "text-grey", border: "border-grey" },
};

interface StampProps {
  status: StampStatus;
  className?: string;
}

export function Stamp({ status, className }: StampProps) {
  const config = STAMP_CONFIG[status];
  return (
    <span
      className={cn(
        "font-stamp uppercase tracking-[0.14em] border-[2.5px] rounded-stamp px-2.5 py-1.5 inline-block stamp-mask",
        config.color,
        config.border,
        className,
      )}
      style={{ transform: `rotate(${config.rotation}deg)` }}
    >
      {status}
    </span>
  );
}
