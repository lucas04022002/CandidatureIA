import { beforeAll, describe, expect, it } from "vitest";
import { resetDatabase } from "../setup-db";
import { createUser } from "@/lib/db/queries/users";
import { hashPassword } from "@/lib/auth/password";
import { recordSearchRun, recordCvImport, recordLoginAttempt } from "@/lib/db/queries/quotas";
import {
  checkSearchQuota,
  checkImportQuota,
  checkLoginAttempts,
  SEARCH_QUOTA_PER_DAY,
  IMPORT_QUOTA_PER_DAY,
  LOGIN_ATTEMPTS_LIMIT,
} from "@/lib/rate-limit";
import { HttpError } from "@/lib/http";

// resetDatabase() drop/recrée le schéma public : on ne l'appelle qu'une fois (beforeAll), sinon
// la table de suivi des migrations de drizzle (hors schéma public) fausse les résets suivants.
// Chaque test crée son propre utilisateur/e-mail pour ne pas partager de compteur de quota.
describe("quotas et limite d'essais", () => {
  beforeAll(resetDatabase);

  async function makeUser(email: string) {
    const user = await createUser({
      email,
      passwordHash: await hashPassword("motdepasse-correct"),
      role: "stagiaire",
      organisationId: null,
    });
    return user.id;
  }

  it("recherche : passe sous le quota, refuse au quota atteint", async () => {
    const userId = await makeUser("quota-recherche@ex.fr");
    for (let i = 0; i < SEARCH_QUOTA_PER_DAY; i++) {
      await expect(checkSearchQuota(userId)).resolves.toBeUndefined();
      await recordSearchRun(userId);
    }
    await expect(checkSearchQuota(userId)).rejects.toThrow(HttpError);
    await expect(checkSearchQuota(userId)).rejects.toMatchObject({
      status: 429,
      message: expect.stringMatching(/^Prochaine recherche possible à \d{2}:\d{2}$/),
    });
  });

  it("import CV : passe sous le quota, refuse au quota atteint", async () => {
    const userId = await makeUser("quota-import@ex.fr");
    for (let i = 0; i < IMPORT_QUOTA_PER_DAY; i++) {
      await expect(checkImportQuota(userId)).resolves.toBeUndefined();
      await recordCvImport(userId);
    }
    await expect(checkImportQuota(userId)).rejects.toMatchObject({
      status: 429,
      message: expect.stringMatching(/^Prochain import possible à \d{2}:\d{2}$/),
    });
  });

  it("connexion : refuse au-delà de la limite d'essais sur la fenêtre", async () => {
    const email = "brute@ex.fr";
    for (let i = 0; i < LOGIN_ATTEMPTS_LIMIT; i++) {
      await expect(checkLoginAttempts(email)).resolves.toBeUndefined();
      await recordLoginAttempt(email);
    }
    await expect(checkLoginAttempts(email)).rejects.toMatchObject({ status: 429 });
  });
});
