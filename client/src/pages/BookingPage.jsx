import { useEffect, useMemo, useState } from 'react';
import { Calendar, Plus } from 'lucide-react';
import { api } from '../lib/api.js';
import { PageHeader, Spinner, Modal, Empty } from '../components/ui.jsx';
import { useAuth } from '../auth/AuthContext.jsx';

const emptyForm = { resource_name: '', date: new Date().toISOString().slice(0, 10), time_start: '09:00', time_end: '10:00' };

export default function BookingPage() {
  const { user } = useAuth();
  const isStudent = user.role === 'student';
  const [rows, setRows] = useState(null);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  async function load() { setRows((await api.get('/booking_slots?limit=500').catch(() => [])).sort((a, b) => (a.date || '').localeCompare(b.date || '') || (a.time_start || '').localeCompare(b.time_start || ''))); }
  useEffect(() => { load(); }, []);

  const upcoming = useMemo(() => (rows || []).filter((r) => r.date >= new Date().toISOString().slice(0, 10)), [rows]);

  function openAdd() { setForm(emptyForm); setErr(''); setModal(true); }

  async function save() {
    if (!form.resource_name.trim()) return;
    setSaving(true); setErr('');
    try {
      if (isStudent) await api.post('/booking/reserve', form);
      else await api.post('/booking_slots', { ...form, booked_by: user.full_name });
      setModal(false); await load();
    } catch (e) { setErr(e.message); }
    setSaving(false);
  }

  if (rows === null) return <Spinner />;

  return (
    <div>
      <PageHeader icon={Calendar} title="Booking" subtitle="Xona/resurslarni band qilish"
        actions={<button className="btn-gold" onClick={openAdd}><Plus size={16} /> Band qilish</button>} />

      {upcoming.length === 0 ? <Empty icon={Calendar} title="Bron yo'q" /> : (
        <div className="space-y-1.5">
          {upcoming.map((r) => (
            <div key={r.id} className="flex items-center gap-3 rounded-xl bg-navy-50/60 px-4 py-3">
              <div className="text-xs font-bold text-navy-800 w-24 shrink-0">{r.date}</div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-navy-800">{r.resource_name}</div>
                <div className="text-[11px] text-navy-400">{r.time_start}–{r.time_end} · {r.booked_by}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modal} title="Resurs band qilish" onClose={() => setModal(false)}
        footer={<>
          <button className="btn-ghost" onClick={() => setModal(false)}>Bekor qilish</button>
          <button className="btn-gold" onClick={save} disabled={saving}>{saving ? 'Saqlanmoqda...' : 'Band qilish'}</button>
        </>}
      >
        {err && <div className="mb-4 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm px-4 py-3">{err}</div>}
        <label className="label">Resurs nomi</label>
        <input className="input !py-2.5 mb-4" placeholder="Masalan: 301-xona" value={form.resource_name} onChange={(e) => setForm({ ...form, resource_name: e.target.value })} />
        <div className="grid sm:grid-cols-3 gap-4">
          <div>
            <label className="label">Sana</label>
            <input className="input !py-2.5" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          </div>
          <div>
            <label className="label">Boshlanish</label>
            <input className="input !py-2.5" type="time" value={form.time_start} onChange={(e) => setForm({ ...form, time_start: e.target.value })} />
          </div>
          <div>
            <label className="label">Tugash</label>
            <input className="input !py-2.5" type="time" value={form.time_end} onChange={(e) => setForm({ ...form, time_end: e.target.value })} />
          </div>
        </div>
      </Modal>
    </div>
  );
}
