import { Card, CardContent } from "@/components/ui/card";
import { BoltIcon } from "@/components/app/icons";

interface EmptyStateProps {
  title: string;
  description: string;
}

export function EmptyState({ title, description }: EmptyStateProps) {
  return (
    <Card>
      <CardContent className="p-8 text-center">
        <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-[14px] bg-[var(--accent-soft)] text-[var(--accent-text)]">
          <BoltIcon size={18} />
        </div>
        <h2 className="text-lg font-semibold text-[var(--foreground)]">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-[var(--foreground-dim)]">{description}</p>
      </CardContent>
    </Card>
  );
}
