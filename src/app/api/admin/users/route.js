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

  const { error: deleteError } = await admin.auth.admin.deleteUser(userId);
  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 400 });
  }

  // profiles.id may not cascade from auth.users — remove it explicitly
  await admin.from("profiles").delete().eq("id", userId);

  return NextResponse.json({ ok: true });
}
