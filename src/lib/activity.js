import { createClient } from "./supabase/client";

export async function logActivity({
  user,
  action,
  entityType,
  entityId,
  entityName,
  service,
  oldValue,
  newValue,
}) {
  const supabase = createClient();
  const { error } = await supabase.from("activity_log").insert({
    user_id: user?.id,
    user_name: user?.full_name || user?.email,
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
