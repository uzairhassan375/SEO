"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { ChevronDown, Pencil, Trash2, Plus, RefreshCw, Sparkles } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { createClient } from "@/lib/supabase/client";
import { SERVICES, SERVICE_LABELS } from "@/lib/constants";
import { logActivity } from "@/lib/activity";
import { getWeekNumber, cn, getDisplayName } from "@/lib/utils";
import { useWeeklyMetrics } from "@/hooks/useWeeklyMetrics";
import LoadingSpinner from "@/components/LoadingSpinner";
import { ServiceBadge } from "@/components/Badge";
import { PeriodPicker } from "@/components/ReportGuide";

const METRIC_FIELDS = [
  { key: "backlinks_added", label: "Backlinks added" },
  { key: "blogs_published", label: "Blogs published" },
  { key: "keywords_improved", label: "Keywords improved" },
  { key: "guest_posts", label: "Guest posts" },
  { key: "on_page_fixes", label: "On-page fixes" },
];

const emptyReport = (service, week, year) => ({
  service,
  week_number: week,
  year,
  backlinks_added: 0,
  blogs_published: 0,
  keywords_improved: 0,
  guest_posts: 0,
  on_page_fixes: 0,
  notes: "",
});

function ReportForm({
  report,
  onChange,
  onSave,
  onDelete,
  saving,
  showDelete,
  saveLabel = "Save changes",
}) {
  return (
    <div className="space-y-4 border-t border-slate-100 bg-slate-50/50 px-5 py-5">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {METRIC_FIELDS.map(({ key, label }) => (
          <div key={key}>
            <label className="mb-1 block text-sm text-slate-600">{label}</label>
            <input
              type="number"
              min={0}
              value={report[key] ?? 0}
              onChange={(e) => onChange({ ...report, [key]: e.target.value })}
              className="w-full"
            />
          </div>
        ))}
        <div className="sm:col-span-2 lg:col-span-3">
          <label className="mb-1 block text-sm font-medium text-slate-700">Notes</label>
          <textarea
            value={report.notes || ""}
            onChange={(e) => onChange({ ...report, notes: e.target.value })}
            className="w-full"
            rows={3}
          />
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="btn-primary flex items-center gap-2 text-sm"
        >
          <Pencil className="h-4 w-4" />
          {saving ? "Saving…" : saveLabel}
        </button>
        {showDelete && onDelete && (
          <button
            type="button"
            onClick={onDelete}
            disabled={saving}
            className="btn-secondary flex items-center gap-2 text-sm text-red-600"
          >
            <Trash2 className="h-4 w-4" /> Remove report
          </button>
        )}
      </div>
    </div>
  );
}

export default function WeeklyReportPage() {
  const { profile, isAdmin, user, loading: authLoading } = useAuth();
  const { showToast } = useToast();
  const [week, setWeek] = useState(getWeekNumber());
  const [year, setYear] = useState(new Date().getFullYear());
  const [reports, setReports] = useState([]);
  const [members, setMembers] = useState([]);
  const [expandedId, setExpandedId] = useState(null);
  const [editDraft, setEditDraft] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showNewForm, setShowNewForm] = useState(false);
  const [showAllHistory, setShowAllHistory] = useState(false);
  const [newReport, setNewReport] = useState(() =>
    emptyReport("dropshipping", getWeekNumber(), new Date().getFullYear())
  );
  const supabase = createClient();

  const memberService = profile?.assigned_service;

  const fetchReports = useCallback(async () => {
    let q = supabase
      .from("weekly_reports")
      .select("*")
      .order("year", { ascending: false })
      .order("week_number", { ascending: false });
    if (!isAdmin && user?.id) {
      q = q.eq("created_by", user.id);
    }
    const { data, error } = await q;
    if (error) {
      showToast(error.message, "error");
      return [];
    }
    return data || [];
  }, [supabase, isAdmin, user, showToast]);

  useEffect(() => {
    if (authLoading) return;
    if (!profile) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const load = async () => {
      const data = await fetchReports();
      setReports(data);
      if (isAdmin) {
        const { data: memberRows } = await supabase
          .from("profiles")
          .select("*")
          .eq("role", "member");
        setMembers(memberRows || []);
      }
      setLoading(false);
    };
    load();
  }, [authLoading, profile, fetchReports, isAdmin, supabase]);

  const reportForWeek = useMemo(
    () => reports.filter((r) => r.week_number === week && r.year === year),
    [reports, week, year]
  );

  const memberWeeklyPerf = useMemo(() => {
    if (!isAdmin) return [];
    return members.map((m) => {
      const report = reportForWeek.find((r) => r.service === m.assigned_service);
      const metrics = Object.fromEntries(
        METRIC_FIELDS.map(({ key }) => [key, report ? Number(report[key]) || 0 : 0])
      );
      const total = METRIC_FIELDS.reduce((sum, { key }) => sum + metrics[key], 0);
      return {
        id: m.id,
        name: getDisplayName(m),
        service: m.assigned_service,
        report,
        ...metrics,
        total,
        submitted: Boolean(report?.id),
      };
    });
  }, [isAdmin, members, reportForWeek]);

  const serviceWeekSummary = useMemo(() => {
    return SERVICES.map((s) => {
      const report = reportForWeek.find((r) => r.service === s);
      const metrics = Object.fromEntries(
        METRIC_FIELDS.map(({ key }) => [key, report ? Number(report[key]) || 0 : 0])
      );
      const total = METRIC_FIELDS.reduce((sum, { key }) => sum + metrics[key], 0);
      return { service: s, report, submitted: Boolean(report?.id), ...metrics, total };
    });
  }, [reportForWeek]);

  const submittedCount = memberWeeklyPerf.filter((m) => m.submitted).length;
  const historyList = showAllHistory ? reports : reportForWeek;

  const goToThisWeek = () => {
    setWeek(getWeekNumber());
    setYear(new Date().getFullYear());
  };

  const memberForm = useMemo(() => {
    if (isAdmin || !memberService) return null;
    return (
      reports.find(
        (r) =>
          r.week_number === week &&
          r.year === year &&
          r.service === memberService &&
          r.created_by === user?.id
      ) || emptyReport(memberService, week, year)
    );
  }, [reports, week, year, memberService, isAdmin]);

  const scrollToSubmit = () => {
    document.getElementById("submit-weekly-report")?.scrollIntoView({ behavior: "smooth" });
  };

  const [memberDraft, setMemberDraft] = useState(null);

  const {
    metrics: autoMetrics,
    loading: metricsLoading,
    refetch: refetchMetrics,
  } = useWeeklyMetrics(isAdmin ? null : user?.id, week, year);

  useEffect(() => {
    if (memberForm) setMemberDraft({ ...memberForm });
  }, [memberForm]);

  // numbers always come from the user's own logged work — never typed in.
  // memberForm is a dep so a freshly loaded/saved report gets the live counts too.
  useEffect(() => {
    if (isAdmin || metricsLoading) return;
    setMemberDraft((draft) => (draft ? { ...draft, ...autoMetrics } : draft));
  }, [isAdmin, autoMetrics, metricsLoading, memberForm]);

  const toggleExpand = (report) => {
    if (expandedId === report.id) {
      setExpandedId(null);
      setEditDraft(null);
      return;
    }
    setExpandedId(report.id);
    setEditDraft({ ...report });
  };

  const buildPayload = (r) => ({
    week_number: Number(r.week_number),
    year: Number(r.year),
    service: r.service,
    backlinks_added: Number(r.backlinks_added) || 0,
    blogs_published: Number(r.blogs_published) || 0,
    keywords_improved: Number(r.keywords_improved) || 0,
    guest_posts: Number(r.guest_posts) || 0,
    on_page_fixes: Number(r.on_page_fixes) || 0,
    notes: r.notes || "",
  });

  const saveReport = async (draft, isNew = false) => {
    setSaving(true);
    const payload = buildPayload(draft);

    let error;
    if (draft.id && !isNew) {
      ({ error } = await supabase
        .from("weekly_reports")
        .update(payload)
        .eq("id", draft.id));
    } else {
      ({ error } = await supabase
        .from("weekly_reports")
        .insert({ ...payload, created_by: user.id }));
    }

    setSaving(false);
    if (error) return showToast(error.message, "error");

    await logActivity({
      user: profile,
      action: isNew ? "submitted_weekly_report" : "updated_weekly_report",
      entityType: "report",
      entityName: `Week ${payload.week_number} ${SERVICE_LABELS[payload.service]}`,
      service: payload.service,
    });

    showToast(isNew ? "Report created" : "Report updated");
    const data = await fetchReports();
    setReports(data);
    setExpandedId(null);
    setEditDraft(null);
    setShowNewForm(false);
  };

  const canDeleteReport = (report) => {
    if (!report?.id) return false;
    if (isAdmin) return true;
    if (!memberService || report.service !== memberService) return false;
    return report.created_by === user?.id;
  };

  const deleteReport = async (report) => {
    if (!canDeleteReport(report)) {
      showToast("You can only delete weekly reports you submitted.", "error");
      return;
    }
    if (
      !confirm(
        `Remove your Week ${report.week_number}, ${report.year} report for ${SERVICE_LABELS[report.service]}?`
      )
    ) {
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("weekly_reports").delete().eq("id", report.id);
    setSaving(false);
    if (error) return showToast(error.message, "error");

    await logActivity({
      user: profile,
      action: "deleted_weekly_report",
      entityType: "report",
      entityName: `Week ${report.week_number} ${SERVICE_LABELS[report.service]}`,
      service: report.service,
    });

    showToast("Weekly report removed");
    const data = await fetchReports();
    setReports(data);
    setExpandedId(null);
    setEditDraft(null);
    if (
      !isAdmin &&
      memberDraft?.id === report.id &&
      memberService
    ) {
      setMemberDraft(emptyReport(memberService, week, year));
    }
  };

  const saveMemberReport = async () => {
    if (!memberDraft) return;
    await saveReport(memberDraft, !memberDraft.id);
  };

  if (loading || authLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Weekly Report</h1>
          <p className="mt-1 text-sm text-slate-500">
            {isAdmin
              ? "Review team submissions and edit service reports."
              : "Your numbers are pulled from your own work — pick the week and submit."}
          </p>
        </div>
        {isAdmin ? (
          <button
            type="button"
            onClick={() => {
              setShowNewForm(!showNewForm);
              setNewReport(emptyReport("dropshipping", week, year));
            }}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Add / edit report
          </button>
        ) : memberService ? (
          <button type="button" onClick={scrollToSubmit} className="btn-primary flex items-center gap-2">
            <Pencil className="h-4 w-4" />
            Submit weekly report
          </button>
        ) : null}
      </div>

      {!isAdmin && !memberService && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900">
          No service is assigned to your account. Ask an admin to set your service in{" "}
          <strong>Settings → Team Management</strong> before you can submit a weekly report.
        </div>
      )}

      <PeriodPicker
        week={week}
        year={year}
        onWeekChange={setWeek}
        onYearChange={setYear}
        onThisPeriod={goToThisWeek}
        periodLabel="week"
      />

      {isAdmin && (
        <div
          className={cn(
            "rounded-lg px-4 py-3 text-sm",
            submittedCount === members.length && members.length > 0
              ? "bg-emerald-50 text-emerald-900 ring-1 ring-emerald-200"
              : "bg-amber-50 text-amber-900 ring-1 ring-amber-200"
          )}
        >
          <span className="font-semibold">Team submissions for Week {week}, {year}:</span>{" "}
          {submittedCount} of {members.length} members have a report for their service.
          {submittedCount < members.length && (
            <span className="block mt-1 text-amber-800">
              Follow up with members marked “Not submitted” below.
            </span>
          )}
        </div>
      )}

      {isAdmin && (
      <div>
        <h2 className="mb-3 text-lg font-semibold text-slate-900">
          1. This week by service
        </h2>
        <p className="mb-4 text-sm text-slate-500">
          One report per service (Dropshipping, 3PL, 360). Totals for Week {week}, {year}.
        </p>
        <div className="grid gap-4 md:grid-cols-3">
          {serviceWeekSummary.map(({ service, submitted, total, backlinks_added, blogs_published, keywords_improved }) => (
            <div
              key={service}
              className={cn(
                "rounded-xl border bg-white p-4 shadow-sm",
                submitted ? "border-emerald-200" : "border-amber-200"
              )}
            >
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-semibold">{SERVICE_LABELS[service]}</h3>
                <ServiceBadge service={service} />
              </div>
              <p
                className={cn(
                  "mb-3 text-xs font-medium",
                  submitted ? "text-emerald-700" : "text-amber-700"
                )}
              >
                {submitted ? "Report saved" : "No report yet"}
              </p>
              <dl className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <dt className="text-slate-500">Backlinks</dt>
                  <dd className="font-medium">{backlinks_added}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">Blogs</dt>
                  <dd className="font-medium">{blogs_published}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">KW improved</dt>
                  <dd className="font-medium">{keywords_improved}</dd>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <dt className="font-medium text-slate-700">Week total</dt>
                  <dd className="font-bold">{total}</dd>
                </div>
              </dl>
            </div>
          ))}
        </div>
      </div>
      )}

      {isAdmin && (
        <div>
          <h2 className="mb-3 text-lg font-semibold text-slate-900">
            2. Team submissions
          </h2>
          <p className="mb-4 text-sm text-slate-500">
            Each member is tied to one service — their numbers come from that service&apos;s weekly report.
          </p>
          {memberWeeklyPerf.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 py-8 text-center text-sm text-slate-500">
              No team members found.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3 text-center">Member</th>
                    <th className="px-4 py-3 text-center">Service</th>
                    <th className="px-4 py-3 text-center">Backlinks</th>
                    <th className="px-4 py-3 text-center">Blogs</th>
                    <th className="px-4 py-3 text-center">KW improved</th>
                    <th className="px-4 py-3 text-center">Guest posts</th>
                    <th className="px-4 py-3 text-center">On-page</th>
                    <th className="px-4 py-3 text-center">Total</th>
                    <th className="px-4 py-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {memberWeeklyPerf.map((m) => (
                    <tr key={m.id}>
                      <td className="px-4 py-3 text-center font-medium">{m.name}</td>
                      <td className="px-4 py-3 text-center">
                        {m.service ? (
                          <ServiceBadge service={m.service} />
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">{m.backlinks_added}</td>
                      <td className="px-4 py-3 text-center">{m.blogs_published}</td>
                      <td className="px-4 py-3 text-center">{m.keywords_improved}</td>
                      <td className="px-4 py-3 text-center">{m.guest_posts}</td>
                      <td className="px-4 py-3 text-center">{m.on_page_fixes}</td>
                      <td className="px-4 py-3 text-center font-semibold">{m.total}</td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-xs font-medium",
                            m.submitted
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-amber-100 text-amber-800"
                          )}
                        >
                          {m.submitted ? "Submitted" : "Not submitted"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {!isAdmin && memberDraft && (
        <div
          id="submit-weekly-report"
          className="rounded-xl border-2 border-[#1e3a5f]/30 bg-white p-6 shadow-sm"
        >
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Submit weekly report — {SERVICE_LABELS[memberService]}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Week {week}, {year}. Your numbers are filled in automatically — review and submit.
              </p>
            </div>
            <span
              className={cn(
                "rounded-full px-3 py-1 text-xs font-semibold",
                memberDraft.id
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-amber-100 text-amber-800"
              )}
            >
              {memberDraft.id ? "Submitted" : "Not submitted yet"}
            </span>
          </div>
          <div className="space-y-4 border-t border-slate-100 bg-slate-50/50 px-5 py-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="inline-flex items-center gap-2 text-sm font-medium text-indigo-700">
                <Sparkles className="h-4 w-4" />
                Pulled automatically from your keywords, links, and blogs for this week
              </p>
              <button
                type="button"
                onClick={refetchMetrics}
                disabled={metricsLoading}
                className="btn-secondary flex items-center gap-2 text-xs"
              >
                <RefreshCw className={cn("h-3.5 w-3.5", metricsLoading && "animate-spin")} />
                Refresh
              </button>
            </div>

            <dl className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {METRIC_FIELDS.map(({ key, label }) => (
                <div
                  key={key}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2.5"
                >
                  <dt className="text-xs text-slate-500">{label}</dt>
                  <dd className="text-2xl font-bold text-slate-900">
                    {metricsLoading ? "…" : Number(memberDraft[key]) || 0}
                  </dd>
                </div>
              ))}
            </dl>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Notes (optional)
              </label>
              <textarea
                value={memberDraft.notes || ""}
                onChange={(e) => setMemberDraft({ ...memberDraft, notes: e.target.value })}
                className="w-full"
                rows={3}
                placeholder="Anything the numbers don't show — blockers, wins, plans for next week."
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={saveMemberReport}
                disabled={saving || metricsLoading}
                className="btn-primary flex items-center gap-2 text-sm"
              >
                <Pencil className="h-4 w-4" />
                {saving
                  ? "Saving…"
                  : memberDraft.id
                    ? "Update report"
                    : "Submit weekly report"}
              </button>
              {canDeleteReport(memberDraft) && (
                <button
                  type="button"
                  onClick={() => deleteReport(memberDraft)}
                  disabled={saving}
                  className="btn-secondary flex items-center gap-2 text-sm text-red-600"
                >
                  <Trash2 className="h-4 w-4" /> Remove report
                </button>
              )}
            </div>
            <p className="text-xs text-slate-500">
              Counts come from what you logged in the app: backlinks and guest posts added this
              week, blogs published or set live this week, keyword updates where the rank improved,
              and page rankings entered for this week.
            </p>
          </div>
        </div>
      )}

      {isAdmin && showNewForm && (
        <div className="rounded-xl border border-[#1e3a5f]/20 bg-white shadow-sm">
          <div className="border-b px-5 py-4">
            <h2 className="font-semibold text-slate-900">3. Add or fix a service report</h2>
            <div className="mt-3 flex flex-wrap gap-4">
              <div>
                <label className="text-xs text-slate-500">Week</label>
                <input
                  type="number"
                  min={1}
                  max={53}
                  value={newReport.week_number}
                  onChange={(e) =>
                    setNewReport({ ...newReport, week_number: Number(e.target.value) })
                  }
                  className="ml-1 w-16"
                />
              </div>
              <div>
                <label className="text-xs text-slate-500">Year</label>
                <input
                  type="number"
                  value={newReport.year}
                  onChange={(e) =>
                    setNewReport({ ...newReport, year: Number(e.target.value) })
                  }
                  className="ml-1 w-20"
                />
              </div>
              <div>
                <label className="text-xs text-slate-500">Service</label>
                <select
                  value={newReport.service}
                  onChange={(e) =>
                    setNewReport({ ...newReport, service: e.target.value })
                  }
                  className="ml-1"
                >
                  {SERVICES.map((s) => (
                    <option key={s} value={s}>
                      {SERVICE_LABELS[s]}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          <ReportForm
            report={newReport}
            onChange={setNewReport}
            onSave={() => saveReport(newReport, true)}
            saving={saving}
            showDelete={false}
          />
        </div>
      )}

      <div>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              {isAdmin ? "4. Edit saved reports" : "Your past reports"}
            </h2>
            <p className="text-sm text-slate-500">
              {isAdmin
                ? showAllHistory
                  ? "All weeks — expand a row to edit or delete."
                  : `Only Week ${week}, ${year} — toggle to see all history.`
                : "Open a past week to review, update, or remove your submission."}
            </p>
          </div>
          {isAdmin && (
            <button
              type="button"
              onClick={() => setShowAllHistory((v) => !v)}
              className="btn-secondary text-sm"
            >
              {showAllHistory ? "Show this week only" : "Show all weeks"}
            </button>
          )}
        </div>

        {historyList.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 py-12 text-center text-sm text-slate-500">
            {showAllHistory
              ? "No weekly reports yet."
              : `No reports for Week ${week}, ${year}. Add one above.`}
          </p>
        ) : (
          <div className="space-y-2">
            {historyList.map((r) => {
              const isOpen = expandedId === r.id;
              return (
                <div
                  key={r.id}
                  className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
                >
                  <button
                    type="button"
                    onClick={() => toggleExpand(r)}
                    className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition hover:bg-slate-50"
                  >
                    <div className="flex flex-wrap items-center gap-3">
                      <ChevronDown
                        className={cn(
                          "h-5 w-5 shrink-0 text-slate-400 transition",
                          isOpen && "rotate-180"
                        )}
                      />
                      <span className="font-semibold text-slate-900">
                        Week {r.week_number}, {r.year}
                      </span>
                      <ServiceBadge service={r.service} />
                    </div>
                    <span className="hidden text-sm text-slate-500 sm:inline">
                      BL {r.backlinks_added} · Blogs {r.blogs_published} · KW+{" "}
                      {r.keywords_improved}
                    </span>
                  </button>

                  {isOpen && editDraft && (
                    <ReportForm
                      report={editDraft}
                      onChange={setEditDraft}
                      onSave={() => saveReport(editDraft)}
                      onDelete={() => deleteReport(r)}
                      saving={saving}
                      showDelete={canDeleteReport(r)}
                      saveLabel={isAdmin ? "Save changes" : "Update report"}
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
