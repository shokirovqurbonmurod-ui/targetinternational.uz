import { useEffect, useState } from 'react';
import { Lightbulb, Plus, ChevronUp } from 'lucide-react';
import { api } from '../lib/api.js';
import { PageHeader, Spinner, Modal, Empty } from '../components/ui.jsx';
import { useAuth } from '../auth/AuthContext.jsx';

const STATUS_STYLE = { new: 'bg-blue-100 text-blue-700', planned: 'bg-amber-100 text-amber-700', done: 'bg-emerald-100 text-emerald-700', rejected: 'bg-red-100 text-red-600' };

export default function FeatureRequestsPage() {
  const { user } = useAuth();
  const canManage = !['student', 'parent'].includes(user.role);
  const [rows, setRows] = useState(null);
  const [votes, setVotes] = useState([]);
  const [modal, setModal] = useState(false);
  const [title, setTitle] = useState('');
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState(null);

  async function load() {
    const [r, v] = await Promise.all([
      api.get('/feature_requests?limit=500').catch(() => []),
      api.get('/feature_request_votes?limit=2000').catch(() => []),
    ]);
    setRows((r || []).sort((a, b) => (b.votes || 0) - (a.votes || 0)));
    setVotes(v || []);
  }
  useEffect(() => { load(); }, []);

  function iVoted(id) { return votes.some((v) => String(v.request_id) === String(id) && v.student === user.full_name); }

  async function submit() {
    if (!title.trim()) return;
    setSaving(true);
    try { await api.post('/feature-requests/submit', { title }); setTitle(''); setModal(false); await load(); }
    catch (e) { alert(e.message); }
    setSaving(false);
  }

  async function vote(row) {
    setBusyId(row.id);
    try { await api.post('/feature-requests/vote', { request_id: row.id }); await load(); }
    catch (e) { alert(e.message); }
    setBusyId(null);
  }

  async function setStatus(row, status) {
    await api.put(`/feature_requests/${row.id}`, { status }).catch(() => {});
    await load();
  }

  if (rows === null) return <Spinner />;

  return (
    <div className="max-w-xl mx-auto">
      <PageHeader icon={Lightbulb} title="Funksiya so'rovlari" subtitle="Nimani qo'shishimizni xohlaysiz?"
        actions={<button className="btn-gold" onClick={() => setModal(true)}><Plus size={16} /> Taklif berish</button>} />

      {rows.length === 0 ? <Empty icon={Lightbulb} title="Hali taklif yo'q" /> : (
        <div className="space-y-1.5">
          {rows.map((r) => {
            const voted = iVoted(r.id);
            return (
              <div key={r.id} className="flex items-center gap-3 rounded-xl bg-navy-50/60 px-4 py-3">
                <button onClick={() => vote(r)} disabled={busyId === r.id || voted}
                  className={`flex flex-col items-center gap-0.5 transition shrink-0 ${voted ? 'text-gold-600' : 'text-navy-400 hover:text-gold-600'}`}>
                  <ChevronUp size={16} />
                  <span className="text-xs font-bold">{r.votes || 0}</span>
                </button>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-navy-800">{r.title}</div>
                  <div className="text-[11px] text-navy-400">{r.requested_by}</div>
                </div>
                {canManage ? (
                  <select value={r.status || 'new'} onChange={(e) => setStatus(r, e.target.value)}
                    className={`chip text-[10px] shrink-0 border-0 cursor-pointer ${STATUS_STYLE[r.status] || STATUS_STYLE.new}`}>
                    <option value="new">new</option>
                    <option value="planned">planned</option>
                    <option value="done">done</option>
                    <option value="rejected">rejected</option>
                  </select>
                ) : (
                  <span className={`chip text-[10px] shrink-0 ${STATUS_STYLE[r.status] || STATUS_STYLE.new}`}>{r.status || 'new'}</span>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Modal open={modal} title="Yangi taklif" onClose={() => setModal(false)}
        footer={<>
          <button className="btn-ghost" onClick={() => setModal(false)}>Bekor qilish</button>
          <button className="btn-gold" onClick={submit} disabled={saving}>{saving ? 'Saqlanmoqda...' : 'Yuborish'}</button>
        </>}
      >
        <label className="label">Taklifingiz</label>
        <input className="input !py-2.5" value={title} onChange={(e) => setTitle(e.target.value)} />
      </Modal>
    </div>
  );
}
