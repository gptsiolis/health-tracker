create extension if not exists "pgcrypto";

create table public.foods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  calories numeric,
  protein numeric,
  carbs numeric,
  fat numeric,
  micros jsonb not null default '{}'::jsonb,
  foods_list jsonb not null default '[]'::jsonb,
  eaten_at timestamptz not null,
  source text not null check (source in ('cronometer_screenshot', 'manual')),
  raw_image_url text,
  created_at timestamptz not null default now()
);

create table public.sleep (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  hours numeric,
  bedtime timestamptz,
  wake_time timestamptz,
  rhr numeric,
  hrv numeric,
  sleep_score numeric,
  source text not null check (source in ('whoop_csv', 'manual')),
  created_at timestamptz not null default now()
);

create table public.supplements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  dose numeric,
  unit text,
  taken_at timestamptz not null,
  notes text,
  created_at timestamptz not null default now()
);

create table public.exercise (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null,
  duration_min numeric,
  intensity integer check (intensity between 1 and 10),
  notes text,
  done_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table public.location (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  label text not null,
  started_at timestamptz not null,
  ended_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.symptoms (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  scores jsonb not null default '{}'::jsonb,
  notes text,
  created_at timestamptz not null default now(),
  unique (user_id, date)
);

alter table public.foods enable row level security;
alter table public.sleep enable row level security;
alter table public.supplements enable row level security;
alter table public.exercise enable row level security;
alter table public.location enable row level security;
alter table public.symptoms enable row level security;

create policy "Users can read their own foods"
  on public.foods for select using (auth.uid() = user_id);
create policy "Users can insert their own foods"
  on public.foods for insert with check (auth.uid() = user_id);
create policy "Users can update their own foods"
  on public.foods for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete their own foods"
  on public.foods for delete using (auth.uid() = user_id);

create policy "Users can read their own sleep"
  on public.sleep for select using (auth.uid() = user_id);
create policy "Users can insert their own sleep"
  on public.sleep for insert with check (auth.uid() = user_id);
create policy "Users can update their own sleep"
  on public.sleep for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete their own sleep"
  on public.sleep for delete using (auth.uid() = user_id);

create policy "Users can read their own supplements"
  on public.supplements for select using (auth.uid() = user_id);
create policy "Users can insert their own supplements"
  on public.supplements for insert with check (auth.uid() = user_id);
create policy "Users can update their own supplements"
  on public.supplements for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete their own supplements"
  on public.supplements for delete using (auth.uid() = user_id);

create policy "Users can read their own exercise"
  on public.exercise for select using (auth.uid() = user_id);
create policy "Users can insert their own exercise"
  on public.exercise for insert with check (auth.uid() = user_id);
create policy "Users can update their own exercise"
  on public.exercise for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete their own exercise"
  on public.exercise for delete using (auth.uid() = user_id);

create policy "Users can read their own location"
  on public.location for select using (auth.uid() = user_id);
create policy "Users can insert their own location"
  on public.location for insert with check (auth.uid() = user_id);
create policy "Users can update their own location"
  on public.location for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete their own location"
  on public.location for delete using (auth.uid() = user_id);

create policy "Users can read their own symptoms"
  on public.symptoms for select using (auth.uid() = user_id);
create policy "Users can insert their own symptoms"
  on public.symptoms for insert with check (auth.uid() = user_id);
create policy "Users can update their own symptoms"
  on public.symptoms for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete their own symptoms"
  on public.symptoms for delete using (auth.uid() = user_id);
