"use client";

import Link from "next/link";
import { LogOut } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import UserAvatar from "./UserAvatar";
import { getDisplayName } from "@/lib/utils";

export default function Navbar() {
  const { profile, signOut } = useAuth();

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-8">
      <div />
      <div className="flex items-center gap-3">
        <Link
          href="/settings"
          className="flex items-center gap-3 rounded-lg px-2 py-1.5 transition hover:bg-slate-50"
        >
          <UserAvatar profile={profile} size="sm" showRing />
          <p className="hidden text-sm font-semibold text-slate-900 sm:block">
            {getDisplayName(profile)}
          </p>
        </Link>
        <button
          type="button"
          onClick={signOut}
          className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
          title="Logout"
        >
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline">Logout</span>
        </button>
      </div>
    </header>
  );
}
