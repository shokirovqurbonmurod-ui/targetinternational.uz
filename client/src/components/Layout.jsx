import { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { Menu, Sun, Moon, Languages, CalendarDays } from 'lucide-react';
import Sidebar from './Sidebar.jsx';
import BottomTabBar from './BottomTabBar.jsx';
import NotificationBell from './NotificationBell.jsx';
import IncomingCallBanner from './IncomingCallBanner.jsx';
import ProfileMenu from './ProfileMenu.jsx';
import { useAuth } from '../auth/AuthContext.jsx';
import { useLang, LANGS } from '../i18n/LangContext.jsx';

export default function Layout() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [drawer, setDrawer] = useState(false);
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'));
  const { lang, setLang } = useLang();

  function toggleTheme() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle('dark', next);
    try { localStorage.setItem('iso_theme', next ? 'dark' : 'light'); } catch (e) {}
  }

  function cycleLang() {
    const codes = LANGS.map(l => l.code);
    const idx = (codes.indexOf(lang) + 1) % codes.length;
    setLang(codes[idx]);
  }

  const currentLang = LANGS.find(l => l.code === lang);

  const WD = ['Yakshanba', 'Dushanba', 'Seshanba', 'Chorshanba', 'Payshanba', 'Juma', 'Shanba'];
  const MN = ['yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun', 'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr'];
  const now = new Date();
  const todayStr = `${WD[now.getDay()]}, ${now.getDate()}-${MN[now.getMonth()]}`;

  return (
    <div className="h-full flex">
      {/* Ambient dekorativ fon */}
      <div className="app-ambient" aria-hidden="true">
        <div className="app-blob w-[460px] h-[460px] bg-gold/15 -top-40 -right-24 animate-drift" />
        <div className="app-blob w-[380px] h-[380px] bg-blue-400/10 top-1/3 -left-40 animate-drift" style={{ animationDelay: '-6s' }} />
        <div className="app-blob w-[320px] h-[320px] bg-violet-400/10 -bottom-32 right-1/4 animate-drift" style={{ animationDelay: '-10s' }} />
      </div>

      <div className="hidden lg:block relative z-10"><Sidebar /></div>

      {drawer && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-navy-900/60 backdrop-blur-sm" onClick={() => setDrawer(false)} />
          <div className="absolute left-0 top-0 h-full animate-slide"><Sidebar onNavigate={() => setDrawer(false)} /></div>
        </div>
      )}

      <div className="flex-1 min-w-0 flex flex-col relative">
        <header className="glass h-[68px] shrink-0 border-b border-navy-100/60 flex items-center justify-between px-4 lg:px-6 sticky top-0 z-10 shadow-[0_1px_0_rgba(198,161,91,.08),0_8px_24px_-20px_rgba(16,24,40,.3)]">
          <div className="flex items-center gap-3">
            <button className="lg:hidden grid place-items-center w-9 h-9 rounded-xl hover:bg-navy-100/70 text-navy-600 transition" onClick={() => setDrawer(true)}><Menu size={20} /></button>
            <div className="hidden sm:flex items-center gap-2.5">
              <div className="relative w-9 h-9 rounded-full border-[3px] border-navy-700 bg-navy-900 shadow-inner shrink-0">
                <div className="absolute inset-[18%] rounded-full border border-white/50" />
                <div className="absolute inset-0 flex items-center justify-center"><div className="w-[2px] h-full bg-red-500/90" /></div>
                <div className="absolute inset-0 flex items-center justify-center"><div className="h-[2px] w-full bg-red-500/90" /></div>
                <div className="absolute inset-[25%] rounded-full border-[2px] border-red-500/80" />
              </div>
              <div className="leading-none">
                <div className="font-black tracking-[-0.06em] text-[17px] text-navy-800">
                  <span className="text-red-500">TAR</span><span className="text-navy-900">GET</span>
                </div>
                <div className="text-[9px] text-navy-400 uppercase tracking-[0.14em]">International School · LMS</div>
              </div>
            </div>
            <div className="hidden md:flex items-center gap-2 rounded-full bg-gradient-to-r from-gold-400/10 to-gold-600/10 border border-gold/25 pl-2.5 pr-3.5 py-1.5 ml-1">
              <span className="grid place-items-center w-6 h-6 rounded-full bg-gradient-to-br from-gold-400 to-gold-600 text-white"><CalendarDays size={12} /></span>
              <span className="text-xs font-bold text-gold-700 tnum">{todayStr}</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {/* Language */}
            <button onClick={cycleLang} className="flex items-center gap-1.5 h-9 rounded-full px-3 hover:bg-navy-50 text-navy-500 text-sm font-bold transition" title="Til almashtirish">
              <Languages size={16} />
              <span className="hidden sm:inline">{currentLang?.flag} {lang.toUpperCase()}</span>
            </button>
            {/* Theme */}
            <button onClick={toggleTheme} className="relative grid place-items-center w-9 h-9 rounded-full hover:bg-navy-50 text-navy-500 transition overflow-hidden" title={dark ? 'Kunduzgi rejim' : 'Tungi rejim'}>
              {dark ? <Sun size={17} /> : <Moon size={17} />}
            </button>
            {/* Bell */}
            <NotificationBell role={user.role} />
            {/* Profil menyu */}
            <ProfileMenu />
          </div>
        </header>

        <main className="app-main flex-1 overflow-y-auto p-4 pb-24 lg:p-8">
          <Outlet />
        </main>
      </div>

      <BottomTabBar onOpenMenu={() => setDrawer(true)} />
      <IncomingCallBanner />
    </div>
  );
}
