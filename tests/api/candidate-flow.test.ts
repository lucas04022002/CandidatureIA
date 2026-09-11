import { beforeAll, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { resetDatabase } from "../setup-db";
import { db } from "@/lib/db/client";
import { organisations, searchRuns } from "@/lib/db/schema";
import { hashPassword } from "@/lib/auth/password";
import { signSession } from "@/lib/auth/jwt";
import { createOrganisation, registerTraineeWithCode } from "@/lib/db/queries/organisations";
import { createUser } from "@/lib/db/queries/users";
import { getProfile } from "@/lib/db/queries/profiles";
import { getJobs } from "@/lib/db/queries/jobs";
import { getApplicationById, getApplications } from "@/lib/db/queries/applications";

// Pas de clé OpenAI pendant le parcours : génération et scoring restent sur le chemin heuristique,
// déterministe et hors réseau.
delete process.env.OPENAI_API_KEY;

const mockCookies = new Map<string, string>();

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => (mockCookies.has(name) ? { name, value: mockCookies.get(name)! } : undefined),
  }),
}));

// Les 7 connecteurs sont remplacés par un registre fictif : le parcours teste la persistance et le
// filtrage par utilisateur, jamais les API externes.
vi.mock("@/lib/scrapers/registry", () => {
  const job = (title: string, company: string) => ({
    title,
    company,
    location: "Paris",
    contract: "Alternance",
    source: "Test",
    jobUrl: `https://exemple.test/${encodeURIComponent(title)}`,
    jobDescription: `Mission ${title} chez ${company}.`,
    score: 70,
    status: "Nouveau" as const,
  });
  return {
    SCRAPERS: [{ source: "Test", run: async () => ({ ok: true as const, jobs: [] }) }],
    scrapeAll: async () => [
      {
        source: "Test",
        ok: true,
        jobs: [
          job("Developpeur frontend", "Alpha"),
          job("Developpeur backend", "Beta"),
          job("Data analyst", "Gamma"),
        ],
        warnings: [],
      },
    ],
  };
});

const { POST: importCv } = await import("@/app/api/import-cv/route");
const { POST: scrapeJobs } = await import("@/app/api/scrape-jobs/route");
const { POST: generateApplication } = await import("@/app/api/generate-application/route");
const { POST: updateApplicationStatus } = await import("@/app/api/update-application-status/route");
const { POST: generateFollowup } = await import("@/app/api/generate-followup/route");
const { POST: deleteApplication } = await import("@/app/api/delete-application/route");
const { SESSION_COOKIE } = await import("@/lib/auth/session");

const CV = [
  "Camille Test",
  "camille.test@exemple.fr",
  "06 12 34 56 78",
  "Paris",
  "",
  "Profil",
  "Developpeuse web junior, motivee par les projets React et Node.js.",
  "",
  "Competences",
  "React, Node.js, TypeScript, Git",
  "",
  "Experiences",
  "2024 - Stage developpement web dans une agence parisienne",
].join("\n");

function jsonRequest(path: string, body: unknown) {
  return new Request(`http://localhost${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", host: "localhost", "sec-fetch-site": "same-origin" },
    body: JSON.stringify(body),
  });
}

function formRequest(path: string, form: FormData) {
  return new Request(`http://localhost${path}`, {
    method: "POST",
    headers: { host: "localhost", "sec-fetch-site": "same-origin" },
    body: form,
  });
}

let userId = "";
let otherUserId = "";

describe("parcours candidat sur Postgres", () => {
  beforeAll(async () => {
    await resetDatabase();
    const org = await createOrganisation({ name: "Organisme de test" });
    await db.update(organisations).set({ active: true, seats: 5 }).where(eq(organisations.id, org.id));
    const user = await registerTraineeWithCode({
      email: "camille@exemple.fr",
      passwordHash: await hashPassword("motdepasse-correct"),
      code: org.code,
    });
    userId = user.id;
    const other = await createUser({
      email: "autre@exemple.fr",
      passwordHash: await hashPassword("motdepasse-correct"),
      role: "stagiaire",
      organisationId: org.id,
    });
    otherUserId = other.id;
    mockCookies.set(SESSION_COOKIE, await signSession({ userId: user.id, role: "stagiaire" }));
  });

  let jobId = "";
  let applicationId = "";

  it("1. import du CV → profil enregistré pour l'utilisateur", async () => {
    const form = new FormData();
    form.append("cv", new File([CV], "cv-camille.txt", { type: "text/plain" }));
    const res = await importCv(formRequest("/api/import-cv", form), {});
    expect(res.status).toBe(200);
    expect((await res.json()).ok).toBe(true);

    const profile = await getProfile(userId);
    expect(profile?.fullName).toBe("Camille Test");
  });

  it("2. scraping → 3 offres pour l'utilisateur et 1 ligne dans search_runs", async () => {
    const res = await scrapeJobs(jsonRequest("/api/scrape-jobs", { keywords: "developpeur" }), {});
    expect(res.status).toBe(200);
    expect((await res.json()).ok).toBe(true);

    const jobs = await getJobs(userId);
    expect(jobs).toHaveLength(3);
    jobId = jobs[0].id;

    const runs = await db.select().from(searchRuns).where(eq(searchRuns.userId, userId));
    expect(runs).toHaveLength(1);

    // Quota câblé dans la route, pas seulement dans `lib/rate-limit.ts` : 1 recherche par heure.
    const second = await scrapeJobs(jsonRequest("/api/scrape-jobs", { keywords: "developpeur" }), {});
    expect(second.status).toBe(429);
  });

  it("3. génération de candidature → lettre personnalisée", async () => {
    const res = await generateApplication(jsonRequest("/api/generate-application", { jobId }), {});
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.letterText).toBeTruthy();
    expect(body.letterText).toContain("Camille Test");

    const applications = await getApplications(userId);
    expect(applications).toHaveLength(1);
    applicationId = applications[0].id;
  });

  it("4. passage au statut Envoyé → sentAt renseigné", async () => {
    const res = await updateApplicationStatus(
      jsonRequest("/api/update-application-status", { applicationId, status: "Envoyé" }),
      {},
    );
    expect(res.status).toBe(200);
    expect((await res.json()).ok).toBe(true);

    const application = await getApplicationById(userId, applicationId);
    expect(application?.status).toBe("Envoyé");
    expect(application?.sentAt).not.toBeNull();
  });

  it("5. génération de la relance → texte enregistré", async () => {
    const res = await generateFollowup(jsonRequest("/api/generate-followup", { applicationId }), {});
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.followupEmailText).toBeTruthy();

    const application = await getApplicationById(userId, applicationId);
    expect(application?.content?.followupEmailText).toBeTruthy();
  });

  it("6. suppression → plus aucune candidature", async () => {
    // Vérifié tant que la ligne existe encore : un autre utilisateur ne peut pas la lire par son id.
    expect(await getApplicationById(otherUserId, applicationId)).toBeNull();

    const res = await deleteApplication(jsonRequest("/api/delete-application", { applicationId }), {});
    expect(res.status).toBe(200);
    expect((await res.json()).ok).toBe(true);
    expect(await getApplications(userId)).toHaveLength(0);
  });

  it("7. un second utilisateur ne voit rien du premier", async () => {
    expect(await getJobs(otherUserId)).toHaveLength(0);
    expect(await getProfile(otherUserId)).toBeNull();
    expect(await getApplications(otherUserId)).toHaveLength(0);
  });
});
