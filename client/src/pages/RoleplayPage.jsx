import { useEffect, useState } from 'react';
import { Drama, Plus, Trash2, Check } from 'lucide-react';
import { api } from '../lib/api.js';
import { PageHeader, Spinner, Modal, Empty } from '../components/ui.jsx';
import { useAuth } from '../auth/AuthContext.jsx';

const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const emptyForm = { title: '', level: LEVELS[0], description: '', status: 'active' };

export default function RoleplayPage() {
  const { user } = useAuth();
  const canManage = !['student', 'parent'].includes(user.role);
  const [rows, setRows] = useState(null);
  const [completions, setCompletions] = useState([]);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState(null);

  async function load() {
    const [r, c] = await Promise.all([
      api.get('/role_play_scenarios?limit=500').catch(() => []),
      api.get('/assignment_completions?limit=2000').catch(() => []),
    ]);
    setRows((r || []).filter((x) => x.status !== 'archived'));
    setCompletions((c || []).filter((x) => x.item_type === 'roleplay'));
  }
  useEffect(() => { load(); }, []);

  function practiced(id) { return completions.some((c) => String(c.item_id) === String(id) && c.student === user.full_name); }
  function practicedCount(id) { return completions.filter((c) => String(c.item_id) === String(id)).length; }

  function openAdd() { setForm(emptyForm); setModal(true); }

  async function save() {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      await api.post('/role_play_scenarios', form);
      setModal(false); await load();
    } catch (e) { alert(e.message); }
    setSaving(false);
  }

  async function remove(s) {
    if (!confirm(`"${s.title}" o'chirilsinmi?`)) return;
    await api.del(`/role_play_scenarios/${s.id}`).catch(() => {});
    await load();
  }

  async function markPracticed(s) {
    setBusyId(s.id);
    try { await api.post('/roleplay/practice', { scenario_id: s.id }); await load(); }
    catch (e) { alert(e.message); }
    setBusyId(null);
  }

  if (rows === null) return <Spinner />;

  return (
    <div>
      <PageHeader icon={Drama} title="Rol o'yini" subtitle="Nutqiy amaliyot ssenariylari"
        actions={canManage && <button className="btn-gold" onClick={openAdd}><Plus size={16} /> Yangi ssenariy</button>} />

      {rows.length === 0 ? <Empty icon={Drama} title="Ssenariy yo'q" /> : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {rows.map((s) => {
            const done = practiced(s.id);
            return (
              <div key={s.id} className="card p-4 relative">
                {canManage && (
                  <button onClick={() => remove(s)} className="absolute top-3 right-3 text-navy-300 hover:text-red-500 transition"><Trash2 size={14} /></button>
                )}
                <span className="chip text-[9px] bg-gold/10 text-gold-700 mb-2 inline-block">{s.level}</span>
                <div className="text-sm font-bold text-navy-800 mb-1">{s.title}</div>
                <div className="text-xs text-navy-500 mb-3">{s.description}</div>
                {canManage && <div className="text-[11px] text-navy-400 mb-2">{practicedCount(s.id)} nafar mashq qilgan</div>}
                {!canManage && (
                  done ? (
                    <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 rounded-xl py-1.5"><Check size={13} /> Mashq qilindi</div>
                  ) : (
                    <button onClick={() => markPracticed(s)} disabled={busyId === s.id} className="btn-gold w-full !py-1.5 text-xs">
                      {busyId === s.id ? '...' : 'Mashq qildim (+10 coin)'}
                    </button>
                  )
                )}
              </div>
            );
          })}
        </div>
      )}

      <Modal open={modal} title="Yangi ssenariy" onClose={() => setModal(false)}
        footer={<>
          <button className="btn-ghost" onClick={() => setModal(false)}>Bekor qilish</button>
          <button className="btn-gold" onClick={save} disabled={saving}>{saving ? 'Saqlanmoqda...' : "Qo'shish"}</button>
        </>}
      >
        <label className="label">Sarlavha</label>
        <input className="input !py-2.5 mb-4" placeholder="Masalan: Restoranda buyurtma berish" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        <label className="label">Daraja</label>
        <select className="input !py-2.5 mb-4" value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })}>
          {LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
        </select>
        <label className="label">Tavsif</label>
        <textarea className="input !py-2.5" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
      </Modal>
    </div>
  );
}
