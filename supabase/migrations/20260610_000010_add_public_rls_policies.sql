alter table public.jobs enable row level security;
alter table public.applications enable row level security;
alter table public.candidate_profiles enable row level security;

drop policy if exists "public_jobs_access" on public.jobs;
create policy "public_jobs_access"
on public.jobs
for all
to public
using (true)
with check (true);

drop policy if exists "public_applications_access" on public.applications;
create policy "public_applications_access"
on public.applications
for all
to public
using (true)
with check (true);

drop policy if exists "public_candidate_profiles_access" on public.candidate_profiles;
create policy "public_candidate_profiles_access"
on public.candidate_profiles
for all
to public
using (true)
with check (true);
