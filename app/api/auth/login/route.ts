import { z } from "zod";
import { handle, json, assertSameOrigin, readJson, HttpError } from "@/lib/http";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { signSession } from "@/lib/auth/jwt";
import { setSessionCookie } from "@/lib/auth/session";
import { findUserByEmail, touchLogin } from "@/lib/db/queries/users";
import { deleteLoginAttempts, recordLoginAttempt } from "@/lib/db/queries/quotas";
import { checkIpAttempts, checkLoginAttempts, getClientIp, recordIpAttempt } from "@/lib/rate-limit";

const Body = z.object({ email: z.string().email().max(200), password: z.string().min(1).max(200) });

// Hash factice constant, calculé une seule fois (paresseusement) : verifyPassword s'exécute
// toujours avec un travail équivalent, même si l'e-mail est inconnu, pour qu'un attaquant ne
// puisse pas distinguer "e-mail inconnu" de "mauvais mot de passe" par le temps de réponse.
let dummyHashPromise: Promise<string> | null = null;
function dummyHash() {
  dummyHashPromise ??= hashPassword("mot-de-passe-factice-a-temps-constant");
  return dummyHashPromise;
}

export const POST = handle(async (req) => {
  assertSameOrigin(req);

  const ip = getClientIp(req);
  await checkIpAttempts(ip);
  await recordIpAttempt(ip);

  const b = await readJson(req, Body);
  const email = b.email.toLowerCase();

  await checkLoginAttempts(email);
  await recordLoginAttempt(email);

  const user = await findUserByEmail(email);
  const ok = await verifyPassword(user?.passwordHash ?? (await dummyHash()), b.password);
  if (!user || !ok) throw new HttpError(401, "E-mail ou mot de passe incorrect");

  await touchLogin(user.id);
  // Une connexion réussie efface les essais précédents : un utilisateur légitime qui s'est trompé
  // quelques fois ne doit jamais finir bloqué par ses propres erreurs passées.
  await deleteLoginAttempts(email);

  const res = json({ id: user.id, email: user.email, role: user.role, organisationId: user.organisationId });
  setSessionCookie(res, await signSession({ userId: user.id, role: user.role }));
  return res;
});
