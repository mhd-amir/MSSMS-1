import { useEffect, useState } from 'react';
const empty = { name: '', city: '', state: '', latitude: '', longitude: '', status: 'Active' };
export default function StationForm({ initial, onSubmit, onCancel }) {
  const [form, setForm] = useState(empty); const [busy, setBusy] = useState(false);
  useEffect(() => { setForm(initial ? { ...empty, ...initial, latitude: initial.latitude ?? '', longitude: initial.longitude ?? '' } : empty); }, [initial]);
  const change = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  async function submit(e) { e.preventDefault(); setBusy(true); try { await onSubmit({ ...form, latitude: Number(form.latitude), longitude: Number(form.longitude) }); } finally { setBusy(false); } }
  return <form onSubmit={submit} className="space-y-4"><div className="grid gap-4 sm:grid-cols-2">{[['name','Station name'],['city','City'],['state','State'],['latitude','Latitude'],['longitude','Longitude']].map(([name,label])=><label key={name}><span className="label">{label}{name==='name'||name==='latitude'||name==='longitude'?' *':''}</span><input className="field" name={name} value={form[name]} onChange={change} required={['name','latitude','longitude'].includes(name)} type={['latitude','longitude'].includes(name)?'number':'text'} step="any"/></label>)}<label><span className="label">Status</span><select className="field" name="status" value={form.status} onChange={change}><option>Active</option><option>Inactive</option></select></label></div><div className="flex justify-end gap-2 pt-2"><button type="button" className="btn-secondary" onClick={onCancel}>Cancel</button><button className="btn-primary" disabled={busy}>{busy?'Saving…':initial?'Save changes':'Add station'}</button></div></form>;
}
