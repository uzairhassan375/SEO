ALTER TABLE public.blogs
  ADD COLUMN IF NOT EXISTS origin_country text;
