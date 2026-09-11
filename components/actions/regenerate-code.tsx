"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/button";
import { useToast } from "@/components/toast";

/**
 * « Régénérer » le code d'organisme. Corps inchangé : `POST /api/organisation/regenerate-code`,
 * sans corps — l'organisme vient de la session, jamais de la requête.
 *
 * Confirmation avant l'appel : régénérer invalide l'ancien code et bloque toute inscription en
 * cours, ce n'est pas un clic anodin.
 */
export function RegenerateCodeAction() {
  const [busy, setBusy] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const router = useRouter();
  const { show } = useToast();

  async function regenerate() {
    setError("");

    const confirmed = window.confirm(
      "Régénérer le code ? L'ancien code cessera de fonctionner : les stagiaires qui ne se sont pas encore inscrits devront utiliser le nouveau.",
    );
    if (!confirmed) return;

    setBusy(true);

    try {
      const response = await fetch("/api/organisation/regenerate-code", { method: "POST" });
      const payload = (await response.json()) as { ok: boolean; code?: string; error?: string };

      if (!response.ok || !payload.ok) {
        setError(payload.error ?? "Le code n'a pas pu être régénéré. Réessayez dans un instant.");
        return;
      }

      show("Code régénéré. Communiquez le nouveau à vos stagiaires.");
      startTransition(() => router.refresh());
    } catch {
      setError("Connexion perdue. Vérifiez votre connexion et réessayez.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <Button variant="secondary" size="sm" onClick={regenerate} disabled={busy || pending}>
        Régénérer
      </Button>
      {error ? (
        <p role="alert" className="font-body text-[12.5px] text-bad">
          {error}
        </p>
      ) : null}
    </div>
  );
}
