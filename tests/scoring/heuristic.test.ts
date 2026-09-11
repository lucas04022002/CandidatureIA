import { describe, expect, it } from "vitest";
import { scoreJob } from "@/lib/scoring/job-scoring";
import { fallbackCandidateProfile, type CandidateProfile } from "@/lib/candidate-profile";

const candidateProfile: CandidateProfile = {
  ...fallbackCandidateProfile,
  fullName: "Camille Test",
  targetRole: "Développeuse frontend React",
  location: "Paris",
  summary: "Développeuse frontend React motivée, à l'aise avec TypeScript et Git.",
  technicalSkills: ["React", "TypeScript", "Git"],
  softSkills: ["Autonomie"],
  experienceHighlights: ["Stage développement web en agence parisienne"],
};

describe("scoreJob (heuristique)", () => {
  it("est synchrone", () => {
    const result = scoreJob(
      { title: "x", company: "x", location: "x", contract: "x", source: "x" },
      { candidateProfile },
    );
    expect(result).not.toBeInstanceOf(Promise);
  });

  it("offre sans aucun mot-clé du profil → score bas (<= 30)", () => {
    const result = scoreJob(
      {
        title: "Boucher charcutier senior",
        company: "Boucherie Exemple",
        location: "Brest",
        contract: "Intérim",
        source: "Test",
      },
      { candidateProfile },
    );

    expect(result.score).toBeLessThanOrEqual(30);
  });

  it("offre reprenant le rôle cible et plusieurs compétences → score élevé (>= 70)", () => {
    const result = scoreJob(
      {
        title: "Développeuse frontend React",
        company: "Entreprise Exemple",
        location: "Paris",
        contract: "CDI",
        source: "Test",
        description:
          "Poste de développeuse frontend React basé à Paris : React, TypeScript et Git au quotidien.",
      },
      { candidateProfile },
    );

    expect(result.score).toBeGreaterThanOrEqual(70);
  });

  it("le score reste toujours dans les bornes 0..100", () => {
    const cases = [
      { title: "", company: "", location: "", contract: "", source: "" },
      {
        title: "Développeuse frontend React".repeat(5),
        company: "Entreprise Exemple",
        location: "Paris",
        contract: "CDI",
        source: "Test",
        description: "React TypeScript Git ".repeat(20),
      },
    ];

    for (const job of cases) {
      const result = scoreJob(job, { candidateProfile });
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    }
  });
});
