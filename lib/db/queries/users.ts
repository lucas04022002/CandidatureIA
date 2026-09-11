import { and, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import type { Role } from "@/lib/auth/jwt";

export async function findUserByEmail(email: string) {
  const rows = await db
    .select()
    .from(users)
    .where(and(sql`lower(${users.email}) = lower(${email})`, isNull(users.deletedAt)))
    .limit(1);
  return rows[0] ?? null;
}

export async function findUserById(id: string) {
  const rows = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function createUser(p: { email: string; passwordHash: string; role: Role; organisationId: string | null }) {
  const [user] = await db
    .insert(users)
    .values({ email: p.email, passwordHash: p.passwordHash, role: p.role, organisationId: p.organisationId })
    .returning();
  return user;
}

export async function touchLogin(userId: string) {
  await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, userId));
}

export async function softDeleteUser(userId: string) {
  await db.update(users).set({ deletedAt: new Date() }).where(eq(users.id, userId));
}
