"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { FilterIcon, MapPinIcon, TargetIcon } from "@/components/app/icons";
import { RescoreJobsButton } from "@/components/app/rescore-jobs-button";
import { ScrapeJobsButton } from "@/components/app/scrape-jobs-button";
import { Chip } from "@/components/ui/chip";

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
  resultCount: number;
  currentTarget?: string;
  averageScore?: number;
  topMatches?: number;
}

export function ScrapeJobsControls({
  defaultKeywords = "emploi",
  defaultLocation = "",
  resultCount,
  currentTarget,
  averageScore = 0,
  topMatches = 0,
}: ScrapeJobsControlsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [keywords, setKeywords] = useState(searchParams.get("keywords") || defaultKeywords);
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
    <div className="space-y-4 rounded-[24px] border border-[var(--border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.018))] p-5 shadow-[var(--shadow-2)]">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 text-[var(--foreground-dim)]">
            <FilterIcon size={15} />
            <p className="label-xs">Filtres de recherche</p>
          </div>
          <p className="max-w-2xl text-sm leading-6 text-[var(--foreground-dim)]">
            Lance un nouveau scrape cible ou applique ces filtres seulement a l&apos;affichage du
            pipeline.
          </p>
          <div className="flex flex-wrap gap-2">
            {currentTarget ? (
              <Chip>
                <TargetIcon size={13} />
                {currentTarget}
              </Chip>
            ) : null}
            {location ? (
              <Chip>
                <MapPinIcon size={13} />
                {location}
              </Chip>
            ) : null}
            <Chip>{resultCount} resultat(s)</Chip>
            <Chip>Score moyen {averageScore}/100</Chip>
            <Chip>{topMatches} top match(es)</Chip>
          </div>
        </div>

        <div className="rounded-[18px] border border-[var(--border)] bg-[var(--card-soft)]/55 px-4 py-3">
          <p className="text-[11px] uppercase tracking-[0.14em] text-[var(--foreground-faint)]">
            Pipeline actif
          </p>
          <div className="mt-2 grid grid-cols-3 gap-3">
            <div>
              <p className="text-[11px] text-[var(--foreground-faint)]">Resultats</p>
              <p className="mt-1 text-lg font-semibold text-[var(--foreground)]">{resultCount}</p>
            </div>
            <div>
              <p className="text-[11px] text-[var(--foreground-faint)]">Top match</p>
              <p className="mt-1 text-lg font-semibold text-[var(--foreground)]">{topMatches}</p>
            </div>
            <div>
              <p className="text-[11px] text-[var(--foreground-faint)]">Limite</p>
              <p className="mt-1 text-lg font-semibold text-[var(--foreground)]">
                {Number(limit) || 20}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1.2fr_1fr_180px_130px]">
        <label className="space-y-1.5">
          <span className="text-xs text-[var(--foreground-dim)]">Mots-cles</span>
          <input
            value={keywords}
            onChange={(event) => setKeywords(event.target.value)}
            className="w-full rounded-[12px] border border-[var(--border)] bg-[var(--card)] px-3 py-2.5 text-sm text-[var(--foreground)] outline-none transition focus:border-[var(--accent-line)]"
            placeholder="ex: charge d'affaires, designer, developpeur"
          />
        </label>

        <label className="space-y-1.5">
          <span className="text-xs text-[var(--foreground-dim)]">Ville / zone</span>
          <input
            value={location}
            onChange={(event) => setLocation(event.target.value)}
            className="w-full rounded-[12px] border border-[var(--border)] bg-[var(--card)] px-3 py-2.5 text-sm text-[var(--foreground)] outline-none transition focus:border-[var(--accent-line)]"
            placeholder="ex: Toulouse"
          />
        </label>

        <label className="space-y-1.5">
          <span className="text-xs text-[var(--foreground-dim)]">Nombre max</span>
          <input
            type="number"
            min={1}
            max={50}
            value={limit}
            onChange={(event) => setLimit(event.target.value)}
            className="w-full rounded-[12px] border border-[var(--border)] bg-[var(--card)] px-3 py-2.5 text-sm text-[var(--foreground)] outline-none transition focus:border-[var(--accent-line)]"
          />
        </label>

        <label className="space-y-1.5">
          <span className="text-xs text-[var(--foreground-dim)]">Perimetre (km)</span>
          <input
            type="number"
            min={0}
            max={100}
            value={radiusKm}
            onChange={(event) => setRadiusKm(event.target.value)}
            className="w-full rounded-[12px] border border-[var(--border)] bg-[var(--card)] px-3 py-2.5 text-sm text-[var(--foreground)] outline-none transition focus:border-[var(--accent-line)] disabled:opacity-50"
            disabled={!location.trim()}
          />
        </label>
      </div>

      <div className="space-y-2">
        <span className="text-xs text-[var(--foreground-dim)]">Contrat</span>
        <div className="flex flex-wrap gap-2">
          {CONTRACT_OPTIONS.map((option) => {
            const isActive = contract === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => setContract(option.value)}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                  isActive
                    ? "border-[var(--accent-line)] bg-[var(--accent-soft)] text-[var(--accent-text)]"
                    : "border-[var(--border)] bg-[var(--card-soft)] text-[var(--foreground-dim)] hover:text-[var(--foreground)]"
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-3 border-t border-[var(--border)] pt-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <label className="inline-flex items-center gap-2 text-sm text-[var(--foreground-dim)]">
            <input
              type="checkbox"
              checked={remoteOnly}
              onChange={(event) => setRemoteOnly(event.target.checked)}
              className="h-4 w-4 rounded border-[var(--border)] bg-[var(--card)]"
            />
            Teletravail seulement
          </label>

          <button
            type="button"
            className="text-sm text-[var(--foreground-dim)] underline-offset-4 transition hover:text-[var(--foreground)] hover:underline"
            onClick={applyViewFiltersToUrl}
          >
            Appliquer a l&apos;affichage
          </button>
        </div>

        <div className="flex flex-col gap-3 lg:items-end">
          <ScrapeJobsButton
            payload={payload}
            label="Lancer le scrape filtre"
            onBeforeRequest={applyViewFiltersToUrl}
          />
          <RescoreJobsButton />
        </div>
      </div>
    </div>
  );
}
