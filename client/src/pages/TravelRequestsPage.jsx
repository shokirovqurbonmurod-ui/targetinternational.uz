import { useEffect, useState } from 'react';
import { Plane, Plus, Check, X, Trash2 } from 'lucide-react';
import { api } from '../lib/api.js';
import { PageHeader, Spinner, Empty, Modal } from '../components/ui.jsx';
import { useAuth } from '../auth/AuthContext.jsx';

const MGMT_ROLES = ['founder', 'director', 'super_admin', 'branch_manager', 'admin', 'hr', 'academic_manager'];
const STATUS_LABEL = { pending: 'Kutilmoqda', approved: 'Tasdiqlangan', rejected: 'Rad etilgan' };
const STATUS_TONE = { pending: 'bg-amber-100 text-amber-700', approved: 'bg-emerald-100 text-emerald-700', rejected: 'bg-red-100 text-red-600' };

export default function TravelRequestsPage() {
  const { user } = useAuth();
  const isMgmt = MGMT_ROLES.includes(user.role);
  const [rows, setRows] = useState(null);
  const [modal, setModal] = useState(false);
  const [destination, setDestination] = useState('');
  const [purpose, setPurpose] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  async function load() {
    setRows(await api.get('/travel_requests').catch(() => []));
  }
  useEffect(() => { load(); }, []);

  async function submit() {
    setErr('');
    if (!destination.trim() || !startDate || !endDate) { setErr("Manzil va sanalarni to'ldiring."); return; }
    setBusy(true);
    try {
      await api.post('/travel_requests', { destination: destination.trim(), purpose: purpose.trim(), start_date: startDate, end_date: endDate });
      setModal(false); setDestination(''); setPurpose(''); setStartDate(''); setEndDate('');
      await load();
    } catch (e) { setErr(e.message); }
    setBusy(false);
  }

  async function approve(id) { await api.post(`/travel_requests/${id}/approve`, {}).catch((e) => alert(e.message)); await load(); }
  async function reject(id) { await api.post(`/travel_requests/${id}/reject`, {}).catch((e) => alert(e.message)); await load(); }
  async function remove(id) {
    if (!confirm("So'rovni o'chirasizmi?")) return;
    await api.del(`/travel_requests/${id}`).catch((e) => alert(e.message));
    await load();
  }

  if (rows === null) return <Spinner />;

  return (
    <div>
      <PageHeader icon={Plane} title="Xizmat safari" subtitle="Ish safari uchun so'rov yuboring"
        actions={<button className="btn-gold" onClick={() => setModal(true)}><Plus size={16} /> Yangi so'rov</button>} />

      {rows.length === 0 ? <Empty icon={Plane} title="Hali so'rov yo'q" /> : (
        <div className="card overflow-hidden">
          <div className="divide-y divide-navy-50">
            {rows.map((row) => (
              <div key={row.id} className="flex items-center gap-3 px-4 py-3">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-navy-800">{row.destination}</div>
                  <div className="text-[11px] text-navy-400">{row.staff} · {row.start_date} — {row.end_date}{row.purpose ? ` · ${row.purpose}` : ''}</div>
                </div>
                <span className={`chip text-[10px] shrink-0 ${STATUS_TONE[row.status]}`}>{STATUS_LABEL[row.status]}</span>
                {isMgmt && row.status === 'pending' && (
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => approve(row.id)} className="text-emerald-500 hover:text-emerald-700" title="Tasdiqlash"><Check size={16} /></button>
                    <button onClick={() => reject(row.id)} className="text-red-400 hover:text-red-600" title="Rad etish"><X size={16} /></button>
                  </div>
                )}
                {(row.staff === user.full_name || isMgmt) && row.status === 'pending' && (
                  <button onClick={() => remove(row.id)} className="text-navy-300 hover:text-red-500 shrink-0" title="O'chirish"><Trash2 size={14} /></button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <Modal open={modal} title="Yangi safar so'rovi" onClose={() => setModal(false)}
        footer={<>
          <button className="btn-ghost" onClick={() => setModal(false)}>Bekor qilish</button>
          <button className="btn-gold" onClick={submit} disabled={busy}>{busy ? 'Yuborilmoqda...' : 'Yuborish'}</button>
        </>}>
        <label className="label">Manzil</label>
        <input className="input !py-2.5 mb-4" placeholder="Masalan: Toshkent" value={destination} onChange={(e) => setDestination(e.target.value)} />
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label className="label">Boshlanish sanasi</label>
            <input type="date" className="input !py-2.5" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div>
            <label className="label">Tugash sanasi</label>
            <input type="date" className="input !py-2.5" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
        </div>
        <label className="label">Maqsad (ixtiyoriy)</label>
        <input className="input !py-2.5" placeholder="Masalan: Konferensiya" value={purpose} onChange={(e) => setPurpose(e.target.value)} />
        {err && <p className="text-xs text-red-500 mt-2">{err}</p>}
      </Modal>
    </div>
  );
}
