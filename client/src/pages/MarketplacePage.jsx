import { useEffect, useState } from 'react';
import { ShoppingBag, Plus, Trash2, Check } from 'lucide-react';
import { api } from '../lib/api.js';
import { PageHeader, Spinner, Empty, Modal } from '../components/ui.jsx';
import { useAuth } from '../auth/AuthContext.jsx';

export default function MarketplacePage() {
  const { user } = useAuth();
  const isStudent = user.role === 'student';
  const isStaff = !['student', 'parent', 'guest'].includes(user.role);
  const [rows, setRows] = useState(null);
  const [me, setMe] = useState(null);
  const [modal, setModal] = useState(false);
  const [itemName, setItemName] = useState('');
  const [price, setPrice] = useState(20);
  const [description, setDescription] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  async function load() {
    const [m, s] = await Promise.all([
      api.get('/marketplace').catch(() => []),
      isStudent ? api.get('/students').catch(() => []) : Promise.resolve([]),
    ]);
    setRows((m || []).sort((a, b) => b.id - a.id));
    if (isStudent) setMe((s || []).find((x) => x.full_name === user.full_name) || null);
  }
  useEffect(() => { load(); }, []);

  async function create() {
    setErr('');
    if (!itemName.trim()) { setErr("Mahsulot nomini kiriting."); return; }
    if (Number(price) <= 0) { setErr("Narxni kiriting."); return; }
    setBusy(true);
    try {
      await api.post('/marketplace', { item_name: itemName.trim(), price: Number(price), description });
      setModal(false); setItemName(''); setPrice(20); setDescription('');
      await load();
    } catch (e) { setErr(e.message); }
    setBusy(false);
  }

  async function buy(id) {
    if (!confirm("Ushbu mahsulotni sotib olasizmi?")) return;
    try {
      await api.post(`/marketplace/${id}/buy`, {});
      await load();
    } catch (e) { alert(e.message); }
  }

  async function remove(id) {
    if (!confirm("E'lonni o'chirasizmi?")) return;
    await api.del(`/marketplace/${id}`).catch((e) => alert(e.message));
    await load();
  }

  if (rows === null) return <Spinner />;

  const active = rows.filter((r) => r.status === 'active');
  const sold = rows.filter((r) => r.status === 'sold');

  return (
    <div>
      <PageHeader icon={ShoppingBag} title="Marketplace" subtitle="O'quvchilar coinlarga buyum sotadi va sotib oladi"
        actions={isStudent && <button className="btn-gold" onClick={() => setModal(true)}><Plus size={16} /> E'lon berish</button>} />

      {isStudent && me && (
        <div className="mb-4 text-xs text-navy-500">Sizning balansingiz: <b className="text-gold-700">{me.coins ?? 0} 🪙</b></div>
      )}

      {rows.length === 0 ? <Empty icon={ShoppingBag} title="Hozircha e'lon yo'q" /> : (
        <div className="space-y-6">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {active.map((item) => (
              <div key={item.id} className="card p-4">
                <div className="text-sm font-bold text-navy-800 mb-1">{item.item_name}</div>
                {item.description && <div className="text-xs text-navy-400 mb-2">{item.description}</div>}
                <div className="text-xs text-navy-400 mb-3">Sotuvchi: {item.seller}</div>
                <div className="flex items-center justify-between">
                  <span className="font-display text-lg text-gold-600">{item.price} 🪙</span>
                  {isStudent && item.seller !== user.full_name && (
                    <button onClick={() => buy(item.id)} className="btn-gold !py-1.5 !px-3 text-xs">Sotib olish</button>
                  )}
                  {(item.seller === user.full_name || isStaff) && (
                    <button onClick={() => remove(item.id)} className="text-navy-300 hover:text-red-500"><Trash2 size={14} /></button>
                  )}
                </div>
              </div>
            ))}
          </div>
          {sold.length > 0 && (
            <div>
              <h3 className="text-xs font-bold text-navy-400 uppercase mb-2">Sotilgan</h3>
              <div className="space-y-1.5">
                {sold.map((item) => (
                  <div key={item.id} className="flex items-center justify-between text-sm rounded-lg bg-navy-50/40 px-3 py-2">
                    <span className="flex items-center gap-1.5 text-navy-500"><Check size={13} className="text-emerald-500" /> {item.item_name} — {item.seller} → {item.buyer}</span>
                    <span className="text-navy-400">{item.price} 🪙</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <Modal open={modal} title="Yangi e'lon" onClose={() => setModal(false)}
        footer={<>
          <button className="btn-ghost" onClick={() => setModal(false)}>Bekor qilish</button>
          <button className="btn-gold" onClick={create} disabled={busy}>{busy ? 'Joylanmoqda...' : "E'lon berish"}</button>
        </>}>
        <label className="label">Mahsulot nomi</label>
        <input className="input !py-2.5 mb-4" placeholder="Masalan: Grammatika kitobi" value={itemName} onChange={(e) => setItemName(e.target.value)} />
        <label className="label">Narx (coin)</label>
        <input type="number" className="input !py-2.5 mb-4" onWheel={(e) => e.target.blur()} value={price} onChange={(e) => setPrice(e.target.value)} />
        <label className="label">Tavsif (ixtiyoriy)</label>
        <input className="input !py-2.5" value={description} onChange={(e) => setDescription(e.target.value)} />
        {err && <p className="text-xs text-red-500 mt-2">{err}</p>}
      </Modal>
    </div>
  );
}
