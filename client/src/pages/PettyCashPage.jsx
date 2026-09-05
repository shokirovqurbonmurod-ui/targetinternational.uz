import { useEffect, useState } from 'react';
import { PiggyBank, Plus, Check, X, Trash2 } from 'lucide-react';
import { api } from '../lib/api.js';
import { PageHeader, Spinner, Empty, Modal } from '../components/ui.jsx';
import { useAuth } from '../auth/AuthContext.jsx';

const FINANCE_ROLES = ['founder', 'director', 'super_admin', 'branch_manager', 'admin', 'accountant', 'cashier'];
const STATUS_LABEL = { pending: 'Kutilmoqda', approved: 'Tasdiqlangan', rejected: 'Rad etilgan' };
const STATUS_TONE = { pending: 'bg-amber-100 text-amber-700', approved: 'bg-emerald-100 text-emerald-700', rejected: 'bg-red-100 text-red-600' };
const fmt = (n) => Number(n || 0).toLocaleString('en-US').replace(/,/g, ' ');

export default function PettyCashPage() {
  const { user } = useAuth();
  const isFinance = FINANCE_ROLES.includes(user.role);
  const [rows, setRows] = useState(null);
  const [modal, setModal] = useState(false);
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  async function load() {
    setRows(await api.get('/petty_cash').catch(() => []));
  }
  useEffect(() => { load(); }, []);

  async function submit() {
    setErr('');
    if (Number(amount) <= 0 || !reason.trim()) { setErr("Miqdor va sababni to'ldiring."); return; }
    setBusy(true);
    try {
      await api.post('/petty_cash', { amount: Number(amount), reason: reason.trim() });
      setModal(false); setAmount(''); setReason('');
      await load();
    } catch (e) { setErr(e.message); }
    setBusy(false);
  }

  async function approve(id) {
    await api.post(`/petty_cash/${id}/approve`, {}).catch((e) => alert(e.message));
    await load();
  }
  async function reject(id) {
    await api.post(`/petty_cash/${id}/reject`, {}).catch((e) => alert(e.message));
    await load();
  }
  async function remove(id) {
    if (!confirm("So'rovni o'chirasizmi?")) return;
    await api.del(`/petty_cash/${id}`).catch((e) => alert(e.message));
    await load();
  }

  if (rows === null) return <Spinner />;

  return (
    <div>
      <PageHeader icon={PiggyBank} title="Mayda xarajatlar" subtitle="Kichik xarajat so'rovi yuboring — moliya tasdiqlaydi"
        actions={<button className="btn-gold" onClick={() => setModal(true)}><Plus size={16} /> Yangi so'rov</button>} />

      {rows.length === 0 ? <Empty icon={PiggyBank} title="Hali so'rov yo'q" /> : (
        <div className="card overflow-hidden">
          <div className="divide-y divide-navy-50">
            {rows.map((row) => (
              <div key={row.id} className="flex items-center gap-3 px-4 py-3">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-navy-800">{row.reason}</div>
                  <div className="text-[11px] text-navy-400">{row.requester} · {row.date}</div>
                </div>
                <span className="font-display text-lg text-gold-600 shrink-0">{fmt(row.amount)} so'm</span>
                <span className={`chip text-[10px] shrink-0 ${STATUS_TONE[row.status]}`}>{STATUS_LABEL[row.status]}</span>
                {isFinance && row.status === 'pending' && (
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => approve(row.id)} className="text-emerald-500 hover:text-emerald-700" title="Tasdiqlash"><Check size={16} /></button>
                    <button onClick={() => reject(row.id)} className="text-red-400 hover:text-red-600" title="Rad etish"><X size={16} /></button>
                  </div>
                )}
                {(row.requester === user.full_name || isFinance) && row.status === 'pending' && (
                  <button onClick={() => remove(row.id)} className="text-navy-300 hover:text-red-500 shrink-0" title="O'chirish"><Trash2 size={14} /></button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <Modal open={modal} title="Yangi so'rov" onClose={() => setModal(false)}
        footer={<>
          <button className="btn-ghost" onClick={() => setModal(false)}>Bekor qilish</button>
          <button className="btn-gold" onClick={submit} disabled={busy}>{busy ? 'Yuborilmoqda...' : 'Yuborish'}</button>
        </>}>
        <label className="label">Miqdor (so'm)</label>
        <input type="number" className="input !py-2.5 mb-4" onWheel={(e) => e.target.blur()} value={amount} onChange={(e) => setAmount(e.target.value)} />
        <label className="label">Sabab</label>
        <input className="input !py-2.5" placeholder="Masalan: kanselyariya buyumlari" value={reason} onChange={(e) => setReason(e.target.value)} />
        {err && <p className="text-xs text-red-500 mt-2">{err}</p>}
      </Modal>
    </div>
  );
}
