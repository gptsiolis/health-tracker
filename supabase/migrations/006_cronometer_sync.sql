alter table public.journal_entries
  add column if not exists external_source text,
  add column if not exists external_id text;

create unique index if not exists journal_entries_external_uniq
  on public.journal_entries (user_id, external_source, external_id);

create table if not exists public.cronometer_sync_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  last_synced_at timestamptz,
  last_error text,
  updated_at timestamptz not null default now()
);

alter table public.cronometer_sync_state enable row level security;

create policy "Users can read their own sync state"
  on public.cronometer_sync_state for select using (auth.uid() = user_id);
create policy "Users can insert their own sync state"
  on public.cronometer_sync_state for insert with check (auth.uid() = user_id);
create policy "Users can update their own sync state"
  on public.cronometer_sync_state for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
