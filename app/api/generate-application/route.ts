import { NextResponse } from "next/server";
import {
  getActiveCandidateProfile,
  getEffectiveCandidateRole,
  type CandidateProfile,
} from "@/lib/candidate-profile";
import { createSupabaseServerClient } from "@/lib/supabase/server";

interface GeneratePayload {
  jobId?: string;
}

interface JobRow {
  id: string;
  title: string;
  company: string;
  location: string;
  contract: string;
  source: string;
  job_description: string | null;
}

interface ExistingApplicationRow {
  id: string;
}

const CANDIDATE_SKILL_ALIASES: Record<string, string[]> = {
  "Node.js": ["node", "nodejs", "backend", "api", "rest", "express"],
  FastAPI: ["fastapi", "python api"],
  React: ["react", "frontend", "front", "reactjs"],
  "Tailwind CSS": ["tailwind", "css", "ui", "responsive"],
  TypeScript: ["typescript", "ts", "javascript", "js"],
  "Python (pandas, NumPy)": ["python", "pandas", "numpy", "data", "etl"],
  MySQL: ["mysql", "sql", "database", "postgres"],
  Git: ["git", "versioning", "github"],
  "GitHub Actions": ["github actions", "ci", "cd", "pipeline"],
};

function toAsciiLower(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function compactText(value: string | null | undefined) {
  if (!value) return "";
  return value.replace(/\s+/g, " ").trim();
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

function getFallbackSkillsByRole(job: JobRow) {
  const title = toAsciiLower(job.title);
  const description = toAsciiLower(job.job_description || "");
  const haystack = `${title} ${description}`;

  if (haystack.includes("python") || haystack.includes("data")) {
    return ["Python (pandas, NumPy)", "FastAPI", "MySQL", "Git"];
  }
  if (haystack.includes("front") || haystack.includes("react") || haystack.includes("ui")) {
    return ["React", "TypeScript", "Tailwind CSS", "Git"];
  }
  if (haystack.includes("backend") || haystack.includes("api") || haystack.includes("node")) {
    return ["Node.js", "FastAPI", "MySQL", "Git"];
  }

  return ["React", "Node.js", "TypeScript", "MySQL"];
}

function buildGenericProfileHighlights(candidateProfile: CandidateProfile) {
  const profileSignals = [
    ...candidateProfile.technicalSkills,
    candidateProfile.role,
    ...candidateProfile.experienceHighlights.map((item) => item.split(/[.:]/)[0]?.trim() || item),
  ]
    .map((item) => item.trim())
    .filter(Boolean);

  return profileSignals.filter((item, index, array) => array.indexOf(item) === index).slice(0, 4);
}

function pickMissionSnippet(description: string | null) {
  const clean = compactText(description);
  if (!clean) return "";

  const parts = clean.split(/[.!?]/).map((item) => item.trim()).filter(Boolean);
  if (!parts.length) return "";

  return parts[0].slice(0, 220);
}

function pickRelevantSkills(job: JobRow, candidateProfile: CandidateProfile) {
  const titleText = toAsciiLower(job.title);
  const descriptionText = toAsciiLower(job.job_description || "");
  const fullText = `${titleText} ${toAsciiLower(job.contract)} ${descriptionText}`;

  const scored = candidateProfile.technicalSkills.map((skill) => {
    const aliases = CANDIDATE_SKILL_ALIASES[skill] ?? [toAsciiLower(skill)];
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

  if (matched.length >= 2) {
    return matched.slice(0, 4);
  }

  const fallbackSkills =
    candidateProfile.technicalSkills.length > 0
      ? candidateProfile.technicalSkills.slice(0, 4)
      : buildGenericProfileHighlights(candidateProfile);
  const combined = [...matched, ...fallbackSkills].filter(
    (skill, index, array) => array.indexOf(skill) === index,
  );
  if (combined.length > 0) {
    return combined.slice(0, 4);
  }

  return getFallbackSkillsByRole(job).slice(0, 4);
}

function buildLetter(job: JobRow, candidateProfile: CandidateProfile) {
  const mission = pickMissionSnippet(job.job_description);
  const relevantSkills = pickRelevantSkills(job, candidateProfile);

  return `Objet: Candidature - ${job.title}

Bonjour,

Je vous adresse ma candidature pour le poste de ${job.title} chez ${job.company} (${job.location}).
${candidateProfile.summary}

${mission ? `Votre annonce met en avant les enjeux suivants: ${mission}.` : "Votre offre correspond a mon projet de contribuer rapidement sur des missions concretes et utiles."}

Pour ce poste en ${job.contract.toLowerCase()}, je peux apporter en priorite:
- ${relevantSkills.join("\n- ")}

Je souhaite vous apporter une execution fiable, une communication claire et une forte capacite d'adaptation.

Je reste disponible pour echanger sur vos besoins.

Cordialement,
${candidateProfile.fullName}
${candidateProfile.email}
${candidateProfile.phone}`;
}

function buildEmail(job: JobRow, candidateProfile: CandidateProfile) {
  const mission = pickMissionSnippet(job.job_description);
  const relevantSkills = pickRelevantSkills(job, candidateProfile);
  const effectiveRole = getEffectiveCandidateRole(candidateProfile);

  return `Bonjour equipe ${job.company},

Je vous contacte concernant votre offre "${job.title}" (${job.location}) vue sur ${job.source}.

${mission ? `J'ai bien note votre besoin: ${mission}.` : "Je suis interesse par votre besoin sur ce poste."}

Profil rapide:
- ${effectiveRole}
- Competences les plus pertinentes: ${relevantSkills.join(", ")}
- Points forts: ${buildGenericProfileHighlights(candidateProfile).slice(0, 2).join(", ") || candidateProfile.summary}

Si le poste est toujours ouvert, je serai ravi d'echanger avec vous.

Bien a vous,
${candidateProfile.fullName}
${candidateProfile.linkedin}
${candidateProfile.github}`;
}

function buildLinkedIn(job: JobRow, candidateProfile: CandidateProfile) {
  const relevantSkills = pickRelevantSkills(job, candidateProfile).slice(0, 2).join("/");
  return `Bonjour, je me permets de vous contacter pour le poste ${job.title} chez ${job.company}. Je suis ${getEffectiveCandidateRole(candidateProfile).toLowerCase()} et je peux contribuer rapidement sur ${relevantSkills || "les priorites du poste"}. Seriez-vous disponible pour un court echange ?`;
}

export async function POST(request: Request) {
  const payload = (await request.json().catch(() => ({}))) as GeneratePayload;
  const jobId = payload.jobId;

  if (!jobId) {
    return NextResponse.json({ ok: false, error: "jobId est requis." }, { status: 400 });
  }

  const supabase = createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json(
      { ok: false, error: "Supabase non configuré côté serveur." },
      { status: 500 },
    );
  }

  const jobsTable = supabase.from("jobs");
  const applicationsTable = supabase.from("applications");

  const { data: jobData, error: jobError } = await jobsTable
    .select("id,title,company,location,contract,source,job_description")
    .eq("id", jobId)
    .maybeSingle();

  if (jobError) {
    return NextResponse.json(
      { ok: false, error: `Impossible de lire l'offre: ${jobError.message}` },
      { status: 500 },
    );
  }

  if (!jobData) {
    return NextResponse.json({ ok: false, error: "Offre introuvable." }, { status: 404 });
  }

  const job = jobData as JobRow;
  const candidateProfile = await getActiveCandidateProfile();
  const letterText = buildLetter(job, candidateProfile);
  const emailText = buildEmail(job, candidateProfile);
  const linkedInText = buildLinkedIn(job, candidateProfile);

  const { data: existingAppData, error: existingAppError } = await applicationsTable
    .select("id")
    .eq("job_id", jobId)
    .maybeSingle();

  if (existingAppError) {
    return NextResponse.json(
      { ok: false, error: `Impossible de lire la candidature existante: ${existingAppError.message}` },
      { status: 500 },
    );
  }

  const existingApp = (existingAppData as ExistingApplicationRow | null) ?? null;

  if (existingApp) {
    const updatePayload = {
      status: "À valider",
      letter_generated: true,
      email_generated: true,
      linkedin_generated: true,
      letter_text: letterText,
      email_text: emailText,
      linkedin_text: linkedInText,
      updated_at: new Date().toISOString(),
    };

    const { error: updateError } = await applicationsTable
      .update(updatePayload as never)
      .eq("id", existingApp.id);

    if (updateError) {
      return NextResponse.json(
        { ok: false, error: `Echec de la mise à jour: ${updateError.message}` },
        { status: 500 },
      );
    }
  } else {
    const insertPayload = {
      id: crypto.randomUUID(),
      job_id: jobId,
      status: "À valider",
      letter_generated: true,
      email_generated: true,
      linkedin_generated: true,
      letter_text: letterText,
      email_text: emailText,
      linkedin_text: linkedInText,
    };

    const { error: insertError } = await applicationsTable.insert(insertPayload as never);

    if (insertError) {
      return NextResponse.json(
        { ok: false, error: `Echec de la création: ${insertError.message}` },
        { status: 500 },
      );
    }
  }

  const { error: jobStatusError } = await jobsTable
    .update({ status: "À valider" } as never)
    .eq("id", jobId);

  if (jobStatusError) {
    return NextResponse.json(
      {
        ok: true,
        warning: `Candidature générée mais statut job non mis à jour: ${jobStatusError.message}`,
        letterText,
        emailText,
        linkedInText,
      },
      { status: 200 },
    );
  }

  return NextResponse.json({
    ok: true,
    message: "Candidature générée avec succès.",
    letterText,
    emailText,
    linkedInText,
  });
}
