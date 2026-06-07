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
import { SERVICES, SERVICE_LABELS, BLOG_STATUSES, isAdminProfile } from "@/lib/constants";
import { logActivity } from "@/lib/activity";
import { createClient } from "@/lib/supabase/client";
import { getDisplayName } from "@/lib/utils";

const emptyForm = {
  title: "",
  target_keyword: "",
  country: "",
  origin_country: "",
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
  const [originFilter, setOriginFilter] = useState("all");
  const [targetFilter, setTargetFilter] = useState("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const { blogs, profiles, loading, refetch } = useBlogs(serviceTab, statusTab);
  const supabase = createClient();

  const profileMap = useMemo(
    () => Object.fromEntries(profiles.map((p) => [p.id, p])),
    [profiles]
  );

  const serviceTabs = ["all", ...SERVICES];

  const origins = useMemo(() => {
    const set = new Set();
    blogs.forEach((b) => {
      const c = (b.origin_country || "").trim();
      if (c) set.add(c);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [blogs]);

  const targets = useMemo(() => {
    const set = new Set();
    blogs.forEach((b) => {
      const c = (b.country || "").trim();
      if (c) set.add(c);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [blogs]);

  const activeOriginFilter =
    originFilter !== "all" && origins.includes(originFilter) ? originFilter : "all";

  const activeTargetFilter =
    targetFilter !== "all" && targets.includes(targetFilter) ? targetFilter : "all";

  const filteredBlogs = useMemo(() => {
    return blogs.filter((b) => {
      if (activeOriginFilter !== "all") {
        const origin = (b.origin_country || "").trim();
        if (origin !== activeOriginFilter) return false;
      }
      if (activeTargetFilter !== "all") {
        const target = (b.country || "").trim();
        if (target !== activeTargetFilter) return false;
      }
      return true;
    });
  }, [blogs, activeOriginFilter, activeTargetFilter]);

  const stats = useMemo(() => {
    const published = filteredBlogs.filter((b) =>
      ["published", "live"].includes(b.status)
    ).length;
    const totalWords = filteredBlogs.reduce((s, b) => s + (b.word_count || 0), 0);
    const byAuthor = {};
    filteredBlogs.forEach((b) => {
      const name = getDisplayName(profileMap[b.created_by]) || "Unknown";
      byAuthor[name] = (byAuthor[name] || 0) + 1;
    });
    return { total: filteredBlogs.length, published, totalWords, byAuthor };
  }, [filteredBlogs, profileMap]);

  const openAdd = () => {
    setEditing(null);
    setForm({
      ...emptyForm,
      service: profile?.assigned_service || "dropshipping",
    });
    setModalOpen(true);
  };

  const blogOwnerForActivity = (row) => {
    if (!row?.created_by) return null;
    const owner = profileMap[row.created_by];
    if (!owner) return null;
    if (isAdminProfile(profile) && owner.id !== user.id) return owner;
    return null;
  };

  const openEdit = (row) => {
    setEditing(row);
    setForm({
      title: row.title,
      target_keyword: row.target_keyword || "",
      country: row.country || "",
      origin_country: row.origin_country || "",
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
    if (!SERVICES.includes(form.service)) {
      showToast("Please select a service", "error");
      return;
    }

    const payload = {
      title: form.title.trim(),
      target_keyword: form.target_keyword.trim(),
      country: form.country.trim(),
      origin_country: form.origin_country.trim(),
      service: form.service,
      status: form.status,
      url: form.url.trim() || null,
      word_count: form.word_count === "" ? null : Number(form.word_count),
      notes: form.notes,
      published_at: form.published_at || null,
      created_by: user.id,
      updated_at: new Date().toISOString(),
    };

    if (editing) {
      const { created_by: _omit, ...updatePayload } = payload;
      const { error } = await supabase
        .from("blogs")
        .update(updatePayload)
        .eq("id", editing.id);
      if (error) return showToast(error.message, "error");
      await logActivity({
        user: profile,
        attributedUser: blogOwnerForActivity(editing),
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
    if (!blogOwnerForActivity(row)) {
      await logActivity({
        user: profile,
        action: "deleted_blog",
        entityType: "blog",
        entityId: row.id,
        entityName: row.title,
        service: row.service,
      });
    }
    showToast("Blog deleted");
    refetch();
  };

  const quickStatus = async (row, status) => {
    if (!isAdmin && row.created_by !== user.id) return;
    const { error } = await supabase
      .from("blogs")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", row.id);
    if (error) return showToast(error.message, "error");
    await logActivity({
      user: profile,
      attributedUser: blogOwnerForActivity(row),
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
              : "Log blogs you write — pick the service, keyword, origin/target country, and status."}
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
          {filteredBlogs.filter((b) => b.status === "live").length} live
        </span>
        <span className="rounded-lg bg-amber-100 px-3 py-1 font-medium text-amber-800">
          {filteredBlogs.filter((b) => b.status === "published").length} published
        </span>
        <span className="rounded-lg bg-blue-100 px-3 py-1 font-medium text-blue-800">
          {filteredBlogs.filter((b) => b.status === "writing").length} writing
        </span>
        <span className="rounded-lg bg-slate-100 px-3 py-1 font-medium text-slate-700">
          {filteredBlogs.filter((b) => b.status === "draft").length} draft
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

      {(origins.length > 0 || targets.length > 0) && (
        <div className="flex flex-wrap items-center gap-3">
          {origins.length > 0 && (
            <div className="flex items-center gap-2">
              <label htmlFor="blog-origin-filter" className="text-sm font-medium text-slate-600">
                Origin
              </label>
              <select
                id="blog-origin-filter"
                value={activeOriginFilter}
                onChange={(e) => setOriginFilter(e.target.value)}
                className="min-w-[140px] text-sm"
              >
                <option value="all">All origins</option>
                {origins.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          )}
          {targets.length > 0 && (
            <div className="flex items-center gap-2">
              <label htmlFor="blog-target-filter" className="text-sm font-medium text-slate-600">
                Target
              </label>
              <select
                id="blog-target-filter"
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
      )}

      {loading ? (
        <LoadingSpinner />
      ) : filteredBlogs.length === 0 ? (
        <EmptyState
          title={blogs.length === 0 ? "No blogs yet" : "No matching blogs"}
          message={
            blogs.length === 0
              ? "Add a blog entry with topic, target keyword, and origin/target country."
              : "Try a different origin or target filter."
          }
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-white shadow-sm table-row-hover">
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Topic</th>
                <th className="px-4 py-3">Keyword</th>
                <th className="px-4 py-3">Origin</th>
                <th className="px-4 py-3">Target</th>
                <th className="px-4 py-3">Service</th>
                {isAdmin && <th className="px-4 py-3">Posted by</th>}
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Words</th>
                <th className="px-4 py-3">URL</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredBlogs.map((b) => (
                <tr key={b.id}>
                  <td className="max-w-[160px] px-4 py-3 font-medium">{b.title}</td>
                  <td className="px-4 py-3">{b.target_keyword || "—"}</td>
                  <td className="px-4 py-3">{b.origin_country || "—"}</td>
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
                    {(isAdmin || b.created_by === user.id) ? (
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
                    ) : (
                      <StatusBadge status={b.status} />
                    )}
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
                      {(isAdmin || b.created_by === user.id) && (
                        <button type="button" onClick={() => openEdit(b)} title="Edit">
                          <Pencil className="h-4 w-4 text-slate-500" />
                        </button>
                      )}
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
            <label className="mb-1 block text-sm font-medium">Origin country</label>
            <input
              value={form.origin_country}
              onChange={(e) => setForm({ ...form, origin_country: e.target.value })}
              className="w-full"
              placeholder="e.g. Pakistan, China"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Target country</label>
            <input
              value={form.country}
              onChange={(e) => setForm({ ...form, country: e.target.value })}
              className="w-full"
              placeholder="e.g. UAE, Saudi Arabia"
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
              Which service this blog is for (3PL, 360, or Dropshipping).
            </p>
          </div>
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
