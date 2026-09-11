"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

// Formulaire inline d'une ligne du tableau d'administration : activation et nombre de places.
export function OrganisationSeatsForm({
  id,
  active,
  seats,
}: {
  id: string;
  active: boolean;
  seats: number;
}) {
  const router = useRouter();
  const [nextActive, setNextActive] = useState(active);
  const [nextSeats, setNextSeats] = useState(String(seats));
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch("/api/admin/organisation", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id, active: nextActive, seats: Number(nextSeats) }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Une erreur est survenue.");
        return;
      }
      setSaved(true);
      router.refresh();
    } catch {
      setError("Une erreur est survenue.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-center justify-end gap-2">
      <label className="flex items-center gap-2 text-xs text-[var(--foreground-dim)]">
        <input
          type="checkbox"
          checked={nextActive}
          onChange={(event) => setNextActive(event.target.checked)}
          className="h-4 w-4 accent-[var(--accent)]"
        />
        Actif
      </label>
      <label className="flex items-center gap-2 text-xs text-[var(--foreground-dim)]">
        Places
        <input
          type="number"
          min={0}
          max={10000}
          required
          value={nextSeats}
          onChange={(event) => setNextSeats(event.target.value)}
          className="w-20 rounded-[9px] border border-[var(--border-strong)] bg-[var(--card)] px-2 py-1 text-sm text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none"
        />
      </label>
      <Button type="submit" disabled={pending} className="px-3 py-1.5 text-xs">
        {pending ? "Patiente…" : "Enregistrer"}
      </Button>
      {saved && !error ? <span className="text-xs text-[var(--good)]">Enregistré</span> : null}
      {error ? <span className="text-xs text-[#ff9c9c]">{error}</span> : null}
    </form>
  );
}
