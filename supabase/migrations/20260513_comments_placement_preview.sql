-- Placement preview: normalized coordinates, capture viewport size, optional JPEG/data URL thumbnail.
-- Apply in Supabase SQL editor or via migration tooling. Adjust schema name if not `public`.

alter table public.comments
  add column if not exists x_ratio double precision,
  add column if not exists y_ratio double precision,
  add column if not exists viewport_width integer,
  add column if not exists viewport_height integer,
  add column if not exists preview_image_url text;

comment on column public.comments.x_ratio is 'Pin X as fraction of viewport width at save time (0–1).';
comment on column public.comments.y_ratio is 'Pin Y as fraction of viewport height at save time (0–1).';
comment on column public.comments.viewport_width is 'window.innerWidth when the comment was created.';
comment on column public.comments.viewport_height is 'window.innerHeight when the comment was created.';
comment on column public.comments.preview_image_url is 'Optional screenshot URL or data URL (React app capture-on-save).';

-- Ensure RLS policies allow INSERT/SELECT of the new columns and UPDATE on preview_image_url
-- if you PATCH thumbnails after create (match your existing anon/service-role model).
