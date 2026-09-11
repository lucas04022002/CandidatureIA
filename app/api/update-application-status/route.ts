import { z } from "zod";
import { assertSameOrigin, handle, json, readJson } from "@/lib/http";
import { requireUser } from "@/lib/auth/session";
import { updateApplicationStatus } from "@/lib/db/queries/applications";
import { updateJobStatus } from "@/lib/db/queries/jobs";
import { APPLICATION_STATUSES } from "@/lib/types";

const Body = z.object({
  applicationId: z.string().uuid(),
  status: z.enum(APPLICATION_STATUSES),
});

export const POST = handle(async (req) => {
  assertSameOrigin(req);
  const user = await requireUser();
  const b = await readJson(req, Body);

  const application = await updateApplicationStatus(user.id, b.applicationId, b.status);
  if (!application) return json({ ok: false, error: "Candidature introuvable." }, { status: 404 });

  // L'offre suit le statut de sa candidature : même filtre `userId`, jamais l'id brut du corps.
  if (application.jobId) await updateJobStatus(user.id, application.jobId, b.status);

  return json({ ok: true, message: `Statut mis à jour: ${b.status}` });
});
