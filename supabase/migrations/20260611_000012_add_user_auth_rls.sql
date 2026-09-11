-- Authentification par utilisateur:
-- 1. colonne user_id sur les tables métier (auto-remplie via auth.uid())
-- 2. suppression des policies publiques ouvertes
-- 3. policies RLS limitées aux lignes de l'utilisateur connecté
-- 4. unicité d'une candidature par offre

alter table public.jobs
  add column if not exists user_id uuid references auth.users(id) on delete cascade default auth.uid();

alter table public.applications
  add column if not exists user_id uuid references auth.users(id) on delete cascade default auth.uid();

alter table public.candidate_profiles
  add column if not exists user_id uuid references auth.users(id) on delete cascade default auth.uid();

create index if not exists jobs_user_id_idx on public.jobs(user_id);
create index if not exists applications_user_id_idx on public.applications(user_id);
create index if not exists candidate_profiles_user_id_idx on public.candidate_profiles(user_id);

-- Données existantes: les lignes sans user_id deviennent invisibles avec les
-- nouvelles policies. Pour les rattacher à ton compte, exécute après création
-- de ton utilisateur (remplace l'email):
--
--   update public.jobs set user_id = (select id from auth.users where email = 'ton@email.fr') where user_id is null;
--   update public.applications set user_id = (select id from auth.users where email = 'ton@email.fr') where user_id is null;
--   update public.candidate_profiles set user_id = (select id from auth.users where email = 'ton@email.fr') where user_id is null;

drop policy if exists "public_jobs_access" on public.jobs;
drop policy if exists "public_applications_access" on public.applications;
drop policy if exists "public_candidate_profiles_access" on public.candidate_profiles;

create policy "jobs_owner_access"
on public.jobs
for all
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create policy "applications_owner_access"
on public.applications
for all
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create policy "candidate_profiles_owner_access"
on public.candidate_profiles
for all
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

-- Une seule candidature par offre et par utilisateur.
-- (supprime les doublons éventuels avant de poser la contrainte)
delete from public.applications a
using public.applications b
where a.job_id = b.job_id
  and a.user_id is not distinct from b.user_id
  and a.updated_at < b.updated_at;

create unique index if not exists applications_job_id_user_id_key
  on public.applications(job_id, user_id);
