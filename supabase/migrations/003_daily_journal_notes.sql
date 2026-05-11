create table public.daily_journal_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, date)
);

alter table public.daily_journal_notes enable row level security;

create policy "Users can read their own daily journal notes"
  on public.daily_journal_notes for select using (auth.uid() = user_id);
create policy "Users can insert their own daily journal notes"
  on public.daily_journal_notes for insert with check (auth.uid() = user_id);
create policy "Users can update their own daily journal notes"
  on public.daily_journal_notes for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete their own daily journal notes"
  on public.daily_journal_notes for delete using (auth.uid() = user_id);
