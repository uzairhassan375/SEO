import { createClient } from "./supabase/client";

export async function logActivity({
  user,
  /** When set (e.g. blog owner), activity is attributed to this user instead of the actor. */
  attributedUser,
  action,
  entityType,
  entityId,
  entityName,
  service,
  oldValue,
  newValue,
}) {
  const supabase = createClient();
  const subject = attributedUser || user;
  const { error } = await supabase.from("activity_log").insert({
    user_id: subject?.id,
    user_name: subject?.full_name || subject?.email,
    action,
    entity_type: entityType,
    entity_id: entityId,
    entity_name: entityName,
    service,
    old_value: oldValue != null ? String(oldValue) : null,
    new_value: newValue != null ? String(newValue) : null,
  });
  if (error) console.error("Activity log failed:", error);
}
