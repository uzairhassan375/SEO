"use client";

import { useEffect, useState } from "react";
import { Printer, ChevronDown, ChevronRight } from "lucide-react";
import StatCard from "@/components/StatCard";
import LoadingSpinner from "@/components/LoadingSpinner";
import { ServiceBadge } from "@/components/Badge";
import { createClient } from "@/lib/supabase/client";
import { SERVICES, SERVICE_LABELS } from "@/lib/constants";
import { logActivity } from "@/lib/activity";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { getDisplayName, cn } from "@/lib/utils";
import { MonthPeriodPicker } from "@/components/ReportGuide";

export default function MonthlyReportPage() {
  const { profile, user } = useAuth();
  const { showToast } = useToast();
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [reports, setReports] = useState({});
  const [memberPerf, setMemberPerf] = useState([]);
  const [totals, setTotals] = useState(null);
  const [loading, setLoading] = useState(true);
  const [comments, setComments] = useState("");
  const [expandedEdits, setExpandedEdits] = useState({});
  const supabase = createClient();

  const toggleEdit = (service) => {
    setExpandedEdits((prev) => ({ ...prev, [service]: !prev[service] }));
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data: monthly } = await supabase
        .from("monthly_reports")
        .select("*")
        .eq("month", month)
        .eq("year", year);

      const map = {};
      SERVICES.forEach((s) => {
        map[s] =
          monthly?.find((r) => r.service === s) || {
            service: s,
            month,
            year,
            total_backlinks: 0,
            total_blogs: 0,
            keywords_in_top10: 0,
            keywords_improved: 0,
            top_keyword: "",
            top_keyword_rank: null,
            summary_notes: "",
          };
      });
      setReports(map);

      const agg = {
        total_backlinks: 0,
        total_blogs: 0,
        keywords_improved: 0,
        keywords_in_top10: 0,
      };
      Object.values(map).forEach((r) => {
        agg.total_backlinks += r.total_backlinks || 0;
        agg.total_blogs += r.total_blogs || 0;
        agg.keywords_improved += r.keywords_improved || 0;
        agg.keywords_in_top10 += r.keywords_in_top10 || 0;
      });
      setTotals(agg);

      const start = new Date(year, month - 1, 1).toISOString();
      const end = new Date(year, month, 0, 23, 59, 59).toISOString();
      const [{ data: acts }, { data: memberProfiles }] = await Promise.all([
        supabase
          .from("activity_log")
          .select("user_id, user_name, action")
          .gte("created_at", start)
          .lte("created_at", end),
        supabase.from("profiles").select("*").eq("role", "member"),
      ]);

      const perf = (memberProfiles || []).map((m) => {
        const userActs = (acts || []).filter((a) => a.user_id === m.id);
        return {
          id: m.id,
          name: getDisplayName(m),
          service: m.assigned_service,
          keywords: userActs.filter((a) => a.action.includes("keyword")).length,
          links: userActs.filter((a) => a.action.includes("link")).length,
          blogs: userActs.filter((a) => a.action.includes("blog")).length,
          tasks: userActs.filter((a) => a.action.includes("task")).length,
          total: userActs.length,
        };
      });
      setMemberPerf(perf);

      setComments(map.dropshipping?.summary_notes || "");
      setLoading(false);
    };
    load();
  }, [month, year, supabase]);

  const saveService = async (service) => {
    const r = reports[service];
    const payload = {
      month,
      year,
      service,
      total_backlinks: Number(r.total_backlinks) || 0,
      total_blogs: Number(r.total_blogs) || 0,
      keywords_in_top10: Number(r.keywords_in_top10) || 0,
      keywords_improved: Number(r.keywords_improved) || 0,
      top_keyword: r.top_keyword,
      top_keyword_rank: r.top_keyword_rank ? Number(r.top_keyword_rank) : null,
      summary_notes: comments,
      created_by: user.id,
    };

    const { data: existing } = await supabase
      .from("monthly_reports")
      .select("id")
      .eq("month", month)
      .eq("year", year)
      .eq("service", service)
      .maybeSingle();

    let error;
    if (existing) {
      ({ error } = await supabase.from("monthly_reports").update(payload).eq("id", existing.id));
    } else {
      ({ error } = await supabase.from("monthly_reports").insert(payload));
    }
    if (error) return showToast(error.message, "error");
    await logActivity({
      user: profile,
      action: "updated_monthly_report",
      entityType: "report",
      entityName: `${SERVICE_LABELS[service]} ${month}/${year}`,
      service,
    });
    showToast("Monthly report saved");
  };

  const print = () => window.print();
  const monthLabel = new Date(year, month - 1).toLocaleString("default", { month: "long" });
  const savedServices = SERVICES.filter((s) => reports[s]?.id).length;
  const goToThisMonth = () => {
    setMonth(new Date().getMonth() + 1);
    setYear(new Date().getFullYear());
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-8" id="monthly-report">
      <div className="no-print flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Monthly Report</h1>
          <p className="mt-1 text-sm text-slate-500">
            End-of-month roll-up: enter service totals → review team activity → export PDF.
          </p>
        </div>
        <button type="button" onClick={print} className="btn-primary flex items-center gap-2">
          <Printer className="h-4 w-4" /> Export PDF
        </button>
      </div>

      <MonthPeriodPicker
        month={month}
        year={year}
        onMonthChange={setMonth}
        onYearChange={setYear}
        onThisMonth={goToThisMonth}
      />

      <div
        className={cn(
          "no-print rounded-lg px-4 py-3 text-sm",
          savedServices === SERVICES.length
            ? "bg-emerald-50 text-emerald-900 ring-1 ring-emerald-200"
            : "bg-amber-50 text-amber-900 ring-1 ring-amber-200"
        )}
      >
        <span className="font-semibold">
          {monthLabel} {year} — data entry:
        </span>{" "}
        {savedServices} of {SERVICES.length} services saved.
        {savedServices < SERVICES.length && (
          <span className="block mt-1">
            Open section 2 below and save each service that is still missing.
          </span>
        )}
      </div>

      <div className="print-only mb-6">
        <h1 className="text-3xl font-bold">Zambeel SEO — Monthly Report</h1>
        <p className="text-slate-600">
          {monthLabel} {year}
        </p>
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold text-slate-900">
          1. Review service totals — {monthLabel} {year}
        </h2>
        <p className="mb-4 text-sm text-slate-500">
          Month-end numbers you enter for leadership (not the same as live Dashboard counts).
        </p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Total Backlinks" value={totals?.total_backlinks ?? 0} />
          <StatCard label="Blogs Published" value={totals?.total_blogs ?? 0} />
          <StatCard label="Keywords Improved" value={totals?.keywords_improved ?? 0} />
          <StatCard label="Keywords in Top 10" value={totals?.keywords_in_top10 ?? 0} />
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
        <table className="w-full table-fixed text-sm">
          <colgroup>
            <col style={{ width: "18%" }} />
            <col style={{ width: "12%" }} />
            <col style={{ width: "10%" }} />
            <col style={{ width: "12%" }} />
            <col style={{ width: "12%" }} />
            <col style={{ width: "24%" }} />
            <col style={{ width: "12%" }} />
          </colgroup>
          <thead className="border-b bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3 text-center">Service</th>
              <th className="px-4 py-3 text-center">Backlinks</th>
              <th className="px-4 py-3 text-center">Blogs</th>
              <th className="px-4 py-3 text-center">Top 10 KWs</th>
              <th className="px-4 py-3 text-center">KW Improved</th>
              <th className="px-4 py-3 text-center">Top Keyword</th>
              <th className="px-4 py-3 text-center">Rank</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {SERVICES.map((s) => {
              const r = reports[s];
              return (
                <tr key={s}>
                  <td className="px-4 py-3 text-center">
                    <div className="mx-auto flex w-fit flex-col items-center gap-1">
                      <ServiceBadge service={s} />
                      <span className="text-xs font-medium normal-case text-slate-700">
                        {SERVICE_LABELS[s]}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">{r.total_backlinks}</td>
                  <td className="px-4 py-3 text-center">{r.total_blogs}</td>
                  <td className="px-4 py-3 text-center">{r.keywords_in_top10}</td>
                  <td className="px-4 py-3 text-center">{r.keywords_improved}</td>
                  <td className="px-4 py-3 text-center">{r.top_keyword || "—"}</td>
                  <td className="px-4 py-3 text-center">{r.top_keyword_rank ?? "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="no-print space-y-3">
        <h2 className="text-lg font-semibold text-slate-900">2. Enter / edit service totals</h2>
        <p className="text-sm text-slate-500">
          Expand each service, fill numbers from your month-end review, then click Save.
        </p>
        {SERVICES.map((s) => (
          <div
            key={s}
            className={cn(
              "rounded-xl border bg-white shadow-sm",
              reports[s]?.id ? "border-emerald-200" : "border-amber-200"
            )}
          >
            <button
              type="button"
              onClick={() => toggleEdit(s)}
              className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left"
              aria-expanded={!!expandedEdits[s]}
            >
              <div>
                <h3 className="font-semibold text-slate-900">{SERVICE_LABELS[s]}</h3>
                <p
                  className={cn(
                    "text-xs font-medium",
                    reports[s]?.id ? "text-emerald-700" : "text-amber-700"
                  )}
                >
                  {reports[s]?.id ? "Saved for this month" : "Not saved yet — click to enter"}
                </p>
              </div>
              {expandedEdits[s] ? (
                <ChevronDown className="h-5 w-5 shrink-0 text-slate-500" aria-hidden />
              ) : (
                <ChevronRight className="h-5 w-5 shrink-0 text-slate-500" aria-hidden />
              )}
            </button>
            {expandedEdits[s] && (
              <div className="border-t px-4 pb-4">
                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  {["total_backlinks", "total_blogs", "keywords_in_top10", "keywords_improved"].map(
                    (f) => (
                      <div key={f}>
                        <label className="text-xs capitalize text-slate-500">
                          {f.replace(/_/g, " ")}
                        </label>
                        <input
                          type="number"
                          value={reports[s][f] ?? 0}
                          onChange={(e) =>
                            setReports({
                              ...reports,
                              [s]: { ...reports[s], [f]: e.target.value },
                            })
                          }
                          className="w-full"
                        />
                      </div>
                    )
                  )}
                  <div>
                    <label className="text-xs text-slate-500">Top keyword</label>
                    <input
                      value={reports[s].top_keyword || ""}
                      onChange={(e) =>
                        setReports({ ...reports, [s]: { ...reports[s], top_keyword: e.target.value } })
                      }
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500">Top rank</label>
                    <input
                      type="number"
                      value={reports[s].top_keyword_rank ?? ""}
                      onChange={(e) =>
                        setReports({
                          ...reports,
                          [s]: { ...reports[s], top_keyword_rank: e.target.value },
                        })
                      }
                      className="w-full"
                    />
                  </div>
                </div>
                <button type="button" onClick={() => saveService(s)} className="btn-primary mt-3 text-sm">
                  Save {SERVICE_LABELS[s]}
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold">
          3. Member activity — {monthLabel} {year}
        </h2>
        <p className="mb-4 text-sm text-slate-500">
          Automatic from the activity log (who did what in the app this month). Compare who was most
          active — higher &quot;Total actions&quot; means more work logged. This does not replace weekly
          submitted numbers.
        </p>
        {memberPerf.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 py-8 text-center text-sm text-slate-500">
            No team members found.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
            <table className="w-full table-fixed text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3 text-center">Member</th>
                  <th className="px-4 py-3 text-center">Service</th>
                  <th className="px-4 py-3 text-center">Keywords</th>
                  <th className="px-4 py-3 text-center">Links</th>
                  <th className="px-4 py-3 text-center">Blogs</th>
                  <th className="px-4 py-3 text-center">Tasks</th>
                  <th className="px-4 py-3 text-center">Total actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {memberPerf.map((m) => (
                  <tr key={m.id}>
                    <td className="px-4 py-3 text-center font-medium">{m.name}</td>
                    <td className="px-4 py-3 text-center">
                      {m.service ? SERVICE_LABELS[m.service] : "—"}
                    </td>
                    <td className="px-4 py-3 text-center">{m.keywords}</td>
                    <td className="px-4 py-3 text-center">{m.links}</td>
                    <td className="px-4 py-3 text-center">{m.blogs}</td>
                    <td className="px-4 py-3 text-center">{m.tasks}</td>
                    <td className="px-4 py-3 text-center font-semibold">{m.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="no-print">
        <h2 className="mb-2 text-lg font-semibold text-slate-900">4. Comments for leadership</h2>
        <p className="mb-3 text-sm text-slate-500">
          Summary notes for the month. Save any service in section 2 to store comments with the report.
        </p>
        <textarea
          value={comments}
          onChange={(e) => setComments(e.target.value)}
          className="w-full max-w-2xl"
          rows={4}
          placeholder="e.g. 3PL had strongest backlink month. 360 needs more blog output next month…"
        />
      </div>
    </div>
  );
}
