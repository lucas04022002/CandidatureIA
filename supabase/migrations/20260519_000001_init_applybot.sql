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

insert into public.jobs (id, title, company, location, contract, source, score, status, created_at, updated_at)
values
  ('10000000-0000-0000-0000-000000000001', 'Développeur Full Stack React/Node', 'Mistral Digital', 'Paris (75)', 'CDI', 'Welcome to the Jungle', 93, 'Nouveau', now() - interval '1 day', now() - interval '1 day'),
  ('10000000-0000-0000-0000-000000000002', 'Software Engineer TypeScript', 'Ledger', 'Paris (75)', 'CDI', 'LinkedIn Jobs', 88, 'À valider', now() - interval '2 days', now() - interval '2 days'),
  ('10000000-0000-0000-0000-000000000003', 'Full Stack Engineer Next.js', 'Alan', 'Remote', 'CDI', 'Hellowork', 91, 'Brouillon', now() - interval '3 days', now() - interval '3 days'),
  ('10000000-0000-0000-0000-000000000004', 'Développeur Web Node.js', 'PayFit', 'Paris (75)', 'CDI', 'France Travail', 84, 'Envoyé', now() - interval '4 days', now() - interval '4 days'),
  ('10000000-0000-0000-0000-000000000005', 'Ingénieur Full Stack', 'Doctolib', 'Nantes (44)', 'CDI', 'Welcome to the Jungle', 79, 'Refusé', now() - interval '6 days', now() - interval '6 days'),
  ('10000000-0000-0000-0000-000000000006', 'Développeur Next.js', 'Qonto', 'Paris (75)', 'CDI', 'LinkedIn Jobs', 95, 'Nouveau', now() - interval '5 hours', now() - interval '5 hours')
on conflict (id) do nothing;

insert into public.applications (
  id,
  job_id,
  status,
  letter_generated,
  email_generated,
  linkedin_generated,
  created_at,
  updated_at
)
values
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'À valider', true, true, true, now() - interval '1 day', now() - interval '2 hours'),
  ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', 'Brouillon', true, true, false, now() - interval '1 day', now() - interval '3 hours'),
  ('20000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000003', 'Envoyé', true, true, true, now() - interval '2 days', now() - interval '14 hours'),
  ('20000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000004', 'Refusé', true, true, true, now() - interval '3 days', now() - interval '1 day')
on conflict (id) do nothing;
