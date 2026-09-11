import { z } from "zod";
import { handle, json, assertSameOrigin, readJson, HttpError } from "@/lib/http";
import { hashPassword } from "@/lib/auth/password";
import { signSession } from "@/lib/auth/jwt";
import { setSessionCookie } from "@/lib/auth/session";
import { registerResponsableWithNewOrganisation } from "@/lib/db/queries/organisations";
import { checkIpAttempts, getClientIp, recordIpAttempt } from "@/lib/rate-limit";

const Body = z.object({
  organisationName: z.string().min(2).max(120),
  email: z.string().email().max(200),
  password: z.string().min(10).max(200),
});

export const POST = handle(async (req) => {
  assertSameOrigin(req);

  const ip = getClientIp(req);
  await checkIpAttempts(ip);
  await recordIpAttempt(ip);

  const b = await readJson(req, Body);
  try {
    const { organisation, user } = await registerResponsableWithNewOrganisation({
      organisationName: b.organisationName,
      email: b.email.toLowerCase(),
      passwordHash: await hashPassword(b.password),
    });
    const res = json(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        organisation: { id: organisation.id, name: organisation.name, code: organisation.code, active: organisation.active },
        message: "Votre organisme sera activé après validation.",
      },
      { status: 201 },
    );
    setSessionCookie(res, await signSession({ userId: user.id, role: user.role }));
    return res;
  } catch (e) {
    const code = (e as { code?: string }).code ?? (e as { cause?: { code?: string } }).cause?.code;
    if (code === "23505") throw new HttpError(409, "Un compte existe déjà avec cet e-mail");
    throw e;
  }
});
