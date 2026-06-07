"use client";

import Link from "next/link";
import { LogOut, Menu } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useMobileNav } from "@/contexts/MobileNavContext";
import UserAvatar from "./UserAvatar";
import { getDisplayName } from "@/lib/utils";
import { cn } from "@/lib/utils";

export default function Navbar() {
  const { profile, signOut } = useAuth();
  const { toggle, collapsed } = useMobileNav();

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 lg:h-16 lg:gap-0 lg:px-8">
      <div className="flex min-w-0 flex-1 items-center gap-3 lg:flex-none">
        <button
          type="button"
          onClick={toggle}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-slate-700 hover:bg-slate-100 lg:hidden"
          aria-label="Open menu"
        >
          <Menu className="h-6 w-6" />
        </button>
        <Link
          href="/dashboard"
          className={cn(
            "truncate text-sm font-bold text-[#1e3a5f]",
            collapsed ? "hidden lg:block" : "lg:hidden"
          )}
        >
          Zambeel SEO
        </Link>
      </div>
      <div className="flex shrink-0 items-center gap-2 lg:gap-3">
        <Link
          href="/settings"
          className="flex items-center gap-2 rounded-lg px-2 py-1.5 transition hover:bg-slate-50 lg:gap-3"
        >
          <UserAvatar profile={profile} size="sm" showRing />
          <p className="hidden max-w-[120px] truncate text-sm font-semibold text-slate-900 sm:block lg:max-w-none">
            {getDisplayName(profile)}
          </p>
        </Link>
        <button
          type="button"
          onClick={signOut}
          className="flex h-10 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm text-slate-600 hover:bg-slate-50 lg:h-auto"
          title="Logout"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          <span className="hidden sm:inline">Logout</span>
        </button>
      </div>
    </header>
  );
}
