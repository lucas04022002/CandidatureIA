import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export type AppStatus = "Nouveau" | "À valider" | "Brouillon" | "Envoyé" | "Refusé";

export interface Database {
  public: {
    Tables: {
      jobs: {
        Row: {
          id: string;
          title: string;
          company: string;
          location: string;
          contract: string;
          source: string;
          score: number;
          status: AppStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          title: string;
          company: string;
          location: string;
          contract: string;
          source: string;
          score: number;
          status?: AppStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          title?: string;
          company?: string;
          location?: string;
          contract?: string;
          source?: string;
          score?: number;
          status?: AppStatus;
          updated_at?: string;
        };
      };
      applications: {
        Row: {
          id: string;
          job_id: string;
          status: AppStatus;
          letter_generated: boolean;
          email_generated: boolean;
          linkedin_generated: boolean;
          letter_text: string | null;
          email_text: string | null;
          linkedin_text: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          job_id: string;
          status?: AppStatus;
          letter_generated?: boolean;
          email_generated?: boolean;
          linkedin_generated?: boolean;
          letter_text?: string | null;
          email_text?: string | null;
          linkedin_text?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          status?: AppStatus;
          letter_generated?: boolean;
          email_generated?: boolean;
          linkedin_generated?: boolean;
          letter_text?: string | null;
          email_text?: string | null;
          linkedin_text?: string | null;
          updated_at?: string;
        };
      };
    };
  };
}

function getSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return null;
  }

  return { url, anonKey };
}

export function hasSupabaseEnv() {
  return getSupabaseEnv() !== null;
}

export function createSupabaseServerClient(): SupabaseClient<Database> | null {
  const env = getSupabaseEnv();

  if (!env) {
    return null;
  }

  return createClient<Database>(env.url, env.anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
