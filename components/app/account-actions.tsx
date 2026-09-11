"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

// Les deux droits RGPD exerçables sans écrire à personne : portabilité (export JSON) et effacement.
export function AccountActions() {
  const router = useRouter();
  const [exporting, setExporting] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleExport() {
    setExporting(true);
    setError(null);
    try {
      const res = await fetch("/api/account/export");
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(typeof data.error === "string" ? data.error : "Export impossible.");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "applybot-donnees.json";
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch {
      setError("Export impossible.");
    } finally {
      setExporting(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch("/api/account", { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(typeof data.error === "string" ? data.error : "Suppression impossible.");
        return;
      }
      router.push("/login");
      router.refresh();
    } catch {
      setError("Suppression impossible.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-3">
        <Button variant="secondary" onClick={handleExport} disabled={exporting}>
          {exporting ? "Préparation…" : "Exporter mes données"}
        </Button>
        {confirming ? null : (
          <Button variant="ghost" onClick={() => setConfirming(true)}>
            Supprimer mon compte
          </Button>
        )}
      </div>

      {confirming ? (
        <div className="rounded-[14px] border border-[rgba(255,107,107,0.35)] bg-[rgba(255,107,107,0.08)] p-4">
          <p className="text-sm text-[#ff9c9c]">
            La suppression efface définitivement ton profil, ton CV importé, tes offres et tes
            candidatures. Cette action est irréversible.
          </p>
          <div className="mt-3 flex flex-wrap gap-3">
            <Button onClick={handleDelete} disabled={deleting}>
              {deleting ? "Suppression…" : "Oui, supprimer mon compte"}
            </Button>
            <Button variant="secondary" onClick={() => setConfirming(false)} disabled={deleting}>
              Annuler
            </Button>
          </div>
        </div>
      ) : null}

      {error ? <p className="text-sm text-[#ff9c9c]">{error}</p> : null}
    </div>
  );
}
