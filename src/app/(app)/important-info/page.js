"use client";

import { useEffect, useState, useMemo } from "react";
import { Plus, Trash2, Save, Megaphone, ListChecks } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import LoadingSpinner from "@/components/LoadingSpinner";
import { getWeekNumber, timeAgo } from "@/lib/utils";

function bulletsFromText(text) {
  return text
    .split("\n")
    .map((line) => line.replace(/^[-•*]\s*/, "").trim())
    .filter(Boolean);
}

function textFromBullets(items) {
  return (items || []).join("\n");
}

export default function ImportantInfoPage() {
  const { isAdmin, user } = useAuth();
  const { showToast } = useToast();
  const supabase = useMemo(() => createClient(), []);
  const [week, setWeek] = useState(getWeekNumber());
  const [year, setYear] = useState(new Date().getFullYear());
  const [record, setRecord] = useState(null);
  const [displayRecord, setDisplayRecord] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("Weekly priorities");
  const [bulletText, setBulletText] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchLatestPublished = async () => {
    const { data } = await supabase
      .from("weekly_important_info")
      .select("*")
      .eq("published", true)
      .order("year", { ascending: false })
      .order("week_number", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!data?.items?.length) return null;
    return data;
  };

  const isPublishedRecord = (row) =>
    row?.published && Array.isArray(row.items) && row.items.length > 0;

  const fetchWeek = async (w, y) => {
    const calendarWeek = getWeekNumber();
    const calendarYear = new Date().getFullYear();
    const isViewingCurrentWeek = w === calendarWeek && y === calendarYear;

    const { data } = await supabase
      .from("weekly_important_info")
      .select("*")
      .eq("week_number", w)
      .eq("year", y)
      .maybeSingle();
    setRecord(data);

    const activeForWeek = isPublishedRecord(data) ? data : null;
    let visible = activeForWeek;
    if (!visible && isViewingCurrentWeek) {
      visible = await fetchLatestPublished();
    }
    setDisplayRecord(visible);

    if (isAdmin) {
      if (data) {
        setTitle(data.title || "Weekly priorities");
        setBulletText(textFromBullets(data.items));
      } else if (
        isViewingCurrentWeek &&
        visible &&
        (visible.week_number !== w || visible.year !== y)
      ) {
        setTitle(visible.title || "Weekly priorities");
        setBulletText(textFromBullets(visible.items));
      } else {
        setTitle("Weekly priorities");
        setBulletText("");
      }
    } else if (data?.published) {
      setTitle(data.title || "Weekly priorities");
      setBulletText(textFromBullets(data.items));
    } else {
      setTitle("Weekly priorities");
      setBulletText("");
    }
  };

  const fetchHistory = async () => {
    let q = supabase
      .from("weekly_important_info")
      .select("week_number, year, title, published, updated_at")
      .eq("published", true)
      .order("year", { ascending: false })
      .order("week_number", { ascending: false });
    const { data } = await q;
    setHistory(data || []);
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchWeek(week, year), fetchHistory()]).finally(() =>
      setLoading(false)
    );
  }, [week, year, isAdmin]);

  useEffect(() => {
    const channel = supabase
      .channel("weekly_important_info_live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "weekly_important_info" },
        () => {
          fetchWeek(week, year);
          fetchHistory();
        }
      )
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [supabase, week, year]);

  const publish = async () => {
    const items = bulletsFromText(bulletText);
    if (items.length === 0) {
      showToast("Add at least one bullet point", "error");
      return;
    }
    setSaving(true);
    const payload = {
      week_number: week,
      year,
      title: title.trim() || "Weekly priorities",
      items,
      published: true,
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    };

    const { error } = record?.id
      ? await supabase.from("weekly_important_info").update(payload).eq("id", record.id)
      : await supabase.from("weekly_important_info").insert(payload);

    setSaving(false);
    if (error) return showToast(error.message, "error");
    showToast("Weekly info published for the team");
    fetchWeek(week, year);
    fetchHistory();
  };

  const unpublish = async () => {
    if (!record?.id) return;
    if (!confirm("Remove this week's post? Team will no longer see it.")) return;
    setSaving(true);
    const { error } = await supabase
      .from("weekly_important_info")
      .update({
        items: [],
        published: false,
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", record.id);
    setSaving(false);
    if (error) return showToast(error.message, "error");
    showToast("Weekly info removed");
    setBulletText("");
    fetchWeek(week, year);
    fetchHistory();
  };

  const addBulletField = () => {
    setBulletText((t) => (t ? `${t}\n` : "") + "• ");
  };

  const hasPublishedContent = isPublishedRecord(displayRecord);
  const hasCurrentWeekPost = isPublishedRecord(record);
  const showingPreviousWeek =
    hasPublishedContent &&
    displayRecord &&
    (displayRecord.week_number !== week || displayRecord.year !== year);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
            <Megaphone className="h-7 w-7 text-amber-600" />
            Important Info
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Weekly priorities and rules for the team
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div>
            <label className="text-xs font-medium text-slate-500">Week</label>
            <input
              type="number"
              min={1}
              max={53}
              value={week}
              onChange={(e) => setWeek(Number(e.target.value))}
              className="ml-1 w-16"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500">Year</label>
            <input
              type="number"
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="ml-1 w-20"
            />
          </div>
        </div>
      </div>

      {history.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {history.slice(0, 8).map((h) => (
            <button
              key={`${h.year}-${h.week_number}`}
              type="button"
              onClick={() => {
                setWeek(h.week_number);
                setYear(h.year);
              }}
              className={`rounded-lg px-3 py-1.5 text-sm ${
                week === h.week_number && year === h.year
                  ? "bg-[#1e3a5f] text-white"
                  : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
              }`}
            >
              W{h.week_number} {h.year}
            </button>
          ))}
        </div>
      )}

      {isAdmin && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-1 flex items-center gap-2 text-lg font-semibold text-slate-900">
            <ListChecks className="h-5 w-5 text-[#1e3a5f]" />
            {hasCurrentWeekPost ? "Edit this week" : "Post for this week"}
          </h2>
          <p className="mb-4 text-sm text-slate-500">
            One bullet per line. Team only sees this after you publish.
            {showingPreviousWeek && (
              <>
                {" "}
                The team still sees Week {displayRecord.week_number} until you
                publish for Week {week}.
              </>
            )}
          </p>
          <label className="mb-1 block text-sm font-medium">Title</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mb-4 w-full max-w-lg"
            placeholder="e.g. Week 21 priorities"
          />
          <label className="mb-1 block text-sm font-medium">
            Bullet points / rules
          </label>
          <textarea
            value={bulletText}
            onChange={(e) => setBulletText(e.target.value)}
            rows={8}
            className="w-full font-mono text-sm"
            placeholder={"Update all Week 4 keyword ranks by Monday\nSubmit 2 guest post URLs for 3PL\nComplete blocked tasks before Friday"}
          />
          <button
            type="button"
            onClick={addBulletField}
            className="mt-2 flex items-center gap-1 text-sm text-[#1e3a5f] hover:underline"
          >
            <Plus className="h-4 w-4" /> Add bullet line
          </button>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={publish}
              disabled={saving}
              className="btn-primary flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              {saving ? "Saving…" : "Publish for team"}
            </button>
            {hasCurrentWeekPost && (
              <button
                type="button"
                onClick={unpublish}
                disabled={saving}
                className="btn-secondary flex items-center gap-2 text-red-600"
              >
                <Trash2 className="h-4 w-4" /> Remove post
              </button>
            )}
          </div>
        </div>
      )}

      {hasPublishedContent ? (
        <div className="rounded-xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 p-4 shadow-sm sm:p-6 lg:p-8">
          <h2 className="text-xl font-bold text-amber-950">{displayRecord.title}</h2>
          <p className="mt-1 text-sm text-amber-800/80">
            Week {displayRecord.week_number}, {displayRecord.year}
            {displayRecord.updated_at &&
              ` · Updated ${timeAgo(displayRecord.updated_at)}`}
            {showingPreviousWeek && (
              <span className="ml-1 text-amber-700">
                · Active until Week {week} is published
              </span>
            )}
          </p>
          <ul className="mt-6 space-y-3">
            {displayRecord.items.map((item, i) => (
              <li
                key={i}
                className="flex gap-3 text-base leading-relaxed text-amber-950"
              >
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-amber-600" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        !isAdmin && (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-6 py-16 text-center">
            <Megaphone className="mx-auto h-10 w-10 text-slate-300" />
            <p className="mt-3 text-slate-600">No priorities have been posted yet.</p>
            <p className="mt-1 text-sm text-slate-400">
              Your admin will publish the weekly list when it is ready.
            </p>
          </div>
        )
      )}
    </div>
  );
}
