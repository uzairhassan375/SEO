export function getWeekNumber(date = new Date()) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
}

/**
 * Monday 00:00 → Sunday 23:59:59.999 for an ISO week number.
 * Local time, so it lines up with getWeekNumber() above.
 */
export function getWeekRange(week, year) {
  const jan4 = new Date(year, 0, 4);
  const jan4Day = jan4.getDay() || 7;
  const week1Monday = new Date(year, 0, 4 - jan4Day + 1);

  const start = new Date(week1Monday);
  start.setDate(week1Monday.getDate() + (week - 1) * 7);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

/** YYYY-MM-DD. Date-only strings pass through untouched — no timezone shift. */
export function toDateKey(date) {
  if (typeof date === "string" && /^\d{4}-\d{2}-\d{2}/.test(date)) return date.slice(0, 10);
  const d = new Date(date);
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${month}-${day}`;
}

export function timeAgo(dateString) {
  const date = new Date(dateString);
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 172800) return "Yesterday";
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatRank(rank) {
  if (rank === null || rank === undefined) return "NR";
  return String(rank);
}

/** True when keyword has a real position between 1 and 10 (excludes empty/null/0). */
export function isTop10Rank(rank) {
  if (rank == null || rank === "") return false;
  const n = Number(rank);
  return Number.isFinite(n) && n >= 1 && n <= 10;
}

export function formatImpressions(value) {
  if (value === null || value === undefined) return "—";
  const n = Number(value);
  if (Number.isNaN(n)) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

export function formatCtr(ctr, clicks, impressions) {
  if (ctr != null && ctr !== "") return `${Number(ctr).toFixed(2)}%`;
  const c = Number(clicks);
  const i = Number(impressions);
  if (!i || Number.isNaN(c) || Number.isNaN(i)) return "—";
  return `${((c / i) * 100).toFixed(2)}%`;
}

export function formatPosition(pos) {
  if (pos === null || pos === undefined) return "—";
  return Number(pos).toFixed(1);
}

export function calcCtr(clicks, impressions, existingCtr) {
  if (existingCtr !== "" && existingCtr != null) return Number(existingCtr);
  const c = Number(clicks) || 0;
  const i = Number(impressions) || 0;
  if (!i) return null;
  return Math.round((c / i) * 10000) / 100;
}

export function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

/** Display name: saved full_name, else formatted email prefix, else placeholder */
export function getDisplayName(profile) {
  if (!profile) return "";
  if (profile.full_name?.trim()) return profile.full_name.trim();
  const local = (profile.email || "").split("@")[0];
  const fromEmail = local
    .replace(/[._-]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
  if (!fromEmail || /^admin$/i.test(fromEmail)) return "Your name";
  return fromEmail;
}

export function getInitials(profile) {
  const name = getDisplayName(profile);
  return name
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}
