import { getProfile, type CandidateProfileRow } from "@/lib/db/queries/profiles";

export interface CandidateProfile {
  profileId?: string | null;
  fullName: string;
  role: string;
  targetRole: string;
  preferredKeywords: string[];
  baseLetterTemplate: string;
  location: string;
  email: string;
  phone: string;
  github: string;
  linkedin: string;
  summary: string;
  technicalSkills: string[];
  softSkills: string[];
  experienceHighlights: string[];
}

export const importedProfileDefaults: CandidateProfile = {
  profileId: null,
  fullName: "Candidat importe",
  role: "Profil candidat",
  targetRole: "",
  preferredKeywords: [],
  baseLetterTemplate: "",
  location: "Non renseigne",
  email: "Non renseigne",
  phone: "",
  github: "",
  linkedin: "",
  summary: "Profil importe depuis le CV.",
  technicalSkills: [],
  softSkills: [],
  experienceHighlights: [],
};

// Profil neutre utilisé tant qu'aucun CV n'a été importé.
export const fallbackCandidateProfile: CandidateProfile = {
  profileId: null,
  fullName: "Profil non configuré",
  role: "Candidat",
  targetRole: "",
  preferredKeywords: [],
  baseLetterTemplate: "",
  location: "Non renseigné",
  email: "Non renseigné",
  phone: "",
  github: "",
  linkedin: "",
  summary: "Importe ton CV depuis l'onboarding pour personnaliser le scoring et les candidatures.",
  technicalSkills: [],
  softSkills: [],
  experienceHighlights: [],
};

function normalizeImportedList(items: string[] | null | undefined) {
  return (items ?? []).map((item) => item.trim()).filter(Boolean);
}

export function getEffectiveCandidateRole(profile: CandidateProfile) {
  return profile.targetRole.trim() || profile.role.trim() || importedProfileDefaults.role;
}

export function getCandidateSearchKeywords(profile: CandidateProfile) {
  const preferred = normalizeImportedList(profile.preferredKeywords);
  if (preferred.length > 0) {
    return preferred;
  }

  const effectiveRole = getEffectiveCandidateRole(profile);
  if (effectiveRole && effectiveRole !== importedProfileDefaults.role) {
    return [effectiveRole];
  }

  return [];
}

export function mapCandidateProfileRow(row: CandidateProfileRow): CandidateProfile {
  const role = row.role.trim() || importedProfileDefaults.role;

  return {
    profileId: row.id,
    fullName: row.fullName.trim() || importedProfileDefaults.fullName,
    role,
    targetRole: row.targetRole?.trim() || "",
    preferredKeywords: normalizeImportedList(row.preferredKeywords),
    baseLetterTemplate: row.baseLetterTemplate?.trim() || "",
    location: row.location.trim() || importedProfileDefaults.location,
    email: row.email.trim() || importedProfileDefaults.email,
    phone: row.phone.trim() || importedProfileDefaults.phone,
    github: row.github.trim() || importedProfileDefaults.github,
    linkedin: row.linkedin.trim() || importedProfileDefaults.linkedin,
    summary: row.summary.trim() || importedProfileDefaults.summary,
    technicalSkills: normalizeImportedList(row.technicalSkills),
    softSkills: normalizeImportedList(row.softSkills),
    experienceHighlights: normalizeImportedList(row.experienceHighlights),
  };
}

// Profil actif d'UN utilisateur : la lecture est toujours filtrée par `userId`, et le profil neutre
// sert tant qu'aucun CV n'a été importé par ce compte.
export async function getActiveCandidateProfile(userId: string): Promise<CandidateProfile> {
  const row = await getProfile(userId);
  return row ? mapCandidateProfileRow(row) : fallbackCandidateProfile;
}
