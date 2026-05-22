"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { createClient } from "@/lib/supabase/client";
import { SERVICES, SERVICE_LABELS } from "@/lib/constants";
import { getDisplayName } from "@/lib/utils";
import LoadingSpinner from "@/components/LoadingSpinner";
import ProfileSettingsForm from "@/components/ProfileSettingsForm";
import UserAvatar from "@/components/UserAvatar";
import { cn } from "@/lib/utils";

export default function SettingsPage() {
  const { isAdmin, refreshProfile } = useAuth();
  const { showToast } = useToast();
  const [tab, setTab] = useState("profile");
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    if (tab === "team" && isAdmin) {
      setLoading(true);
      supabase
        .from("profiles")
        .select("*")
        .order("email")
        .then(({ data }) => {
          setUsers(data || []);
          setLoading(false);
        });
    }
  }, [tab, isAdmin, supabase]);

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
                </div>
              ))}
            </div>
          )}
          <p className="mt-6 text-xs text-slate-500">
            Reset passwords in Supabase Dashboard → Authentication → Users
          </p>
        </div>
      )}
    </div>
  );
}
