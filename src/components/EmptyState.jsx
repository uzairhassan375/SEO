export default function EmptyState({ title, message }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center">
      <p className="text-lg font-medium text-slate-700">{title}</p>
      <p className="mt-2 text-sm text-slate-500">{message}</p>
    </div>
  );
}
