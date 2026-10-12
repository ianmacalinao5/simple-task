alter table public.tasks
  add column if not exists source_label text
    check (source_label is null or char_length(source_label) between 1 and 60),
  add column if not exists source_url text
    check (source_url is null or (char_length(source_url) <= 2048 and source_url ~* '^https?://'));

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'tasks_source_pair_check'
      and conrelid = 'public.tasks'::regclass
  ) then
    alter table public.tasks
      add constraint tasks_source_pair_check
      check ((source_label is null) = (source_url is null));
  end if;
end
$$;
