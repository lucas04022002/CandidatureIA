"use client";

import { useRef, useState, useTransition, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/button";

interface CvUploadProps {
  /** Libellé du bouton : « Importer mon CV » au premier import, « Remplacer mon CV » ensuite. */
  imported: boolean;
}

/**
 * Import du CV : `POST /api/import-cv` avec un `FormData` dont le champ s'appelle `cv` — la route
 * ne lit que celui-là. Le fichier n'est jamais gardé côté client.
 */
export function CvUpload({ imported }: CvUploadProps) {
  const input = useRef<HTMLInputElement | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("cv", file);
    setMessage("");
    setError("");
    setBusy(true);

    try {
      const response = await fetch("/api/import-cv", { method: "POST", body: formData });
      const payload = (await response.json().catch(() => null)) as {
        ok: boolean;
        message?: string;
        warning?: string;
        error?: string;
        rescored?: number;
      } | null;

      if (!response.ok || !payload?.ok) {
        setError(payload?.error ?? "Le CV n'a pas pu être lu. Essaie un PDF ou un fichier .txt.");
        return;
      }

      const rescored =
        typeof payload.rescored === "number" ? ` ${payload.rescored} offre(s) reclassée(s).` : "";
      setMessage(`${payload.warning ?? payload.message ?? "CV importé."}${rescored}`);
      startTransition(() => router.refresh());
    } catch {
      setError("Connexion perdue. Vérifie ta connexion et réessaie.");
    } finally {
      setBusy(false);
      event.target.value = "";
    }
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <input
        ref={input}
        type="file"
        accept=".pdf,.txt"
        className="hidden"
        onChange={upload}
        aria-label="Fichier de CV"
      />
      <Button
        variant="secondary"
        onClick={() => input.current?.click()}
        disabled={busy || pending}
      >
        {imported ? "Remplacer mon CV" : "Importer mon CV"}
      </Button>
      <p className="font-body text-[12.5px] text-grey">PDF ou .txt, 5 Mo maximum.</p>
      {message ? (
        <p role="status" className="font-body text-[13px] text-good">
          {message}
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="font-body text-[13px] text-bad">
          {error}
        </p>
      ) : null}
    </div>
  );
}
