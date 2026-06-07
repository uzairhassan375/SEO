"use client";

import { useState, useMemo } from "react";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import { useKeywords } from "@/hooks/useKeywords";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import Modal from "@/components/Modal";
import LoadingSpinner from "@/components/LoadingSpinner";
import EmptyState from "@/components/EmptyState";
import { ServiceBadge } from "@/components/Badge";
import { SERVICES, SERVICE_LABELS } from "@/lib/constants";
import { logActivity } from "@/lib/activity";
import { formatRank, formatImpressions } from "@/lib/utils";

const WEEK_FIELDS = [
  { rank: "rank_week1", imp: "impressions_week1", label: "W1" },
  { rank: "rank_week2", imp: "impressions_week2", label: "W2" },
  { rank: "rank_week3", imp: "impressions_week3", label: "W3" },
  { rank: "rank_week4", imp: "impressions_week4", label: "W4" },
];

const emptyForm = {
  keyword: "",
  service: "dropshipping",
  country: "",
  origin_country: "",
  current_rank: "",
  rank_week1: "",
  rank_week2: "",
  rank_week3: "",
  rank_week4: "",
  impressions_week1: "",
  impressions_week2: "",
  impressions_week3: "",
  impressions_week4: "",
};

function WeekCell({ rank, volume }) {
  return (
    <div className="flex min-w-[4.5rem] flex-col gap-2 py-1">
      <span className="text-sm font-semibold tabular-nums text-slate-900">{formatRank(rank)}</span>
      <span className="text-xs tabular-nums text-slate-500">{formatImpressions(volume)}</span>
    </div>
  );
}

export default function KeywordsPage() {
  const { profile, isAdmin, user } = useAuth();
  const { showToast } = useToast();
  const [tab, setTab] = useState("all");
  const [search, setSearch] = useState("");
  const [targetFilter, setTargetFilter] = useState("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const serviceFilter = tab === "all" ? null : tab;
  const { keywords, loading, refetch } = useKeywords(serviceFilter);

  const tabs = ["all", ...SERVICES];

  const targets = useMemo(() => {
    const set = new Set();
    keywords.forEach((k) => {
      const c = (k.country || "").trim();
      if (c) set.add(c);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [keywords]);

  const activeTargetFilter =
    targetFilter !== "all" && targets.includes(targetFilter) ? targetFilter : "all";

  const filtered = useMemo(() => {
    return keywords.filter((k) => {
      if (activeTargetFilter !== "all") {
        const c = (k.country || "").trim();
        if (c !== activeTargetFilter) return false;
      }
      return k.keyword.toLowerCase().includes(search.toLowerCase());
    });
  }, [keywords, search, activeTargetFilter]);

  const openAdd = () => {
    setEditing(null);
    setForm({
      ...emptyForm,
      service: profile?.assigned_service || "dropshipping",
    });
    setModalOpen(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    setForm({
      keyword: row.keyword,
      service: row.service,
      country: row.country || "",
      origin_country: row.origin_country || "",
      current_rank: row.current_rank ?? "",
      rank_week1: row.rank_week1 ?? "",
      rank_week2: row.rank_week2 ?? "",
      rank_week3: row.rank_week3 ?? "",
      rank_week4: row.rank_week4 ?? "",
      impressions_week1: row.impressions_week1 ?? "",
      impressions_week2: row.impressions_week2 ?? "",
      impressions_week3: row.impressions_week3 ?? "",
      impressions_week4: row.impressions_week4 ?? "",
    });
    setModalOpen(true);
  };

  const numOrNull = (v) => (v === "" ? null : Number(v));

  const save = async (e) => {
    e.preventDefault();
    if (!form.keyword.trim()) {
      showToast("Keyword is required", "error");
      return;
    }
    if (!SERVICES.includes(form.service)) {
      showToast("Please select a service", "error");
      return;
    }
    const payload = {
      keyword: form.keyword.trim(),
      service: form.service,
      country: form.country.trim(),
      origin_country: form.origin_country.trim(),
      current_rank: numOrNull(form.current_rank),
      rank_week1: numOrNull(form.rank_week1),
      rank_week2: numOrNull(form.rank_week2),
      rank_week3: numOrNull(form.rank_week3),
      rank_week4: numOrNull(form.rank_week4),
      impressions_week1: numOrNull(form.impressions_week1),
      impressions_week2: numOrNull(form.impressions_week2),
      impressions_week3: numOrNull(form.impressions_week3),
      impressions_week4: numOrNull(form.impressions_week4),
      added_by: user.id,
    };

    const supabase = (await import("@/lib/supabase/client")).createClient();

    if (editing) {
      const { error } = await supabase
        .from("keywords")
        .update(payload)
        .eq("id", editing.id);
      if (error) return showToast(error.message, "error");
      await logActivity({
        user: profile,
        action: "updated_keyword",
        entityType: "keyword",
        entityId: editing.id,
        entityName: payload.keyword,
        service: payload.service,
        oldValue: editing.current_rank,
        newValue: payload.current_rank,
      });
      showToast("Keyword updated");
    } else {
      const { data, error } = await supabase
        .from("keywords")
        .insert({ ...payload, priority: "medium" })
        .select()
        .single();
      if (error) return showToast(error.message, "error");
      await logActivity({
        user: profile,
        action: "added_keyword",
        entityType: "keyword",
        entityId: data.id,
        entityName: payload.keyword,
        service: payload.service,
      });
      showToast("Keyword added");
    }
    setModalOpen(false);
    refetch();
  };

  const remove = async (row) => {
    if (!confirm("Delete this keyword?")) return;
    const supabase = (await import("@/lib/supabase/client")).createClient();
    const { error } = await supabase.from("keywords").delete().eq("id", row.id);
    if (error) return showToast(error.message, "error");
    await logActivity({
      user: profile,
      action: "deleted_keyword",
      entityType: "keyword",
      entityId: row.id,
      entityName: row.keyword,
      service: row.service,
    });
    showToast("Keyword deleted");
    refetch();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Keywords</h1>
          <p className="mt-1 text-sm text-slate-500">
            Weekly rank and search volume (W1–W4) by target and origin country.
          </p>
        </div>
        <button type="button" onClick={openAdd} className="btn-primary flex items-center gap-2">
          <Plus className="h-4 w-4" /> Add Keyword
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => {
              setTab(t);
              setTargetFilter("all");
            }}
            className={`rounded-lg px-4 py-2 text-sm font-medium ${
              tab === t
                ? "bg-[#1e3a5f] text-white"
                : "bg-white text-slate-600 ring-1 ring-slate-200"
            }`}
          >
            {t === "all" ? "All" : SERVICE_LABELS[t]}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative max-w-md flex-1 min-w-[200px]">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            className="input-search w-full"
            placeholder="Search keywords…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {targets.length > 0 && (
          <div className="flex items-center gap-2">
            <label htmlFor="target-filter" className="text-sm font-medium text-slate-600">
              Target
            </label>
            <select
              id="target-filter"
              value={activeTargetFilter}
              onChange={(e) => setTargetFilter(e.target.value)}
              className="min-w-[140px] text-sm"
            >
              <option value="all">All targets</option>
              {targets.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : filtered.length === 0 ? (
        <EmptyState
          title={keywords.length === 0 ? "No keywords yet" : "No matching keywords"}
          message={
            keywords.length === 0
              ? "Add your first keyword to start tracking rankings."
              : "Try a different search or target filter."
          }
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm table-row-hover">
            <thead className="border-b bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Keyword</th>
                {tab === "all" && <th className="px-4 py-3">Service</th>}
                <th className="px-4 py-3">Target</th>
                <th className="px-4 py-3">Origin</th>
                {WEEK_FIELDS.map((w) => (
                  <th key={w.label} className="px-5 py-3">
                    <span className="block text-slate-600">{w.label}</span>
                    <div className="mt-2 space-y-1 font-normal normal-case">
                      <span className="block text-[10px] tracking-wide text-slate-400">Rank</span>
                      <span className="block text-[10px] tracking-wide text-slate-400">Vol.</span>
                    </div>
                  </th>
                ))}
                <th className="px-4 py-3">Current</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((k) => (
                <tr key={k.id}>
                  <td className="px-4 py-3 font-medium">{k.keyword}</td>
                  {tab === "all" && (
                    <td className="px-4 py-3">
                      <ServiceBadge service={k.service} />
                    </td>
                  )}
                  <td className="px-4 py-3">{k.country || "—"}</td>
                  <td className="px-4 py-3">{k.origin_country || "—"}</td>
                  {WEEK_FIELDS.map((w) => (
                    <td key={w.label} className="px-5 py-3.5 align-top">
                      <WeekCell rank={k[w.rank]} volume={k[w.imp]} />
                    </td>
                  ))}
                  <td className="px-4 py-3 font-semibold">{formatRank(k.current_rank)}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => openEdit(k)}
                        className="text-slate-500 hover:text-[#1e3a5f]"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => remove(k)}
                        className="text-red-500 hover:text-red-700"
                        title="Delete keyword"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Edit Keyword" : "Add Keyword"}
        wide
      >
        <form onSubmit={save} className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium">Keyword *</label>
              <input
                required
                value={form.keyword}
                onChange={(e) => setForm({ ...form, keyword: e.target.value })}
                className="w-full"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Service *</label>
              <select
                required
                value={form.service}
                onChange={(e) => setForm({ ...form, service: e.target.value })}
                className="w-full"
              >
                {SERVICES.map((s) => (
                  <option key={s} value={s}>
                    {SERVICE_LABELS[s]}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-slate-500">
                Which service this keyword belongs to (3PL, 360, or Dropshipping).
              </p>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Target</label>
              <input
                value={form.country}
                onChange={(e) => setForm({ ...form, country: e.target.value })}
                className="w-full"
                placeholder="e.g. UAE, Pakistan"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Origin country</label>
              <input
                value={form.origin_country}
                onChange={(e) => setForm({ ...form, origin_country: e.target.value })}
                className="w-full"
                placeholder="e.g. USA, UK"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Current rank</label>
              <input
                type="number"
                value={form.current_rank}
                onChange={(e) => setForm({ ...form, current_rank: e.target.value })}
                className="w-full"
                placeholder="Leave empty for NR"
              />
            </div>
          </div>

          <div>
            <p className="mb-3 text-sm font-semibold text-slate-700">Weekly tracking</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {WEEK_FIELDS.map((w) => (
                <div
                  key={w.label}
                  className="rounded-lg border border-slate-200 bg-slate-50/50 p-3"
                >
                  <p className="mb-2 text-xs font-semibold uppercase text-slate-500">{w.label}</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="mb-1.5 block text-xs text-slate-600">Rank</label>
                      <input
                        type="number"
                        value={form[w.rank]}
                        onChange={(e) => setForm({ ...form, [w.rank]: e.target.value })}
                        className="w-full"
                        placeholder="NR"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs text-slate-600">Volume</label>
                      <input
                        type="number"
                        min={0}
                        value={form[w.imp]}
                        onChange={(e) => setForm({ ...form, [w.imp]: e.target.value })}
                        className="w-full"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <button type="submit" className="btn-primary">
              Save
            </button>
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">
              Cancel
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
