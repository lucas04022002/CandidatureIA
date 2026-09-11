import { assertSameOrigin, handle, json } from "@/lib/http";
import { requireUser } from "@/lib/auth/session";
import { exportUserData } from "@/lib/db/queries/users";

export const GET = handle(async (req) => {
  assertSameOrigin(req);
  const user = await requireUser();

  // Portabilité : les lignes du seul utilisateur connecté, servies en pièce jointe.
  const data = await exportUserData(user.id);

  return json(data, {
    headers: { "content-disposition": 'attachment; filename="applybot-donnees.json"' },
  });
});
