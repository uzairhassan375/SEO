"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  Search,
  TrendingUp,
  Link2,
  BookOpen,
  FileText,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
import StatCard from "@/components/StatCard";
import LoadingSpinner from "@/components/LoadingSpinner";
import { ServiceBadge, StatusBadge } from "@/components/Badge";
import { useAuth } from "@/contexts/AuthContext";
import UserAvatar from "@/components/UserAvatar";
import { SERVICES, SERVICE_LABELS, BLOG_STATUSES } from "@/lib/constants";
import { timeAgo, getDisplayName, getWeekNumber, isTop10Rank } from "@/lib/utils";

const emptyStats = () => ({
  totalKeywords: 0,
  top10: 0,
  liveBacklinks: 0,
  totalBlogs: 0,
  byService: Object.fromEntries(
    SERVICES.map((s) => [
      s,
      { keywords: 0, top10: 0, live: 0, blogs: 0 },
    ])
  ),
});

export default function DashboardPage() {
  const { profile, isAdmin, user, supabase, loading: authLoading } = useAuth();
  const [stats, setStats] = useState(null);
  const [activity, setActivity] = useState([]);
  const [profileMap, setProfileMap] = useState({});
  const [myBlogs, setMyBlogs] = useState([]);
  const [weeklySubmitted, setWeeklySubmitted] = useState(null);
  const [loading, setLoading] = useState(true);
  const [needsService, setNeedsService] = useState(false);

  const serviceFilter = useMemo(() => {
    if (isAdmin) return null;
    return profile?.assigned_service;
  }, [isAdmin, profile]);

  const myBlogStats = useMemo(() => {
    const byStatus = Object.fromEntries(BLOG_STATUSES.map((s) => [s, 0]));
    myBlogs.forEach((b) => {
      if (byStatus[b.status] !== undefined) byStatus[b.status]++;
    });
    return {
      total: myBlogs.length,
      byStatus,
      totalWords: myBlogs.reduce((sum, b) => sum + (b.word_count || 0), 0),
      recent: myBlogs.slice(0, 5),
    };
  }, [myBlogs]);

  useEffect(() => {
    if (authLoading) return;

    if (!user || !supabase) {
      setLoading(false);
      return;
    }

    if (!isAdmin && !profile) {
      return;
    }

    if (!isAdmin && !profile?.assigned_service) {
      setNeedsService(true);
      setStats(emptyStats());
      setActivity([]);
      setMyBlogs([]);
      setWeeklySubmitted(null);
      setLoading(false);
      return;
    }

    setNeedsService(false);

    const load = async () => {
      setLoading(true);
      const week = getWeekNumber();
      const year = new Date().getFullYear();

      let kwQ = supabase.from("keywords").select("id, current_rank, service");
      let blQ = supabase.from("backlinks").select("id, status, service");
      let blogQ = supabase.from("blogs").select("id, status, service, created_by");

      if (serviceFilter) {
        kwQ = kwQ.eq("service", serviceFilter);
        blQ = blQ.eq("service", serviceFilter);
        blogQ = blogQ.eq("service", serviceFilter);
      }

      if (!isAdmin && user?.id) {
        kwQ = kwQ.eq("added_by", user.id);
        blQ = blQ.eq("added_by", user.id);
        blogQ = blogQ.eq("created_by", user.id);
      }

      let actQ = supabase
        .from("activity_log")
        .select("id, user_id, user_name, action, entity_name, service, created_at")
        .order("created_at", { ascending: false })
        .limit(8);
      if (!isAdmin) actQ = actQ.eq("user_id", user.id);

      const profileQ = supabase
        .from("profiles")
        .select("id, full_name, email, avatar_url");

      const extraQueries = [];
      if (!isAdmin) {
        extraQueries.push(
          supabase
            .from("blogs")
            .select("id, title, status, word_count, country, created_at, service")
            .eq("created_by", user.id)
            .order("created_at", { ascending: false }),
          supabase
            .from("weekly_reports")
            .select("id")
            .eq("service", profile.assigned_service)
            .eq("created_by", user.id)
            .eq("week_number", week)
            .eq("year", year)
            .maybeSingle()
        );
      }

      const [kw, bl, blogsRes, act, profs, ...memberExtra] = await Promise.all([
        kwQ,
        blQ,
        blogQ,
        actQ,
        profileQ,
        ...extraQueries,
      ]);

      const keywords = kw.data || [];
      const backlinks = bl.data || [];
      const blogs = blogsRes.data || [];

      setStats({
        totalKeywords: keywords.length,
        top10: keywords.filter((k) => isTop10Rank(k.current_rank)).length,
        liveBacklinks: backlinks.filter((b) => b.status === "live").length,
        totalBlogs: blogs.length,
        byService: Object.fromEntries(
          SERVICES.map((s) => [
            s,
            {
              keywords: keywords.filter((k) => k.service === s).length,
              top10: keywords.filter((k) => k.service === s && isTop10Rank(k.current_rank)).length,
              live: backlinks.filter((b) => b.service === s && b.status === "live").length,
              blogs: blogs.filter((b) => b.service === s).length,
            },
          ])
        ),
      });

      setActivity(act.data || []);
      setProfileMap(Object.fromEntries((profs.data || []).map((p) => [p.id, p])));

      if (!isAdmin && memberExtra.length >= 2) {
        setMyBlogs(memberExtra[0].data || []);
        setWeeklySubmitted(Boolean(memberExtra[1].data?.id));
      } else {
        setMyBlogs([]);
        setWeeklySubmitted(null);
      }

      setLoading(false);
    };
    load();
  }, [authLoading, user, profile, isAdmin, serviceFilter, supabase]);

  const visibleServices = isAdmin
    ? SERVICES
    : profile?.assigned_service
      ? [profile.assigned_service]
      : [];

  if (loading || authLoading) return <LoadingSpinner />;

  if (!isAdmin && profile?.assigned_service) {
    const svc = profile.assigned_service;
    return (
      <div className="space-y-8">
        {needsService && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900">
            Your account has no service assigned yet. Ask an admin to set your service in{" "}
            <strong>Settings → Team Management</strong>.
          </div>
        )}

        <Link
          href="/weekly-report"
          className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-[#1e3a5f]/25 bg-[#1e3a5f] px-6 py-5 text-white shadow-sm transition hover:bg-[#162d4a]"
        >
          <div className="flex items-center gap-3">
            <FileText className="h-8 w-8 shrink-0 opacity-90" />
            <div>
              <p className="font-semibold">Submit your weekly report</p>
              <p className="text-sm text-white/80">
                Week {getWeekNumber()} — enter what you completed this week.
              </p>
            </div>
          </div>
          <span className="inline-flex items-center gap-2 text-sm font-medium">
            {weeklySubmitted ? (
              <>
                <CheckCircle2 className="h-4 w-4" /> Submitted
              </>
            ) : (
              <>
                Submit now <ArrowRight className="h-4 w-4" />
              </>
            )}
          </span>
        </Link>

        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Dashboard</h1>
          <p className="mt-1 text-slate-500">
            Live analytics for <strong>{SERVICE_LABELS[svc]}</strong> — your keywords, links,
            and blogs. This is not your weekly/monthly report; use{" "}
            <Link href="/weekly-report" className="text-[#1e3a5f] underline">
              Weekly Report
            </Link>{" "}
            to submit numbers.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Service keywords" value={stats?.totalKeywords ?? 0} icon={Search} />
          <StatCard label="Top 10 ranks" value={stats?.top10 ?? 0} icon={TrendingUp} />
          <StatCard label="Live backlinks" value={stats?.liveBacklinks ?? 0} icon={Link2} />
          <StatCard label="My blogs" value={myBlogStats.total} icon={BookOpen} />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">My analytics</h2>
              <ServiceBadge service={svc} />
            </div>
            <p className="mb-4 text-sm text-slate-500">
              Current totals for your service ({SERVICE_LABELS[svc]}).
            </p>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between border-b border-slate-100 pb-2">
                <dt className="text-slate-500">Keywords tracked</dt>
                <dd className="font-semibold">{stats?.totalKeywords ?? 0}</dd>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-2">
                <dt className="text-slate-500">Keywords in top 10</dt>
                <dd className="font-semibold">{stats?.top10 ?? 0}</dd>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-2">
                <dt className="text-slate-500">Live backlinks</dt>
                <dd className="font-semibold">{stats?.liveBacklinks ?? 0}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Weekly report (this week)</dt>
                <dd className="font-semibold">
                  {weeklySubmitted ? (
                    <span className="text-emerald-700">Submitted</span>
                  ) : (
                    <span className="text-amber-700">Not submitted</span>
                  )}
                </dd>
              </div>
            </dl>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link href="/keywords" className="btn-secondary text-xs">
                Keywords
              </Link>
              <Link href="/links" className="btn-secondary text-xs">
                Links
              </Link>
              <Link href="/blogs" className="btn-secondary text-xs">
                Blogs
              </Link>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">My blogs</h2>
              <Link href="/blogs" className="text-sm font-medium text-[#1e3a5f] hover:underline">
                Manage blogs →
              </Link>
            </div>
            <p className="mb-4 text-sm text-slate-500">
              Blogs you personally added ({myBlogStats.total} total
              {myBlogStats.totalWords > 0 ? `, ${myBlogStats.totalWords.toLocaleString()} words` : ""}
              ).
            </p>
            <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {BLOG_STATUSES.map((status) => (
                <div key={status} className="rounded-lg bg-slate-50 px-3 py-2 text-center">
                  <p className="text-lg font-bold text-slate-900">
                    {myBlogStats.byStatus[status]}
                  </p>
                  <p className="text-xs capitalize text-slate-500">{status}</p>
                </div>
              ))}
            </div>
            {myBlogStats.recent.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 py-8 text-center">
                <BookOpen className="mx-auto h-8 w-8 text-slate-300" />
                <p className="mt-2 text-sm text-slate-500">No blogs yet.</p>
                <Link href="/blogs" className="btn-primary mt-3 inline-flex text-sm">
                  Add your first blog
                </Link>
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {myBlogStats.recent.map((b) => (
                  <li key={b.id} className="flex items-start justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-slate-900">{b.title}</p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {b.country || "—"}
                        {b.word_count ? ` · ${b.word_count} words` : ""}
                        {b.created_at ? ` · ${timeAgo(b.created_at)}` : ""}
                      </p>
                    </div>
                    <StatusBadge status={b.status} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">My recent activity</h2>
          {activity.length === 0 ? (
            <p className="text-sm text-slate-500">No activity logged yet.</p>
          ) : (
            <ul className="space-y-3">
              {activity.map((a) => (
                <li key={a.id} className="flex items-start gap-3 text-sm">
                  <UserAvatar profile={profile} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p>
                      <span className="font-medium text-slate-800">You</span>
                      <span className="text-slate-600"> — {a.action.replace(/_/g, " ")}</span>
                      {a.entity_name && (
                        <span className="text-slate-500"> ({a.entity_name})</span>
                      )}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">{timeAgo(a.created_at)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-500">Overall performance across all services</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Keywords" value={stats?.totalKeywords ?? 0} icon={Search} />
        <StatCard label="Ranking Top 10" value={stats?.top10 ?? 0} icon={TrendingUp} />
        <StatCard label="Live Backlinks" value={stats?.liveBacklinks ?? 0} icon={Link2} />
        <StatCard label="Total Blogs" value={stats?.totalBlogs ?? 0} icon={BookOpen} />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {visibleServices.map((s) => (
          <div
            key={s}
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-semibold text-slate-900">{SERVICE_LABELS[s]}</h3>
              <ServiceBadge service={s} />
            </div>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-slate-500">Keywords</dt>
                <dd className="font-medium">{stats?.byService[s]?.keywords ?? 0}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Top 10 ranks</dt>
                <dd className="font-medium">{stats?.byService[s]?.top10 ?? 0}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Live links</dt>
                <dd className="font-medium">{stats?.byService[s]?.live ?? 0}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Total blogs</dt>
                <dd className="font-medium">{stats?.byService[s]?.blogs ?? 0}</dd>
              </div>
            </dl>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Recent activity</h2>
        {activity.length === 0 ? (
          <p className="text-sm text-slate-500">No recent activity yet.</p>
        ) : (
          <ul className="space-y-3">
            {activity.map((a) => (
              <li key={a.id} className="flex items-start gap-3 text-sm">
                <UserAvatar
                  profile={profileMap[a.user_id] || { full_name: a.user_name, email: a.user_name }}
                  size="sm"
                />
                <div className="min-w-0 flex-1">
                  <p>
                    <span className="font-medium text-slate-800">
                      {profileMap[a.user_id]
                        ? getDisplayName(profileMap[a.user_id])
                        : a.user_name}
                    </span>
                    <span className="text-slate-600"> — {a.action.replace(/_/g, " ")}</span>
                    {a.entity_name && (
                      <span className="text-slate-500"> ({a.entity_name})</span>
                    )}
                  </p>
                  <div className="mt-1 flex items-center gap-2">
                    {a.service && <ServiceBadge service={a.service} />}
                    <span className="text-slate-400">{timeAgo(a.created_at)}</span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
