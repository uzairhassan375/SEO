"use client";

import { useCallback, useEffect, useState } from "react";
import { Megaphone, ArrowRight } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { timeAgo } from "@/lib/utils";

/**
 * Shows every announcement the member hasn't acknowledged yet.
 * "Got it" acknowledges it (admin then sees it as read). If the admin hits
 * Resend, the acknowledgement is cleared and this pops up again — live, via
 * the realtime subscription below, without needing a reload or a new login.
 */
export default function AnnouncementPopup() {
  const { user, isAdmin, supabase } = useAuth();
  const [queue, setQueue] = useState([]);
  const [index, setIndex] = useState(0);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!user || !supabase || isAdmin) return;

    const { data, error } = await supabase
      .from("announcement_recipients")
      .select(
        "announcement_id, seen_count, announcements!inner(id, title, body, created_at, active)"
      )
      .eq("user_id", user.id)
      .is("acknowledged_at", null)
      .eq("announcements.active", true);

    if (error || !data?.length) {
      setQueue([]);
      return;
    }

    setQueue(
      data
        .map((r) => ({ ...r.announcements, seenCount: r.seen_count }))
        .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
    );
    setIndex(0);
  }, [user, supabase, isAdmin]);

  useEffect(() => {
    if (!user || !supabase || isAdmin) return;
    load();

    const channel = supabase
      .channel(`announcements_for_${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "announcement_recipients",
          filter: `user_id=eq.${user.id}`,
        },
        () => load()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, supabase, isAdmin, load]);

  const current = queue[index];
  if (!current) return null;

  const isLast = index === queue.length - 1;

  const acknowledge = async () => {
    setBusy(true);
    const now = new Date().toISOString();
    const patch = {
      acknowledged_at: now,
      last_seen_at: now,
      seen_count: (current.seenCount || 0) + 1,
    };
    if (!current.seenCount) patch.first_seen_at = now;

    await supabase
      .from("announcement_recipients")
      .update(patch)
      .eq("announcement_id", current.id)
      .eq("user_id", user.id);
    setBusy(false);

    if (isLast) setQueue([]);
    else setIndex((i) => i + 1);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center p-0 sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="announcement-title"
        className="relative max-h-[92dvh] w-full overflow-y-auto rounded-t-2xl bg-white shadow-2xl sm:max-w-lg sm:rounded-2xl"
      >
        <div className="flex items-start gap-3 border-b border-slate-200 bg-indigo-600 px-5 py-4 text-white sm:rounded-t-2xl">
          <div className="rounded-lg bg-white/15 p-2">
            <Megaphone className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-indigo-100">
              Announcement from admin
            </p>
            <h2 id="announcement-title" className="truncate text-lg font-bold">
              {current.title}
            </h2>
          </div>
          {queue.length > 1 && (
            <span className="shrink-0 rounded-full bg-white/15 px-2.5 py-1 text-xs font-semibold">
              {index + 1}/{queue.length}
            </span>
          )}
        </div>

        <div className="px-5 py-5">
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
            {current.body}
          </p>
          <p className="mt-4 text-xs text-slate-400">Sent {timeAgo(current.created_at)}</p>
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-slate-200 px-5 py-4">
          <p className="text-xs text-slate-500">The admin is notified once you confirm.</p>
          <button
            type="button"
            onClick={acknowledge}
            disabled={busy}
            className="btn-primary flex items-center gap-2"
          >
            {isLast ? "Okay, got it" : "Next"}
            {!isLast && <ArrowRight className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}
