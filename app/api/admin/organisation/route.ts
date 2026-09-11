import { z } from "zod";
import { assertSameOrigin, handle, json, readJson } from "@/lib/http";
import { requireRole } from "@/lib/auth/session";
import { setOrganisationStatus } from "@/lib/db/queries/organisations";

const Body = z.object({
  id: z.string().uuid(),
  active: z.boolean(),
  seats: z.number().int().min(0).max(10000),
});

export const POST = handle(async (req) => {
  assertSameOrigin(req);
  await requireRole("admin");
  const b = await readJson(req, Body);

  const org = await setOrganisationStatus(b.id, { active: b.active, seats: b.seats });
  if (!org) return json({ ok: false, error: "Organisme introuvable." }, { status: 404 });

  return json({
    ok: true,
    organisation: { id: org.id, name: org.name, code: org.code, active: org.active, seats: org.seats },
  });
});
