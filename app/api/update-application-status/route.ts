import { NextResponse } from "next/server";
import { APPLICATION_STATUSES, type ApplicationStatus } from "@/lib/types";
import { createSupabaseServerClient } from "@/lib/supabase/server";

interface UpdateStatusPayload {
  applicationId?: string;
  status?: ApplicationStatus;
}

interface ApplicationLinkRow {
  id: string;
  job_id: string;
  sent_at: string | null;
}

function isValidStatus(value: unknown): value is ApplicationStatus {
  return typeof value === "string" && APPLICATION_STATUSES.includes(value as ApplicationStatus);
}

export async function POST(request: Request) {
  const payload = (await request.json().catch(() => ({}))) as UpdateStatusPayload;

  if (!payload.applicationId) {
    return NextResponse.json({ ok: false, error: "applicationId est requis." }, { status: 400 });
  }

  if (!isValidStatus(payload.status)) {
    return NextResponse.json({ ok: false, error: "Statut invalide." }, { status: 400 });
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

  const { data: appLinkData, error: appLinkError } = await applicationsTable
    .select("id,job_id,sent_at")
    .eq("id", payload.applicationId)
    .maybeSingle();

  if (appLinkError) {
    return NextResponse.json(
      { ok: false, error: `Impossible de lire la candidature: ${appLinkError.message}` },
      { status: 500 },
    );
  }

  if (!appLinkData) {
    return NextResponse.json({ ok: false, error: "Candidature introuvable." }, { status: 404 });
  }

  const appLink = appLinkData as ApplicationLinkRow;
  const shouldSetSentAt = payload.status === "Envoyé" && !appLink.sent_at;
  const nowIso = new Date().toISOString();

  const { error: appUpdateError } = await applicationsTable
    .update({
      status: payload.status,
      updated_at: nowIso,
      ...(shouldSetSentAt ? { sent_at: nowIso } : {}),
    } as never)
    .eq("id", appLink.id);

  if (appUpdateError) {
    return NextResponse.json(
      { ok: false, error: `Impossible de mettre à jour la candidature: ${appUpdateError.message}` },
      { status: 500 },
    );
  }

  const { error: jobUpdateError } = await jobsTable
    .update({
      status: payload.status,
      updated_at: nowIso,
    } as never)
    .eq("id", appLink.job_id);

  if (jobUpdateError) {
    return NextResponse.json(
      {
        ok: true,
        warning: `Statut candidature mis à jour, mais pas celui de l'offre: ${jobUpdateError.message}`,
      },
      { status: 200 },
    );
  }

  return NextResponse.json({
    ok: true,
    message: `Statut mis à jour: ${payload.status}`,
  });
}
