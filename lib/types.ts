export const APPLICATION_STATUSES = [
  "Nouveau",
  "À valider",
  "Brouillon",
  "Envoyé",
  "Refusé",
] as const;

export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

export interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  contract: string;
  source: string;
  sourceLabels: string[];
  jobUrl: string | null;
  jobDescription: string | null;
  postedAt: string;
  score: number;
  status: ApplicationStatus;
}

export interface Application {
  id: string;
  jobId: string | null;
  jobUrl: string | null;
  jobTitle: string;
  company: string;
  status: ApplicationStatus;
  updatedAt: string;
  sentAt: string | null;
  assets: {
    letter: boolean;
    email: boolean;
    linkedIn: boolean;
  };
  content?: {
    letterText?: string | null;
    emailText?: string | null;
    linkedInText?: string | null;
    followupEmailText?: string | null;
  };
}

export interface DashboardStat {
  label: string;
  value: string;
  change: string;
}

export interface CandidateProfileSummary {
  id: string | null;
  fullName: string;
  role: string;
  targetRole: string;
  preferredKeywords: string[];
  location: string;
  email: string;
  technicalSkills: string[];
  summary: string;
  source: "imported" | "fallback";
}
