import { beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { resetDatabase } from "../setup-db";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { hashPassword } from "@/lib/auth/password";
import type { Role } from "@/lib/auth/jwt";
import { createUser, findUserById, purgeInactiveUsers } from "@/lib/db/queries/users";
import { createOrganisation, listOrganisationsWithoutResponsable } from "@/lib/db/queries/organisations";
import { getJobs, insertJobs } from "@/lib/db/queries/jobs";

function moisAvant(mois: number) {
  const d = new Date();
  d.setMonth(d.getMonth() - mois);
  return d;
}

async function seedUser(
  email: string,
  role: Role,
  dates: { lastLoginAt: Date | null; createdAt: Date },
  organisationId: string | null = null,
) {
  const user = await createUser({
    email,
    passwordHash: await hashPassword("motdepasse-correct"),
    role,
    organisationId,
  });
  await db
    .update(users)
    .set({ lastLoginAt: dates.lastLoginAt, createdAt: dates.createdAt })
    .where(eq(users.id, user.id));
  return user;
}

const ids: Record<string, string> = {};
const orgs: Record<string, { id: string; name: string }> = {};

describe("purge des comptes inactifs", () => {
  beforeAll(async () => {
    await resetDatabase();
    ids.vieux = (await seedUser("vieux@ex.fr", "stagiaire", { lastLoginAt: moisAvant(13), createdAt: moisAvant(20) })).id;
    ids.recent = (await seedUser("recent@ex.fr", "stagiaire", { lastLoginAt: moisAvant(11), createdAt: moisAvant(20) })).id;
    ids.jamais = (await seedUser("jamais@ex.fr", "stagiaire", { lastLoginAt: null, createdAt: moisAvant(13) })).id;
    ids.jamaisRecent = (await seedUser("jamais-recent@ex.fr", "stagiaire", { lastLoginAt: null, createdAt: moisAvant(2) })).id;
    ids.admin = (await seedUser("admin-purge@ex.fr", "admin", { lastLoginAt: moisAvant(20), createdAt: moisAvant(30) })).id;

    // Trois organismes : l'un perd son responsable à la purge, l'autre le garde, le dernier n'en a
    // jamais eu (espace créé puis abandonné).
    orgs.orphelin = await createOrganisation({ name: "AFPA Orpheline" });
    orgs.suivi = await createOrganisation({ name: "AFPA Suivie" });
    orgs.sansResponsable = await createOrganisation({ name: "AFPA Sans Responsable" });
    await seedUser("resp-dormant@ex.fr", "responsable", { lastLoginAt: moisAvant(14), createdAt: moisAvant(20) }, orgs.orphelin.id);
    await seedUser("resp-actif@ex.fr", "responsable", { lastLoginAt: moisAvant(1), createdAt: moisAvant(20) }, orgs.suivi.id);

    await insertJobs(ids.vieux, [
      {
        title: "Offre du compte dormant",
        company: "Alpha",
        location: "Paris",
        contract: "CDI",
        source: "Test",
        jobUrl: null,
        jobDescription: null,
        score: 50,
      },
    ]);
  });

  it("purge les comptes sans connexion depuis 12 mois, jamais l'admin", async () => {
    const purges = await purgeInactiveUsers(moisAvant(12));
    expect(purges).toBe(3);

    // −13 mois de dernière connexion : purgé, e-mail libéré, données effacées.
    const vieux = await findUserById(ids.vieux);
    expect(vieux?.deletedAt).not.toBeNull();
    expect(vieux?.email).toMatch(/^deleted-[0-9a-f-]{36}@invalid$/);
    expect(await getJobs(ids.vieux)).toEqual([]);

    // Jamais connecté, créé il y a 13 mois : purgé (created_at fait foi).
    expect((await findUserById(ids.jamais))?.deletedAt).not.toBeNull();

    // −11 mois : conservé.
    const recent = await findUserById(ids.recent);
    expect(recent?.deletedAt).toBeNull();
    expect(recent?.email).toBe("recent@ex.fr");

    // Jamais connecté mais créé il y a 2 mois : conservé.
    expect((await findUserById(ids.jamaisRecent))?.deletedAt).toBeNull();

    // L'admin n'est jamais purgé, même après 20 mois sans connexion.
    const admin = await findUserById(ids.admin);
    expect(admin?.deletedAt).toBeNull();
    expect(admin?.email).toBe("admin-purge@ex.fr");
  });

  it("une seconde purge ne touche plus rien", async () => {
    expect(await purgeInactiveUsers(moisAvant(12))).toBe(0);
  });

  it("signale les organismes restés sans responsable, sans les désactiver", async () => {
    const orphelins = await listOrganisationsWithoutResponsable();
    const noms = orphelins.map((o) => o.name).sort();
    expect(noms).toEqual(["AFPA Orpheline", "AFPA Sans Responsable"]);
    expect(noms).not.toContain("AFPA Suivie");

    // Aucune désactivation automatique : l'organisme signalé reste dans l'état où il était.
    const orphelin = orphelins.find((o) => o.id === orgs.orphelin.id);
    expect(orphelin?.active).toBe(false);
    expect(orphelin?.code).toHaveLength(8);
  });
});
