import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/** Session-scoped client for route handlers — reads the caller's auth cookies. */
export async function createServerSupabase() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {
          // route handlers don't refresh the session cookie
        },
      },
    }
  );
}
