import { z } from "zod";
import { assertSameOrigin, handle, json, readJson } from "@/lib/http";
import { requireUser } from "@/lib/auth/session";
import { getActiveCandidateProfile } from "@/lib/candidate-profile";
import { getProfile, upsertProfile } from "@/lib/db/queries/profiles";
import { getJobRows, updateJobScore } from "@/lib/db/queries/jobs";
import { scoreJob } from "@/lib/scoring/job-scoring";

// `profileId` est encore accepté (le client l'envoie) mais n'est jamais utilisé comme filtre : le
// profil modifié est toujours celui de la session.
const Body = z.object({
  profileId: z.string().optional(),
  targetRole: z.string().max(200).optional(),
  preferredKeywords: z.array(z.string().max(100)).max(50).optional(),
  baseLetterTemplate: z.string().max(20000).optional(),
});

export const POST = handle(async (req) => {
  assertSameOrigin(req);
  const user = await requireUser();
  const b = await readJson(req, Body);

  const existing = await getProfile(user.id);
  if (!existing) {
    return json({ ok: false, error: "Importe d'abord un CV avant de personnaliser la cible." }, { status: 404 });
  }

  await upsertProfile(user.id, {
    targetRole: b.targetRole?.trim() || "",
    preferredKeywords: (b.preferredKeywords ?? []).map((keyword) => keyword.trim()).filter(Boolean),
    baseLetterTemplate: b.baseLetterTemplate?.trim() || "",
  });

  const candidateProfile = await getActiveCandidateProfile(user.id);
  const jobs = await getJobRows(user.id);
  let rescored = 0;

  for (const job of jobs) {
    const scoring = await scoreJob(
      {
        title: job.title,
        company: job.company,
        location: job.location,
        contract: job.contract,
        source: job.source,
        description: job.jobDescription,
      },
      { mode: "heuristic", allowOpenAI: false, candidateProfile },
    );

    if (scoring.score !== job.score && (await updateJobScore(user.id, job.id, scoring.score))) {
      rescored += 1;
    }
  }

  return json({ ok: true, message: "Profil cible mis à jour.", rescored });
});
