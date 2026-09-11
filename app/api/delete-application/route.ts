import { z } from "zod";
import { assertSameOrigin, handle, json, readJson } from "@/lib/http";
import { requireUser } from "@/lib/auth/session";
import { deleteApplication } from "@/lib/db/queries/applications";
import { getJobById, updateJobStatus } from "@/lib/db/queries/jobs";
import type { ApplicationStatus } from "@/lib/types";

const Body = z.object({ applicationId: z.string().uuid() });

export const POST = handle(async (req) => {
  assertSameOrigin(req);
  const user = await requireUser();
  const b = await readJson(req, Body);

  const removed = await deleteApplication(user.id, b.applicationId);
  if (!removed) return json({ ok: false, error: "Candidature introuvable." }, { status: 404 });

  // L'unicité (job_id, user_id) garantit qu'il n'existait qu'une candidature pour cette offre :
  // après suppression, l'offre retombe sur "Brouillon" si l'utilisateur avait cliqué sur
  // "postuler", sinon sur "Nouveau".
  const job = await getJobById(user.id, removed.jobId);
  const nextJobStatus: ApplicationStatus = job?.appliedClickedAt ? "Brouillon" : "Nouveau";

  await updateJobStatus(user.id, removed.jobId, nextJobStatus);

  return json({ ok: true, message: "Candidature supprimée." });
});
