"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type AuthMode = "signin" | "signup";

const inputClasses =
  "w-full rounded-[11px] border border-[var(--border-strong)] bg-[var(--card)] px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--foreground-faint)] focus:border-[var(--accent)] focus:outline-none";

export function LoginForm() {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setNotice(null);

    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      setError("Supabase non configuré. Ajoute les variables d'environnement requises.");
      return;
    }

    setPending(true);

    try {
      if (mode === "signin") {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) {
          setError(
            signInError.message === "Invalid login credentials"
              ? "Email ou mot de passe incorrect."
              : signInError.message,
          );
          return;
        }

        router.push("/dashboard");
        router.refresh();
        return;
      }

      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (signUpError) {
        setError(signUpError.message);
        return;
      }

      if (data.session) {
        router.push("/dashboard");
        router.refresh();
        return;
      }

      setNotice("Compte créé. Vérifie ta boîte mail pour confirmer ton adresse avant de te connecter.");
      setMode("signin");
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
              setNotice(null);
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
          minLength={8}
          autoComplete={mode === "signin" ? "current-password" : "new-password"}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="8 caractères minimum"
          className={inputClasses}
        />
      </div>

      {error ? (
        <p className="rounded-[11px] border border-[rgba(255,107,107,0.35)] bg-[rgba(255,107,107,0.08)] px-3 py-2 text-sm text-[#ff9c9c]">
          {error}
        </p>
      ) : null}

      {notice ? (
        <p className="rounded-[11px] border border-[var(--accent-line)] bg-[var(--accent-soft)] px-3 py-2 text-sm text-[var(--accent-text)]">
          {notice}
        </p>
      ) : null}

      <Button type="submit" disabled={pending} className="w-full">
        {pending
          ? "Patiente…"
          : mode === "signin"
            ? "Se connecter"
            : "Créer mon compte"}
      </Button>
    </form>
  );
}
