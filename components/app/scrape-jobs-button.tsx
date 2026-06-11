"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

interface ScrapeJobsPayload {
  keywords?: string;
  limit?: number;
  location?: string;
  contract?: string;
  remoteOnly?: boolean;
  radiusKm?: number;
}

interface ScrapeJobsButtonProps {
  className?: string;
  label?: string;
  payload?: ScrapeJobsPayload;
  showFeedback?: boolean;
  onBeforeRequest?: () => void | Promise<void>;
}

export function ScrapeJobsButton({
  className,
  label = "Scraper les offres",
  payload,
  showFeedback = true,
  onBeforeRequest,
}: ScrapeJobsButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<string>("");
  const router = useRouter();

  async function handleScrape() {
    setFeedback("");

    try {
      if (onBeforeRequest) {
        await onBeforeRequest();
      }

      const response = await fetch("/api/scrape-jobs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload ?? {}),
      });

      const responsePayload = (await response.json()) as {
        ok: boolean;
        message?: string;
        error?: string;
      };
      const typedPayload = responsePayload as {
        ok: boolean;
        message?: string;
        error?: string;
        sourceMode?: string;
        scoringMode?: string;
        sourcesUsed?: string[];
        sourceErrors?: string[];
      };

      if (!response.ok || !typedPayload.ok) {
        setFeedback(typedPayload.error ?? "Le scraping a échoué.");
        return;
      }

      const sourceLabel =
        typedPayload.sourcesUsed && typedPayload.sourcesUsed.length > 0
          ? `Sources: ${typedPayload.sourcesUsed.join(", ")}.`
          : typedPayload.sourceMode === "multi-source-api"
            ? "Sources: multi-source."
            : "Source: inconnue.";
      const scoringLabel = typedPayload.scoringMode
        ? ` Scoring: ${typedPayload.scoringMode}.`
        : "";
      const warningsLabel =
        typedPayload.sourceErrors && typedPayload.sourceErrors.length > 0
          ? ` Avertissements: ${typedPayload.sourceErrors.slice(0, 2).join(" | ")}`
          : "";

      setFeedback(
        `${typedPayload.message ?? "Scraping terminé."} ${sourceLabel}${scoringLabel}${warningsLabel}`,
      );
      startTransition(() => {
        router.refresh();
      });
    } catch {
      setFeedback("Erreur réseau pendant le scraping.");
    }
  }

  return (
    <div className={className}>
      <Button onClick={handleScrape} disabled={isPending}>
        {isPending ? "Scraping..." : label}
      </Button>
      {showFeedback && feedback ? (
        <p className="mt-2 max-w-[32rem] text-xs leading-5 text-[var(--foreground-dim)]">
          {feedback}
        </p>
      ) : null}
    </div>
  );
}
