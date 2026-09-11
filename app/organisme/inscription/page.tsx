import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { RegisterOrganisationForm } from "@/components/app/register-organisation-form";
import { LegalFooter } from "@/components/app/legal-footer";

export const metadata = {
  title: "Créer un organisme — ApplyBot",
};

export default function RegisterOrganisationPage() {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[420px] flex-col justify-center px-4 py-10">
      <Link href="/" className="mb-8 flex items-center gap-3 self-center">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-[linear-gradient(145deg,var(--accent),var(--accent-press))] text-white shadow-[var(--shadow-1),0_6px_18px_-8px_var(--accent)]">
          A
        </span>
        <span>
          <span className="block text-base font-semibold tracking-[-0.02em] text-white">
            ApplyBot
          </span>
          <span className="block text-[11px] text-[var(--foreground-faint)]">Votre pilote de candidatures</span>
        </span>
      </Link>

      <Card>
        <CardContent className="p-6">
          <h1 className="text-lg font-semibold text-white">Créer un organisme de formation</h1>
          <p className="mt-1 text-sm text-[var(--foreground-dim)]">
            Un code d&apos;organisme sera généré ; il permettra à vos stagiaires de s&apos;inscrire. Votre
            organisme sera activé après validation.
          </p>
          <div className="mt-6">
            <RegisterOrganisationForm />
          </div>
          <p className="mt-4 text-center text-xs text-[var(--foreground-faint)]">
            Vous êtes déjà inscrit ?{" "}
            <Link href="/login" className="text-[var(--accent)] hover:underline">
              Se connecter
            </Link>
          </p>
        </CardContent>
      </Card>

      <LegalFooter />
    </div>
  );
}
