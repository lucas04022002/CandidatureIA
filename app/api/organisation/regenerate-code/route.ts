import { assertSameOrigin, handle, HttpError, json } from "@/lib/http";
import { requireRole } from "@/lib/auth/session";
import { regenerateCode } from "@/lib/db/queries/organisations";

export const POST = handle(async (req) => {
  assertSameOrigin(req);
  const user = await requireRole("responsable");
  if (!user.organisationId) throw new HttpError(400, "Aucun organisme rattaché à ce compte");

  // L'id vient de la session, jamais du corps de la requête : un responsable ne peut régénérer que
  // le code de SON organisme.
  const org = await regenerateCode(user.organisationId);
  if (!org) return json({ ok: false, error: "Organisme introuvable." }, { status: 404 });

  return json({ ok: true, code: org.code });
});
