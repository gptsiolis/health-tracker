create table public.variables (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  bucket text not null check (
    bucket in (
      'symptoms',
      'supplements',
      'food',
      'exercise',
      'location',
      'sleep',
      'notes'
    )
  ),
  default_unit text,
  default_amount numeric,
  default_time time,
  created_at timestamptz not null default now(),
  archived_at timestamptz,
  unique (user_id, name, bucket)
);

create table public.journal_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  variable_id uuid not null references public.variables(id) on delete cascade,
  bucket text not null check (
    bucket in (
      'symptoms',
      'supplements',
      'food',
      'exercise',
      'location',
      'sleep',
      'notes'
    )
  ),
  entry_date date not null,
  time_of_day time,
  data jsonb not null default '{}'::jsonb,
  notes text,
  created_at timestamptz not null default now()
);

create index journal_entries_user_date_idx
  on public.journal_entries (user_id, entry_date);

create index variables_user_bucket_name_idx
  on public.variables (user_id, bucket, name);

alter table public.variables enable row level security;
alter table public.journal_entries enable row level security;

create policy "Users can read their own variables"
  on public.variables for select using (auth.uid() = user_id);
create policy "Users can insert their own variables"
  on public.variables for insert with check (auth.uid() = user_id);
create policy "Users can update their own variables"
  on public.variables for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete their own variables"
  on public.variables for delete using (auth.uid() = user_id);

create policy "Users can read their own journal entries"
  on public.journal_entries for select using (auth.uid() = user_id);
create policy "Users can insert their own journal entries"
  on public.journal_entries for insert with check (auth.uid() = user_id);
create policy "Users can update their own journal entries"
  on public.journal_entries for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete their own journal entries"
  on public.journal_entries for delete using (auth.uid() = user_id);
