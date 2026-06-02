"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function RescoreJobsButton() {
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState("");
  const router = useRouter();

  async function handleRescore() {
    setFeedback("");
    try {
      const response = await fetch("/api/rescore-jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const payload = (await response.json()) as {
        ok: boolean;
        message?: string;
        error?: string;
      };

      if (!response.ok || !payload.ok) {
        setFeedback(payload.error ?? "Erreur pendant le rescoring.");
        return;
      }

      setFeedback(payload.message ?? "Rescoring terminé.");
      startTransition(() => {
        router.refresh();
      });
    } catch {
      setFeedback("Erreur réseau pendant le rescoring.");
    }
  }

  return (
    <div className="mt-2 flex items-center gap-3">
      <Button variant="secondary" onClick={handleRescore} disabled={isPending}>
        {isPending ? "Rescoring..." : "Recalculer les scores existants"}
      </Button>
      {feedback ? <span className="text-xs text-slate-300">{feedback}</span> : null}
    </div>
  );
}

