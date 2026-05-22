"use client";

import { useRef, useState, useEffect } from "react";
import { Camera, Trash2 } from "lucide-react";
import UserAvatar from "./UserAvatar";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { uploadProfileAvatar, removeProfileAvatar } from "@/lib/avatars";
import { createClient } from "@/lib/supabase/client";
import { getDisplayName } from "@/lib/utils";

export default function ProfileSettingsForm() {
  const { profile, user, refreshProfile } = useAuth();
  const { showToast } = useToast();
  const fileRef = useRef(null);
  const [fullName, setFullName] = useState(profile?.full_name || "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setFullName(profile?.full_name || "");
  }, [profile?.full_name]);
  const [uploading, setUploading] = useState(false);
  const supabase = createClient();

  const saveName = async () => {
    if (!fullName.trim()) {
      showToast("Name cannot be empty", "error");
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: fullName.trim() })
      .eq("id", user.id);
    setSaving(false);
    if (error) return showToast(error.message, "error");
    showToast("Profile updated");
    refreshProfile();
  };

  const onFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      showToast("Please choose an image file", "error");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast("Image must be under 5MB", "error");
      return;
    }
    setUploading(true);
    try {
      await uploadProfileAvatar(user.id, file);
      showToast("Photo updated");
      refreshProfile();
    } catch (err) {
      showToast(err.message || "Upload failed", "error");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const removePhoto = async () => {
    if (!confirm("Remove profile photo?")) return;
    setUploading(true);
    try {
      await removeProfileAvatar(user.id);
      showToast("Photo removed");
      refreshProfile();
    } catch (err) {
      showToast(err.message || "Failed to remove photo", "error");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
      <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
        <div className="relative">
          <UserAvatar profile={profile} size="xl" showRing />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="absolute bottom-0 right-0 flex h-10 w-10 items-center justify-center rounded-full bg-[#1e3a5f] text-white shadow-lg hover:bg-[#2a4a73] disabled:opacity-50"
            title="Change photo"
          >
            <Camera className="h-5 w-5" />
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={onFileChange}
          />
        </div>

        <div className="flex-1 text-center sm:text-left">
          <h2 className="text-xl font-bold text-slate-900">
            {getDisplayName(profile)}
          </h2>
          <p className="mt-1 text-sm text-slate-500">{profile?.email}</p>
          <div className="mt-4 flex flex-wrap justify-center gap-2 sm:justify-start">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="btn-primary text-sm"
            >
              {uploading ? "Uploading…" : "Upload photo"}
            </button>
            {profile?.avatar_url && (
              <button
                type="button"
                onClick={removePhoto}
                disabled={uploading}
                className="btn-secondary flex items-center gap-1 text-sm text-red-600"
              >
                <Trash2 className="h-4 w-4" /> Remove
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="mt-8 border-t border-slate-100 pt-8">
        <label className="mb-2 block text-sm font-medium text-slate-700">
          Display name
        </label>
        <div className="flex max-w-md flex-col gap-3 sm:flex-row">
          <input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Your full name"
            className="flex-1"
          />
          <button
            type="button"
            onClick={saveName}
            disabled={saving}
            className="btn-primary shrink-0"
          >
            {saving ? "Saving…" : "Save name"}
          </button>
        </div>
        <p className="mt-2 text-xs text-slate-500">
          This name appears in the navbar, team pages, and activity feed.
        </p>
      </div>
    </div>
  );
}
