"use client";

import { Suspense, useEffect, useState, useMemo } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ServiceBadge } from "@/components/Badge";
import UserAvatar from "@/components/UserAvatar";
import LoadingSpinner from "@/components/LoadingSpinner";
import { SERVICES, SERVICE_LABELS } from "@/lib/constants";
import { timeAgo, getWeekNumber, getDisplayName } from "@/lib/utils";

const ACTION_TYPES = ["keyword", "page", "backlink", "task", "report"];

function TeamActivityContent() {
  const searchParams = useSearchParams();
  const [activity, setActivity] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userFilter, setUserFilter] = useState(searchParams.get("user") || "all");
  const [actionFilter, setActionFilter] = useState("all");
  const [serviceFilter, setServiceFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [feedExpanded, setFeedExpanded] = useState(false);
  const [now] = useState(() => Date.now());
  const perPage = 20;
  const week = getWeekNumber();
  const supabase = createClient();

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [{ data: acts }, { data: profs }] = await Promise.all([
        supabase.from("activity_log").select("*").order("created_at", { ascending: false }).limit(200),
        supabase.from("profiles").select("*"),
      ]);
      setActivity(acts || []);
      setProfiles(profs || []);
      setLoading(false);
    };
    load();
  }, []);

  const members = profiles.filter((p) => p.role === "member");

  const filtered = useMemo(() => {
    return activity.filter((a) => {
      if (userFilter !== "all" && a.user_id !== userFilter) return false;
      if (serviceFilter !== "all" && a.service !== serviceFilter) return false;
      if (actionFilter !== "all") {
        const type = a.entity_type || "";
        if (actionFilter === "keyword" && !type.includes("keyword")) return false;
        if (actionFilter === "page" && type !== "page") return false;
        if (actionFilter === "backlink" && type !== "backlink") return false;
        if (actionFilter === "task" && type !== "task") return false;
        if (actionFilter === "report" && type !== "report") return false;
      }
      return true;
    });
  }, [activity, userFilter, actionFilter, serviceFilter]);

  const paged = filtered.slice(0, page * perPage);

  const memberStats = useMemo(() => {
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - 7);
    return members.map((m) => {
      const acts = activity.filter(
        (a) => a.user_id === m.id && new Date(a.created_at) >= weekStart
      );
      const tasksDone = acts.filter((a) => a.action === "completed_task").length;
      return {
        ...m,
        keywordsUpdated: acts.filter((a) => a.action.includes("keyword")).length,
        ranksImproved: acts.filter((a) => a.action === "updated_keyword").length,
        backlinksAdded: acts.filter((a) => a.action.includes("link")).length,
        tasksCompleted: tasksDone,
        lastActive: activity.find((a) => a.user_id === m.id)?.created_at,
      };
    });
  }, [members, activity]);

  const comparisonMetrics = [
    { key: "keywordsUpdated", label: "Keywords updated" },
    { key: "ranksImproved", label: "Ranks improved" },
    { key: "backlinksAdded", label: "Backlinks added" },
    { key: "tasksCompleted", label: "Tasks completed" },
  ];

  const statusDot = (last) => {
    if (!last) return "bg-red-500";
    const hrs = (now - new Date(last).getTime()) / 3600000;
    if (hrs < 24) return "bg-emerald-500";
    if (hrs < 72) return "bg-amber-500";
    return "bg-red-500";
  };

  const profileById = Object.fromEntries(profiles.map((p) => [p.id, p]));

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-10">
      <h1 className="text-2xl font-bold text-slate-900">Team Activity</h1>

      <section className="rounded-xl border bg-white shadow-sm">
        <button
          type="button"
          onClick={() => setFeedExpanded((open) => !open)}
          className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left"
          aria-expanded={feedExpanded}
        >
          <h2 className="text-lg font-semibold text-slate-900">Live activity feed</h2>
          {feedExpanded ? (
            <ChevronDown className="h-5 w-5 shrink-0 text-slate-500" aria-hidden />
          ) : (
            <ChevronRight className="h-5 w-5 shrink-0 text-slate-500" aria-hidden />
          )}
        </button>

        {feedExpanded && (
          <div className="border-t px-4 pb-4">
            <div className="mb-4 mt-4 flex flex-wrap gap-2">
              <select value={userFilter} onChange={(e) => { setUserFilter(e.target.value); setPage(1); }} className="text-sm">
                <option value="all">All users</option>
                {profiles.map((p) => (
                  <option key={p.id} value={p.id}>{getDisplayName(p)}</option>
                ))}
              </select>
              <select value={actionFilter} onChange={(e) => setActionFilter(e.target.value)} className="text-sm">
                <option value="all">All actions</option>
                {ACTION_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              <select value={serviceFilter} onChange={(e) => setServiceFilter(e.target.value)} className="text-sm">
                <option value="all">All services</option>
                {SERVICES.map((s) => (
                  <option key={s} value={s}>{SERVICE_LABELS[s]}</option>
                ))}
              </select>
            </div>

            <ul className="space-y-3 rounded-xl border border-slate-100 bg-slate-50/50 p-4">
              {paged.length === 0 ? (
                <li className="text-sm text-slate-500">No activity recorded yet.</li>
              ) : (
                paged.map((a) => (
                  <li key={a.id} className="flex items-start gap-3 border-b border-slate-100 pb-3 last:border-0">
                    <UserAvatar
                      profile={
                        profileById[a.user_id] || {
                          full_name: a.user_name,
                          email: a.user_name,
                        }
                      }
                      size="sm"
                    />
                    <div className="flex-1">
                      <p className="text-sm">
                        <span className="font-semibold">
                          {profileById[a.user_id]
                            ? getDisplayName(profileById[a.user_id])
                            : a.user_name}
                        </span>{" "}
                        {a.action.replace(/_/g, " ")}
                        {a.entity_name && (
                          <span className="text-slate-600"> — {a.entity_name}</span>
                        )}
                        {a.old_value != null && a.new_value != null && (
                          <span className="text-slate-500">
                            {" "}
                            ({a.old_value} → {a.new_value})
                          </span>
                        )}
                      </p>
                      <div className="mt-1 flex items-center gap-2">
                        {a.service && <ServiceBadge service={a.service} />}
                        <span className="text-xs text-slate-400">{timeAgo(a.created_at)}</span>
                      </div>
                    </div>
                  </li>
                ))
              )}
            </ul>
            {filtered.length > paged.length && (
              <button type="button" onClick={() => setPage((p) => p + 1)} className="btn-secondary mt-4">
                Load more
              </button>
            )}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold">Per member progress (Week {week})</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {memberStats.map((m) => (
            <div key={m.id} className="rounded-xl border bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <UserAvatar profile={m} size="md" />
                <div>
                  <p className="font-semibold">{getDisplayName(m)}</p>
                  {m.assigned_service && (
                    <p className="text-xs text-slate-500">
                      {SERVICE_LABELS[m.assigned_service]}
                    </p>
                  )}
                </div>
                <span className={`ml-auto h-3 w-3 rounded-full ${statusDot(m.lastActive)}`} title="Activity status" />
              </div>
              <dl className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between"><dt>Keywords updated</dt><dd className="font-medium">{m.keywordsUpdated}</dd></div>
                <div className="flex justify-between"><dt>Ranks improved</dt><dd className="font-medium">{m.ranksImproved}</dd></div>
                <div className="flex justify-between"><dt>Backlinks added</dt><dd className="font-medium">{m.backlinksAdded}</dd></div>
                <div className="flex justify-between"><dt>Tasks completed</dt><dd className="font-medium">{m.tasksCompleted}</dd></div>
              </dl>
              <p className="mt-3 text-xs text-slate-400">
                Last active: {m.lastActive ? timeAgo(m.lastActive) : "No activity"}
              </p>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full bg-emerald-500"
                  style={{ width: `${Math.min(100, (m.tasksCompleted / Math.max(m.tasksCompleted, 5)) * 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold">Weekly comparison</h2>
        <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
          <table className="w-full table-fixed text-sm">
            <colgroup>
              <col style={{ width: "35%" }} />
              {memberStats.map((m) => (
                <col
                  key={m.id}
                  style={{ width: `${65 / memberStats.length}%` }}
                />
              ))}
            </colgroup>
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3 text-left">Metric</th>
                {memberStats.map((m) => (
                  <th key={m.id} className="px-4 py-3 text-center">
                    <div className="mx-auto flex w-fit flex-col items-center justify-center gap-1.5">
                      <UserAvatar profile={m} size="xs" />
                      <span className="normal-case tracking-normal">
                        {getDisplayName(m)}
                      </span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {comparisonMetrics.map(({ key, label }) => {
                const vals = memberStats.map((m) => m[key]);
                const max = Math.max(...vals, 0);
                return (
                  <tr key={key}>
                    <td className="px-4 py-3 text-left font-medium">{label}</td>
                    {memberStats.map((m) => (
                      <td
                        key={m.id}
                        className={`px-4 py-3 text-center ${
                          m[key] === max && max > 0 ? "font-bold text-emerald-700" : ""
                        }`}
                      >
                        {m[key]}
                      </td>
                    ))}
                  </tr>
                );
              })}
              <tr>
                <td className="px-4 py-3 text-left font-medium">Last active</td>
                {memberStats.map((m) => (
                  <td key={m.id} className="px-4 py-3 text-center text-slate-600">
                    {m.lastActive ? timeAgo(m.lastActive) : "—"}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

export default function TeamActivityPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <TeamActivityContent />
    </Suspense>
  );
}
