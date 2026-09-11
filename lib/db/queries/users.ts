import { randomUUID } from "node:crypto";
import { and, desc, eq, isNull, ne, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { applications, candidateProfiles, cvImports, jobs, searchRuns, users } from "@/lib/db/schema";
import type { Role } from "@/lib/auth/jwt";
import { countActiveTrainees } from "@/lib/db/queries/organisations";

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

// Suppression RGPD : les données produites par l'utilisateur partent vraiment (DELETE), la ligne
// `users` reste mais anonymisée. Elle reste parce que d'autres lignes peuvent la référencer et
// parce que `deleted_at` sert de trace d'exécution du droit à l'effacement ; plus rien d'identifiant
// n'y subsiste : l'e-mail est remplacé par `deleted-<uuid>@invalid` (l'index unique portant sur
// `lower(email)`, l'adresse d'origine redevient disponible pour une nouvelle inscription), le hash
// du mot de passe est vidé — plus rien à casser, et aucune session ne peut renaître — et le
// rattachement à l'organisme est coupé.
export async function deleteUserAndData(userId: string) {
  await db.transaction(async (tx) => {
    await tx.delete(applications).where(eq(applications.userId, userId));
    await tx.delete(jobs).where(eq(jobs.userId, userId));
    await tx.delete(candidateProfiles).where(eq(candidateProfiles.userId, userId));
    await tx.delete(searchRuns).where(eq(searchRuns.userId, userId));
    await tx.delete(cvImports).where(eq(cvImports.userId, userId));
    await tx
      .update(users)
      .set({
        deletedAt: new Date(),
        email: `deleted-${randomUUID()}@invalid`,
        passwordHash: "",
        organisationId: null,
      })
      .where(and(eq(users.id, userId), isNull(users.deletedAt)));
  });
}

// Compte les administrateurs encore actifs : sert à refuser la suppression du dernier d'entre eux,
// qui fermerait l'administration du service à double tour.
export async function countActiveAdmins(): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(users)
    .where(and(eq(users.role, "admin"), isNull(users.deletedAt)));
  return (row?.count as number | undefined) ?? 0;
}

export interface UserDataExport {
  profile: typeof candidateProfiles.$inferSelect | null;
  jobs: (typeof jobs.$inferSelect)[];
  applications: (typeof applications.$inferSelect)[];
  exportedAt: string;
}

// Portabilité (RGPD art. 20) : uniquement les lignes de CET utilisateur, telles qu'elles sont
// stockées. Aucune donnée d'un autre compte ni de l'organisme n'entre ici.
export async function exportUserData(userId: string): Promise<UserDataExport> {
  const [profileRows, jobRows, applicationRows] = await Promise.all([
    db.select().from(candidateProfiles).where(eq(candidateProfiles.userId, userId)).limit(1),
    db.select().from(jobs).where(eq(jobs.userId, userId)).orderBy(desc(jobs.createdAt)),
    db.select().from(applications).where(eq(applications.userId, userId)).orderBy(desc(applications.updatedAt)),
  ]);
  return {
    profile: profileRows[0] ?? null,
    jobs: jobRows,
    applications: applicationRows,
    exportedAt: new Date().toISOString(),
  };
}

// Conservation : 12 mois après la dernière connexion (ou après la création pour un compte qui ne
// s'est jamais connecté). Appelée par `scripts/purge-inactive.ts`.
//
// Deux exceptions, toutes deux parce que la purge fermerait une porte que personne ne pourrait
// rouvrir :
//  - l'administrateur, compte d'exploitation du service ;
//  - un responsable dont l'organisme compte encore au moins un stagiaire non supprimé. Le
//    responsable est le seul à pouvoir régénérer le code d'inscription, gérer les places et retirer
//    un membre : le purger laisse un organisme vivant mais inadministrable, avec des utilisateurs
//    actifs dedans. Un responsable ne se connecte de toute façon que rarement — c'est la nature du
//    rôle, pas un signe d'abandon. Si l'organisme s'est réellement vidé (plus aucun stagiaire), la
//    purge s'applique normalement.
export async function purgeInactiveUsers(before: Date): Promise<number> {
  const dormants = await db
    .select({ id: users.id, role: users.role, organisationId: users.organisationId })
    .from(users)
    .where(
      and(
        isNull(users.deletedAt),
        ne(users.role, "admin"),
        sql`coalesce(${users.lastLoginAt}, ${users.createdAt}) < ${before.toISOString()}::timestamptz`,
      ),
    );

  let purges = 0;
  for (const dormant of dormants) {
    if (dormant.role === "responsable" && dormant.organisationId) {
      const stagiaires = await countActiveTrainees(dormant.organisationId);
      if (stagiaires > 0) continue;
    }
    await deleteUserAndData(dormant.id);
    purges += 1;
  }
  return purges;
}

// Rattachement d'un utilisateur à un organisme, réservé à l'administration (voir
// `app/api/admin/organisation/route.ts`). C'est la sortie de secours de l'organisme orphelin : sans
// elle, un organisme qui a perdu son responsable n'est réparable qu'en SQL.
export async function setUserOrganisation(userId: string, organisationId: string | null) {
  const [user] = await db
    .update(users)
    .set({ organisationId })
    .where(and(eq(users.id, userId), isNull(users.deletedAt)))
    .returning();
  return user ?? null;
}
