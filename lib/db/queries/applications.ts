import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { applications, jobs } from "@/lib/db/schema";
import type { Application, ApplicationStatus } from "@/lib/types";

export type ApplicationRow = typeof applications.$inferSelect;

export interface ApplicationTexts {
  letterText: string;
  emailText: string;
  linkedInText: string;
}

interface JoinedRow {
  application: ApplicationRow;
  jobTitle: string | null;
  company: string | null;
  jobUrl: string | null;
  jobScore: number | null;
}

function asDateTimeLabel(date: Date | null) {
  if (!date || Number.isNaN(date.getTime())) return "Date inconnue";
  return date.toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" });
}

function mapJoinedRow(row: JoinedRow): Application {
  const a = row.application;
  return {
    id: a.id,
    jobId: a.jobId,
    jobUrl: row.jobUrl ?? null,
    jobTitle: row.jobTitle ?? "Offre inconnue",
    company: row.company ?? "Entreprise inconnue",
    jobScore: row.jobScore ?? null,
    status: a.status,
    updatedAt: asDateTimeLabel(a.updatedAt),
    sentAt: a.sentAt ? asDateTimeLabel(a.sentAt) : null,
    assets: {
      letter: a.letterGenerated,
      email: a.emailGenerated,
      linkedIn: a.linkedinGenerated,
    },
    content: {
      letterText: a.letterText,
      emailText: a.emailText,
      linkedInText: a.linkedinText,
      followupEmailText: a.followupEmailText,
    },
  };
}

// La jointure est elle aussi bornée à l'utilisateur : même si une candidature pointait un jour vers
// l'offre d'un autre compte, aucun titre ni score ne fuiterait.
const joined = (userId: string) =>
  db
    .select({
      application: applications,
      jobTitle: jobs.title,
      company: jobs.company,
      jobUrl: jobs.jobUrl,
      jobScore: jobs.score,
    })
    .from(applications)
    .leftJoin(jobs, and(eq(jobs.id, applications.jobId), eq(jobs.userId, userId)));

export async function getApplications(userId: string): Promise<Application[]> {
  const rows = await joined(userId).where(eq(applications.userId, userId)).orderBy(desc(applications.updatedAt));
  return rows.map(mapJoinedRow);
}

export async function getApplicationById(userId: string, id: string): Promise<Application | null> {
  const rows = await joined(userId)
    .where(and(eq(applications.userId, userId), eq(applications.id, id)))
    .limit(1);
  return rows[0] ? mapJoinedRow(rows[0]) : null;
}

export async function getApplicationRow(userId: string, id: string): Promise<ApplicationRow | null> {
  const rows = await db
    .select()
    .from(applications)
    .where(and(eq(applications.userId, userId), eq(applications.id, id)))
    .limit(1);
  return rows[0] ?? null;
}

// Crée ou remplace la candidature de CET utilisateur pour CETTE offre. L'offre est revérifiée ici :
// un `jobId` venant du corps de la requête ne suffit jamais, il doit appartenir à l'utilisateur.
export async function createApplication(
  userId: string,
  jobId: string,
  texts: ApplicationTexts,
): Promise<Application | null> {
  const owned = await db
    .select({ id: jobs.id })
    .from(jobs)
    .where(and(eq(jobs.userId, userId), eq(jobs.id, jobId)))
    .limit(1);
  if (!owned[0]) return null;

  const now = new Date();
  const values = {
    status: "À valider" as ApplicationStatus,
    letterGenerated: true,
    emailGenerated: true,
    linkedinGenerated: true,
    letterText: texts.letterText,
    emailText: texts.emailText,
    linkedinText: texts.linkedInText,
    updatedAt: now,
  };

  const [row] = await db
    .insert(applications)
    .values({ userId, jobId, ...values })
    .onConflictDoUpdate({ target: [applications.jobId, applications.userId], set: values })
    .returning();

  return getApplicationById(userId, row.id);
}

export async function updateApplicationStatus(
  userId: string,
  id: string,
  status: ApplicationStatus,
): Promise<Application | null> {
  const current = await getApplicationRow(userId, id);
  if (!current) return null;

  const now = new Date();
  await db
    .update(applications)
    .set({
      status,
      updatedAt: now,
      ...(status === "Envoyé" && !current.sentAt ? { sentAt: now } : {}),
    })
    .where(and(eq(applications.userId, userId), eq(applications.id, id)));

  return getApplicationById(userId, id);
}

export async function setFollowup(
  userId: string,
  id: string,
  text: string,
  dueAt: Date | null,
): Promise<Application | null> {
  const updated = await db
    .update(applications)
    .set({ followupEmailText: text, followupDueAt: dueAt, updatedAt: new Date() })
    .where(and(eq(applications.userId, userId), eq(applications.id, id)))
    .returning({ id: applications.id });
  if (!updated[0]) return null;
  return getApplicationById(userId, id);
}

export async function deleteApplication(userId: string, id: string): Promise<ApplicationRow | null> {
  const removed = await db
    .delete(applications)
    .where(and(eq(applications.userId, userId), eq(applications.id, id)))
    .returning();
  return removed[0] ?? null;
}
