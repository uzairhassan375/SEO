"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getWeekRange, toDateKey } from "@/lib/utils";

const EMPTY = {
  backlinks_added: 0,
  blogs_published: 0,
  keywords_improved: 0,
  guest_posts: 0,
  on_page_fixes: 0,
};

/**
 * Weekly report numbers derived from what the user actually logged in the app,
 * so nobody has to type them in:
 *
 *  backlinks_added   backlinks they added that week (type = backlink)
 *  guest_posts       backlinks they added that week (type = guest_post)
 *  blogs_published   their blogs that went published/live that week
 *  keywords_improved keyword rank updates that week where the rank got better
 *  on_page_fixes     page rankings they logged for that week
 */
export function useWeeklyMetrics(userId, week, year) {
  const [metrics, setMetrics] = useState(EMPTY);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const fetchMetrics = useCallback(async () => {
    if (!userId) {
      setMetrics(EMPTY);
      setLoading(false);
      return;
    }

    setLoading(true);
    const { start, end } = getWeekRange(week, year);
    const startKey = toDateKey(start);
    const endKey = toDateKey(end);
    const startIso = start.toISOString();
    const endIso = end.toISOString();

    const [links, blogs, ranks, keywordActs] = await Promise.all([
      supabase
        .from("backlinks")
        .select("id, type, date_added")
        .eq("added_by", userId)
        .gte("date_added", startKey)
        .lte("date_added", endKey),
      supabase
        .from("blogs")
        .select("id, status, published_at, created_at, updated_at")
        .eq("created_by", userId)
        .in("status", ["published", "live"]),
      supabase
        .from("page_rankings")
        .select("id")
        .eq("created_by", userId)
        .eq("week_number", week)
        .eq("year", year),
      supabase
        .from("activity_log")
        .select("id, action, old_value, new_value, created_at")
        .eq("user_id", userId)
        .eq("action", "updated_keyword")
        .gte("created_at", startIso)
        .lte("created_at", endIso),
    ]);

    const linkRows = links.data || [];

    // published_at is the source of truth; fall back to when the row was last touched
    const blogsInWeek = (blogs.data || []).filter((b) => {
      const stamp = b.published_at || b.updated_at || b.created_at;
      if (!stamp) return false;
      const key = toDateKey(stamp);
      return key >= startKey && key <= endKey;
    });

    const improved = (keywordActs.data || []).filter((a) => {
      const before = Number(a.old_value);
      const after = Number(a.new_value);
      if (!Number.isFinite(after)) return false;
      // no previous rank but now ranking, or moved closer to position 1
      if (!Number.isFinite(before) || before === 0) return after > 0;
      return after > 0 && after < before;
    });

    setMetrics({
      backlinks_added: linkRows.filter((l) => l.type !== "guest_post").length,
      guest_posts: linkRows.filter((l) => l.type === "guest_post").length,
      blogs_published: blogsInWeek.length,
      keywords_improved: improved.length,
      on_page_fixes: (ranks.data || []).length,
    });
    setLoading(false);
  }, [supabase, userId, week, year]);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  return { metrics, loading, refetch: fetchMetrics };
}
