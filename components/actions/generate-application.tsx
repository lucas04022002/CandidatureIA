"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/button";
import { useToast } from "@/components/toast";

interface GenerateApplicationActionProps {
  jobId: string;
}

/**
 * « Préparer ma candidature » : même route, même corps (`{ jobId }`) que l'ancien
 * `GenerateApplicationButton`. La lettre, l'e-mail et le message sont écrits côté serveur, puis la
 * page se rafraîchit pour montrer la fiche.
 */
export function GenerateApplicationAction({ jobId }: GenerateApplicationActionProps) {
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const { show } = useToast();

  async function prepare() {
    setError("");
    setBusy(true);

    try {
      const response = await fetch("/api/generate-application", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId }),
      });

      const payload = (await response.json()) as {
        ok: boolean;
        message?: string;
        warning?: string;
        error?: string;
      };

      if (!response.ok || !payload.ok) {
        setError(payload.error ?? "La candidature n'a pas pu être préparée. Réessaie dans un instant.");
        return;
      }

      show(payload.warning ?? payload.message ?? "Candidature préparée.");
      startTransition(() => router.refresh());
    } catch {
      setError("Connexion perdue. Vérifie ta connexion et réessaie.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <Button variant="quiet" size="sm" onClick={prepare} disabled={busy || pending}>
        Préparer ma candidature
      </Button>
      {error ? (
        <p role="alert" className="font-body text-[12.5px] text-bad">
          {error}
        </p>
      ) : null}
    </div>
  );
}
