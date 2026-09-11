"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { RescoreJobsAction } from "@/components/actions/rescore-jobs";
import { ScrapeJobsAction } from "@/components/actions/scrape-jobs";
import { Field, Select } from "@/components/field";
import { cn } from "@/lib/cn";

const RADIUS_OPTIONS = [
  { value: "10", label: "10 km" },
  { value: "20", label: "20 km" },
  { value: "30", label: "30 km" },
  { value: "50", label: "50 km" },
  { value: "100", label: "100 km" },
];

const DEFAULT_LIMIT = 20;

interface SearchControlsProps {
  defaultKeywords?: string;
  defaultLocation?: string;
  className?: string;
}

const inputClasses =
  "w-full rounded-lg border border-line bg-white px-3 py-2.5 font-body text-[14px] text-ink";

/**
 * Métier, lieu, rayon et le bouton de recherche : fusion des anciens `ScrapeJobsControls` et
 * `ScrapeJobsButton`. Les mêmes champs partent à l'API (corps inchangé) et servent aussi de filtre
 * d'affichage, recopiés dans l'URL que la page serveur relit.
 */
export function SearchControls({
  defaultKeywords = "emploi",
  defaultLocation = "",
  className,
}: SearchControlsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [keywords, setKeywords] = useState(searchParams.get("keywords") || defaultKeywords);
  const [location, setLocation] = useState(searchParams.get("location") || defaultLocation);
  const [radiusKm, setRadiusKm] = useState(searchParams.get("radiusKm") || "20");

  const payload = useMemo(
    () => ({
      keywords,
      location,
      limit: DEFAULT_LIMIT,
      radiusKm: Number(radiusKm) || 20,
    }),
    [keywords, location, radiusKm],
  );

  // Les mêmes valeurs pilotent l'affichage : la page serveur relit ces paramètres pour filtrer les
  // offres déjà en base, sans attendre le résultat de la recherche.
  function applyToUrl() {
    const params = new URLSearchParams();
    if (keywords.trim()) params.set("keywords", keywords.trim());
    params.set("limit", String(DEFAULT_LIMIT));
    if (location.trim()) {
      params.set("location", location.trim());
      params.set("radiusKm", String(Number(radiusKm) || 20));
    }
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname);
  }

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_150px_auto]">
        <Field label="Métier">
          <input
            className={inputClasses}
            value={keywords}
            onChange={(event) => setKeywords(event.target.value)}
            placeholder="ex : électricien"
          />
        </Field>

        <Field label="Lieu">
          <input
            className={inputClasses}
            value={location}
            onChange={(event) => setLocation(event.target.value)}
            placeholder="ex : Lyon"
          />
        </Field>

        <Select
          label="Rayon"
          options={RADIUS_OPTIONS}
          value={radiusKm}
          onChange={(event) => setRadiusKm(event.target.value)}
          className="px-3 py-2.5 text-[14px]"
        />

        <ScrapeJobsAction payload={payload} onBeforeRequest={applyToUrl} />
      </div>

      <RescoreJobsAction />
    </div>
  );
}
