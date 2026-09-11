import { Suspense } from "react";
import { LegalFooter } from "@/components/legal-footer";
import { LoginForm } from "@/components/forms/login-form";
import { PublicBar } from "@/components/shell";

export const metadata = {
  title: "Connexion",
};

export default function LoginPage() {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-paper">
      <PublicBar />

      <main className="grid flex-1 place-items-center px-6 py-14">
        <div className="w-[min(440px,100%)] rounded-tile border border-line bg-white p-7">
          <h1 className="sr-only">Connexion ou inscription</h1>
          <Suspense fallback={null}>
            <LoginForm />
          </Suspense>
        </div>
      </main>

      <LegalFooter />
    </div>
  );
}
