"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";

type AuthMode = "signin" | "signup";

const inputClasses =
  "w-full rounded-[11px] border border-[var(--border-strong)] bg-[var(--card)] px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--foreground-faint)] focus:border-[var(--accent)] focus:outline-none";

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
  const next = searchParams.get("next");

  const [mode, setMode] = useState<AuthMode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [orgCode, setOrgCode] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);

    try {
      if (mode === "signin") {
        await postJson("/api/auth/login", { email, password });
      } else {
        await postJson("/api/auth/register", { email, password, orgCode });
      }

      router.push(next ?? "/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-1 rounded-[11px] border border-[var(--border)] bg-[var(--card-soft)] p-1">
        {([
          ["signin", "Connexion"],
          ["signup", "Inscription"],
        ] as const).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => {
              setMode(value);
              setError(null);
            }}
            className={
              mode === value
                ? "rounded-[9px] bg-[var(--card-hi)] px-3 py-1.5 text-sm font-medium text-[var(--foreground)]"
                : "rounded-[9px] px-3 py-1.5 text-sm text-[var(--foreground-dim)] transition hover:text-[var(--foreground)]"
            }
          >
            {label}
          </button>
        ))}
      </div>

      <div className="space-y-1.5">
        <label htmlFor="email" className="label-xs block">
          Email
        </label>
        <input
          id="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="toi@exemple.fr"
          className={inputClasses}
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="password" className="label-xs block">
          Mot de passe
        </label>
        <input
          id="password"
          type="password"
          required
          minLength={10}
          autoComplete={mode === "signin" ? "current-password" : "new-password"}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="10 caractères minimum"
          className={inputClasses}
        />
      </div>

      {mode === "signup" ? (
        <div className="space-y-1.5">
          <label htmlFor="orgCode" className="label-xs block">
            Code d&apos;organisme
          </label>
          <input
            id="orgCode"
            type="text"
            required
            maxLength={8}
            autoComplete="off"
            value={orgCode}
            onChange={(event) => setOrgCode(event.target.value.toUpperCase())}
            placeholder="8 caractères"
            className={`${inputClasses} uppercase tracking-[0.15em]`}
          />
        </div>
      ) : null}

      {error ? (
        <p className="rounded-[11px] border border-[rgba(255,107,107,0.35)] bg-[rgba(255,107,107,0.08)] px-3 py-2 text-sm text-[#ff9c9c]">
          {error}
        </p>
      ) : null}

      <Button type="submit" disabled={pending} className="w-full">
        {pending
          ? "Patiente…"
          : mode === "signin"
            ? "Se connecter"
            : "Créer mon compte"}
      </Button>

      <p className="text-center text-xs text-[var(--foreground-faint)]">
        Vous êtes un organisme de formation ?{" "}
        <Link href="/organisme/inscription" className="text-[var(--accent)] hover:underline">
          Créer un organisme
        </Link>
      </p>
    </form>
  );
}
