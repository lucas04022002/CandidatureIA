import { cookies } from "next/headers";
import type { NextResponse } from "next/server";
import { verifySession, type Role } from "./jwt";
import { HttpError } from "@/lib/http";
import { findUserById } from "@/lib/db/queries/users";

export const SESSION_COOKIE = "ab_session";

export interface SessionUser {
  id: string;
  email: string;
  role: Role;
  organisationId: string | null;
}

export async function getSession(): Promise<SessionUser | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const s = await verifySession(token);
  if (!s) return null;
  const u = await findUserById(s.userId);
  if (!u || u.deletedAt) return null;
  return { id: u.id, email: u.email, role: u.role, organisationId: u.organisationId };
}

export async function requireUser() {
  const s = await getSession();
  if (!s) throw new HttpError(401, "Connexion requise");
  return s;
}

export async function requireRole(...roles: Role[]) {
  const s = await requireUser();
  if (!roles.includes(s.role)) throw new HttpError(403, "Accès refusé");
  return s;
}

export function setSessionCookie(res: NextResponse, token: string) {
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 7 * 24 * 3600,
  });
}

export function clearSessionCookie(res: NextResponse) {
  res.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}
