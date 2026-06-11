function toAsciiLower(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function compactText(value) {
  if (!value) return "";
  return String(value).replace(/\s+/g, " ").trim();
}

function sentenceCase(value) {
  const text = compactText(value);
  if (!text) return "";
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function unique(values) {
  return values.filter((value, index) => value && values.indexOf(value) === index);
}

function countKeywordHits(text, keyword) {
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

function splitSentences(value) {
  return compactText(value)
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function splitParagraphs(value) {
  return String(value || "")
    .split(/\n\s*\n/)
    .map((paragraph) => compactText(paragraph))
    .filter(Boolean);
}

function tokenize(value) {
  return unique(
    toAsciiLower(value)
      .split(/[^a-z0-9]+/)
      .map((item) => item.trim())
      .filter((item) => item.length >= 3),
  );
}

const SKILL_ALIASES = {
  "Node.js": ["node", "nodejs", "backend", "api", "express"],
  FastAPI: ["fastapi", "python api", "backend python"],
  React: ["react", "frontend", "front", "reactjs", "interface"],
  "Tailwind CSS": ["tailwind", "css", "ui", "responsive"],
  TypeScript: ["typescript", "ts", "javascript", "js"],
  "Python (pandas, NumPy)": ["python", "pandas", "numpy", "data"],
  MySQL: ["mysql", "sql", "database", "postgres"],
  Git: ["git", "github", "versioning"],
  "GitHub Actions": ["github actions", "ci", "cd", "pipeline"],
  "Pilotage de projet": ["pilotage", "projet", "coordination", "planning"],
  "Relation client": ["client", "commercial", "relation client", "besoins"],
  "Presentation de plans": ["plans", "presentation", "amenagement", "agencement"],
  Coordination: ["coordination", "organisation", "suivi"],
};

function pickMissionSentences(description) {
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

function buildJobKeywordSet(job) {
  const description = compactText(job.job_description);
  const missionSentences = pickMissionSentences(description);
  return unique([
    ...tokenize(job.title),
    ...tokenize(job.contract),
    ...tokenize(description),
    ...missionSentences.flatMap((sentence) => tokenize(sentence)),
  ]);
}

function pickRelevantSkills(job, candidateProfile) {
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

function pickRelevantHighlights(job, candidateProfile) {
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

function buildValueAngles(job, candidateProfile, relevantSkills, relevantHighlights) {
  const titleLower = toAsciiLower(job.title);
  const descriptionLower = toAsciiLower(job.job_description || "");
  const base = [];

  if (relevantHighlights[0]) {
    base.push(`Une experience directement utile sur ${sentenceCase(relevantHighlights[0])}.`);
  }

  if (relevantSkills.length > 0) {
    base.push(`Des points d'appui concrets sur ${relevantSkills.slice(0, 3).join(", ")}.`);
  }

  if (descriptionLower.includes("client") || titleLower.includes("charge d'affaires")) {
    base.push("Une capacite a comprendre le besoin client, structurer les priorites et faire avancer le projet.");
  }

  if (
    descriptionLower.includes("communication") ||
    descriptionLower.includes("social") ||
    descriptionLower.includes("story") ||
    titleLower.includes("communication")
  ) {
    base.push("Une communication claire, un vrai soin apporte au contenu et une execution rigoureuse des livrables.");
  }

  if (
    descriptionLower.includes("plan") ||
    descriptionLower.includes("agencement") ||
    descriptionLower.includes("amenagement") ||
    descriptionLower.includes("chantier")
  ) {
    base.push("Une approche concrete du terrain, avec lecture des contraintes, coordination et suivi des actions.");
  }

  if (candidateProfile.softSkills?.length) {
    base.push(`Des soft skills coherents avec le poste: ${candidateProfile.softSkills.slice(0, 2).join(", ")}.`);
  }

  return unique(base).slice(0, 3);
}

function pickTemplateParagraphs(candidateProfile) {
  const template = candidateProfile.baseLetterTemplate || "";
  if (!template.trim()) {
    return [];
  }

  return splitParagraphs(template)
    .filter((paragraph) => !/^objet\s*:/i.test(paragraph))
    .filter((paragraph) => !/^bonjour[,]?\s*$/i.test(paragraph))
    .filter((paragraph) => !/^cordialement[,]?\s*$/i.test(paragraph))
    .filter((paragraph) => !paragraph.includes(candidateProfile.email || ""))
    .filter((paragraph) => !paragraph.includes(candidateProfile.fullName || ""))
    .slice(0, 3);
}

function pickTemplateClosing(candidateProfile) {
  const template = candidateProfile.baseLetterTemplate || "";
  const paragraphs = splitParagraphs(template);
  const closingParagraph = paragraphs.find((paragraph) => /cordialement|bien a vous|sincerement/i.test(paragraph));
  return closingParagraph || "Cordialement,";
}

function getContractProfile(contract) {
  const normalized = toAsciiLower(contract);

  if (normalized.includes("alternance")) {
    return {
      label: "alternance",
      intro:
        "Je recherche une alternance qui me permette de monter progressivement en responsabilite tout en contribuant concretement aux projets.",
      mission:
        "J'apprecie particulierement les environnements ou l'on peut apprendre vite, gagner en autonomie et etre utile a l'equipe des les premieres semaines.",
      closing:
        "Je serais ravi d'echanger avec vous sur la maniere dont je pourrais m'investir durablement dans cette alternance.",
    };
  }

  if (normalized.includes("stage")) {
    return {
      label: "stage",
      intro:
        "Je recherche un stage formateur qui me permette d'apprendre sur des cas concrets tout en apportant une contribution serieuse a l'equipe.",
      mission:
        "Ce type de poste correspond bien a ce que je cherche aujourd'hui: un cadre formateur pour developper rapidement de bons reflexes professionnels.",
      closing:
        "Je serais ravi d'echanger avec vous pour voir comment je pourrais apprendre vite et contribuer utilement pendant ce stage.",
    };
  }

  return {
    label: "cdi",
    intro:
      "Je recherche un poste durable dans lequel je peux m'investir avec constance, prendre mes responsabilites et contribuer concretement aux resultats.",
    mission:
      "Je suis particulierement motive par les postes ou l'on attend de la fiabilite, du suivi et une implication reelle dans la duree.",
    closing:
      "Je serais ravi d'echanger avec vous pour voir comment je pourrais contribuer efficacement a vos objectifs.",
  };
}

export function buildApplicationContext(job, candidateProfile) {
  const missionSentences = pickMissionSentences(job.job_description || "");
  const missionsSummary = missionSentences.join(" ");
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

export function buildLetter(job, candidateProfile) {
  const context = buildApplicationContext(job, candidateProfile);
  const effectiveRole =
    candidateProfile.targetRole?.trim() || candidateProfile.role?.trim() || "candidat";
  const templateParagraphs = pickTemplateParagraphs(candidateProfile);
  const templateClosing = pickTemplateClosing(candidateProfile);
  const contractProfile = getContractProfile(job.contract);
  const introParagraph = `Je vous adresse ma candidature pour le poste de ${job.title} chez ${job.company} (${job.location}). Je candidate sur ce poste car il s'inscrit directement dans mon projet en tant que ${effectiveRole.toLowerCase()}.`;
  const profileParagraph = candidateProfile.summary;
  const missionParagraph = context.missionsSummary
    ? `Votre offre retient particulierement mon attention car elle met en avant ${context.missionsSummary.toLowerCase()}`
    : "Votre offre retient mon attention car elle demande de la fiabilite, de l'implication et une vraie capacite d'adaptation.";
  const strengthsParagraph = [
    context.valueAngles[0],
    context.valueAngles[1],
    context.relevantSkills.length
      ? `Je pourrais m'appuyer en priorite sur ${context.relevantSkills.join(", ")}.`
      : "",
    context.relevantHighlights.length
      ? `Cette candidature s'appuie aussi sur des experiences comme ${context.relevantHighlights.join(" ")}`
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
    `Objet: Candidature - ${job.title}`,
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

export function buildEmail(job, candidateProfile) {
  const context = buildApplicationContext(job, candidateProfile);
  const effectiveRole =
    candidateProfile.targetRole?.trim() || candidateProfile.role?.trim() || "candidat";
  const contractProfile = getContractProfile(job.contract);

  return `Bonjour,

Je vous contacte au sujet de votre offre "${job.title}" chez ${job.company} (${job.location}), vue sur ${job.source}.

${
    job.contract
      ? `Ce poste en ${contractProfile.label} correspond bien a ma recherche actuelle.`
      : ""
  }

${
    context.missionsSummary
      ? `J'ai bien note des priorites comme ${context.missionsSummary.toLowerCase()}`
      : "Le poste correspond a un besoin concret sur lequel je pense pouvoir etre rapidement utile."
  }

${contractProfile.intro}

Je suis ${effectiveRole.toLowerCase()} et je pense pouvoir apporter:
- ${context.valueAngles.join("\n- ")}

${
    context.relevantSkills.length
      ? `Competences les plus pertinentes: ${context.relevantSkills.join(", ")}.`
      : ""
  }

Si le poste est toujours ouvert, je serais ravi d'echanger avec vous.

Bien a vous,
${candidateProfile.fullName}
${candidateProfile.email}`.trim();
}

export function buildLinkedIn(job, candidateProfile) {
  const context = buildApplicationContext(job, candidateProfile);
  const effectiveRole =
    candidateProfile.targetRole?.trim() || candidateProfile.role?.trim() || "candidat";
  const contractProfile = getContractProfile(job.contract);
  const firstAngle = context.valueAngles[0] || "les priorites du poste";

  return `Bonjour, je me permets de vous contacter pour le poste ${job.title} chez ${job.company}. Je recherche actuellement une ${contractProfile.label} coherente avec mon projet, je suis ${effectiveRole.toLowerCase()} et je pense pouvoir etre utile notamment sur ${firstAngle.toLowerCase()}. Seriez-vous disponible pour un court echange ?`;
}
