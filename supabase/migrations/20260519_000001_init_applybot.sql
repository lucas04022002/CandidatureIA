create type application_status as enum (
  'Nouveau',
  'À valider',
  'Brouillon',
  'Envoyé',
  'Refusé'
);

create table if not exists public.jobs (
  id uuid primary key,
  title text not null,
  company text not null,
  location text not null,
  contract text not null,
  source text not null,
  score integer not null check (score >= 0 and score <= 100),
  status application_status not null default 'Nouveau',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.applications (
  id uuid primary key,
  job_id uuid not null references public.jobs(id) on delete cascade,
  status application_status not null default 'À valider',
  letter_generated boolean not null default false,
  email_generated boolean not null default false,
  linkedin_generated boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists jobs_status_idx on public.jobs(status);
create index if not exists jobs_created_at_idx on public.jobs(created_at desc);
create index if not exists applications_status_idx on public.applications(status);
create index if not exists applications_updated_at_idx on public.applications(updated_at desc);

-- Les données de démonstration ont été déplacées dans supabase/seed.sql (optionnel).
