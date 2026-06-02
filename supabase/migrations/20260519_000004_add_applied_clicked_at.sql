alter table public.jobs
  add column if not exists applied_clicked_at timestamptz;
