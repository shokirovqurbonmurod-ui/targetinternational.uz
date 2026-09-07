import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, GraduationCap, Boxes, Wallet, CreditCard, UserSearch, Sparkles, ArrowRight, ArrowUpRight, Trophy, Megaphone, CreditCard as CreditCardIcon } from 'lucide-react';
import { api } from '../lib/api.js';
import { Spinner } from '../components/ui.jsx';
import { useAuth } from '../auth/AuthContext.jsx';
import { compactMoney, money, statusStyle } from '../lib/format.js';

const TONES = [
  ['from-gold-400/25 to-gold-100/10', 'text-gold-600', 'ring-gold/20'],
  ['from-blue-400/25 to-blue-100/10', 'text-blue-600', 'ring-blue-200/60'],
  ['from-emerald-400/25 to-emerald-100/10', 'text-emerald-600', 'ring-emerald-200/60'],
  ['from-violet-400/25 to-violet-100/10', 'text-violet-600', 'ring-violet-200/60'],
  ['from-rose-400/25 to-rose-100/10', 'text-rose-600', 'ring-rose-200/60'],
  ['from-cyan-400/25 to-cyan-100/10', 'text-cyan-600', 'ring-cyan-200/60'],
];

function SectionTitle({ icon: Icon, title, extra, tone = 'gold' }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-3">
        <span className={`icon-tile w-9 h-9 bg-gradient-to-br ring-1 ${tone === 'gold' ? 'from-gold-400/25 to-gold-100/10 text-gold-600 ring-gold/20' : 'from-blue-400/25 to-blue-100/10 text-blue-600 ring-blue-200/60'}`}>
          <Icon size={16} />
        </span>
        <h3 className="font-display text-lg text-navy-800">{title}</h3>
      </div>
      {extra}
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [d, setD] = useState(null);
  const [board, setBoard] = useState([]);
  const [ann, setAnn] = useState([]);
  const [pay, setPay] = useState([]);

  useEffect(() => {
    Promise.all([
      api.get('/stats').catch(() => null),
      api.get('/leaderboard').catch(() => []),
      api.get('/announcements').catch(() => []),
      api.get('/payments').catch(() => []),
    ]).then(([s, b, a, p]) => { setD(s); setBoard(b||[]); setAnn(a||[]); setPay(p||[]); });
  }, []);

  if (!d) return <Spinner />;

  const cards = [
    { icon: Users, label: "O'quvchilar", value: d.students, hint: `${d.activeStudents} faol` },
    { icon: GraduationCap, label: "O'qituvchilar", value: d.teachers },
    { icon: Boxes, label: 'Guruhlar', value: d.groups },
    { icon: Wallet, label: 'Daromad', value: compactMoney(d.revenue) },
    { icon: CreditCard, label: "Kutilayotgan", value: d.pendingPayments },
    { icon: UserSearch, label: 'Lidlar', value: d.leads },
  ];

  // Student o'z paneli
  if (user.role === 'student') return <StudentPanel user={user} />;

  const firstName = user.full_name.split(' ')[0];
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Xayrli tong' : hour < 18 ? 'Xayrli kun' : 'Xayrli kech';

  return (
    <div className="max-w-[1400px] mx-auto">
      {/* Hero greeting */}
      <div className="hero-premium card p-6 lg:p-8 mb-6 bg-gradient-to-br from-navy-700 via-navy-800 to-navy-900 border-0 rounded-[30px] shadow-[0_24px_60px_-24px_rgba(13,21,34,.5)]">
        <div className="absolute -right-14 -top-16 w-72 h-72 rounded-full border border-white/10 animate-float" />
        <div className="absolute -right-4 -top-6 w-44 h-44 rounded-full border border-gold/20 animate-float" style={{ animationDelay: '-2.5s' }} />

        <div className="relative flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="icon-tile w-14 h-14 bg-gradient-to-br from-gold-300 to-gold-600 text-white ring-4 ring-white/10 shadow-lg shadow-gold/30">
              <Sparkles size={26} />
            </div>
            <div>
              <div className="text-[10px] font-extrabold uppercase tracking-[.18em] text-gold-300/90 mb-1">Command Center</div>
              <h1 className="font-display text-2xl lg:text-[28px] text-white leading-tight">{greeting}, {firstName}! 👋</h1>
              <p className="text-navy-200/90 text-sm mt-1 max-w-xl">Target International School platformangizga xush kelibsiz. Barcha jarayonlaringiz bir joyda — sodda va tezkor.</p>
            </div>
          </div>
          <button onClick={() => navigate('/app/ai-assistant')} className="btn-gold !rounded-2xl shrink-0">
            <Sparkles size={16} /> AI yordamchi
            <ArrowUpRight size={15} />
          </button>
        </div>

        <div className="relative grid grid-cols-2 md:grid-cols-4 gap-2.5 mt-6">
          {[
            ['HOZIRGI BO\'LIM', 'Command Center', 'from-gold-400/20 to-gold-600/5'],
            ['SO\'NGI YANGILIK', 'AI yordamchi va CRM', 'from-blue-400/20 to-blue-600/5'],
            ['DAVOM ETISH', 'Monitoring va analytics', 'from-emerald-400/20 to-emerald-600/5'],
            ['YORDAM', 'Tezkor chat', 'from-violet-400/20 to-violet-600/5'],
          ].map(([k, v, grad]) => (
            <div key={k} className={`rounded-2xl bg-gradient-to-br ${grad} border border-white/10 px-3.5 py-3 backdrop-blur hover:bg-white/10 transition group cursor-default`}>
              <div className="text-[9px] font-extrabold uppercase tracking-[.14em] text-navy-200/70">{k}</div>
              <div className="text-sm font-bold text-white mt-1 truncate flex items-center gap-1.5">
                {v} <ArrowRight size={12} className="opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
        {cards.map((c, i) => {
          const [gradient, textColor, ring] = TONES[i % TONES.length];
          return (
            <div key={c.label} className="card stat-glow card-hover group p-5" style={{ animationDelay: `${i * 60}ms` }}>
              <div className="flex items-center justify-between mb-3">
                <div className={`icon-tile w-11 h-11 bg-gradient-to-br ring-1 ${gradient} ${ring} group-hover:scale-110 group-hover:-rotate-3 transition-transform duration-200 ease-ios`}>
                  <c.icon size={20} strokeWidth={2.1} className={textColor} />
                </div>
                {c.hint && <span className="chip !text-[11px] bg-emerald-50 text-emerald-600 border border-emerald-100 shadow-sm">{c.hint}</span>}
              </div>
              <div className="font-display text-2xl text-navy-800 tnum leading-none">{c.value}</div>
              <div className="text-[13px] text-navy-400 font-medium mt-1.5">{c.label}</div>
            </div>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Leaderboard */}
        <div className="lg:col-span-2 card p-5 lg:p-6">
          <SectionTitle icon={Trophy} title="TOP o'quvchilar"
            extra={<span className="chip bg-gold/10 text-gold-700 border border-gold/20">⚡ Ball bo'yicha</span>} />
          <div className="space-y-1.5">
            {board.slice(0, 7).map((s, i) => (
              <div key={s.id} className="flex items-center gap-3.5 rounded-2xl px-3.5 py-3 hover:bg-navy-50/70 border border-transparent hover:border-navy-100 transition-all animate-slide group" style={{ animationDelay: `${i * 50}ms` }}>
                <div className={`grid place-items-center w-9 h-9 rounded-xl text-sm font-extrabold shrink-0 transition-transform group-hover:scale-110 ${
                  i === 0 ? 'bg-gradient-to-br from-amber-300 to-amber-500 text-white shadow-md shadow-amber-200'
                  : i === 1 ? 'bg-gradient-to-br from-slate-300 to-slate-400 text-white shadow-sm'
                  : i === 2 ? 'bg-gradient-to-br from-orange-300 to-orange-400 text-white shadow-sm'
                  : 'bg-navy-100 text-navy-500'}`}>{i + 1}</div>
                <div className="grid place-items-center w-10 h-10 rounded-full bg-gradient-to-br from-navy-500 to-navy-800 text-white text-sm font-bold shadow-sm ring-2 ring-white shrink-0">
                  {s.full_name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-navy-800 truncate">{s.full_name}</div>
                  <div className="text-xs text-navy-400 font-medium mt-0.5 truncate">{s.group_name}</div>
                </div>
                <span className="chip bg-gold/10 text-gold-700 border border-gold/20 hidden sm:inline-flex">{s.level}</span>
                <div className="text-sm font-extrabold text-navy-700 w-16 text-right tnum">⚡ {s.points}</div>
              </div>
            ))}
            {board.length === 0 && <div className="text-sm text-navy-400 text-center py-8">Ma'lumot yo'q</div>}
          </div>
        </div>

        {/* Announcements */}
        <div className="card p-5 lg:p-6">
          <SectionTitle icon={Megaphone} title="E'lonlar"
            extra={<span className="text-[11px] font-bold text-navy-300">{ann.length} ta</span>} />
          <div className="space-y-3">
            {ann.slice(0, 4).map((a, i) => (
              <div key={a.id} className={`relative rounded-2xl px-4 py-3.5 border overflow-hidden animate-fade ${
                a.type === 'warn'
                  ? 'border-amber-200/70 bg-gradient-to-r from-amber-50 to-amber-50/30'
                  : 'border-navy-100/70 bg-gradient-to-r from-navy-50/60 to-white'}`}
                style={{ animationDelay: `${i * 80}ms` }}>
                <span className={`absolute left-0 top-0 bottom-0 w-1 ${a.type === 'warn' ? 'bg-gradient-to-b from-amber-400 to-amber-500' : 'bg-gradient-to-b from-gold-400 to-gold-600'}`} />
                <div className="text-sm font-bold text-navy-800 line-clamp-1">{a.title}</div>
                <div className="text-xs text-navy-500 mt-1 line-clamp-2 leading-relaxed">{a.body}</div>
                <div className="text-[10px] font-semibold text-navy-300 mt-2 tnum">{a.author} · {a.date}</div>
              </div>
            ))}
            {ann.length === 0 && <div className="text-sm text-navy-400 text-center py-8">E'lonlar yo'q</div>}
          </div>
        </div>
      </div>

      {/* Recent payments */}
      <div className="card p-5 lg:p-6 mt-6">
        <SectionTitle icon={CreditCardIcon} title="So'nggi to'lovlar"
          extra={<button onClick={() => navigate('/app/buxgalteriya')} className="inline-flex items-center gap-1 text-xs font-bold text-gold-600 hover:text-gold-700 hover:gap-2 transition-all">Barchasi <ArrowRight size={13} /></button>} />
        <div className="table-wrap">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="px-4 py-3.5 text-left first:pl-4">O'quvchi</th>
                <th className="px-4 py-3.5 text-left">Guruh</th>
                <th className="px-4 py-3.5 text-left">Summa</th>
                <th className="px-4 py-3.5 text-left">Usul</th>
                <th className="px-4 py-3.5 text-left">Holat</th>
              </tr>
            </thead>
            <tbody>
              {pay.slice(0, 8).map((p, i) => (
                <tr key={p.id} className="group">
                  <td className="px-4 py-3.5 font-semibold text-navy-700">
                    <div className="flex items-center gap-2.5">
                      <span className="grid place-items-center w-7 h-7 rounded-lg bg-gradient-to-br from-navy-100 to-navy-50 text-navy-500 text-[11px] font-bold shrink-0 group-hover:from-gold-100 group-hover:to-gold-50 transition-all">
                        {p.student?.[0]}
                      </span>
                      {p.student}
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-navy-500">{p.group_name}</td>
                  <td className="px-4 py-3.5 font-extrabold text-navy-800 tnum">{money(p.amount)}</td>
                  <td className="px-4 py-3.5"><span className="chip bg-navy-50 text-navy-600 border border-navy-100/70">{p.method || '—'}</span></td>
                  <td className="px-4 py-3.5"><span className={`chip ${statusStyle(p.status)}`}>{p.status === 'paid' ? "✓ To'langan" : '⏳ Kutilmoqda'}</span></td>
                </tr>
              ))}
              {pay.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-navy-400">To'lovlar yo'q</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}


function StudentPanel({ user }) {
  const [st, setSt] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [lessons, setLessons] = useState([]);

  useEffect(() => {
    Promise.all([
      api.get('/students').catch(() => []),
      api.get('/student_timeline').catch(() => []),
      api.get('/lessons').catch(() => []),
    ]).then(([students, tl, ls]) => {
      const me = (students || []).find((s) => s.full_name === user.full_name);
      setSt(me || { full_name: user.full_name, coins: 0, points: 0, progress: 0, streak: 0, level: '—', group_name: '—' });
      setTimeline((tl || []).filter((t) => t.student === user.full_name).slice(-10).reverse());
      setLessons((ls || []).filter((l) => me && l.group_name === me.group_name).slice(0, 5));
    });
  }, [user]);

  if (!st) return <Spinner />;

  return (
    <div>
      {/* Hero */}
      <div className="hero-premium card p-6 lg:p-8 mb-6 bg-gradient-to-br from-navy-700 via-navy-800 to-navy-900 border-0 rounded-[30px] shadow-[0_24px_60px_-24px_rgba(13,21,34,.5)]">
        <div className="absolute -right-14 -top-16 w-72 h-72 rounded-full border border-white/10 animate-float" />
        <div className="relative flex items-center gap-4 flex-wrap">
          <div className="relative">
            <div className="grid place-items-center w-16 h-16 rounded-2xl bg-gradient-to-br from-gold-300 via-gold-400 to-gold-600 text-white text-2xl font-extrabold shadow-lg shadow-gold/30 ring-4 ring-white/10">
              {st.full_name[0]}
            </div>
            <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-400 border-[3px] border-navy-800" />
          </div>
          <div>
            <div className="text-[10px] font-extrabold uppercase tracking-[.18em] text-gold-300/90 mb-1">O'quvchi paneli</div>
            <h1 className="font-display text-2xl lg:text-[27px] text-white leading-tight">Salom, {st.full_name.split(' ')[0]}! 👋</h1>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <span className="chip bg-white/10 text-gold-200 border border-white/10">{st.group_name}</span>
              <span className="chip bg-white/10 text-white border border-white/10">{st.level}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Statistika */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="card stat-glow card-hover p-5 text-center">
          <div className="icon-tile w-12 h-12 bg-gradient-to-br from-gold-400/25 to-gold-100/10 text-2xl mb-2 mx-auto">🪙</div>
          <div className="font-display text-3xl text-gold-600 tnum">{(st.coins || 0).toLocaleString()}</div>
          <div className="text-sm text-navy-400 font-medium mt-1">Coinlar</div>
        </div>
        <div className="card stat-glow card-hover p-5 text-center">
          <div className="icon-tile w-12 h-12 bg-gradient-to-br from-blue-400/25 to-blue-100/10 text-2xl mb-2 mx-auto">⚡</div>
          <div className="font-display text-3xl text-navy-800 tnum">{(st.points || 0).toLocaleString()}</div>
          <div className="text-sm text-navy-400 font-medium mt-1">Ballar</div>
        </div>
        <div className="card stat-glow card-hover p-5 text-center">
          <div className="icon-tile w-12 h-12 bg-gradient-to-br from-orange-400/25 to-orange-100/10 text-2xl mb-2 mx-auto">🔥</div>
          <div className="font-display text-3xl text-orange-600 tnum">{st.streak || 0}</div>
          <div className="text-sm text-navy-400 font-medium mt-1">Streak (kun)</div>
        </div>
        <div className="card stat-glow card-hover p-5 text-center">
          <div className="icon-tile w-12 h-12 bg-gradient-to-br from-emerald-400/25 to-emerald-100/10 text-2xl mb-2 mx-auto">📈</div>
          <div className="font-display text-3xl text-emerald-600 tnum">{st.progress || 0}%</div>
          <div className="text-sm text-navy-400 font-medium mt-1">Progress</div>
          <div className="mt-2.5 h-2.5 rounded-full bg-navy-100 overflow-hidden">
            <div className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full shadow-inner transition-all duration-700" style={{ width: (st.progress || 0) + '%' }} />
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Darslar */}
        <div className="card p-5 lg:p-6">
          <SectionTitle icon={GraduationCap} title="Keyingi darslar" extra={<ArrowRight size={15} className="text-navy-300" />} />
          {lessons.length === 0 ? (
            <p className="text-sm text-navy-400 text-center py-8">Hozircha darslar yo'q</p>
          ) : (
            <div className="space-y-2.5">
              {lessons.map((l) => (
                <div key={l.id} className="flex items-center gap-3.5 rounded-2xl bg-navy-50/60 border border-navy-100/50 px-4 py-3.5 hover:border-gold/30 hover:bg-gold/[.04] transition-all group">
                  <span className="grid place-items-center w-10 h-10 rounded-xl bg-gradient-to-br from-blue-400/20 to-blue-100/10 text-lg shrink-0 group-hover:scale-110 transition-transform">{l.subject?.[0] || '📘'}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-navy-800 truncate">{l.title}</div>
                    <div className="text-xs text-navy-400 font-medium mt-0.5 tnum">{l.date} · {l.teacher}</div>
                  </div>
                  {l.video_url && <a href={l.video_url} target="_blank" rel="noreferrer" className="chip bg-violet-100 text-violet-700">📹 Video</a>}
                  {l.coin_reward > 0 && <span className="chip bg-gold/10 text-gold-700 border border-gold/20">🪙 +{l.coin_reward}</span>}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Timeline */}
        <div className="card p-5 lg:p-6">
          <SectionTitle icon={Trophy} title="Mening tarixim" />
          {timeline.length === 0 ? (
            <p className="text-sm text-navy-400 text-center py-8">Hozircha tarix yo'q</p>
          ) : (
            <div className="space-y-4 relative before:absolute before:left-[5px] before:top-2 before:bottom-2 before:w-px before:bg-navy-100">
              {timeline.map((t) => {
                const typeColor = {
                  enrollment: 'bg-blue-100 text-blue-700',
                  exam: 'bg-violet-100 text-violet-700',
                  coin: 'bg-gold/10 text-gold-700',
                  level_up: 'bg-emerald-100 text-emerald-700',
                  certificate: 'bg-amber-100 text-amber-700',
                  achievement: 'bg-rose-100 text-rose-700',
                };
                return (
                  <div key={t.id} className="relative flex items-start gap-3.5 pl-1">
                    <div className="relative z-10 w-3 h-3 rounded-full bg-gradient-to-br from-gold-300 to-gold-600 ring-4 ring-white mt-1.5 shrink-0 shadow-sm" />
                    <div className="flex-1 rounded-2xl px-4 py-3 border border-navy-100/60 bg-navy-50/40 hover:bg-navy-50/80 transition">
                      <div className="text-sm font-bold text-navy-800">{t.event}</div>
                      <div className="text-xs text-navy-500 mt-0.5">{t.detail}</div>
                      <div className="flex items-center gap-2 mt-2">
                        <span className={`chip !text-[10px] ${typeColor[t.type] || 'bg-navy-100 text-navy-600'}`}>{t.type}</span>
                        <span className="text-[11px] text-navy-300 font-semibold tnum">{t.date}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
