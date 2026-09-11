import { z } from "zod";
import { assertSameOrigin, handle, json, readJson } from "@/lib/http";
import { requireUser } from "@/lib/auth/session";
import { getActiveCandidateProfile } from "@/lib/candidate-profile";
import { generateApplicationTexts } from "@/lib/application-generation";
import { createApplication } from "@/lib/db/queries/applications";
import { getJobById, updateJobStatus } from "@/lib/db/queries/jobs";

const Body = z.object({ jobId: z.string().uuid() });

export const POST = handle(async (req) => {
  assertSameOrigin(req);
  const user = await requireUser();
  const b = await readJson(req, Body);

  const job = await getJobById(user.id, b.jobId);
  if (!job) return json({ ok: false, error: "Offre introuvable." }, { status: 404 });

  const candidateProfile = await getActiveCandidateProfile(user.id);
  const { letterText, emailText, linkedInText, source: generationSource } = await generateApplicationTexts(
    {
      title: job.title,
      company: job.company,
      location: job.location,
      contract: job.contract,
      source: job.source,
      job_description: job.jobDescription,
    },
    candidateProfile,
  );

  const application = await createApplication(user.id, job.id, { letterText, emailText, linkedInText });
  if (!application) return json({ ok: false, error: "Offre introuvable." }, { status: 404 });

  await updateJobStatus(user.id, job.id, "À valider");

  return json({
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
});
