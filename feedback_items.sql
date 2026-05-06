-- Run in Supabase SQL editor (adjust types if your `sessions.id` differs).
-- Enable RLS policies for anon key as needed: INSERT for new rows, UPDATE for edits.

create table if not exists public.feedback_items (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions (id) on delete cascade,
  body text not null,
  anchor_x double precision,
  anchor_y double precision,
  page_url text,
  screen_label text,
  created_at timestamptz not null default now()
);
