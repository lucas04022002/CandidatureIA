import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { PageTitle } from "@/components/page-title";
import { AccountActions } from "@/components/forms/account-actions";
import { CvUpload } from "@/components/forms/cv-upload";
import { ProfileForm } from "@/components/forms/profile-form";
import { getSession } from "@/lib/auth/session";
import { getCandidateProfileSummary } from "@/lib/db/queries/profiles";

export const dynamic = "force-dynamic";

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4 rounded-tile border border-line bg-white px-6 py-5">
      <h2 className="font-display text-[22px] font-extrabold leading-none text-ink">{title}</h2>
      {children}
    </section>
  );
}

export default async function ProfilPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const profile = await getCandidateProfileSummary(session.id);
  const imported = profile.source === "imported";

  return (
    <div className="flex flex-col gap-6">
      <PageTitle
        title="Ton profil"
        subtitle="Ce que ton CV a donné, et ce qui sert à écrire tes lettres."
      />

      <Card title="Ton CV">
        <dl className="grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="font-mono text-[12px] uppercase tracking-[0.06em] text-grey">Nom</dt>
            <dd className="font-body text-[15px] text-ink">{profile.fullName}</dd>
          </div>
          <div>
            <dt className="font-mono text-[12px] uppercase tracking-[0.06em] text-grey">
              Poste visé
            </dt>
            <dd className="font-body text-[15px] text-ink">{profile.targetRole || profile.role}</dd>
          </div>
          <div>
            <dt className="font-mono text-[12px] uppercase tracking-[0.06em] text-grey">
              Mots-clés
            </dt>
            <dd className="font-body text-[15px] text-ink">
              {profile.preferredKeywords.length ? profile.preferredKeywords.join(", ") : "Aucun"}
            </dd>
          </div>
          <div>
            <dt className="font-mono text-[12px] uppercase tracking-[0.06em] text-grey">
              Compétences
            </dt>
            <dd className="font-body text-[15px] text-ink">
              {profile.technicalSkills.length ? profile.technicalSkills.join(", ") : "Aucune"}
            </dd>
          </div>
        </dl>

        {imported ? null : (
          <p className="font-body text-[13px] text-grey">
            Aucun CV importé pour l&apos;instant : les offres sont classées sur un profil par défaut.
          </p>
        )}

        <CvUpload imported={imported} />
      </Card>

      <Card title="Ta lettre type">
        <ProfileForm profile={profile} />
      </Card>

      <Card title="Tes données">
        <AccountActions email={session.email} />
      </Card>
    </div>
  );
}
