create table public.symptom_definitions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  key text not null,
  name text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  archived_at timestamptz,
  unique (user_id, key)
);

alter table public.symptom_definitions enable row level security;

create policy "Users can read their own symptom definitions"
  on public.symptom_definitions for select using (auth.uid() = user_id);
create policy "Users can insert their own symptom definitions"
  on public.symptom_definitions for insert with check (auth.uid() = user_id);
create policy "Users can update their own symptom definitions"
  on public.symptom_definitions for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete their own symptom definitions"
  on public.symptom_definitions for delete using (auth.uid() = user_id);
