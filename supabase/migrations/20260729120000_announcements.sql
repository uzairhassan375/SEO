-- Admin → member popup announcements.
-- An announcement is sent to one or more members and pops up on every login
-- while it is active. Admin controls active/inactive and deletion.

CREATE TABLE IF NOT EXISTS public.announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL DEFAULT 'Announcement',
  body text NOT NULL,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.announcement_recipients (
  announcement_id uuid NOT NULL REFERENCES public.announcements(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  first_seen_at timestamptz,
  last_seen_at timestamptz,
  seen_count integer NOT NULL DEFAULT 0,
  PRIMARY KEY (announcement_id, user_id)
);

CREATE INDEX IF NOT EXISTS announcement_recipients_user_idx
  ON public.announcement_recipients (user_id);

CREATE INDEX IF NOT EXISTS announcements_active_idx
  ON public.announcements (active, created_at DESC);

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcement_recipients ENABLE ROW LEVEL SECURITY;

-- announcements: admin manages; members read only ones addressed to them
DROP POLICY IF EXISTS announcements_select ON public.announcements;
DROP POLICY IF EXISTS announcements_insert ON public.announcements;
DROP POLICY IF EXISTS announcements_update ON public.announcements;
DROP POLICY IF EXISTS announcements_delete ON public.announcements;

CREATE POLICY announcements_select ON public.announcements
  FOR SELECT TO authenticated
  USING (
    is_admin()
    OR EXISTS (
      SELECT 1 FROM public.announcement_recipients r
      WHERE r.announcement_id = announcements.id AND r.user_id = auth.uid()
    )
  );

CREATE POLICY announcements_insert ON public.announcements
  FOR INSERT TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY announcements_update ON public.announcements
  FOR UPDATE TO authenticated
  USING (is_admin());

CREATE POLICY announcements_delete ON public.announcements
  FOR DELETE TO authenticated
  USING (is_admin());

-- recipients: admin manages the list; a member reads and marks only their own row
DROP POLICY IF EXISTS announcement_recipients_select ON public.announcement_recipients;
DROP POLICY IF EXISTS announcement_recipients_insert ON public.announcement_recipients;
DROP POLICY IF EXISTS announcement_recipients_update ON public.announcement_recipients;
DROP POLICY IF EXISTS announcement_recipients_delete ON public.announcement_recipients;

CREATE POLICY announcement_recipients_select ON public.announcement_recipients
  FOR SELECT TO authenticated
  USING (is_admin() OR user_id = auth.uid());

CREATE POLICY announcement_recipients_insert ON public.announcement_recipients
  FOR INSERT TO authenticated
  WITH CHECK (is_admin());

-- members may only bump their own seen counters
CREATE POLICY announcement_recipients_update ON public.announcement_recipients
  FOR UPDATE TO authenticated
  USING (is_admin() OR user_id = auth.uid())
  WITH CHECK (is_admin() OR user_id = auth.uid());

CREATE POLICY announcement_recipients_delete ON public.announcement_recipients
  FOR DELETE TO authenticated
  USING (is_admin());
