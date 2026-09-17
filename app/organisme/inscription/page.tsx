import Link from "next/link";
import { PLACES_ESSAI } from "@/lib/places";
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
          {/* Cette page annonçait « Votre espace est activé, et le nombre de
              places fixé, après échange avec nous ». Le code n'attend rien :
              l'organisme est créé `active: true` avec PLACES_ESSAI places, et
              le code fonctionne immédiatement. La page organisme promet, elle,
              « aucune validation de notre part » — les deux se contredisaient. */}
          <p className="mt-2 mb-6 font-body text-[14px] leading-[1.55] text-grey">
            Un code d&apos;organisme à huit caractères vous est attribué immédiatement, avec{" "}
            {PLACES_ESSAI} places d&apos;essai : vos étudiants peuvent s&apos;inscrire dès
            maintenant. Écrivez-nous pour en ouvrir davantage.
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
