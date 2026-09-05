import { useEffect, useState } from 'react';
import { Swords, Plus, Check, X, Trophy } from 'lucide-react';
import { api } from '../lib/api.js';
import { PageHeader, Spinner, Empty, Modal } from '../components/ui.jsx';
import { useAuth } from '../auth/AuthContext.jsx';

const STATUS_LABEL = { pending: 'Kutilmoqda', active: 'Faol', declined: 'Rad etilgan', finished: 'Yakunlangan' };
const STATUS_TONE = { pending: 'bg-amber-100 text-amber-700', active: 'bg-blue-100 text-blue-700', declined: 'bg-red-100 text-red-600', finished: 'bg-emerald-100 text-emerald-700' };
const STAFF_ROLES_NOT = ['student', 'parent', 'guest'];

export default function ChallengesPage() {
  const { user } = useAuth();
  const isStudent = user.role === 'student';
  const isStaff = !STAFF_ROLES_NOT.includes(user.role);
  const [rows, setRows] = useState(null);
  const [students, setStudents] = useState([]);
  const [modal, setModal] = useState(false);
  const [opponentId, setOpponentId] = useState('');
  const [subject, setSubject] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  async function load() {
    const [c, s] = await Promise.all([
      api.get('/challenges_1v1').catch(() => []),
      api.get('/students').catch(() => []),
    ]);
    setRows((c || []).sort((a, b) => b.id - a.id));
    setStudents(s || []);
  }
  useEffect(() => { load(); }, []);

  async function create() {
    setErr('');
    if (!opponentId) { setErr("Raqibni tanlang."); return; }
    if (!subject.trim()) { setErr("Fanni kiriting."); return; }
    setBusy(true);
    try {
      await api.post('/challenges_1v1/create', { opponent_id: Number(opponentId), subject: subject.trim() });
      setModal(false); setOpponentId(''); setSubject('');
      await load();
    } catch (e) { setErr(e.message); }
    setBusy(false);
  }

  async function accept(id) { await api.post(`/challenges_1v1/${id}/accept`, {}).catch((e) => alert(e.message)); await load(); }
  async function decline(id) { await api.post(`/challenges_1v1/${id}/decline`, {}).catch((e) => alert(e.message)); await load(); }
  async function resolve(id, winner) { await api.post(`/challenges_1v1/${id}/resolve`, { winner }).catch((e) => alert(e.message)); await load(); }

  if (rows === null) return <Spinner />;

  return (
    <div>
      <PageHeader icon={Swords} title="1v1 Challenge" subtitle="O'quvchilar bir-birini fandan bellashuvga chaqiradi"
        actions={isStudent && <button className="btn-gold" onClick={() => setModal(true)}><Plus size={16} /> Raqib chaqirish</button>} />

      {rows.length === 0 ? <Empty icon={Swords} title="Hali challenge yo'q" /> : (
        <div className="grid md:grid-cols-2 gap-4">
          {rows.map((c) => (
            <div key={c.id} className="card p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm font-bold text-navy-800">{c.challenger} <span className="text-navy-300">vs</span> {c.opponent}</div>
                <span className={`chip text-[9px] ${STATUS_TONE[c.status]}`}>{STATUS_LABEL[c.status]}</span>
              </div>
              <div className="text-xs text-navy-400 mb-3">📚 {c.subject} · {c.date}</div>

              {c.status === 'pending' && isStudent && user.full_name === c.opponent && (
                <div className="flex gap-2">
                  <button onClick={() => accept(c.id)} className="btn-gold !py-1.5 flex-1 text-xs"><Check size={13} /> Qabul qilish</button>
                  <button onClick={() => decline(c.id)} className="btn-ghost !py-1.5 flex-1 text-xs text-red-500"><X size={13} /> Rad etish</button>
                </div>
              )}
              {c.status === 'active' && isStaff && (
                <div className="flex gap-2">
                  <button onClick={() => resolve(c.id, c.challenger)} className="btn-ghost !py-1.5 flex-1 text-xs">{c.challenger} g'olib</button>
                  <button onClick={() => resolve(c.id, c.opponent)} className="btn-ghost !py-1.5 flex-1 text-xs">{c.opponent} g'olib</button>
                </div>
              )}
              {c.status === 'finished' && (
                <div className="flex items-center gap-1.5 text-emerald-600 text-sm font-bold"><Trophy size={15} /> G'olib: {c.winner}</div>
              )}
            </div>
          ))}
        </div>
      )}

      <Modal open={modal} title="Raqib chaqirish" onClose={() => setModal(false)}
        footer={<>
          <button className="btn-ghost" onClick={() => setModal(false)}>Bekor qilish</button>
          <button className="btn-gold" onClick={create} disabled={busy}>{busy ? 'Yuborilmoqda...' : 'Chaqirish'}</button>
        </>}>
        <label className="label">Raqib</label>
        <select className="input !py-2.5 mb-4" value={opponentId} onChange={(e) => setOpponentId(e.target.value)}>
          <option value="">— tanlang —</option>
          {students.filter((s) => s.full_name !== user.full_name).map((s) => <option key={s.id} value={s.id}>{s.full_name} · {s.group_name}</option>)}
        </select>
        <label className="label">Fan</label>
        <input className="input !py-2.5" placeholder="Masalan: Grammatika" value={subject} onChange={(e) => setSubject(e.target.value)} />
        {err && <p className="text-xs text-red-500 mt-2">{err}</p>}
      </Modal>
    </div>
  );
}
