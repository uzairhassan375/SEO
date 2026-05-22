"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Search,
  Link2,
  ListTodo,
  FileText,
  BookOpen,
  FileBarChart,
  BarChart3,
  Settings,
  Activity,
  Megaphone,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import UserAvatar from "@/components/UserAvatar";
import ZambeelLogo from "@/components/ZambeelLogo";
import { getDisplayName } from "@/lib/utils";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/keywords", label: "Keywords", icon: Search },
  { href: "/pages", label: "Pages", icon: FileBarChart },
  { href: "/links", label: "Links", icon: Link2 },
  { href: "/blogs", label: "Blogs", icon: BookOpen },
  { href: "/tasks", label: "Tasks", icon: ListTodo },
  { href: "/important-info", label: "Important Info", icon: Megaphone, needsPost: true },
  { href: "/weekly-report", label: "Weekly Report", icon: FileText },
  { href: "/monthly-report", label: "Monthly Report", icon: BarChart3, adminOnly: true },
  { href: "/team-activity", label: "Team Activity", icon: Activity, adminOnly: true },
  { href: "/settings", label: "Settings", icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { isAdmin, profile, supabase } = useAuth();
  const [hasPublishedPosts, setHasPublishedPosts] = useState(isAdmin);

  useEffect(() => {
    if (isAdmin) {
      setHasPublishedPosts(true);
      return;
    }

    let channel;

    const check = async () => {
      const { count } = await supabase
        .from("weekly_important_info")
        .select("id", { count: "exact", head: true })
        .eq("published", true);
      setHasPublishedPosts((count ?? 0) > 0);
    };

    const timer = setTimeout(() => {
      check();
      channel = supabase
        .channel("sidebar_weekly_info")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "weekly_important_info" },
          () => check()
        )
        .subscribe();
    }, 300);

    return () => {
      clearTimeout(timer);
      if (channel) supabase.removeChannel(channel);
    };
  }, [isAdmin, supabase]);

  const visibleNav = nav.filter((item) => {
    if (item.adminOnly && !isAdmin) return false;
    if (item.needsPost && !isAdmin && !hasPublishedPosts) return false;
    return true;
  });

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-64 flex-col bg-[#1e3a5f] text-white">
      <div className="border-b border-white/10 px-6 py-6">
        <ZambeelLogo size="md" priority />
        <p className="mt-3 text-xs font-medium tracking-wide text-white/60">
          SEO Management Platform
        </p>
      </div>
      <nav className="sidebar-scroll flex-1 min-h-0 space-y-1 overflow-y-auto overflow-x-hidden px-3 py-4">
        {visibleNav.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition",
                active
                  ? "bg-white/15 text-white"
                  : "text-white/70 hover:bg-white/10 hover:text-white"
              )}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/10 p-4">
        <Link
          href="/settings"
          className={cn(
            "flex items-center gap-3 rounded-lg px-2 py-2 transition hover:bg-white/10",
            pathname === "/settings" && "bg-white/15"
          )}
        >
          <UserAvatar profile={profile} size="sm" className="ring-2 ring-white/20" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-white">
              {getDisplayName(profile)}
            </p>
          </div>
        </Link>
      </div>
    </aside>
  );
}
