import { useEffect, useMemo, useState } from 'react';
import { Target, Plus, Coins, Check } from 'lucide-react';
import { api } from '../lib/api.js';
import { PageHeader, Spinner, Modal, Empty } from '../components/ui.jsx';
import { useAuth } from '../auth/AuthContext.jsx';

function currentWeek() {
  const d = new Date();
  const onejan = new Date(d.getFullYear(), 0, 1);
  const week = Math.ceil((((d - onejan) / 86400000) + onejan.getDay() + 1) / 7);
  return `${d.getFullYear()}-W${String(week).padStart(2, '0')}`;
}

const emptyForm = { title: '', target: '', reward_coins: 20, week: currentWeek(), status: 'active' };

export default function WeeklyTasksPage() {
  const { user } = useAuth();
  const canManage = !['student', 'parent'].includes(user.role);
  const [rows, setRows] = useState(null);
  const [completions, setCompletions] = useState([]);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState(null);

  async function load() {
    const [t, c] = await Promise.all([
      api.get('/weekly_tasks?limit=500').catch(() => []),
      api.get('/assignment_completions?limit=2000').catch(() => []),
    ]);
    setRows((t || []).filter((x) => x.week === currentWeek() && x.status !== 'archived'));
    setCompletions((c || []).filter((x) => x.item_type === 'weekly_tasks'));
  }
  useEffect(() => { load(); }, []);

  function doneCount(taskId) { return completions.filter((c) => String(c.item_id) === String(taskId)).length; }
  function myDone(taskId) { return completions.some((c) => String(c.item_id) === String(taskId) && c.student === user.full_name); }

  function openAdd() { setForm({ ...emptyForm, week: currentWeek() }); setModal(true); }

  async function save() {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      await api.post('/weekly_tasks', { ...form, reward_coins: Math.min(200, Number(form.reward_coins) || 0) });
      setModal(false); await load();
    } catch (e) { alert(e.message); }
    setSaving(false);
  }

  async function complete(task) {
    setBusyId(task.id);
    try {
      await api.post('/weekly-tasks/complete', { item_id: task.id });
      await load();
    } catch (e) { alert(e.message); }
    setBusyId(null);
  }

  if (rows === null) return <Spinner />;

  return (
    <div>
      <PageHeader icon={Target} title="Haftalik vazifalar" subtitle={`Joriy hafta: ${currentWeek()}`}
        actions={canManage && <button className="btn-gold" onClick={openAdd}><Plus size={16} /> Yangi vazifa</button>} />

      {rows.length === 0 ? <Empty icon={Target} title="Bu hafta uchun vazifa yo'q" /> : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {rows.map((t) => {
            const done = myDone(t.id);
            return (
              <div key={t.id} className="card p-4">
                <div className="flex items-center justify-between mb-2">
                  {Number(t.reward_coins) > 0 && <span className="flex items-center gap-1 text-[11px] font-bold text-gold-600"><Coins size={12} /> +{t.reward_coins}</span>}
                  {canManage && <span className="text-[11px] text-navy-400">{doneCount(t.id)} bajardi</span>}
                </div>
                <div className="text-sm font-bold text-navy-800 mb-1">{t.title}</div>
                <div className="text-xs text-navy-500 mb-3">{t.target}</div>
                {!canManage && (
                  done ? (
                    <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 rounded-xl py-1.5"><Check size={13} /> Bajarildi</div>
                  ) : (
                    <button onClick={() => complete(t)} disabled={busyId === t.id} className="btn-gold w-full !py-1.5 text-xs">
                      {busyId === t.id ? '...' : 'Bajardim deb belgilash'}
                    </button>
                  )
                )}
              </div>
            );
          })}
        </div>
      )}

      <Modal open={modal} title="Yangi haftalik vazifa" onClose={() => setModal(false)}
        footer={<>
          <button className="btn-ghost" onClick={() => setModal(false)}>Bekor qilish</button>
          <button className="btn-gold" onClick={save} disabled={saving}>{saving ? 'Saqlanmoqda...' : "Qo'shish"}</button>
        </>}
      >
        <label className="label">Sarlavha</label>
        <input className="input !py-2.5 mb-4" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        <label className="label">Maqsad (tavsif)</label>
        <input className="input !py-2.5 mb-4" placeholder="Masalan: kamida 5 ta yangi so'z yodlash" value={form.target} onChange={(e) => setForm({ ...form, target: e.target.value })} />
        <label className="label">Coin mukofoti</label>
        <input className="input !py-2.5" type="number" onWheel={(e) => e.target.blur()} value={form.reward_coins} onChange={(e) => setForm({ ...form, reward_coins: e.target.value })} />
      </Modal>
    </div>
  );
}
