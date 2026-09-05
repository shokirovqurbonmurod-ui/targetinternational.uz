import { useEffect, useState } from 'react';
import { Mic, Star, Send, Coins } from 'lucide-react';
import { api } from '../lib/api.js';
import { PageHeader, Spinner, Empty } from '../components/ui.jsx';
import { useAuth } from '../auth/AuthContext.jsx';

export default function KaraokePage() {
  const { user } = useAuth();
  const canManage = !['student', 'parent'].includes(user.role);
  const isStudent = user.role === 'student';
  const [rows, setRows] = useState(null);
  const [song, setSong] = useState('');
  const [posting, setPosting] = useState(false);
  const [rating, setRating] = useState(null);

  async function load() { setRows((await api.get('/karaoke?limit=500').catch(() => [])).sort((a, b) => (b.date || '').localeCompare(a.date || ''))); }
  useEffect(() => { load(); }, []);

  async function perform() {
    if (!song.trim()) return;
    setPosting(true);
    try { await api.post('/karaoke/perform', { song }); setSong(''); await load(); }
    catch (e) { alert(e.message); }
    setPosting(false);
  }

  async function rate(row, score) {
    setRating(row.id);
    try {
      await api.put(`/karaoke/${row.id}`, { score });
      if (score > 0) {
        const students = await api.get('/students').catch(() => []);
        const s = students.find((x) => x.full_name === row.student);
        if (s) await api.post('/coins/give', { student_id: s.id, amount: score * 4, reason: `Karaoke: ${row.song}` }).catch(() => {});
      }
      await load();
    } catch (e) { alert(e.message); }
    setRating(null);
  }

  if (rows === null) return <Spinner />;

  return (
    <div className="max-w-xl mx-auto">
      <PageHeader icon={Mic} title="Karaoke" subtitle="Qo'shiq tanlang va ijro eting" />

      {isStudent && (
        <div className="card p-4 mb-6 flex gap-2">
          <input className="input !py-2.5 flex-1" placeholder="Qo'shiq nomi..." value={song} onChange={(e) => setSong(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && perform()} />
          <button onClick={perform} disabled={posting} className="btn-gold !px-4"><Send size={15} /></button>
        </div>
      )}

      {rows.length === 0 ? <Empty icon={Mic} title="Hali ijro yo'q" /> : (
        <div className="space-y-2">
          {rows.map((r) => (
            <div key={r.id} className="card p-4 flex items-center gap-3">
              <div className="grid place-items-center w-9 h-9 rounded-lg bg-gradient-to-br from-navy-600 to-navy-800 text-white text-xs font-bold shrink-0">{r.student?.[0]}</div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-navy-800 truncate">{r.song}</div>
                <div className="text-[11px] text-navy-400">{r.student} · {r.date}</div>
              </div>
              {canManage ? (
                <div className="flex items-center gap-0.5 shrink-0">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button key={n} onClick={() => rate(r, n)} disabled={rating === r.id}>
                      <Star size={16} className={n <= (r.score || 0) ? 'text-gold-500 fill-gold-500' : 'text-navy-200'} />
                    </button>
                  ))}
                </div>
              ) : (
                Number(r.score) > 0 ? (
                  <span className="flex items-center gap-1 text-xs font-bold text-gold-600 shrink-0">
                    {[1, 2, 3, 4, 5].map((n) => <Star key={n} size={12} className={n <= r.score ? 'text-gold-500 fill-gold-500' : 'text-navy-200'} />)}
                  </span>
                ) : <span className="text-[11px] text-navy-400 shrink-0">Baholanmagan</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
