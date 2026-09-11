"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/button";

interface ApplyOfferActionProps {
  jobId: string;
  jobUrl: string | null;
}

/**
 * « Postuler sur le site de l'offre » : ouvre l'annonce dans un nouvel onglet ET enregistre le clic
 * (`POST /api/mark-job-applied` avec `{ jobId }`), comme l'ancien `ApplyOfferButton`. L'onglet
 * s'ouvre même si l'enregistrement échoue : c'est l'action de l'utilisateur qui prime.
 */
export function ApplyOfferAction({ jobId, jobUrl }: ApplyOfferActionProps) {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  async function apply() {
    setMessage("");

    if (!jobUrl) {
      setMessage("Le lien de l'offre est indisponible. Cherche l'annonce par son titre.");
      return;
    }

    setBusy(true);

    try {
      const response = await fetch("/api/mark-job-applied", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId }),
      });

      const payload = (await response.json()) as { ok: boolean; error?: string };

      if (!response.ok || !payload.ok) {
        setMessage(payload.error ?? "Le clic n'a pas été enregistré, l'annonce s'ouvre quand même.");
      }

      window.open(jobUrl, "_blank", "noopener,noreferrer");
      startTransition(() => router.refresh());
    } catch {
      window.open(jobUrl, "_blank", "noopener,noreferrer");
      setMessage("Annonce ouverte, sans enregistrement du clic.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <Button variant="primary" onClick={apply} disabled={busy || pending || !jobUrl}>
        Postuler sur le site de l&apos;offre
      </Button>
      {message ? (
        <p role="status" className="font-body text-[12.5px] text-grey">
          {message}
        </p>
      ) : null}
    </div>
  );
}
