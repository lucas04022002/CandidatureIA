import { redirect } from "next/navigation";
import { OnboardingWizard } from "@/components/forms/onboarding-wizard";
import { getSession } from "@/lib/auth/session";
import { getCandidateProfileSummary } from "@/lib/db/queries/profiles";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const profile = await getCandidateProfileSummary(session.id);

  return (
    <div className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">
      <OnboardingWizard initialProfile={profile} />
    </div>
  );
}
