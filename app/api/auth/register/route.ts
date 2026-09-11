import { z } from "zod";
import { handle, json, assertSameOrigin, readJson, HttpError } from "@/lib/http";
import { hashPassword } from "@/lib/auth/password";
import { signSession } from "@/lib/auth/jwt";
import { setSessionCookie } from "@/lib/auth/session";
import { registerTraineeWithCode, OrgCodeError } from "@/lib/db/queries/organisations";
import { checkIpAttempts, getClientIp, recordIpAttempt } from "@/lib/rate-limit";

const Body = z.object({
  email: z.string().email().max(200),
  password: z.string().min(10).max(200),
  orgCode: z.string().trim().toUpperCase().length(8),
});

const MESSAGES = {
  unknown: "Code d'organisme inconnu",
  inactive: "Organisme inactif",
  full: "Plus de place disponible dans cet organisme",
} as const;

export const POST = handle(async (req) => {
  assertSameOrigin(req);

  const ip = getClientIp(req);
  await checkIpAttempts(ip);
  await recordIpAttempt(ip);

  const b = await readJson(req, Body);
  try {
    const user = await registerTraineeWithCode({
      email: b.email.toLowerCase(),
      passwordHash: await hashPassword(b.password),
      code: b.orgCode,
    });
    const res = json({ id: user.id, email: user.email, role: user.role }, { status: 201 });
    setSessionCookie(res, await signSession({ userId: user.id, role: user.role }));
    return res;
  } catch (e) {
    if (e instanceof OrgCodeError) throw new HttpError(400, MESSAGES[e.reason]);
    const code = (e as { code?: string }).code ?? (e as { cause?: { code?: string } }).cause?.code;
    if (code === "23505") throw new HttpError(409, "Un compte existe déjà avec cet e-mail");
    throw e;
  }
});
