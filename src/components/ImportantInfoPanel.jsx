"use client";

import { useEffect, useState, useMemo } from "react";
import { Info, Pencil, Save, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { timeAgo } from "@/lib/utils";

const ROW_ID = 1;

export default function ImportantInfoPanel() {
  const { isAdmin, user, profile } = useAuth();
  const { showToast } = useToast();
  const supabase = useMemo(() => createClient(), []);
  const [announcement, setAnnouncement] = useState(null);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchAnnouncement = async () => {
    const { data } = await supabase
      .from("site_announcement")
      .select("*")
      .eq("id", ROW_ID)
      .maybeSingle();
    if (data) {
      setAnnouncement(data);
      setTitle(data.title || "Important Information");
      setContent(data.content || "");
    }
  };

  useEffect(() => {
    fetchAnnouncement();

    const channel = supabase
      .channel("site_announcement_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "site_announcement",
          filter: `id=eq.${ROW_ID}`,
        },
        (payload) => {
          const row = payload.new;
          if (row) {
            setAnnouncement(row);
            if (!editing) {
              setTitle(row.title || "");
              setContent(row.content || "");
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, editing]);

  const save = async () => {
    if (!content.trim()) {
      showToast("Message cannot be empty", "error");
      return;
    }
    setSaving(true);
    const payload = {
      title: title.trim() || "Important Information",
      content: content.trim(),
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabase
      .from("site_announcement")
      .update(payload)
      .eq("id", ROW_ID);
    setSaving(false);
    if (error) return showToast(error.message, "error");
    showToast("Important info updated for all users");
    setEditing(false);
    fetchAnnouncement();
  };

  if (!announcement && !isAdmin) return null;

  return (
    <div className="mb-6 rounded-xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 shadow-sm">
      <div className="flex items-start justify-between gap-4 p-5">
        <div className="flex min-w-0 flex-1 gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-500 text-white">
            <Info className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            {editing ? (
              <div className="space-y-3">
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full font-semibold"
                  placeholder="Title"
                />
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={5}
                  className="w-full"
                  placeholder="What should the team focus on this week?"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={save}
                    disabled={saving}
                    className="btn-primary flex items-center gap-1 text-sm"
                  >
                    <Save className="h-4 w-4" />
                    {saving ? "Saving…" : "Publish to team"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditing(false);
                      setTitle(announcement?.title || "");
                      setContent(announcement?.content || "");
                    }}
                    className="btn-secondary flex items-center gap-1 text-sm"
                  >
                    <X className="h-4 w-4" /> Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                <h2 className="text-lg font-bold text-amber-900">
                  {announcement?.title || "Important Information"}
                </h2>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-amber-950/90">
                  {announcement?.content ||
                    "No priorities posted yet. Check back soon."}
                </p>
                {announcement?.updated_at && (
                  <p className="mt-2 text-xs text-amber-700/80">
                    Updated {timeAgo(announcement.updated_at)}
                    {profile && isAdmin ? "" : " · Live updates"}
                  </p>
                )}
              </>
            )}
          </div>
        </div>
        {isAdmin && !editing && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="btn-secondary flex shrink-0 items-center gap-1 text-sm"
          >
            <Pencil className="h-4 w-4" /> Edit
          </button>
        )}
      </div>
    </div>
  );
}
