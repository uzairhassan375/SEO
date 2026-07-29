"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import ZambeelLogo from "@/components/ZambeelLogo";

export default function LoginPage() {
  const { signIn, loading, user } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      router.replace("/dashboard");
      router.refresh();
    }
  }, [loading, user, router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      showToast("Email and password are required", "error");
      return;
    }
    setSubmitting(true);
    try {
      await signIn(email, password);
      router.refresh();
      router.replace("/dashboard");
    } catch (err) {
      showToast(err.message || "Login failed", "error");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return null;

  return (
    <div className="flex min-h-screen min-h-[100dvh] flex-col lg:flex-row">
      <div className="flex flex-col justify-center bg-[#1e3a5f] px-6 py-10 text-white sm:px-10 lg:flex-1 lg:px-12 lg:py-12">
        <div className="mx-auto w-full max-w-md lg:mx-auto">
          <div className="mb-6 lg:mb-8">
            <ZambeelLogo size="lg" priority />
          </div>
          <h1 className="text-3xl font-bold sm:text-4xl">Zambeel SEO</h1>
          <p className="mt-3 text-base text-white/70 sm:text-lg">
            Manage keywords, backlinks, blogs, and reports across Dropshipping,
            3PL, and 360 services.
          </p>
        </div>
      </div>
      <div className="flex flex-1 items-center justify-center bg-slate-50 px-5 py-10 sm:px-8 lg:py-0">
        <form onSubmit={handleSubmit} className="w-full max-w-md space-y-5">
          <h2 className="text-2xl font-bold text-slate-900">Sign in</h2>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@zambeel.com"
              required
              className="w-full"
              autoComplete="email"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full"
              autoComplete="current-password"
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="btn-primary w-full py-3"
          >
            {submitting ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
