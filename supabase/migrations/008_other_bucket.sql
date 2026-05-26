alter table public.variables
  drop constraint if exists variables_bucket_check;

alter table public.variables
  add constraint variables_bucket_check
  check (
    bucket in (
      'symptoms',
      'supplements',
      'food',
      'exercise',
      'location',
      'sleep',
      'notes',
      'nutrition',
      'other'
    )
  );

alter table public.journal_entries
  drop constraint if exists journal_entries_bucket_check;

alter table public.journal_entries
  add constraint journal_entries_bucket_check
  check (
    bucket in (
      'symptoms',
      'supplements',
      'food',
      'exercise',
      'location',
      'sleep',
      'notes',
      'nutrition',
      'other'
    )
  );
