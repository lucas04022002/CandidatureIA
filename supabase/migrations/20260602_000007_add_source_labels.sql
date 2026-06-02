alter table public.jobs
  add column if not exists source_labels text[];

update public.jobs
set source_labels = array[source]
where source_labels is null or array_length(source_labels, 1) is null;
