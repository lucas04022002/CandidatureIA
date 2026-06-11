import type { CandidateProfile } from "@/lib/candidate-profile";
import { importedProfileDefaults } from "@/lib/candidate-profile";

const SKILL_ALIASES: Record<string, string[]> = {
  "Node.js": ["node", "node.js", "nodejs", "express"],
  FastAPI: ["fastapi"],
  React: ["react", "react.js", "reactjs"],
  "Tailwind CSS": ["tailwind"],
  TypeScript: ["typescript"],
  "Python (pandas, NumPy)": ["python", "pandas", "numpy"],
  MySQL: ["mysql", "postgresql", "postgres", "base de donnees", "sql"],
  Git: ["git", "github"],
  "GitHub Actions": ["github actions", "ci/cd", "ci cd"],
  AutoCAD: ["autocad"],
  Figma: ["figma"],
  Photoshop: ["photoshop", "adobe photoshop"],
  Illustrator: ["illustrator", "adobe illustrator"],
  InDesign: ["indesign", "adobe indesign"],
  Excel: ["excel", "tableur", "spreadsheet"],
  CRM: ["crm", "salesforce", "hubspot"],
  "Relation client": ["relation client", "satisfaction client", "service client"],
  Prospection: ["prospection", "developpement commercial"],
  Négociation: ["negociation", "négociation"],
  "Pilotage de projet": ["pilotage de projet", "gestion de projet", "suivi de projet"],
  Chiffrage: ["chiffrage", "devis", "estimation budgetaire"],
  "Gestion administrative": ["gestion administrative", "secretariat", "assistanat"],
  "Création visuelle": ["creation visuelle", "design graphique", "identite visuelle", "illustration"],
  "Communication digitale": ["communication digitale", "community management", "reseaux sociaux", "social media"],
  "Gestion logistique": ["logistique", "gestion des flux", "approvisionnement", "stock"],
};

const SOFT_SKILL_ALIASES: Record<string, string[]> = {
  "Pensee analytique": ["analytique", "analyse"],
  "Apprentissage autonome": ["autonome", "autonomie"],
  Adaptabilite: ["adaptable", "adaptabilite"],
  "Travail en equipe": ["travail en equipe", "esprit d equipe", "collaboration"],
  Rigueur: ["rigueur", "rigoureux"],
  Organisation: ["organisation", "organise", "planification"],
  Créativité: ["creativite", "créativité", "creatif", "créatif"],
  Communication: ["communication", "aisance relationnelle"],
};

const ROLE_ALIASES: Record<string, string[]> = {
  "Architecte d'interieur": [
    "architecte d'interieur",
    "architecture d'interieur",
    "amenagement interieur",
    "agencement",
    "plans",
    "espaces",
    "decoration",
  ],
  "Graphiste / Designer": [
    "graphiste",
    "designer",
    "design graphique",
    "illustration",
    "creation visuelle",
    "identite visuelle",
  ],
  "Chargee de communication": [
    "chargee de communication",
    "communication",
    "community manager",
    "reseaux sociaux",
    "contenu editorial",
  ],
  "Assistante administrative": [
    "administratif",
    "assistante administrative",
    "gestion administrative",
    "secretariat",
    "assistanat",
  ],
  "Charge d'affaires": [
    "charge d'affaires",
    "chargé d'affaires",
    "chargee d'affaires",
    "chargee d affaires",
    "charge d affaires",
    "responsable d'affaires",
    "ingenieur d'affaires",
    "alternance btp",
    "genie civil",
  ],
  Commerciale: [
    "commercial",
    "vente",
    "prospection",
    "developpement commercial",
    "relation client",
  ],
  "Developpeur full stack": ["full stack", "developpeur full stack"],
  "Developpeur backend": ["backend", "api", "node.js", "fastapi"],
  "Developpeur frontend": ["frontend", "front-end", "react", "ui"],
};

const KEYWORD_STOPWORDS = new Set([
  "cv",
  "curriculum",
  "vitae",
  "profil",
  "candidate",
  "candidat",
  "bonjour",
  "madame",
  "monsieur",
  "email",
  "telephone",
  "adresse",
  "linkedin",
  "github",
  "france",
  "permis",
  "loisirs",
  "interets",
  "passionne",
  "passionnee",
  "recherche",
  "poste",
  "emploi",
  "contact",
  "pour mes proches",
  "centres d'interets",
  "centre d'interet",
  "langues",
  "formations",
  "experiences professionnelles",
  "experience professionnelle",
  "soft skills",
  "hard skills",
  "competences techniques",
  "competences",
  "a propos",
  "scan vers mon portfolio",
  "francais - langue maternelle",
  "anglais - niveau",
  "espagnol - niveau",
  "college",
  "lycee",
  "universite",
  "faculte",
  "bachelor",
  "baccalaureat",
  "disponibilite",
  "rythme",
  "contrat",
  "niveau",
]);

const ROLE_HINT_WORDS = [
  "developpeur",
  "developer",
  "designer",
  "architecte",
  "graphiste",
  "communication",
  "commercial",
  "assistante",
  "charge",
  "ingenieur",
  "responsable",
  "chef",
];

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’`´]/g, "'")
    .toLowerCase();
}

function firstMatch(text: string, regex: RegExp) {
  const match = text.match(regex);
  return match?.[1]?.trim() || match?.[0]?.trim() || "";
}

function unique<T>(values: T[]) {
  return values.filter((value, index) => values.indexOf(value) === index);
}

function cleanKeywordCandidate(value: string) {
  return value.replace(/^[-*]\s*/, "").replace(/\s+/g, " ").trim().replace(/[,:;.!?]+$/g, "");
}

function isLikelySectionLabel(value: string) {
  const cleaned = cleanKeywordCandidate(value);
  const normalized = normalizeText(cleaned).replace(/\s*:\s*$/, "");

  return (
    cleaned.endsWith(":") ||
    KEYWORD_STOPWORDS.has(normalized) ||
    normalized.startsWith("centres d'interets") ||
    normalized.startsWith("langues") ||
    normalized.startsWith("formations") ||
    normalized.startsWith("competences") ||
    normalized.startsWith("soft skills") ||
    normalized.startsWith("hard skills") ||
    normalized.startsWith("a propos") ||
    normalized.startsWith("experiences professionnelles")
  );
}

function pickName(lines: string[]) {
  const ignoredPhrases = [
    "pour mes proches",
    "centres d'interets",
    "langues",
    "formations",
    "a propos",
    "recherche",
    "alternance",
    "charge d'affaires",
    "chargee d'affaires",
    "architecte",
    "designer",
    "communication",
    "developpeur",
    "langue maternelle",
    "langues",
    "anglais",
    "espagnol",
    "francais",
    "niveau",
    "soft skills",
    "competences",
  ];

  const connectorWords = new Set(["de", "du", "des", "le", "la", "les", "d"]);

  const rankedCandidates = lines
    .flatMap((line, index) =>
      line
        .split(/\s{2,}|[|•]/)
        .map((segment) => cleanKeywordCandidate(segment))
        .filter(Boolean)
        .map((cleaned) => ({ cleaned, index })),
    )
    .map(({ cleaned, index }) => {
      if (cleaned.length < 5 || cleaned.length > 60) return null;
      if (/\d/.test(cleaned) || cleaned.includes("@") || cleaned.includes(":")) return null;

      const normalized = normalizeText(cleaned);
      if (ignoredPhrases.some((phrase) => normalized.includes(phrase))) return null;
      if (isLikelySectionLabel(cleaned)) return null;

      const words = cleaned.split(/\s+/).filter(Boolean);
      if (words.length < 2 || words.length > 4) return null;
      if (!words.every((word) => /^[A-Za-zÀ-ÿ'’.-]+$/.test(word))) return null;
      if (
        !words.every((word) => {
          const normalizedWord = normalizeText(word).replace(/[.'’-]/g, "");
          if (connectorWords.has(normalizedWord)) return true;
          return /^[A-ZÀ-Ý][A-Za-zÀ-ÿ'’.-]+$/.test(word) || word === word.toUpperCase();
        })
      ) {
        return null;
      }

      let score = 0;
      score += words.length === 2 ? 4 : 2;
      score += words.some((word) => word === word.toUpperCase() && word.length > 2) ? 3 : 0;
      score += words.every((word) => /^[A-ZÀ-Ý][A-Za-zÀ-ÿ'’.-]+$/.test(word) || word === word.toUpperCase()) ? 3 : 0;
      score += index > Math.max(0, lines.length - 10) ? 2 : 0;
      score += lines
        .slice(Math.max(0, index - 2), Math.min(lines.length, index + 3))
        .some((contextLine) => contextLine.includes("@") || /recherche|alternance|charge|coraline/i.test(contextLine))
        ? 2
        : 0;

      return { cleaned, score };
    })
    .filter((candidate): candidate is { cleaned: string; score: number } => candidate !== null)
    .sort((a, b) => b.score - a.score);

  return rankedCandidates[0]?.cleaned || importedProfileDefaults.fullName;
}

function pickRole(text: string, lines: string[]) {
  const normalized = normalizeText(text);

  const hasDeveloperSignal =
    normalized.includes("developpeur") || normalized.includes("developpement web");
  const hasFrontendSignal =
    normalized.includes("frontend") ||
    normalized.includes("front-end") ||
    normalized.includes("react") ||
    normalized.includes("tailwind") ||
    normalized.includes("interfaces");
  const hasBackendSignal =
    normalized.includes("backend") ||
    normalized.includes("node.js") ||
    normalized.includes("nodejs") ||
    normalized.includes("fastapi") ||
    normalized.includes("api");

  if (hasDeveloperSignal && hasFrontendSignal && hasBackendSignal) {
    return "Developpeur full stack";
  }

  const priorityRoleSignals: Array<{ role: string; patterns: RegExp[] }> = [
    { role: "Developpeur full stack", patterns: [/full[\s-]?stack/i] },
    {
      role: "Charge d'affaires",
      patterns: [
        /recherche.{0,120}charge[ea]?\s+d[ '\u2019]?affaires/i,
        /alternance.{0,120}charge[ea]?\s+d[ '\u2019]?affaires/i,
        /charge[ea]?\s+d[ '\u2019]?affaires.{0,80}btp/i,
        /bachelor.{0,80}charge[ea]?\s+d[ '\u2019]?affaires/i,
      ],
    },
    {
      role: "Architecte d'interieur",
      patterns: [
        /recherche.{0,120}architecte/i,
        /alternance.{0,120}architecte/i,
      ],
    },
    {
      role: "Graphiste / Designer",
      patterns: [
        /recherche.{0,120}(graphiste|designer)/i,
        /alternance.{0,120}(graphiste|designer)/i,
      ],
    },
    {
      role: "Chargee de communication",
      patterns: [
        /recherche.{0,120}communication/i,
        /alternance.{0,120}communication/i,
      ],
    },
  ];

  const matchedPriorityRole = priorityRoleSignals.find((entry) =>
    entry.patterns.some((pattern) => pattern.test(normalized)),
  );

  if (matchedPriorityRole) {
    return matchedPriorityRole.role;
  }

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

  const targetLine = lines.find((line) => {
    const lowered = normalizeText(line);
    return (
      lowered.includes("recherche") ||
      lowered.includes("alternance") ||
      lowered.includes("objectif") ||
      lowered.includes("a propos")
    );
  });

  if (targetLine) {
    const lowered = normalizeText(targetLine);
    if (lowered.includes("charge") && lowered.includes("affaires")) {
      return "Charge d'affaires";
    }
    if (lowered.includes("architecte")) {
      return "Architecte d'interieur";
    }
    if (lowered.includes("designer") || lowered.includes("graphiste")) {
      return "Graphiste / Designer";
    }
  }

  const matchingLine = lines.find((line) => {
    const lowered = normalizeText(line);
    return ROLE_HINT_WORDS.some((word) => lowered.includes(word));
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

function pickSkills(text: string, aliases: Record<string, string[]>) {
  const normalized = normalizeText(text);

  const hits = Object.entries(aliases)
    .map(([label, values]) => ({
      label,
      score: values.reduce((count, value) => {
        const alias = normalizeText(value);
        return normalized.includes(alias) ? count + Math.max(1, Math.floor(alias.length / 4)) : count;
      }, 0),
    }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((entry) => entry.label);

  return unique(hits);
}

function looksLikeKeywordPart(part: string) {
  const cleaned = cleanKeywordCandidate(part);
  const normalized = normalizeText(cleaned).replace(/\s*:\s*$/, "");

  if (normalized.length < 4 || normalized.length > 40) return false;
  if (/\d/.test(normalized)) return false;
  if (normalized.includes("@") || normalized.includes("http")) return false;
  if (cleaned.endsWith(":")) return false;
  if (KEYWORD_STOPWORDS.has(normalized)) return false;
  if (isLikelySectionLabel(cleaned)) return false;
  if (normalized.includes("langue maternelle")) return false;
  if (normalized.includes("niveau")) return false;
  if (normalized.includes("permis")) return false;
  if (normalized.includes("vehicule")) return false;
  if (normalized.includes("disponibilite")) return false;
  if (normalized.includes("rythme")) return false;
  if (normalized.includes("contrat")) return false;
  if (normalized.includes("college")) return false;
  if (normalized.includes("lycee")) return false;
  if (normalized.includes("universite")) return false;
  if (normalized.includes("faculte")) return false;
  if (normalized.includes("bachelor")) return false;
  if (normalized.includes("baccalaureat")) return false;

  const wordCount = normalized.split(/\s+/).length;
  if (wordCount > 4) return false;

  return true;
}

function pickGenericKeywords(lines: string[], detectedRole: string, summary: string) {
  const rawParts = [
    detectedRole,
    ...lines.flatMap((line) =>
      line
        .split(/[•,;/|]/)
        .map((part) => part.trim())
        .filter(Boolean),
    ),
    ...summary.split(/[,.]/).map((part) => part.trim()),
  ];

  const filtered = rawParts.filter(looksLikeKeywordPart);

  return unique(
    filtered
      .map(cleanKeywordCandidate)
      .filter((part) => {
        const normalized = normalizeText(part);
        return (
          normalized !== normalizeText(importedProfileDefaults.fullName) &&
          normalized !== normalizeText(detectedRole) &&
          !isLikelySectionLabel(part)
        );
      }),
  ).slice(0, 8);
}

function looksLikeEducationLine(line: string) {
  const normalized = normalizeText(line);

  return (
    normalized.includes("brevet") ||
    normalized.includes("baccalaureat") ||
    normalized.includes("bac ") ||
    normalized.includes("bac+") ||
    normalized.includes("college") ||
    normalized.includes("lycee") ||
    normalized.includes("universite") ||
    normalized.includes("faculte") ||
    normalized.includes("master") ||
    normalized.includes("licence") ||
    normalized.includes("bts") ||
    normalized.includes("dut") ||
    normalized.includes("formation") ||
    normalized.includes("diplome")
  );
}

function looksLikeWeakExperienceLine(line: string) {
  const normalized = normalizeText(line);
  const wordCount = cleanKeywordCandidate(line).split(/\s+/).filter(Boolean).length;

  if (wordCount < 5) return true;
  if (isLikelySectionLabel(line)) return true;
  if (looksLikeEducationLine(line)) return true;
  if (/^\d{4}\s*[-/]\s*\d{4}$/.test(normalized)) return true;
  if (/^\d{4}$/.test(normalized)) return true;
  if (/^[a-z\s]+20\d{2}\s*-\s*20\d{2}$/.test(normalized)) return true;

  return false;
}

function pickExperienceHighlights(lines: string[]) {
  const highlights = lines.filter(
    (line) =>
      /\b(20\d{2}|19\d{2})\b/.test(line) ||
      line.startsWith("-") ||
      line.startsWith("*") ||
      /experience|expérience|stage|alternance|poste|mission|projet/i.test(line),
  );

  const cleaned = highlights
    .map((line) => line.replace(/^[-*]\s*/, "").trim())
    .filter((line) => line.length >= 25)
    .filter((line) => !looksLikeWeakExperienceLine(line))
    .filter((line) => {
      const normalized = normalizeText(line);
      return (
        !normalized.includes("esprit d'equipe et sens du service2019") &&
        !normalized.includes("brevets des colleges")
      );
    })
    .slice(0, 5);

  return unique(cleaned);
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

  const detectedRole = pickRole(cleanedText, lines);
  const summary = pickSummary(lines);
  const technicalSkills = pickSkills(cleanedText, SKILL_ALIASES).slice(0, 10);
  const softSkills = pickSkills(cleanedText, SOFT_SKILL_ALIASES).slice(0, 8);
  const genericKeywords = pickGenericKeywords(lines, detectedRole, summary);

  const preferredKeywords = unique([
    detectedRole,
    ...technicalSkills.slice(0, 4),
    ...(technicalSkills.length > 0 ? [] : genericKeywords.slice(0, 4)),
  ]).slice(0, 6);

  return {
    profileId: null,
    fullName: pickName(lines),
    role: detectedRole,
    targetRole: detectedRole,
    preferredKeywords,
    baseLetterTemplate: "",
    location: pickLocation(cleanedText),
    email: email || importedProfileDefaults.email,
    phone,
    github,
    linkedin,
    summary,
    technicalSkills,
    softSkills,
    experienceHighlights: pickExperienceHighlights(lines),
  };
}
