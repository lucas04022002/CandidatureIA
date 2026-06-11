"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import type { ApplicationStatus } from "@/lib/types";

interface ApplicationStatusActionsProps {
  applicationId: string;
  currentStatus: ApplicationStatus;
}

const STATUS_ACTIONS: Record<
  ApplicationStatus,
  { nextStatus: ApplicationStatus; label: string; variant?: "primary" | "secondary" | "ghost" }[]
> = {
  Nouveau: [{ nextStatus: "À valider", label: "Passer à valider", variant: "secondary" }],
  "À valider": [{ nextStatus: "Brouillon", label: "Valider en brouillon" }],
  Brouillon: [
    { nextStatus: "Envoyé", label: "Marquer envoyé" },
    { nextStatus: "Refusé", label: "Marquer refusé", variant: "ghost" },
  ],
  Envoyé: [{ nextStatus: "Refusé", label: "Marquer refusé", variant: "ghost" }],
  Refusé: [{ nextStatus: "Brouillon", label: "Réactiver" }],
};

export function ApplicationStatusActions({
  applicationId,
  currentStatus,
}: ApplicationStatusActionsProps) {
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState("");
  const router = useRouter();

  async function updateStatus(status: ApplicationStatus) {
    setFeedback("");

    try {
      const response = await fetch("/api/update-application-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicationId, status }),
      });

      const payload = (await response.json()) as {
        ok: boolean;
        message?: string;
        warning?: string;
        error?: string;
      };

      if (!response.ok || !payload.ok) {
        setFeedback(payload.error ?? "Erreur pendant la mise à jour du statut.");
        return;
      }

      setFeedback(payload.warning ?? payload.message ?? "Statut mis à jour.");
      startTransition(() => {
        router.refresh();
      });
    } catch {
      setFeedback("Erreur réseau pendant la mise à jour.");
    }
  }

  async function deleteApplication() {
    setFeedback("");

    const confirmed = window.confirm(
      "Supprimer cette candidature ? Cette action retirera aussi son brouillon de la liste.",
    );

    if (!confirmed) {
      return;
    }

    try {
      const response = await fetch("/api/delete-application", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicationId }),
      });

      const payload = (await response.json()) as {
        ok: boolean;
        message?: string;
        warning?: string;
        error?: string;
      };

      if (!response.ok || !payload.ok) {
        setFeedback(payload.error ?? "Erreur pendant la suppression.");
        return;
      }

      setFeedback(payload.warning ?? payload.message ?? "Candidature supprimée.");
      startTransition(() => {
        router.refresh();
      });
    } catch {
      setFeedback("Erreur réseau pendant la suppression.");
    }
  }

  const actions = STATUS_ACTIONS[currentStatus];

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {actions.map((action) => (
          <Button
            key={`${applicationId}-${action.nextStatus}`}
            variant={action.variant ?? "secondary"}
            className="text-xs"
            disabled={isPending}
            onClick={() => updateStatus(action.nextStatus)}
          >
            {isPending ? "Mise à jour..." : action.label}
          </Button>
        ))}
        <Button
          variant="ghost"
          className="text-xs text-[var(--danger)] hover:bg-[var(--danger-soft)] hover:text-[var(--danger)]"
          disabled={isPending}
          onClick={deleteApplication}
        >
          {isPending ? "Suppression..." : "Supprimer la candidature"}
        </Button>
      </div>
      {feedback ? <p className="text-[11px] text-[var(--foreground-dim)]">{feedback}</p> : null}
    </div>
  );
}
