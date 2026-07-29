"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Megaphone, Send, Trash2, Users, Eye, EyeOff } from "lucide-react";
import Modal from "@/components/Modal";
import UserAvatar from "@/components/UserAvatar";
import LoadingSpinner from "@/components/LoadingSpinner";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { getDisplayName, timeAgo } from "@/lib/utils";
import { cn } from "@/lib/utils";

export default function AnnouncementComposer({ open, onClose }) {
  const { user, supabase } = useAuth();
  const { showToast } = useToast();
  const [members, setMembers] = useState([]);
  const [sent, setSent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState([]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: profs }, { data: anns }] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, full_name, email, role, avatar_url, assigned_service")
        .order("full_name"),
      supabase
        .from("announcements")
        .select(
          "id, title, body, active, created_at, announcement_recipients(user_id, seen_count, last_seen_at)"
        )
        .order("created_at", { ascending: false })
        .limit(20),
    ]);
    setMembers((profs || []).filter((p) => p.role !== "admin" && p.id !== user?.id));
    setSent(anns || []);
    setLoading(false);
  }, [supabase, user]);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  const profileMap = useMemo(
    () => Object.fromEntries(members.map((m) => [m.id, m])),
    [members]
  );

  const allSelected = members.length > 0 && selected.length === members.length;

  const toggle = (id) =>
    setSelected((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));

  const send = async (e) => {
    e.preventDefault();
    if (!body.trim()) return showToast("Write the announcement message", "error");
    if (selected.length === 0) return showToast("Select at least one member", "error");

    setSaving(true);
    const { data: ann, error } = await supabase
      .from("announcements")
      .insert({
        title: title.trim() || "Announcement",
        body: body.trim(),
        created_by: user.id,
        active: true,
      })
      .select("id")
      .single();

    if (error) {
      setSaving(false);
      return showToast(error.message, "error");
    }

    const { error: recError } = await supabase
      .from("announcement_recipients")
      .insert(selected.map((id) => ({ announcement_id: ann.id, user_id: id })));

    setSaving(false);
    if (recError) return showToast(recError.message, "error");

    showToast(`Announcement sent to ${selected.length} member${selected.length > 1 ? "s" : ""}`);
    setTitle("");
    setBody("");
    setSelected([]);
    load();
  };

  const toggleActive = async (row) => {
    const { error } = await supabase
      .from("announcements")
      .update({ active: !row.active })
      .eq("id", row.id);
    if (error) return showToast(error.message, "error");
    showToast(row.active ? "Announcement stopped" : "Announcement re-activated");
    load();
  };

  const remove = async (row) => {
    if (!confirm(`Delete announcement "${row.title}"?`)) return;
    const { error } = await supabase.from("announcements").delete().eq("id", row.id);
    if (error) return showToast(error.message, "error");
    showToast("Announcement deleted");
    load();
  };

  return (
    <Modal open={open} onClose={onClose} title="Send announcement" wide>
      {loading ? (
        <LoadingSpinner />
      ) : (
        <div className="space-y-6">
          <form onSubmit={send} className="space-y-4">
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="text-sm font-medium text-slate-700">
                  <Users className="mr-1 inline h-4 w-4 text-slate-400" />
                  Send to {selected.length > 0 && `(${selected.length} selected)`}
                </label>
                <button
                  type="button"
                  onClick={() => setSelected(allSelected ? [] : members.map((m) => m.id))}
                  className="text-xs font-semibold text-indigo-600 hover:underline"
                >
                  {allSelected ? "Clear all" : "Select everyone"}
                </button>
              </div>
              {members.length === 0 ? (
                <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-500">
                  No members yet. Add team members in Settings.
                </p>
              ) : (
                <div className="flex max-h-44 flex-wrap gap-2 overflow-y-auto rounded-lg border border-slate-200 p-2">
                  {members.map((m) => {
                    const on = selected.includes(m.id);
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => toggle(m.id)}
                        className={cn(
                          "inline-flex items-center gap-2 rounded-full border py-1 pl-1 pr-3 text-sm font-medium transition",
                          on
                            ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                            : "border-slate-200 text-slate-600 hover:bg-slate-50"
                        )}
                      >
                        <UserAvatar profile={m} size="xs" />
                        {getDisplayName(m)}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Title</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full"
                placeholder="e.g. Weekly report deadline moved"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Description *
              </label>
              <textarea
                required
                rows={4}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="w-full"
                placeholder="What should the team know? This is what pops up when they log in."
              />
            </div>

            <div className="flex items-center gap-2">
              <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
                <Send className="h-4 w-4" />
                {saving ? "Sending…" : "Send announcement"}
              </button>
              <button type="button" onClick={onClose} className="btn-secondary">
                Close
              </button>
            </div>
            <p className="text-xs text-slate-500">
              Selected members see this popup every time they log in, until you stop it below.
            </p>
          </form>

          <div className="border-t border-slate-200 pt-4">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Sent announcements
            </h3>
            {sent.length === 0 ? (
              <p className="text-sm text-slate-500">Nothing sent yet.</p>
            ) : (
              <ul className="space-y-3">
                {sent.map((a) => {
                  const recips = a.announcement_recipients || [];
                  const seen = recips.filter((r) => r.seen_count > 0);
                  return (
                    <li
                      key={a.id}
                      className="rounded-lg border border-slate-200 p-3 text-sm"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="flex items-center gap-2 font-semibold text-slate-800">
                            <Megaphone className="h-4 w-4 shrink-0 text-indigo-500" />
                            <span className="truncate">{a.title}</span>
                            <span
                              className={cn(
                                "shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold",
                                a.active
                                  ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                                  : "bg-slate-100 text-slate-500 ring-1 ring-slate-200"
                              )}
                            >
                              {a.active ? "Active" : "Stopped"}
                            </span>
                          </p>
                          <p className="mt-1 line-clamp-2 text-slate-600">{a.body}</p>
                          <p className="mt-1.5 text-xs text-slate-400">
                            {timeAgo(a.created_at)} · {recips.length} recipient
                            {recips.length !== 1 ? "s" : ""} · {seen.length} seen
                          </p>
                          {recips.length > 0 && (
                            <p className="mt-1 text-xs text-slate-500">
                              {recips
                                .map(
                                  (r) =>
                                    `${getDisplayName(profileMap[r.user_id]) || "Member"}${
                                      r.seen_count > 0 ? ` ✓${r.seen_count}` : " — not seen"
                                    }`
                                )
                                .join(" · ")}
                            </p>
                          )}
                        </div>
                        <div className="flex shrink-0 gap-1">
                          <button
                            type="button"
                            onClick={() => toggleActive(a)}
                            title={a.active ? "Stop showing" : "Show again"}
                            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                          >
                            {a.active ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => remove(a)}
                            title="Delete"
                            className="rounded-lg p-2 text-rose-500 hover:bg-rose-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}
