import { SERVICE_STYLES, PRIORITY_STYLES, STATUS_STYLES, SERVICE_SHORT } from "@/lib/constants";
import { cn } from "@/lib/utils";

export function ServiceBadge({ service }) {
  return (
    <span
      className={cn(
        "inline-flex rounded border px-2 py-0.5 text-xs font-semibold",
        SERVICE_STYLES[service]
      )}
    >
      {SERVICE_SHORT[service] || service}
    </span>
  );
}

export function PriorityBadge({ priority }) {
  return (
    <span
      className={cn(
        "inline-flex rounded border px-2 py-0.5 text-xs font-semibold capitalize",
        PRIORITY_STYLES[priority]
      )}
    >
      {priority}
    </span>
  );
}

export function StatusBadge({ status }) {
  const label = status?.replace("_", " ");
  return (
    <span
      className={cn(
        "inline-flex rounded px-2 py-0.5 text-xs font-semibold capitalize",
        STATUS_STYLES[status] || "bg-slate-100 text-slate-700"
      )}
    >
      {label}
    </span>
  );
}

export function RoleBadge({ role }) {
  return (
    <span
      className={cn(
        "inline-flex rounded px-2 py-0.5 text-xs font-semibold",
        role === "admin"
          ? "bg-violet-100 text-violet-800"
          : "bg-slate-100 text-slate-700"
      )}
    >
      {role}
    </span>
  );
}
