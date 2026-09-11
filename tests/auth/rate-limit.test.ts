import { beforeAll, describe, expect, it } from "vitest";
import { resetDatabase } from "../setup-db";
import { db } from "@/lib/db/client";
import { cvImports, searchRuns } from "@/lib/db/schema";
import { createUser } from "@/lib/db/queries/users";
import { hashPassword } from "@/lib/auth/password";
import { recordSearchRun, recordCvImport, recordLoginAttempt } from "@/lib/db/queries/quotas";
import {
  checkSearchQuota,
  checkImportQuota,
  checkLoginAttempts,
  checkIpAttempts,
  recordIpAttempt,
  SEARCH_MAX,
  SEARCH_WINDOW_MS,
  IMPORT_MAX,
  IMPORT_WINDOW_MS,
  LOGIN_MAX,
  IP_MAX,
} from "@/lib/rate-limit";
import { HttpError } from "@/lib/http";

function parisHHmm(d: Date) {
  return new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Europe/Paris",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
}

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
  });

  it("recherche : le message 429 indique l'heure de la PLUS ANCIENNE tentative + fenêtre (pas « maintenant »)", async () => {
    const userId = await makeUser("quota-heure-recherche@ex.fr");
    const oldest = new Date(Date.now() - 10 * 60 * 1000); // il y a 10 min, dans la fenêtre d'1h
    await db.insert(searchRuns).values({ userId, startedAt: oldest });

    const expected = parisHHmm(new Date(oldest.getTime() + SEARCH_WINDOW_MS));
    await expect(checkSearchQuota(userId)).rejects.toMatchObject({
      status: 429,
      message: `Prochaine recherche possible à ${expected}`,
    });
  });

  it("import CV : 10/24h — le 11e import en 24h → 429", async () => {
    expect(IMPORT_MAX).toBe(10);
    const userId = await makeUser("quota-import@ex.fr");
    for (let i = 0; i < IMPORT_MAX; i++) {
      await expect(checkImportQuota(userId)).resolves.toBeUndefined();
      await recordCvImport(userId);
    }
    await expect(checkImportQuota(userId)).rejects.toThrow(HttpError);
  });

  it("import CV : le message 429 indique l'heure de la PLUS ANCIENNE tentative + fenêtre (pas « maintenant »)", async () => {
    const userId = await makeUser("quota-heure-import@ex.fr");
    const oldest = new Date(Date.now() - 2 * 60 * 60 * 1000); // il y a 2h
    // 10 imports d'âges différents dans la fenêtre de 24h : le plus ancien doit être retenu, pas le
    // plus récent ni l'instant présent.
    for (let i = 0; i < IMPORT_MAX; i++) {
      await db.insert(cvImports).values({ userId, importedAt: new Date(oldest.getTime() + i * 60 * 1000) });
    }

    const expected = parisHHmm(new Date(oldest.getTime() + IMPORT_WINDOW_MS));
    await expect(checkImportQuota(userId)).rejects.toMatchObject({
      status: 429,
      message: `Prochain import possible à ${expected}`,
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

  it("IP : 30 requêtes / 15 min — la 31e depuis la même adresse → 429", async () => {
    expect(IP_MAX).toBe(30);
    const ip = "203.0.113.7";
    for (let i = 0; i < IP_MAX; i++) {
      await expect(checkIpAttempts(ip)).resolves.toBeUndefined();
      await recordIpAttempt(ip);
    }
    await expect(checkIpAttempts(ip)).rejects.toMatchObject({ status: 429 });
  });
});
