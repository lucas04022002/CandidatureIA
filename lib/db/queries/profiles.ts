import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { candidateProfiles } from "@/lib/db/schema";
import { fallbackCandidateProfile, importedProfileDefaults } from "@/lib/candidate-profile";
import type { CandidateProfileSummary } from "@/lib/types";

export type CandidateProfileRow = typeof candidateProfiles.$inferSelect;

// Champs modifiables d'un profil. `userId` n'en fait jamais partie : il est toujours fourni en
// premier argument et sert de filtre, jamais de donnée.
export type CandidateProfileInput = Partial<Omit<CandidateProfileRow, "id" | "userId" | "createdAt" | "updatedAt">>;

export async function getProfile(userId: string): Promise<CandidateProfileRow | null> {
  const rows = await db.select().from(candidateProfiles).where(eq(candidateProfiles.userId, userId)).limit(1);
  return rows[0] ?? null;
}

// Un seul profil par utilisateur (contrainte d'unicité sur `user_id`) : un ré-import de CV écrase le
// profil existant au lieu d'en empiler un second, et `profileId` reste stable côté client.
export async function upsertProfile(userId: string, data: CandidateProfileInput): Promise<CandidateProfileRow> {
  const [row] = await db
    .insert(candidateProfiles)
    .values({ userId, fileName: "", rawText: "", ...data })
    .onConflictDoUpdate({
      target: candidateProfiles.userId,
      set: { ...data, updatedAt: new Date() },
    })
    .returning();
  return row;
}

function trimmedOr(value: string | null | undefined, fallback: string) {
  return value?.trim() || fallback;
}

function cleanList(values: string[] | null | undefined) {
  return (values ?? []).map((value) => value.trim()).filter(Boolean);
}

export async function getCandidateProfileSummary(userId: string): Promise<CandidateProfileSummary> {
  const row = await getProfile(userId);

  if (!row) {
    return {
      id: null,
      fullName: fallbackCandidateProfile.fullName,
      role: fallbackCandidateProfile.role,
      targetRole: fallbackCandidateProfile.targetRole,
      preferredKeywords: fallbackCandidateProfile.preferredKeywords,
      baseLetterTemplate: fallbackCandidateProfile.baseLetterTemplate,
      location: fallbackCandidateProfile.location,
      email: fallbackCandidateProfile.email,
      technicalSkills: fallbackCandidateProfile.technicalSkills,
      summary: fallbackCandidateProfile.summary,
      source: "fallback",
    };
  }

  return {
    id: row.id,
    fullName: trimmedOr(row.fullName, importedProfileDefaults.fullName),
    role: trimmedOr(row.role, importedProfileDefaults.role),
    targetRole: row.targetRole?.trim() || "",
    preferredKeywords: cleanList(row.preferredKeywords),
    baseLetterTemplate: row.baseLetterTemplate?.trim() || "",
    location: trimmedOr(row.location, importedProfileDefaults.location),
    email: trimmedOr(row.email, importedProfileDefaults.email),
    technicalSkills: cleanList(row.technicalSkills),
    summary: trimmedOr(row.summary, importedProfileDefaults.summary),
    source: "imported",
  };
}
