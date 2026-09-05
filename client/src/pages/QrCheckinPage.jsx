import { useEffect, useState } from 'react';
import { QrCode, Plus, Trash2, Check, Users } from 'lucide-react';
import { api } from '../lib/api.js';
import { PageHeader, Spinner, Modal, Empty } from '../components/ui.jsx';
import { useAuth } from '../auth/AuthContext.jsx';

const emptyForm = { label: '', linked_to: '', status: 'active' };
const genCode = () => Math.random().toString(36).slice(2, 10).toUpperCase();

export default function QrCheckinPage() {
  const { user } = useAuth();
  const canManage = !['student', 'parent'].includes(user.role);
  const isStudent = user.role === 'student';
  const [rows, setRows] = useState(null);
  const [checkins, setCheckins] = useState([]);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState(null);

  const today = new Date().toISOString().slice(0, 10);

  async function load() {
    const [q, c] = await Promise.all([
      api.get('/qr_codes?limit=500').catch(() => []),
      api.get('/check_ins?limit=2000').catch(() => []),
    ]);
    setRows((q || []).filter((x) => x.status !== 'archived'));
    setCheckins(c || []);
  }
  useEffect(() => { load(); }, []);

  function countFor(linkedTo) { return checkins.filter((c) => c.location === linkedTo).length; }
  function didICheckin(linkedTo) { return checkins.some((c) => c.location === linkedTo && c.student === user.full_name && c.date === today); }

  function openAdd() { setForm({ ...emptyForm, code_value: genCode() }); setModal(true); }

  async function save() {
    if (!form.label.trim()) return;
    setSaving(true);
    try {
      await api.post('/qr_codes', { ...form, code_value: genCode() });
      setModal(false); await load();
    } catch (e) { alert(e.message); }
    setSaving(false);
  }

  async function remove(q) {
    if (!confirm(`"${q.label}" o'chirilsinmi?`)) return;
    await api.del(`/qr_codes/${q.id}`).catch(() => {});
    await load();
  }

  async function checkin(q) {
    setBusyId(q.id);
    try { await api.post('/qr/checkin', { qr_id: q.id }); await load(); }
    catch (e) { alert(e.message); }
    setBusyId(null);
  }

  if (rows === null) return <Spinner />;

  return (
    <div>
      <PageHeader icon={QrCode} title="QR & Check-in" subtitle="Sessiya/tadbirlar uchun raqamli davomat"
        actions={canManage && <button className="btn-gold" onClick={openAdd}><Plus size={16} /> Yangi kod</button>} />

      {rows.length === 0 ? <Empty icon={QrCode} title="Kod yo'q" /> : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {rows.map((q) => {
            const done = didICheckin(q.linked_to);
            return (
              <div key={q.id} className="card p-4 relative">
                {canManage && (
                  <button onClick={() => remove(q)} className="absolute top-3 right-3 text-navy-300 hover:text-red-500 transition"><Trash2 size={14} /></button>
                )}
                <div className="text-sm font-bold text-navy-800 mb-0.5">{q.label}</div>
                <div className="text-xs text-navy-400 mb-2">{q.linked_to}</div>
                <div className="font-mono text-[10px] text-navy-300 bg-navy-50 rounded-lg px-2 py-1 mb-3 inline-block">{q.code_value}</div>
                {canManage && <div className="flex items-center gap-1 text-[11px] text-navy-500 mb-2"><Users size={11} /> {countFor(q.linked_to)} check-in</div>}
                {isStudent && (
                  done ? (
                    <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 rounded-xl py-1.5"><Check size={13} /> Belgilandingiz</div>
                  ) : (
                    <button onClick={() => checkin(q)} disabled={busyId === q.id} className="btn-gold w-full !py-1.5 text-xs">
                      {busyId === q.id ? '...' : "Check-in qilish"}
                    </button>
                  )
                )}
              </div>
            );
          })}
        </div>
      )}

      <Modal open={modal} title="Yangi QR kod" onClose={() => setModal(false)}
        footer={<>
          <button className="btn-ghost" onClick={() => setModal(false)}>Bekor qilish</button>
          <button className="btn-gold" onClick={save} disabled={saving}>{saving ? 'Saqlanmoqda...' : "Qo'shish"}</button>
        </>}
      >
        <label className="label">Nomi</label>
        <input className="input !py-2.5 mb-4" placeholder="Masalan: Speaking Club — 20-avgust" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} />
        <label className="label">Bog'langan tadbir/sessiya</label>
        <input className="input !py-2.5" value={form.linked_to} onChange={(e) => setForm({ ...form, linked_to: e.target.value })} />
      </Modal>
    </div>
  );
}
