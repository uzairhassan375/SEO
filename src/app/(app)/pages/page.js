"use client";

import { useState, useMemo } from "react";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import { usePages } from "@/hooks/usePages";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import Modal from "@/components/Modal";
import LoadingSpinner from "@/components/LoadingSpinner";
import EmptyState from "@/components/EmptyState";
import StatCard from "@/components/StatCard";
import FilterBar from "@/components/FilterBar";
import { ServiceBadge } from "@/components/Badge";
import { SERVICES, SERVICE_LABELS } from "@/lib/constants";
import { logActivity } from "@/lib/activity";
import { createClient } from "@/lib/supabase/client";
import {
  getWeekNumber,
  formatCtr,
  formatPosition,
  formatImpressions,
  calcCtr,
} from "@/lib/utils";

const currentYear = new Date().getFullYear();
const currentWeek = getWeekNumber();

const emptyForm = {
  page_url: "",
  service: "dropshipping",
  week_number: String(currentWeek),
  year: String(currentYear),
  clicks: "",
  impressions: "",
  avg_position: "",
  ctr: "",
  notes: "",
};

export default function PagesPage() {
  const { profile, isAdmin, user } = useAuth();
  const { showToast } = useToast();
  const [serviceTab, setServiceTab] = useState("all");
  const [weekTab, setWeekTab] = useState("all");
  const [yearTab, setYearTab] = useState(String(currentYear));
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const { pages, loading, refetch } = usePages(serviceTab, weekTab, yearTab);
  const supabase = createClient();

  const serviceTabs = isAdmin
    ? ["all", ...SERVICES]
    : profile?.assigned_service
      ? [profile.assigned_service]
      : [];

  const weekOptions = useMemo(() => {
    const set = new Set([currentWeek]);
    pages.forEach((p) => set.add(p.week_number));
    return Array.from(set).sort((a, b) => b - a);
  }, [pages]);

  const yearOptions = useMemo(() => {
    const set = new Set([currentYear]);
    pages.forEach((p) => set.add(p.year));
    return Array.from(set).sort((a, b) => b - a);
  }, [pages]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return pages;
    return pages.filter((p) => p.page_url.toLowerCase().includes(q));
  }, [pages, search]);

  const stats = useMemo(() => {
    const clicks = filtered.reduce((s, p) => s + (p.clicks || 0), 0);
    const impressions = filtered.reduce((s, p) => s + (Number(p.impressions) || 0), 0);
    const ctr =
      impressions > 0 ? `${((clicks / impressions) * 100).toFixed(2)}%` : "—";
    return { pages: filtered.length, clicks, impressions, ctr };
  }, [filtered]);

  const openAdd = () => {
    setEditing(null);
    setForm({
      ...emptyForm,
      service: isAdmin ? "dropshipping" : profile?.assigned_service || "dropshipping",
      week_number: String(currentWeek),
      year: String(currentYear),
    });
    setModalOpen(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    setForm({
      page_url: row.page_url,
      service: row.service,
      week_number: String(row.week_number),
      year: String(row.year),
      clicks: row.clicks ?? "",
      impressions: row.impressions ?? "",
      avg_position: row.avg_position ?? "",
      ctr: row.ctr ?? "",
      notes: row.notes || "",
    });
    setModalOpen(true);
  };

  const save = async (e) => {
    e.preventDefault();
    if (!form.page_url.trim()) {
      showToast("Page URL is required", "error");
      return;
    }

    const clicks = form.clicks === "" ? 0 : Number(form.clicks);
    const impressions = form.impressions === "" ? 0 : Number(form.impressions);
    const ctr = calcCtr(clicks, impressions, form.ctr);

    const payload = {
      page_url: form.page_url.trim(),
      service: isAdmin ? form.service : profile?.assigned_service,
      week_number: Number(form.week_number),
      year: Number(form.year),
      clicks,
      impressions,
      avg_position: form.avg_position === "" ? null : Number(form.avg_position),
      ctr,
      notes: form.notes,
      created_by: user.id,
      updated_at: new Date().toISOString(),
    };

    if (editing) {
      const { created_by: _omit, ...updatePayload } = payload;
      const { error } = await supabase
        .from("page_rankings")
        .update(updatePayload)
        .eq("id", editing.id);
      if (error) return showToast(error.message, "error");
      await logActivity({
        user: profile,
        action: "updated_page",
        entityType: "page",
        entityId: editing.id,
        entityName: payload.page_url,
        service: payload.service,
        oldValue: editing.clicks,
        newValue: payload.clicks,
      });
      showToast("Page record updated");
    } else {
      const { data, error } = await supabase
        .from("page_rankings")
        .insert(payload)
        .select()
        .single();
      if (error) return showToast(error.message, "error");
      await logActivity({
        user: profile,
        action: "added_page",
        entityType: "page",
        entityId: data.id,
        entityName: payload.page_url,
        service: payload.service,
      });
      showToast("Page record added");
    }
    setModalOpen(false);
    refetch();
  };

  const remove = async (row) => {
    if (!confirm("Delete this page record?")) return;
    const { error } = await supabase.from("page_rankings").delete().eq("id", row.id);
    if (error) return showToast(error.message, "error");
    await logActivity({
      user: profile,
      action: "deleted_page",
      entityType: "page",
      entityId: row.id,
      entityName: row.page_url,
      service: row.service,
    });
    showToast("Page record deleted");
    refetch();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Top Pages</h1>
          <p className="mt-1 text-sm text-slate-500">
            Track Search Console metrics by week — URL, clicks, impressions, position, and CTR.
          </p>
        </div>
        <button type="button" onClick={openAdd} className="btn-primary flex items-center gap-2">
          <Plus className="h-4 w-4" /> Add Page
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Pages tracked" value={stats.pages} />
        <StatCard label="Total clicks" value={stats.clicks} />
        <StatCard label="Total impressions" value={formatImpressions(stats.impressions)} />
        <StatCard label="Avg CTR" value={stats.ctr} />
      </div>

      <FilterBar
        search={
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              className="input-search w-full"
              placeholder="Search page URLs…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        }
        filters={[
          {
            id: "page-service-filter",
            label: "Service",
            value: serviceTab,
            onChange: setServiceTab,
            options: serviceTabs.map((t) => ({
              value: t,
              label: t === "all" ? "All services" : SERVICE_LABELS[t],
            })),
          },
          {
            id: "year-filter",
            label: "Year",
            value: yearTab,
            onChange: setYearTab,
            options: [
              { value: "all", label: "All years" },
              ...yearOptions.map((y) => ({ value: String(y), label: String(y) })),
            ],
          },
          {
            id: "week-filter",
            label: "Week",
            value: weekTab,
            onChange: setWeekTab,
            options: [
              { value: "all", label: "All weeks" },
              ...weekOptions.map((w) => ({ value: String(w), label: `Week ${w}` })),
            ],
          },
        ]}
      />

      {loading ? (
        <LoadingSpinner />
      ) : filtered.length === 0 ? (
        <EmptyState
          title={pages.length === 0 ? "No pages tracked yet" : "No matching pages"}
          message={
            pages.length === 0
              ? "Add your top-performing URLs from Search Console for this week."
              : "Try a different search or filter."
          }
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm table-row-hover">
            <thead className="border-b bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Page URL</th>
                <th className="px-4 py-3">Service</th>
                <th className="px-4 py-3">Week</th>
                <th className="px-4 py-3 text-right">Clicks</th>
                <th className="px-4 py-3 text-right">Impressions</th>
                <th className="px-4 py-3 text-right">Avg Position</th>
                <th className="px-4 py-3 text-right">CTR</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((p) => (
                <tr key={p.id}>
                  <td className="max-w-[280px] truncate px-4 py-3">
                    <a
                      href={p.page_url}
                      target="_blank"
                      rel="noreferrer"
                      className="font-medium text-blue-600 hover:underline"
                    >
                      {p.page_url}
                    </a>
                  </td>
                  <td className="px-4 py-3">
                    <ServiceBadge service={p.service} />
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    W{p.week_number} · {p.year}
                  </td>
                  <td className="px-4 py-3 text-right font-medium">{p.clicks ?? 0}</td>
                  <td className="px-4 py-3 text-right">{formatImpressions(p.impressions)}</td>
                  <td className="px-4 py-3 text-right">{formatPosition(p.avg_position)}</td>
                  <td className="px-4 py-3 text-right">
                    {formatCtr(p.ctr, p.clicks, p.impressions)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      {(isAdmin || p.created_by === user.id) && (
                        <>
                          <button
                            type="button"
                            onClick={() => openEdit(p)}
                            className="text-slate-500 hover:text-[#1e3a5f]"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => remove(p)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </>
                      )}
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
        title={editing ? "Edit Page" : "Add Page"}
        wide
      >
        <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium">Page URL *</label>
            <input
              required
              value={form.page_url}
              onChange={(e) => setForm({ ...form, page_url: e.target.value })}
              className="w-full"
              placeholder="https://zambeel.com/..."
            />
          </div>
          {isAdmin && (
            <div>
              <label className="mb-1 block text-sm font-medium">Service</label>
              <select
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
            </div>
          )}
          <div>
            <label className="mb-1 block text-sm font-medium">Week</label>
            <input
              type="number"
              min={1}
              max={53}
              value={form.week_number}
              onChange={(e) => setForm({ ...form, week_number: e.target.value })}
              className="w-full"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Year</label>
            <input
              type="number"
              value={form.year}
              onChange={(e) => setForm({ ...form, year: e.target.value })}
              className="w-full"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Clicks</label>
            <input
              type="number"
              min={0}
              value={form.clicks}
              onChange={(e) => setForm({ ...form, clicks: e.target.value })}
              className="w-full"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Impressions</label>
            <input
              type="number"
              min={0}
              value={form.impressions}
              onChange={(e) => setForm({ ...form, impressions: e.target.value })}
              className="w-full"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Avg position</label>
            <input
              type="number"
              step="0.1"
              min={0}
              value={form.avg_position}
              onChange={(e) => setForm({ ...form, avg_position: e.target.value })}
              className="w-full"
              placeholder="e.g. 4.2"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">CTR (%)</label>
            <input
              type="number"
              step="0.01"
              min={0}
              max={100}
              value={form.ctr}
              onChange={(e) => setForm({ ...form, ctr: e.target.value })}
              className="w-full"
              placeholder="Auto from clicks ÷ impressions"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="w-full"
              rows={2}
            />
          </div>
          <div className="flex gap-2 sm:col-span-2">
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
