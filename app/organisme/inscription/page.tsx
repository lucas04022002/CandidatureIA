import Link from "next/link";
import { LegalFooter } from "@/components/legal-footer";
import { RegisterOrganisationForm } from "@/components/forms/register-organisation-form";
import { PublicBar } from "@/components/shell";

export const metadata = {
  title: "Créer un organisme",
};

export default function RegisterOrganisationPage() {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-paper">
      <PublicBar />

      <main className="grid flex-1 place-items-center px-6 py-14">
        <div className="w-[min(440px,100%)] rounded-tile border border-line bg-white p-7">
          <h1 className="font-display text-[22px] font-extrabold leading-[1.15] tracking-[-0.02em]">
            Ouvrir des places pour votre promo
          </h1>
          <p className="mt-2 mb-6 font-body text-[14px] leading-[1.55] text-grey">
            Un code d&apos;organisme à huit caractères vous est attribué : vos étudiants s&apos;inscrivent
            avec ce code. Votre espace est activé, et le nombre de places fixé, après échange avec
            nous.
          </p>

          <RegisterOrganisationForm />

          <p className="mt-4 text-center font-body text-[13px] text-grey">
            Vous avez déjà un espace&nbsp;?{" "}
            <Link href="/login" className="text-klein-deep underline underline-offset-2">
              Se connecter
            </Link>
          </p>
        </div>
      </main>

      <LegalFooter />
    </div>
  );
}
