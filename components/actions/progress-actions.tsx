"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/button";
import { useToast } from "@/components/toast";

const dayFormat = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" });

// La même phrase partout où l'étudiant décide : à l'inscription, sur le tableau de bord et dans son
// profil. Elle dit exactement ce que lit `listMembers`, et rien de plus.
export const SHARE_EXPLANATION =
  "Ton organisme voit alors le nombre de candidatures que tu as envoyées, la date de la dernière, et si tu as trouvé une entreprise. Jamais le contenu : ni les entreprises, ni les offres, ni tes lettres.";

type ProgressBody = { shareProgress?: boolean; foundCompany?: boolean };

function useProgress() {
  const router = useRouter();
  const { show } = useToast();
  const [busy, setBusy] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  async function send(body: ProgressBody, done: string) {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/account/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = (await response.json()) as { ok: boolean; error?: string };
      if (!response.ok || !payload.ok) {
        setError(payload.error ?? "Le réglage n'a pas pu être enregistré. Réessaie dans un instant.");
        return;
      }
      show(done);
      startTransition(() => router.refresh());
    } catch {
      setError("Connexion perdue. Vérifie ta connexion et réessaie.");
    } finally {
      setBusy(false);
    }
  }

  return { send, waiting: busy || pending, error };
}

function ErrorLine({ error }: { error: string }) {
  return error ? (
    <p role="alert" className="font-body text-[13px] text-bad">
      {error}
    </p>
  ) : null;
}

/** Encart du tableau de bord, pour un étudiant à qui la question n'a jamais été posée. */
export function SharePrompt() {
  const { send, waiting, error } = useProgress();
  return (
    <section className="flex flex-col gap-3 rounded-tile border-l-[3px] border-klein bg-white px-6 py-5">
      <h2 className="font-display text-[19px] font-bold leading-[1.2] text-ink">
        Partager ton avancement avec ton organisme ?
      </h2>
      <p className="max-w-[62ch] font-body text-[14.5px] leading-[1.55] text-grey">{SHARE_EXPLANATION}</p>
      <div className="flex flex-wrap gap-3">
        <Button
          variant="primary"
          pending={waiting}
          onClick={() => send({ shareProgress: true }, "Avancement partagé avec ton organisme.")}
        >
          Oui, partager
        </Button>
        <Button variant="quiet" pending={waiting} onClick={() => send({ shareProgress: false }, "C'est noté : rien n'est partagé.")}>
          Non
        </Button>
      </div>
      <ErrorLine error={error} />
    </section>
  );
}

/** Réglage du profil : l'état actuel et le bouton pour le changer. */
export function ShareSetting({ shareProgress }: { shareProgress: boolean | null }) {
  const { send, waiting, error } = useProgress();
  const shared = shareProgress === true;
  return (
    <div className="flex flex-col gap-3">
      <p className="font-body text-[15px] text-ink">
        {shared ? "Tu partages ton avancement avec ton organisme." : "Tu ne partages pas ton avancement avec ton organisme."}
      </p>
      <p className="max-w-[62ch] font-body text-[13.5px] leading-[1.55] text-grey">{SHARE_EXPLANATION}</p>
      <div>
        {shared ? (
          <Button
            variant="secondary"
            pending={waiting}
            onClick={() => send({ shareProgress: false }, "Ton organisme ne voit plus ton avancement.")}
          >
            Ne plus partager
          </Button>
        ) : (
          <Button
            variant="primary"
            pending={waiting}
            onClick={() => send({ shareProgress: true }, "Avancement partagé avec ton organisme.")}
          >
            Partager
          </Button>
        )}
      </div>
      <ErrorLine error={error} />
    </div>
  );
}

/** « J'ai trouvé mon entreprise » : une date, jamais un nom ; annulable. */
export function FoundCompanyAction({ foundCompanyAt }: { foundCompanyAt: string | null }) {
  const { send, waiting, error } = useProgress();
  if (!foundCompanyAt) {
    return (
      <div className="flex flex-col gap-2">
        <Button variant="secondary" pending={waiting} onClick={() => send({ foundCompany: true }, "Bravo ! C'est noté.")}>
          J&apos;ai trouvé mon entreprise
        </Button>
        <ErrorLine error={error} />
      </div>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-3">
      <p className="font-body text-[15px] font-semibold text-good">
        Entreprise trouvée le {dayFormat.format(new Date(foundCompanyAt))}
      </p>
      <Button variant="quiet" pending={waiting} onClick={() => send({ foundCompany: false }, "C'est annulé.")}>
        Annuler
      </Button>
      <ErrorLine error={error} />
    </div>
  );
}
