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
  dropshipping: "bg-emerald-100 text-emerald-800 border-emerald-200",
  "3pl": "bg-blue-100 text-blue-800 border-blue-200",
  "360": "bg-amber-100 text-amber-800 border-amber-200",
};

export const PRIORITY_STYLES = {
  high: "bg-red-100 text-red-800 border-red-200",
  medium: "bg-amber-100 text-amber-800 border-amber-200",
  low: "bg-emerald-100 text-emerald-800 border-emerald-200",
};

export const STATUS_STYLES = {
  live: "bg-emerald-100 text-emerald-800",
  pending: "bg-amber-100 text-amber-800",
  rejected: "bg-red-100 text-red-800",
  in_progress: "bg-blue-100 text-blue-800",
  done: "bg-emerald-100 text-emerald-800",
  blocked: "bg-red-100 text-red-800",
  draft: "bg-slate-100 text-slate-700",
  writing: "bg-blue-100 text-blue-800",
  published: "bg-amber-100 text-amber-800",
};

export const BLOG_STATUSES = ["draft", "writing", "published", "live"];

export const ADMIN_EMAIL = "admin@zambeel.com";

export function isAdminProfile(profile) {
  return (
    profile?.role === "admin" || profile?.email === ADMIN_EMAIL
  );
}

export function canAccessService(profile, service) {
  if (!profile) return false;
  if (isAdminProfile(profile)) return true;
  return profile.assigned_service === service;
}
