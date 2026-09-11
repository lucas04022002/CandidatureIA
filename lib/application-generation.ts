import type { CandidateProfile } from "@/lib/candidate-profile";
import { sanitizeJobDescription } from "@/lib/sanitize-text";

export interface JobForGeneration {
  title: string;
  company: string;
  location: string;
  contract: string;
  source: string;
  job_description: string | null;
}

export interface GeneratedApplicationTexts {
  letterText: string;
  emailText: string;
  linkedInText: string;
  source: "heuristic";
}

function toAsciiLower(value: unknown) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function compactText(value: unknown) {
  if (!value) return "";
  return String(value).replace(/\s+/g, " ").trim();
}

// Les descriptions déjà en base peuvent contenir du HTML brut: on les nettoie
// systématiquement avant toute utilisation.
function normalizeJobForGeneration(job: JobForGeneration): JobForGeneration {
  return { ...job, job_description: sanitizeJobDescription(job.job_description) };
}

function truncateText(value: string, maxLength: number) {
  const text = compactText(value);
  if (text.length <= maxLength) return text;
  const cut = text.slice(0, maxLength);
  const lastSpace = cut.lastIndexOf(" ");
  return `${cut.slice(0, lastSpace > maxLength * 0.6 ? lastSpace : maxLength)}…`;
}

function unique<T>(values: T[]) {
  return values.filter((value, index) => value && values.indexOf(value) === index);
}

function countKeywordHits(text: string, keyword: string) {
  if (!keyword) return 0;
  let count = 0;
  let start = 0;

  while (true) {
    const index = text.indexOf(keyword, start);
    if (index === -1) break;
    count += 1;
    start = index + keyword.length;
  }

  return count;
}

function splitSentences(value: string) {
  return compactText(value)
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function splitParagraphs(value: string) {
  return String(value || "")
    .split(/\n\s*\n/)
    .map((paragraph) => compactText(paragraph))
    .filter(Boolean);
}

function tokenize(value: string) {
  return unique(
    toAsciiLower(value)
      .split(/[^a-z0-9]+/)
      .map((item) => item.trim())
      .filter((item) => item.length >= 3),
  );
}

// Alias génériques pour rapprocher des intitulés de compétences des mots de l'offre.
const SKILL_ALIASES: Record<string, string[]> = {
  "Node.js": ["node", "nodejs", "backend", "api", "express"],
  FastAPI: ["fastapi", "python api", "backend python"],
  React: ["react", "frontend", "front", "reactjs", "interface"],
  "Tailwind CSS": ["tailwind", "css", "ui", "responsive"],
  TypeScript: ["typescript", "ts", "javascript", "js"],
  MySQL: ["mysql", "sql", "database", "postgres"],
  Git: ["git", "github", "versioning"],
};

function pickMissionSentences(description: string) {
  const sentences = splitSentences(description);
  if (!sentences.length) return [];

  const priorityTerms = [
    "mission",
    "role",
    "poste",
    "responsab",
    "coord",
    "suivi",
    "client",
    "content",
    "social",
    "story",
    "plan",
    "chantier",
    "projet",
    "marketing",
    "communication",
  ];

  const scored = sentences.map((sentence, index) => {
    const normalized = toAsciiLower(sentence);
    const score = priorityTerms.reduce(
      (sum, term) => sum + (normalized.includes(term) ? 3 : 0),
      0,
    ) + Math.max(0, 2 - index);

    return { sentence, score };
  });

  return scored
    .sort((a, b) => b.score - a.score)
    .map((item) => item.sentence)
    .filter((sentence, index, array) => array.indexOf(sentence) === index)
    .slice(0, 2);
}

function buildJobKeywordSet(job: JobForGeneration) {
  const description = compactText(job.job_description);
  const missionSentences = pickMissionSentences(description);
  return unique([
    ...tokenize(job.title),
    ...tokenize(job.contract),
    ...tokenize(description),
    ...missionSentences.flatMap((sentence) => tokenize(sentence)),
  ]);
}

function pickRelevantSkills(job: JobForGeneration, candidateProfile: CandidateProfile) {
  const titleText = toAsciiLower(job.title);
  const descriptionText = toAsciiLower(job.job_description || "");
  const fullText = `${titleText} ${toAsciiLower(job.contract)} ${descriptionText}`;

  const scored = (candidateProfile.technicalSkills || []).map((skill) => {
    const aliases = SKILL_ALIASES[skill] || [toAsciiLower(skill)];
    const score = aliases.reduce((sum, alias) => {
      const normalizedAlias = toAsciiLower(alias);
      const titleHits = countKeywordHits(titleText, normalizedAlias);
      const fullHits = countKeywordHits(fullText, normalizedAlias);
      return sum + titleHits * 3 + fullHits;
    }, 0);

    return { skill, score };
  });

  const matched = scored
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((item) => item.skill);

  const fallback = unique([
    ...matched,
    ...(candidateProfile.technicalSkills || []),
    ...(candidateProfile.softSkills || []),
  ]);

  return fallback.slice(0, 4);
}

function pickRelevantHighlights(job: JobForGeneration, candidateProfile: CandidateProfile) {
  const jobKeywords = buildJobKeywordSet(job);
  const highlights = candidateProfile.experienceHighlights || [];

  const scored = highlights.map((highlight) => {
    const haystack = toAsciiLower(highlight);
    const score = jobKeywords.reduce(
      (sum, keyword) => sum + (haystack.includes(keyword) ? (keyword.length > 6 ? 3 : 2) : 0),
      0,
    );

    return { highlight, score };
  });

  const matched = scored
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((item) => item.highlight);

  return matched.slice(0, 2);
}

function buildValueAngles(
  job: JobForGeneration,
  candidateProfile: CandidateProfile,
  relevantSkills: string[],
  relevantHighlights: string[],
) {
  const titleLower = toAsciiLower(job.title);
  const descriptionLower = toAsciiLower(job.job_description || "");
  const base: string[] = [];

  if (relevantHighlights[0]) {
    base.push(
      `une expérience directement utile : ${compactText(relevantHighlights[0]).replace(/\.$/, "")}`,
    );
  }

  if (relevantSkills.length > 0) {
    base.push(`des points d'appui concrets sur ${relevantSkills.slice(0, 3).join(", ")}`);
  }

  if (descriptionLower.includes("client") || titleLower.includes("charge d'affaires")) {
    base.push("une capacité à comprendre le besoin client, structurer les priorités et faire avancer le projet");
  }

  if (
    descriptionLower.includes("communication") ||
    descriptionLower.includes("social") ||
    descriptionLower.includes("story") ||
    titleLower.includes("communication")
  ) {
    base.push("une communication claire, un vrai soin apporté au contenu et une exécution rigoureuse des livrables");
  }

  if (
    descriptionLower.includes("plan") ||
    descriptionLower.includes("agencement") ||
    descriptionLower.includes("amenagement") ||
    descriptionLower.includes("chantier")
  ) {
    base.push("une approche concrète du terrain, avec lecture des contraintes, coordination et suivi des actions");
  }

  if (candidateProfile.softSkills?.length) {
    base.push(`des soft skills cohérents avec le poste : ${candidateProfile.softSkills.slice(0, 2).join(", ")}`);
  }

  return unique(base).slice(0, 3);
}

function pickTemplateParagraphs(candidateProfile: CandidateProfile) {
  const template = candidateProfile.baseLetterTemplate || "";
  if (!template.trim()) {
    return [];
  }

  return splitParagraphs(template)
    .filter((paragraph) => !/^objet\s*:/i.test(paragraph))
    .filter((paragraph) => !/^bonjour[,]?\s*$/i.test(paragraph))
    .filter((paragraph) => !/^cordialement[,]?\s*$/i.test(paragraph))
    .filter((paragraph) => !candidateProfile.email || !paragraph.includes(candidateProfile.email))
    .filter((paragraph) => !candidateProfile.fullName || !paragraph.includes(candidateProfile.fullName))
    .slice(0, 3);
}

function pickTemplateClosing(candidateProfile: CandidateProfile) {
  const template = candidateProfile.baseLetterTemplate || "";
  const paragraphs = splitParagraphs(template);
  const closingParagraph = paragraphs.find((paragraph) =>
    /cordialement|bien a vous|bien à vous|sincerement|sincèrement/i.test(paragraph),
  );
  return closingParagraph || "Cordialement,";
}

interface ContractProfile {
  label: string;
  article: "un" | "une";
  intro: string;
  mission: string;
  closing: string;
}

function getContractProfile(contract: string): ContractProfile {
  const normalized = toAsciiLower(contract);

  if (normalized.includes("alternance")) {
    return {
      label: "alternance",
      article: "une",
      intro:
        "Je recherche une alternance qui me permette de monter progressivement en responsabilité tout en contribuant concrètement aux projets.",
      mission:
        "J'apprécie particulièrement les environnements où l'on peut apprendre vite, gagner en autonomie et être utile à l'équipe dès les premières semaines.",
      closing:
        "Je serais ravi d'échanger avec vous sur la manière dont je pourrais m'investir durablement dans cette alternance.",
    };
  }

  if (normalized.includes("stage")) {
    return {
      label: "stage",
      article: "un",
      intro:
        "Je recherche un stage formateur qui me permette d'apprendre sur des cas concrets tout en apportant une contribution sérieuse à l'équipe.",
      mission:
        "Ce type de poste correspond bien à ce que je cherche aujourd'hui : un cadre formateur pour développer rapidement de bons réflexes professionnels.",
      closing:
        "Je serais ravi d'échanger avec vous pour voir comment je pourrais apprendre vite et contribuer utilement pendant ce stage.",
    };
  }

  return {
    label: "poste en CDI",
    article: "un",
    intro:
      "Je recherche un poste durable dans lequel je peux m'investir avec constance, prendre mes responsabilités et contribuer concrètement aux résultats.",
    mission:
      "Je suis particulièrement motivé par les postes où l'on attend de la fiabilité, du suivi et une implication réelle dans la durée.",
    closing:
      "Je serais ravi d'échanger avec vous pour voir comment je pourrais contribuer efficacement à vos objectifs.",
  };
}

export function buildApplicationContext(
  rawJob: JobForGeneration,
  candidateProfile: CandidateProfile,
) {
  const job = normalizeJobForGeneration(rawJob);
  const missionSentences = pickMissionSentences(job.job_description || "");
  const missionsSummary = truncateText(missionSentences.join(" "), 240);
  const relevantSkills = pickRelevantSkills(job, candidateProfile);
  const relevantHighlights = pickRelevantHighlights(job, candidateProfile);
  const valueAngles = buildValueAngles(job, candidateProfile, relevantSkills, relevantHighlights);

  return {
    missionsSummary,
    relevantSkills,
    relevantHighlights,
    valueAngles,
  };
}

function getEffectiveRole(candidateProfile: CandidateProfile) {
  return candidateProfile.targetRole?.trim() || candidateProfile.role?.trim() || "candidat";
}

export function buildLetter(job: JobForGeneration, candidateProfile: CandidateProfile) {
  const context = buildApplicationContext(job, candidateProfile);
  const effectiveRole = getEffectiveRole(candidateProfile);
  const templateParagraphs = pickTemplateParagraphs(candidateProfile);
  const templateClosing = pickTemplateClosing(candidateProfile);
  const contractProfile = getContractProfile(job.contract);
  const introParagraph = `Je vous adresse ma candidature pour le poste de ${job.title} chez ${job.company} (${job.location}). Ce poste s'inscrit directement dans mon projet professionnel de ${effectiveRole.toLowerCase()}.`;
  const profileParagraph = candidateProfile.summary;
  const missionParagraph = context.missionsSummary
    ? `Votre offre retient particulièrement mon attention, notamment sur ces points : « ${context.missionsSummary} »`
    : "Votre offre retient mon attention car elle demande de la fiabilité, de l'implication et une vraie capacité d'adaptation.";
  const extraHighlights = context.relevantHighlights.slice(1);
  const strengthsParagraph = [
    context.valueAngles.length
      ? `Je pense pouvoir vous apporter : ${context.valueAngles.join(" ; ")}.`
      : "",
    extraHighlights.length
      ? `Cette candidature s'appuie aussi sur des expériences comme : ${extraHighlights.join(" ")}`
      : "",
  ]
    .filter(Boolean)
    .join(" ");
  const closingParagraph = contractProfile.closing;

  const bodyParagraphs = unique([
    introParagraph,
    profileParagraph,
    contractProfile.intro,
    ...templateParagraphs,
    missionParagraph,
    contractProfile.mission,
    strengthsParagraph,
    closingParagraph,
  ]).filter(Boolean);

  return [
    `Objet : Candidature - ${job.title}`,
    "",
    "Bonjour,",
    "",
    ...bodyParagraphs.flatMap((paragraph) => [paragraph, ""]),
    templateClosing,
    candidateProfile.fullName,
    candidateProfile.email,
    candidateProfile.phone || "",
  ]
    .filter((line, index, array) => {
      if (line !== "") return true;
      return array[index - 1] !== "" && array[index + 1] !== "";
    })
    .join("\n")
    .trim();
}

export function buildEmail(job: JobForGeneration, candidateProfile: CandidateProfile) {
  const context = buildApplicationContext(job, candidateProfile);
  const effectiveRole = getEffectiveRole(candidateProfile);
  const contractProfile = getContractProfile(job.contract);

  return `Bonjour,

Je vous contacte au sujet de votre offre "${job.title}" chez ${job.company} (${job.location}), vue sur ${job.source}.

${
    job.contract
      ? `Ce ${contractProfile.label === "poste en CDI" ? contractProfile.label : `poste en ${contractProfile.label}`} correspond bien à ma recherche actuelle.`
      : ""
  }

${
    context.missionsSummary
      ? `J'ai bien noté les priorités mises en avant dans votre annonce : « ${context.missionsSummary} »`
      : "Le poste correspond à un besoin concret sur lequel je pense pouvoir être rapidement utile."
  }

${contractProfile.intro}

Je suis ${effectiveRole.toLowerCase()} et je pense pouvoir apporter :
- ${context.valueAngles.join("\n- ")}

${
    context.relevantSkills.length
      ? `Compétences les plus pertinentes : ${context.relevantSkills.join(", ")}.`
      : ""
  }

Si le poste est toujours ouvert, je serais ravi d'échanger avec vous.

Bien à vous,
${candidateProfile.fullName}
${candidateProfile.email}`
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function buildLinkedIn(job: JobForGeneration, candidateProfile: CandidateProfile) {
  const context = buildApplicationContext(job, candidateProfile);
  const effectiveRole = getEffectiveRole(candidateProfile);
  const contractProfile = getContractProfile(job.contract);
  // Pour LinkedIn, privilégier l'angle compétences, plus court que l'angle expérience.
  const skillsAngle = context.relevantSkills.length
    ? `des points d'appui concrets sur ${context.relevantSkills.slice(0, 3).join(", ")}`
    : null;
  const firstAngle = (skillsAngle || context.valueAngles[0] || "les priorités du poste").replace(
    /\.$/,
    "",
  );

  return `Bonjour, je me permets de vous contacter pour le poste ${job.title} chez ${job.company}. Je recherche actuellement ${contractProfile.article} ${contractProfile.label} cohérent${contractProfile.article === "une" ? "e" : ""} avec mon projet, je suis ${effectiveRole.toLowerCase()} et je pense pouvoir être utile notamment grâce à ${firstAngle}. Seriez-vous disponible pour un court échange ?`;
}

export function generateApplicationTexts(
  job: JobForGeneration,
  candidateProfile: CandidateProfile,
): GeneratedApplicationTexts {
  return {
    letterText: buildLetter(job, candidateProfile),
    emailText: buildEmail(job, candidateProfile),
    linkedInText: buildLinkedIn(job, candidateProfile),
    source: "heuristic",
  };
}
