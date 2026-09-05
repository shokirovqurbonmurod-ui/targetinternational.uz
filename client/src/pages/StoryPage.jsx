import { useEffect, useState } from 'react';
import { Camera, Heart, Send } from 'lucide-react';
import { api } from '../lib/api.js';
import { PageHeader, Spinner, Empty } from '../components/ui.jsx';
import { useAuth } from '../auth/AuthContext.jsx';

export default function StoryPage() {
  const { user } = useAuth();
  const isStudent = user.role === 'student';
  const [rows, setRows] = useState(null);
  const [likes, setLikes] = useState([]);
  const [caption, setCaption] = useState('');
  const [posting, setPosting] = useState(false);
  const [busyId, setBusyId] = useState(null);

  async function load() {
    const [p, l] = await Promise.all([
      api.get('/story_posts?limit=200').catch(() => []),
      api.get('/post_likes?limit=2000').catch(() => []),
    ]);
    setRows((p || []).sort((a, b) => (b.date || '').localeCompare(a.date || '')));
    setLikes(l || []);
  }
  useEffect(() => { load(); }, []);

  function likesFor(postId) { return likes.filter((l) => String(l.post_id) === String(postId)); }
  function iLiked(postId) { return likesFor(postId).some((l) => l.student === user.full_name); }

  async function post() {
    if (!caption.trim()) return;
    setPosting(true);
    try {
      await api.post('/story/post', { caption });
      setCaption(''); await load();
    } catch (e) { alert(e.message); }
    setPosting(false);
  }

  async function toggleLike(row) {
    setBusyId(row.id);
    try { await api.post('/story/like', { post_id: row.id }); await load(); }
    catch (e) { alert(e.message); }
    setBusyId(null);
  }

  if (rows === null) return <Spinner />;

  return (
    <div className="max-w-xl mx-auto">
      <PageHeader icon={Camera} title="Story" subtitle="O'quvchilar kunlik yangiliklari" />

      {isStudent && (
        <div className="card p-4 mb-6 flex gap-2">
          <input className="input !py-2.5 flex-1" placeholder="Bugun nima bo'ldi?" value={caption} onChange={(e) => setCaption(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && post()} />
          <button onClick={post} disabled={posting} className="btn-gold !px-4"><Send size={15} /></button>
        </div>
      )}

      {rows.length === 0 ? <Empty icon={Camera} title="Hali story yo'q" /> : (
        <div className="space-y-3">
          {rows.map((r) => {
            const liked = iLiked(r.id);
            return (
              <div key={r.id} className="card p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="grid place-items-center w-8 h-8 rounded-lg bg-gradient-to-br from-navy-600 to-navy-800 text-white text-xs font-bold shrink-0">{r.student?.[0]}</div>
                  <div>
                    <div className="text-sm font-semibold text-navy-800">{r.student}</div>
                    <div className="text-[10px] text-navy-400">{r.date}</div>
                  </div>
                </div>
                <p className="text-sm text-navy-700 mb-3">{r.caption}</p>
                <button onClick={() => toggleLike(r)} disabled={busyId === r.id}
                  className={`flex items-center gap-1.5 text-xs font-bold transition ${liked ? 'text-rose-500' : 'text-navy-400 hover:text-rose-400'}`}>
                  <Heart size={15} fill={liked ? 'currentColor' : 'none'} /> {likesFor(r.id).length}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
