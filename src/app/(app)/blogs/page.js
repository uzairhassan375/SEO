"use client";

import { useState, useMemo } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { useBlogs } from "@/hooks/useBlogs";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import Modal from "@/components/Modal";
import LoadingSpinner from "@/components/LoadingSpinner";
import EmptyState from "@/components/EmptyState";
import StatCard from "@/components/StatCard";
import { ServiceBadge, StatusBadge } from "@/components/Badge";
import UserAvatar from "@/components/UserAvatar";
import { SERVICES, SERVICE_LABELS, BLOG_STATUSES } from "@/lib/constants";
import { logActivity } from "@/lib/activity";
import { createClient } from "@/lib/supabase/client";
import { getDisplayName } from "@/lib/utils";

const emptyForm = {
  title: "",
  target_keyword: "",
  country: "",
  service: "dropshipping",
  status: "draft",
  url: "",
  word_count: "",
  notes: "",
  published_at: "",
};

export default function BlogsPage() {
  const { profile, isAdmin, user } = useAuth();
  const { showToast } = useToast();
  const [serviceTab, setServiceTab] = useState("all");
  const [statusTab, setStatusTab] = useState("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const { blogs, profiles, loading, refetch } = useBlogs(serviceTab, statusTab);
  const supabase = createClient();

  const profileMap = useMemo(
    () => Object.fromEntries(profiles.map((p) => [p.id, p])),
    [profiles]
  );

  const serviceTabs = isAdmin
    ? ["all", ...SERVICES]
    : profile?.assigned_service
      ? [profile.assigned_service]
      : [];

  const stats = useMemo(() => {
    const published = blogs.filter((b) =>
      ["published", "live"].includes(b.status)
    ).length;
    const totalWords = blogs.reduce((s, b) => s + (b.word_count || 0), 0);
    const byAuthor = {};
    blogs.forEach((b) => {
      const name = getDisplayName(profileMap[b.created_by]) || "Unknown";
      byAuthor[name] = (byAuthor[name] || 0) + 1;
    });
    return { total: blogs.length, published, totalWords, byAuthor };
  }, [blogs, profileMap]);

  const openAdd = () => {
    setEditing(null);
    setForm({
      ...emptyForm,
      service: isAdmin ? "dropshipping" : profile?.assigned_service || "dropshipping",
    });
    setModalOpen(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    setForm({
      title: row.title,
      target_keyword: row.target_keyword || "",
      country: row.country || "",
      service: row.service,
      status: row.status,
      url: row.url || "",
      word_count: row.word_count ?? "",
      notes: row.notes || "",
      published_at: row.published_at || "",
    });
    setModalOpen(true);
  };

  const save = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) {
      showToast("Blog title is required", "error");
      return;
    }

    const payload = {
      title: form.title.trim(),
      target_keyword: form.target_keyword.trim(),
      country: form.country.trim(),
      service: isAdmin ? form.service : profile?.assigned_service,
      status: form.status,
      url: form.url.trim() || null,
      word_count: form.word_count === "" ? null : Number(form.word_count),
      notes: form.notes,
      published_at: form.published_at || null,
      created_by: user.id,
      updated_at: new Date().toISOString(),
    };

    if (editing) {
      const { error } = await supabase.from("blogs").update(payload).eq("id", editing.id);
      if (error) return showToast(error.message, "error");
      await logActivity({
        user: profile,
        action: "updated_blog",
        entityType: "blog",
        entityId: editing.id,
        entityName: payload.title,
        service: payload.service,
        oldValue: editing.status,
        newValue: payload.status,
      });
      showToast("Blog updated");
    } else {
      const { data, error } = await supabase.from("blogs").insert(payload).select().single();
      if (error) return showToast(error.message, "error");
      await logActivity({
        user: profile,
        action: "added_blog",
        entityType: "blog",
        entityId: data.id,
        entityName: payload.title,
        service: payload.service,
      });
      showToast("Blog added");
    }
    setModalOpen(false);
    refetch();
  };

  const remove = async (row) => {
    if (!confirm(`Delete blog "${row.title}"?`)) return;
    const { error } = await supabase.from("blogs").delete().eq("id", row.id);
    if (error) return showToast(error.message, "error");
    await logActivity({
      user: profile,
      action: "deleted_blog",
      entityType: "blog",
      entityId: row.id,
      entityName: row.title,
      service: row.service,
    });
    showToast("Blog deleted");
    refetch();
  };

  const quickStatus = async (row, status) => {
    const { error } = await supabase
      .from("blogs")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", row.id);
    if (error) return showToast(error.message, "error");
    await logActivity({
      user: profile,
      action: "updated_blog_status",
      entityType: "blog",
      entityId: row.id,
      entityName: row.title,
      service: row.service,
      oldValue: row.status,
      newValue: status,
    });
    showToast("Status updated");
    refetch();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Blogs</h1>
          <p className="mt-1 text-sm text-slate-500">
            {isAdmin
              ? "Track who published what, target keywords, and word counts."
              : "Log blogs you write — keyword, country, and status."}
          </p>
        </div>
        <button type="button" onClick={openAdd} className="btn-primary flex items-center gap-2">
          <Plus className="h-4 w-4" /> Add Blog
        </button>
      </div>

      {isAdmin && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Total blogs" value={stats.total} />
            <StatCard label="Published / Live" value={stats.published} />
            <StatCard label="Total words" value={stats.totalWords.toLocaleString()} />
            <StatCard
              label="Contributors"
              value={Object.keys(stats.byAuthor).length}
              sub={Object.entries(stats.byAuthor)
                .map(([n, c]) => `${n}: ${c}`)
                .join(" · ")}
            />
          </div>

          <div className="rounded-xl border bg-white p-4 shadow-sm">
            <h3 className="mb-3 text-sm font-semibold text-slate-700">Posts by team member</h3>
            <div className="flex flex-wrap gap-3">
              {Object.entries(stats.byAuthor).length === 0 ? (
                <p className="text-sm text-slate-500">No blogs yet.</p>
              ) : (
                Object.entries(stats.byAuthor).map(([name, count]) => (
                  <span
                    key={name}
                    className="rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-800"
                  >
                    {name}: {count} blog{count !== 1 ? "s" : ""}
                  </span>
                ))
              )}
            </div>
          </div>
        </>
      )}

      <div className="flex flex-wrap gap-4 text-sm">
        <span className="rounded-lg bg-emerald-100 px-3 py-1 font-medium text-emerald-800">
          {blogs.filter((b) => b.status === "live").length} live
        </span>
        <span className="rounded-lg bg-amber-100 px-3 py-1 font-medium text-amber-800">
          {blogs.filter((b) => b.status === "published").length} published
        </span>
        <span className="rounded-lg bg-blue-100 px-3 py-1 font-medium text-blue-800">
          {blogs.filter((b) => b.status === "writing").length} writing
        </span>
        <span className="rounded-lg bg-slate-100 px-3 py-1 font-medium text-slate-700">
          {blogs.filter((b) => b.status === "draft").length} draft
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        {serviceTabs.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setServiceTab(t)}
            className={`rounded-lg px-3 py-1.5 text-sm ${
              serviceTab === t ? "bg-[#1e3a5f] text-white" : "bg-white ring-1 ring-slate-200"
            }`}
          >
            {t === "all" ? "All services" : SERVICE_LABELS[t]}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {["all", ...BLOG_STATUSES].map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setStatusTab(t)}
            className={`rounded-lg px-3 py-1.5 text-sm capitalize ${
              statusTab === t ? "bg-[#1e3a5f] text-white" : "bg-white ring-1 ring-slate-200"
            }`}
          >
            {t === "all" ? "All statuses" : t}
          </button>
        ))}
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : blogs.length === 0 ? (
        <EmptyState
          title="No blogs yet"
          message="Add a blog entry with topic, target keyword, and country."
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-white shadow-sm table-row-hover">
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Topic</th>
                <th className="px-4 py-3">Keyword</th>
                <th className="px-4 py-3">Country</th>
                <th className="px-4 py-3">Service</th>
                {isAdmin && <th className="px-4 py-3">Posted by</th>}
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Words</th>
                <th className="px-4 py-3">URL</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {blogs.map((b) => (
                <tr key={b.id}>
                  <td className="max-w-[160px] px-4 py-3 font-medium">{b.title}</td>
                  <td className="px-4 py-3">{b.target_keyword || "—"}</td>
                  <td className="px-4 py-3">{b.country || "—"}</td>
                  <td className="px-4 py-3">
                    <ServiceBadge service={b.service} />
                  </td>
                  {isAdmin && (
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <UserAvatar profile={profileMap[b.created_by]} size="xs" />
                        <span className="font-medium">
                          {getDisplayName(profileMap[b.created_by])}
                        </span>
                      </div>
                    </td>
                  )}
                  <td className="px-4 py-3">
                    <select
                      value={b.status}
                      onChange={(e) => quickStatus(b, e.target.value)}
                      className="text-sm capitalize"
                    >
                      {BLOG_STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3">{b.word_count ?? "—"}</td>
                  <td className="max-w-[120px] truncate px-4 py-3">
                    {b.url ? (
                      <a
                        href={b.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        Link
                      </a>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button type="button" onClick={() => openEdit(b)} title="Edit">
                        <Pencil className="h-4 w-4 text-slate-500" />
                      </button>
                      {(isAdmin || b.created_by === user.id) && (
                        <button type="button" onClick={() => remove(b)} title="Delete">
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </button>
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
        title={editing ? "Edit Blog" : "Add Blog"}
        wide
      >
        <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium">Blog topic / title *</label>
            <input
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full"
              placeholder="e.g. How to start dropshipping in UAE"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Target keyword</label>
            <input
              value={form.target_keyword}
              onChange={(e) => setForm({ ...form, target_keyword: e.target.value })}
              className="w-full"
              placeholder="e.g. dropshipping UAE"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Country</label>
            <input
              value={form.country}
              onChange={(e) => setForm({ ...form, country: e.target.value })}
              className="w-full"
              placeholder="e.g. UAE, Pakistan"
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
            <label className="mb-1 block text-sm font-medium">Status</label>
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
              className="w-full capitalize"
            >
              {BLOG_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Word count</label>
            <input
              type="number"
              min={0}
              value={form.word_count}
              onChange={(e) => setForm({ ...form, word_count: e.target.value })}
              className="w-full"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Published date</label>
            <input
              type="date"
              value={form.published_at}
              onChange={(e) => setForm({ ...form, published_at: e.target.value })}
              className="w-full"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium">Published URL</label>
            <input
              value={form.url}
              onChange={(e) => setForm({ ...form, url: e.target.value })}
              className="w-full"
              placeholder="https://..."
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
