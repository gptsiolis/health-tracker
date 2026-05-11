alter table public.variables
  add column if not exists config jsonb not null default '{}'::jsonb;
