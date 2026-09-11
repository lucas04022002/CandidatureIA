import { describe, expect, it } from "vitest";
import { generateApplicationTexts, type JobForGeneration } from "@/lib/application-generation";
import { fallbackCandidateProfile, type CandidateProfile } from "@/lib/candidate-profile";

const job: JobForGeneration = {
  title: "Développeur frontend",
  company: "Entreprise Exemple",
  location: "Paris",
  contract: "CDI",
  source: "Test",
  job_description: "Développement d'interfaces React et intégration avec l'API backend.",
};

const candidateProfile: CandidateProfile = {
  ...fallbackCandidateProfile,
  fullName: "Camille Test",
  targetRole: "Développeuse frontend",
  email: "camille.test@exemple.fr",
  phone: "06 00 00 00 00",
  location: "Paris",
  summary: "Développeuse motivée par les interfaces React et le travail en équipe.",
  technicalSkills: ["React", "TypeScript", "Git"],
  softSkills: ["Rigueur"],
  experienceHighlights: ["Stage développement web dans une agence parisienne"],
};

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

// "ia" est testé en tant que mot isolé (\bia\b) pour éviter les faux positifs sur des mots français
// courants qui contiennent la sous-chaîne "ia" (ex: "stagiaire", "sociale").
const BANNED_WORD_PATTERNS = [/\bia\b/, /intelligence artificielle/, /genere par/];

describe("generateApplicationTexts", () => {
  const result = generateApplicationTexts(job, candidateProfile);

  it("contient le nom du candidat et le titre du poste dans les trois textes", () => {
    for (const text of [result.letterText, result.emailText, result.linkedInText]) {
      expect(text).toContain(job.title);
    }
    expect(result.letterText).toContain(candidateProfile.fullName);
    expect(result.emailText).toContain(candidateProfile.fullName);
  });

  it("ne mentionne jamais l'IA ni une génération automatique dans les textes produits", () => {
    for (const text of [result.letterText, result.emailText, result.linkedInText]) {
      const normalized = normalize(text);
      for (const pattern of BANNED_WORD_PATTERNS) {
        expect(pattern.test(normalized)).toBe(false);
      }
    }
  });

  it("est synchrone et renvoie directement les textes (pas une Promise)", () => {
    const direct = generateApplicationTexts(job, candidateProfile);
    expect(direct.letterText).toBeTruthy();
    expect(direct.source).toBe("heuristic");
  });
});
