"use client";

import type { ChangeEvent } from "react";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { CandidateProfileSummary } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface CvUploadCardProps {
  profile: CandidateProfileSummary;
}

export function CvUploadCard({ profile }: CvUploadCardProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [feedback, setFeedback] = useState("");
  const [targetRole, setTargetRole] = useState(profile.targetRole || profile.role);
  const [preferredKeywords, setPreferredKeywords] = useState(
    profile.preferredKeywords.join(", "),
  );
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("cv", file);
    setFeedback("");

    try {
      const response = await fetch("/api/import-cv", {
        method: "POST",
        body: formData,
      });

      const rawText = await response.text();
      let payload:
        | {
            ok: boolean;
            message?: string;
            error?: string;
            rescored?: number;
            warning?: string;
          }
        | null = null;

      try {
        payload = JSON.parse(rawText) as {
          ok: boolean;
          message?: string;
          error?: string;
          rescored?: number;
          warning?: string;
        };
      } catch {
        payload = null;
      }

      if (!response.ok || !payload?.ok) {
        setFeedback(payload?.error ?? rawText.slice(0, 180) ?? "Import du CV echoue.");
        return;
      }

      const rescoredLabel =
        typeof payload.rescored === "number" ? ` ${payload.rescored} offre(s) rescouree(s).` : "";
      setFeedback(`${payload.warning ?? payload.message ?? "CV importe."}${rescoredLabel}`);
      startTransition(() => {
        router.refresh();
      });
    } catch {
      setFeedback("Erreur reseau pendant l'import du CV.");
    } finally {
      event.target.value = "";
    }
  }

  async function savePreferences() {
    if (!profile.id) {
      setFeedback("Importe d'abord un CV avant de personnaliser la cible.");
      return;
    }

    setFeedback("");

    try {
      const response = await fetch("/api/update-candidate-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profileId: profile.id,
          targetRole,
          preferredKeywords: preferredKeywords
            .split(",")
            .map((keyword) => keyword.trim())
            .filter(Boolean),
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
        setFeedback(payload.error ?? "Impossible de sauvegarder la cible.");
        return;
      }

      const rescoredLabel =
        typeof payload.rescored === "number" ? ` ${payload.rescored} offre(s) rescouree(s).` : "";
      setFeedback(`${payload.warning ?? payload.message ?? "Profil mis a jour."}${rescoredLabel}`);
      startTransition(() => {
        router.refresh();
      });
    } catch {
      setFeedback("Erreur reseau pendant la sauvegarde de la cible.");
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <div>
          <CardTitle>Profil CV</CardTitle>
          <p className="mt-1 text-sm text-slate-300">
            Importe ton CV PDF/TXT pour recalculer la compatibilite selon ton vrai profil.
          </p>
        </div>
        <Button
          variant="secondary"
          disabled={isPending}
          onClick={() => inputRef.current?.click()}
        >
          {isPending ? "Import..." : "Importer un CV"}
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.txt"
          className="hidden"
          onChange={handleFileChange}
        />
        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <p className="text-sm font-medium text-white">{profile.fullName}</p>
          <p className="text-sm text-slate-300">{profile.role}</p>
          <p className="mt-1 text-xs text-slate-400">
            {profile.location} • {profile.email} • Source: {profile.source === "imported" ? "CV importe" : "Profil par defaut"}
          </p>
          {profile.targetRole ? (
            <p className="mt-2 text-xs text-indigo-200">Cible actuelle: {profile.targetRole}</p>
          ) : null}
          <p className="mt-3 text-sm text-slate-300">{profile.summary}</p>
        </div>
        <div className="grid gap-3 rounded-xl border border-white/10 bg-white/5 p-4 md:grid-cols-2">
          <label className="space-y-1">
            <span className="text-xs text-slate-300">Metier cible</span>
            <input
              value={targetRole}
              onChange={(event) => setTargetRole(event.target.value)}
              className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-indigo-400"
              placeholder="ex: Charge d'affaires"
            />
          </label>
          <label className="space-y-1">
            <span className="text-xs text-slate-300">Mots-cles favoris</span>
            <input
              value={preferredKeywords}
              onChange={(event) => setPreferredKeywords(event.target.value)}
              className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-indigo-400"
              placeholder="ex: charge d'affaires, relation client"
            />
          </label>
          <div className="md:col-span-2">
            <Button variant="secondary" disabled={isPending} onClick={savePreferences}>
              {isPending ? "Sauvegarde..." : "Enregistrer la cible"}
            </Button>
          </div>
        </div>
        {profile.technicalSkills.length ? (
          <div className="flex flex-wrap gap-2">
            {profile.technicalSkills.slice(0, 8).map((skill) => (
              <span
                key={skill}
                className="rounded-full border border-sky-500/30 bg-sky-500/15 px-3 py-1 text-xs text-sky-200"
              >
                {skill}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-400">
            Aucune competence cle detectee automatiquement dans ce CV.
          </p>
        )}
        {feedback ? <p className="text-xs text-slate-300">{feedback}</p> : null}
      </CardContent>
    </Card>
  );
}
