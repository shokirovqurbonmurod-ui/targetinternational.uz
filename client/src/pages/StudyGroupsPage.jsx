import { useEffect, useState } from 'react';
import { Users, Plus, Trash2, LogIn, LogOut } from 'lucide-react';
import { api } from '../lib/api.js';
import { PageHeader, Spinner, Modal, Empty } from '../components/ui.jsx';
import { useAuth } from '../auth/AuthContext.jsx';

const emptyForm = { name: '', subject: '', meeting_time: '' };

export default function StudyGroupsPage() {
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
    const [g, m] = await Promise.all([
      api.get('/study_groups?limit=500').catch(() => []),
      api.get('/study_group_members?limit=2000').catch(() => []),
    ]);
    setRows(g || []); setMembers(m || []);
  }
  useEffect(() => { load(); }, []);

  function membersOf(groupId) { return members.filter((m) => String(m.group_id) === String(groupId)); }
  function amMember(groupId) { return membersOf(groupId).some((m) => m.student === user.full_name); }

  function openAdd() { setForm(emptyForm); setModal(true); }

  async function save() {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      if (isStudent) await api.post('/study-groups/create', form);
      else await api.post('/study_groups', { ...form, members_count: 0 });
      setModal(false); await load();
    } catch (e) { alert(e.message); }
    setSaving(false);
  }

  async function remove(g) {
    if (!confirm(`"${g.name}" guruhi o'chirilsinmi?`)) return;
    await api.del(`/study_groups/${g.id}`).catch(() => {});
    await load();
  }

  async function join(g) {
    setBusyId(g.id);
    try { await api.post('/study-groups/join', { group_id: g.id }); await load(); }
    catch (e) { alert(e.message); }
    setBusyId(null);
  }

  async function leave(g) {
    setBusyId(g.id);
    try { await api.post('/study-groups/leave', { group_id: g.id }); await load(); }
    catch (e) { alert(e.message); }
    setBusyId(null);
  }

  if (rows === null) return <Spinner />;

  return (
    <div>
      <PageHeader icon={Users} title="Study guruhlar" subtitle="O'quvchilar tashkil etgan birgalikda o'qish guruhlari"
        actions={<button className="btn-gold" onClick={openAdd}><Plus size={16} /> Yangi guruh</button>} />

      {rows.length === 0 ? <Empty icon={Users} title="Hali guruh yo'q" /> : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {rows.map((g) => {
            const mine = amMember(g.id);
            return (
              <div key={g.id} className="card p-4 relative">
                {canManage && (
                  <button onClick={() => remove(g)} className="absolute top-3 right-3 text-navy-300 hover:text-red-500 transition"><Trash2 size={14} /></button>
                )}
                <div className="text-sm font-bold text-navy-800 mb-0.5">{g.name}</div>
                <div className="text-xs text-navy-400 mb-3">{g.subject} · {g.meeting_time}</div>
                <div className="flex items-center gap-1 text-[11px] text-navy-500 mb-3"><Users size={11} /> {membersOf(g.id).length} a'zo</div>
                {isStudent && (
                  mine ? (
                    <button onClick={() => leave(g)} disabled={busyId === g.id} className="btn-ghost w-full !py-1.5 text-xs !text-red-500"><LogOut size={13} /> Chiqish</button>
                  ) : (
                    <button onClick={() => join(g)} disabled={busyId === g.id} className="btn-gold w-full !py-1.5 text-xs"><LogIn size={13} /> Qo'shilish</button>
                  )
                )}
              </div>
            );
          })}
        </div>
      )}

      <Modal open={modal} title="Yangi study guruh" onClose={() => setModal(false)}
        footer={<>
          <button className="btn-ghost" onClick={() => setModal(false)}>Bekor qilish</button>
          <button className="btn-gold" onClick={save} disabled={saving}>{saving ? 'Saqlanmoqda...' : "Qo'shish"}</button>
        </>}
      >
        <label className="label">Guruh nomi</label>
        <input className="input !py-2.5 mb-4" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <label className="label">Fan</label>
        <input className="input !py-2.5 mb-4" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
        <label className="label">Uchrashuv vaqti</label>
        <input className="input !py-2.5" placeholder="Masalan: Har seshanba, 18:00" value={form.meeting_time} onChange={(e) => setForm({ ...form, meeting_time: e.target.value })} />
      </Modal>
    </div>
  );
}
