import { and, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { organisations, users } from "@/lib/db/schema";
import { generateOrgCode } from "@/lib/auth/org-code";

export type OrgCodeReason = "unknown" | "inactive" | "full";

export class OrgCodeError extends Error {
  constructor(public reason: OrgCodeReason) {
    super(`organisation code error: ${reason}`);
  }
}

// Exécuteur partagé entre `db` et une transaction (`tx`) : les deux exposent `.select`/`.insert`/…
type Executor = Parameters<Parameters<typeof db.transaction>[0]>[0] | typeof db;

async function countActiveTraineesWith(executor: Executor, organisationId: string) {
  const [row] = await executor
    .select({ count: sql<number>`count(*)::int` })
    .from(users)
    .where(and(eq(users.organisationId, organisationId), eq(users.role, "stagiaire"), isNull(users.deletedAt)));
  return (row?.count as number | undefined) ?? 0;
}

export async function findOrganisationByCode(code: string) {
  const rows = await db.select().from(organisations).where(eq(organisations.code, code)).limit(1);
  return rows[0] ?? null;
}

async function insertOrganisationWith(executor: Executor, name: string) {
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const [org] = await executor
        .insert(organisations)
        .values({ name, code: generateOrgCode(), active: false, seats: 0 })
        .returning();
      return org;
    } catch (e) {
      const code = (e as { code?: string }).code ?? (e as { cause?: { code?: string } }).cause?.code;
      if (code === "23505") continue;
      throw e;
    }
  }
  throw new Error("Impossible de générer un code d'organisme unique après plusieurs tentatives");
}

export async function createOrganisation(p: { name: string }) {
  return insertOrganisationWith(db, p.name);
}

export async function countActiveTrainees(organisationId: string) {
  return countActiveTraineesWith(db, organisationId);
}

export async function registerResponsableWithNewOrganisation(p: { organisationName: string; email: string; passwordHash: string }) {
  return db.transaction(async (tx) => {
    const org = await insertOrganisationWith(tx, p.organisationName);
    const [user] = await tx
      .insert(users)
      .values({ email: p.email, passwordHash: p.passwordHash, role: "responsable", organisationId: org.id })
      .returning();
    return { organisation: org, user };
  });
}

export async function registerTraineeWithCode(p: { email: string; passwordHash: string; code: string }) {
  return db.transaction(async (tx) => {
    const [org] = await tx.select().from(organisations).where(eq(organisations.code, p.code)).for("update");
    if (!org) throw new OrgCodeError("unknown");
    if (!org.active) throw new OrgCodeError("inactive");
    const count = await countActiveTraineesWith(tx, org.id);
    if (count >= org.seats) throw new OrgCodeError("full");
    const [user] = await tx
      .insert(users)
      .values({ email: p.email, passwordHash: p.passwordHash, role: "stagiaire", organisationId: org.id })
      .returning();
    return user;
  });
}
