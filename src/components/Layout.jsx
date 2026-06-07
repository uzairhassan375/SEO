"use client";

import Sidebar from "./Sidebar";
import Navbar from "./Navbar";
import LoadingSpinner from "./LoadingSpinner";
import { useAuth } from "@/contexts/AuthContext";
import { MobileNavProvider, useMobileNav } from "@/contexts/MobileNavContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { cn } from "@/lib/utils";

function AppLayoutShell({ children }) {
  const { loading, user } = useAuth();
  const router = useRouter();
  const { open, close, collapsed } = useMobileNav();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-slate-50 px-4">
        <LoadingSpinner />
        <p className="text-center text-sm text-slate-500">Loading Zambeel SEO…</p>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-slate-50">
      {open && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-slate-900/50 lg:hidden"
          onClick={close}
          aria-label="Close menu"
        />
      )}
      <Sidebar />
      <div
        className={cn(
          "app-main-shell transition-[padding] duration-300 ease-in-out",
          collapsed ? "lg:pl-[4.5rem]" : "lg:pl-64"
        )}
      >
        <Navbar />
        <main className="p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}

export default function AppLayout({ children }) {
  return (
    <MobileNavProvider>
      <AppLayoutShell>{children}</AppLayoutShell>
    </MobileNavProvider>
  );
}
