import { useEffect, useState } from 'react';
import { NotebookPen, Plus, Trash2, Pencil, Lock } from 'lucide-react';
import { api } from '../lib/api.js';
import { PageHeader, Spinner, Empty, Modal } from '../components/ui.jsx';

const MOODS = ['😊', '😐', '😔', '😡', '🤩', '😴'];

export default function DiaryPage() {
  const [rows, setRows] = useState(null);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [mood, setMood] = useState(MOODS[0]);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  async function load() {
    setRows(await api.get('/diary').catch(() => []));
  }
  useEffect(() => { load(); }, []);

  function openAdd() { setEditing(null); setTitle(''); setContent(''); setMood(MOODS[0]); setErr(''); setModal(true); }
  function openEdit(row) { setEditing(row); setTitle(row.title || ''); setContent(row.content); setMood(row.mood || MOODS[0]); setErr(''); setModal(true); }

  async function save() {
    setErr('');
    if (!content.trim()) { setErr('Matn kiriting.'); return; }
    setBusy(true);
    try {
      if (editing) await api.put(`/diary/${editing.id}`, { title, content, mood });
      else await api.post('/diary', { title, content, mood });
      setModal(false);
      await load();
    } catch (e) { setErr(e.message); }
    setBusy(false);
  }

  async function remove(id) {
    if (!confirm("Yozuvni o'chirasizmi?")) return;
    await api.del(`/diary/${id}`).catch((e) => alert(e.message));
    await load();
  }

  if (rows === null) return <Spinner />;

  return (
    <div>
      <PageHeader icon={NotebookPen} title="Shaxsiy kundalik" subtitle="Faqat siz ko'radigan shaxsiy yozuvlar"
        actions={<button className="btn-gold" onClick={openAdd}><Plus size={16} /> Yangi yozuv</button>} />

      <p className="text-[11px] text-navy-400 flex items-center gap-1.5 mb-4"><Lock size={12} /> Bu yerdagi yozuvlarni faqat siz ko'rasiz — hatto administrator ham ko'ra olmaydi.</p>

      {rows.length === 0 ? <Empty icon={NotebookPen} title="Hali yozuv yo'q" hint="Birinchi kundalik yozuvingizni qo'shing." /> : (
        <div className="grid md:grid-cols-2 gap-4">
          {rows.map((row) => (
            <div key={row.id} className="card p-5">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{row.mood || '📝'}</span>
                  <div>
                    <div className="font-display text-base text-navy-800">{row.title || 'Sarlavhasiz'}</div>
                    <div className="text-[11px] text-navy-400">{row.entry_date}</div>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => openEdit(row)} className="text-navy-300 hover:text-gold-600"><Pencil size={14} /></button>
                  <button onClick={() => remove(row.id)} className="text-navy-300 hover:text-red-500"><Trash2 size={14} /></button>
                </div>
              </div>
              <p className="text-sm text-navy-600 whitespace-pre-wrap">{row.content}</p>
            </div>
          ))}
        </div>
      )}

      <Modal open={modal} title={editing ? 'Yozuvni tahrirlash' : 'Yangi yozuv'} onClose={() => setModal(false)}
        footer={<>
          <button className="btn-ghost" onClick={() => setModal(false)}>Bekor qilish</button>
          <button className="btn-gold" onClick={save} disabled={busy}>{busy ? 'Saqlanmoqda...' : 'Saqlash'}</button>
        </>}>
        <label className="label">Kayfiyat</label>
        <div className="flex gap-2 mb-4">
          {MOODS.map((m) => (
            <button key={m} onClick={() => setMood(m)} className={`text-2xl rounded-xl border-2 px-3 py-1.5 ${mood === m ? 'border-gold bg-gold/10' : 'border-navy-100'}`}>{m}</button>
          ))}
        </div>
        <label className="label">Sarlavha (ixtiyoriy)</label>
        <input className="input !py-2.5 mb-4" value={title} onChange={(e) => setTitle(e.target.value)} />
        <label className="label">Matn</label>
        <textarea className="input !py-2.5 min-h-[140px]" value={content} onChange={(e) => setContent(e.target.value)} />
        {err && <p className="text-xs text-red-500 mt-2">{err}</p>}
      </Modal>
    </div>
  );
}
