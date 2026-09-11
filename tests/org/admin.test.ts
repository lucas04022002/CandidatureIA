import { beforeAll, describe, expect, it, vi } from "vitest";
import { resetDatabase } from "../setup-db";
import { hashPassword } from "@/lib/auth/password";
import { signSession, type Role } from "@/lib/auth/jwt";
import {
  createOrganisation,
  findOrganisationByCode,
  listOrganisations,
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

const { POST: adminOrganisation } = await import("@/app/api/admin/organisation/route");
const { SESSION_COOKIE } = await import("@/lib/auth/session");

async function asUser(user: { id: string; role: Role }) {
  mockCookies.set(SESSION_COOKIE, await signSession({ userId: user.id, role: user.role }));
}

const post = (body: unknown) =>
  adminOrganisation(
    new Request("http://localhost/api/admin/organisation", {
      method: "POST",
      headers: { "content-type": "application/json", host: "localhost", "sec-fetch-site": "same-origin" },
      body: JSON.stringify(body),
    }),
    {},
  );

describe("administration des organismes", () => {
  beforeAll(resetDatabase);

  it("l'admin active un organisme et fixe ses places → 200", async () => {
    const org = await createOrganisation({ name: "AFPA Admin" });
    const admin = await createUser({
      email: "admin@ex.fr",
      passwordHash: await hashPassword("motdepasse-correct"),
      role: "admin",
      organisationId: null,
    });
    const responsable = await createUser({
      email: "resp-admin@ex.fr",
      passwordHash: await hashPassword("motdepasse-correct"),
      role: "responsable",
      organisationId: org.id,
    });

    await asUser(admin);
    const res = await post({ id: org.id, active: true, seats: 20 });
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.organisation).toMatchObject({ id: org.id, active: true, seats: 20 });

    const relu = await findOrganisationByCode(org.code);
    expect(relu?.active).toBe(true);
    expect(relu?.seats).toBe(20);

    // L'organisme devient utilisable : un stagiaire peut s'inscrire avec son code.
    const stagiaire = await registerTraineeWithCode({
      email: "stagiaire-admin@ex.fr",
      passwordHash: await hashPassword("motdepasse-correct"),
      code: org.code,
    });
    expect(stagiaire.organisationId).toBe(org.id);

    const lignes = await listOrganisations();
    const ligne = lignes.find((o) => o.id === org.id);
    expect(ligne).toMatchObject({
      name: "AFPA Admin",
      active: true,
      seats: 20,
      responsableEmail: responsable.email,
      traineeCount: 1,
    });
    expect(ligne?.createdAt).toBeInstanceOf(Date);
  });

  it("un responsable appelant la route admin → 403", async () => {
    const org = await createOrganisation({ name: "AFPA Resp" });
    const responsable = await createUser({
      email: "resp-403@ex.fr",
      passwordHash: await hashPassword("motdepasse-correct"),
      role: "responsable",
      organisationId: org.id,
    });

    await asUser(responsable);
    const res = await post({ id: org.id, active: true, seats: 99 });
    expect(res.status).toBe(403);

    const relu = await findOrganisationByCode(org.code);
    expect(relu?.active).toBe(false);
    expect(relu?.seats).toBe(0);
  });

  it("un organisme inactif refuse l'inscription (inactive)", async () => {
    const org = await createOrganisation({ name: "AFPA Inactive" });
    await setOrganisationStatus(org.id, { active: false, seats: 10 });

    await expect(
      registerTraineeWithCode({
        email: "stagiaire-inactive@ex.fr",
        passwordHash: await hashPassword("motdepasse-correct"),
        code: org.code,
      }),
    ).rejects.toMatchObject({ reason: "inactive" });
  });

  it("un stagiaire appelant la route admin → 403", async () => {
    const org = await createOrganisation({ name: "AFPA Stagiaire" });
    await setOrganisationStatus(org.id, { active: true, seats: 3 });
    const stagiaire = await registerTraineeWithCode({
      email: "stagiaire-403@ex.fr",
      passwordHash: await hashPassword("motdepasse-correct"),
      code: org.code,
    });

    await asUser(stagiaire);
    expect((await post({ id: org.id, active: true, seats: 99 })).status).toBe(403);
    expect((await findOrganisationByCode(org.code))?.seats).toBe(3);
  });

  // Sortie de secours de l'organisme orphelin : la purge RGPD, une démission ou une suppression de
  // compte peut laisser un organisme sans responsable. Sans ce chemin, plus personne ne peut
  // régénérer son code ni gérer ses places, et il n'existe aucun moyen de réparer depuis l'appli.
  describe("rattachement d'un responsable (responsableEmail)", () => {
    it("rattache un responsable sans organisme → 200", async () => {
      const admin = await createUser({
        email: "admin-rattache@ex.fr",
        passwordHash: await hashPassword("motdepasse-correct"),
        role: "admin",
        organisationId: null,
      });
      const org = await createOrganisation({ name: "AFPA Orpheline Admin" });
      const orphelin = await createUser({
        email: "resp-sans-org@ex.fr",
        passwordHash: await hashPassword("motdepasse-correct"),
        role: "responsable",
        organisationId: null,
      });

      await asUser(admin);
      const res = await post({ id: org.id, active: true, seats: 12, responsableEmail: "resp-sans-org@ex.fr" });
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.ok).toBe(true);
      expect(body.organisation.responsableEmail).toBe("resp-sans-org@ex.fr");

      expect((await findUserById(orphelin.id))?.organisationId).toBe(org.id);

      const ligne = (await listOrganisations()).find((o) => o.id === org.id);
      expect(ligne?.responsableEmail).toBe("resp-sans-org@ex.fr");
    });

    it("déplace un responsable déjà rattaché à un autre organisme → 200", async () => {
      const admin = await createUser({
        email: "admin-deplace@ex.fr",
        passwordHash: await hashPassword("motdepasse-correct"),
        role: "admin",
        organisationId: null,
      });
      const ancienne = await createOrganisation({ name: "AFPA Ancienne" });
      const nouvelle = await createOrganisation({ name: "AFPA Nouvelle" });
      const responsable = await createUser({
        email: "resp-mobile@ex.fr",
        passwordHash: await hashPassword("motdepasse-correct"),
        role: "responsable",
        organisationId: ancienne.id,
      });

      await asUser(admin);
      const res = await post({ id: nouvelle.id, active: true, seats: 5, responsableEmail: "resp-mobile@ex.fr" });
      expect(res.status).toBe(200);
      expect((await findUserById(responsable.id))?.organisationId).toBe(nouvelle.id);
    });

    it("l'e-mail d'un compte qui n'est pas responsable → 400, et rien n'est modifié", async () => {
      const admin = await createUser({
        email: "admin-400@ex.fr",
        passwordHash: await hashPassword("motdepasse-correct"),
        role: "admin",
        organisationId: null,
      });
      const org = await createOrganisation({ name: "AFPA Refus" });
      const orgDuStagiaire = await createOrganisation({ name: "AFPA Du Stagiaire" });
      await setOrganisationStatus(orgDuStagiaire.id, { active: true, seats: 3 });
      const stagiaire = await registerTraineeWithCode({
        email: "stagiaire-pas-responsable@ex.fr",
        passwordHash: await hashPassword("motdepasse-correct"),
        code: orgDuStagiaire.code,
      });

      await asUser(admin);
      const res = await post({ id: org.id, active: true, seats: 7, responsableEmail: "stagiaire-pas-responsable@ex.fr" });
      expect(res.status).toBe(400);

      // Le rattachement est vérifié AVANT la mise à jour de l'organisme : un refus ne doit rien
      // laisser à moitié appliqué.
      const relu = await findOrganisationByCode(org.code);
      expect(relu?.active).toBe(false);
      expect(relu?.seats).toBe(0);
      expect((await findUserById(stagiaire.id))?.organisationId).toBe(orgDuStagiaire.id);
    });

    it("un e-mail inconnu → 404", async () => {
      const admin = await createUser({
        email: "admin-404-email@ex.fr",
        passwordHash: await hashPassword("motdepasse-correct"),
        role: "admin",
        organisationId: null,
      });
      const org = await createOrganisation({ name: "AFPA Inconnue" });

      await asUser(admin);
      const res = await post({ id: org.id, active: true, seats: 4, responsableEmail: "personne@ex.fr" });
      expect(res.status).toBe(404);
      expect((await findOrganisationByCode(org.code))?.seats).toBe(0);
    });

    it("un e-mail mal formé → 400 (zod)", async () => {
      const admin = await createUser({
        email: "admin-zod@ex.fr",
        passwordHash: await hashPassword("motdepasse-correct"),
        role: "admin",
        organisationId: null,
      });
      const org = await createOrganisation({ name: "AFPA Zod" });

      await asUser(admin);
      expect((await post({ id: org.id, active: true, seats: 2, responsableEmail: "pas-un-email" })).status).toBe(400);
    });

    it("un responsable ne peut pas s'auto-rattacher (route admin) → 403", async () => {
      const org = await createOrganisation({ name: "AFPA Auto" });
      const responsable = await createUser({
        email: "resp-auto@ex.fr",
        passwordHash: await hashPassword("motdepasse-correct"),
        role: "responsable",
        organisationId: null,
      });

      await asUser(responsable);
      const res = await post({ id: org.id, active: true, seats: 3, responsableEmail: "resp-auto@ex.fr" });
      expect(res.status).toBe(403);
      expect((await findUserById(responsable.id))?.organisationId).toBeNull();
    });
  });

  it("un organisme inconnu → 404", async () => {
    const admin = await createUser({
      email: "admin-404@ex.fr",
      passwordHash: await hashPassword("motdepasse-correct"),
      role: "admin",
      organisationId: null,
    });
    await asUser(admin);
    const res = await post({ id: "00000000-0000-4000-8000-000000000000", active: true, seats: 5 });
    expect(res.status).toBe(404);
  });
});
