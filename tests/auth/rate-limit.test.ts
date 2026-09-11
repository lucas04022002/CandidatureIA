import { beforeAll, describe, expect, it } from "vitest";
import { resetDatabase } from "../setup-db";
import { createUser } from "@/lib/db/queries/users";
import { hashPassword } from "@/lib/auth/password";
import { recordSearchRun, recordCvImport, recordLoginAttempt } from "@/lib/db/queries/quotas";
import {
  checkSearchQuota,
  checkImportQuota,
  checkLoginAttempts,
  SEARCH_MAX,
  IMPORT_MAX,
  LOGIN_MAX,
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

  it("recherche : 1/heure — la 2e recherche dans l'heure → 429", async () => {
    expect(SEARCH_MAX).toBe(1);
    const userId = await makeUser("quota-recherche@ex.fr");
    for (let i = 0; i < SEARCH_MAX; i++) {
      await expect(checkSearchQuota(userId)).resolves.toBeUndefined();
      await recordSearchRun(userId);
    }
    await expect(checkSearchQuota(userId)).rejects.toThrow(HttpError);
    await expect(checkSearchQuota(userId)).rejects.toMatchObject({
      status: 429,
      message: expect.stringMatching(/^Prochaine recherche possible à \d{2}:\d{2}$/),
    });
  });

  it("import CV : 10/24h — le 11e import en 24h → 429", async () => {
    expect(IMPORT_MAX).toBe(10);
    const userId = await makeUser("quota-import@ex.fr");
    for (let i = 0; i < IMPORT_MAX; i++) {
      await expect(checkImportQuota(userId)).resolves.toBeUndefined();
      await recordCvImport(userId);
    }
    await expect(checkImportQuota(userId)).rejects.toMatchObject({
      status: 429,
      message: expect.stringMatching(/^Prochain import possible à \d{2}:\d{2}$/),
    });
  });

  it("connexion : 10 essais / e-mail / 15 min — le 11e → 429", async () => {
    expect(LOGIN_MAX).toBe(10);
    const email = "brute@ex.fr";
    for (let i = 0; i < LOGIN_MAX; i++) {
      await expect(checkLoginAttempts(email)).resolves.toBeUndefined();
      await recordLoginAttempt(email);
    }
    await expect(checkLoginAttempts(email)).rejects.toMatchObject({ status: 429 });
  });
});
