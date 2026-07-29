/**
 * Creates (or resets) the primary admin auth user + profile.
 *
 *   node scripts/create-admin.mjs
 *   node scripts/create-admin.mjs someone@example.com 'their-password'
 *
 * Reads NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from .env.
 * Safe to re-run: if the user already exists it just resets the password and
 * makes sure the profile row says admin.
 */
import { readFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(new URL("../.env", import.meta.url), "utf8")
    .split("\n")
    .filter((l) => l.trim() && !l.trim().startsWith("#") && l.includes("="))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, "")];
    })
);

const URL_BASE = env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = env.SUPABASE_SERVICE_ROLE_KEY;
const EMAIL = process.argv[2] || "admin@uzair.com";
const PASSWORD = process.argv[3] || "Z@mbee!";

if (!URL_BASE || !KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env");
  process.exit(1);
}

const headers = {
  apikey: KEY,
  Authorization: `Bearer ${KEY}`,
  "Content-Type": "application/json",
};

async function main() {
  // does the user already exist?
  const listRes = await fetch(
    `${URL_BASE}/auth/v1/admin/users?per_page=200`,
    { headers }
  );
  if (!listRes.ok) {
    console.error(`Auth API ${listRes.status}: ${await listRes.text()}`);
    process.exit(1);
  }
  const { users = [] } = await listRes.json();
  const existing = users.find((u) => u.email?.toLowerCase() === EMAIL.toLowerCase());

  let userId;
  if (existing) {
    userId = existing.id;
    const res = await fetch(`${URL_BASE}/auth/v1/admin/users/${userId}`, {
      method: "PUT",
      headers,
      body: JSON.stringify({ password: PASSWORD, email_confirm: true }),
    });
    if (!res.ok) {
      console.error(`Password reset failed ${res.status}: ${await res.text()}`);
      process.exit(1);
    }
    console.log(`✓ ${EMAIL} already existed — password reset`);
  } else {
    const res = await fetch(`${URL_BASE}/auth/v1/admin/users`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        email: EMAIL,
        password: PASSWORD,
        email_confirm: true,
        user_metadata: { full_name: "Admin" },
      }),
    });
    if (!res.ok) {
      console.error(`Create user failed ${res.status}: ${await res.text()}`);
      process.exit(1);
    }
    userId = (await res.json()).id;
    console.log(`✓ created auth user ${EMAIL}`);
  }

  // upsert the profile row as admin
  const profRes = await fetch(`${URL_BASE}/rest/v1/profiles`, {
    method: "POST",
    headers: { ...headers, Prefer: "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify({
      id: userId,
      email: EMAIL,
      full_name: "Admin",
      role: "admin",
    }),
  });
  if (!profRes.ok) {
    console.error(`Profile upsert failed ${profRes.status}: ${await profRes.text()}`);
    console.error("(If this says the table is missing, run the migrations first.)");
    process.exit(1);
  }

  console.log(`✓ profile set to admin`);
  console.log(`\nLogin: ${EMAIL} / ${PASSWORD}`);
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
