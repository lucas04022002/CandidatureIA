import { beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { resetDatabase } from "../setup-db";
import { db } from "@/lib/db/client";
import { applications, users } from "@/lib/db/schema";
import { createOrganisation, listMembers, registerTraineeWithCode } from "@/lib/db/queries/organisations";
import { insertJobs } from "@/lib/db/queries/jobs";
import { createApplication } from "@/lib/db/queries/applications";
import { getProgressSettings, setFoundCompany, setShareProgress } from "@/lib/db/queries/progress";

// Ce que le responsable reçoit d'un étudiant, et rien d'autre : la liste est figée ici pour qu'un
// champ ajouté plus tard à `listMembers` (une entreprise, un intitulé…) fasse échouer ce test.
const MEMBER_KEYS = ["createdAt", "email", "foundCompanyAt", "id", "lastLoginAt", "lastSentAt", "sentCount", "shareProgress"];

async function candidature(userId: string, title: string, status: "Envoyé" | "Refusé" | "À valider", sentAt: Date | null) {
  const [job] = await insertJobs(userId, [
    { title, company: "Entreprise secrète", location: "Lyon", contract: "CDI", source: "Test", jobUrl: null, jobDescription: null, score: 50 },
  ]);
  const app = await createApplication(userId, job.id, { letterText: "Lettre secrète", emailText: "E-mail", linkedInText: "LinkedIn" });
  await db.update(applications).set({ status, sentAt }).where(eq(applications.id, app!.id));
}

describe("suivi d'avancement", () => {
  let orgId = "";
  let partage = "";
  let refus = "";

  beforeAll(async () => {
    await resetDatabase();
    const org = await createOrganisation({ name: "Promo test" });
    orgId = org.id;
    partage = (await registerTraineeWithCode({ email: "oui@ex.fr", passwordHash: "x", code: org.code, shareProgress: true })).id;
    refus = (await registerTraineeWithCode({ email: "non@ex.fr", passwordHash: "x", code: org.code })).id;
    await candidature(partage, "A", "Envoyé", new Date("2026-10-01T10:00:00Z"));
    await candidature(partage, "B", "Refusé", new Date("2026-10-03T10:00:00Z"));
    await candidature(partage, "C", "À valider", null);
    await candidature(refus, "D", "Envoyé", new Date("2026-10-02T10:00:00Z"));
  });

  it("compte les candidatures envoyées (Refusé compris) et donne la dernière date", async () => {
    const m = (await listMembers(orgId)).find((x) => x.id === partage)!;
    expect(m.shareProgress).toBe(true);
    expect(m.sentCount).toBe(2);
    expect(m.lastSentAt?.toISOString()).toBe("2026-10-03T10:00:00.000Z");
  });

  it("ne renvoie rien pour un étudiant qui ne partage pas", async () => {
    const m = (await listMembers(orgId)).find((x) => x.id === refus)!;
    expect(m.shareProgress).toBe(false);
    expect(m.sentCount).toBeNull();
    expect(m.lastSentAt).toBeNull();
    expect(m.foundCompanyAt).toBeNull();
  });

  it("ne renvoie aucune autre clé que la liste autorisée, ni aucun contenu", async () => {
    const members = await listMembers(orgId);
    for (const m of members) expect(Object.keys(m).sort()).toEqual(MEMBER_KEYS);
    const text = JSON.stringify(members);
    for (const secret of ["Entreprise secrète", "Lettre secrète", "Lyon", "CDI"]) expect(text).not.toContain(secret);
  });

  it("« entreprise trouvée » se pose une seule fois et s'annule", async () => {
    await setFoundCompany(partage, true);
    const first = (await getProgressSettings(partage)).foundCompanyAt;
    expect(first).toBeInstanceOf(Date);
    await setFoundCompany(partage, true);
    expect((await getProgressSettings(partage)).foundCompanyAt?.getTime()).toBe(first!.getTime());
    await setFoundCompany(partage, false);
    expect((await getProgressSettings(partage)).foundCompanyAt).toBeNull();
  });

  it("retirer l'accord masque tout immédiatement, « trouvée » compris", async () => {
    await setFoundCompany(partage, true);
    await setShareProgress(partage, false);
    const m = (await listMembers(orgId)).find((x) => x.id === partage)!;
    expect(m.sentCount).toBeNull();
    expect(m.lastSentAt).toBeNull();
    expect(m.foundCompanyAt).toBeNull();

    await setShareProgress(partage, true);
    const back = (await listMembers(orgId)).find((x) => x.id === partage)!;
    expect(back.sentCount).toBe(2);
    expect(back.foundCompanyAt).toBeInstanceOf(Date);
  });

  it("chaque choix est daté, même un refus à l'inscription", async () => {
    const rows = await db.select({ id: users.id, at: users.shareProgressAt }).from(users);
    for (const id of [partage, refus]) expect(rows.find((r) => r.id === id)?.at).toBeInstanceOf(Date);
  });
});
