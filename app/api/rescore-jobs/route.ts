import { assertSameOrigin, handle, json } from "@/lib/http";
import { requireUser } from "@/lib/auth/session";
import { getActiveCandidateProfile } from "@/lib/candidate-profile";
import { getJobRows, updateJobScore } from "@/lib/db/queries/jobs";
import { scoreJob } from "@/lib/scoring/job-scoring";

export const POST = handle(async (req) => {
  assertSameOrigin(req);
  const user = await requireUser();

  const jobs = await getJobRows(user.id);
  const candidateProfile = await getActiveCandidateProfile(user.id);
  let updated = 0;

  for (const job of jobs) {
    const scoring = scoreJob(
      {
        title: job.title,
        company: job.company,
        location: job.location,
        contract: job.contract,
        source: job.source,
        description: job.jobDescription,
      },
      { candidateProfile },
    );

    if (job.score !== scoring.score && (await updateJobScore(user.id, job.id, scoring.score))) {
      updated += 1;
    }
  }

  return json({
    ok: true,
    total: jobs.length,
    updated,
    message: `${updated} offre(s) rescorrée(s).`,
  });
});
