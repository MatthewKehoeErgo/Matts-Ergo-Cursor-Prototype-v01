-- Comment lifecycle: unresolved (default) vs resolved + resolved_at timestamp.
-- Run in Supabase SQL editor or your migration runner.

alter table public.comments
  add column if not exists status text default 'unresolved',
  add column if not exists resolved_at timestamptz;

update public.comments
set status = 'unresolved'
where status is null;

alter table public.comments
  alter column status set default 'unresolved',
  alter column status set not null;

alter table public.comments
  drop constraint if exists comments_status_check;

alter table public.comments
  add constraint comments_status_check
  check (status in ('unresolved', 'resolved'));

comment on column public.comments.status is 'unresolved | resolved — prototype pins load unresolved only.';
comment on column public.comments.resolved_at is 'Set when status becomes resolved; null while unresolved.';

-- RLS: allow anon (or your role) to PATCH status and resolved_at alongside existing update rules.
