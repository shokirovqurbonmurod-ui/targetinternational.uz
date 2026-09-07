import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Sparkles, MessageCircle, Menu, UserRound } from 'lucide-react';

const TABS = [
  { key: 'command-center', label: 'Bosh sahifa', icon: LayoutDashboard },
  { key: 'ai-assistant', label: 'AI', icon: Sparkles },
  { key: 'group-chat', label: 'Chat', icon: MessageCircle },
  { key: 'settings', label: 'Profil', icon: UserRound },
];

// iOS uslubidagi pastki tab-bar — faqat mobil ekranda (lg dan kichik) ko'rinadi.
export default function BottomTabBar({ onOpenMenu }) {
  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/85 backdrop-blur-2xl border-t border-navy-100/70 shadow-[0_-8px_30px_-18px_rgba(16,24,40,.3)]"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div className="grid grid-cols-5 h-[62px] px-2">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <NavLink key={t.key} to={`/app/${t.key}`}
              className={({ isActive }) =>
                `relative flex flex-col items-center justify-center gap-1 transition-all duration-200 ${
                  isActive ? 'text-gold-600' : 'text-navy-400 active:text-gold-600'}`}
              >
              {({ isActive }) => (
                <>
                  {isActive && <span className="absolute top-0 w-8 h-[3px] rounded-b-full bg-gradient-to-r from-gold-400 to-gold-600" />}
                  <span className={`grid place-items-center ${isActive ? 'w-10 h-7 rounded-full bg-gold/15' : ''} transition-all duration-200`}>
                    <Icon size={21} strokeWidth={isActive ? 2.4 : 2} />
                  </span>
                  <span className={`text-[10px] ${isActive ? 'font-extrabold' : 'font-semibold'}`}>{t.label}</span>
                </>
              )}
            </NavLink>
          );
        })}
        <button onClick={onOpenMenu} className="flex flex-col items-center justify-center gap-1 text-navy-400 active:text-gold-600 transition-colors">
          <span className="grid place-items-center w-10 h-7 rounded-full"><Menu size={21} /></span>
          <span className="text-[10px] font-semibold">Menyu</span>
        </button>
      </div>
    </nav>
  );
}
