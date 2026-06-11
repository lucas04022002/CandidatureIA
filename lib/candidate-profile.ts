import { createSupabaseServerClient, hasSupabaseEnv } from "@/lib/supabase/server";

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

interface CandidateProfileRow {
  id?: string;
  full_name: string;
  role: string;
  target_role: string | null;
  preferred_keywords: string[] | null;
  base_letter_template: string | null;
  location: string;
  email: string;
  phone: string;
  github: string;
  linkedin: string;
  summary: string;
  technical_skills: string[] | null;
  soft_skills: string[] | null;
  experience_highlights: string[] | null;
}

function isMissingCandidatePreferenceColumns(message: string) {
  return (
    message.includes("candidate_profiles.target_role") ||
    message.includes("candidate_profiles.preferred_keywords") ||
    message.includes("candidate_profiles.base_letter_template") ||
    message.includes("target_role") ||
    message.includes("preferred_keywords") ||
    message.includes("base_letter_template")
  );
}

export const fallbackCandidateProfile: CandidateProfile = {
  profileId: null,
  fullName: "Lucas Guilhot",
  role: "Developpeur web full stack junior",
  targetRole: "Developpeur web full stack junior",
  preferredKeywords: ["developpeur full stack"],
  baseLetterTemplate: "",
  location: "Haute-Garonne (31)",
  email: "lucasguilhot7@gmail.com",
  phone: "06.25.90.84.11",
  github: "https://github.com/lucas04022002",
  linkedin: "https://www.linkedin.com/in/guilhot-lucas",
  summary:
    "Passionne par l'informatique depuis plus de 7 ans, j'ai commence par l'assemblage et la maintenance d'ordinateurs avant de me specialiser en developpement web. Je concois aujourd'hui des projets personnels full stack et je recherche un poste de developpeur.",
  technicalSkills: [
    "Node.js",
    "FastAPI",
    "React",
    "Tailwind CSS",
    "TypeScript",
    "Python (pandas, NumPy)",
    "MySQL",
    "Git",
    "GitHub Actions",
  ],
  softSkills: [
    "Pensee analytique",
    "Apprentissage autonome",
    "Adaptabilite",
    "Travail en equipe (Agile/Scrum)",
    "Rigueur",
  ],
  experienceHighlights: [
    "Coordinateur logistique / dispatcher manager (2023-2025): organisation des livraisons nationales et internationales, gestion des flux et management d'equipe.",
    "Missions en interim en logistique et manutention (2020-2023).",
    "Employe polyvalent (Castorama): preparation de commandes, mise en rayon, orientation clients.",
    "Formation Developpeur Web (Wild Code School): interfaces, API Node.js/FastAPI, bases de donnees.",
  ],
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

function mapCandidateProfileRow(row: CandidateProfileRow): CandidateProfile {
  const role = row.role.trim() || importedProfileDefaults.role;
  const targetRole = row.target_role?.trim() || "";
  const preferredKeywords = normalizeImportedList(row.preferred_keywords);

  return {
    profileId: row.id ?? null,
    fullName: row.full_name.trim() || importedProfileDefaults.fullName,
    role,
    targetRole,
    preferredKeywords,
    baseLetterTemplate: row.base_letter_template?.trim() || "",
    location: row.location.trim() || importedProfileDefaults.location,
    email: row.email.trim() || importedProfileDefaults.email,
    phone: row.phone.trim() || importedProfileDefaults.phone,
    github: row.github.trim() || importedProfileDefaults.github,
    linkedin: row.linkedin.trim() || importedProfileDefaults.linkedin,
    summary: row.summary.trim() || importedProfileDefaults.summary,
    technicalSkills: normalizeImportedList(row.technical_skills),
    softSkills: normalizeImportedList(row.soft_skills),
    experienceHighlights: normalizeImportedList(row.experience_highlights),
  };
}

export async function getActiveCandidateProfile(): Promise<CandidateProfile> {
  if (!hasSupabaseEnv()) {
    return fallbackCandidateProfile;
  }

  const supabase = createSupabaseServerClient();
  if (!supabase) {
    return fallbackCandidateProfile;
  }

  const { data, error } = await supabase
    .from("candidate_profiles")
    .select(
      "id,full_name,role,target_role,preferred_keywords,base_letter_template,location,email,phone,github,linkedin,summary,technical_skills,soft_skills,experience_highlights",
    )
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error && isMissingCandidatePreferenceColumns(error.message)) {
    const fallbackResult = await supabase
      .from("candidate_profiles")
      .select(
        "id,full_name,role,location,email,phone,github,linkedin,summary,technical_skills,soft_skills,experience_highlights",
      )
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (fallbackResult.error || !fallbackResult.data) {
      return fallbackCandidateProfile;
    }

    const row = fallbackResult.data as Omit<
      CandidateProfileRow,
      "target_role" | "preferred_keywords"
    >;

    return {
      profileId: row.id ?? null,
      fullName: row.full_name.trim() || importedProfileDefaults.fullName,
      role: row.role.trim() || importedProfileDefaults.role,
      targetRole: row.role.trim() || importedProfileDefaults.role,
      preferredKeywords: [],
      baseLetterTemplate: "",
      location: row.location.trim() || importedProfileDefaults.location,
      email: row.email.trim() || importedProfileDefaults.email,
      phone: row.phone.trim() || importedProfileDefaults.phone,
      github: row.github.trim() || importedProfileDefaults.github,
      linkedin: row.linkedin.trim() || importedProfileDefaults.linkedin,
      summary: row.summary.trim() || importedProfileDefaults.summary,
      technicalSkills: normalizeImportedList(row.technical_skills),
      softSkills: normalizeImportedList(row.soft_skills),
      experienceHighlights: normalizeImportedList(row.experience_highlights),
    };
  }

  if (error || !data) {
    return fallbackCandidateProfile;
  }

  return mapCandidateProfileRow(data as CandidateProfileRow);
}
