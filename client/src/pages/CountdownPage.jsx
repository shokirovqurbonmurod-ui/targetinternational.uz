import { useEffect, useState } from 'react';
import { Clock, Plus, Trash2 } from 'lucide-react';
import { api } from '../lib/api.js';
import { PageHeader, Spinner, Modal, Empty } from '../components/ui.jsx';
import { useAuth } from '../auth/AuthContext.jsx';

const emptyForm = { title: '', target_date: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 16), status: 'active' };

function timeLeft(targetDate) {
  const diff = new Date(targetDate) - new Date();
  if (diff <= 0) return null;
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);
  return { days, hours, mins };
}

export default function CountdownPage() {
  const { user } = useAuth();
  const canManage = !['student', 'parent'].includes(user.role);
  const [rows, setRows] = useState(null);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [, setTick] = useState(0);

  async function load() { setRows(await api.get('/countdown_events?limit=500').catch(() => [])); }
  useEffect(() => { load(); }, []);
  useEffect(() => { const t = setInterval(() => setTick((x) => x + 1), 60000); return () => clearInterval(t); }, []);

  function openAdd() { setForm(emptyForm); setModal(true); }

  async function save() {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      await api.post('/countdown_events', form);
      setModal(false); await load();
    } catch (e) { alert(e.message); }
    setSaving(false);
  }

  async function remove(r) {
    if (!confirm(`"${r.title}" o'chirilsinmi?`)) return;
    await api.del(`/countdown_events/${r.id}`).catch(() => {});
    await load();
  }

  if (rows === null) return <Spinner />;
  const active = rows.filter((r) => r.status !== 'archived' && timeLeft(r.target_date)).sort((a, b) => new Date(a.target_date) - new Date(b.target_date));

  return (
    <div>
      <PageHeader icon={Clock} title="Countdown" subtitle="Muhim tadbirlargacha qolgan vaqt"
        actions={canManage && <button className="btn-gold" onClick={openAdd}><Plus size={16} /> Yangi countdown</button>} />

      {active.length === 0 ? <Empty icon={Clock} title="Faol countdown yo'q" /> : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {active.map((r) => {
            const left = timeLeft(r.target_date);
            return (
              <div key={r.id} className="card p-5 text-center relative">
                {canManage && (
                  <button onClick={() => remove(r)} className="absolute top-2 right-2 text-navy-300 hover:text-red-500 transition"><Trash2 size={14} /></button>
                )}
                <div className="text-sm font-bold text-navy-800 mb-4">{r.title}</div>
                <div className="flex items-center justify-center gap-3">
                  {[[left.days, 'kun'], [left.hours, 'soat'], [left.mins, 'daq']].map(([val, label]) => (
                    <div key={label} className="rounded-2xl bg-navy-900 text-white px-3 py-2.5 min-w-[64px]">
                      <div className="font-display text-2xl">{val}</div>
                      <div className="text-[10px] text-navy-300 uppercase">{label}</div>
                    </div>
                  ))}
                </div>
                <div className="text-[11px] text-navy-400 mt-3">{new Date(r.target_date).toLocaleString('uz-UZ')}</div>
              </div>
            );
          })}
        </div>
      )}

      <Modal open={modal} title="Yangi countdown" onClose={() => setModal(false)}
        footer={<>
          <button className="btn-ghost" onClick={() => setModal(false)}>Bekor qilish</button>
          <button className="btn-gold" onClick={save} disabled={saving}>{saving ? 'Saqlanmoqda...' : "Qo'shish"}</button>
        </>}
      >
        <label className="label">Sarlavha</label>
        <input className="input !py-2.5 mb-4" placeholder="Masalan: IELTS imtihoni" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        <label className="label">Sana va vaqt</label>
        <input className="input !py-2.5" type="datetime-local" value={form.target_date} onChange={(e) => setForm({ ...form, target_date: e.target.value })} />
      </Modal>
    </div>
  );
}
