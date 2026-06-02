"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

interface ApplyOfferButtonProps {
  jobId: string;
  jobUrl: string | null;
}

export function ApplyOfferButton({ jobId, jobUrl }: ApplyOfferButtonProps) {
  const [feedback, setFeedback] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  async function handleApply() {
    setFeedback("");

    if (!jobUrl) {
      setFeedback("Lien d'offre indisponible");
      return;
    }

    try {
      const response = await fetch("/api/mark-job-applied", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId }),
      });

      const payload = (await response.json()) as {
        ok: boolean;
        error?: string;
      };

      if (!response.ok || !payload.ok) {
        setFeedback(payload.error ?? "Impossible d'enregistrer le clic");
      } else {
        setFeedback("Postulation ouverte");
      }

      window.open(jobUrl, "_blank", "noopener,noreferrer");

      startTransition(() => {
        router.refresh();
      });
    } catch {
      window.open(jobUrl, "_blank", "noopener,noreferrer");
      setFeedback("Annonce ouverte (sans enregistrement du clic)");
    }
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <Button
        variant="secondary"
        className="text-xs"
        onClick={handleApply}
        disabled={isPending || !jobUrl}
      >
        {isPending ? "Ouverture..." : "Postuler sur l'offre"}
      </Button>
      {feedback ? <span className="text-[11px] text-slate-400">{feedback}</span> : null}
      {!jobUrl ? <span className="text-[11px] text-slate-400">Lien d&apos;offre indisponible</span> : null}
    </div>
  );
}
