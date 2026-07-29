import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ADMIN_EMAIL } from "@/lib/constants";

export const dynamic = "force-dynamic";

/** Verifies the caller is a signed-in admin. Returns { user, profile } or an error response. */
async function requireAdmin() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: NextResponse.json({ error: "Not signed in" }, { status: 401 }) };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email, role")
    .eq("id", user.id)
    .maybeSingle();

  const isAdmin = profile?.role === "admin" || profile?.email === ADMIN_EMAIL;
  if (!isAdmin) {
    return { error: NextResponse.json({ error: "Admins only" }, { status: 403 }) };
  }

  return { user, profile };
}

/** Change another user's password. Body: { userId, password } */
export async function PATCH(request) {
  const { user, error } = await requireAdmin();
  if (error) return error;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { userId, password } = body || {};
  if (!userId || typeof password !== "string") {
    return NextResponse.json({ error: "userId and password are required" }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters" },
      { status: 400 }
    );
  }

  const admin = createAdminClient();
  const { data: target } = await admin.auth.admin.getUserById(userId);
  if (!target?.user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
  if (target.user.email === ADMIN_EMAIL && user.id !== userId) {
    return NextResponse.json(
      { error: "The primary admin can only change their own password" },
      { status: 403 }
    );
  }

  const { error: updateError } = await admin.auth.admin.updateUserById(userId, { password });
  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}

/** Delete a user (auth account + profile). Query: ?userId=... */
export async function DELETE(request) {
  const { user, error } = await requireAdmin();
  if (error) return error;

  const userId = new URL(request.url).searchParams.get("userId");
  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }
  if (userId === user.id) {
    return NextResponse.json({ error: "You cannot delete your own account" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: target } = await admin.auth.admin.getUserById(userId);
  if (target?.user?.email === ADMIN_EMAIL) {
    return NextResponse.json({ error: "The primary admin cannot be deleted" }, { status: 403 });
  }

  // Release every reference to this user first. Without ON DELETE rules on the
  // owner columns, GoTrue answers "Database error deleting user".
  // (20260729140000_user_delete_constraints.sql makes this automatic; these
  // statements keep the delete working even if that migration hasn't run yet.)
  const detach = [
    admin.from("keywords").update({ added_by: null }).eq("added_by", userId),
    admin.from("backlinks").update({ added_by: null }).eq("added_by", userId),
    admin.from("blogs").update({ created_by: null }).eq("created_by", userId),
    admin.from("page_rankings").update({ created_by: null }).eq("created_by", userId),
    admin.from("weekly_reports").update({ created_by: null }).eq("created_by", userId),
    admin.from("activity_log").update({ user_id: null }).eq("user_id", userId),
    admin.from("announcements").update({ created_by: null }).eq("created_by", userId),
    admin.from("announcement_recipients").delete().eq("user_id", userId),
  ];
  await Promise.allSettled(detach);

  await admin.from("profiles").delete().eq("id", userId);

  const { error: deleteError } = await admin.auth.admin.deleteUser(userId);
  if (deleteError) {
    const hint = /database error/i.test(deleteError.message)
      ? " — a table still references this user. Apply supabase/migrations/20260729140000_user_delete_constraints.sql."
      : "";
    return NextResponse.json({ error: `${deleteError.message}${hint}` }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
