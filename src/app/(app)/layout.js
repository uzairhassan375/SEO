import AppLayout from "@/components/Layout";

/** App routes use Supabase at runtime — skip static prerender (needs env on Vercel) */
export const dynamic = "force-dynamic";

export default function DashboardLayout({ children }) {
  return <AppLayout>{children}</AppLayout>;
}
