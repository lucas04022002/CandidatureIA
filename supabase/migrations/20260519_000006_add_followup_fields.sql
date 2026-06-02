alter table public.applications
  add column if not exists sent_at timestamptz,
  add column if not exists followup_email_text text;
