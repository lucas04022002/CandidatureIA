"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/button";
import { Checkbox, Field } from "@/components/field";
import { cn } from "@/lib/cn";
import { safeNextPath } from "@/lib/auth/safe-next";

type AuthMode = "signin" | "signup";

const MODES: ReadonlyArray<readonly [AuthMode, string]> = [
  ["signin", "Connexion"],
  ["signup", "Inscription"],
];

/**
 * L'API répond « Code d'organisme inconnu » : exact, mais l'étudiant ne sait pas quoi en faire.
 * Cette seule erreur est reformulée en indiquant la marche à suivre (spec §4). Toutes les autres
 * sont affichées telles que renvoyées, sans réécriture.
 */
const ORG_CODE_UNKNOWN = "Code d'organisme inconnu";
const ORG_CODE_UNKNOWN_HELP = "Code d'organisme inconnu. Vérifie les 8 caractères avec ton formateur.";

const inputClasses =
  "w-full rounded-lg border border-line bg-white px-3 py-2.5 font-body text-[15px] text-ink placeholder:text-grey";

async function postJson(path: string, body: unknown) {
  const res = await fetch(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(typeof data.error === "string" ? data.error : "Une erreur est survenue.");
  }
  return data;
}

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // `next` vient de la barre d'adresse : jamais utilisé tel quel (open redirect), voir safeNextPath.
  const next = safeNextPath(searchParams.get("next"));

  const [mode, setMode] = useState<AuthMode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [orgCode, setOrgCode] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // L'erreur de code d'organisme se pose sous le champ concerné ; les autres au-dessus du bouton.
  const orgCodeError = mode === "signup" && error === ORG_CODE_UNKNOWN ? ORG_CODE_UNKNOWN_HELP : undefined;
  const formError = orgCodeError ? null : error;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);

    try {
      if (mode === "signin") {
        await postJson("/api/auth/login", { email, password });
      } else {
        await postJson("/api/auth/register", { email, password, orgCode, acceptedTerms });
      }

      router.push(next);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col">
      {/* Deux boutons, pas un motif ARIA « tablist » : sans tabindex mobile ni navigation aux
          flèches, annoncer role="tab" promettrait au lecteur d'écran un clavier qui n'existe pas.
          `aria-pressed` dit exactement ce que fait le bouton — l'un des deux est enfoncé. */}
      <div className="mb-6 flex gap-5 border-b border-line">
        {MODES.map(([value, label]) => (
          <button
            key={value}
            type="button"
            aria-pressed={mode === value}
            onClick={() => {
              setMode(value);
              setError(null);
            }}
            className={cn(
              "pb-2.5 font-body text-[15px] font-semibold transition duration-150",
              mode === value ? "border-b-2 border-klein text-ink" : "text-grey hover:text-ink",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-3.5">
        <Field label="E-mail">
          <input
            type="email"
            name="email"
            required
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="camille.test@mail.fr"
            className={inputClasses}
          />
        </Field>

        <Field label="Mot de passe" hint="10 caractères minimum.">
          <input
            type="password"
            name="password"
            required
            minLength={10}
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className={inputClasses}
          />
        </Field>

        {mode === "signup" ? (
          <>
            <Field label="Code d'organisme" error={orgCodeError}>
              <input
                type="text"
                name="orgCode"
                required
                maxLength={8}
                autoComplete="off"
                value={orgCode}
                onChange={(event) => setOrgCode(event.target.value.toUpperCase())}
                placeholder="8 caractères"
                className={cn(inputClasses, "font-mono text-[18px] uppercase tracking-[0.2em]")}
              />
            </Field>

            <Checkbox
              required
              checked={acceptedTerms}
              onChange={(event) => setAcceptedTerms(event.target.checked)}
              className="items-start gap-2.5 py-1 text-[13.5px] text-grey accent-klein"
              label={
                <span>
                  J&apos;ai lu et j&apos;accepte les{" "}
                  <Link href="/cgu" className="text-klein-deep underline underline-offset-2">
                    conditions d&apos;utilisation
                  </Link>
                  .
                </span>
              }
            />
          </>
        ) : null}

        {formError ? (
          <p role="alert" className="rounded-lg border border-bad bg-bad-soft px-3 py-2 font-body text-[13px] text-bad">
            {formError}
          </p>
        ) : null}

        <Button type="submit" variant="primary" pending={pending} className="mt-1 w-full">
          {mode === "signin" ? "Se connecter" : "Créer mon compte"}
        </Button>

        <p className="mt-1 text-center font-body text-[13px] text-grey">
          Vous êtes un organisme de formation&nbsp;?{" "}
          <Link href="/organisme/inscription" className="text-klein-deep underline underline-offset-2">
            Créer un organisme
          </Link>
        </p>
      </div>
    </form>
  );
}
