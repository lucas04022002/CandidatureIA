create table if not exists public.candidate_profiles (
  id uuid primary key,
  file_name text not null,
  raw_text text not null,
  full_name text not null default '',
  role text not null default '',
  location text not null default '',
  email text not null default '',
  phone text not null default '',
  github text not null default '',
  linkedin text not null default '',
  summary text not null default '',
  technical_skills text[] not null default '{}',
  soft_skills text[] not null default '{}',
  experience_highlights text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists candidate_profiles_updated_at_idx
  on public.candidate_profiles(updated_at desc);
