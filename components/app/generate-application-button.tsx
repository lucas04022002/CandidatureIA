"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

interface GenerateApplicationButtonProps {
  jobId: string;
}

export function GenerateApplicationButton({ jobId }: GenerateApplicationButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<string>("");
  const router = useRouter();

  async function handleGenerate() {
    setFeedback("");

    try {
      const response = await fetch("/api/generate-application", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId }),
      });

      const payload = (await response.json()) as {
        ok: boolean;
        message?: string;
        error?: string;
        warning?: string;
      };

      if (!response.ok || !payload.ok) {
        setFeedback(payload.error ?? "Erreur pendant la génération.");
        return;
      }

      setFeedback(payload.warning ?? payload.message ?? "Candidature générée.");
      startTransition(() => {
        router.refresh();
      });
    } catch {
      setFeedback("Erreur réseau pendant la génération.");
    }
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <Button variant="secondary" className="text-xs" onClick={handleGenerate} disabled={isPending}>
        {isPending ? "Génération..." : "Générer candidature"}
      </Button>
      {feedback ? <p className="text-[11px] text-[var(--foreground-dim)]">{feedback}</p> : null}
    </div>
  );
}
