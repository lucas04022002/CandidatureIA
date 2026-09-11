import { redirect } from "next/navigation";
import { OnboardingWizard } from "@/components/app/onboarding-wizard";
import { getSession } from "@/lib/auth/session";
import { getCandidateProfileSummary } from "@/lib/db/queries/profiles";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const profile = await getCandidateProfileSummary(session.id);

  return (
    <div className="mx-auto flex w-full max-w-[1180px] flex-1 px-4 py-6 md:px-8 md:py-10">
      <OnboardingWizard initialProfile={profile} />
    </div>
  );
}
