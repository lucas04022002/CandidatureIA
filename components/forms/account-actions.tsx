"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/button";
import { Field } from "@/components/field";

interface AccountActionsProps {
  email: string;
}

const inputClasses =
  "w-full rounded-lg border border-line bg-white px-3 py-2.5 font-body text-[15px] text-ink";

/**
 * Les deux droits exerçables sans écrire à personne : portabilité (export JSON) et effacement.
 * Routes inchangées : `GET /api/account/export` et `DELETE /api/account`.
 *
 * La suppression demande de recopier son adresse e-mail : un clic seul ne peut pas effacer un
 * compte par inadvertance, et la saisie prouve que l'on sait quel compte on efface.
 */
export function AccountActions({ email }: AccountActionsProps) {
  const router = useRouter();
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");

  const matches = confirmation.trim().toLowerCase() === email.trim().toLowerCase();

  async function exportData() {
    setExporting(true);
    setError("");

    try {
      const response = await fetch("/api/account/export");
      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        setError(payload.error ?? "L'export n'a pas pu être préparé. Réessaie dans un instant.");
        return;
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "applybot-mes-donnees.json";
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch {
      setError("L'export n'a pas pu être préparé. Réessaie dans un instant.");
    } finally {
      setExporting(false);
    }
  }

  async function deleteAccount() {
    if (!matches) return;

    setDeleting(true);
    setError("");

    try {
      const response = await fetch("/api/account", { method: "DELETE" });
      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        setError(payload.error ?? "La suppression n'a pas abouti. Réessaie dans un instant.");
        return;
      }

      router.push("/login");
      router.refresh();
    } catch {
      setError("La suppression n'a pas abouti. Réessaie dans un instant.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col items-start gap-2">
        <Button variant="secondary" onClick={exportData} disabled={exporting}>
          Exporter mes données
        </Button>
        <p className="font-body text-[13px] text-grey">
          Un fichier JSON avec ton profil, tes offres et tes candidatures.
        </p>
      </div>

      <div className="flex flex-col gap-3 border-t border-line pt-5">
        <p className="font-body text-[14px] text-ink">
          La suppression efface ton profil, ton CV, tes offres et tes candidatures. Elle est
          définitive.
        </p>
        <Field label="Recopie ton adresse e-mail pour confirmer">
          <input
            className={inputClasses}
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
            placeholder={email}
            autoComplete="off"
          />
        </Field>
        <div>
          <Button
            variant="danger"
            onClick={deleteAccount}
            disabled={!matches || deleting}
          >
            Supprimer mon compte
          </Button>
        </div>
      </div>

      {error ? (
        <p role="alert" className="font-body text-[13px] text-bad">
          {error}
        </p>
      ) : null}
    </div>
  );
}
