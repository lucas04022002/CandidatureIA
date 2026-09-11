import { SignJWT, jwtVerify } from "jose";

export type Role = "stagiaire" | "responsable" | "admin";

const secret = () => {
  const s = process.env.JWT_SECRET;
  if (!s || s.length < 32) throw new Error("JWT_SECRET absent ou trop court (32 caractères minimum)");
  return new TextEncoder().encode(s);
};

export async function signSession(p: { userId: string; role: Role }) {
  return new SignJWT({ role: p.role }).setProtectedHeader({ alg: "HS256" }).setSubject(p.userId).setIssuedAt().setExpirationTime("7d").sign(secret());
}

export async function verifySession(token: string): Promise<{ userId: string; role: Role } | null> {
  try {
    const { payload } = await jwtVerify(token, secret(), { algorithms: ["HS256"] });
    return { userId: payload.sub!, role: payload.role as Role };
  } catch {
    return null;
  }
}
