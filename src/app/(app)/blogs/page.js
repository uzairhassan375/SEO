"use client";

import { useState, useMemo } from "react";
import { Plus, Pencil, Trash2, ImageUp, ExternalLink } from "lucide-react";
import { useBlogs } from "@/hooks/useBlogs";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import Modal from "@/components/Modal";
import LoadingSpinner from "@/components/LoadingSpinner";
import EmptyState from "@/components/EmptyState";
import StatCard from "@/components/StatCard";
import FilterBar from "@/components/FilterBar";
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

  const filters = useMemo(
    () => [
      {
        id: "blog-service-filter",
        label: "Service",
        value: serviceTab,
        onChange: setServiceTab,
        options: [
          { value: "all", label: "All services" },
          ...SERVICES.map((s) => ({ value: s, label: SERVICE_LABELS[s] })),
        ],
      },
      {
        id: "blog-status-filter",
        label: "Status",
        value: statusTab,
        onChange: setStatusTab,
        options: [
          { value: "all", label: "All statuses" },
          ...BLOG_STATUSES.map((s) => ({
            value: s,
            label: s.charAt(0).toUpperCase() + s.slice(1),
          })),
        ],
      },
      {
        id: "blog-origin-filter",
        label: "Origin country",
        value: activeOriginFilter,
        onChange: setOriginFilter,
        options: [
          { value: "all", label: "All origins" },
          ...origins.map((c) => ({ value: c, label: c })),
        ],
      },
      {
        id: "blog-target-filter",
        label: "Target country",
        value: activeTargetFilter,
        onChange: setTargetFilter,
        options: [
          { value: "all", label: "All targets" },
          ...targets.map((c) => ({ value: c, label: c })),
        ],
      },
    ],
    [serviceTab, statusTab, activeOriginFilter, activeTargetFilter, origins, targets]
  );

  const statusCounts = useMemo(() => {
    const styles = {
      live: { style: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200", dot: "bg-emerald-500" },
      published: { style: "bg-amber-50 text-amber-700 ring-1 ring-amber-200", dot: "bg-amber-500" },
      writing: { style: "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200", dot: "bg-indigo-500" },
      draft: { style: "bg-slate-100 text-slate-600 ring-1 ring-slate-200", dot: "bg-slate-400" },
    };
    return ["live", "published", "writing", "draft"].map((key) => ({
      key,
      count: filteredBlogs.filter((b) => b.status === key).length,
      ...styles[key],
    }));
  }, [filteredBlogs]);

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
        <div className="flex flex-wrap items-center gap-2">
          <a
            href="https://zambeel-shopify-images.vercel.app/"
            target="_blank"
            rel="noreferrer"
            className="btn-secondary flex items-center gap-2"
          >
            <ImageUp className="h-4 w-4" /> Upload Images
            <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
          </a>
          <button type="button" onClick={openAdd} className="btn-primary flex items-center gap-2">
            <Plus className="h-4 w-4" /> Add Blog
          </button>
        </div>
      </div>

      {isAdmin && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Total blogs" value={stats.total} />
            <StatCard label="Published / Live" value={stats.published} />
            <StatCard label="Total words" value={stats.totalWords.toLocaleString()} />
            <StatCard label="Contributors" value={Object.keys(stats.byAuthor).length} />
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Posts by team member
            </h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byAuthor).length === 0 ? (
                <p className="text-sm text-slate-500">No blogs yet.</p>
              ) : (
                Object.entries(stats.byAuthor).map(([name, count]) => (
                  <span
                    key={name}
                    className="inline-flex items-center gap-2 rounded-full bg-slate-50 py-1 pl-3 pr-1.5 text-sm font-medium text-slate-700 ring-1 ring-slate-200"
                  >
                    {name}
                    <span className="rounded-full bg-indigo-600 px-2 py-0.5 text-xs font-bold text-white">
                      {count}
                    </span>
                  </span>
                ))
              )}
            </div>
          </div>
        </>
      )}

      <div className="flex flex-wrap gap-2 text-sm">
        {statusCounts.map((s) => (
          <span
            key={s.key}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-semibold ${s.style}`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
            {s.count} {s.key}
          </span>
        ))}
      </div>

      <FilterBar filters={filters} />


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
