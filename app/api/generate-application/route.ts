import { NextResponse } from "next/server";
import {
  getActiveCandidateProfile,
} from "@/lib/candidate-profile";
import { generateApplicationTexts } from "@/lib/application-generation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/validation";

interface GeneratePayload {
  jobId?: string;
}

interface JobRow {
  id: string;
  title: string;
  company: string;
  location: string;
  contract: string;
  source: string;
  job_description: string | null;
}

interface ExistingApplicationRow {
  id: string;
}

export async function POST(request: Request) {
  const payload = (await request.json().catch(() => ({}))) as GeneratePayload;
  const jobId = payload.jobId;

  if (!isUuid(jobId)) {
    return NextResponse.json({ ok: false, error: "jobId valide requis." }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json(
      { ok: false, error: "Supabase non configuré côté serveur." },
      { status: 500 },
    );
  }

  const jobsTable = supabase.from("jobs");
  const applicationsTable = supabase.from("applications");

  const { data: jobData, error: jobError } = await jobsTable
    .select("id,title,company,location,contract,source,job_description")
    .eq("id", jobId)
    .maybeSingle();

  if (jobError) {
    return NextResponse.json(
      { ok: false, error: `Impossible de lire l'offre: ${jobError.message}` },
      { status: 500 },
    );
  }

  if (!jobData) {
    return NextResponse.json({ ok: false, error: "Offre introuvable." }, { status: 404 });
  }

  const job = jobData as JobRow;
  const candidateProfile = await getActiveCandidateProfile();
  const { letterText, emailText, linkedInText, source: generationSource } =
    await generateApplicationTexts(job, candidateProfile);

  const { data: existingAppData, error: existingAppError } = await applicationsTable
    .select("id")
    .eq("job_id", jobId)
    .maybeSingle();

  if (existingAppError) {
    return NextResponse.json(
      { ok: false, error: `Impossible de lire la candidature existante: ${existingAppError.message}` },
      { status: 500 },
    );
  }

  const existingApp = (existingAppData as ExistingApplicationRow | null) ?? null;

  if (existingApp) {
    const updatePayload = {
      status: "À valider",
      letter_generated: true,
      email_generated: true,
      linkedin_generated: true,
      letter_text: letterText,
      email_text: emailText,
      linkedin_text: linkedInText,
      updated_at: new Date().toISOString(),
    };

    const { error: updateError } = await applicationsTable
      .update(updatePayload as never)
      .eq("id", existingApp.id);

    if (updateError) {
      return NextResponse.json(
        { ok: false, error: `Echec de la mise à jour: ${updateError.message}` },
        { status: 500 },
      );
    }
  } else {
    const insertPayload = {
      id: crypto.randomUUID(),
      job_id: jobId,
      status: "À valider",
      letter_generated: true,
      email_generated: true,
      linkedin_generated: true,
      letter_text: letterText,
      email_text: emailText,
      linkedin_text: linkedInText,
    };

    const { error: insertError } = await applicationsTable.insert(insertPayload as never);

    if (insertError) {
      return NextResponse.json(
        { ok: false, error: `Echec de la création: ${insertError.message}` },
        { status: 500 },
      );
    }
  }

  const { error: jobStatusError } = await jobsTable
    .update({ status: "À valider" } as never)
    .eq("id", jobId);

  if (jobStatusError) {
    return NextResponse.json(
      {
        ok: true,
        warning: `Candidature générée mais statut job non mis à jour: ${jobStatusError.message}`,
        letterText,
        emailText,
        linkedInText,
      },
      { status: 200 },
    );
  }

  return NextResponse.json({
    ok: true,
    message:
      generationSource === "openai"
        ? "Candidature générée avec succès (IA)."
        : "Candidature générée avec succès (mode heuristique, configure OPENAI_API_KEY pour des textes personnalisés par IA).",
    generationSource,
    letterText,
    emailText,
    linkedInText,
  });
}
