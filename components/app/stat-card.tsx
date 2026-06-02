import { Card, CardContent } from "@/components/ui/card";

interface StatCardProps {
  label: string;
  value: string;
  change: string;
}

export function StatCard({ label, value, change }: StatCardProps) {
  return (
    <Card>
      <CardContent className="space-y-1 p-4">
        <p className="text-xs uppercase tracking-[0.15em] text-slate-400">{label}</p>
        <p className="text-2xl font-semibold text-white">{value}</p>
        <p className="text-xs text-emerald-300">{change}</p>
      </CardContent>
    </Card>
  );
}
