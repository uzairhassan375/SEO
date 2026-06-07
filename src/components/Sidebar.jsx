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
  X,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useMobileNav } from "@/contexts/MobileNavContext";
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
  const { open, close, collapsed, toggleCollapsed } = useMobileNav();
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

  const showLabels = !collapsed;

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-50 flex h-screen flex-col bg-[#1e3a5f] text-white transition-all duration-300 ease-in-out",
        "w-64 max-w-[85vw] -translate-x-full lg:translate-x-0",
        open && "translate-x-0",
        collapsed ? "lg:w-[4.5rem]" : "lg:w-64 lg:max-w-none"
      )}
    >
      <div
        className={cn(
          "relative shrink-0 border-b border-white/10",
          collapsed ? "px-2 py-4 lg:px-2 lg:py-4" : "px-5 py-5 lg:px-6 lg:py-6"
        )}
      >
        <button
          type="button"
          onClick={close}
          className="absolute right-3 top-3 rounded-lg p-1.5 text-white/80 hover:bg-white/10 lg:hidden"
          aria-label="Close menu"
        >
          <X className="h-5 w-5" />
        </button>

        <div
          className={cn(
            "flex items-center",
            collapsed ? "lg:justify-center" : "justify-start"
          )}
        >
          <ZambeelLogo
            size={collapsed ? "sm" : "md"}
            priority
            className={cn(collapsed && "lg:mx-auto lg:max-w-[2.25rem] lg:object-center")}
          />
        </div>
        <p
          className={cn(
            "mt-3 text-xs font-medium tracking-wide text-white/60",
            collapsed && "lg:hidden"
          )}
        >
          SEO Management Platform
        </p>

        <button
          type="button"
          onClick={toggleCollapsed}
          className={cn(
            "mt-3 hidden w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-white/70 transition hover:bg-white/10 hover:text-white lg:flex",
            collapsed ? "justify-center px-0" : "justify-start"
          )}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <PanelLeftOpen className="h-5 w-5 shrink-0" />
          ) : (
            <>
              <PanelLeftClose className="h-5 w-5 shrink-0" />
              <span>Collapse</span>
            </>
          )}
        </button>
      </div>

      <nav className="sidebar-scroll flex-1 min-h-0 space-y-1 overflow-y-auto overflow-x-hidden px-2 py-4 lg:px-2">
        {visibleNav.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={close}
              title={collapsed ? item.label : undefined}
              aria-label={collapsed ? item.label : undefined}
              className={cn(
                "flex items-center rounded-lg py-2.5 text-sm font-medium transition",
                showLabels ? "gap-3 px-3" : "lg:justify-center lg:px-0 lg:py-3 px-3 gap-3",
                active
                  ? "bg-white/15 text-white"
                  : "text-white/70 hover:bg-white/10 hover:text-white"
              )}
            >
              <Icon className="h-5 w-5 shrink-0" />
              <span className={cn("truncate", collapsed && "lg:hidden")}>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="shrink-0 border-t border-white/10 p-2 lg:p-2">
        <Link
          href="/settings"
          onClick={close}
          title={collapsed ? getDisplayName(profile) : undefined}
          className={cn(
            "flex items-center rounded-lg py-2 transition hover:bg-white/10",
            collapsed ? "lg:justify-center lg:px-0 px-2 gap-3" : "gap-3 px-2",
            pathname === "/settings" && "bg-white/15"
          )}
        >
          <UserAvatar profile={profile} size="sm" className="shrink-0 ring-2 ring-white/20" />
          <div className={cn("min-w-0 flex-1", collapsed && "lg:hidden")}>
            <p className="truncate text-sm font-semibold text-white">
              {getDisplayName(profile)}
            </p>
          </div>
        </Link>
      </div>
    </aside>
  );
}
