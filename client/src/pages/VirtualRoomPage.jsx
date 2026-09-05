import { useEffect, useState } from 'react';
import { Glasses, Plus, Trash2, Users, ExternalLink, LogOut } from 'lucide-react';
import { api } from '../lib/api.js';
import { PageHeader, Spinner, Modal, Empty } from '../components/ui.jsx';
import { useAuth } from '../auth/AuthContext.jsx';

const emptyForm = { name: '', capacity: 10, host: '', link: '', status: 'active' };

export default function VirtualRoomPage() {
  const { user } = useAuth();
  const canManage = !['student', 'parent'].includes(user.role);
  const isStudent = user.role === 'student';
  const [rows, setRows] = useState(null);
  const [members, setMembers] = useState([]);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState(null);

  async function load() {
    const [r, m] = await Promise.all([
      api.get('/virtual_rooms?limit=500').catch(() => []),
      api.get('/virtual_room_members?limit=2000').catch(() => []),
    ]);
    setRows((r || []).filter((x) => x.status !== 'archived')); setMembers(m || []);
  }
  useEffect(() => { load(); }, []);

  function membersOf(id) { return members.filter((m) => String(m.room_id) === String(id)); }
  function amIn(id) { return membersOf(id).some((m) => m.student === user.full_name); }

  function openAdd() { setForm(emptyForm); setModal(true); }

  async function save() {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      await api.post('/virtual_rooms', { ...form, capacity: Number(form.capacity) || 0 });
      setModal(false); await load();
    } catch (e) { alert(e.message); }
    setSaving(false);
  }

  async function remove(r) {
    if (!confirm(`"${r.name}" o'chirilsinmi?`)) return;
    await api.del(`/virtual_rooms/${r.id}`).catch(() => {});
    await load();
  }

  async function join(r) {
    setBusyId(r.id);
    try { await api.post('/virtual-room/join', { room_id: r.id }); await load(); }
    catch (e) { alert(e.message); }
    setBusyId(null);
  }

  async function leave(r) {
    setBusyId(r.id);
    try { await api.post('/virtual-room/leave', { room_id: r.id }); await load(); }
    catch (e) { alert(e.message); }
    setBusyId(null);
  }

  if (rows === null) return <Spinner />;

  return (
    <div>
      <PageHeader icon={Glasses} title="Virtual xona" subtitle="Onlayn uchrashuv xonalari"
        actions={canManage && <button className="btn-gold" onClick={openAdd}><Plus size={16} /> Yangi xona</button>} />

      {rows.length === 0 ? <Empty icon={Glasses} title="Xona yo'q" /> : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {rows.map((r) => {
            const count = membersOf(r.id).length;
            const full = r.capacity && count >= Number(r.capacity);
            const inRoom = amIn(r.id);
            return (
              <div key={r.id} className="card p-4 relative">
                {canManage && (
                  <button onClick={() => remove(r)} className="absolute top-3 right-3 text-navy-300 hover:text-red-500 transition"><Trash2 size={14} /></button>
                )}
                <div className="text-sm font-bold text-navy-800 mb-0.5">{r.name}</div>
                <div className="text-xs text-navy-400 mb-3">{r.host}</div>
                <div className="flex items-center gap-1 text-[11px] text-navy-500 mb-3">
                  <Users size={11} /> {count}{r.capacity ? `/${r.capacity}` : ''} ishtirokchi
                </div>
                {isStudent && (
                  inRoom ? (
                    <div className="flex gap-2">
                      {r.link && <a href={r.link} target="_blank" rel="noreferrer" className="btn-gold flex-1 !py-1.5 text-xs justify-center"><ExternalLink size={12} /> Kirish</a>}
                      <button onClick={() => leave(r)} disabled={busyId === r.id} className="btn-ghost !py-1.5 !px-3 text-xs !text-red-500"><LogOut size={13} /></button>
                    </div>
                  ) : (
                    <button onClick={() => join(r)} disabled={busyId === r.id || full} className="btn-gold w-full !py-1.5 text-xs disabled:opacity-40">
                      {full ? "To'lgan" : busyId === r.id ? '...' : "Qo'shilish"}
                    </button>
                  )
                )}
              </div>
            );
          })}
        </div>
      )}

      <Modal open={modal} title="Yangi virtual xona" onClose={() => setModal(false)}
        footer={<>
          <button className="btn-ghost" onClick={() => setModal(false)}>Bekor qilish</button>
          <button className="btn-gold" onClick={save} disabled={saving}>{saving ? 'Saqlanmoqda...' : "Qo'shish"}</button>
        </>}
      >
        <label className="label">Xona nomi</label>
        <input className="input !py-2.5 mb-4" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <div className="grid sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="label">Boshlovchi</label>
            <input className="input !py-2.5" value={form.host} onChange={(e) => setForm({ ...form, host: e.target.value })} />
          </div>
          <div>
            <label className="label">Sig'imi</label>
            <input className="input !py-2.5" type="number" onWheel={(e) => e.target.blur()} value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} />
          </div>
        </div>
        <label className="label">Havola</label>
        <input className="input !py-2.5" placeholder="https://..." value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value })} />
      </Modal>
    </div>
  );
}
