alter table public.tasks
  add column if not exists created_by_name text
    check (created_by_name is null or char_length(created_by_name) between 1 and 80),
  add column if not exists created_by_email text
    check (created_by_email is null or char_length(created_by_email) <= 254);
