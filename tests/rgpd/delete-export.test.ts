import { beforeAll, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { resetDatabase } from "../setup-db";
import { db } from "@/lib/db/client";
import { cvImports, searchRuns } from "@/lib/db/schema";
import { hashPassword } from "@/lib/auth/password";
import { signSession, type Role } from "@/lib/auth/jwt";
import { createOrganisation, registerTraineeWithCode, setOrganisationStatus } from "@/lib/db/queries/organisations";
import { createUser, findUserByEmail, findUserById } from "@/lib/db/queries/users";
import { getProfile, upsertProfile } from "@/lib/db/queries/profiles";
import { getJobs, insertJobs } from "@/lib/db/queries/jobs";
import { createApplication, getApplications } from "@/lib/db/queries/applications";
import { recordCvImport, recordSearchRun } from "@/lib/db/queries/quotas";

const mockCookies = new Map<string, string>();

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => (mockCookies.has(name) ? { name, value: mockCookies.get(name)! } : undefined),
  }),
}));

const { DELETE: deleteAccount } = await import("@/app/api/account/route");
const { GET: exportAccount } = await import("@/app/api/account/export/route");
const { SESSION_COOKIE } = await import("@/lib/auth/session");

async function asUser(user: { id: string; role: Role }) {
  mockCookies.set(SESSION_COOKIE, await signSession({ userId: user.id, role: user.role }));
}

const EMAIL = "stagiaire-rgpd@ex.fr";
const AUTRE = "autre-rgpd@ex.fr";

let orgCode = "";
let userId = "";
let autreId = "";

async function seedUserData(id: string, entreprise: string) {
  await upsertProfile(id, { fileName: "cv.pdf", rawText: `CV de ${entreprise}`, fullName: `Profil ${entreprise}` });
  const [job] = await insertJobs(id, [
    {
      title: `Développeur ${entreprise}`,
      company: entreprise,
      location: "Paris",
      contract: "Alternance",
      source: "Test",
      jobUrl: null,
      jobDescription: null,
      score: 70,
    },
  ]);
  await createApplication(id, job.id, {
    letterText: `Lettre ${entreprise}`,
    emailText: `Email ${entreprise}`,
    linkedInText: `LinkedIn ${entreprise}`,
  });
  await recordSearchRun(id);
  await recordCvImport(id);
}

describe("RGPD : export et suppression de compte", () => {
  beforeAll(async () => {
    await resetDatabase();
    const org = await setOrganisationStatus((await createOrganisation({ name: "AFPA RGPD" })).id, {
      active: true,
      seats: 10,
    });
    orgCode = org!.code;
    const passwordHash = await hashPassword("motdepasse-correct");
    userId = (await registerTraineeWithCode({ email: EMAIL, passwordHash, code: orgCode })).id;
    autreId = (await registerTraineeWithCode({ email: AUTRE, passwordHash, code: orgCode })).id;
    await seedUserData(userId, "Alpha");
    await seedUserData(autreId, "Beta");
  });

  it("l'export ne contient que les données de l'appelant", async () => {
    await asUser({ id: userId, role: "stagiaire" });
    const res = await exportAccount(
      new Request("http://localhost/api/account/export", { headers: { host: "localhost" } }),
      {},
    );
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(Object.keys(body).sort()).toEqual(["applications", "exportedAt", "jobs", "profile"]);
    expect(body.profile.fullName).toBe("Profil Alpha");
    expect(body.jobs).toHaveLength(1);
    expect(body.jobs[0].company).toBe("Alpha");
    expect(body.applications).toHaveLength(1);
    expect(body.applications[0].letterText).toBe("Lettre Alpha");
    expect(Number.isNaN(Date.parse(body.exportedAt))).toBe(false);
    expect(JSON.stringify(body)).not.toContain("Beta");
  });

  it("l'export sans session → 401", async () => {
    mockCookies.delete(SESSION_COOKIE);
    const res = await exportAccount(
      new Request("http://localhost/api/account/export", { headers: { host: "localhost" } }),
      {},
    );
    expect(res.status).toBe(401);
  });

  it("la suppression efface les 5 tables, libère l'e-mail et laisse une nouvelle inscription passer", async () => {
    await asUser({ id: userId, role: "stagiaire" });
    const res = await deleteAccount(
      new Request("http://localhost/api/account", {
        method: "DELETE",
        headers: { host: "localhost", "sec-fetch-site": "same-origin" },
      }),
      {},
    );
    expect(res.status).toBe(200);
    expect((await res.json()).ok).toBe(true);
    expect(res.headers.get("set-cookie")).toMatch(/ab_session=/);

    expect(await getProfile(userId)).toBeNull();
    expect(await getJobs(userId)).toEqual([]);
    expect(await getApplications(userId)).toEqual([]);
    expect(await db.select().from(searchRuns).where(eq(searchRuns.userId, userId))).toEqual([]);
    expect(await db.select().from(cvImports).where(eq(cvImports.userId, userId))).toEqual([]);

    expect(await findUserByEmail(EMAIL)).toBeNull();

    // La ligne anonymisée ne garde ni secret ni rattachement : le hash de mot de passe est vidé et
    // le lien vers l'organisme coupé.
    const anonyme = await findUserById(userId);
    expect(anonyme?.passwordHash).toBe("");
    expect(anonyme?.organisationId).toBeNull();

    const reinscrit = await registerTraineeWithCode({
      email: EMAIL,
      passwordHash: await hashPassword("motdepasse-correct"),
      code: orgCode,
    });
    expect(reinscrit.id).not.toBe(userId);
    expect((await findUserByEmail(EMAIL))?.id).toBe(reinscrit.id);
  });

  it("les données de l'autre utilisateur sont intactes", async () => {
    expect((await getProfile(autreId))?.fullName).toBe("Profil Beta");
    expect(await getJobs(autreId)).toHaveLength(1);
    expect(await getApplications(autreId)).toHaveLength(1);
    expect((await findUserByEmail(AUTRE))?.id).toBe(autreId);
  });

  it("le dernier administrateur ne peut pas supprimer son compte → 409", async () => {
    const admin = await createUser({
      email: "admin-seul@ex.fr",
      passwordHash: await hashPassword("motdepasse-correct"),
      role: "admin",
      organisationId: null,
    });

    await asUser({ id: admin.id, role: "admin" });
    const res = await deleteAccount(
      new Request("http://localhost/api/account", {
        method: "DELETE",
        headers: { host: "localhost", "sec-fetch-site": "same-origin" },
      }),
      {},
    );
    expect(res.status).toBe(409);
    expect((await res.json()).error).toBe("Le dernier compte administrateur ne peut pas être supprimé");

    const relu = await findUserById(admin.id);
    expect(relu?.deletedAt).toBeNull();
    expect(relu?.email).toBe("admin-seul@ex.fr");

    // Dès qu'un second administrateur existe, le premier redevient supprimable.
    await createUser({
      email: "admin-second@ex.fr",
      passwordHash: await hashPassword("motdepasse-correct"),
      role: "admin",
      organisationId: null,
    });
    const res2 = await deleteAccount(
      new Request("http://localhost/api/account", {
        method: "DELETE",
        headers: { host: "localhost", "sec-fetch-site": "same-origin" },
      }),
      {},
    );
    expect(res2.status).toBe(200);
    expect((await findUserById(admin.id))?.deletedAt).not.toBeNull();
  });

  it("la session d'un compte supprimé ne donne plus accès à l'export", async () => {
    await asUser({ id: userId, role: "stagiaire" });
    const res = await exportAccount(
      new Request("http://localhost/api/account/export", { headers: { host: "localhost" } }),
      {},
    );
    expect(res.status).toBe(401);
  });
});
