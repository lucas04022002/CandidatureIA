"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/button";
import { useToast } from "@/components/toast";

interface GenerateFollowupActionProps {
  applicationId: string;
  label?: string;
}

/** « Préparer la relance » : même route et même corps (`{ applicationId }`) qu'avant. */
export function GenerateFollowupAction({
  applicationId,
  label = "Préparer la relance",
}: GenerateFollowupActionProps) {
  const [busy, setBusy] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const router = useRouter();
  const { show } = useToast();

  async function prepare() {
    setError("");
    setBusy(true);

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
        setError(payload.error ?? "La relance n'a pas pu être préparée. Réessaie dans un instant.");
        return;
      }

      const hint = payload.suggestedDate ? ` À envoyer à partir du ${payload.suggestedDate}.` : "";
      show(`${payload.warning ?? payload.message ?? "Relance préparée."}${hint}`);
      startTransition(() => router.refresh());
    } catch {
      setError("Connexion perdue. Vérifie ta connexion et réessaie.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <Button variant="secondary" onClick={prepare} disabled={busy || pending}>
        {label}
      </Button>
      {error ? (
        <p role="alert" className="font-body text-[12.5px] text-bad">
          {error}
        </p>
      ) : null}
    </div>
  );
}
