"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/button";
import { useToast } from "@/components/toast";

/** « Recalculer les scores » : `POST /api/rescore-jobs`, sans corps, comme avant. */
export function RescoreJobsAction() {
  const [busy, setBusy] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const router = useRouter();
  const { show } = useToast();

  async function rescore() {
    setError("");
    setBusy(true);

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
        setError(payload.error ?? "Les scores n'ont pas pu être recalculés. Réessaie dans un instant.");
        return;
      }

      show(payload.message ?? "Scores recalculés.");
      startTransition(() => router.refresh());
    } catch {
      setError("Connexion perdue. Vérifie ta connexion et réessaie.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <Button variant="quiet" size="sm" onClick={rescore} disabled={busy || pending}>
        Recalculer les scores
      </Button>
      {error ? (
        <p role="alert" className="font-body text-[12.5px] text-bad">
          {error}
        </p>
      ) : null}
    </div>
  );
}
