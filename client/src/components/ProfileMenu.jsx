import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings, LogOut, ChevronDown, User, ShieldCheck } from 'lucide-react';
import { useAuth } from '../auth/AuthContext.jsx';
import { roleLabel, roleColor } from '../config/roles.js';

export default function ProfileMenu() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const boxRef = useRef(null);

  useEffect(() => {
    function onClickOutside(e) { if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false); }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  function go(path) { setOpen(false); navigate(path); }
  function doLogout() { setOpen(false); logout(); navigate('/login'); }

  return (
    <div className="relative" ref={boxRef}>
      <button onClick={() => setOpen((o) => !o)} className={`flex items-center gap-2 ml-1 rounded-full p-1 pr-2.5 transition-all duration-200 ease-ios ${open ? 'bg-navy-50 shadow-inner' : 'hover:bg-navy-50'}`}>
        <div className="relative">
          <div className="grid place-items-center w-9 h-9 rounded-full bg-gradient-to-br from-gold-300 via-gold-400 to-gold-600 text-white font-extrabold text-sm shadow-md ring-2 ring-white/70 shrink-0">
            {user.full_name?.[0]?.toUpperCase()}
          </div>
          <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-white" />
        </div>
        <div className="text-right hidden sm:block">
          <div className="text-[13px] font-extrabold text-navy-800 leading-tight truncate max-w-[130px]">{user.full_name}</div>
          <span className={`chip !text-[9px] !px-2 ${roleColor(user.role)}`}>{roleLabel(user.role)}</span>
        </div>
        <ChevronDown size={14} className={`hidden sm:block text-navy-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-[58px] w-72 card !rounded-3xl !shadow-2xl overflow-hidden z-20 animate-fade border-navy-100">
          {/* Profil sarlavhasi */}
          <div className="relative px-5 py-5 bg-gradient-to-br from-navy-800 via-navy-900 to-[#0A1020] overflow-hidden">
            <div className="absolute -right-10 -top-10 w-36 h-36 rounded-full bg-gold/15 blur-2xl" />
            <div className="relative flex items-center gap-3.5">
              <div className="relative shrink-0">
                <div className="grid place-items-center w-14 h-14 rounded-2xl bg-gradient-to-br from-gold-300 via-gold-400 to-gold-600 text-white font-extrabold text-xl shadow-lg">
                  {user.full_name?.[0]?.toUpperCase()}
                </div>
              </div>
              <div className="min-w-0">
                <div className="text-sm font-extrabold text-white truncate">{user.full_name}</div>
                <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                  <span className={`chip !text-[9px] ${roleColor(user.role)}`}>{roleLabel(user.role)}</span>
                  <span className="chip !text-[9px] bg-white/10 text-gold-200 border border-white/10"><ShieldCheck size={10} /> Xavfsiz</span>
                </div>
              </div>
            </div>
          </div>

          <div className="p-2">
            <button onClick={() => go('/app/settings')} className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold text-navy-700 hover:bg-gold/[.07] hover:text-navy-900 transition text-left">
              <span className="grid place-items-center w-8 h-8 rounded-lg bg-navy-50 text-navy-500"><User size={14} /></span> Profilim
            </button>
            <button onClick={() => go('/app/settings')} className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold text-navy-700 hover:bg-gold/[.07] hover:text-navy-900 transition text-left">
              <span className="grid place-items-center w-8 h-8 rounded-lg bg-navy-50 text-navy-500"><Settings size={14} /></span> Sozlamalar
            </button>
          </div>

          <div className="border-t border-navy-100/70 p-2">
            <button onClick={doLogout} className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-bold text-red-500 hover:bg-red-50 transition text-left">
              <span className="grid place-items-center w-8 h-8 rounded-lg bg-red-50 text-red-500"><LogOut size={14} /></span> Chiqish
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
