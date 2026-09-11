"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/button";
import { useToast } from "@/components/toast";

export interface ScrapeJobsPayload {
  keywords?: string;
  limit?: number;
  location?: string;
  contract?: string;
  remoteOnly?: boolean;
  radiusKm?: number;
}

interface ScrapeJobsActionProps {
  payload: ScrapeJobsPayload;
  onBeforeRequest?: () => void | Promise<void>;
}

/**
 * « Chercher des offres » : `POST /api/scrape-jobs` avec exactement le corps de l'ancien
 * `ScrapeJobsButton`. Le quota est d'une recherche par heure : quand l'API répond 429, son message
 * (« Prochaine recherche possible à HH:MM ») est affiché tel quel sous le bouton — c'est la seule
 * information utile, et elle vient du serveur qui tient l'horloge.
 */
export function ScrapeJobsAction({ payload, onBeforeRequest }: ScrapeJobsActionProps) {
  const [busy, setBusy] = useState(false);
  const [pending, startTransition] = useTransition();
  const [notice, setNotice] = useState("");
  const router = useRouter();
  const { show } = useToast();

  async function search() {
    setNotice("");
    setBusy(true);

    try {
      if (onBeforeRequest) await onBeforeRequest();

      const response = await fetch("/api/scrape-jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = (await response.json()) as {
        ok: boolean;
        message?: string;
        error?: string;
        sourcesUsed?: string[];
      };

      if (!response.ok || !result.ok) {
        setNotice(result.error ?? "La recherche n'a pas abouti. Réessaie dans un instant.");
        return;
      }

      const sources = result.sourcesUsed?.length ? ` Sources : ${result.sourcesUsed.join(", ")}.` : "";
      show(`${result.message ?? "Recherche terminée."}${sources}`);
      startTransition(() => router.refresh());
    } catch {
      setNotice("Connexion perdue. Vérifie ta connexion et réessaie.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <Button variant="primary" onClick={search} disabled={busy || pending}>
        Chercher des offres
      </Button>
      {notice ? (
        <p role="status" className="font-body text-[12.5px] text-grey">
          {notice}
        </p>
      ) : null}
    </div>
  );
}
