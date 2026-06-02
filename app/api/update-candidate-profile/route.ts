import { NextResponse } from "next/server";
import { getActiveCandidateProfile } from "@/lib/candidate-profile";
import { scoreJob } from "@/lib/scoring/job-scoring";
import { createSupabaseServerClient } from "@/lib/supabase/server";

interface UpdateCandidateProfilePayload {
  profileId?: string;
  targetRole?: string;
  preferredKeywords?: string[];
}

interface JobRow {
  id: string;
  title: string;
  company: string;
  location: string;
  contract: string;
  source: string;
  job_description: string | null;
  score: number;
}

export async function POST(request: Request) {
  const payload = (await request.json().catch(() => ({}))) as UpdateCandidateProfilePayload;

  if (!payload.profileId) {
    return NextResponse.json({ ok: false, error: "profileId est requis." }, { status: 400 });
  }

  const supabase = createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json(
      { ok: false, error: "Supabase non configuré côté serveur." },
      { status: 500 },
    );
  }

  const targetRole = payload.targetRole?.trim() || "";
  const preferredKeywords = (payload.preferredKeywords ?? [])
    .map((keyword) => keyword.trim())
    .filter(Boolean);

  const { error: updateError } = await supabase
    .from("candidate_profiles")
    .update({
      target_role: targetRole,
      preferred_keywords: preferredKeywords,
      updated_at: new Date().toISOString(),
    } as never)
    .eq("id", payload.profileId);

  if (updateError) {
    return NextResponse.json(
      { ok: false, error: `Impossible de mettre à jour le profil: ${updateError.message}` },
      { status: 500 },
    );
  }

  const candidateProfile = await getActiveCandidateProfile();

  const { data: jobsData, error: jobsError } = await supabase
    .from("jobs")
    .select("id,title,company,location,contract,source,job_description,score");

  if (jobsError) {
    return NextResponse.json(
      {
        ok: true,
        warning: `Profil mis à jour, mais rescoring impossible: ${jobsError.message}`,
      },
      { status: 200 },
    );
  }

  const jobs = (jobsData ?? []) as unknown as JobRow[];
  let rescored = 0;

  for (const job of jobs) {
    const scoring = await scoreJob(
      {
        title: job.title,
        company: job.company,
        location: job.location,
        contract: job.contract,
        source: job.source,
        description: job.job_description,
      },
      { mode: "heuristic", allowOpenAI: false, candidateProfile },
    );

    if (scoring.score !== job.score) {
      const { error } = await supabase
        .from("jobs")
        .update({ score: scoring.score } as never)
        .eq("id", job.id);
      if (!error) {
        rescored += 1;
      }
    }
  }

  return NextResponse.json({
    ok: true,
    message: "Profil cible mis à jour.",
    rescored,
  });
}
