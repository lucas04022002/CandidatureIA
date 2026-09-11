"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/button";
import { useToast } from "@/components/toast";
import type { ApplicationStatus } from "@/lib/types";

interface ApplicationStatusActionsProps {
  applicationId: string;
  status: ApplicationStatus;
}

/**
 * Les deux avancements d'état d'une candidature et sa suppression. Corps inchangés :
 * `{ applicationId, status }` sur `/api/update-application-status`, `{ applicationId }` sur
 * `/api/delete-application`.
 */
export function ApplicationStatusActions({ applicationId, status }: ApplicationStatusActionsProps) {
  const [busy, setBusy] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const router = useRouter();
  const { show } = useToast();

  async function updateStatus(next: ApplicationStatus, confirmation: string) {
    setError("");
    setBusy(true);

    try {
      const response = await fetch("/api/update-application-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicationId, status: next }),
      });

      const payload = (await response.json()) as {
        ok: boolean;
        message?: string;
        warning?: string;
        error?: string;
      };

      if (!response.ok || !payload.ok) {
        setError(payload.error ?? "L'état n'a pas pu être mis à jour. Réessaie dans un instant.");
        return;
      }

      show(payload.warning ?? confirmation);
      startTransition(() => router.refresh());
    } catch {
      setError("Connexion perdue. Vérifie ta connexion et réessaie.");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setError("");

    const confirmed = window.confirm(
      "Supprimer cette candidature ? La lettre, l'e-mail et le message préparés seront effacés.",
    );
    if (!confirmed) return;

    setBusy(true);

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
        setError(payload.error ?? "La candidature n'a pas pu être supprimée. Réessaie dans un instant.");
        return;
      }

      show(payload.warning ?? "Candidature supprimée.");
      startTransition(() => {
        router.push("/applications");
        router.refresh();
      });
    } catch {
      setError("Connexion perdue. Vérifie ta connexion et réessaie.");
    } finally {
      setBusy(false);
    }
  }

  const disabled = busy || pending;

  return (
    <div className="flex flex-col gap-1.5">
      {status === "Envoyé" ? null : (
        <Button
          variant="quiet"
          onClick={() => updateStatus("Envoyé", "Candidature marquée envoyée.")}
          disabled={disabled}
        >
          Marquer envoyée
        </Button>
      )}
      {status === "Refusé" ? null : (
        <Button
          variant="quiet"
          onClick={() => updateStatus("Refusé", "Candidature marquée refusée.")}
          disabled={disabled}
        >
          Marquer refusée
        </Button>
      )}
      <Button variant="danger" onClick={remove} disabled={disabled}>
        Supprimer
      </Button>
      {error ? (
        <p role="alert" className="font-body text-[12.5px] text-bad">
          {error}
        </p>
      ) : null}
    </div>
  );
}
