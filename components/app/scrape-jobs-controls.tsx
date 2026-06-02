"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ScrapeJobsButton } from "@/components/app/scrape-jobs-button";

const CONTRACT_OPTIONS = [
  { value: "all", label: "Tous contrats" },
  { value: "CDI", label: "CDI" },
  { value: "CDD", label: "CDD" },
  { value: "Alternance", label: "Alternance" },
  { value: "Stage", label: "Stage" },
];

interface ScrapeJobsControlsProps {
  defaultKeywords?: string;
  defaultLocation?: string;
}

export function ScrapeJobsControls({
  defaultKeywords = "emploi",
  defaultLocation = "",
}: ScrapeJobsControlsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [keywords, setKeywords] = useState(
    searchParams.get("keywords") || defaultKeywords,
  );
  const [location, setLocation] = useState(searchParams.get("location") || defaultLocation);
  const [contract, setContract] = useState(searchParams.get("contract") || "all");
  const [limit, setLimit] = useState(searchParams.get("limit") || "20");
  const [remoteOnly, setRemoteOnly] = useState(searchParams.get("remoteOnly") === "true");
  const [radiusKm, setRadiusKm] = useState(searchParams.get("radiusKm") || "20");

  const payload = useMemo(
    () => ({
      keywords,
      location,
      contract,
      limit: Number(limit) || 20,
      remoteOnly,
      radiusKm: Number(radiusKm) || 20,
    }),
    [contract, keywords, limit, location, radiusKm, remoteOnly],
  );

  function applyViewFiltersToUrl() {
    const params = new URLSearchParams();

    if (keywords.trim()) {
      params.set("keywords", keywords.trim());
    }
    params.set("limit", String(Number(limit) || 20));

    if (location.trim()) {
      params.set("location", location.trim());
      params.set("radiusKm", String(Number(radiusKm) || 20));
    }
    if (contract !== "all") {
      params.set("contract", contract);
    }
    if (remoteOnly) {
      params.set("remoteOnly", "true");
    }

    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname);
  }

  return (
    <div className="w-full rounded-2xl border border-white/10 bg-card/80 p-4 md:w-auto md:min-w-[560px]">
      <div className="grid gap-3 md:grid-cols-2">
        <label className="space-y-1">
          <span className="text-xs text-slate-300">Mots-clés</span>
          <input
            value={keywords}
            onChange={(event) => setKeywords(event.target.value)}
            className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-indigo-400"
            placeholder="ex: charge d'affaires, designer, developpeur"
          />
        </label>

        <label className="space-y-1">
          <span className="text-xs text-slate-300">Ville / zone</span>
          <input
            value={location}
            onChange={(event) => setLocation(event.target.value)}
            className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-indigo-400"
            placeholder="ex: Toulouse"
          />
        </label>

        <label className="space-y-1">
          <span className="text-xs text-slate-300">Contrat</span>
          <select
            value={contract}
            onChange={(event) => setContract(event.target.value)}
            className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-indigo-400"
          >
            {CONTRACT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value} className="bg-slate-900">
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-1">
          <span className="text-xs text-slate-300">Nombre max</span>
          <input
            type="number"
            min={1}
            max={50}
            value={limit}
            onChange={(event) => setLimit(event.target.value)}
            className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-indigo-400"
          />
        </label>

        <label className="space-y-1">
          <span className="text-xs text-slate-300">Périmètre (km)</span>
          <input
            type="number"
            min={0}
            max={100}
            value={radiusKm}
            onChange={(event) => setRadiusKm(event.target.value)}
            className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-indigo-400"
            disabled={!location.trim()}
          />
        </label>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3">
        <label className="inline-flex items-center gap-2 text-xs text-slate-300">
          <input
            type="checkbox"
            checked={remoteOnly}
            onChange={(event) => setRemoteOnly(event.target.checked)}
            className="h-4 w-4 rounded border-white/15 bg-white/5"
          />
          Télétravail seulement
        </label>

        <ScrapeJobsButton
          payload={payload}
          label="Lancer le scrape filtré"
          onBeforeRequest={applyViewFiltersToUrl}
        />
      </div>

      <div className="mt-2">
        <button
          type="button"
          className="text-xs text-slate-300 underline-offset-2 hover:underline"
          onClick={applyViewFiltersToUrl}
        >
          Appliquer ces filtres à l&apos;affichage du tableau
        </button>
      </div>
    </div>
  );
}
