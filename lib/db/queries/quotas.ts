import { and, eq, gte, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { cvImports, loginAttempts, searchRuns } from "@/lib/db/schema";

export async function countSearchRunsSince(userId: string, since: Date) {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(searchRuns)
    .where(and(eq(searchRuns.userId, userId), gte(searchRuns.startedAt, since)));
  return (row?.count as number | undefined) ?? 0;
}

export async function recordSearchRun(userId: string) {
  await db.insert(searchRuns).values({ userId });
}

export async function countCvImportsSince(userId: string, since: Date) {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(cvImports)
    .where(and(eq(cvImports.userId, userId), gte(cvImports.importedAt, since)));
  return (row?.count as number | undefined) ?? 0;
}

export async function recordCvImport(userId: string) {
  await db.insert(cvImports).values({ userId });
}

export async function countLoginAttemptsSince(email: string, since: Date) {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(loginAttempts)
    .where(and(sql`lower(${loginAttempts.email}) = lower(${email})`, gte(loginAttempts.attemptedAt, since)));
  return (row?.count as number | undefined) ?? 0;
}

export async function recordLoginAttempt(email: string) {
  await db.insert(loginAttempts).values({ email });
}
