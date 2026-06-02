import { NextResponse } from "next/server";
import { getActiveCandidateProfile } from "@/lib/candidate-profile";
import { createSupabaseServerClient } from "@/lib/supabase/server";

interface GenerateFollowupPayload {
  applicationId?: string;
}

interface ApplicationWithJobRow {
  id: string;
  status: string;
  sent_at: string | null;
  email_text: string | null;
  jobs:
    | {
        title: string;
        company: string;
        location: string;
        contract: string;
      }
    | {
        title: string;
        company: string;
        location: string;
        contract: string;
      }[]
    | null;
}

function addDays(date: Date, days: number) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function asDateLabel(date: Date) {
  return date.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function buildFollowupEmail(
  row: ApplicationWithJobRow,
  sendDateHint: string,
  candidateProfile: Awaited<ReturnType<typeof getActiveCandidateProfile>>,
) {
  const job = Array.isArray(row.jobs) ? row.jobs[0] : row.jobs;
  const title = job?.title ?? "votre offre";
  const company = job?.company ?? "votre entreprise";
  const location = job?.location ?? "";

  return `Bonjour,

Je me permets de revenir vers vous concernant ma candidature au poste "${title}"${location ? ` (${location})` : ""} chez ${company}.

Je reste très motivé pour rejoindre votre équipe et contribuer sur ce poste. Je suis disponible rapidement pour un échange si vous le souhaitez.

N'hésitez pas à me dire si vous avez besoin d'informations complémentaires.

Bien cordialement,
${candidateProfile.fullName}
${candidateProfile.email}
${candidateProfile.phone}

Relance conseillée à partir du ${sendDateHint}.`;
}

export async function POST(request: Request) {
  const payload = (await request.json().catch(() => ({}))) as GenerateFollowupPayload;

  if (!payload.applicationId) {
    return NextResponse.json({ ok: false, error: "applicationId est requis." }, { status: 400 });
  }

  const supabase = createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json(
      { ok: false, error: "Supabase non configuré côté serveur." },
      { status: 500 },
    );
  }

  const applicationsTable = supabase.from("applications");

  const { data, error } = await applicationsTable
    .select(
      "id,status,sent_at,email_text,jobs!applications_job_id_fkey(title,company,location,contract)",
    )
    .eq("id", payload.applicationId)
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { ok: false, error: `Lecture candidature impossible: ${error.message}` },
      { status: 500 },
    );
  }

  if (!data) {
    return NextResponse.json({ ok: false, error: "Candidature introuvable." }, { status: 404 });
  }

  const row = data as ApplicationWithJobRow;
  const candidateProfile = await getActiveCandidateProfile();
  const sentReference = row.sent_at ? new Date(row.sent_at) : new Date();
  const suggestedDate = addDays(sentReference, 4);
  const suggestedDateLabel = asDateLabel(suggestedDate);

  const followupEmailText = buildFollowupEmail(row, suggestedDateLabel, candidateProfile);

  const { error: updateError } = await applicationsTable
    .update({
      followup_email_text: followupEmailText,
      updated_at: new Date().toISOString(),
    } as never)
    .eq("id", row.id);

  if (updateError) {
    return NextResponse.json(
      { ok: false, error: `Sauvegarde de la relance impossible: ${updateError.message}` },
      { status: 500 },
    );
  }

  const warning = row.status !== "Envoyé" ? "Relance générée: pense à marquer la candidature comme 'Envoyé'." : undefined;

  return NextResponse.json({
    ok: true,
    message: "Relance J+4 générée.",
    warning,
    suggestedDate: suggestedDateLabel,
    followupEmailText,
  });
}
