"use client";

import { useCallback, useEffect, useState } from "react";
import { KeyRound, Trash2, ShieldAlert } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { createClient } from "@/lib/supabase/client";
import { SERVICES, SERVICE_LABELS, ADMIN_EMAIL } from "@/lib/constants";
import { getDisplayName } from "@/lib/utils";
import LoadingSpinner from "@/components/LoadingSpinner";
import Modal from "@/components/Modal";
import ProfileSettingsForm from "@/components/ProfileSettingsForm";
import UserAvatar from "@/components/UserAvatar";
import { cn } from "@/lib/utils";

export default function SettingsPage() {
  const { isAdmin, refreshProfile, user } = useAuth();
  const { showToast } = useToast();
  const [tab, setTab] = useState("profile");
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pwTarget, setPwTarget] = useState(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [busy, setBusy] = useState(false);
  const supabase = createClient();

  const loadUsers = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("profiles").select("*").order("email");
    setUsers(data || []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    if (tab === "team" && isAdmin) loadUsers();
  }, [tab, isAdmin, loadUsers]);

  const savePassword = async (e) => {
    e.preventDefault();
    if (password.length < 8) return showToast("Password must be at least 8 characters", "error");
    if (password !== confirmPassword) return showToast("Passwords do not match", "error");

    setBusy(true);
    const res = await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: pwTarget.id, password }),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(false);

    if (!res.ok) return showToast(json.error || "Could not update password", "error");
    showToast(`Password updated for ${getDisplayName(pwTarget)}`);
    setPwTarget(null);
    setPassword("");
    setConfirmPassword("");
  };

  const confirmDelete = async () => {
    setBusy(true);
    const res = await fetch(`/api/admin/users?userId=${deleteTarget.id}`, { method: "DELETE" });
    const json = await res.json().catch(() => ({}));
    setBusy(false);

    if (!res.ok) return showToast(json.error || "Could not delete user", "error");
    showToast(`${getDisplayName(deleteTarget)} deleted`);
    setDeleteTarget(null);
    loadUsers();
  };

  const updateUser = async (id, field, value) => {
    const { error } = await supabase.from("profiles").update({ [field]: value }).eq("id", id);
    if (error) return showToast(error.message, "error");
    setUsers((u) => u.map((x) => (x.id === id ? { ...x, [field]: value } : x)));
    if (field === "email" && value === "admin@zambeel.com") {
      await supabase.from("profiles").update({ role: "admin" }).eq("id", id);
    }
    showToast("User updated");
    refreshProfile();
  };

  const tabs = [
    { id: "profile", label: "My Profile" },
    ...(isAdmin ? [{ id: "team", label: "Team Management" }] : []),
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="mt-1 text-sm text-slate-500">
          Update your profile photo and name, or manage the team (admin).
        </p>
      </div>

      <div className="flex gap-1 border-b border-slate-200">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "border-b-2 px-4 py-2.5 text-sm font-medium transition",
              tab === t.id
                ? "border-[#1e3a5f] text-[#1e3a5f]"
                : "border-transparent text-slate-500 hover:text-slate-800"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "profile" && <ProfileSettingsForm />}

      {tab === "team" && isAdmin && (
        <div className="rounded-xl border bg-white p-4 shadow-sm sm:p-6">
          <h2 className="mb-2 text-lg font-semibold text-slate-900">Team users</h2>
          <p className="mb-6 text-sm text-slate-500">
            Assign roles and services. Users can set their own photo and name under My Profile.
          </p>
          {loading ? (
            <LoadingSpinner />
          ) : (
            <div className="space-y-4">
              {users.map((u) => (
                <div
                  key={u.id}
                  className="flex flex-col gap-4 rounded-xl border border-slate-100 p-4 lg:flex-row lg:items-center"
                >
                  <div className="flex min-w-[200px] items-center gap-4">
                    <UserAvatar profile={u} size="md" />
                    <div>
                      <p className="font-semibold text-slate-900">
                        {getDisplayName(u)}
                      </p>
                      <p className="text-sm text-slate-500">{u.email}</p>
                    </div>
                  </div>
                  <div className="grid flex-1 gap-4 sm:grid-cols-3">
                    <div>
                      <label className="text-xs font-medium text-slate-500">
                        Full name (admin edit)
                      </label>
                      <input
                        defaultValue={u.full_name || ""}
                        onBlur={(e) => {
                          if (e.target.value !== (u.full_name || "")) {
                            updateUser(u.id, "full_name", e.target.value);
                          }
                        }}
                        className="mt-1 w-full"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-500">Role</label>
                      <select
                        value={u.role}
                        disabled={u.email === "admin@zambeel.com"}
                        onChange={(e) => updateUser(u.id, "role", e.target.value)}
                        className="mt-1 w-full"
                      >
                        <option value="admin">Admin</option>
                        <option value="member">Member</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-500">
                        Assigned service
                      </label>
                      <select
                        value={u.assigned_service || ""}
                        disabled={u.role === "admin"}
                        onChange={(e) =>
                          updateUser(u.id, "assigned_service", e.target.value || null)
                        }
                        className="mt-1 w-full"
                      >
                        <option value="">—</option>
                        {SERVICES.map((s) => (
                          <option key={s} value={s}>
                            {SERVICE_LABELS[s]}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-2 lg:flex-col xl:flex-row">
                    <button
                      type="button"
                      onClick={() => {
                        setPwTarget(u);
                        setPassword("");
                        setConfirmPassword("");
                      }}
                      className="btn-secondary flex items-center gap-2 text-xs"
                    >
                      <KeyRound className="h-4 w-4" /> Password
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(u)}
                      disabled={u.email === ADMIN_EMAIL || u.id === user?.id}
                      title={
                        u.email === ADMIN_EMAIL
                          ? "The primary admin cannot be deleted"
                          : u.id === user?.id
                            ? "You cannot delete your own account"
                            : "Delete user"
                      }
                      className="flex items-center gap-2 rounded-lg border border-rose-200 px-4 py-2 text-xs font-medium text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <Trash2 className="h-4 w-4" /> Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          <p className="mt-6 text-xs text-slate-500">
            Deleting a user removes their login and profile. Their keywords, links, and blogs stay
            in the reports.
          </p>
        </div>
      )}

      <Modal
        open={Boolean(pwTarget)}
        onClose={() => setPwTarget(null)}
        title={`Set password — ${pwTarget ? getDisplayName(pwTarget) : ""}`}
      >
        <form onSubmit={savePassword} className="space-y-4">
          <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
            {pwTarget?.email}
          </p>
          <div>
            <label className="mb-1 block text-sm font-medium">New password *</label>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full"
              placeholder="At least 8 characters"
              autoComplete="new-password"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Confirm password *</label>
            <input
              type="password"
              required
              minLength={8}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full"
              autoComplete="new-password"
            />
          </div>
          <p className="text-xs text-slate-500">
            The user is not notified — share the new password with them directly.
          </p>
          <div className="flex gap-2">
            <button type="submit" disabled={busy} className="btn-primary">
              {busy ? "Saving…" : "Update password"}
            </button>
            <button type="button" onClick={() => setPwTarget(null)} className="btn-secondary">
              Cancel
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Delete user"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-lg bg-rose-50 p-3 text-sm text-rose-800 ring-1 ring-rose-200">
            <ShieldAlert className="h-5 w-5 shrink-0" />
            <p>
              This permanently deletes the login and profile for{" "}
              <strong>{deleteTarget ? getDisplayName(deleteTarget) : ""}</strong> (
              {deleteTarget?.email}). It cannot be undone.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={confirmDelete}
              disabled={busy}
              className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:opacity-50"
            >
              {busy ? "Deleting…" : "Delete user"}
            </button>
            <button type="button" onClick={() => setDeleteTarget(null)} className="btn-secondary">
              Cancel
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
