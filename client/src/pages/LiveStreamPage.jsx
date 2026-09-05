import { useEffect, useState } from 'react';
import { Video, Plus, Trash2, Check, ExternalLink } from 'lucide-react';
import { api } from '../lib/api.js';
import { PageHeader, Spinner, Modal, Empty } from '../components/ui.jsx';
import { useAuth } from '../auth/AuthContext.jsx';

const emptyForm = { title: '', host: '', date: new Date().toISOString().slice(0, 10), time: '18:00', link: '', status: 'planned' };

export default function LiveStreamPage() {
  const { user } = useAuth();
  const canManage = !['student', 'parent'].includes(user.role);
  const [rows, setRows] = useState(null);
  const [completions, setCompletions] = useState([]);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState(null);

  async function load() {
    const [s, c] = await Promise.all([
      api.get('/live_streams?limit=500').catch(() => []),
      api.get('/assignment_completions?limit=2000').catch(() => []),
    ]);
    setRows((s || []).sort((a, b) => (a.date || '').localeCompare(b.date || '')));
    setCompletions((c || []).filter((x) => x.item_type === 'live_stream'));
  }
  useEffect(() => { load(); }, []);

  function rsvped(id) { return completions.some((c) => String(c.item_id) === String(id) && c.student === user.full_name); }
  function rsvpCount(id) { return completions.filter((c) => String(c.item_id) === String(id)).length; }

  function openAdd() { setForm(emptyForm); setModal(true); }

  async function save() {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      await api.post('/live_streams', form);
      setModal(false); await load();
    } catch (e) { alert(e.message); }
    setSaving(false);
  }

  async function remove(s) {
    if (!confirm(`"${s.title}" o'chirilsinmi?`)) return;
    await api.del(`/live_streams/${s.id}`).catch(() => {});
    await load();
  }

  async function rsvp(s) {
    setBusyId(s.id);
    try { await api.post('/live-stream/rsvp', { stream_id: s.id }); await load(); }
    catch (e) { alert(e.message); }
    setBusyId(null);
  }

  if (rows === null) return <Spinner />;

  return (
    <div>
      <PageHeader icon={Video} title="Jonli efir" subtitle="Rejalashtirilgan live efirlar"
        actions={canManage && <button className="btn-gold" onClick={openAdd}><Plus size={16} /> Yangi efir</button>} />

      {rows.length === 0 ? <Empty icon={Video} title="Efir yo'q" /> : (
        <div className="space-y-2">
          {rows.map((s) => {
            const going = rsvped(s.id);
            return (
              <div key={s.id} className="card p-4 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-navy-800">{s.title}</div>
                  <div className="text-xs text-navy-400">{s.host} · {s.date} {s.time}</div>
                </div>
                {canManage ? (
                  <>
                    <span className="text-[11px] text-navy-500 shrink-0">{rsvpCount(s.id)} qatnashadi</span>
                    {s.link && <a href={s.link} target="_blank" rel="noreferrer" className="btn-ghost !py-1.5 !px-3 text-xs shrink-0"><ExternalLink size={12} /> Havola</a>}
                    <button onClick={() => remove(s)} className="text-navy-300 hover:text-red-500 transition shrink-0"><Trash2 size={14} /></button>
                  </>
                ) : (
                  going ? (
                    s.link ? (
                      <a href={s.link} target="_blank" rel="noreferrer" className="btn-gold !py-1.5 !px-3 text-xs shrink-0"><ExternalLink size={12} /> Qo'shilish</a>
                    ) : (
                      <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 rounded-xl px-3 py-1.5 shrink-0"><Check size={13} /> Qatnashaman</div>
                    )
                  ) : (
                    <button onClick={() => rsvp(s)} disabled={busyId === s.id} className="btn-gold !py-1.5 !px-3 text-xs shrink-0">
                      {busyId === s.id ? '...' : 'Qatnashaman'}
                    </button>
                  )
                )}
              </div>
            );
          })}
        </div>
      )}

      <Modal open={modal} title="Yangi jonli efir" onClose={() => setModal(false)}
        footer={<>
          <button className="btn-ghost" onClick={() => setModal(false)}>Bekor qilish</button>
          <button className="btn-gold" onClick={save} disabled={saving}>{saving ? 'Saqlanmoqda...' : "Qo'shish"}</button>
        </>}
      >
        <label className="label">Sarlavha</label>
        <input className="input !py-2.5 mb-4" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        <div className="grid sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="label">Boshlovchi</label>
            <input className="input !py-2.5" value={form.host} onChange={(e) => setForm({ ...form, host: e.target.value })} />
          </div>
          <div>
            <label className="label">Sana</label>
            <input className="input !py-2.5" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          </div>
          <div>
            <label className="label">Vaqt</label>
            <input className="input !py-2.5" type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} />
          </div>
          <div>
            <label className="label">Havola</label>
            <input className="input !py-2.5" placeholder="https://..." value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value })} />
          </div>
        </div>
      </Modal>
    </div>
  );
}
