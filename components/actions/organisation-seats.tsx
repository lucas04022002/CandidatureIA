"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/button";
import { Checkbox, Field } from "@/components/field";
import { useToast } from "@/components/toast";

interface OrganisationSeatsActionProps {
  id: string;
  name: string;
  active: boolean;
  seats: number;
}

const inputClasses =
  "rounded-lg border border-line bg-white px-3 py-1.5 font-body text-[14px] text-ink placeholder:text-grey";

/**
 * Formulaire inline d'une ligne du tableau d'administration : activation, nombre de places, et
 * rattachement d'un responsable par e-mail.
 *
 * Corps inchangé : `POST /api/admin/organisation` avec `{ id, active, seats }`, et
 * `responsableEmail` UNIQUEMENT s'il est renseigné — l'API n'accepte pas une chaîne vide, et un
 * champ laissé vide ne doit surtout pas détacher le responsable en place.
 */
export function OrganisationSeatsAction({ id, name, active, seats }: OrganisationSeatsActionProps) {
  const [nextActive, setNextActive] = useState(active);
  const [nextSeats, setNextSeats] = useState(String(seats));
  const [responsableEmail, setResponsableEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const router = useRouter();
  const { show } = useToast();

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setBusy(true);

    try {
      const response = await fetch("/api/admin/organisation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          active: nextActive,
          seats: Number(nextSeats),
          ...(responsableEmail.trim() ? { responsableEmail: responsableEmail.trim() } : {}),
        }),
      });

      const payload = (await response.json()) as { ok: boolean; error?: string };

      if (!response.ok || !payload.ok) {
        setError(payload.error ?? "L'organisme n'a pas pu être enregistré. Réessayez dans un instant.");
        return;
      }

      setResponsableEmail("");
      show(`${name} enregistré.`);
      startTransition(() => router.refresh());
    } catch {
      setError("Connexion perdue. Vérifiez votre connexion et réessayez.");
    } finally {
      setBusy(false);
    }
  }

  const disabled = busy || pending;

  return (
    <form onSubmit={submit} className="flex flex-wrap items-end gap-3">
      <Checkbox
        checked={nextActive}
        onChange={(event) => setNextActive(event.target.checked)}
        disabled={disabled}
        label="Actif"
        className="pb-2 accent-klein"
      />
      <Field label="Places">
        <input
          type="number"
          min={0}
          max={10000}
          required
          value={nextSeats}
          onChange={(event) => setNextSeats(event.target.value)}
          disabled={disabled}
          className={`${inputClasses} w-24 tnum`}
        />
      </Field>
      {/* Le champ vide est la position normale : on ne le remplit que pour (re)rattacher un
          responsable à un organisme qui n'en a plus — une réparation, pas une opération courante.
          L'explication est portée une fois par le sous-titre de la page, pas répétée à chaque
          ligne du tableau. */}
      <Field label="E-mail du responsable">
        <input
          type="email"
          value={responsableEmail}
          onChange={(event) => setResponsableEmail(event.target.value)}
          disabled={disabled}
          placeholder="prenom.nom@organisme.fr"
          className={`${inputClasses} w-56`}
        />
      </Field>
      <Button type="submit" variant="secondary" size="sm" pending={disabled} className="mb-1">
        Enregistrer
      </Button>
      {error ? (
        <p role="alert" className="w-full font-body text-[12.5px] text-bad">
          {error}
        </p>
      ) : null}
    </form>
  );
}
