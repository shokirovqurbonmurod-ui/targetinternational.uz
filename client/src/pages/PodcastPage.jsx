import { useEffect, useState } from 'react';
import { Radio, Plus, Trash2, Check, Clock } from 'lucide-react';
import { api } from '../lib/api.js';
import { PageHeader, Spinner, Modal, Empty } from '../components/ui.jsx';
import { useAuth } from '../auth/AuthContext.jsx';

const emptyForm = { title: '', host: '', duration_min: 15, date: new Date().toISOString().slice(0, 10), status: 'active' };

export default function PodcastPage() {
  const { user } = useAuth();
  const canManage = !['student', 'parent'].includes(user.role);
  const [rows, setRows] = useState(null);
  const [completions, setCompletions] = useState([]);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState(null);

  async function load() {
    const [p, c] = await Promise.all([
      api.get('/podcast_episodes?limit=500').catch(() => []),
      api.get('/assignment_completions?limit=2000').catch(() => []),
    ]);
    setRows((p || []).filter((x) => x.status !== 'archived'));
    setCompletions((c || []).filter((x) => x.item_type === 'podcast'));
  }
  useEffect(() => { load(); }, []);

  function listened(id) { return completions.some((c) => String(c.item_id) === String(id) && c.student === user.full_name); }
  function listenCount(id) { return completions.filter((c) => String(c.item_id) === String(id)).length; }

  function openAdd() { setForm(emptyForm); setModal(true); }

  async function save() {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      await api.post('/podcast_episodes', { ...form, duration_min: Number(form.duration_min) || 0 });
      setModal(false); await load();
    } catch (e) { alert(e.message); }
    setSaving(false);
  }

  async function remove(p) {
    if (!confirm(`"${p.title}" o'chirilsinmi?`)) return;
    await api.del(`/podcast_episodes/${p.id}`).catch(() => {});
    await load();
  }

  async function markListened(p) {
    setBusyId(p.id);
    try { await api.post('/podcast/listen', { episode_id: p.id }); await load(); }
    catch (e) { alert(e.message); }
    setBusyId(null);
  }

  if (rows === null) return <Spinner />;

  return (
    <div>
      <PageHeader icon={Radio} title="Podcast" subtitle="Audio darslar va suhbatlar"
        actions={canManage && <button className="btn-gold" onClick={openAdd}><Plus size={16} /> Yangi epizod</button>} />

      {rows.length === 0 ? <Empty icon={Radio} title="Epizod yo'q" /> : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {rows.map((p) => {
            const done = listened(p.id);
            return (
              <div key={p.id} className="card p-4 relative">
                {canManage && (
                  <button onClick={() => remove(p)} className="absolute top-3 right-3 text-navy-300 hover:text-red-500 transition"><Trash2 size={14} /></button>
                )}
                <div className="text-sm font-bold text-navy-800 mb-0.5">{p.title}</div>
                <div className="text-xs text-navy-400 mb-3">{p.host}</div>
                <div className="flex items-center gap-3 text-[11px] text-navy-500 mb-3">
                  <span className="flex items-center gap-1"><Clock size={11} /> {p.duration_min} daq</span>
                  {canManage && <span>{listenCount(p.id)} tingladi</span>}
                </div>
                {!canManage && (
                  done ? (
                    <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 rounded-xl py-1.5"><Check size={13} /> Tinglandi</div>
                  ) : (
                    <button onClick={() => markListened(p)} disabled={busyId === p.id} className="btn-gold w-full !py-1.5 text-xs">
                      {busyId === p.id ? '...' : 'Tingladim'}
                    </button>
                  )
                )}
              </div>
            );
          })}
        </div>
      )}

      <Modal open={modal} title="Yangi epizod" onClose={() => setModal(false)}
        footer={<>
          <button className="btn-ghost" onClick={() => setModal(false)}>Bekor qilish</button>
          <button className="btn-gold" onClick={save} disabled={saving}>{saving ? 'Saqlanmoqda...' : "Qo'shish"}</button>
        </>}
      >
        <label className="label">Sarlavha</label>
        <input className="input !py-2.5 mb-4" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Boshlovchi</label>
            <input className="input !py-2.5" value={form.host} onChange={(e) => setForm({ ...form, host: e.target.value })} />
          </div>
          <div>
            <label className="label">Davomiyligi (daqiqa)</label>
            <input className="input !py-2.5" type="number" onWheel={(e) => e.target.blur()} value={form.duration_min} onChange={(e) => setForm({ ...form, duration_min: e.target.value })} />
          </div>
        </div>
      </Modal>
    </div>
  );
}
