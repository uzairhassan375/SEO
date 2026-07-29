"use client";

import { useState, useMemo } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { useLinks } from "@/hooks/useLinks";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import Modal from "@/components/Modal";
import LoadingSpinner from "@/components/LoadingSpinner";
import EmptyState from "@/components/EmptyState";
import FilterBar from "@/components/FilterBar";
import { ServiceBadge, StatusBadge } from "@/components/Badge";
import { SERVICES, SERVICE_LABELS } from "@/lib/constants";
import { logActivity } from "@/lib/activity";
import { createClient } from "@/lib/supabase/client";

const emptyForm = {
  source_url: "",
  target_url: "",
  service: "dropshipping",
  type: "backlink",
  dr_score: "",
  status: "pending",
  notes: "",
};

export default function LinksPage() {
  const { profile, isAdmin, user } = useAuth();
  const { showToast } = useToast();
  const [typeTab, setTypeTab] = useState("all");
  const [serviceTab, setServiceTab] = useState("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const { links, loading, refetch } = useLinks(serviceTab, typeTab);
  const supabase = createClient();

  const counts = useMemo(() => ({
    live: links.filter((l) => l.status === "live").length,
    pending: links.filter((l) => l.status === "pending").length,
    rejected: links.filter((l) => l.status === "rejected").length,
  }), [links]);

  const openAdd = () => {
    setEditing(null);
    setForm({
      ...emptyForm,
      service: isAdmin ? "dropshipping" : profile?.assigned_service || "dropshipping",
    });
    setModalOpen(true);
  };

  const save = async (e) => {
    e.preventDefault();
    if (!form.source_url || !form.target_url) {
      showToast("Source and target URLs required", "error");
      return;
    }
    const payload = {
      source_url: form.source_url,
      target_url: form.target_url,
      service: form.service,
      type: form.type,
      dr_score: form.dr_score === "" ? null : Number(form.dr_score),
      status: form.status,
      notes: form.notes,
      added_by: user.id,
      date_added: new Date().toISOString().slice(0, 10),
    };

    if (editing) {
      const { added_by: _omit, ...updatePayload } = payload;
      const { error } = await supabase.from("backlinks").update(updatePayload).eq("id", editing.id);
      if (error) return showToast(error.message, "error");
      await logActivity({
        user: profile,
        action: "updated_link",
        entityType: "backlink",
        entityId: editing.id,
        entityName: form.source_url,
        service: payload.service,
        oldValue: editing.status,
        newValue: payload.status,
      });
      showToast("Link updated");
    } else {
      const { data, error } = await supabase.from("backlinks").insert(payload).select().single();
      if (error) return showToast(error.message, "error");
      await logActivity({
        user: profile,
        action: "added_link",
        entityType: "backlink",
        entityId: data.id,
        entityName: form.source_url,
        service: payload.service,
      });
      showToast("Link added");
    }
    setModalOpen(false);
    refetch();
  };

  const remove = async (row) => {
    if (!confirm("Delete this link?")) return;
    const { error } = await supabase.from("backlinks").delete().eq("id", row.id);
    if (error) return showToast(error.message, "error");
    await logActivity({
      user: profile,
      action: "deleted_link",
      entityType: "backlink",
      entityId: row.id,
      entityName: row.source_url,
      service: row.service,
    });
    showToast("Link deleted");
    refetch();
  };

  const serviceTabs = isAdmin ? ["all", ...SERVICES] : [profile?.assigned_service].filter(Boolean);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-slate-900">Links & Guest Posts</h1>
        <button type="button" onClick={openAdd} className="btn-primary flex items-center gap-2">
          <Plus className="h-4 w-4" /> Add Link
        </button>
      </div>

      <div className="flex flex-wrap gap-2 text-sm">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 font-semibold text-emerald-700 ring-1 ring-emerald-200">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          {counts.live} live
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 font-semibold text-amber-700 ring-1 ring-amber-200">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
          {counts.pending} pending
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-3 py-1 font-semibold text-rose-700 ring-1 ring-rose-200">
          <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
          {counts.rejected} rejected
        </span>
      </div>

      <FilterBar
        filters={[
          {
            id: "link-type-filter",
            label: "Type",
            value: typeTab,
            onChange: setTypeTab,
            options: [
              { value: "all", label: "All types" },
              { value: "backlink", label: "Backlinks" },
              { value: "guest_post", label: "Guest Posts" },
            ],
          },
          {
            id: "link-service-filter",
            label: "Service",
            value: serviceTab,
            onChange: setServiceTab,
            options: serviceTabs.map((t) => ({
              value: t,
              label: t === "all" ? "All services" : SERVICE_LABELS[t],
            })),
          },
        ]}
      />

      {loading ? (
        <LoadingSpinner />
      ) : links.length === 0 ? (
        <EmptyState title="No links yet" message="Add backlinks or guest posts to track outreach." />
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-white shadow-sm table-row-hover">
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Source URL</th>
                <th className="px-4 py-3">Target</th>
                <th className="px-4 py-3">Service</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">DR</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {links.map((l) => (
                <tr key={l.id}>
                  <td className="max-w-[180px] truncate px-4 py-3">
                    <a href={l.source_url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                      {l.source_url}
                    </a>
                  </td>
                  <td className="max-w-[180px] truncate px-4 py-3">{l.target_url}</td>
                  <td className="px-4 py-3"><ServiceBadge service={l.service} /></td>
                  <td className="px-4 py-3 capitalize">{l.type.replace("_", " ")}</td>
                  <td className="px-4 py-3">{l.dr_score ?? "—"}</td>
                  <td className="px-4 py-3"><StatusBadge status={l.status} /></td>
                  <td className="px-4 py-3">{l.date_added || "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      {(isAdmin || l.added_by === user.id) && (
                        <>
                          <button type="button" onClick={() => { setEditing(l); setForm({ ...l, dr_score: l.dr_score ?? "" }); setModalOpen(true); }} className="text-slate-500">
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button type="button" onClick={() => remove(l)} className="text-red-500">
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

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Edit Link" : "Add Link"} wide>
        <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium">Source URL *</label>
            <input required value={form.source_url} onChange={(e) => setForm({ ...form, source_url: e.target.value })} className="w-full" />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium">Target URL *</label>
            <input required value={form.target_url} onChange={(e) => setForm({ ...form, target_url: e.target.value })} className="w-full" />
          </div>
          {isAdmin && (
            <div>
              <label className="mb-1 block text-sm font-medium">Service</label>
              <select value={form.service} onChange={(e) => setForm({ ...form, service: e.target.value })} className="w-full">
                {SERVICES.map((s) => <option key={s} value={s}>{SERVICE_LABELS[s]}</option>)}
              </select>
            </div>
          )}
          <div>
            <label className="mb-1 block text-sm font-medium">Type</label>
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="w-full">
              <option value="backlink">Backlink</option>
              <option value="guest_post">Guest Post</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">DR Score</label>
            <input type="number" value={form.dr_score} onChange={(e) => setForm({ ...form, dr_score: e.target.value })} className="w-full" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Status</label>
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="w-full">
              <option value="live">Live</option>
              <option value="pending">Pending</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium">Notes</label>
            <textarea value={form.notes || ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="w-full" rows={2} />
          </div>
          <div className="flex gap-2 sm:col-span-2">
            <button type="submit" className="btn-primary">Save</button>
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">Cancel</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
