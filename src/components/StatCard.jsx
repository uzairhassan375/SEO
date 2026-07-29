export default function StatCard({ label, value, sub, icon: Icon }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-indigo-200 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
          <p className="mt-1 text-3xl font-bold text-slate-900">{value}</p>
          {sub && <p className="mt-1 text-xs text-slate-500">{sub}</p>}
        </div>
        {Icon && (
          <div className="shrink-0 rounded-lg bg-indigo-50 p-2 text-indigo-600 ring-1 ring-indigo-100">
            <Icon className="h-5 w-5" />
          </div>
        )}
      </div>
    </div>
  );
}
