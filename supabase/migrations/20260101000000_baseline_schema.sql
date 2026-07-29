-- BASELINE SCHEMA — reconstructed from the application code.
--
-- The original schema was created directly in the Supabase dashboard and only
-- delta migrations lived in this repo, so this file rebuilds everything the app
-- reads and writes: tables, the is_admin()/user_service() helpers, and RLS.
--
-- Run this FIRST on a fresh project, then the later migrations in this folder
-- in filename order.

-- ----------------------------------------------------------------- tables ---
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE,
  full_name text,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  assigned_service text CHECK (assigned_service IN ('dropshipping', '3pl', '360')),
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.keywords (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  keyword text NOT NULL,
  service text NOT NULL,
  country text,
  origin_country text,
  priority text DEFAULT 'medium',
  current_rank integer,
  rank_week1 integer,
  rank_week2 integer,
  rank_week3 integer,
  rank_week4 integer,
  impressions_week1 integer,
  impressions_week2 integer,
  impressions_week3 integer,
  impressions_week4 integer,
  added_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.page_rankings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_url text NOT NULL,
  service text NOT NULL,
  clicks integer DEFAULT 0,
  impressions integer DEFAULT 0,
  avg_position numeric,
  ctr numeric,
  week_number integer NOT NULL,
  year integer NOT NULL,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.backlinks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_url text NOT NULL,
  target_url text NOT NULL,
  service text NOT NULL,
  type text NOT NULL DEFAULT 'backlink' CHECK (type IN ('backlink', 'guest_post')),
  dr_score integer,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('live', 'pending', 'rejected')),
  notes text,
  date_added date DEFAULT current_date,
  added_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.blogs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  target_keyword text,
  country text,
  origin_country text,
  service text NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'writing', 'published', 'live')),
  url text,
  word_count integer,
  notes text,
  published_at date,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.weekly_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  week_number integer NOT NULL,
  year integer NOT NULL,
  service text NOT NULL,
  backlinks_added integer NOT NULL DEFAULT 0,
  blogs_published integer NOT NULL DEFAULT 0,
  keywords_improved integer NOT NULL DEFAULT 0,
  guest_posts integer NOT NULL DEFAULT 0,
  on_page_fixes integer NOT NULL DEFAULT 0,
  notes text,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (week_number, year, service)
);

CREATE TABLE IF NOT EXISTS public.monthly_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  month integer NOT NULL,
  year integer NOT NULL,
  service text NOT NULL,
  total_backlinks integer NOT NULL DEFAULT 0,
  total_blogs integer NOT NULL DEFAULT 0,
  keywords_in_top10 integer NOT NULL DEFAULT 0,
  keywords_improved integer NOT NULL DEFAULT 0,
  top_keyword text,
  top_keyword_rank integer,
  summary_notes text,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (month, year, service)
);

CREATE TABLE IF NOT EXISTS public.activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  user_name text,
  action text NOT NULL,
  entity_type text,
  entity_id uuid,
  entity_name text,
  service text,
  old_value text,
  new_value text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.weekly_important_info (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  week_number integer NOT NULL,
  year integer NOT NULL,
  title text DEFAULT 'Weekly priorities',
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  published boolean NOT NULL DEFAULT false,
  updated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (week_number, year)
);

CREATE INDEX IF NOT EXISTS keywords_service_idx ON public.keywords (service);
CREATE INDEX IF NOT EXISTS backlinks_service_idx ON public.backlinks (service);
CREATE INDEX IF NOT EXISTS blogs_service_idx ON public.blogs (service);
CREATE INDEX IF NOT EXISTS activity_log_created_idx ON public.activity_log (created_at DESC);
CREATE INDEX IF NOT EXISTS page_rankings_week_idx ON public.page_rankings (year, week_number);

-- ---------------------------------------------------------------- helpers ---
-- (defined after the tables: a LANGUAGE sql body is validated at creation time,
--  so profiles must already exist)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND (p.role = 'admin' OR p.email = 'admin@uzair.com')
  );
$$;

CREATE OR REPLACE FUNCTION public.user_service()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT p.assigned_service FROM public.profiles p WHERE p.id = auth.uid();
$$;

-- -------------------------------------------------------------------- RLS ---
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.keywords ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.page_rankings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.backlinks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blogs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_important_info ENABLE ROW LEVEL SECURITY;

-- profiles: everyone signed in can read the team (avatars, names in tables);
-- you edit yourself, admin edits anyone.
DROP POLICY IF EXISTS profiles_select ON public.profiles;
DROP POLICY IF EXISTS profiles_insert ON public.profiles;
DROP POLICY IF EXISTS profiles_update ON public.profiles;

CREATE POLICY profiles_select ON public.profiles
  FOR SELECT TO authenticated USING (true);

CREATE POLICY profiles_insert ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (id = auth.uid() OR is_admin());

CREATE POLICY profiles_update ON public.profiles
  FOR UPDATE TO authenticated USING (id = auth.uid() OR is_admin());

-- keywords / backlinks / page_rankings / blogs / weekly_reports:
-- owner-scoped for members, everything for admin. Written per command (not one
-- FOR ALL policy) so 20260522140000_member_own_data_rls.sql can replace the
-- select/insert/update rules by name without leaving a table with no policy.
-- keywords
DROP POLICY IF EXISTS keywords_select ON public.keywords;
DROP POLICY IF EXISTS keywords_insert ON public.keywords;
DROP POLICY IF EXISTS keywords_update ON public.keywords;
DROP POLICY IF EXISTS keywords_delete ON public.keywords;

CREATE POLICY keywords_select ON public.keywords
  FOR SELECT TO authenticated
  USING (is_admin() OR added_by = auth.uid());

CREATE POLICY keywords_insert ON public.keywords
  FOR INSERT TO authenticated
  WITH CHECK (is_admin() OR added_by = auth.uid());

CREATE POLICY keywords_update ON public.keywords
  FOR UPDATE TO authenticated
  USING (is_admin() OR added_by = auth.uid());

CREATE POLICY keywords_delete ON public.keywords
  FOR DELETE TO authenticated
  USING (is_admin() OR added_by = auth.uid());

-- backlinks
DROP POLICY IF EXISTS backlinks_select ON public.backlinks;
DROP POLICY IF EXISTS backlinks_insert ON public.backlinks;
DROP POLICY IF EXISTS backlinks_update ON public.backlinks;
DROP POLICY IF EXISTS backlinks_delete ON public.backlinks;

CREATE POLICY backlinks_select ON public.backlinks
  FOR SELECT TO authenticated
  USING (is_admin() OR added_by = auth.uid());

CREATE POLICY backlinks_insert ON public.backlinks
  FOR INSERT TO authenticated
  WITH CHECK (is_admin() OR added_by = auth.uid());

CREATE POLICY backlinks_update ON public.backlinks
  FOR UPDATE TO authenticated
  USING (is_admin() OR added_by = auth.uid());

CREATE POLICY backlinks_delete ON public.backlinks
  FOR DELETE TO authenticated
  USING (is_admin() OR added_by = auth.uid());

-- page_rankings
DROP POLICY IF EXISTS page_rankings_select ON public.page_rankings;
DROP POLICY IF EXISTS page_rankings_insert ON public.page_rankings;
DROP POLICY IF EXISTS page_rankings_update ON public.page_rankings;
DROP POLICY IF EXISTS page_rankings_delete ON public.page_rankings;

CREATE POLICY page_rankings_select ON public.page_rankings
  FOR SELECT TO authenticated
  USING (is_admin() OR created_by = auth.uid());

CREATE POLICY page_rankings_insert ON public.page_rankings
  FOR INSERT TO authenticated
  WITH CHECK (is_admin() OR created_by = auth.uid());

CREATE POLICY page_rankings_update ON public.page_rankings
  FOR UPDATE TO authenticated
  USING (is_admin() OR created_by = auth.uid());

CREATE POLICY page_rankings_delete ON public.page_rankings
  FOR DELETE TO authenticated
  USING (is_admin() OR created_by = auth.uid());

-- blogs
DROP POLICY IF EXISTS blogs_select ON public.blogs;
DROP POLICY IF EXISTS blogs_insert ON public.blogs;
DROP POLICY IF EXISTS blogs_update ON public.blogs;
DROP POLICY IF EXISTS blogs_delete ON public.blogs;

CREATE POLICY blogs_select ON public.blogs
  FOR SELECT TO authenticated
  USING (is_admin() OR created_by = auth.uid());

CREATE POLICY blogs_insert ON public.blogs
  FOR INSERT TO authenticated
  WITH CHECK (is_admin() OR created_by = auth.uid());

CREATE POLICY blogs_update ON public.blogs
  FOR UPDATE TO authenticated
  USING (is_admin() OR created_by = auth.uid());

CREATE POLICY blogs_delete ON public.blogs
  FOR DELETE TO authenticated
  USING (is_admin() OR created_by = auth.uid());

-- weekly_reports
DROP POLICY IF EXISTS weekly_reports_select ON public.weekly_reports;
DROP POLICY IF EXISTS weekly_reports_insert ON public.weekly_reports;
DROP POLICY IF EXISTS weekly_reports_update ON public.weekly_reports;
DROP POLICY IF EXISTS weekly_reports_delete ON public.weekly_reports;

CREATE POLICY weekly_reports_select ON public.weekly_reports
  FOR SELECT TO authenticated
  USING (is_admin() OR created_by = auth.uid());

CREATE POLICY weekly_reports_insert ON public.weekly_reports
  FOR INSERT TO authenticated
  WITH CHECK (is_admin() OR created_by = auth.uid());

CREATE POLICY weekly_reports_update ON public.weekly_reports
  FOR UPDATE TO authenticated
  USING (is_admin() OR created_by = auth.uid());

CREATE POLICY weekly_reports_delete ON public.weekly_reports
  FOR DELETE TO authenticated
  USING (is_admin() OR created_by = auth.uid());

-- monthly reports: admin only
-- monthly_reports
DROP POLICY IF EXISTS monthly_reports_select ON public.monthly_reports;
DROP POLICY IF EXISTS monthly_reports_insert ON public.monthly_reports;
DROP POLICY IF EXISTS monthly_reports_update ON public.monthly_reports;
DROP POLICY IF EXISTS monthly_reports_delete ON public.monthly_reports;

CREATE POLICY monthly_reports_select ON public.monthly_reports
  FOR SELECT TO authenticated
  USING (is_admin());

CREATE POLICY monthly_reports_insert ON public.monthly_reports
  FOR INSERT TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY monthly_reports_update ON public.monthly_reports
  FOR UPDATE TO authenticated
  USING (is_admin());

CREATE POLICY monthly_reports_delete ON public.monthly_reports
  FOR DELETE TO authenticated
  USING (is_admin());

-- activity log: everyone signed in writes their own entries; admin reads all,
-- members read their own.
CREATE POLICY activity_log_select ON public.activity_log
  FOR SELECT TO authenticated
  USING (is_admin() OR user_id = auth.uid());

CREATE POLICY activity_log_insert ON public.activity_log
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR is_admin());

-- weekly important info: admin writes, team reads published posts
CREATE POLICY weekly_info_select ON public.weekly_important_info
  FOR SELECT TO authenticated
  USING (is_admin() OR published = true);

CREATE POLICY weekly_info_write ON public.weekly_important_info
  FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- ---------------------------------------------------------------- storage ---
-- Profile photos (src/lib/avatars.js uploads to the "avatars" bucket).
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS avatars_read ON storage.objects;
DROP POLICY IF EXISTS avatars_write ON storage.objects;

CREATE POLICY avatars_read ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

-- files are stored under <user-id>/<filename>
CREATE POLICY avatars_write ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

-- realtime for the sidebar badge + important info page
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.weekly_important_info;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_object THEN NULL;
END $$;
