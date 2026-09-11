import { z } from "zod";
import { assertSameOrigin, handle, json, readJson } from "@/lib/http";
import { requireUser } from "@/lib/auth/session";
import { markJobApplied } from "@/lib/db/queries/jobs";

const Body = z.object({ jobId: z.string().uuid() });

export const POST = handle(async (req) => {
  assertSameOrigin(req);
  const user = await requireUser();
  const b = await readJson(req, Body);

  const job = await markJobApplied(user.id, b.jobId);
  if (!job) return json({ ok: false, error: "Offre introuvable." }, { status: 404 });

  return json({ ok: true, message: "Clic de postulation enregistré." });
});
