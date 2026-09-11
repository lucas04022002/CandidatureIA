"use client";

import { useImperativeHandle, useState, useTransition, type Ref } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/button";
import { useToast } from "@/components/toast";

// Les seuls champs que `SearchControls` remplit. Le schéma de la route en accepte deux autres
// (`contract`, `remoteOnly`), sans formulaire pour les produire : les déclarer ici laisserait croire
// qu'ils partent.
export interface ScrapeJobsPayload {
  keywords: string;
  location: string;
  limit: number;
  radiusKm: number;
}

export interface ScrapeJobsHandle {
  search: () => void;
}

interface ScrapeJobsActionProps {
  payload: ScrapeJobsPayload;
  /** Appelé seulement quand la recherche a abouti (voir `search`). */
  onSuccess?: () => void;
  /** Expose `search()` au formulaire parent, qui déclenche la recherche sur `submit`. */
  ref?: Ref<ScrapeJobsHandle>;
}

/**
 * « Chercher des offres » : `POST /api/scrape-jobs` avec exactement le corps de l'ancien
 * `ScrapeJobsButton`. Le quota est d'une recherche par heure : quand l'API répond 429, son message
 * (« Prochaine recherche possible à HH:MM ») est affiché tel quel sous le bouton — c'est la seule
 * information utile, et elle vient du serveur qui tient l'horloge.
 */
export function ScrapeJobsAction({ payload, onSuccess, ref }: ScrapeJobsActionProps) {
  const [busy, setBusy] = useState(false);
  const [pending, startTransition] = useTransition();
  const [notice, setNotice] = useState("");
  const router = useRouter();
  const { show } = useToast();

  async function search() {
    setNotice("");
    setBusy(true);

    try {
      const response = await fetch("/api/scrape-jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = (await response.json()) as {
        ok: boolean;
        message?: string;
        error?: string;
        sourcesUsed?: string[];
      };

      if (!response.ok || !result.ok) {
        setNotice(result.error ?? "La recherche n'a pas abouti. Réessaie dans un instant.");
        return;
      }

      const sources = result.sourcesUsed?.length ? ` Sources : ${result.sourcesUsed.join(", ")}.` : "";
      show(`${result.message ?? "Recherche terminée."}${sources}`);
      // Les filtres ne sont recopiés dans l'URL qu'ici : une recherche refusée (quota horaire) ne
      // doit pas vider la liste déjà à l'écran. Constaté au navigateur — après un 429, la page
      // affichait « Aucune offre pour l'instant » alors que rien n'avait été cherché.
      onSuccess?.();
      startTransition(() => router.refresh());
    } catch {
      setNotice("Connexion perdue. Vérifie ta connexion et réessaie.");
    } finally {
      setBusy(false);
    }
  }

  useImperativeHandle(ref, () => ({ search }));

  return (
    <div className="flex flex-col gap-1.5">
      {/* `type="submit"` et pas de `onClick` : le clic et la touche Entrée passent tous deux par le
          `submit` du formulaire parent, donc par un seul chemin. */}
      <Button variant="primary" type="submit" disabled={busy || pending}>
        Chercher des offres
      </Button>
      {notice ? (
        <p role="status" className="font-body text-[12.5px] text-grey">
          {notice}
        </p>
      ) : null}
    </div>
  );
}
