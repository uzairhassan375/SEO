"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { useTasks } from "@/hooks/useTasks";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import Modal from "@/components/Modal";
import LoadingSpinner from "@/components/LoadingSpinner";
import EmptyState from "@/components/EmptyState";
import { ServiceBadge, PriorityBadge, StatusBadge } from "@/components/Badge";
import { SERVICES, SERVICE_LABELS } from "@/lib/constants";
import { logActivity } from "@/lib/activity";
import { createClient } from "@/lib/supabase/client";
import UserAvatar from "@/components/UserAvatar";
import { getWeekNumber, getDisplayName } from "@/lib/utils";

export default function TasksPage() {
  const { profile, isAdmin, user } = useAuth();
  const { showToast } = useToast();
  const [week, setWeek] = useState(getWeekNumber());
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    title: "",
    description: "",
    service: "dropshipping",
    assigned_to: "",
    priority: "medium",
    due_date: "",
    status: "pending",
  });

  const { tasks, profiles, loading, refetch } = useTasks(week);
  const supabase = createClient();

  const getProfile = (id) => profiles.find((x) => x.id === id);

  const save = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) {
      showToast("Title required", "error");
      return;
    }
    const payload = {
      title: form.title,
      description: form.description,
      service: isAdmin ? form.service : profile?.assigned_service,
      assigned_to: form.assigned_to || null,
      priority: form.priority,
      due_date: form.due_date || null,
      status: form.status,
      week_number: week,
      created_by: user.id,
    };

    if (editing) {
      const { error } = await supabase.from("tasks").update(payload).eq("id", editing.id);
      if (error) return showToast(error.message, "error");
      await logActivity({
        user: profile,
        action: "updated_task",
        entityType: "task",
        entityId: editing.id,
        entityName: payload.title,
        service: payload.service,
        oldValue: editing.status,
        newValue: payload.status,
      });
      showToast("Task updated");
    } else {
      const { data, error } = await supabase.from("tasks").insert(payload).select().single();
      if (error) return showToast(error.message, "error");
      await logActivity({
        user: profile,
        action: "added_task",
        entityType: "task",
        entityId: data.id,
        entityName: payload.title,
        service: payload.service,
      });
      showToast("Task created");
    }
    setModalOpen(false);
    refetch();
  };

  const remove = async (task) => {
    if (!confirm(`Delete task "${task.title}"?`)) return;
    const { error } = await supabase.from("tasks").delete().eq("id", task.id);
    if (error) return showToast(error.message, "error");
    await logActivity({
      user: profile,
      action: "deleted_task",
      entityType: "task",
      entityId: task.id,
      entityName: task.title,
      service: task.service,
    });
    showToast("Task deleted");
    refetch();
  };

  const updateStatus = async (task, status) => {
    const { error } = await supabase.from("tasks").update({ status }).eq("id", task.id);
    if (error) return showToast(error.message, "error");
    await logActivity({
      user: profile,
      action: "completed_task",
      entityType: "task",
      entityId: task.id,
      entityName: task.title,
      service: task.service,
      oldValue: task.status,
      newValue: status,
    });
    showToast("Status updated");
    refetch();
  };

  const assignable = profiles.filter((p) => p.role !== "admin" || isAdmin);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-slate-900">Tasks / Team Planner</h1>
        {isAdmin && (
          <button
            type="button"
            onClick={() => {
              setEditing(null);
              setForm({
                title: "",
                description: "",
                service: "dropshipping",
                assigned_to: "",
                priority: "medium",
                due_date: "",
                status: "pending",
              });
              setModalOpen(true);
            }}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="h-4 w-4" /> Add Task
          </button>
        )}
      </div>

      <div className="flex items-center gap-3">
        <label className="text-sm font-medium text-slate-700">Week</label>
        <input
          type="number"
          min={1}
          max={53}
          value={week}
          onChange={(e) => setWeek(Number(e.target.value))}
          className="w-24"
        />
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : tasks.length === 0 ? (
        <EmptyState title="No tasks this week" message="Create tasks to plan your SEO work." />
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-white shadow-sm table-row-hover">
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Service</th>
                <th className="px-4 py-3">Assigned to</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Priority</th>
                <th className="px-4 py-3">Due</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {tasks.map((t) => (
                <tr key={t.id}>
                  <td className="px-4 py-3 font-medium">{t.title}</td>
                  <td className="px-4 py-3"><ServiceBadge service={t.service} /></td>
                  <td className="px-4 py-3">
                    {t.assigned_to ? (
                      <div className="flex items-center gap-2">
                        <UserAvatar profile={getProfile(t.assigned_to)} size="xs" />
                        <span className="font-medium text-slate-800">
                          {getDisplayName(getProfile(t.assigned_to))}
                        </span>
                      </div>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={t.status}
                      onChange={(e) => updateStatus(t, e.target.value)}
                      disabled={!isAdmin && t.assigned_to !== user.id}
                      className="text-sm"
                    >
                      <option value="pending">Pending</option>
                      <option value="in_progress">In progress</option>
                      <option value="done">Done</option>
                      <option value="blocked">Blocked</option>
                    </select>
                  </td>
                  <td className="px-4 py-3"><PriorityBadge priority={t.priority} /></td>
                  <td className="px-4 py-3">{t.due_date || "—"}</td>
                  <td className="px-4 py-3">
                    {isAdmin && (
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setEditing(t);
                            setForm({
                              title: t.title,
                              description: t.description || "",
                              service: t.service,
                              assigned_to: t.assigned_to || "",
                              priority: t.priority,
                              due_date: t.due_date || "",
                              status: t.status,
                            });
                            setModalOpen(true);
                          }}
                          title="Edit task"
                        >
                          <Pencil className="h-4 w-4 text-slate-500 hover:text-[#1e3a5f]" />
                        </button>
                        <button
                          type="button"
                          onClick={() => remove(t)}
                          title="Delete task"
                        >
                          <Trash2 className="h-4 w-4 text-red-500 hover:text-red-700" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Edit Task" : "Add Task"} wide>
        <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium">Title *</label>
            <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full" />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium">Description</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full" rows={3} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Service</label>
            <select value={form.service} onChange={(e) => setForm({ ...form, service: e.target.value })} className="w-full">
              {SERVICES.map((s) => <option key={s} value={s}>{SERVICE_LABELS[s]}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Assign to</label>
            <select value={form.assigned_to} onChange={(e) => setForm({ ...form, assigned_to: e.target.value })} className="w-full">
              <option value="">Unassigned</option>
              {assignable.map((p) => (
                <option key={p.id} value={p.id}>{getDisplayName(p)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Priority</label>
            <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} className="w-full">
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Due date</label>
            <input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} className="w-full" />
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
