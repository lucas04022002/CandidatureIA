"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

interface GenerateFollowupButtonProps {
  applicationId: string;
}

export function GenerateFollowupButton({ applicationId }: GenerateFollowupButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState("");
  const router = useRouter();

  async function handleGenerate() {
    setFeedback("");

    try {
      const response = await fetch("/api/generate-followup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicationId }),
      });

      const payload = (await response.json()) as {
        ok: boolean;
        message?: string;
        warning?: string;
        error?: string;
        suggestedDate?: string;
      };

      if (!response.ok || !payload.ok) {
        setFeedback(payload.error ?? "Erreur pendant la génération de relance.");
        return;
      }

      const dateHint = payload.suggestedDate ? ` Date conseillée: ${payload.suggestedDate}.` : "";
      setFeedback(`${payload.warning ?? payload.message ?? "Relance générée."}${dateHint}`);

      startTransition(() => {
        router.refresh();
      });
    } catch {
      setFeedback("Erreur réseau pendant la génération de relance.");
    }
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <Button variant="secondary" className="text-xs" onClick={handleGenerate} disabled={isPending}>
        {isPending ? "Génération..." : "Générer relance J+4"}
      </Button>
      {feedback ? <p className="text-[11px] text-[var(--foreground-dim)]">{feedback}</p> : null}
    </div>
  );
}
