import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ApplicationStatus } from "@/lib/types";

interface DeleteApplicationPayload {
  applicationId?: string;
}

interface ApplicationRow {
  id: string;
  job_id: string;
}

interface JobRow {
  id: string;
  applied_clicked_at: string | null;
}

interface RemainingApplicationRow {
  status: ApplicationStatus;
  updated_at: string;
}

export async function POST(request: Request) {
  const payload = (await request.json().catch(() => ({}))) as DeleteApplicationPayload;

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
  const jobsTable = supabase.from("jobs");

  const { data: applicationData, error: applicationError } = await applicationsTable
    .select("id,job_id")
    .eq("id", payload.applicationId)
    .maybeSingle();

  if (applicationError) {
    return NextResponse.json(
      { ok: false, error: `Impossible de lire la candidature: ${applicationError.message}` },
      { status: 500 },
    );
  }

  if (!applicationData) {
    return NextResponse.json({ ok: false, error: "Candidature introuvable." }, { status: 404 });
  }

  const application = applicationData as ApplicationRow;

  const { error: deleteError } = await applicationsTable.delete().eq("id", application.id);

  if (deleteError) {
    return NextResponse.json(
      { ok: false, error: `Impossible de supprimer la candidature: ${deleteError.message}` },
      { status: 500 },
    );
  }

  const { data: remainingData, error: remainingError } = await applicationsTable
    .select("status,updated_at")
    .eq("job_id", application.job_id)
    .order("updated_at", { ascending: false });

  if (remainingError) {
    return NextResponse.json(
      {
        ok: true,
        warning: `Candidature supprimée, mais impossible de recalculer le statut de l'offre: ${remainingError.message}`,
      },
      { status: 200 },
    );
  }

  const remainingApplications = (remainingData ?? []) as RemainingApplicationRow[];

  let nextJobStatus: ApplicationStatus = "Nouveau";

  if (remainingApplications.length > 0) {
    nextJobStatus = remainingApplications[0].status;
  } else {
    const { data: jobData, error: jobError } = await jobsTable
      .select("id,applied_clicked_at")
      .eq("id", application.job_id)
      .maybeSingle();

    if (jobError) {
      return NextResponse.json(
        {
          ok: true,
          warning: `Candidature supprimée, mais impossible de relire l'offre: ${jobError.message}`,
        },
        { status: 200 },
      );
    }

    const job = jobData as JobRow | null;
    nextJobStatus = job?.applied_clicked_at ? "Brouillon" : "Nouveau";
  }

  const { error: jobUpdateError } = await jobsTable
    .update({
      status: nextJobStatus,
      updated_at: new Date().toISOString(),
    } as never)
    .eq("id", application.job_id);

  if (jobUpdateError) {
    return NextResponse.json(
      {
        ok: true,
        warning: `Candidature supprimée, mais impossible de mettre à jour l'offre: ${jobUpdateError.message}`,
      },
      { status: 200 },
    );
  }

  return NextResponse.json({
    ok: true,
    message: "Candidature supprimée.",
  });
}
