"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/button";
import { useToast } from "@/components/toast";

interface RemoveMemberActionProps {
  userId: string;
  email: string;
}

/**
 * « Retirer » un stagiaire de l'organisme. Corps inchangé : `POST /api/organisation/remove-member`
 * avec `{ userId }`.
 *
 * Retirer supprime définitivement le compte et ses données (et libère la place) : confirmation
 * nommant l'adresse concernée avant l'appel.
 */
export function RemoveMemberAction({ userId, email }: RemoveMemberActionProps) {
  const [busy, setBusy] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const router = useRouter();
  const { show } = useToast();

  async function remove() {
    setError("");

    const confirmed = window.confirm(
      `Retirer ${email} ? Son compte et ses données seront supprimés, et sa place sera libérée.`,
    );
    if (!confirmed) return;

    setBusy(true);

    try {
      const response = await fetch("/api/organisation/remove-member", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });

      const payload = (await response.json()) as { ok: boolean; message?: string; error?: string };

      if (!response.ok || !payload.ok) {
        setError(payload.error ?? "Le stagiaire n'a pas pu être retiré. Réessayez dans un instant.");
        return;
      }

      show(payload.message ?? "Stagiaire retiré et données supprimées.");
      startTransition(() => router.refresh());
    } catch {
      setError("Connexion perdue. Vérifiez votre connexion et réessayez.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <Button variant="danger" size="sm" onClick={remove} disabled={busy || pending}>
        Retirer
      </Button>
      {error ? (
        <p role="alert" className="font-body text-[12.5px] text-bad">
          {error}
        </p>
      ) : null}
    </div>
  );
}
