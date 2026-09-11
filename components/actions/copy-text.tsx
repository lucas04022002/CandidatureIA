"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/button";

interface CopyTextActionProps {
  text: string;
  label: string;
}

/** Bouton « Copier … » : même comportement presse-papiers que l'ancien `CopyTextButton`. */
export function CopyTextAction({ text, label }: CopyTextActionProps) {
  const [feedback, setFeedback] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  async function copy() {
    setFeedback("");

    try {
      if (!navigator?.clipboard?.writeText) {
        setFeedback("Presse-papiers indisponible : sélectionne le texte et copie-le à la main.");
        return;
      }

      await navigator.clipboard.writeText(text);
      setFeedback("Copié");
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setFeedback(""), 1600);
    } catch {
      setFeedback("Copie impossible : sélectionne le texte et copie-le à la main.");
    }
  }

  return (
    <span className="inline-flex items-center gap-2">
      <Button variant="quiet" size="sm" onClick={copy}>
        {label}
      </Button>
      {feedback ? (
        <span role="status" className="font-mono text-[12px] text-grey">
          {feedback}
        </span>
      ) : null}
    </span>
  );
}
