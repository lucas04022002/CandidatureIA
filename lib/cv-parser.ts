import type { CandidateProfile } from "@/lib/candidate-profile";
import { importedProfileDefaults } from "@/lib/candidate-profile";

const SKILL_ALIASES: Record<string, string[]> = {
  "Node.js": ["node", "node.js", "nodejs", "express"],
  FastAPI: ["fastapi"],
  React: ["react", "react.js", "reactjs"],
  "Tailwind CSS": ["tailwind"],
  TypeScript: ["typescript"],
  "Python (pandas, NumPy)": ["python", "pandas", "numpy"],
  MySQL: ["mysql", "sql", "postgresql", "postgres"],
  Git: ["git"],
  "GitHub Actions": ["github actions", "ci/cd", "ci cd"],
};

const SOFT_SKILL_ALIASES: Record<string, string[]> = {
  "Pensee analytique": ["analytique", "analyse"],
  "Apprentissage autonome": ["autonome", "autonomie"],
  Adaptabilite: ["adaptable", "adaptabilite"],
  "Travail en equipe (Agile/Scrum)": ["agile", "scrum", "travail en equipe"],
  Rigueur: ["rigueur", "rigoureux"],
};

const ROLE_ALIASES: Record<string, string[]> = {
  "Architecte d'interieur": [
    "architecte d'interieur",
    "architecture d'interieur",
    "amenagement",
    "agencement",
    "plans",
    "espaces",
    "decoration",
    "dessin",
  ],
  "Graphiste / Designer": ["graphiste", "designer", "design graphique", "illustration", "creation visuelle"],
  "Chargee de communication": ["communication", "community manager", "reseaux sociaux", "contenu"],
  "Assistante administrative": ["administratif", "assistante", "gestion", "secretariat"],
  "Commerciale": ["commercial", "vente", "prospection", "relation client"],
  "Developpeur full stack": ["full stack", "developpeur full stack"],
  "Developpeur backend": ["backend", "api", "node.js", "fastapi"],
  "Developpeur frontend": ["frontend", "front-end", "react", "ui"],
};

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function firstMatch(text: string, regex: RegExp) {
  const match = text.match(regex);
  return match?.[1]?.trim() || match?.[0]?.trim() || "";
}

function unique<T>(values: T[]) {
  return values.filter((value, index) => values.indexOf(value) === index);
}

function pickName(lines: string[]) {
  const candidate = lines.find((line) => {
    if (line.length < 5 || line.length > 60) return false;
    if (/\d/.test(line)) return false;
    const lowered = normalizeText(line);
    return !lowered.includes("curriculum") && !lowered.includes("developpeur") && !lowered.includes("cv");
  });
  return candidate || importedProfileDefaults.fullName;
}

function pickRole(text: string, lines: string[]) {
  const normalized = normalizeText(text);

  const matchedRole = Object.entries(ROLE_ALIASES)
    .map(([role, aliases]) => ({
      role,
      score: aliases.reduce(
        (sum, alias) => (normalized.includes(normalizeText(alias)) ? sum + alias.length : sum),
        0,
      ),
    }))
    .sort((a, b) => b.score - a.score)[0];

  if (matchedRole && matchedRole.score > 0) {
    return matchedRole.role;
  }

  const matchingLine = lines.find((line) => {
    const lowered = normalizeText(line);
    return (
      lowered.includes("developpeur") ||
      lowered.includes("software engineer") ||
      lowered.includes("designer") ||
      lowered.includes("architecte") ||
      lowered.includes("graphiste") ||
      lowered.includes("communication") ||
      lowered.includes("commercial") ||
      lowered.includes("assistante")
    );
  });
  return matchingLine || importedProfileDefaults.role;
}

function pickSummary(lines: string[]) {
  const sentenceLine = lines.find((line) => line.length > 90);
  return sentenceLine || lines.find((line) => line.length > 40) || importedProfileDefaults.summary;
}

function pickLocation(text: string) {
  const locationMatch = firstMatch(
    text,
    /(Toulouse|Haute-Garonne|Paris|Lyon|Bordeaux|Nantes|Lille|Marseille)(?:\s*\((\d{2})\))?/i,
  );
  return locationMatch || importedProfileDefaults.location;
}

function pickSkills(text: string, aliases: Record<string, string[]>, fallback: string[]) {
  const normalized = normalizeText(text);
  const hits = Object.entries(aliases)
    .filter(([, values]) => values.some((value) => normalized.includes(normalizeText(value))))
    .map(([label]) => label);
  return hits.length ? unique(hits) : fallback;
}

function pickGenericKeywords(lines: string[]) {
  return unique(
    lines
      .flatMap((line) =>
        line
          .split(/[•,;/|-]/)
          .map((part) => part.trim())
          .filter((part) => part.length >= 3 && part.length <= 40 && !/\d/.test(part)),
      )
      .filter((part) => {
        const normalized = normalizeText(part);
        return (
          !normalized.includes("@") &&
          !normalized.includes("http") &&
          normalized !== importedProfileDefaults.role.toLowerCase() &&
          normalized !== importedProfileDefaults.fullName.toLowerCase()
        );
      }),
  );
}

function pickExperienceHighlights(lines: string[]) {
  const highlights = lines.filter((line) => /\b(20\d{2}|19\d{2})\b/.test(line) || line.startsWith("-"));
  const cleaned = highlights.map((line) => line.replace(/^[-*]\s*/, "").trim()).filter(Boolean);
  return cleaned.length ? unique(cleaned).slice(0, 4) : [];
}

export function parseCandidateProfileFromCv(rawText: string): CandidateProfile {
  const cleanedText = rawText.replace(/\u0000/g, " ").replace(/\r/g, "");
  const lines = cleanedText
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const email = firstMatch(cleanedText, /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  const phone = firstMatch(cleanedText, /(?:\+33|0)\s?[1-9](?:[\s.-]?\d{2}){4}/);
  const github = firstMatch(cleanedText, /https?:\/\/(?:www\.)?github\.com\/[^\s)]+/i);
  const linkedin = firstMatch(cleanedText, /https?:\/\/(?:www\.)?linkedin\.com\/[^\s)]+/i);
  const genericKeywords = pickGenericKeywords(lines);
  const technicalSkills = pickSkills(cleanedText, SKILL_ALIASES, []).slice(0, 8);
  const softSkills = pickSkills(cleanedText, SOFT_SKILL_ALIASES, []).slice(0, 6);
  const inferredKeywords =
    technicalSkills.length === 0 ? genericKeywords.slice(0, 8) : technicalSkills;
  const detectedRole = pickRole(cleanedText, lines);

  return {
    profileId: null,
    fullName: pickName(lines),
    role: detectedRole,
    targetRole: detectedRole,
    preferredKeywords: [detectedRole],
    location: pickLocation(cleanedText),
    email: email || importedProfileDefaults.email,
    phone,
    github,
    linkedin,
    summary: pickSummary(lines),
    technicalSkills: inferredKeywords,
    softSkills,
    experienceHighlights: pickExperienceHighlights(lines),
  };
}
