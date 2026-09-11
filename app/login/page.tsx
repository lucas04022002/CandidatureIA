import { Suspense } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { LoginForm } from "@/components/app/login-form";
import { LegalFooter } from "@/components/app/legal-footer";

export const metadata = {
  title: "Connexion — ApplyBot",
};

export default function LoginPage() {
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
          <span className="block text-[11px] text-[var(--foreground-faint)]">AI Career OS</span>
        </span>
      </Link>

      <Card>
        <CardContent className="p-6">
          <h1 className="text-lg font-semibold text-white">Accède à ton espace</h1>
          <p className="mt-1 text-sm text-[var(--foreground-dim)]">
            Connecte-toi pour retrouver tes offres, tes candidatures et ton profil.
          </p>
          <div className="mt-6">
            <Suspense fallback={null}>
              <LoginForm />
            </Suspense>
          </div>
        </CardContent>
      </Card>

      <LegalFooter />
    </div>
  );
}
