import { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';
import { canAccess } from '../config/menu.js';
import { emojiForItem } from '../config/menuEmojis.js';
import { renderKind } from '../App.jsx';

// Bitta sidebar elementi ichida bir nechta eski sahifani tab sifatida ko'rsatadi.
// item.tabs: [{ key, label, icon, kind, resource?, roles? }]
// ?tab=<key> orqali boshqa joydan (masalan kiruvchi qo'ng'iroq bannerining "Ochish" tugmasi)
// to'g'ridan-to'g'ri kerakli ichki tabga o'tkazish mumkin — aks holda doim birinchi tab ochilardi.
export default function TabbedPage({ item }) {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const visibleTabs = useMemo(() => item.tabs.filter((t) => canAccess(user.role, t)), [item.tabs, user.role]);
  const requestedTab = searchParams.get('tab');
  const [active, setActive] = useState(() =>
    (requestedTab && visibleTabs.some((t) => t.key === requestedTab)) ? requestedTab : visibleTabs[0]?.key);
  const current = visibleTabs.find((t) => t.key === active) || visibleTabs[0];

  if (visibleTabs.length === 0) {
    return (
      <div className="card p-10 text-center max-w-lg mx-auto">
        <div className="text-4xl mb-3">🔒</div>
        <h2 className="font-display text-xl text-navy-800">Ruxsat yo'q</h2>
      </div>
    );
  }

  return (
    <div className="max-w-[1400px] mx-auto">
      {visibleTabs.length > 1 && (
        <div className="flex flex-wrap gap-1.5 mb-6 p-1.5 rounded-2xl bg-navy-50/70 border border-navy-100/70 backdrop-blur w-fit max-w-full">
          {visibleTabs.map((t) => {
            const isActive = current?.key === t.key;
            return (
              <button key={t.key} onClick={() => setActive(t.key)}
                className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-bold transition-all duration-200 ease-ios ${
                  isActive
                    ? 'bg-gradient-to-r from-gold-400 to-gold-500 text-white shadow-md shadow-gold/25 scale-[1.02]'
                    : 'text-navy-500 hover:bg-white hover:shadow-sm'}`}>
                <span className="text-sm leading-none">{emojiForItem(t, item.group)}</span> {t.label}
              </button>
            );
          })}
        </div>
      )}
      {current && renderKind(current, current.key)}
    </div>
  );
}
