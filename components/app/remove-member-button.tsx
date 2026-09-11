"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Retirer un stagiaire supprime définitivement son compte et ses données : confirmation explicite
// avant l'appel, sur la ligne du tableau.
export function RemoveMemberButton({ userId, email }: { userId: string; email: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/organisation/remove-member", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Une erreur est survenue.");
        return;
      }
      router.refresh();
    } catch {
      setError("Une erreur est survenue.");
    } finally {
      setPending(false);
    }
  }

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="rounded-[9px] border border-[var(--border-strong)] px-3 py-1.5 text-xs text-[var(--foreground-dim)] transition hover:bg-[var(--card-hi)] hover:text-[var(--foreground)]"
      >
        Retirer
      </button>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-2">
        <span className="text-xs text-[var(--foreground-faint)]">Supprimer {email} ?</span>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={pending}
          className="rounded-[9px] border border-[rgba(255,107,107,0.35)] bg-[rgba(255,107,107,0.08)] px-3 py-1.5 text-xs text-[#ff9c9c] transition hover:bg-[rgba(255,107,107,0.16)] disabled:opacity-50"
        >
          {pending ? "Patiente…" : "Confirmer"}
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          disabled={pending}
          className="rounded-[9px] border border-[var(--border-strong)] px-3 py-1.5 text-xs text-[var(--foreground-dim)] transition hover:bg-[var(--card-hi)] disabled:opacity-50"
        >
          Annuler
        </button>
      </div>
      {error ? <p className="text-xs text-[#ff9c9c]">{error}</p> : null}
    </div>
  );
}
