import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { applications, jobs } from "@/lib/db/schema";
import type { ApplicationStatus, DashboardStat, Job } from "@/lib/types";

export type JobRow = typeof jobs.$inferSelect;

export interface NewJobInput {
  title: string;
  company: string;
  location: string;
  contract: string;
  source: string;
  sourceLabels?: string[];
  jobUrl: string | null;
  jobDescription: string | null;
  score: number;
  status?: ApplicationStatus;
}

export interface JobBackfill {
  id: string;
  source: string;
  sourceLabels: string[];
  jobUrl: string | null;
  jobDescription: string | null;
}

// Un `jobUrl` vient d'une API externe et finit dans un `href` cliquable côté client. Une URL
// `javascript:` (ou `data:`) y devient du code exécuté dans la session de l'utilisateur au moment
// du clic : XSS stockée, franchie une fois pour toutes puisque l'URL est persistée. Seuls http et
// https sont conservés ; tout le reste est ramené à `null` — l'offre reste, le lien disparaît.
// Filtré ici, au point d'écriture, et pas dans la route : c'est le seul passage obligé vers la base.
export function safeJobUrl(raw: string | null | undefined): string | null {
  const value = raw?.trim();
  if (!value) return null;
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    // Ni URL absolue, ni rien d'exploitable : pas de lien plutôt qu'un lien douteux.
    return null;
  }
  return parsed.protocol === "http:" || parsed.protocol === "https:" ? value : null;
}

// Empreinte de dédoublonnage : titre + entreprise + lieu, insensible à la casse et aux espaces de
// bord. Identique à celle qu'utilisait l'ancienne route de scraping.
export function jobFingerprint(job: Pick<NewJobInput, "title" | "company" | "location">) {
  return `${job.title.trim().toLowerCase()}::${job.company.trim().toLowerCase()}::${job.location.trim().toLowerCase()}`;
}

function asDateLabel(date: Date | null) {
  if (!date || Number.isNaN(date.getTime())) return "Date inconnue";
  return date.toLocaleDateString("fr-FR");
}

export function mapJobRow(row: JobRow): Job {
  return {
    id: row.id,
    title: row.title,
    company: row.company,
    location: row.location,
    contract: row.contract,
    source: row.source,
    sourceLabels: row.sourceLabels?.length ? row.sourceLabels : [row.source],
    jobUrl: row.jobUrl,
    jobDescription: row.jobDescription,
    postedAt: asDateLabel(row.createdAt),
    score: row.score,
    status: row.status,
  };
}

export async function getJobRows(userId: string): Promise<JobRow[]> {
  return db.select().from(jobs).where(eq(jobs.userId, userId)).orderBy(desc(jobs.createdAt));
}

export async function getJobs(userId: string): Promise<Job[]> {
  return (await getJobRows(userId)).map(mapJobRow);
}

export async function getJobById(userId: string, jobId: string): Promise<JobRow | null> {
  const rows = await db
    .select()
    .from(jobs)
    .where(and(eq(jobs.userId, userId), eq(jobs.id, jobId)))
    .limit(1);
  return rows[0] ?? null;
}

// Insère les offres qui n'existent pas déjà chez CET utilisateur (même empreinte). Les doublons du
// lot entrant sont également écartés.
export async function insertJobs(userId: string, incoming: NewJobInput[]): Promise<JobRow[]> {
  if (incoming.length === 0) return [];

  const existing = new Set((await getJobRows(userId)).map((row) => jobFingerprint(row)));
  const values: (typeof jobs.$inferInsert)[] = [];

  for (const job of incoming) {
    const fingerprint = jobFingerprint(job);
    if (existing.has(fingerprint)) continue;
    existing.add(fingerprint);
    values.push({
      userId,
      title: job.title,
      company: job.company,
      location: job.location,
      contract: job.contract,
      source: job.source,
      sourceLabels: job.sourceLabels?.length ? job.sourceLabels : [job.source],
      jobUrl: safeJobUrl(job.jobUrl),
      jobDescription: job.jobDescription,
      score: job.score,
      status: job.status ?? "Nouveau",
    });
  }

  if (values.length === 0) return [];
  return db.insert(jobs).values(values).returning();
}

export async function updateJobScore(userId: string, jobId: string, score: number): Promise<boolean> {
  const updated = await db
    .update(jobs)
    .set({ score, updatedAt: new Date() })
    .where(and(eq(jobs.userId, userId), eq(jobs.id, jobId)))
    .returning({ id: jobs.id });
  return updated.length > 0;
}

export async function updateJobStatus(userId: string, jobId: string, status: ApplicationStatus): Promise<JobRow | null> {
  const updated = await db
    .update(jobs)
    .set({ status, updatedAt: new Date() })
    .where(and(eq(jobs.userId, userId), eq(jobs.id, jobId)))
    .returning();
  return updated[0] ?? null;
}

export async function markJobApplied(userId: string, jobId: string): Promise<JobRow | null> {
  const now = new Date();
  const updated = await db
    .update(jobs)
    .set({ appliedClickedAt: now, status: "Brouillon", updatedAt: now })
    .where(and(eq(jobs.userId, userId), eq(jobs.id, jobId)))
    .returning();
  return updated[0] ?? null;
}

export async function backfillJobs(userId: string, patches: JobBackfill[]): Promise<number> {
  let count = 0;
  for (const patch of patches) {
    const updated = await db
      .update(jobs)
      .set({
        source: patch.source,
        sourceLabels: patch.sourceLabels,
        jobUrl: safeJobUrl(patch.jobUrl),
        ...(patch.jobDescription ? { jobDescription: patch.jobDescription } : {}),
        updatedAt: new Date(),
      })
      .where(and(eq(jobs.userId, userId), eq(jobs.id, patch.id)))
      .returning({ id: jobs.id });
    count += updated.length;
  }
  return count;
}

export async function deleteJobs(userId: string, jobIds: string[]): Promise<number> {
  if (jobIds.length === 0) return 0;
  const removed = await db
    .delete(jobs)
    .where(and(eq(jobs.userId, userId), inArray(jobs.id, jobIds)))
    .returning({ id: jobs.id });
  return removed.length;
}

export async function getDashboardStats(userId: string): Promise<DashboardStat[]> {
  const [jobStats] = await db
    .select({ total: sql<number>`count(*)::int`, scoreSum: sql<number>`coalesce(sum(${jobs.score}), 0)::int` })
    .from(jobs)
    .where(eq(jobs.userId, userId));

  const [applicationStats] = await db
    .select({
      total: sql<number>`count(*)::int`,
      sent: sql<number>`count(*) filter (where ${applications.status} = 'Envoyé')::int`,
    })
    .from(applications)
    .where(eq(applications.userId, userId));

  const jobCount = jobStats?.total ?? 0;
  const applicationCount = applicationStats?.total ?? 0;
  const sentCount = applicationStats?.sent ?? 0;
  const averageScore = jobCount ? Math.round((jobStats?.scoreSum ?? 0) / jobCount) : 0;
  const sendRate = applicationCount ? Math.round((sentCount / applicationCount) * 100) : 0;

  return [
    { label: "Offres suivies", value: String(jobCount), change: "Source: Postgres" },
    { label: "Candidatures générées", value: String(applicationCount), change: "Source: Postgres" },
    { label: "Taux d'envoi", value: `${sendRate}%`, change: "Calculé en direct" },
    { label: "Score moyen", value: `${averageScore}/100`, change: "Calculé en direct" },
  ];
}
