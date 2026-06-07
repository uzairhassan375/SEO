-- Members: own rows only. Admin: all rows.

-- keywords (owner: added_by)
DROP POLICY IF EXISTS keywords_select ON public.keywords;
DROP POLICY IF EXISTS keywords_insert ON public.keywords;
DROP POLICY IF EXISTS keywords_update ON public.keywords;
DROP POLICY IF EXISTS keywords_delete ON public.keywords;

CREATE POLICY keywords_select ON public.keywords
  FOR SELECT TO authenticated
  USING (is_admin() OR (added_by = auth.uid() AND service = user_service()));

CREATE POLICY keywords_insert ON public.keywords
  FOR INSERT TO authenticated
  WITH CHECK (is_admin() OR (added_by = auth.uid() AND service = user_service()));

CREATE POLICY keywords_update ON public.keywords
  FOR UPDATE TO authenticated
  USING (is_admin() OR (added_by = auth.uid() AND service = user_service()));

CREATE POLICY keywords_delete ON public.keywords
  FOR DELETE TO authenticated
  USING (is_admin() OR (added_by = auth.uid() AND service = user_service()));

-- blogs (owner: created_by)
DROP POLICY IF EXISTS blogs_select ON public.blogs;
DROP POLICY IF EXISTS blogs_insert ON public.blogs;
DROP POLICY IF EXISTS blogs_update ON public.blogs;

CREATE POLICY blogs_select ON public.blogs
  FOR SELECT TO authenticated
  USING (is_admin() OR created_by = auth.uid());

CREATE POLICY blogs_insert ON public.blogs
  FOR INSERT TO authenticated
  WITH CHECK (is_admin() OR (created_by = auth.uid() AND service = user_service()));

CREATE POLICY blogs_update ON public.blogs
  FOR UPDATE TO authenticated
  USING (is_admin() OR created_by = auth.uid());

-- blogs_delete unchanged (already owner-scoped)

-- backlinks (owner: added_by)
DROP POLICY IF EXISTS backlinks_select ON public.backlinks;
DROP POLICY IF EXISTS backlinks_insert ON public.backlinks;
DROP POLICY IF EXISTS backlinks_update ON public.backlinks;
DROP POLICY IF EXISTS backlinks_delete ON public.backlinks;

CREATE POLICY backlinks_select ON public.backlinks
  FOR SELECT TO authenticated
  USING (is_admin() OR added_by = auth.uid());

CREATE POLICY backlinks_insert ON public.backlinks
  FOR INSERT TO authenticated
  WITH CHECK (is_admin() OR (added_by = auth.uid() AND service = user_service()));

CREATE POLICY backlinks_update ON public.backlinks
  FOR UPDATE TO authenticated
  USING (is_admin() OR added_by = auth.uid());

CREATE POLICY backlinks_delete ON public.backlinks
  FOR DELETE TO authenticated
  USING (is_admin() OR added_by = auth.uid());

-- page_rankings (owner: created_by)
DROP POLICY IF EXISTS page_rankings_select ON public.page_rankings;
DROP POLICY IF EXISTS page_rankings_insert ON public.page_rankings;
DROP POLICY IF EXISTS page_rankings_update ON public.page_rankings;
DROP POLICY IF EXISTS page_rankings_delete ON public.page_rankings;

CREATE POLICY page_rankings_select ON public.page_rankings
  FOR SELECT TO authenticated
  USING (is_admin() OR created_by = auth.uid());

CREATE POLICY page_rankings_insert ON public.page_rankings
  FOR INSERT TO authenticated
  WITH CHECK (is_admin() OR (created_by = auth.uid() AND service = user_service()));

CREATE POLICY page_rankings_update ON public.page_rankings
  FOR UPDATE TO authenticated
  USING (is_admin() OR created_by = auth.uid());

CREATE POLICY page_rankings_delete ON public.page_rankings
  FOR DELETE TO authenticated
  USING (is_admin() OR created_by = auth.uid());

-- weekly_reports (owner: created_by)
DROP POLICY IF EXISTS weekly_reports_select ON public.weekly_reports;
DROP POLICY IF EXISTS weekly_reports_update ON public.weekly_reports;

CREATE POLICY weekly_reports_select ON public.weekly_reports
  FOR SELECT TO authenticated
  USING (is_admin() OR created_by = auth.uid());

CREATE POLICY weekly_reports_update ON public.weekly_reports
  FOR UPDATE TO authenticated
  USING (is_admin() OR created_by = auth.uid());

-- weekly_reports_insert, weekly_reports_delete, weekly_reports_delete_own unchanged

-- tasks: members see/update only tasks assigned to them
DROP POLICY IF EXISTS tasks_select ON public.tasks;
DROP POLICY IF EXISTS tasks_update ON public.tasks;

CREATE POLICY tasks_select ON public.tasks
  FOR SELECT TO authenticated
  USING (is_admin() OR assigned_to = auth.uid());

CREATE POLICY tasks_update ON public.tasks
  FOR UPDATE TO authenticated
  USING (is_admin() OR assigned_to = auth.uid());

-- monthly_reports: admin only for members (read/write)
DROP POLICY IF EXISTS monthly_reports_select ON public.monthly_reports;
DROP POLICY IF EXISTS monthly_reports_member_write ON public.monthly_reports;
DROP POLICY IF EXISTS monthly_reports_member_update ON public.monthly_reports;

CREATE POLICY monthly_reports_select ON public.monthly_reports
  FOR SELECT TO authenticated
  USING (is_admin());
