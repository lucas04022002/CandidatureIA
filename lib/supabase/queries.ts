import { createSupabaseServerClient, hasSupabaseEnv } from "@/lib/supabase/server";
import { fallbackCandidateProfile, importedProfileDefaults } from "@/lib/candidate-profile";
import type { Application, CandidateProfileSummary, DashboardStat, Job } from "@/lib/types";

type DataSource = "supabase";

interface DataResult<T> {
  data: T;
  source: DataSource;
  error?: string;
}

interface CandidateProfileRow {
  id: string;
  full_name: string;
  role: string;
  target_role: string | null;
  preferred_keywords: string[] | null;
  base_letter_template: string | null;
  location: string;
  email: string;
  summary: string;
  technical_skills: string[] | null;
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

interface JobRow {
  id: string;
  title: string;
  company: string;
  location: string;
  contract: string;
  source: string;
  source_labels: string[] | null;
  job_url: string | null;
  job_description: string | null;
  score: number;
  status: Job["status"];
  created_at: string;
}

interface ApplicationRow {
  id: string;
  job_id: string;
  status: Application["status"];
  updated_at: string;
  sent_at: string | null;
  letter_generated: boolean;
  email_generated: boolean;
  linkedin_generated: boolean;
  letter_text: string | null;
  email_text: string | null;
  linkedin_text: string | null;
  followup_email_text: string | null;
  jobs:
    | { title: string; company: string; job_url: string | null; score: number | null }
    | { title: string; company: string; job_url: string | null; score: number | null }[]
    | null;
}

const SUPABASE_QUERY_TIMEOUT_MS = 6000;

async function withTimeout<T>(
  operation: (signal: AbortSignal) => PromiseLike<T>,
  timeoutMs: number,
): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await operation(controller.signal);
  } finally {
    clearTimeout(timeout);
  }
}

function asDateLabel(dateValue: string) {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) {
    return "Date inconnue";
  }
  return date.toLocaleDateString("fr-FR");
}

function asDateTimeLabel(dateValue: string) {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) {
    return "Date inconnue";
  }
  return date.toLocaleString("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function normalizeJobStatus(status: string): Job["status"] {
  if (status === "Nouveau") return "Nouveau";
  if (status === "À valider") return "À valider";
  if (status === "Brouillon") return "Brouillon";
  if (status === "Envoyé") return "Envoyé";
  return "Refusé";
}

function normalizeApplicationStatus(status: string): Application["status"] {
  if (status === "Nouveau") return "Nouveau";
  if (status === "À valider") return "À valider";
  if (status === "Brouillon") return "Brouillon";
  if (status === "Envoyé") return "Envoyé";
  return "Refusé";
}

function mapJobRow(row: JobRow): Job {
  return {
    id: row.id,
    title: row.title,
    company: row.company,
    location: row.location,
    contract: row.contract,
    source: row.source,
    sourceLabels: row.source_labels?.length ? row.source_labels : [row.source],
    jobUrl: row.job_url,
    jobDescription: row.job_description,
    postedAt: asDateLabel(row.created_at),
    score: row.score,
    status: normalizeJobStatus(row.status),
  };
}

function mapApplicationRow(row: ApplicationRow): Application {
  const job = Array.isArray(row.jobs) ? row.jobs[0] : row.jobs;

  return {
    id: row.id,
    jobId: row.job_id,
    jobUrl: job?.job_url ?? null,
    jobTitle: job?.title ?? "Offre inconnue",
    company: job?.company ?? "Entreprise inconnue",
    jobScore: job?.score ?? null,
    status: normalizeApplicationStatus(row.status),
    updatedAt: asDateTimeLabel(row.updated_at),
    sentAt: row.sent_at ? asDateTimeLabel(row.sent_at) : null,
    assets: {
      letter: row.letter_generated,
      email: row.email_generated,
      linkedIn: row.linkedin_generated,
    },
    content: {
      letterText: row.letter_text,
      emailText: row.email_text,
      linkedInText: row.linkedin_text,
      followupEmailText: row.followup_email_text,
    },
  };
}

export async function getJobs(): Promise<DataResult<Job[]>> {
  if (!hasSupabaseEnv()) {
    return {
      data: [],
      source: "supabase",
      error: "Supabase non configuré. Ajoute les variables d'environnement requises.",
    };
  }

  const supabase = createSupabaseServerClient();
  if (!supabase) {
    return { data: [], source: "supabase", error: "Configuration Supabase invalide." };
  }

  let data: unknown = null;
  let error: { message: string } | null = null;

  try {
    const result = await withTimeout(
      (signal) =>
        supabase
          .from("jobs")
          .select(
            "id,title,company,location,contract,source,source_labels,job_url,job_description,score,status,created_at",
          )
          .order("created_at", { ascending: false })
          .abortSignal(signal),
      SUPABASE_QUERY_TIMEOUT_MS,
    );
    data = result.data;
    error = result.error;
  } catch (queryError) {
    const message =
      queryError instanceof Error && queryError.name === "AbortError"
        ? `Timeout Supabase (${SUPABASE_QUERY_TIMEOUT_MS}ms)`
        : queryError instanceof Error
          ? queryError.message
          : "Erreur inconnue";

    return {
      data: [],
      source: "supabase",
      error: `Lecture jobs impossible: ${message}`,
    };
  }

  if (error) {
    return {
      data: [],
      source: "supabase",
      error: `Lecture jobs impossible: ${error.message}`,
    };
  }

  const rows = (data ?? []) as unknown as JobRow[];
  return { data: rows.map(mapJobRow), source: "supabase" };
}

export async function getApplications(): Promise<DataResult<Application[]>> {
  if (!hasSupabaseEnv()) {
    return {
      data: [],
      source: "supabase",
      error: "Supabase non configuré. Ajoute les variables d'environnement requises.",
    };
  }

  const supabase = createSupabaseServerClient();
  if (!supabase) {
    return { data: [], source: "supabase", error: "Configuration Supabase invalide." };
  }

  let data: unknown = null;
  let error: { message: string } | null = null;

  try {
    const result = await withTimeout(
      (signal) =>
          supabase
            .from("applications")
            .select(
            "id,job_id,status,updated_at,sent_at,letter_generated,email_generated,linkedin_generated,letter_text,email_text,linkedin_text,followup_email_text,jobs!applications_job_id_fkey(title,company,job_url,score)",
          )
          .order("updated_at", { ascending: false })
          .abortSignal(signal),
      SUPABASE_QUERY_TIMEOUT_MS,
    );
    data = result.data;
    error = result.error;
  } catch (queryError) {
    const message =
      queryError instanceof Error && queryError.name === "AbortError"
        ? `Timeout Supabase (${SUPABASE_QUERY_TIMEOUT_MS}ms)`
        : queryError instanceof Error
          ? queryError.message
          : "Erreur inconnue";

    return {
      data: [],
      source: "supabase",
      error: `Lecture candidatures impossible: ${message}`,
    };
  }

  if (error) {
    return {
      data: [],
      source: "supabase",
      error: `Lecture candidatures impossible: ${error.message}`,
    };
  }

  const rows = (data ?? []) as unknown as ApplicationRow[];
  return { data: rows.map(mapApplicationRow), source: "supabase" };
}

export async function getApplicationById(id: string): Promise<DataResult<Application | null>> {
  if (!hasSupabaseEnv()) {
    return {
      data: null,
      source: "supabase",
      error: "Supabase non configuré. Ajoute les variables d'environnement requises.",
    };
  }

  const supabase = createSupabaseServerClient();
  if (!supabase) {
    return { data: null, source: "supabase", error: "Configuration Supabase invalide." };
  }

  let data: unknown = null;
  let error: { message: string } | null = null;

  try {
    const result = await withTimeout(
      (signal) =>
        supabase
          .from("applications")
          .select(
            "id,job_id,status,updated_at,sent_at,letter_generated,email_generated,linkedin_generated,letter_text,email_text,linkedin_text,followup_email_text,jobs!applications_job_id_fkey(title,company,job_url,score)",
          )
          .abortSignal(signal)
          .eq("id", id)
          .maybeSingle(),
      SUPABASE_QUERY_TIMEOUT_MS,
    );
    data = result.data;
    error = result.error;
  } catch (queryError) {
    const message =
      queryError instanceof Error && queryError.name === "AbortError"
        ? `Timeout Supabase (${SUPABASE_QUERY_TIMEOUT_MS}ms)`
        : queryError instanceof Error
          ? queryError.message
          : "Erreur inconnue";

    return {
      data: null,
      source: "supabase",
      error: `Lecture candidature impossible: ${message}`,
    };
  }

  if (error) {
    return {
      data: null,
      source: "supabase",
      error: `Lecture candidature impossible: ${error.message}`,
    };
  }

  if (!data) {
    return { data: null, source: "supabase" };
  }

  return { data: mapApplicationRow(data as ApplicationRow), source: "supabase" };
}

export async function getDashboardStats(): Promise<DataResult<DashboardStat[]>> {
  const [jobsResult, applicationsResult] = await Promise.all([getJobs(), getApplications()]);

  const jobs = jobsResult.data;
  const applications = applicationsResult.data;

  const sentCount = applications.filter((item) => item.status === "Envoyé").length;
  const averageScore = jobs.length
    ? Math.round(jobs.reduce((sum, job) => sum + job.score, 0) / jobs.length)
    : 0;
  const sendRate = applications.length ? Math.round((sentCount / applications.length) * 100) : 0;

  const stats: DashboardStat[] = [
    {
      label: "Offres suivies",
      value: String(jobs.length),
      change: "Source: Supabase",
    },
    {
      label: "Candidatures générées",
      value: String(applications.length),
      change: "Source: Supabase",
    },
    {
      label: "Taux d'envoi",
      value: `${sendRate}%`,
      change: "Calculé en direct",
    },
    {
      label: "Score IA moyen",
      value: `${averageScore}/100`,
      change: "Calculé en direct",
    },
  ];

  const errors = [jobsResult.error, applicationsResult.error].filter(Boolean).join(" ");

  if (errors) {
    return { data: stats, source: "supabase", error: errors };
  }

  return { data: stats, source: "supabase" };
}

export async function getCandidateProfileSummary(): Promise<DataResult<CandidateProfileSummary>> {
  if (!hasSupabaseEnv()) {
    return {
      data: {
        id: fallbackCandidateProfile.profileId ?? null,
        fullName: fallbackCandidateProfile.fullName,
        role: fallbackCandidateProfile.role,
        targetRole: fallbackCandidateProfile.targetRole,
        preferredKeywords: fallbackCandidateProfile.preferredKeywords,
        baseLetterTemplate: fallbackCandidateProfile.baseLetterTemplate,
        location: fallbackCandidateProfile.location,
        email: fallbackCandidateProfile.email,
        technicalSkills: fallbackCandidateProfile.technicalSkills,
        summary: fallbackCandidateProfile.summary,
        source: "fallback",
      },
      source: "supabase",
      error: "Supabase non configuré. Profil CV par défaut utilisé.",
    };
  }

  const supabase = createSupabaseServerClient();
  if (!supabase) {
    return {
      data: {
        id: fallbackCandidateProfile.profileId ?? null,
        fullName: fallbackCandidateProfile.fullName,
        role: fallbackCandidateProfile.role,
        targetRole: fallbackCandidateProfile.targetRole,
        preferredKeywords: fallbackCandidateProfile.preferredKeywords,
        baseLetterTemplate: fallbackCandidateProfile.baseLetterTemplate,
        location: fallbackCandidateProfile.location,
        email: fallbackCandidateProfile.email,
        technicalSkills: fallbackCandidateProfile.technicalSkills,
        summary: fallbackCandidateProfile.summary,
        source: "fallback",
      },
      source: "supabase",
      error: "Configuration Supabase invalide.",
    };
  }

  const { data, error } = await supabase
    .from("candidate_profiles")
    .select("id,full_name,role,target_role,preferred_keywords,base_letter_template,location,email,summary,technical_skills")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error && isMissingCandidatePreferenceColumns(error.message)) {
    const fallbackResult = await supabase
      .from("candidate_profiles")
      .select("id,full_name,role,location,email,summary,technical_skills")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (fallbackResult.error || !fallbackResult.data) {
      return {
        data: {
          id: fallbackCandidateProfile.profileId ?? null,
          fullName: fallbackCandidateProfile.fullName,
          role: fallbackCandidateProfile.role,
          targetRole: fallbackCandidateProfile.targetRole,
          preferredKeywords: fallbackCandidateProfile.preferredKeywords,
          baseLetterTemplate: fallbackCandidateProfile.baseLetterTemplate,
          location: fallbackCandidateProfile.location,
          email: fallbackCandidateProfile.email,
          technicalSkills: fallbackCandidateProfile.technicalSkills,
          summary: fallbackCandidateProfile.summary,
          source: "fallback",
        },
        source: "supabase",
        error: fallbackResult.error
          ? `Lecture profil impossible: ${fallbackResult.error.message}`
          : "Lecture profil impossible.",
      };
    }

    const row = fallbackResult.data as Omit<
      CandidateProfileRow,
      "target_role" | "preferred_keywords"
    >;

    return {
      data: {
        id: row.id ?? null,
        fullName: row.full_name?.trim() || importedProfileDefaults.fullName,
        role: row.role?.trim() || importedProfileDefaults.role,
        targetRole: row.role?.trim() || importedProfileDefaults.role,
        preferredKeywords: [],
        baseLetterTemplate: "",
        location: row.location?.trim() || importedProfileDefaults.location,
        email: row.email?.trim() || importedProfileDefaults.email,
        technicalSkills: (row.technical_skills ?? []).filter(Boolean),
        summary: row.summary?.trim() || importedProfileDefaults.summary,
        source: "imported",
      },
      source: "supabase",
      error:
        "Colonnes profil avancé absentes en base. L’app utilise un mode compatible tant que la migration n’est pas appliquée.",
    };
  }

  if (error || !data) {
    return {
      data: {
        id: fallbackCandidateProfile.profileId ?? null,
        fullName: fallbackCandidateProfile.fullName,
        role: fallbackCandidateProfile.role,
        targetRole: fallbackCandidateProfile.targetRole,
        preferredKeywords: fallbackCandidateProfile.preferredKeywords,
        baseLetterTemplate: fallbackCandidateProfile.baseLetterTemplate,
        location: fallbackCandidateProfile.location,
        email: fallbackCandidateProfile.email,
        technicalSkills: fallbackCandidateProfile.technicalSkills,
        summary: fallbackCandidateProfile.summary,
        source: "fallback",
      },
      source: "supabase",
      error: error ? `Lecture profil impossible: ${error.message}` : undefined,
    };
  }

  const row = data as CandidateProfileRow;
  return {
    data: {
      id: row.id ?? null,
      fullName: row.full_name?.trim() || importedProfileDefaults.fullName,
      role: row.role?.trim() || importedProfileDefaults.role,
      targetRole: row.target_role?.trim() || "",
      preferredKeywords: (row.preferred_keywords ?? []).filter(Boolean),
      baseLetterTemplate: row.base_letter_template?.trim() || "",
      location: row.location?.trim() || importedProfileDefaults.location,
      email: row.email?.trim() || importedProfileDefaults.email,
      technicalSkills: (row.technical_skills ?? []).filter(Boolean),
      summary: row.summary?.trim() || importedProfileDefaults.summary,
      source: "imported",
    },
    source: "supabase",
  };
}
