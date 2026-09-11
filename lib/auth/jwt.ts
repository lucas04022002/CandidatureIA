import { SignJWT, jwtVerify } from "jose";

export type Role = "stagiaire" | "responsable" | "admin";

const ROLES: readonly Role[] = ["stagiaire", "responsable", "admin"];

function loadSecret(): Uint8Array {
  const s = process.env.JWT_SECRET;
  if (!s || s.length < 32) throw new Error("JWT_SECRET absent ou trop court (32 caractères minimum)");
  return new TextEncoder().encode(s);
}

// Validé une seule fois au chargement du module (comme `lib/db/client.ts` pour `DATABASE_URL`) :
// un secret absent ou trop court fait échouer le démarrage plutôt qu'un appel arbitraire plus tard.
const secretKey = loadSecret();

export async function signSession(p: { userId: string; role: Role }) {
  return new SignJWT({ role: p.role }).setProtectedHeader({ alg: "HS256" }).setSubject(p.userId).setIssuedAt().setExpirationTime("7d").sign(secretKey);
}

export async function verifySession(token: string): Promise<{ userId: string; role: Role } | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey, { algorithms: ["HS256"] });
    if (typeof payload.sub !== "string") return null;
    if (typeof payload.role !== "string" || !ROLES.includes(payload.role as Role)) return null;
    return { userId: payload.sub, role: payload.role as Role };
  } catch {
    return null;
  }
}
