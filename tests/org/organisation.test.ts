import { beforeAll, describe, expect, it, vi } from "vitest";
import { resetDatabase } from "../setup-db";
import { hashPassword } from "@/lib/auth/password";
import { signSession, type Role } from "@/lib/auth/jwt";
import {
  countActiveTrainees,
  createOrganisation,
  findOrganisationByCode,
  OrgCodeError,
  registerTraineeWithCode,
  setOrganisationStatus,
} from "@/lib/db/queries/organisations";
import { createUser, findUserById } from "@/lib/db/queries/users";

const mockCookies = new Map<string, string>();

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => (mockCookies.has(name) ? { name, value: mockCookies.get(name)! } : undefined),
  }),
}));

const { POST: regenerateCode } = await import("@/app/api/organisation/regenerate-code/route");
const { POST: removeMember } = await import("@/app/api/organisation/remove-member/route");
const { SESSION_COOKIE } = await import("@/lib/auth/session");

async function asUser(user: { id: string; role: Role }) {
  mockCookies.set(SESSION_COOKIE, await signSession({ userId: user.id, role: user.role }));
}

const post = (
  route: (req: Request, ctx: unknown) => Promise<Response>,
  path: string,
  body: unknown = {},
) =>
  route(
    new Request(`http://localhost${path}`, {
      method: "POST",
      headers: { "content-type": "application/json", host: "localhost", "sec-fetch-site": "same-origin" },
      body: JSON.stringify(body),
    }),
    {},
  );

async function seedOrganisation(name: string, email: string) {
  const org = await setOrganisationStatus((await createOrganisation({ name })).id, { active: true, seats: 5 });
  if (!org) throw new Error("organisme introuvable");
  const responsable = await createUser({
    email,
    passwordHash: await hashPassword("motdepasse-correct"),
    role: "responsable",
    organisationId: org.id,
  });
  return { org, responsable };
}

describe("espace organisme", () => {
  beforeAll(resetDatabase);

  it("régénération du code : l'ancien code ne vaut plus rien, le nouveau inscrit", async () => {
    const { org, responsable } = await seedOrganisation("AFPA Régen", "resp-regen@ex.fr");
    const ancienCode = org.code;

    await asUser(responsable);
    const res = await post(regenerateCode, "/api/organisation/regenerate-code");
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.code).toHaveLength(8);
    expect(body.code).not.toBe(ancienCode);

    await expect(
      registerTraineeWithCode({
        email: "ancien-code@ex.fr",
        passwordHash: await hashPassword("motdepasse-correct"),
        code: ancienCode,
      }),
    ).rejects.toMatchObject({ reason: "unknown" });

    const nouveau = await registerTraineeWithCode({
      email: "nouveau-code@ex.fr",
      passwordHash: await hashPassword("motdepasse-correct"),
      code: body.code,
    });
    expect(nouveau.organisationId).toBe(org.id);

    const relu = await findOrganisationByCode(body.code);
    expect(relu?.id).toBe(org.id);
  });

  it("retirer un étudiant d'un AUTRE organisme → 404", async () => {
    const a = await seedOrganisation("AFPA A", "resp-a@ex.fr");
    const b = await seedOrganisation("AFPA B", "resp-b@ex.fr");

    const étudiantB = await registerTraineeWithCode({
      email: "étudiant-b@ex.fr",
      passwordHash: await hashPassword("motdepasse-correct"),
      code: b.org.code,
    });

    await asUser(a.responsable);
    const res = await post(removeMember, "/api/organisation/remove-member", { userId: étudiantB.id });
    expect(res.status).toBe(404);
    expect((await res.json()).ok).toBe(false);

    // L'étudiant de l'organisme B est intact.
    expect((await findUserById(étudiantB.id))?.deletedAt).toBeNull();
    expect(await countActiveTrainees(b.org.id)).toBe(1);
  });

  it("retirer un étudiant du sien → supprimé et place libérée", async () => {
    const { org, responsable } = await seedOrganisation("AFPA Places", "resp-places@ex.fr");
    const etudiant = await registerTraineeWithCode({
      email: "étudiant-places@ex.fr",
      passwordHash: await hashPassword("motdepasse-correct"),
      code: org.code,
    });
    expect(await countActiveTrainees(org.id)).toBe(1);

    await asUser(responsable);
    const res = await post(removeMember, "/api/organisation/remove-member", { userId: etudiant.id });
    expect(res.status).toBe(200);
    expect((await res.json()).ok).toBe(true);

    expect(await countActiveTrainees(org.id)).toBe(0);
    const relu = await findUserById(etudiant.id);
    expect(relu?.deletedAt).not.toBeNull();
    expect(relu?.email).toMatch(/^deleted-[0-9a-f-]{36}@invalid$/);
  });

  it("un étudiant appelant la régénération du code → 403", async () => {
    const { org } = await seedOrganisation("AFPA Rôles", "resp-roles@ex.fr");
    const etudiant = await registerTraineeWithCode({
      email: "étudiant-roles@ex.fr",
      passwordHash: await hashPassword("motdepasse-correct"),
      code: org.code,
    });

    await asUser(etudiant);
    expect((await post(regenerateCode, "/api/organisation/regenerate-code")).status).toBe(403);
    expect((await post(removeMember, "/api/organisation/remove-member", { userId: etudiant.id })).status).toBe(403);

    const inchange = await findOrganisationByCode(org.code);
    expect(inchange?.id).toBe(org.id);
  });

  it("sans session → 401", async () => {
    mockCookies.delete(SESSION_COOKIE);
    expect((await post(regenerateCode, "/api/organisation/regenerate-code")).status).toBe(401);
  });

  it("OrgCodeError garde sa raison", () => {
    expect(new OrgCodeError("full").reason).toBe("full");
  });
});
