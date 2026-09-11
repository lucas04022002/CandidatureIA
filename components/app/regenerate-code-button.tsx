"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

// Confirmation en deux temps plutôt qu'un `confirm()` natif : régénérer invalide l'ancien code et
// bloque toute inscription en cours, ce n'est pas un clic anodin.
export function RegenerateCodeButton() {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/organisation/regenerate-code", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Une erreur est survenue.");
        return;
      }
      setConfirming(false);
      router.refresh();
    } catch {
      setError("Une erreur est survenue.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-2">
      {confirming ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-[var(--foreground-dim)]">
            L&apos;ancien code cessera de fonctionner. Confirmer ?
          </span>
          <Button onClick={handleConfirm} disabled={pending}>
            {pending ? "Patiente…" : "Confirmer"}
          </Button>
          <Button variant="secondary" onClick={() => setConfirming(false)} disabled={pending}>
            Annuler
          </Button>
        </div>
      ) : (
        <Button variant="secondary" onClick={() => setConfirming(true)}>
          Régénérer le code
        </Button>
      )}
      {error ? <p className="text-sm text-[#ff9c9c]">{error}</p> : null}
    </div>
  );
}
