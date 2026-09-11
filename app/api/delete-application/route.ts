import { z } from "zod";
import { assertSameOrigin, handle, json, readJson } from "@/lib/http";
import { requireUser } from "@/lib/auth/session";
import { deleteApplication, getApplicationsForJob } from "@/lib/db/queries/applications";
import { getJobById, updateJobStatus } from "@/lib/db/queries/jobs";
import type { ApplicationStatus } from "@/lib/types";

const Body = z.object({ applicationId: z.string().uuid() });

export const POST = handle(async (req) => {
  assertSameOrigin(req);
  const user = await requireUser();
  const b = await readJson(req, Body);

  const removed = await deleteApplication(user.id, b.applicationId);
  if (!removed) return json({ ok: false, error: "Candidature introuvable." }, { status: 404 });

  // Statut de l'offre recalculé : la candidature restante la plus récente, sinon "Brouillon" si
  // l'utilisateur avait déjà cliqué sur "postuler", sinon retour à "Nouveau".
  const remaining = await getApplicationsForJob(user.id, removed.jobId);
  let nextJobStatus: ApplicationStatus = "Nouveau";
  if (remaining.length > 0) {
    nextJobStatus = remaining[0].status;
  } else {
    const job = await getJobById(user.id, removed.jobId);
    nextJobStatus = job?.appliedClickedAt ? "Brouillon" : "Nouveau";
  }

  await updateJobStatus(user.id, removed.jobId, nextJobStatus);

  return json({ ok: true, message: "Candidature supprimée." });
});
