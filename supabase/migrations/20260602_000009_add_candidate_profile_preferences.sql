alter table public.candidate_profiles
  add column if not exists target_role text,
  add column if not exists preferred_keywords text[] default '{}'::text[];
