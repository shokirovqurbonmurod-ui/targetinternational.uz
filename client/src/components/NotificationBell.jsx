import { useEffect, useRef, useState } from 'react';
import { Bell, Check, ShieldAlert, Info, AlertTriangle, CheckCheck } from 'lucide-react';
import { api } from '../lib/api.js';
import { isAdmin } from '../config/roles.js';

const TYPE_ICON = { security: ShieldAlert, warning: AlertTriangle, info: Info };
const TYPE_TILE = {
  security: 'from-red-400/20 to-red-100/10 text-red-500',
  warning: 'from-amber-400/20 to-amber-100/10 text-amber-500',
  info: 'from-blue-400/20 to-blue-100/10 text-blue-500',
};

export default function NotificationBell({ role }) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState([]);
  const boxRef = useRef(null);

  async function load() {
    try {
      const all = await api.get('/notifications?limit=50');
      const mine = (all || []).filter((n) => !n.target_role || n.target_role === 'all' || n.target_role === role || isAdmin(role));
      setRows(mine);
    } catch { setRows([]); }
  }

  useEffect(() => {
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    function onClickOutside(e) { if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false); }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  async function markRead(n) {
    if (n.read) return;
    setRows((prev) => prev.map((r) => (r.id === n.id ? { ...r, read: 1 } : r)));
    await api.put(`/notifications/${n.id}`, { read: 1 }).catch(() => {});
  }

  async function markAllRead() {
    const unread = rows.filter((r) => !r.read);
    setRows((prev) => prev.map((r) => ({ ...r, read: 1 })));
    await Promise.all(unread.map((r) => api.put(`/notifications/${r.id}`, { read: 1 }).catch(() => {})));
  }

  const unreadCount = rows.filter((r) => !r.read).length;

  return (
    <div className="relative" ref={boxRef}>
      <button onClick={() => setOpen((o) => !o)} className={`relative grid place-items-center w-9 h-9 rounded-full transition-all duration-200 ${open ? 'bg-navy-50 text-navy-700' : 'hover:bg-navy-50 text-navy-500'}`}>
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[17px] h-[17px] px-1 grid place-items-center rounded-full bg-gradient-to-r from-red-400 to-rose-500 border-2 border-white text-white text-[9px] font-extrabold shadow-md">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-11 w-[340px] max-w-[92vw] card !rounded-3xl !shadow-2xl overflow-hidden z-20 animate-fade">
          <div className="flex items-center justify-between px-4 py-3.5 border-b border-navy-100 bg-navy-50/50">
            <div className="flex items-center gap-2.5">
              <span className="grid place-items-center w-8 h-8 rounded-xl bg-gradient-to-br from-gold-400/20 to-gold-600/10 text-gold-600">
                <Bell size={15} />
              </span>
              <span className="font-display text-[15px] text-navy-800">Bildirishnomalar</span>
              {unreadCount > 0 && (
                <span className="chip !text-[10px] bg-red-50 text-red-500">{unreadCount} yangi</span>
              )}
            </div>
            {unreadCount > 0 && (
              <button onClick={markAllRead} className="flex items-center gap-1 text-[11px] text-gold-600 hover:text-gold-700 hover:underline font-bold transition">
                <CheckCheck size={12} /> Hammasi o'qildi
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {rows.length === 0 ? (
              <div className="px-4 py-10 text-center">
                <div className="grid place-items-center w-14 h-14 rounded-2xl bg-navy-50 text-navy-300 mx-auto mb-3"><Bell size={22} /></div>
                <div className="text-sm font-semibold text-navy-500">Hozircha bildirishnoma yo'q</div>
                <div className="text-xs text-navy-300 mt-1">Yangi xabarlar shu yerda paydo bo'ladi</div>
              </div>
            ) : (
              rows.map((n) => {
                const Icon = TYPE_ICON[n.type] || Info;
                return (
                  <div key={n.id} onClick={() => markRead(n)}
                    className={`relative flex items-start gap-3 px-4 py-3 border-b border-navy-50 last:border-0 cursor-pointer transition group ${n.read ? 'opacity-55' : 'bg-gold/[.04] hover:bg-gold/[.08]'}`}>
                    {!n.read && <span className="absolute left-0 top-3 bottom-3 w-[3px] rounded-r-full bg-gradient-to-b from-gold-400 to-gold-600" />}
                    <span className={`grid place-items-center w-9 h-9 rounded-xl bg-gradient-to-br shrink-0 ${TYPE_TILE[n.type] || 'from-navy-100 to-navy-50 text-navy-400'}`}>
                      <Icon size={16} />
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-bold text-navy-800 truncate group-hover:text-navy-900">{n.title}</div>
                      {n.body && <div className="text-xs text-navy-500 mt-0.5 line-clamp-2">{n.body}</div>}
                      <div className="text-[10px] font-semibold text-navy-300 mt-1 tnum">{n.date}</div>
                    </div>
                    {!n.read && <span className="w-2 h-2 rounded-full bg-gold-500 shrink-0 mt-1.5 animate-pulse-gold" />}
                    {n.read && <Check size={13} className="text-emerald-400 shrink-0 mt-1" />}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
