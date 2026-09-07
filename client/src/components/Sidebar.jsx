import { useEffect, useMemo, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Search, X, ChevronDown, LogOut, Settings } from 'lucide-react';
import { menuForRole } from '../config/menu.js';
import { emojiForItem } from '../config/menuEmojis.js';
import { useAuth } from '../auth/AuthContext.jsx';
import { roleLabel, roleColor } from '../config/roles.js';

const COLLAPSE_KEY = 'iso_sidebar_collapsed';

function BrandLogo({ small = false }) {
  return (
    <div className={`relative shrink-0 ${small ? 'w-9 h-9 border-[2px]' : 'w-11 h-11 border-[3px]'} rounded-full border-navy-700 bg-navy-900 shadow-inner`}>
      <div className={`absolute ${small ? 'inset-[18%]' : 'inset-[18%]'} rounded-full border border-white/50`} />
      <div className="absolute inset-0 flex items-center justify-center"><div className="w-[2px] h-full bg-red-500/90" /></div>
      <div className="absolute inset-0 flex items-center justify-center"><div className="h-[2px] w-full bg-red-500/90" /></div>
      <div className={`absolute ${small ? 'inset-[25%] border-[2px]' : 'inset-[25%] border-[2px]'} rounded-full border-red-500/80`} />
    </div>
  );
}

export default function Sidebar({ onNavigate }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const groups = menuForRole(user.role);

  const currentKey = location.pathname.split('/')[2];
  const activeGroup = groups.find((g) => g.items.some((it) => it.key === currentKey))?.group || null;

  // Birinchi marta kirganda: menyu juda ko'p bo'lgani uchun barcha guruhlar yopiq holatda boshlanadi,
  // faqat joriy sahifa turgan guruh ochiq. Foydalanuvchi keyin qaysi guruhni ochib/yopganini
  // localStorage'da eslab qoladi.
  const [collapsed, setCollapsed] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(COLLAPSE_KEY) || '{}');
      if (Object.keys(saved).length) return saved;
    } catch { /* ignore */ }
    const initial = {};
    for (const g of groups) initial[g.group] = g.group !== activeGroup;
    return initial;
  });

  // Faol sahifa turgan guruh doim ochiq bo'lsin — foydalanuvchi qayerdaligini yo'qotib qo'ymasin.
  useEffect(() => {
    if (activeGroup && collapsed[activeGroup]) {
      setCollapsed((prev) => { const next = { ...prev, [activeGroup]: false }; persist(next); return next; });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeGroup]);

  function persist(next) {
    try { localStorage.setItem(COLLAPSE_KEY, JSON.stringify(next)); } catch { /* ignore */ }
  }

  function toggleGroup(name) {
    setCollapsed((prev) => { const next = { ...prev, [name]: !prev[name] }; persist(next); return next; });
  }

  const filteredGroups = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return groups;
    return groups
      .map((g) => ({ ...g, items: g.items.filter((it) => it.label.toLowerCase().includes(needle)) }))
      .filter((g) => g.items.length > 0);
  }, [groups, q]);

  const searching = q.trim().length > 0;

  function doLogout(e) {
    e?.preventDefault?.();
    logout();
    navigate('/login');
  }

  return (
    <aside className="side-shell w-[276px] shrink-0 h-full text-navy-100 flex flex-col border-r border-white/5">
      {/* Brand */}
      <div className="flex items-center gap-3 px-4 h-[68px] border-b border-white/[.07]">
        <div className="relative">
          <BrandLogo />
          <span className="absolute -right-1 -bottom-1 grid place-items-center w-4 h-4 rounded-full bg-gradient-to-br from-gold-300 to-gold-600 text-[7px] font-black text-navy-900 shadow ring-2 ring-[#0C1424]">
            L
          </span>
        </div>
        <div className="leading-none flex-1">
          <div className="font-black tracking-[-0.06em] text-[18px]">
            <span className="text-red-500">TAR</span><span className="text-white">GET</span>
          </div>
          <div className="mt-1 text-[8px] text-navy-300/80 font-bold uppercase tracking-[0.18em]">
            International School <span className="text-gold-300/90">· LMS</span>
          </div>
        </div>
      </div>

      {/* Menu qidiruvi */}
      <div className="px-4 pt-4">
        <div className="group relative">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-navy-300/60 group-focus-within:text-gold-300 transition-colors" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Menyu bo'yicha qidirish..."
            className="w-full rounded-2xl bg-white/[.06] border border-white/[.07] pl-9 pr-9 py-2.5 text-[13px] text-navy-100 placeholder:text-navy-300/45 outline-none transition-all duration-200 ease-ios focus:bg-white/[.1] focus:border-gold/40 focus:ring-4 focus:ring-gold/10"
          />
          {q ? (
            <button onClick={() => setQ('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 grid place-items-center w-6 h-6 rounded-full hover:bg-white/10 text-navy-300 transition">
              <X size={12} />
            </button>
          ) : (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-navy-300/40 border border-white/10 rounded-md px-1.5 py-0.5">⌘K</span>
          )}
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-2.5">
        {filteredGroups.length === 0 && (
          <div className="px-3 py-6 text-center text-[13px] text-navy-300/50">Hech narsa topilmadi</div>
        )}
        {filteredGroups.map((g) => {
          const isOpen = searching || !collapsed[g.group];
          const itemCount = g.items.length;
          return (
            <div key={g.group}>
              <button onClick={() => toggleGroup(g.group)}
                className="w-full flex items-center gap-2 px-3 py-1.5 rounded-xl hover:bg-white/[.05] transition group/head">
                <span className="text-xs">{emojiForItem({ key: '', label: '' }, g.group)}</span>
                <span className="flex-1 text-left text-[10px] font-extrabold uppercase tracking-[.16em] text-navy-300/70 group-hover/head:text-gold-300 transition-colors">
                  {g.group}
                </span>
                <span className="text-[10px] font-bold text-navy-300/40 bg-white/[.06] rounded-full px-1.5 py-0.5">{itemCount}</span>
                <ChevronDown size={13} className={`text-navy-300/50 transition-transform duration-200 ease-ios ${isOpen ? 'rotate-180' : ''}`} />
              </button>
              <div className="grid transition-[grid-template-rows] duration-300 ease-ios" style={{ gridTemplateRows: isOpen ? '1fr' : '0fr' }}>
                <div className="overflow-hidden">
                  <div className="space-y-1 rounded-2xl bg-white/[.03] border border-white/[.04] p-1.5 mt-1">
                    {g.items.map((it) => {
                      const emoji = emojiForItem(it, g.group);
                      return (
                        <NavLink
                          key={it.key}
                          to={`/app/${it.key}`}
                          onClick={onNavigate}
                          className={({ isActive }) =>
                            `side-item group flex items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] ${
                              isActive
                                ? 'is-active'
                                : 'text-navy-200/75 hover:bg-white/[.07] hover:text-white hover:translate-x-0.5'
                            }`
                          }
                        >
                          {({ isActive }) => (
                            <>
                              <span className={`grid place-items-center w-7 h-7 rounded-lg text-[15px] leading-none shrink-0 transition-all duration-200 ${
                                isActive ? 'bg-white/25' : 'bg-white/[.05] group-hover:bg-white/[.09]'
                              }`}>
                                {emoji}
                              </span>
                              <span className="truncate font-medium">{it.label}</span>
                              {isActive && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-navy-900/70" />}
                            </>
                          )}
                        </NavLink>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </nav>

      {/* Foydalanuvchi kartasi */}
      <div className="px-3 pb-3">
        <div className="rounded-2xl bg-white/[.05] border border-white/[.06] p-3 flex items-center gap-3 hover:bg-white/[.08] transition">
          <div className="relative shrink-0">
            <div className="grid place-items-center w-10 h-10 rounded-full bg-gradient-to-br from-gold-300 to-gold-600 text-navy-900 font-extrabold text-sm shadow-md">
              {user.full_name?.[0]?.toUpperCase()}
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-[#0C1424]" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-bold text-white truncate">{user.full_name}</div>
            <span className={`chip !text-[9px] ${roleColor(user.role)}`}>{roleLabel(user.role)}</span>
          </div>
          <div className="flex flex-col gap-1">
            <button onClick={() => { onNavigate?.(); navigate('/app/settings'); }} title="Sozlamalar" className="grid place-items-center w-7 h-7 rounded-lg text-navy-300 hover:text-gold-300 hover:bg-white/10 transition">
              <Settings size={14} />
            </button>
            <button onClick={doLogout} title="Chiqish" className="grid place-items-center w-7 h-7 rounded-lg text-navy-300 hover:text-red-400 hover:bg-red-500/10 transition">
              <LogOut size={14} />
            </button>
          </div>
        </div>
        <div className="px-2 pt-2.5 pb-1 text-center text-[10px] text-navy-300/40 font-medium">
          Target International School © 2026
        </div>
      </div>
    </aside>
  );
}
