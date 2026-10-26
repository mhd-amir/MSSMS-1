import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { CloudSun } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

export default function Login() {
  const { login } = useAuth(); const navigate = useNavigate(); const location = useLocation();
  const [form, setForm] = useState({ login: '', password: '' }); const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  async function submit(e) { e.preventDefault(); setBusy(true); setError(''); try { await login(form.login, form.password); navigate(location.state?.from || '/', { replace: true }); } catch (err) { setError(err.message); } finally { setBusy(false); } }
  return <AuthFrame title="Welcome back" subtitle="Sign in to your weather operations workspace."><form className="space-y-4" onSubmit={submit}>{error&&<p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}<label><span className="label">Email or username</span><input className="field" autoComplete="username" required value={form.login} onChange={e=>setForm({...form,login:e.target.value})}/></label><label><span className="label">Password</span><input className="field" type="password" autoComplete="current-password" required value={form.password} onChange={e=>setForm({...form,password:e.target.value})}/></label><button disabled={busy} className="btn-primary w-full">{busy?'Signing in…':'Sign in'}</button><p className="text-center text-sm text-slate-500">New to MSSMS? <Link className="font-semibold text-teal-700" to="/register">Create an account</Link></p></form></AuthFrame>;
}

export function AuthFrame({ title, subtitle, children }) { return <div className="grid min-h-screen place-items-center bg-[#f4f7f7] p-4"><div className="w-full max-w-md"><div className="mb-6 flex items-center justify-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-ink text-teal-300"><CloudSun size={22}/></span><span className="text-lg font-bold text-ink">MSSMS</span></div><section className="surface p-7 sm:p-8"><h1 className="text-2xl font-bold text-ink">{title}</h1><p className="mt-2 mb-6 text-sm text-slate-500">{subtitle}</p>{children}</section><p className="mt-5 text-center text-xs text-slate-400">Meteorological Station & Sensor Management System</p></div></div>; }
