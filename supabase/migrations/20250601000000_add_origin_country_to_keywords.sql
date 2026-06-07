-- Run in Supabase SQL Editor if the column is not present yet.
alter table public.keywords
  add column if not exists origin_country text;
