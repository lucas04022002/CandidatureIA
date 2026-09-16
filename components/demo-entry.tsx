"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/button";

/**
 * Le bouton qui fait entrer dans la démonstration.
 *
 * Il passe par `/api/auth/login`, comme n'importe quelle connexion : pas de
 * route d'authentification parallèle, donc pas de second chemin à sécuriser.
 * Le plafond d'essais ne gêne pas — une connexion réussie efface le compteur,
 * il ne mord que sur les échecs.
 */
export function DemoEntry({ email, password }: { email: string; password: string }) {
  const router = useRouter();
  const [etat, setEtat] = useState<"repos" | "envoi" | "erreur">("repos");

  async function entrer() {
    setEtat("envoi");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        setEtat("erreur");
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch {
      setEtat("erreur");
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-4">
        <Button variant="primary" onClick={entrer} pending={etat === "envoi"}>
          {etat === "envoi" ? "Connexion…" : "Entrer dans la démonstration"}
        </Button>
        <p className="font-body text-[14px] text-grey">Sans inscription. Sans code. Deux secondes.</p>
      </div>

      {etat === "erreur" && (
        <p role="alert" className="mt-4 font-body text-[14.5px] leading-[1.55] text-bad">
          La connexion a échoué. Vous pouvez entrer les identifiants ci-dessous depuis la{" "}
          <a className="underline underline-offset-[3px]" href="/login">
            page de connexion
          </a>
          .
        </p>
      )}

      <dl className="mt-6 grid gap-x-6 gap-y-2 border-t border-line pt-5 font-mono text-[13px] sm:grid-cols-[auto_1fr]">
        <dt className="text-grey">E-mail</dt>
        <dd className="m-0 break-all text-ink">{email}</dd>
        <dt className="text-grey">Mot de passe</dt>
        <dd className="m-0 break-all text-ink">{password}</dd>
      </dl>
    </div>
  );
}
