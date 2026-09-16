import { z } from "zod";
import { assertSameOrigin, handle, HttpError, json, readJson } from "@/lib/http";
import { requireRole } from "@/lib/auth/session";
import { findTraineeInOrganisation } from "@/lib/db/queries/organisations";
import { deleteUserAndData } from "@/lib/db/queries/users";

const Body = z.object({ userId: z.string().uuid() });

export const POST = handle(async (req) => {
  assertSameOrigin(req);
  const user = await requireRole("responsable");
  if (!user.organisationId) throw new HttpError(400, "Aucun organisme rattaché à ce compte");

  const b = await readJson(req, Body);

  // L'étudiant est cherché DANS l'organisme de la session : un id appartenant à un autre
  // organisme est indiscernable d'un id inexistant, et repart en 404.
  const trainee = await findTraineeInOrganisation(user.organisationId, b.userId);
  if (!trainee) return json({ ok: false, error: "Étudiant introuvable dans votre organisme." }, { status: 404 });

  // Retirer un étudiant efface ses données et libère sa place (`countActiveTrainees` ne compte que
  // les comptes non supprimés).
  await deleteUserAndData(trainee.id);

  return json({ ok: true, message: "Étudiant retiré et données supprimées." });
});
