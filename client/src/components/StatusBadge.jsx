const styles = {
  Active: 'bg-emerald-50 text-emerald-700 ring-emerald-200', Inactive: 'bg-slate-100 text-slate-600 ring-slate-200',
  Open: 'bg-rose-50 text-rose-700 ring-rose-200', Acknowledged: 'bg-amber-50 text-amber-700 ring-amber-200', Resolved: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  High: 'bg-rose-50 text-rose-700 ring-rose-200', Medium: 'bg-amber-50 text-amber-700 ring-amber-200', Low: 'bg-sky-50 text-sky-700 ring-sky-200',
  Calibrated: 'bg-emerald-50 text-emerald-700 ring-emerald-200', 'Due Soon': 'bg-amber-50 text-amber-700 ring-amber-200', Overdue: 'bg-rose-50 text-rose-700 ring-rose-200', Planned: 'bg-sky-50 text-sky-700 ring-sky-200', Done: 'bg-emerald-50 text-emerald-700 ring-emerald-200'
};
export default function StatusBadge({ status = 'Unknown' }) {
  return <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${styles[status] || 'bg-slate-100 text-slate-600 ring-slate-200'}`}><span className="h-1.5 w-1.5 rounded-full bg-current" />{status}</span>;
}
