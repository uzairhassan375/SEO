"use client";

import Sidebar from "./Sidebar";
import Navbar from "./Navbar";
import LoadingSpinner from "./LoadingSpinner";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function AppLayout({ children }) {
  const { loading, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-slate-50">
        <LoadingSpinner />
        <p className="text-sm text-slate-500">Loading Zambeel SEO…</p>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar />
      <div className="pl-64">
        <Navbar />
        <main className="p-8">{children}</main>
      </div>
    </div>
  );
}
