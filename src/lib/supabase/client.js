import { createBrowserClient } from "@supabase/ssr";

let browserClient;

function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return null;
  return { url, key };
}

/** Single shared browser client — avoids duplicate connections and extra auth calls */
export function createClient() {
  const config = getSupabaseConfig();
  if (!config) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY. Add them in .env locally or in Vercel project settings."
    );
  }
  if (!browserClient) {
    browserClient = createBrowserClient(config.url, config.key);
  }
  return browserClient;
}

/** Safe during static build when env is not set (e.g. Vercel before env vars are configured) */
export function hasSupabaseEnv() {
  return getSupabaseConfig() !== null;
}
