import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/validation";

interface MarkJobAppliedPayload {
  jobId?: string;
}

export async function POST(request: Request) {
  const payload = (await request.json().catch(() => ({}))) as MarkJobAppliedPayload;
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
