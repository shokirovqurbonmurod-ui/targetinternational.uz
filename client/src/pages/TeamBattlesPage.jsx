import { useEffect, useState } from 'react';
import { ShieldCheck, Plus, Trophy } from 'lucide-react';
import { api } from '../lib/api.js';
import { PageHeader, Spinner, Empty, Modal } from '../components/ui.jsx';
import { useAuth } from '../auth/AuthContext.jsx';

const STAFF_ROLES_NOT = ['student', 'parent', 'guest'];

export default function TeamBattlesPage() {
  const { user } = useAuth();
  const isStaff = !STAFF_ROLES_NOT.includes(user.role);
  const [rows, setRows] = useState(null);
  const [groups, setGroups] = useState([]);
  const [modal, setModal] = useState(false);
  const [teamA, setTeamA] = useState('');
  const [teamB, setTeamB] = useState('');
  const [subject, setSubject] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  async function load() {
    const [b, g] = await Promise.all([
      api.get('/team_battles').catch(() => []),
      api.get('/groups').catch(() => []),
    ]);
    setRows((b || []).sort((a, b2) => b2.id - a.id));
    setGroups(g || []);
  }
  useEffect(() => { load(); }, []);

  async function create() {
    setErr('');
    if (!teamA || !teamB) { setErr("Ikkala guruhni ham tanlang."); return; }
    if (!subject.trim()) { setErr("Fanni kiriting."); return; }
    setBusy(true);
    try {
      await api.post('/team_battles/create', { team_a: teamA, team_b: teamB, subject: subject.trim() });
      setModal(false); setTeamA(''); setTeamB(''); setSubject('');
      await load();
    } catch (e) { setErr(e.message); }
    setBusy(false);
  }

  async function resolve(id, winner) {
    try {
      const res = await api.post(`/team_battles/${id}/resolve`, { winner });
      alert(`✅ "${winner}" g'olib! ${res.rewarded} ta o'quvchiga coin berildi.`);
      await load();
    } catch (e) { alert(e.message); }
  }

  if (rows === null) return <Spinner />;

  const active = rows.filter((r) => r.status === 'active');
  const finished = rows.filter((r) => r.status !== 'active');

  function BattleCard(b) {
    return (
      <div key={b.id} className="card p-5">
        <div className="flex items-center justify-between mb-2 text-sm font-bold text-navy-800">
          <span>{b.team_a}</span>
          <span className="text-navy-300 text-xs">VS</span>
          <span>{b.team_b}</span>
        </div>
        <div className="text-xs text-navy-400 text-center mb-3">📚 {b.subject} · {b.date}</div>
        {b.status === 'active' && isStaff && (
          <div className="flex gap-2">
            <button onClick={() => resolve(b.id, b.team_a)} className="btn-ghost !py-1.5 flex-1 text-xs">{b.team_a} g'olib</button>
            <button onClick={() => resolve(b.id, b.team_b)} className="btn-ghost !py-1.5 flex-1 text-xs">{b.team_b} g'olib</button>
          </div>
        )}
        {b.status === 'finished' && (
          <div className="flex items-center justify-center gap-1.5 text-emerald-600 text-sm font-bold"><Trophy size={15} /> G'olib: {b.winner}</div>
        )}
      </div>
    );
  }

  return (
    <div>
      <PageHeader icon={ShieldCheck} title="Jamoa janglari" subtitle="Guruhlar bir-biri bilan fandan bellashadi — g'olib guruhning har bir o'quvchisi coin oladi"
        actions={isStaff && <button className="btn-gold" onClick={() => setModal(true)}><Plus size={16} /> Yangi jang</button>} />

      {rows.length === 0 ? <Empty icon={ShieldCheck} title="Hali jamoa jangi yo'q" /> : (
        <div className="space-y-6">
          {active.length > 0 && (
            <div>
              <h3 className="text-xs font-bold text-navy-400 uppercase mb-2">Faol</h3>
              <div className="grid md:grid-cols-2 gap-4">{active.map(BattleCard)}</div>
            </div>
          )}
          {finished.length > 0 && (
            <div>
              <h3 className="text-xs font-bold text-navy-400 uppercase mb-2">Yakunlangan</h3>
              <div className="grid md:grid-cols-2 gap-4">{finished.map(BattleCard)}</div>
            </div>
          )}
        </div>
      )}

      <Modal open={modal} title="Yangi jamoa jangi" onClose={() => setModal(false)}
        footer={<>
          <button className="btn-ghost" onClick={() => setModal(false)}>Bekor qilish</button>
          <button className="btn-gold" onClick={create} disabled={busy}>{busy ? 'Yaratilmoqda...' : 'Yaratish'}</button>
        </>}>
        <label className="label">1-guruh</label>
        <select className="input !py-2.5 mb-4" value={teamA} onChange={(e) => setTeamA(e.target.value)}>
          <option value="">— tanlang —</option>
          {groups.map((g) => <option key={g.id} value={g.name}>{g.name}</option>)}
        </select>
        <label className="label">2-guruh</label>
        <select className="input !py-2.5 mb-4" value={teamB} onChange={(e) => setTeamB(e.target.value)}>
          <option value="">— tanlang —</option>
          {groups.filter((g) => g.name !== teamA).map((g) => <option key={g.id} value={g.name}>{g.name}</option>)}
        </select>
        <label className="label">Fan</label>
        <input className="input !py-2.5" placeholder="Masalan: Grammatika" value={subject} onChange={(e) => setSubject(e.target.value)} />
        {err && <p className="text-xs text-red-500 mt-2">{err}</p>}
      </Modal>
    </div>
  );
}
