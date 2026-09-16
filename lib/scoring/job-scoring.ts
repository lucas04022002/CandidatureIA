import type { CandidateProfile } from "@/lib/candidate-profile";
import {
  fallbackCandidateProfile,
  getCandidateSearchKeywords,
  getEffectiveCandidateRole,
} from "@/lib/candidate-profile";

interface JobForScoring {
  title: string;
  company: string;
  location: string;
  contract: string;
  source: string;
  description?: string | null;
}

interface ScoreResult {
  score: number;
  reason: string;
  source: "heuristic";
}

function clampScore(value: number) {
  if (!Number.isFinite(value)) return 50;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function tokenize(value: string) {
  return normalizeText(value)
    .replace(/[^a-z0-9\s/-]/g, " ")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 3);
}

function unique<T>(values: T[]) {
  return values.filter((value, index) => values.indexOf(value) === index);
}

function compactText(value: string | null | undefined) {
  if (!value) return "";
  return value.replace(/\s+/g, " ").trim();
}

function pickCandidateKeywords(candidateProfile: CandidateProfile) {
  const sources = [
    getEffectiveCandidateRole(candidateProfile),
    ...getCandidateSearchKeywords(candidateProfile),
    candidateProfile.summary,
    ...candidateProfile.technicalSkills,
    ...candidateProfile.softSkills,
    ...candidateProfile.experienceHighlights,
  ];

  return unique(
    sources.flatMap((value) => tokenize(value)).filter((token) => token.length >= 4),
  );
}

function pickRoleKeywords(role: string) {
  return unique(tokenize(role).filter((token) => token !== "profil" && token !== "candidat"));
}

function countMatches(text: string, keywords: string[]) {
  if (!keywords.length) return 0;
  return keywords.reduce((count, keyword) => (text.includes(keyword) ? count + 1 : count), 0);
}

function inferSeniority(text: string) {
  if (text.includes("senior") || text.includes("expert") || text.includes("confirme")) return "senior";
  if (text.includes("junior") || text.includes("debutant")) return "junior";
  if (text.includes("alternance") || text.includes("stage") || text.includes("etudiant")) {
    return "entry";
  }
  return "neutral";
}

function inferCandidateLevel(profile: CandidateProfile) {
  const text = normalizeText(
    `${getEffectiveCandidateRole(profile)} ${profile.summary} ${profile.experienceHighlights.join(" ")}`,
  );

  if (text.includes("senior") || text.includes("expert") || text.includes("confirme")) return "senior";
  if (text.includes("junior") || text.includes("debutant")) return "junior";
  if (text.includes("alternance") || text.includes("stage") || text.includes("etudiant")) return "entry";
  return "neutral";
}

function heuristicScoreForProfile(job: JobForScoring, candidateProfile: CandidateProfile): ScoreResult {
  const description = compactText(job.description);
  const titleText = normalizeText(job.title);
  const locationText = normalizeText(job.location);
  const contractText = normalizeText(job.contract);
  const descriptionText = normalizeText(description);
  const fullText = normalizeText(
    `${job.title} ${job.company} ${job.location} ${job.contract} ${description}`,
  );

  const candidateKeywords = pickCandidateKeywords(candidateProfile);
  const roleKeywords = pickRoleKeywords(getEffectiveCandidateRole(candidateProfile));
  const locationKeywords = pickRoleKeywords(candidateProfile.location);

  const matchedCandidateKeywords = countMatches(fullText, candidateKeywords);
  const matchedRoleKeywords = countMatches(`${titleText} ${descriptionText}`, roleKeywords);
  const matchedLocationKeywords = countMatches(`${locationText} ${descriptionText}`, locationKeywords);

  let score = 35;

  if (candidateKeywords.length > 0) {
    const keywordCoverage = matchedCandidateKeywords / Math.min(candidateKeywords.length, 12);
    score += Math.min(28, keywordCoverage * 32);
  } else {
    score += 8;
  }

  if (roleKeywords.length > 0) {
    score += Math.min(18, matchedRoleKeywords * 6);
  }

  if (description) {
    score += 8;
  }

  if (matchedLocationKeywords > 0) {
    score += 4;
  }

  const candidateLocation = normalizeText(candidateProfile.location);
  if (candidateLocation && candidateLocation !== "non renseigne") {
    if (locationText.includes(candidateLocation)) {
      score += 8;
    } else if (
      candidateLocation.includes("toulouse") &&
      (locationText.includes("toulouse") || locationText.includes("31"))
    ) {
      score += 8;
    } else if (
      candidateLocation.includes("paris") &&
      (locationText.includes("paris") || locationText.includes("75"))
    ) {
      score += 8;
    } else if (
      locationText.includes("teletravail") ||
      locationText.includes("télétravail") ||
      locationText.includes("remote")
    ) {
      score += 5;
    }
  }

  if (contractText.includes("cdi")) score += 6;
  if (contractText.includes("cdd")) score += 2;
  if (contractText.includes("alternance") || contractText.includes("stage")) score -= 4;

  const jobLevel = inferSeniority(`${titleText} ${descriptionText}`);
  const candidateLevel = inferCandidateLevel(candidateProfile);

  if (jobLevel === "senior" && candidateLevel !== "senior") score -= 14;
  if (jobLevel === "junior" && candidateLevel === "junior") score += 8;
  if (jobLevel === "entry" && (candidateLevel === "entry" || candidateLevel === "junior")) score += 6;

  const topSignals = [
    matchedRoleKeywords > 0 ? `${matchedRoleKeywords} mot(s)-role en commun` : null,
    matchedCandidateKeywords > 0 ? `${matchedCandidateKeywords} mot(s)-cle CV trouves` : null,
    candidateLocation && locationText.includes(candidateLocation) ? "localisation compatible" : null,
    contractText.includes("cdi") ? "contrat CDI" : null,
  ].filter(Boolean);

  return {
    score: clampScore(score),
    reason:
      topSignals.length > 0
        ? `Scoring heuristique multi-metier (${topSignals.join(", ")})`
        : "Scoring heuristique multi-metier",
    source: "heuristic",
  };
}

interface ScoreJobOptions {
  candidateProfile?: CandidateProfile;
}

export function scoreJob(job: JobForScoring, options: ScoreJobOptions = {}): ScoreResult {
  const candidateProfile = options.candidateProfile ?? fallbackCandidateProfile;
  return heuristicScoreForProfile(job, candidateProfile);
}
