export default function StatCard({ label, value, sub, icon: Icon }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-1 text-3xl font-bold text-slate-900">{value}</p>
          {sub && <p className="mt-1 text-xs text-slate-500">{sub}</p>}
        </div>
        {Icon && (
          <div className="rounded-lg bg-slate-100 p-2 text-slate-600">
            <Icon className="h-5 w-5" />
          </div>
        )}
      </div>
    </div>
  );
}
