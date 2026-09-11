import { assertSameOrigin, handle, json } from "@/lib/http";
import { clearSessionCookie, requireUser } from "@/lib/auth/session";
import { deleteUserAndData } from "@/lib/db/queries/users";

export const DELETE = handle(async (req) => {
  assertSameOrigin(req);
  const user = await requireUser();

  // Droit à l'effacement : seul l'id de la session est supprimé, aucun paramètre n'est accepté.
  await deleteUserAndData(user.id);

  const res = json({ ok: true, message: "Compte et données supprimés." });
  clearSessionCookie(res);
  return res;
});
