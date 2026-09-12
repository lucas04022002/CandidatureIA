import { cn } from "@/lib/cn";

interface KpiProps {
  value: string | number;
  label: string;
  className?: string;
}

export function Kpi({ value, label, className }: KpiProps) {
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <span className="font-display font-extrabold text-ink text-[28px] tnum leading-none">{value}</span>
      <span className="font-mono uppercase tracking-[0.06em] text-grey text-[13px]">{label}</span>
    </div>
  );
}
