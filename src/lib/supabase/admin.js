import { createClient } from "@supabase/supabase-js";

/**
 * Service-role client. SERVER ONLY — never import this from a client component.
 * Needs SUPABASE_SERVICE_ROLE_KEY (Supabase Dashboard → Project Settings → API).
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Missing SUPABASE_SERVICE_ROLE_KEY. Add it to .env (local) and to the Vercel project env vars."
    );
  }
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
