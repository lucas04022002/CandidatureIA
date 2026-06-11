alter table public.candidate_profiles
  add column if not exists base_letter_template text;
