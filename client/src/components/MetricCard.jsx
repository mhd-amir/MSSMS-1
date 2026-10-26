import { ArrowDownRight, ArrowUpRight, CloudSun } from 'lucide-react';
export default function MetricCard({ title, value, unit, detail, icon: Icon = CloudSun, tone = 'teal' }) {
  const tones = { teal: 'bg-teal-50 text-teal-700', blue: 'bg-blue-50 text-blue-700', amber: 'bg-amber-50 text-amber-700', rose: 'bg-rose-50 text-rose-700' };
  return <article className="surface p-5"><div className="flex items-start justify-between"><div><p className="text-sm font-medium text-slate-500">{title}</p><p className="mt-3 text-3xl font-bold tracking-tight text-ink">{value ?? '—'}<span className="ml-1 text-base font-medium text-slate-400">{unit}</span></p></div><span className={`rounded-xl p-3 ${tones[tone]}`}><Icon size={20}/></span></div><p className="mt-4 flex items-center gap-1 text-xs text-slate-500">{detail || 'Latest station readings'} <ArrowUpRight size={13} className="text-emerald-600"/></p></article>;
}
