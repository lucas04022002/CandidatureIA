import { cn } from "@/lib/cn";

export type ScoreSize = "tile" | "hero";

const SIZE_CLASSES: Record<ScoreSize, string> = {
  tile: "text-[30px]",
  hero: "text-[40px]",
};

interface ScoreProps {
  value: number;
  size: ScoreSize;
  className?: string;
}

export function Score({ value, size, className }: ScoreProps) {
  return (
    <span className={cn("inline-flex items-baseline gap-1.5", className)}>
      <span className={cn("font-display font-extrabold text-klein tnum leading-none", SIZE_CLASSES[size])}>
        {value}
      </span>
      <small className="font-mono text-grey uppercase tracking-[0.06em]">correspondance</small>
    </span>
  );
}
