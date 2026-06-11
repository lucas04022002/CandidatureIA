import { OnboardingWizard } from "@/components/app/onboarding-wizard";
import { getCandidateProfileSummary } from "@/lib/supabase/queries";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const profileResult = await getCandidateProfileSummary();

  return (
    <div className="mx-auto flex w-full max-w-[1180px] flex-1 px-4 py-6 md:px-8 md:py-10">
      <OnboardingWizard initialProfile={profileResult.data} />
    </div>
  );
}
