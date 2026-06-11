"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

interface CopyTextButtonProps {
  text: string;
  label?: string;
}

export function CopyTextButton({ text, label = "Copier" }: CopyTextButtonProps) {
  const [feedback, setFeedback] = useState<string>("");

  async function handleCopy() {
    setFeedback("");

    try {
      if (!navigator?.clipboard?.writeText) {
        setFeedback("Presse-papiers non disponible");
        return;
      }

      await navigator.clipboard.writeText(text);
      setFeedback("Copié");
      setTimeout(() => setFeedback(""), 1600);
    } catch {
      setFeedback("Échec copie");
    }
  }

  return (
    <div className="inline-flex items-center gap-2">
      <Button variant="secondary" className="text-xs" onClick={handleCopy}>
        {label}
      </Button>
      {feedback ? <span className="text-[11px] text-[var(--foreground-dim)]">{feedback}</span> : null}
    </div>
  );
}
