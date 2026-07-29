"use client";

import { SlidersHorizontal, X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Single-row filter strip.
 *
 * filters: [{ id, label, value, onChange, options: [{ value, label }], hidden }]
 * search:  optional React node rendered first (usually the search input)
 */
export default function FilterBar({ filters = [], search, className }) {
  const visible = filters.filter((f) => !f.hidden && f.options?.length > 1);
  const activeCount = visible.filter((f) => f.value !== "all").length;

  const clearAll = () => visible.forEach((f) => f.value !== "all" && f.onChange("all"));

  if (visible.length === 0 && !search) return null;

  return (
    <div
      className={cn(
        "rounded-xl border border-slate-200 bg-white p-3 shadow-sm",
        className
      )}
    >
      <div className="flex flex-wrap items-center gap-2.5">
        <span className="hidden items-center gap-1.5 pr-1 text-xs font-semibold uppercase tracking-wide text-slate-400 sm:inline-flex">
          <SlidersHorizontal className="h-3.5 w-3.5" />
          Filters
        </span>

        {search && <div className="min-w-[200px] flex-1">{search}</div>}

        {visible.map((f) => {
          const active = f.value !== "all";
          return (
            <label key={f.id} className="relative">
              <span className="sr-only">{f.label}</span>
              <select
                id={f.id}
                value={f.value}
                onChange={(e) => f.onChange(e.target.value)}
                aria-label={f.label}
                className={cn("min-w-[140px] transition", active && "select-active")}
              >
                {f.options.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
          );
        })}

        {activeCount > 0 && (
          <button
            type="button"
            onClick={clearAll}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-2 text-sm font-medium text-slate-600 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
          >
            <X className="h-4 w-4" />
            Clear {activeCount}
          </button>
        )}
      </div>
    </div>
  );
}
