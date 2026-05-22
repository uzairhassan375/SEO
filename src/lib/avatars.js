import { createClient } from "./supabase/client";

const BUCKET = "avatars";

export async function uploadProfileAvatar(userId, file) {
  const supabase = createClient();
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${userId}/avatar.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { upsert: true, cacheControl: "3600" });

  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  const avatarUrl = `${data.publicUrl}?t=${Date.now()}`;

  const { error: profileError } = await supabase
    .from("profiles")
    .update({ avatar_url: avatarUrl })
    .eq("id", userId);

  if (profileError) throw profileError;

  return avatarUrl;
}

export async function removeProfileAvatar(userId) {
  const supabase = createClient();
  const { data: files } = await supabase.storage.from(BUCKET).list(userId);
  if (files?.length) {
    await supabase.storage
      .from(BUCKET)
      .remove(files.map((f) => `${userId}/${f.name}`));
  }
  await supabase.from("profiles").update({ avatar_url: null }).eq("id", userId);
}
