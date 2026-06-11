"use client";

import Link from "next/link";
import type { ChangeEvent } from "react";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BoltIcon, BriefcaseIcon, FileTextIcon, MapPinIcon, TargetIcon } from "@/components/app/icons";
import { ScoreGauge } from "@/components/app/score-gauge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import type { CandidateProfileSummary } from "@/lib/types";

type StepKey = "cv" | "analyse" | "target" | "launch";

interface OnboardingWizardProps {
  initialProfile: CandidateProfileSummary;
}

interface ParsedProfilePayload {
  fullName: string;
  role: string;
  targetRole?: string;
  preferredKeywords?: string[];
  location: string;
  email: string;
  summary: string;
  technicalSkills: string[];
}

interface WizardProfile {
  id: string | null;
  fullName: string;
  role: string;
  targetRole: string;
  preferredKeywords: string[];
  baseLetterTemplate: string;
  location: string;
  email: string;
  summary: string;
  technicalSkills: string[];
  source: "imported" | "fallback";
}

const STEPS: Array<{ key: StepKey; label: string }> = [
  { key: "cv", label: "CV" },
  { key: "analyse", label: "Analyse" },
  { key: "target", label: "Cible" },
  { key: "launch", label: "Lancement" },
];

function mapInitialProfile(profile: CandidateProfileSummary): WizardProfile {
  return {
    id: profile.id,
    fullName: profile.fullName,
    role: profile.role,
    targetRole: profile.targetRole || profile.role,
    preferredKeywords: profile.preferredKeywords,
    baseLetterTemplate: profile.baseLetterTemplate,
    location: profile.location,
    email: profile.email,
    summary: profile.summary,
    technicalSkills: profile.technicalSkills,
    source: profile.source,
  };
}

function mapImportedProfile(profile: ParsedProfilePayload, profileId: string | null): WizardProfile {
  return {
    id: profileId,
    fullName: profile.fullName,
    role: profile.role,
    targetRole: profile.targetRole?.trim() || profile.role,
    preferredKeywords: profile.preferredKeywords?.length ? profile.preferredKeywords : [profile.role],
    baseLetterTemplate: "",
    location: profile.location,
    email: profile.email,
    summary: profile.summary,
    technicalSkills: profile.technicalSkills,
    source: "imported",
  };
}

function stepIndex(step: StepKey) {
  return STEPS.findIndex((item) => item.key === step);
}

export function OnboardingWizard({ initialProfile }: OnboardingWizardProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [step, setStep] = useState<StepKey>("cv");
  const [profile, setProfile] = useState<WizardProfile>(() => mapInitialProfile(initialProfile));
  const [selectedFileName, setSelectedFileName] = useState("");
  const [feedback, setFeedback] = useState("");
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [isPending, startTransition] = useTransition();
  const [targetRole, setTargetRole] = useState(initialProfile.targetRole || initialProfile.role);
  const [location, setLocation] = useState(
    initialProfile.location !== "Non renseigne" ? initialProfile.location : "",
  );
  const [preferredKeywords, setPreferredKeywords] = useState(
    initialProfile.preferredKeywords.join(", "),
  );
  const [contract, setContract] = useState("CDI");
  const [radiusKm, setRadiusKm] = useState("20");

  const activeStepIndex = stepIndex(step);
  const visibleKeywords = useMemo(
    () =>
      (preferredKeywords
        ? preferredKeywords
            .split(",")
            .map((keyword) => keyword.trim())
            .filter(Boolean)
        : profile.technicalSkills.slice(0, 6)
      ).slice(0, 8),
    [preferredKeywords, profile.technicalSkills],
  );

  useEffect(() => {
    if (step !== "analyse") return;
    const interval = window.setInterval(() => {
      setAnalysisProgress((current) => {
        const next = Math.min(100, current + Math.floor(Math.random() * 18) + 8);
        return next;
      });
    }, 220);

    const completion = window.setTimeout(() => {
      window.clearInterval(interval);
      setAnalysisProgress(100);
      window.setTimeout(() => setStep("target"), 450);
    }, 1500);

    return () => {
      window.clearInterval(interval);
      window.clearTimeout(completion);
    };
  }, [step]);

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("cv", file);
    setSelectedFileName(file.name);
    setFeedback("");

    try {
      const response = await fetch("/api/import-cv", {
        method: "POST",
        body: formData,
      });

      const payload = (await response.json()) as {
        ok: boolean;
        message?: string;
        warning?: string;
        error?: string;
        rescored?: number;
        profileId?: string;
        profile?: ParsedProfilePayload;
      };

      if (!response.ok || !payload.ok || !payload.profile) {
        setFeedback(payload.error ?? "Import du CV echoue.");
        return;
      }

      const nextProfile = mapImportedProfile(payload.profile, payload.profileId ?? profile.id);
      setProfile(nextProfile);
      setTargetRole(nextProfile.targetRole);
      setLocation(nextProfile.location !== "Non renseigne" ? nextProfile.location : "");
      setPreferredKeywords(nextProfile.preferredKeywords.join(", "));
      setAnalysisProgress(0);
      setFeedback(
        `${payload.warning ?? payload.message ?? "CV importe."}${
          typeof payload.rescored === "number" ? ` ${payload.rescored} offre(s) rescouree(s).` : ""
        }`,
      );
      startTransition(() => {
        router.refresh();
      });
      setStep("analyse");
    } catch {
      setFeedback("Erreur reseau pendant l'import du CV.");
    } finally {
      event.target.value = "";
    }
  }

  function useCurrentProfile() {
    setFeedback("On garde ton profil actif pour lancer l’agent.");
    setSelectedFileName(profile.source === "imported" ? "Profil deja importe" : "Profil par defaut");
    setAnalysisProgress(0);
    setStep("analyse");
  }

  async function saveTargetAndContinue() {
    if (!profile.id) {
      setFeedback("Importe un CV ou garde ton profil actif avant de continuer.");
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
      };

      if (!response.ok || !payload.ok) {
        setFeedback(payload.error ?? "Impossible de sauvegarder la cible.");
        return;
      }

      setProfile((current) => ({
        ...current,
        targetRole,
        preferredKeywords: preferredKeywords
          .split(",")
          .map((keyword) => keyword.trim())
          .filter(Boolean),
      }));
      setFeedback(payload.warning ?? payload.message ?? "Cible mise a jour.");
      startTransition(() => {
        router.refresh();
      });
      setStep("launch");
    } catch {
      setFeedback("Erreur reseau pendant la sauvegarde.");
    }
  }

  function launchWorkspace() {
    const params = new URLSearchParams();
    if (targetRole.trim()) params.set("keywords", targetRole.trim());
    if (location.trim()) params.set("location", location.trim());
    if (contract && contract !== "Tous") params.set("contract", contract);
    if (radiusKm.trim()) params.set("radiusKm", radiusKm.trim());
    router.push(`/jobs?${params.toString()}`);
  }

  return (
    <div className="mx-auto flex w-full max-w-[760px] flex-col gap-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-[linear-gradient(145deg,var(--accent),var(--accent-press))] text-white shadow-[var(--shadow-1),0_6px_18px_-8px_var(--accent)]">
            <BoltIcon size={18} />
          </div>
          <div>
            <p className="text-sm font-semibold text-[var(--foreground)]">ApplyBot</p>
            <p className="text-xs text-[var(--foreground-faint)]">Onboarding intelligent</p>
          </div>
        </div>

        <LinkButton href="/dashboard" label="Passer et ouvrir le dashboard" />
      </div>

      <div className="flex items-center gap-0">
        {STEPS.map((item, index) => {
          const isDone = index < activeStepIndex;
          const isActive = index === activeStepIndex;

          return (
            <div key={item.key} className="flex flex-1 items-center gap-3">
              <div className="flex flex-col items-center gap-2">
                <div
                  className={`grid h-8 w-8 place-items-center rounded-full border text-sm font-semibold transition ${
                    isDone
                      ? "border-transparent bg-[var(--good)] text-white"
                      : isActive
                        ? "border-transparent bg-[var(--accent)] text-white"
                        : "border-[var(--border)] bg-[var(--card)] text-[var(--foreground-faint)]"
                  }`}
                >
                  {isDone ? "✓" : index + 1}
                </div>
                <span className="text-[11px] uppercase tracking-[0.14em] text-[var(--foreground-faint)]">
                  {item.label}
                </span>
              </div>
              {index < STEPS.length - 1 ? (
                <div
                  className={`mb-6 h-[2px] flex-1 ${
                    index < activeStepIndex ? "bg-[var(--good)]" : "bg-[var(--border)]"
                  }`}
                />
              ) : null}
            </div>
          );
        })}
      </div>

      {step === "cv" ? (
        <Card>
          <CardContent className="space-y-6 p-8">
            <div className="space-y-3 text-center">
              <p className="label-xs">Etape 1</p>
              <h1 className="text-[clamp(2rem,4vw,3rem)] font-semibold tracking-[-0.045em] text-[var(--foreground)]">
                Commençons par ton CV
              </h1>
              <p className="mx-auto max-w-2xl text-[15px] leading-7 text-[var(--foreground-dim)]">
                ApplyBot l&apos;analyse pour comprendre ton parcours, proposer une cible plus
                juste et lancer des recherches adaptees a ton profil.
              </p>
            </div>

            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="w-full rounded-[24px] border-2 border-dashed border-[var(--accent-line)] bg-[var(--accent-soft)]/55 px-6 py-12 text-center transition hover:bg-[var(--accent-soft)]"
            >
              <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-[18px] bg-[var(--accent-soft)] text-[var(--accent-text)]">
                <FileTextIcon size={28} />
              </div>
              <p className="text-base font-semibold text-[var(--foreground)]">Glisse ton CV ici</p>
              <p className="mt-2 text-sm text-[var(--foreground-dim)]">
                PDF ou TXT, ou clique pour parcourir.
              </p>
            </button>

            <input
              ref={inputRef}
              type="file"
              accept=".pdf,.txt"
              className="hidden"
              onChange={handleFileChange}
            />

            <div className="flex flex-col items-center gap-3">
              <Button variant="ghost" onClick={useCurrentProfile}>
                Utiliser le profil deja actif
              </Button>
              {selectedFileName ? (
                <p className="text-xs text-[var(--foreground-faint)]">Fichier choisi: {selectedFileName}</p>
              ) : null}
              {feedback ? (
                <p className="max-w-xl text-center text-xs leading-5 text-[var(--foreground-dim)]">
                  {feedback}
                </p>
              ) : null}
            </div>
          </CardContent>
        </Card>
      ) : null}

      {step === "analyse" ? (
        <Card>
          <CardContent className="space-y-6 p-8 text-center">
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-[18px] bg-[var(--accent-soft)] text-[var(--accent-text)]">
              <FileTextIcon size={28} />
            </div>
            <div>
              <h1 className="text-3xl font-semibold tracking-[-0.04em] text-[var(--foreground)]">
                Analyse en cours
              </h1>
              <p className="mt-3 text-[15px] leading-7 text-[var(--foreground-dim)]">
                On extrait les signaux utiles du CV pour alimenter la recherche, le scoring et la
                generation.
              </p>
            </div>

            <div className="mx-auto max-w-md space-y-4 text-left">
              {[
                "Lecture du document",
                "Extraction du parcours",
                "Detection des competences",
                "Preparation de la cible",
              ].map((label, index) => {
                const threshold = (index + 1) * 25;
                const done = analysisProgress >= threshold;
                return (
                  <div key={label} className="flex items-center gap-3">
                    <div
                      className={`grid h-6 w-6 place-items-center rounded-full text-xs ${
                        done
                          ? "bg-[var(--good)] text-white"
                          : "bg-[var(--card-hi)] text-[var(--foreground-faint)]"
                      }`}
                    >
                      {done ? "✓" : index + 1}
                    </div>
                    <span className="text-sm text-[var(--foreground)]">{label}</span>
                  </div>
                );
              })}
            </div>

            <div className="space-y-2">
              <div className="h-2 overflow-hidden rounded-full bg-[var(--card-hi)]">
                <div
                  className="h-full rounded-full bg-[linear-gradient(90deg,var(--accent),var(--good))] transition-[width] duration-200"
                  style={{ width: `${analysisProgress}%` }}
                />
              </div>
              <p className="text-xs text-[var(--foreground-faint)]">{analysisProgress}%</p>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {step === "target" ? (
        <Card>
          <CardContent className="space-y-6 p-8">
            <div className="space-y-3 text-center">
              <p className="label-xs">Etape 3</p>
              <h1 className="text-[clamp(2rem,4vw,3rem)] font-semibold tracking-[-0.045em] text-[var(--foreground)]">
                Voici ce qu&apos;ApplyBot a compris
              </h1>
              <p className="mx-auto max-w-2xl text-[15px] leading-7 text-[var(--foreground-dim)]">
                Ajuste la cible si besoin. Elle pilotera les recherches, les scores et les
                candidatures generees.
              </p>
            </div>

            <div className="flex flex-wrap items-start gap-5 rounded-[22px] border border-[var(--border)] bg-[var(--card-soft)]/55 p-5">
              <ScoreGauge
                value={Math.min(98, 50 + profile.technicalSkills.length * 5)}
                size={70}
                thickness={6}
              />
              <div className="min-w-[260px] flex-1 space-y-3">
                <div>
                  <p className="text-base font-semibold text-[var(--foreground)]">
                    {profile.fullName}
                  </p>
                  <p className="text-sm text-[var(--foreground-dim)]">{profile.role}</p>
                  <p className="mt-1 text-xs text-[var(--foreground-faint)]">
                    {profile.location} • {profile.email}
                  </p>
                </div>
                <p className="text-sm leading-6 text-[var(--foreground-dim)]">{profile.summary}</p>
                <div className="flex flex-wrap gap-2">
                  {profile.technicalSkills.slice(0, 6).map((skill) => (
                    <Chip key={skill}>{skill}</Chip>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-1.5">
                <span className="text-xs text-[var(--foreground-dim)]">Metier cible</span>
                <input
                  value={targetRole}
                  onChange={(event) => setTargetRole(event.target.value)}
                  className="w-full rounded-[12px] border border-[var(--border)] bg-[var(--card)] px-3 py-2.5 text-sm text-[var(--foreground)] outline-none transition focus:border-[var(--accent-line)]"
                />
              </label>
              <label className="space-y-1.5">
                <span className="text-xs text-[var(--foreground-dim)]">Localisation</span>
                <input
                  value={location}
                  onChange={(event) => setLocation(event.target.value)}
                  className="w-full rounded-[12px] border border-[var(--border)] bg-[var(--card)] px-3 py-2.5 text-sm text-[var(--foreground)] outline-none transition focus:border-[var(--accent-line)]"
                />
              </label>
              <label className="space-y-1.5 md:col-span-2">
                <span className="text-xs text-[var(--foreground-dim)]">Mots-cles favoris</span>
                <input
                  value={preferredKeywords}
                  onChange={(event) => setPreferredKeywords(event.target.value)}
                  className="w-full rounded-[12px] border border-[var(--border)] bg-[var(--card)] px-3 py-2.5 text-sm text-[var(--foreground)] outline-none transition focus:border-[var(--accent-line)]"
                  placeholder="ex: charge d'affaires, relation client, prospection"
                />
              </label>
              <label className="space-y-1.5">
                <span className="text-xs text-[var(--foreground-dim)]">Type de contrat</span>
                <select
                  value={contract}
                  onChange={(event) => setContract(event.target.value)}
                  className="w-full rounded-[12px] border border-[var(--border)] bg-[var(--card)] px-3 py-2.5 text-sm text-[var(--foreground)] outline-none transition focus:border-[var(--accent-line)]"
                >
                  <option value="CDI">CDI</option>
                  <option value="CDD">CDD</option>
                  <option value="Alternance">Alternance</option>
                  <option value="Tous">Tous</option>
                </select>
              </label>
              <label className="space-y-1.5">
                <span className="text-xs text-[var(--foreground-dim)]">
                  Rayon de recherche (km)
                </span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={radiusKm}
                  onChange={(event) => setRadiusKm(event.target.value)}
                  className="w-full rounded-[12px] border border-[var(--border)] bg-[var(--card)] px-3 py-2.5 text-sm text-[var(--foreground)] outline-none transition focus:border-[var(--accent-line)]"
                />
              </label>
            </div>

            <div className="flex items-center justify-between gap-3">
              <div className="flex flex-wrap gap-2">
                {visibleKeywords.map((keyword) => (
                  <Chip key={keyword}>
                    <TargetIcon size={12} />
                    {keyword}
                  </Chip>
                ))}
              </div>

              <Button onClick={saveTargetAndContinue} disabled={isPending}>
                {isPending ? "Sauvegarde..." : "Continuer"}
              </Button>
            </div>

            {feedback ? (
              <p className="text-xs leading-5 text-[var(--foreground-dim)]">{feedback}</p>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {step === "launch" ? (
        <Card>
          <CardContent className="space-y-6 p-8">
            <div className="space-y-3 text-center">
              <p className="label-xs">Etape 4</p>
              <h1 className="text-[clamp(2rem,4vw,3rem)] font-semibold tracking-[-0.045em] text-[var(--foreground)]">
                Ton espace est pret
              </h1>
              <p className="mx-auto max-w-2xl text-[15px] leading-7 text-[var(--foreground-dim)]">
                On a une cible claire, un profil actif et des parametres de recherche de depart.
                Il ne reste plus qu&apos;a lancer le pipeline.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-[20px] border border-[var(--border)] bg-[var(--card-soft)]/55 p-4">
                <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent-text)]">
                  <BriefcaseIcon size={18} />
                </div>
                <p className="text-sm font-semibold text-[var(--foreground)]">Cible</p>
                <p className="mt-2 text-sm text-[var(--foreground-dim)]">{targetRole}</p>
              </div>
              <div className="rounded-[20px] border border-[var(--border)] bg-[var(--card-soft)]/55 p-4">
                <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent-text)]">
                  <MapPinIcon size={18} />
                </div>
                <p className="text-sm font-semibold text-[var(--foreground)]">Zone</p>
                <p className="mt-2 text-sm text-[var(--foreground-dim)]">
                  {location || "Toute la France"} · {radiusKm} km
                </p>
              </div>
              <div className="rounded-[20px] border border-[var(--border)] bg-[var(--card-soft)]/55 p-4">
                <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent-text)]">
                  <TargetIcon size={18} />
                </div>
                <p className="text-sm font-semibold text-[var(--foreground)]">Contrat</p>
                <p className="mt-2 text-sm text-[var(--foreground-dim)]">{contract}</p>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs text-[var(--foreground-dim)]">Mots-cles pilotes</p>
              <div className="flex flex-wrap gap-2">
                {visibleKeywords.map((keyword) => (
                  <Chip key={keyword}>{keyword}</Chip>
                ))}
              </div>
            </div>

            <div className="flex flex-col items-center gap-3 text-center">
              <Button onClick={launchWorkspace}>Decouvrir mes offres</Button>
              <p className="text-xs text-[var(--foreground-faint)]">
                Tu arriveras sur `/jobs` avec des filtres deja prepares selon ton profil.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function LinkButton({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center justify-center rounded-[11px] border border-[var(--border)] bg-[var(--card-soft)] px-4 py-2 text-sm font-medium text-[var(--foreground-dim)] transition hover:bg-[var(--card-hi)] hover:text-[var(--foreground)]"
    >
      {label}
    </Link>
  );
}
