"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/button";
import { Field, Select } from "@/components/field";
import type { CandidateProfileSummary } from "@/lib/types";

interface OnboardingWizardProps {
  initialProfile: CandidateProfileSummary;
}

interface ParsedProfile {
  fullName: string;
  role: string;
  targetRole?: string;
  preferredKeywords?: string[];
  location: string;
  email: string;
  summary: string;
  technicalSkills: string[];
}

const STEPS = ["Importer ton CV", "Vérifier ton profil", "Choisir métier et lieu"] as const;

const RADIUS_OPTIONS = [
  { value: "10", label: "10 km" },
  { value: "20", label: "20 km" },
  { value: "30", label: "30 km" },
  { value: "50", label: "50 km" },
  { value: "100", label: "100 km" },
];

const inputClasses =
  "w-full rounded-lg border border-line bg-white px-3 py-2.5 font-body text-[15px] text-ink";

const UNKNOWN = "Non renseigne";

function cleanLocation(value: string) {
  return value && value !== UNKNOWN ? value : "";
}

/**
 * Trois étapes, une barre bleue : importer le CV, vérifier ce qui en a été lu, choisir le métier et
 * le lieu. Les appels sont ceux de l'ancien assistant (`/api/import-cv` en `FormData` avec le champ
 * `cv`, puis `/api/update-candidate-profile`), la dernière étape ouvre `/jobs` avec la recherche
 * déjà remplie.
 *
 * Pas de `Toast` ici : `/onboarding` est hors du gabarit de l'application, donc hors du fournisseur
 * de notifications. Les retours sont affichés dans l'étape elle-même.
 */
export function OnboardingWizard({ initialProfile }: OnboardingWizardProps) {
  const router = useRouter();
  const input = useRef<HTMLInputElement | null>(null);
  const [step, setStep] = useState(0);
  const [profile, setProfile] = useState(initialProfile);
  const [targetRole, setTargetRole] = useState(initialProfile.targetRole || initialProfile.role);
  const [location, setLocation] = useState(cleanLocation(initialProfile.location));
  const [keywords, setKeywords] = useState(initialProfile.preferredKeywords.join(", "));
  const [radiusKm, setRadiusKm] = useState("20");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // Changer d'étape ne change pas de page : sans cela, le focus reste sur le bouton qu'on vient de
  // presser (ou revient au début du document), et un lecteur d'écran n'annonce rien de la nouvelle
  // étape. On le pose sur le titre de l'étape, qui est aussi ce qu'on lirait à voix haute.
  // `tabIndex={-1}` rend le titre focalisable par programme sans l'ajouter au parcours de tabulation.
  const heading = useRef<HTMLHeadingElement | null>(null);
  const mounted = useRef(false);
  useEffect(() => {
    // Pas au premier rendu : voler le focus au chargement de la page déplacerait le lecteur
    // d'écran hors du début du document sans que l'utilisateur ait rien demandé.
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    heading.current?.focus();
  }, [step]);

  async function importCv(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("cv", file);
    setMessage("");
    setError("");
    setBusy(true);

    try {
      const response = await fetch("/api/import-cv", { method: "POST", body: formData });
      const payload = (await response.json().catch(() => null)) as {
        ok: boolean;
        message?: string;
        warning?: string;
        error?: string;
        profileId?: string;
        profile?: ParsedProfile;
      } | null;

      if (!response.ok || !payload?.ok || !payload.profile) {
        setError(payload?.error ?? "Le CV n'a pas pu être lu. Essaie un PDF ou un fichier .txt.");
        return;
      }

      const parsed = payload.profile;
      const parsedKeywords = parsed.preferredKeywords?.length
        ? parsed.preferredKeywords
        : [parsed.role];

      setProfile({
        ...profile,
        id: payload.profileId ?? profile.id,
        fullName: parsed.fullName,
        role: parsed.role,
        targetRole: parsed.targetRole?.trim() || parsed.role,
        preferredKeywords: parsedKeywords,
        location: parsed.location,
        email: parsed.email,
        summary: parsed.summary,
        technicalSkills: parsed.technicalSkills,
        source: "imported",
      });
      setTargetRole(parsed.targetRole?.trim() || parsed.role);
      setLocation(cleanLocation(parsed.location));
      setKeywords(parsedKeywords.join(", "));
      setMessage(payload.warning ?? payload.message ?? "CV importé.");
      setStep(1);
    } catch {
      setError("Connexion perdue. Vérifie ta connexion et réessaie.");
    } finally {
      setBusy(false);
      event.target.value = "";
    }
  }

  async function saveTarget() {
    setMessage("");
    setError("");

    if (!profile.id) {
      setError("Importe d'abord ton CV : c'est lui qui crée ton profil.");
      setStep(0);
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
          preferredKeywords: keywords
            .split(",")
            .map((keyword) => keyword.trim())
            .filter(Boolean),
        }),
      });

      const payload = (await response.json()) as { ok: boolean; error?: string };

      if (!response.ok || !payload.ok) {
        setError(payload.error ?? "Le profil n'a pas pu être enregistré. Réessaie dans un instant.");
        return;
      }

      const params = new URLSearchParams();
      if (targetRole.trim()) params.set("keywords", targetRole.trim());
      if (location.trim()) {
        params.set("location", location.trim());
        params.set("radiusKm", String(Number(radiusKm) || 20));
      }
      router.push(params.toString() ? `/jobs?${params.toString()}` : "/jobs");
    } catch {
      setError("Connexion perdue. Vérifie ta connexion et réessaie.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-[720px] flex-col gap-6">
      <div className="flex flex-col gap-2">
        <p className="font-mono text-[12.5px] uppercase tracking-[0.06em] text-grey">
          Étape {step + 1} sur {STEPS.length} · {STEPS[step]}
        </p>
        <div
          role="progressbar"
          aria-valuemin={1}
          aria-valuemax={STEPS.length}
          aria-valuenow={step + 1}
          aria-label="Progression de la mise en route"
          className="h-2 w-full overflow-hidden rounded-full bg-klein-soft"
        >
          <div
            className="h-full rounded-full bg-klein motion-safe:transition-[width] motion-safe:duration-150"
            style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
          />
        </div>
      </div>

      <div className="rounded-tile border border-line bg-white p-6">
        {step === 0 ? (
          <div className="flex flex-col items-start gap-4">
            <h1
              ref={heading}
              tabIndex={-1}
              className="font-display text-[28px] font-extrabold leading-none text-ink"
            >
              On commence par ton CV
            </h1>
            <p className="font-body text-[15px] text-grey">
              Il sert à classer les offres et à écrire tes lettres. PDF ou .txt, 5 Mo maximum.
            </p>
            <input
              ref={input}
              type="file"
              accept=".pdf,.txt"
              className="hidden"
              onChange={importCv}
              aria-label="Fichier de CV"
            />
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="primary" onClick={() => input.current?.click()} disabled={busy}>
                Importer mon CV
              </Button>
              <Button variant="quiet" onClick={() => setStep(1)} disabled={busy}>
                Continuer sans importer
              </Button>
            </div>
          </div>
        ) : null}

        {step === 1 ? (
          <div className="flex flex-col items-start gap-4">
            <h1
              ref={heading}
              tabIndex={-1}
              className="font-display text-[28px] font-extrabold leading-none text-ink"
            >
              Voilà ce qu&apos;on a lu
            </h1>
            <dl className="grid w-full gap-3 sm:grid-cols-2">
              <div>
                <dt className="font-mono text-[12px] uppercase tracking-[0.06em] text-grey">Nom</dt>
                <dd className="font-body text-[15px] text-ink">{profile.fullName}</dd>
              </div>
              <div>
                <dt className="font-mono text-[12px] uppercase tracking-[0.06em] text-grey">
                  Poste
                </dt>
                <dd className="font-body text-[15px] text-ink">{profile.role}</dd>
              </div>
              <div>
                <dt className="font-mono text-[12px] uppercase tracking-[0.06em] text-grey">Lieu</dt>
                <dd className="font-body text-[15px] text-ink">{profile.location}</dd>
              </div>
              <div>
                <dt className="font-mono text-[12px] uppercase tracking-[0.06em] text-grey">
                  E-mail
                </dt>
                <dd className="font-body text-[15px] text-ink">{profile.email}</dd>
              </div>
            </dl>
            {profile.technicalSkills.length ? (
              <div className="flex flex-wrap gap-2">
                {profile.technicalSkills.slice(0, 8).map((skill) => (
                  <span
                    key={skill}
                    className="rounded-full bg-klein-soft px-3 py-1 font-body text-[12.5px] font-medium text-klein-deep"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            ) : null}
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="primary" onClick={() => setStep(2)} disabled={busy}>
                C&apos;est bien moi
              </Button>
              <Button variant="quiet" onClick={() => setStep(0)} disabled={busy}>
                Reprendre l&apos;import
              </Button>
            </div>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="flex flex-col gap-4">
            <h1
              ref={heading}
              tabIndex={-1}
              className="font-display text-[28px] font-extrabold leading-none text-ink"
            >
              Ton métier et ton lieu
            </h1>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Métier visé">
                <input
                  className={inputClasses}
                  value={targetRole}
                  onChange={(event) => setTargetRole(event.target.value)}
                  placeholder="ex : électricien bâtiment"
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
              <Field label="Mots-clés" hint="Séparés par des virgules.">
                <input
                  className={inputClasses}
                  value={keywords}
                  onChange={(event) => setKeywords(event.target.value)}
                />
              </Field>
              <Select
                label="Rayon"
                options={RADIUS_OPTIONS}
                value={radiusKm}
                onChange={(event) => setRadiusKm(event.target.value)}
                className="px-3 py-2.5 text-[15px]"
              />
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="primary" onClick={saveTarget} disabled={busy}>
                Chercher des offres
              </Button>
              <Button variant="quiet" onClick={() => setStep(1)} disabled={busy}>
                Revenir au profil
              </Button>
            </div>
          </div>
        ) : null}

        {message ? (
          <p role="status" className="mt-4 font-body text-[13px] text-good">
            {message}
          </p>
        ) : null}
        {error ? (
          <p role="alert" className="mt-4 font-body text-[13px] text-bad">
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}
