import { NextResponse } from "next/server";
import { getActiveCandidateProfile } from "@/lib/candidate-profile";
import { getScoringMode, scoreJob } from "@/lib/scoring/job-scoring";
import { createSupabaseServerClient } from "@/lib/supabase/server";

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

export async function POST() {
  const supabase = createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json(
      { ok: false, error: "Supabase non configuré côté serveur." },
      { status: 500 },
    );
  }

  const jobsTable = supabase.from("jobs");
  const { data, error } = await jobsTable.select(
    "id,title,company,location,contract,source,job_description,score",
  );

  if (error) {
    return NextResponse.json(
      { ok: false, error: `Impossible de lire les offres: ${error.message}` },
      { status: 500 },
    );
  }

  const jobs = (data ?? []) as unknown as JobRow[];
  const candidateProfile = await getActiveCandidateProfile();
  let updated = 0;

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

    if (job.score !== scoring.score) {
      const { error: updateError } = await jobsTable
        .update({ score: scoring.score } as never)
        .eq("id", job.id);

      if (!updateError) {
        updated += 1;
      }
    }
  }

  return NextResponse.json({
    ok: true,
    scoringMode: getScoringMode(),
    total: jobs.length,
    updated,
    message: `${updated} offre(s) rescorrée(s).`,
  });
}
