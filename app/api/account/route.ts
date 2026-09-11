import { assertSameOrigin, handle, HttpError, json } from "@/lib/http";
import { clearSessionCookie, requireUser } from "@/lib/auth/session";
import { countActiveAdmins, deleteUserAndData } from "@/lib/db/queries/users";

export const DELETE = handle(async (req) => {
  assertSameOrigin(req);
  const user = await requireUser();

  // Un service sans administrateur n'est plus administrable : le dernier admin ne peut pas se
  // supprimer lui-même. Il doit d'abord en créer un second.
  if (user.role === "admin" && (await countActiveAdmins()) <= 1) {
    throw new HttpError(409, "Le dernier compte administrateur ne peut pas être supprimé");
  }

  // Droit à l'effacement : seul l'id de la session est supprimé, aucun paramètre n'est accepté.
  await deleteUserAndData(user.id);

  const res = json({ ok: true, message: "Compte et données supprimés." });
  clearSessionCookie(res);
  return res;
});
