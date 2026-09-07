import { X, Inbox } from 'lucide-react';

export function PageHeader({ icon: Icon, title, subtitle, actions }) {
  return (
    <div className="flex items-start justify-between gap-4 mb-6 flex-wrap animate-fade">
      <div className="flex items-center gap-3.5">
        {Icon && (
          <div className="relative">
            <div className="icon-tile w-12 h-12 bg-gradient-to-br from-gold-400/25 to-gold-600/10 text-gold-600 ring-1 ring-gold/20">
              <Icon size={23} strokeWidth={2.2} />
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-gold-400 border-2 border-white" />
          </div>
        )}
        <div>
          <h1 className="font-display text-[26px] text-navy-800 leading-tight">{title}</h1>
          {subtitle && <p className="text-sm text-navy-400 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

export function StatCard({ icon: Icon, label, value, hint, tone = 'gold' }) {
  const tones = {
    gold: 'from-gold-400/25 to-gold-100/10 text-gold-600 ring-gold/20',
    navy: 'from-navy-200 to-navy-100 text-navy-600 ring-navy-200/60',
    green: 'from-emerald-400/25 to-emerald-100/10 text-emerald-600 ring-emerald-200/60',
    blue: 'from-blue-400/25 to-blue-100/10 text-blue-600 ring-blue-200/60',
    rose: 'from-rose-400/25 to-rose-100/10 text-rose-600 ring-rose-200/60',
  };
  return (
    <div className="card stat-glow group p-5 hover:-translate-y-1 hover:shadow-ios hover:border-gold/25 transition-all duration-200 ease-ios">
      <div className="flex items-center justify-between">
        <div className={`icon-tile w-11 h-11 bg-gradient-to-br ring-1 ${tones[tone]} group-hover:scale-110 group-hover:-rotate-3 transition-transform duration-200 ease-ios`}>
          {Icon && <Icon size={22} strokeWidth={2.1} />}
        </div>
        {hint && <span className="text-xs font-bold text-emerald-600 bg-emerald-50 rounded-full px-2 py-0.5 shadow-sm">{hint}</span>}
      </div>
      <div className="mt-3.5 font-display text-[26px] text-navy-800 tnum leading-none">{value}</div>
      <div className="text-[13px] text-navy-400 font-medium mt-1.5">{label}</div>
    </div>
  );
}

export function Modal({ open, title, onClose, children, footer }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4 bg-navy-950/45 backdrop-blur-md animate-fade" onClick={onClose}>
      <div className="card animate-sheet w-full max-w-lg max-h-[90vh] overflow-y-auto !rounded-[28px] !shadow-2xl border-navy-100/70" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 z-10 glass flex items-center justify-between px-6 py-4 border-b border-navy-100">
          <h3 className="font-display text-xl text-navy-800 flex items-center gap-2.5">
            <span className="w-1.5 h-6 rounded-full bg-gradient-to-b from-gold-400 to-gold-600" />
            {title}
          </h3>
          <button onClick={onClose} className="grid place-items-center w-8 h-8 rounded-full hover:bg-navy-100 text-navy-400 hover:text-navy-700 transition"><X size={18} /></button>
        </div>
        <div className="p-6">{children}</div>
        {footer && <div className="flex justify-end gap-2 px-6 py-4 border-t border-navy-100 bg-navy-50/40">{footer}</div>}
      </div>
    </div>
  );
}

export function Empty({ icon: Icon, title, hint }) {
  return (
    <div className="card grid place-items-center text-center py-16 px-6 animate-fade">
      {Icon && <div className="icon-tile w-16 h-16 bg-gradient-to-br from-gold-400/15 to-gold-100/5 text-gold-500 ring-1 ring-gold/15 mb-4"><Icon size={30} /></div>}
      <h3 className="font-display text-xl text-navy-700">{title}</h3>
      {hint && <p className="text-sm text-navy-400 mt-2 max-w-md">{hint}</p>}
    </div>
  );
}

export function Spinner({ label = 'Yuklanmoqda...' }) {
  return (
    <div className="grid place-items-center py-24 text-navy-400 animate-fade">
      <div className="relative mb-4">
        <div className="w-12 h-12 rounded-full border-[3px] border-navy-100" />
        <div className="absolute inset-0 w-12 h-12 rounded-full border-[3px] border-transparent border-t-gold animate-spin" />
      </div>
      <span className="text-sm font-semibold">{label}</span>
    </div>
  );
}
