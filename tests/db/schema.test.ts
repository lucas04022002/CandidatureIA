import { describe, expect, it, beforeAll } from "vitest";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { resetDatabase } from "../setup-db";
import { users, jobs, applications } from "@/lib/db/schema";
describe("schéma", () => {
  beforeAll(resetDatabase);
  it("crée les tables attendues", async () => {
    const rows = await db.execute(sql`select table_name from information_schema.tables where table_schema='public' order by 1`);
    const names = rows.rows.map((r: { table_name: string }) => r.table_name);
    for (const t of ["organisations","users","candidate_profiles","jobs","applications","search_runs","login_attempts","cv_imports"]) expect(names).toContain(t);
  });
  it("rejette un score hors plage 0-100 (contrainte jobs_score_range)", async () => {
    const [user] = await db.insert(users).values({ email: "score-test@example.com", passwordHash: "x", role: "stagiaire" }).returning();
    await expect(
      db.insert(jobs).values({
        userId: user.id,
        title: "titre", company: "société", location: "lieu", contract: "cdi", source: "source",
        score: 101,
      })
    ).rejects.toThrow();
  });
  it("rejette deux candidatures pour la même offre et le même utilisateur (contrainte applications_job_user_unique)", async () => {
    const [user] = await db.insert(users).values({ email: "unique-test@example.com", passwordHash: "x", role: "stagiaire" }).returning();
    const [job] = await db.insert(jobs).values({
      userId: user.id,
      title: "titre", company: "société", location: "lieu", contract: "cdi", source: "source",
      score: 50,
    }).returning();
    await db.insert(applications).values({ userId: user.id, jobId: job.id });
    await expect(
      db.insert(applications).values({ userId: user.id, jobId: job.id })
    ).rejects.toThrow();
  });
  it("rejette une candidature sans jobId (job_id NOT NULL)", async () => {
    const [user] = await db.insert(users).values({ email: "no-job-test@example.com", passwordHash: "x", role: "stagiaire" }).returning();
    await expect(
      // @ts-expect-error jobId est requis (job_id NOT NULL) : on vérifie ici le rejet en base sans lui.
      db.insert(applications).values({ userId: user.id })
    ).rejects.toThrow();
  });
});
