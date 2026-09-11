"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/button";
import { Checkbox, Field } from "@/components/field";

const inputClasses =
  "w-full rounded-lg border border-line bg-white px-3 py-2.5 font-body text-[15px] text-ink placeholder:text-grey";

/**
 * Création d'un espace organisme. Même gabarit que la connexion du stagiaire, au vouvoiement
 * (spec §4). Le corps envoyé est inchangé : { organisationName, email, password, acceptedTerms }.
 */
export function RegisterOrganisationForm() {
  const router = useRouter();
  const [organisationName, setOrganisationName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
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
        body: JSON.stringify({ organisationName, email, password, acceptedTerms }),
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
    <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
      <Field label="Nom de l'organisme">
        <input
          type="text"
          name="organisationName"
          required
          minLength={2}
          value={organisationName}
          onChange={(event) => setOrganisationName(event.target.value)}
          placeholder="AFPA, Greta, …"
          className={inputClasses}
        />
      </Field>

      <Field label="E-mail du responsable">
        <input
          type="email"
          name="email"
          required
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="responsable@organisme.fr"
          className={inputClasses}
        />
      </Field>

      <Field label="Mot de passe" hint="10 caractères minimum.">
        <input
          type="password"
          name="password"
          required
          minLength={10}
          autoComplete="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className={inputClasses}
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

      {error ? (
        <p role="alert" className="rounded-lg border border-bad bg-bad-soft px-3 py-2 font-body text-[13px] text-bad">
          {error}
        </p>
      ) : null}

      {notice ? (
        <p role="status" className="rounded-lg border border-klein-soft bg-klein-soft px-3 py-2 font-body text-[13px] text-klein-deep">
          {notice}
        </p>
      ) : null}

      <Button type="submit" variant="primary" pending={pending} className="mt-1 w-full">
        Créer mon organisme
      </Button>
    </form>
  );
}
