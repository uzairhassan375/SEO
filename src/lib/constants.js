export const SERVICES = ["dropshipping", "3pl", "360"];

export const SERVICE_LABELS = {
  dropshipping: "Dropshipping",
  "3pl": "3PL",
  "360": "360",
};

export const SERVICE_SHORT = {
  dropshipping: "DS",
  "3pl": "3PL",
  "360": "360",
};

export const SERVICE_STYLES = {
  dropshipping: "bg-teal-50 text-teal-700 border-teal-300",
  "3pl": "bg-indigo-50 text-indigo-700 border-indigo-300",
  "360": "bg-fuchsia-50 text-fuchsia-700 border-fuchsia-300",
};

export const PRIORITY_STYLES = {
  high: "bg-rose-50 text-rose-700 border-rose-300",
  medium: "bg-amber-50 text-amber-700 border-amber-300",
  low: "bg-emerald-50 text-emerald-700 border-emerald-300",
};

export const STATUS_STYLES = {
  live: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
  pending: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
  rejected: "bg-rose-50 text-rose-700 ring-1 ring-rose-200",
  in_progress: "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200",
  done: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
  blocked: "bg-rose-50 text-rose-700 ring-1 ring-rose-200",
  draft: "bg-slate-100 text-slate-600 ring-1 ring-slate-200",
  writing: "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200",
  published: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
};

export const BLOG_STATUSES = ["draft", "writing", "published", "live"];

/** Default target for backlinks / guest posts — the site we build links to. */
export const DEFAULT_TARGET_URL = "https://www.myzambeel.com/";

export const ADMIN_EMAIL = "admin@uzair.com";

export function isAdminProfile(profile) {
  return (
    profile?.role === "admin" || profile?.email === ADMIN_EMAIL
  );
}
