import { useEffect, useState } from 'react';
import { Gift, Plus, Trash2, Check } from 'lucide-react';
import { api } from '../lib/api.js';
import { PageHeader, Spinner, Modal, Empty } from '../components/ui.jsx';
import { useAuth } from '../auth/AuthContext.jsx';

const FREQS = ['Oylik', 'Haftalik', 'Choraklik'];
const emptyForm = { box_name: '', frequency: FREQS[0], price: 20000 };

export default function SubscriptionBoxesPage() {
  const { user } = useAuth();
  const isStudent = user.role === 'student';
  const canManage = !['student', 'parent'].includes(user.role);
  const [rows, setRows] = useState(null);
  const [members, setMembers] = useState([]);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState(null);

  async function load() {
    const [b, m] = await Promise.all([
      api.get('/subscription_boxes?limit=500').catch(() => []),
      api.get('/subscription_members?limit=2000').catch(() => []),
    ]);
    setRows(b || []); setMembers((m || []).filter((x) => x.status === 'active'));
  }
  useEffect(() => { load(); }, []);

  function mySub(boxId) { return members.find((m) => String(m.box_id) === String(boxId) && m.student === user.full_name); }
  function subCount(boxId) { return members.filter((m) => String(m.box_id) === String(boxId)).length; }

  function openAdd() { setForm(emptyForm); setModal(true); }

  async function save() {
    if (!form.box_name.trim()) return;
    setSaving(true);
    try {
      await api.post('/subscription_boxes', { ...form, price: Number(form.price) || 0, subscribers: 0 });
      setModal(false); await load();
    } catch (e) { alert(e.message); }
    setSaving(false);
  }

  async function remove(b) {
    if (!confirm(`"${b.box_name}" o'chirilsinmi?`)) return;
    await api.del(`/subscription_boxes/${b.id}`).catch(() => {});
    await load();
  }

  async function subscribe(b) {
    setBusyId(b.id);
    try { await api.post('/subscription/subscribe', { box_id: b.id }); await load(); }
    catch (e) { alert(e.message); }
    setBusyId(null);
  }

  async function unsubscribe(b) {
    setBusyId(b.id);
    try { await api.post('/subscription/unsubscribe', { box_id: b.id }); await load(); }
    catch (e) { alert(e.message); }
    setBusyId(null);
  }

  if (rows === null) return <Spinner />;

  return (
    <div>
      <PageHeader icon={Gift} title="Obuna qutilari" subtitle="Muntazam yetkazib beriladigan o'quv materiallari"
        actions={canManage && <button className="btn-gold" onClick={openAdd}><Plus size={16} /> Yangi quti</button>} />

      {rows.length === 0 ? <Empty icon={Gift} title="Hali quti yo'q" /> : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {rows.map((b) => {
            const sub = mySub(b.id);
            return (
              <div key={b.id} className="card p-4 relative">
                {canManage && (
                  <button onClick={() => remove(b)} className="absolute top-3 right-3 text-navy-300 hover:text-red-500 transition"><Trash2 size={14} /></button>
                )}
                <div className="text-sm font-bold text-navy-800 mb-0.5">{b.box_name}</div>
                <div className="text-xs text-navy-400 mb-2">{b.frequency}</div>
                <div className="text-sm font-bold text-gold-600 mb-3">{Number(b.price).toLocaleString()} so'm</div>
                {canManage && <div className="text-[11px] text-navy-400 mb-2">{subCount(b.id)} obunachi</div>}
                {isStudent && (
                  sub ? (
                    <button onClick={() => unsubscribe(b)} disabled={busyId === b.id} className="btn-ghost w-full !py-1.5 text-xs !text-red-500">
                      <Check size={13} /> Obuna — bekor qilish
                    </button>
                  ) : (
                    <button onClick={() => subscribe(b)} disabled={busyId === b.id} className="btn-gold w-full !py-1.5 text-xs">
                      {busyId === b.id ? '...' : 'Obuna bo\'lish'}
                    </button>
                  )
                )}
              </div>
            );
          })}
        </div>
      )}

      <Modal open={modal} title="Yangi obuna qutisi" onClose={() => setModal(false)}
        footer={<>
          <button className="btn-ghost" onClick={() => setModal(false)}>Bekor qilish</button>
          <button className="btn-gold" onClick={save} disabled={saving}>{saving ? 'Saqlanmoqda...' : "Qo'shish"}</button>
        </>}
      >
        <label className="label">Quti nomi</label>
        <input className="input !py-2.5 mb-4" value={form.box_name} onChange={(e) => setForm({ ...form, box_name: e.target.value })} />
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Chastota</label>
            <select className="input !py-2.5" value={form.frequency} onChange={(e) => setForm({ ...form, frequency: e.target.value })}>
              {FREQS.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Narxi (so'm)</label>
            <input className="input !py-2.5" type="number" onWheel={(e) => e.target.blur()} value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
          </div>
        </div>
      </Modal>
    </div>
  );
}
