import { Card, CardContent } from "@/components/ui/card";

interface StatCardProps {
  label: string;
  value: string;
  change: string;
}

export function StatCard({ label, value, change }: StatCardProps) {
  return (
    <Card>
      <CardContent className="relative overflow-hidden p-4">
        <div className="pointer-events-none absolute bottom-0 right-0 h-16 w-24 opacity-60">
          <svg viewBox="0 0 120 60" className="h-full w-full">
            <path
              d="M4 44 C20 42, 26 18, 40 24 S58 50, 72 34 94 10, 116 16"
              fill="none"
              stroke="var(--accent)"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </div>
        <p className="label-xs">{label}</p>
        <p className="mt-2 font-mono text-[30px] font-semibold tracking-[-0.03em] text-[var(--foreground)]">
          {value}
        </p>
        <p className="mt-2 text-xs text-[var(--good)]">{change}</p>
      </CardContent>
    </Card>
  );
}
