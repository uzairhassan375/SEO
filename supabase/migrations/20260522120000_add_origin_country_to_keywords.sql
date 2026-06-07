-- Origin country for keyword tracking (separate from target country)
ALTER TABLE public.keywords
  ADD COLUMN IF NOT EXISTS origin_country text;
