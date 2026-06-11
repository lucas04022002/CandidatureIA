"use client";

import type { ChangeEvent } from "react";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { CandidateProfileSummary } from "@/lib/types";
import { ScoreGauge } from "@/components/app/score-gauge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";

interface CvUploadCardProps {
  profile: CandidateProfileSummary;
}

export function CvUploadCard({ profile }: CvUploadCardProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const letterTemplateInputRef = useRef<HTMLInputElement | null>(null);
  const [feedback, setFeedback] = useState("");
  const [targetRole, setTargetRole] = useState(profile.targetRole || profile.role);
  const [preferredKeywords, setPreferredKeywords] = useState(
    profile.preferredKeywords.join(", "),
  );
  const [baseLetterTemplate, setBaseLetterTemplate] = useState(profile.baseLetterTemplate || "");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const visibleSkills = profile.technicalSkills.slice(0, 6);
  const hiddenSkillsCount = Math.max(profile.technicalSkills.length - visibleSkills.length, 0);
  const completeness = Math.min(
    98,
    46 +
      (profile.summary ? 12 : 0) +
      (profile.email ? 8 : 0) +
      (profile.location ? 8 : 0) +
      Math.min(profile.technicalSkills.length * 4, 16) +
      (profile.targetRole ? 8 : 0),
  );

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

  async function handleLetterTemplateFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const content = await file.text();
      setBaseLetterTemplate(content.trim());
      setFeedback("Lettre modele importee. Pense a enregistrer la cible pour l'utiliser dans les generations.");
    } catch {
      setFeedback("Impossible de lire ce fichier .txt.");
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
          baseLetterTemplate,
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
      <CardContent className="space-y-5">
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.txt"
          className="hidden"
          onChange={handleFileChange}
        />
        <input
          ref={letterTemplateInputRef}
          type="file"
          accept=".txt"
          className="hidden"
          onChange={handleLetterTemplateFileChange}
        />
        <div className="flex flex-wrap items-start gap-5 rounded-[22px] border border-[var(--border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.018))] p-5">
          <div className="flex min-w-0 flex-1 items-start gap-4">
            <ScoreGauge value={completeness} size={66} thickness={6} />
            <div className="space-y-3">
              <div>
                <p className="label-xs">Profil CV · {profile.source === "imported" ? "importe" : "par defaut"}</p>
                <p className="mt-2 text-base font-semibold tracking-[-0.02em] text-[var(--foreground)]">
                  {profile.fullName}
                </p>
                <p className="text-sm text-[var(--foreground-dim)]">{profile.role}</p>
                <p className="mt-1 text-xs text-[var(--foreground-faint)]">
                  {profile.location} • {profile.email}
                </p>
              </div>

              {profile.targetRole ? (
                <div className="inline-flex rounded-full border border-[var(--accent-line)] bg-[var(--accent-soft)] px-3 py-1 text-[11px] font-medium text-[var(--accent-text)]">
                  Cible actuelle: {profile.targetRole}
                </div>
              ) : null}

              <p className="max-w-3xl text-sm leading-6 text-[var(--foreground-dim)]">
                {profile.summary}
              </p>

              {visibleSkills.length ? (
                <div className="flex flex-wrap gap-2">
                  {visibleSkills.map((skill) => (
                    <Chip key={skill}>{skill}</Chip>
                  ))}
                  {hiddenSkillsCount ? <Chip>+{hiddenSkillsCount}</Chip> : null}
                </div>
              ) : (
                <p className="text-xs text-[var(--foreground-faint)]">
                  Aucune competence cle detectee automatiquement dans ce CV.
                </p>
              )}
            </div>
          </div>

          <div className="flex w-full flex-col gap-2 sm:w-auto sm:min-w-[210px]">
            <Button
              variant="secondary"
              disabled={isPending}
              onClick={() => inputRef.current?.click()}
              className="justify-center"
            >
              {isPending ? "Import..." : "Importer ou reimporter le CV"}
            </Button>
            <Button
              variant="ghost"
              disabled={isPending}
              onClick={() => letterTemplateInputRef.current?.click()}
              className="justify-center"
            >
              Importer une lettre `.txt`
            </Button>
            <Button
              variant="ghost"
              disabled={isPending}
              onClick={savePreferences}
              className="justify-center"
            >
              {isPending ? "Sauvegarde..." : "Enregistrer la cible"}
            </Button>
          </div>
        </div>

        <div className="grid gap-3 rounded-[20px] border border-[var(--border)] bg-[var(--card-soft)]/55 p-4 md:grid-cols-2">
          <label className="space-y-1">
            <span className="text-xs text-[var(--foreground-dim)]">Metier cible</span>
            <input
              value={targetRole}
              onChange={(event) => setTargetRole(event.target.value)}
              className="w-full rounded-[12px] border border-[var(--border)] bg-[var(--card)] px-3 py-2.5 text-sm text-[var(--foreground)] outline-none transition focus:border-[var(--accent-line)]"
              placeholder="ex: Charge d'affaires"
            />
          </label>
          <label className="space-y-1">
            <span className="text-xs text-[var(--foreground-dim)]">Mots-cles favoris</span>
            <input
              value={preferredKeywords}
              onChange={(event) => setPreferredKeywords(event.target.value)}
              className="w-full rounded-[12px] border border-[var(--border)] bg-[var(--card)] px-3 py-2.5 text-sm text-[var(--foreground)] outline-none transition focus:border-[var(--accent-line)]"
              placeholder="ex: charge d'affaires, relation client"
            />
          </label>
          <label className="space-y-1 md:col-span-2">
            <span className="text-xs text-[var(--foreground-dim)]">Lettre modele de reference</span>
            <textarea
              value={baseLetterTemplate}
              onChange={(event) => setBaseLetterTemplate(event.target.value)}
              className="min-h-[180px] w-full rounded-[12px] border border-[var(--border)] bg-[var(--card)] px-3 py-3 text-sm leading-6 text-[var(--foreground)] outline-none transition focus:border-[var(--accent-line)]"
              placeholder="Colle ici une lettre de motivation que tu trouves reussie. ApplyBot s'en servira comme base de ton et de structure pour generer des variantes adaptees a chaque offre."
            />
          </label>
          <div className="space-y-2 rounded-[16px] border border-[var(--border)] bg-[var(--card)]/75 p-4 md:col-span-2">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-medium uppercase tracking-[0.24em] text-[var(--foreground-faint)]">
                Lettre de reference utilisee
              </p>
              <p className="text-[11px] text-[var(--foreground-faint)]">
                {baseLetterTemplate.trim() ? "Modele actif" : "Aucun modele"}
              </p>
            </div>
            {baseLetterTemplate.trim() ? (
              <p className="whitespace-pre-wrap text-sm leading-6 text-[var(--foreground-dim)]">
                {baseLetterTemplate.trim()}
              </p>
            ) : (
              <p className="text-sm leading-6 text-[var(--foreground-faint)]">
                Importe un fichier `.txt` ou colle une lettre que tu trouves reussie. ApplyBot s&apos;en servira comme base de ton, de structure et de formulation.
              </p>
            )}
          </div>
          <div className="md:col-span-2 flex items-center justify-between gap-3">
            <p className="text-xs text-[var(--foreground-faint)]">
              Ces preferences servent a piloter la recherche, le scoring et la generation. La lettre modele aide a produire des variantes plus proches de ton style.
            </p>
            <Button variant="secondary" disabled={isPending} onClick={savePreferences}>
              {isPending ? "Sauvegarde..." : "Enregistrer la cible"}
            </Button>
          </div>
        </div>

        {feedback ? <p className="text-xs text-[var(--foreground-dim)]">{feedback}</p> : null}
      </CardContent>
    </Card>
  );
}
