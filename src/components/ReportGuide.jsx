"use client";

export function PeriodPicker({
  week,
  year,
  onWeekChange,
  onYearChange,
  onThisPeriod,
  periodLabel = "week",
}) {
  return (
    <div className="flex flex-wrap items-end gap-4 rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
      <div>
        <label className="block text-sm font-medium text-slate-700">Week</label>
        <input
          type="number"
          min={1}
          max={53}
          value={week}
          onChange={(e) => onWeekChange(Number(e.target.value))}
          className="mt-1 w-20"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700">Year</label>
        <input
          type="number"
          value={year}
          onChange={(e) => onYearChange(Number(e.target.value))}
          className="mt-1 w-24"
        />
      </div>
      {onThisPeriod && (
        <button type="button" onClick={onThisPeriod} className="btn-secondary text-sm">
          This {periodLabel}
        </button>
      )}
    </div>
  );
}

export function MonthPeriodPicker({ month, year, onMonthChange, onYearChange, onThisMonth }) {
  return (
    <div className="flex flex-wrap items-end gap-4 rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
      <div>
        <label className="block text-sm font-medium text-slate-700">Month</label>
        <input
          type="number"
          min={1}
          max={12}
          value={month}
          onChange={(e) => onMonthChange(Number(e.target.value))}
          className="mt-1 w-16"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700">Year</label>
        <input
          type="number"
          value={year}
          onChange={(e) => onYearChange(Number(e.target.value))}
          className="mt-1 w-24"
        />
      </div>
      {onThisMonth && (
        <button type="button" onClick={onThisMonth} className="btn-secondary text-sm">
          This month
        </button>
      )}
    </div>
  );
}
