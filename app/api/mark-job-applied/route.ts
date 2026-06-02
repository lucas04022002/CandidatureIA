import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

interface MarkJobAppliedPayload {
  jobId?: string;
}

export async function POST(request: Request) {
  const payload = (await request.json().catch(() => ({}))) as MarkJobAppliedPayload;
  const jobId = payload.jobId;

  if (!jobId) {
    return NextResponse.json({ ok: false, error: "jobId est requis." }, { status: 400 });
  }

  const supabase = createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json(
      { ok: false, error: "Supabase non configuré côté serveur." },
      { status: 500 },
    );
  }

  const jobsTable = supabase.from("jobs");

  const { error } = await jobsTable
    .update({
      applied_clicked_at: new Date().toISOString(),
      status: "Brouillon",
      updated_at: new Date().toISOString(),
    } as never)
    .eq("id", jobId);

  if (error) {
    return NextResponse.json(
      { ok: false, error: `Impossible d'enregistrer le clic de postulation: ${error.message}` },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, message: "Clic de postulation enregistré." });
}
