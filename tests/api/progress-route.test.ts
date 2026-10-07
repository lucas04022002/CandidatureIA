import { beforeAll, describe, expect, it, vi } from "vitest";
import { resetDatabase } from "../setup-db";
import { signSession, type Role } from "@/lib/auth/jwt";
import {
  createOrganisation,
  registerResponsableWithNewOrganisation,
  registerTraineeWithCode,
} from "@/lib/db/queries/organisations";
import { getProgressSettings } from "@/lib/db/queries/progress";

const mockCookies = new Map<string, string>();

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => (mockCookies.has(name) ? { name, value: mockCookies.get(name)! } : undefined),
  }),
}));

const { POST } = await import("@/app/api/account/progress/route");
const { SESSION_COOKIE } = await import("@/lib/auth/session");

async function asUser(userId: string, role: Role) {
  mockCookies.set(SESSION_COOKIE, await signSession({ userId, role }));
}

const call = (body: unknown, headers: Record<string, string> = {}) =>
  POST(
    new Request("http://localhost/api/account/progress", {
      method: "POST",
      headers: { host: "localhost", "sec-fetch-site": "same-origin", "content-type": "application/json", ...headers },
      body: JSON.stringify(body),
    }),
    {},
  );

describe("POST /api/account/progress", () => {
  let etudiant = "";
  let responsable = "";

  beforeAll(async () => {
    await resetDatabase();
    const org = await createOrganisation({ name: "Promo" });
    etudiant = (await registerTraineeWithCode({ email: "e@ex.fr", passwordHash: "x", code: org.code })).id;
    responsable = (
      await registerResponsableWithNewOrganisation({ organisationName: "Autre", email: "r@ex.fr", passwordHash: "x" })
    ).user.id;
  });

  it("sans session → 401", async () => {
    mockCookies.clear();
    expect((await call({ shareProgress: true })).status).toBe(401);
  });

  it("l'étudiant accepte puis retire le partage", async () => {
    await asUser(etudiant, "etudiant");
    expect((await call({ shareProgress: true })).status).toBe(200);
    expect((await getProgressSettings(etudiant)).shareProgress).toBe(true);
    expect((await call({ shareProgress: false })).status).toBe(200);
    expect((await getProgressSettings(etudiant)).shareProgress).toBe(false);
  });

  it("l'étudiant déclare puis annule « entreprise trouvée »", async () => {
    await asUser(etudiant, "etudiant");
    expect((await call({ foundCompany: true })).status).toBe(200);
    expect((await getProgressSettings(etudiant)).foundCompanyAt).toBeInstanceOf(Date);
    expect((await call({ foundCompany: false })).status).toBe(200);
    expect((await getProgressSettings(etudiant)).foundCompanyAt).toBeNull();
  });

  it("corps invalide → 400", async () => {
    await asUser(etudiant, "etudiant");
    expect((await call({ shareProgress: "oui" })).status).toBe(400);
  });

  it("un responsable → 403 : c'est la donnée de l'étudiant", async () => {
    await asUser(responsable, "responsable");
    expect((await call({ shareProgress: true })).status).toBe(403);
  });

  it("origine cross-site → 403", async () => {
    await asUser(etudiant, "etudiant");
    expect((await call({ shareProgress: true }, { "sec-fetch-site": "cross-site" })).status).toBe(403);
  });
});
