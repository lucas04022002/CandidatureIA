alter table public.applications
  add column if not exists letter_text text,
  add column if not exists email_text text,
  add column if not exists linkedin_text text;
