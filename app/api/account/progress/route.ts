import { z } from "zod";
import { assertSameOrigin, handle, json, readJson } from "@/lib/http";
import { requireRole } from "@/lib/auth/session";
import { setFoundCompany, setShareProgress } from "@/lib/db/queries/progress";

const Body = z.object({ shareProgress: z.boolean().optional(), foundCompany: z.boolean().optional() });

// Réglages de l'étudiant : partager son avancement avec son organisme, et déclarer « entreprise
// trouvée ». Seul l'étudiant y touche : c'est sa donnée, l'organisme ne fait que la lire.
export const POST = handle(async (req) => {
  assertSameOrigin(req);
  const user = await requireRole("etudiant");
  const b = await readJson(req, Body);
  if (b.shareProgress !== undefined) await setShareProgress(user.id, b.shareProgress);
  if (b.foundCompany !== undefined) await setFoundCompany(user.id, b.foundCompany);
  return json({ ok: true });
});
