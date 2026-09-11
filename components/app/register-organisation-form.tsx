"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

const inputClasses =
  "w-full rounded-[11px] border border-[var(--border-strong)] bg-[var(--card)] px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--foreground-faint)] focus:border-[var(--accent)] focus:outline-none";

export function RegisterOrganisationForm() {
  const router = useRouter();
  const [organisationName, setOrganisationName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    setPending(true);

    try {
      const res = await fetch("/api/auth/register-organisation", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ organisationName, email, password }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Une erreur est survenue.");
        return;
      }

      setNotice(typeof data.message === "string" ? data.message : "Organisme créé.");
      setTimeout(() => {
        router.push("/dashboard");
        router.refresh();
      }, 1500);
    } catch {
      setError("Une erreur est survenue.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <label htmlFor="organisationName" className="label-xs block">
          Nom de l&apos;organisme
        </label>
        <input
          id="organisationName"
          type="text"
          required
          minLength={2}
          value={organisationName}
          onChange={(event) => setOrganisationName(event.target.value)}
          placeholder="AFPA, Greta, …"
          className={inputClasses}
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="email" className="label-xs block">
          Email du responsable
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
          autoComplete="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="10 caractères minimum"
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
        {pending ? "Patiente…" : "Créer mon organisme"}
      </Button>
    </form>
  );
}
