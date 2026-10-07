import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";

// Le partage d'avancement appartient à l'étudiant : lui seul le règle. Le retirer prend effet à la
// lecture suivante côté organisme, puisque rien n'est recopié chez lui — tout se calcule à la lecture
// (voir `listMembers`).
export async function setShareProgress(userId: string, share: boolean) {
  await db.update(users).set({ shareProgress: share, shareProgressAt: new Date() }).where(eq(users.id, userId));
}

// « J'ai trouvé mon entreprise » : une date, jamais un nom. Le redéclarer ne déplace pas la date.
export async function setFoundCompany(userId: string, found: boolean) {
  if (!found) {
    await db.update(users).set({ foundCompanyAt: null }).where(eq(users.id, userId));
    return;
  }
  const current = await getProgressSettings(userId);
  if (current.foundCompanyAt) return;
  await db.update(users).set({ foundCompanyAt: new Date() }).where(eq(users.id, userId));
}

export async function getProgressSettings(userId: string) {
  const rows = await db
    .select({ organisationId: users.organisationId, shareProgress: users.shareProgress, foundCompanyAt: users.foundCompanyAt })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return rows[0] ?? { organisationId: null, shareProgress: null, foundCompanyAt: null };
}
