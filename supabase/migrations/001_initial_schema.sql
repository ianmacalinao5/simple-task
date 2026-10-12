create extension if not exists pgcrypto;

create table public.boards (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'My task board' check (char_length(name) between 1 and 80),
  owner_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.columns (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references public.boards(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 40),
  position integer not null default 0 check (position >= 0),
  created_at timestamptz not null default now(),
  unique(board_id, position)
);
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references public.boards(id) on delete cascade,
  column_id uuid not null references public.columns(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  description text check (description is null or char_length(description) <= 500),
  priority text not null default 'medium' check (priority in ('low','medium','high')),
  due_date date,
  position integer not null default 0 check (position >= 0),
  created_by_name text check (created_by_name is null or char_length(created_by_name) between 1 and 80),
  created_by_email text check (created_by_email is null or char_length(created_by_email) <= 254),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.share_links (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references public.boards(id) on delete cascade,
  token_hash text not null unique check (char_length(token_hash) = 64),
  permission text not null check (permission in ('view','edit')),
  expires_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);
create index columns_board_position_idx on public.columns(board_id,position);
create index tasks_board_column_position_idx on public.tasks(board_id,column_id,position);
create index share_links_board_idx on public.share_links(board_id);

alter table public.boards enable row level security;
alter table public.columns enable row level security;
alter table public.tasks enable row level security;
alter table public.share_links enable row level security;
create policy "owners manage their boards" on public.boards for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "owners manage their columns" on public.columns for all to authenticated using (exists(select 1 from public.boards b where b.id=board_id and b.owner_id=auth.uid())) with check (exists(select 1 from public.boards b where b.id=board_id and b.owner_id=auth.uid()));
create policy "owners manage their tasks" on public.tasks for all to authenticated using (exists(select 1 from public.boards b where b.id=board_id and b.owner_id=auth.uid())) with check (exists(select 1 from public.boards b where b.id=board_id and b.owner_id=auth.uid()));
create policy "owners manage their share links" on public.share_links for all to authenticated using (exists(select 1 from public.boards b where b.id=board_id and b.owner_id=auth.uid())) with check (exists(select 1 from public.boards b where b.id=board_id and b.owner_id=auth.uid()));

-- Called by the server after it validates the owner session or the edit-link token.
create or replace function public.reorder_tasks(p_board_id uuid, p_items jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare item jsonb;
begin
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) > 500 then
    raise exception 'Invalid task ordering';
  end if;
  for item in select * from jsonb_array_elements(p_items) loop
    update public.tasks set column_id=(item->>'column_id')::uuid,
      position=(item->>'position')::integer, updated_at=now()
    where id=(item->>'id')::uuid and board_id=p_board_id
      and exists(select 1 from public.columns c where c.id=(item->>'column_id')::uuid and c.board_id=p_board_id);
    if not found then raise exception 'Task or column does not belong to this board'; end if;
  end loop;
end $$;
revoke all on function public.reorder_tasks(uuid,jsonb) from public, anon, authenticated;
grant execute on function public.reorder_tasks(uuid,jsonb) to service_role;
