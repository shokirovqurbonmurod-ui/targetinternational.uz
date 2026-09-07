import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';
import { LogIn, Eye, EyeOff, Phone, Lock, Sparkles, ArrowRight, ShieldCheck, GraduationCap, Trophy } from 'lucide-react';

const KIOSK_KEY = 'iso_kiosk_mode';

const SUBJECTS = [
  { icon: '🇬🇧', label: 'Ingliz' }, { icon: '🎯', label: 'IELTS' }, { icon: '📊', label: 'CEFR' },
  { icon: '🇰🇷', label: 'Koreys' }, { icon: '🇷🇺', label: 'Rus' }, { icon: '➗', label: 'Matematika' },
  { icon: '📜', label: 'Tarix' }, { icon: '⚖️', label: 'Huquq' }, { icon: '💻', label: 'IT' },
];

const FEATURES = [
  { icon: GraduationCap, label: '1500+ o‘quvchi', sub: 'faol ishtirokchi' },
  { icon: Trophy, label: '98% qoniqish', sub: 'talabalar reytingi' },
  { icon: ShieldCheck, label: '3x himoya', sub: 'xavfsiz tizim' },
];

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const isKiosk = (() => { try { return localStorage.getItem(KIOSK_KEY) === '1'; } catch { return false; } })();

  useEffect(() => () => { streamRef.current?.getTracks().forEach((t) => t.stop()); }, []);

  // Faqat qabulxona kiosk sifatida belgilangan qurilmada — noto'g'ri urinishda kamera kadri olinadi.
  async function ensureKioskCamera() {
    if (!isKiosk || streamRef.current) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 320, height: 240 } });
      streamRef.current = stream;
      if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play(); }
    } catch { /* kamera yo'q yoki ruxsat berilmagan — jim o'tkaziladi, login odatdagidek davom etadi */ }
  }

  function captureKioskFrame() {
    const video = videoRef.current;
    if (!isKiosk || !video || video.readyState < 2) return null;
    try {
      const c = document.createElement('canvas');
      c.width = video.videoWidth; c.height = video.videoHeight;
      c.getContext('2d').drawImage(video, 0, 0);
      return c.toDataURL('image/jpeg', 0.7);
    } catch { return null; }
  }

  async function submit(e) {
    e?.preventDefault?.();
    setErr(''); setBusy(true);
    try {
      const photo = captureKioskFrame();
      await login(phone, password, photo ? { photo } : undefined);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      navigate('/app/command-center');
    } catch (e) {
      setErr(e.message || 'Telefon yoki parol noto\'g\'ri');
      await ensureKioskCamera();
    } finally { setBusy(false); }
  }

  return (
    <div className="min-h-full flex bg-navy-50">
      <video ref={videoRef} muted playsInline className="hidden" />

      {/* Chap tomon — brend */}
      <div className="hidden lg:flex lg:w-[500px] flex-col justify-between p-12 bg-gradient-to-br from-navy-800 via-navy-900 to-[#0A1020] text-white relative overflow-hidden">
        {/* Dekorativ fon */}
        <div className="absolute inset-0 opacity-[.35]" style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,.08) 1px, transparent 1px)', backgroundSize: '24px 24px', maskImage: 'radial-gradient(600px 500px at 50% 20%, black, transparent 80%)', WebkitMaskImage: 'radial-gradient(600px 500px at 50% 20%, black, transparent 80%)' }} />
        <div className="absolute -right-28 -top-28 w-[480px] h-[480px] rounded-full bg-gold/15 blur-[110px] animate-drift" />
        <div className="absolute -left-24 bottom-0 w-[420px] h-[420px] rounded-full bg-blue-500/10 blur-[100px] animate-drift" style={{ animationDelay: '-7s' }} />
        <div className="absolute right-12 bottom-28 w-44 h-44 rounded-full border border-gold/20 animate-float" />
        <div className="absolute right-16 bottom-36 w-28 h-28 rounded-full border border-white/10 animate-float" style={{ animationDelay: '-2s' }} />

        <div className="relative flex items-center gap-4">
          <div className="relative shrink-0">
            <div className="w-20 h-20 rounded-full border-[4px] border-navy-700 bg-navy-900 shadow-inner relative">
              <div className="absolute inset-[18%] rounded-full border border-white/50" />
              <div className="absolute inset-0 flex items-center justify-center"><div className="w-[3px] h-full bg-red-500/90" /></div>
              <div className="absolute inset-0 flex items-center justify-center"><div className="h-[3px] w-full bg-red-500/90" /></div>
              <div className="absolute inset-[25%] rounded-full border-[3px] border-red-500/80" />
            </div>
            <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-gradient-to-br from-gold-300 to-gold-600 border-[3px] border-navy-900" />
          </div>
          <div className="leading-none">
            <div className="font-black tracking-[-0.08em] text-5xl">
              <span className="text-red-500">TAR</span><span className="text-white">GET</span>
            </div>
            <div className="mt-1.5 text-[10px] font-extrabold uppercase tracking-[0.22em] text-gold-300">International School · LMS</div>
          </div>
        </div>

        <div className="relative">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-white/10 backdrop-blur px-3.5 py-1.5 text-xs font-bold text-gold-200 border border-white/10 mb-6 shadow-lg">
            <Sparkles size={13} /> AI yordamchi bilan yangilandi
          </div>
          <h1 className="font-display text-[44px] leading-[1.12] mb-5">
            Kelajak sari<br /><span className="text-gold-300">bilim bilan</span> qadam
          </h1>
          <p className="text-navy-300 mb-7 text-sm max-w-md leading-relaxed">
            Bitta platformada — o'quvchilar, guruhlar, moliya, CRM va boshqaruv. Barcha imkoniyatlar bir joyda, har doim qo'lingizda.
          </p>

          {/* Statistik blokchalar */}
          <div className="grid grid-cols-3 gap-3 max-w-md mb-8">
            {FEATURES.map((f, i) => (
              <div key={f.label} className="rounded-2xl bg-white/[.06] border border-white/10 px-3.5 py-3 backdrop-blur animate-fade" style={{ animationDelay: `${i * 120}ms` }}>
                <f.icon size={17} className="text-gold-300 mb-2" />
                <div className="text-sm font-extrabold leading-tight">{f.label}</div>
                <div className="text-[10px] text-navy-300/80 mt-0.5">{f.sub}</div>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-2 max-w-lg">
            {SUBJECTS.map((s) => (
              <span key={s.label} className="inline-flex items-center gap-1.5 rounded-full bg-white/[.06] border border-white/10 px-3.5 py-1.5 text-[13px] font-semibold text-navy-100 hover:bg-white/10 hover:border-gold/30 transition-all duration-200 hover:-translate-y-0.5">
                <span>{s.icon}</span>{s.label}
              </span>
            ))}
          </div>
        </div>

        <div className="relative flex items-center justify-between text-xs text-navy-400">
          <span>© 2026 Target International School · Sherobod</span>
          <span className="inline-flex items-center gap-1.5 text-navy-300"><ShieldCheck size={13} className="text-emerald-400" /> Ma'lumotlaringiz himoyalangan</span>
        </div>
      </div>

      {/* O'ng tomon — faqat kirish formasi */}
      <div className="flex-1 flex items-center justify-center p-6 relative overflow-hidden">
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-gold/10 blur-[100px] animate-drift" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 rounded-full bg-blue-400/10 blur-[100px] animate-drift" style={{ animationDelay: '-8s' }} />

        <div className="w-full max-w-[400px] animate-fade relative">
          {/* Mobil logo */}
          <div className="lg:hidden flex flex-col items-center gap-3 mb-8">
            <div className="relative">
              <div className="w-16 h-16 rounded-full border-[3px] border-navy-700 bg-navy-900 shadow-inner relative">
                <div className="absolute inset-[18%] rounded-full border border-white/50" />
                <div className="absolute inset-0 flex items-center justify-center"><div className="w-[2px] h-full bg-red-500/90" /></div>
                <div className="absolute inset-0 flex items-center justify-center"><div className="h-[2px] w-full bg-red-500/90" /></div>
                <div className="absolute inset-[25%] rounded-full border-[2px] border-red-500/80" />
              </div>
              <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-gradient-to-br from-gold-300 to-gold-600 border-2 border-white" />
            </div>
            <div className="leading-none text-center">
              <div className="font-black tracking-[-0.08em] text-3xl text-navy-800">
                <span className="text-red-500">TAR</span><span className="text-navy-900">GET</span>
              </div>
              <div className="mt-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-navy-400">International School</div>
            </div>
            <p className="text-xs text-navy-400">Xorijiy tillar o'quv markazi</p>
          </div>

          {/* Asosiy karta */}
          <div className="relative rounded-[32px] p-[1.5px] bg-gradient-to-b from-navy-100 via-navy-100/60 to-gold/40 shadow-[0_24px_70px_-24px_rgba(28,43,69,.28)]">
            <div className="bg-white/95 backdrop-blur rounded-[31px] p-8 sm:p-9 relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-gold-400 to-transparent" />
              <div className="absolute -top-20 -right-20 w-52 h-52 rounded-full bg-gold/[.07] blur-2xl" />

              <div className="text-center mb-7 relative">
                <div className="relative inline-block">
                  <div className="grid place-items-center w-[68px] h-[68px] rounded-[22px] bg-gradient-to-br from-gold-300 via-gold-400 to-gold-600 text-white shadow-lg shadow-gold/30 mx-auto mb-4 ring-4 ring-gold/15">
                    <LogIn size={28} strokeWidth={2.2} />
                  </div>
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-400 border-[3px] border-white" />
                </div>
                <h2 className="font-display text-[26px] text-navy-800 leading-tight">Xush kelibsiz! 👋</h2>
                <p className="text-sm text-navy-400 mt-1.5">Hisobingizga kiring va davom eting</p>
              </div>

              {err && (
                <div className="mb-5 rounded-2xl bg-red-50 border border-red-100 text-red-600 text-sm px-4 py-3 animate-fade flex items-center gap-2.5">
                  <span className="grid place-items-center w-6 h-6 rounded-full bg-red-100 shrink-0 text-[11px] font-black">!</span>
                  {err}
                </div>
              )}

              <form onSubmit={submit} className="space-y-4 relative">
                <div>
                  <label className="label">Telefon raqam</label>
                  <div className="group relative">
                    <Phone size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-navy-300 group-focus-within:text-gold-500 transition-colors" />
                    <span className="absolute left-10 top-1/2 -translate-y-1/2 text-navy-400 text-sm font-semibold border-r border-navy-100 pr-2">+998</span>
                    <input className="input !py-3.5 !pl-[4.4rem] !pr-4 !rounded-2xl" placeholder="90 123 45 67" value={phone}
                      onChange={(e) => setPhone(e.target.value)} autoFocus />
                  </div>
                </div>
                <div>
                  <label className="label">Parol</label>
                  <div className="group relative">
                    <Lock size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-navy-300 group-focus-within:text-gold-500 transition-colors" />
                    <input className="input !py-3.5 !pl-11 !pr-12 !rounded-2xl" type={showPw ? 'text' : 'password'} placeholder="Parolingiz"
                      value={password} onChange={(e) => setPassword(e.target.value)} />
                    <button type="button" onClick={() => setShowPw(!showPw)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 grid place-items-center w-8 h-8 rounded-full text-navy-400 hover:text-navy-600 hover:bg-navy-50 transition">
                      {showPw ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  </div>
                </div>
                <button type="submit" className="btn-gold w-full !py-3.5 !text-[15px] !rounded-2xl mt-2" disabled={busy}>
                  {busy ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Kirilmoqda...
                    </>
                  ) : (
                    <>KIRISH <ArrowRight size={17} /></>
                  )}
                </button>
              </form>

              <div className="hairline my-6" />

              <div className="flex items-center justify-center gap-4 text-[11px] font-semibold text-navy-300 relative">
                <span className="flex items-center gap-1.5"><ShieldCheck size={13} className="text-emerald-400" /> Xavfsiz kirish</span>
                <span className="w-1 h-1 rounded-full bg-navy-200" />
                <span className="flex items-center gap-1.5"><Sparkles size={13} className="text-gold-500" /> AI qo'llab-quvvatlaydi</span>
              </div>
            </div>
          </div>

          <p className="text-center text-xs text-navy-300 mt-6">✨ Target International School AI yordamchisi sizni kutmoqda</p>
        </div>
      </div>
    </div>
  );
}
