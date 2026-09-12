"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/button";
import { Field } from "@/components/field";
import type { CandidateProfileSummary } from "@/lib/types";

interface ProfileFormProps {
  profile: CandidateProfileSummary;
}

const inputClasses =
  "w-full rounded-lg border border-line bg-white px-3 py-2.5 font-body text-[15px] text-ink";

function toKeywordList(value: string) {
  return value
    .split(",")
    .map((keyword) => keyword.trim())
    .filter(Boolean);
}

/**
 * Métier visé, mots-clés et modèle de lettre. Corps inchangé :
 * `{ profileId, targetRole, preferredKeywords, baseLetterTemplate }` sur
 * `/api/update-candidate-profile`.
 */
export function ProfileForm({ profile }: ProfileFormProps) {
  const [targetRole, setTargetRole] = useState(profile.targetRole || profile.role);
  const [keywords, setKeywords] = useState(profile.preferredKeywords.join(", "));
  const [letter, setLetter] = useState(profile.baseLetterTemplate || "");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");

    if (!profile.id) {
      setError("Importe d'abord ton CV : c'est lui qui crée ton profil.");
      return;
    }

    setBusy(true);

    try {
      const response = await fetch("/api/update-candidate-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profileId: profile.id,
          targetRole,
          preferredKeywords: toKeywordList(keywords),
          baseLetterTemplate: letter,
        }),
      });

      const payload = (await response.json()) as {
        ok: boolean;
        message?: string;
        warning?: string;
        error?: string;
        rescored?: number;
      };

      if (!response.ok || !payload.ok) {
        setError(payload.error ?? "Le profil n'a pas pu être enregistré. Réessaie dans un instant.");
        return;
      }

      const rescored =
        typeof payload.rescored === "number" ? ` ${payload.rescored} offre(s) reclassée(s).` : "";
      setMessage(`${payload.warning ?? payload.message ?? "Profil enregistré."}${rescored}`);
      startTransition(() => router.refresh());
    } catch {
      setError("Connexion perdue. Vérifie ta connexion et réessaie.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={save} className="flex flex-col gap-4">
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Métier visé">
          <input
            className={inputClasses}
            value={targetRole}
            onChange={(event) => setTargetRole(event.target.value)}
            placeholder="ex : électricien bâtiment"
          />
        </Field>
        <Field label="Mots-clés" hint="Séparés par des virgules.">
          <input
            className={inputClasses}
            value={keywords}
            onChange={(event) => setKeywords(event.target.value)}
            placeholder="ex : tirage de câbles, armoires, chantier"
          />
        </Field>
      </div>

      <Field
        label="Modèle de lettre"
        hint="Colle ici une lettre que tu trouves réussie : le ton et la structure serviront de base."
      >
        <textarea
          className="min-h-[180px] w-full rounded-lg border border-line bg-white px-3 py-3 font-body text-[15px] leading-[1.55] text-ink"
          value={letter}
          onChange={(event) => setLetter(event.target.value)}
        />
      </Field>

      <div className="flex flex-wrap items-center gap-3">
        <Button variant="primary" type="submit" disabled={busy || pending}>
          Enregistrer mon profil
        </Button>
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
    </form>
  );
}
