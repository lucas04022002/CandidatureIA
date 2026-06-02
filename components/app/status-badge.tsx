import { Badge } from "@/components/ui/badge";
import type { ApplicationStatus } from "@/lib/types";

interface StatusBadgeProps {
  status: ApplicationStatus;
}

const statusToVariant: Record<
  ApplicationStatus,
  "info" | "warning" | "draft" | "success" | "danger"
> = {
  Nouveau: "info",
  "À valider": "warning",
  Brouillon: "draft",
  Envoyé: "success",
  Refusé: "danger",
};

export function StatusBadge({ status }: StatusBadgeProps) {
  return <Badge variant={statusToVariant[status]}>{status}</Badge>;
}
