import { useEffect, useState } from 'react';
import { Ticket, Check, Calendar, MapPin } from 'lucide-react';
import { api } from '../lib/api.js';
import { PageHeader, Spinner, Empty } from '../components/ui.jsx';

export default function EventTicketsPage() {
  const [events, setEvents] = useState(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(null);

  async function load() {
    setEvents(await api.get('/event-tickets/events').catch(() => []));
  }
  useEffect(() => { load(); }, []);

  async function buy(eventId) {
    setErr(''); setBusy(eventId);
    try {
      await api.post('/event-tickets/buy', { event_id: eventId });
      await load();
    } catch (e) { setErr(e.message); }
    setBusy(null);
  }

  if (events === null) return <Spinner />;

  return (
    <div>
      <PageHeader icon={Ticket} title="Tadbir biletlari" subtitle="Tadbirga ro'yxatdan o'ting va chiptangizni oling" />

      {err && <p className="text-xs text-red-500 mb-3">{err}</p>}

      {events.length === 0 ? <Empty icon={Ticket} title="Hozircha tadbir yo'q" hint={'"Tadbirlar markazi"da yangi tadbir yarating.'} /> : (
        <div className="grid md:grid-cols-2 gap-4">
          {events.map((e) => (
            <div key={e.id} className="card p-5">
              <div className="flex items-start justify-between gap-2 mb-3">
                <h3 className="font-display text-lg text-navy-800">{e.title}</h3>
                <span className="chip text-[9px] bg-navy-100 text-navy-500 shrink-0">{e.type}</span>
              </div>
              <div className="space-y-1 text-xs text-navy-500 mb-4">
                <div className="flex items-center gap-1.5"><Calendar size={12} /> {e.date}</div>
                {e.location && <div className="flex items-center gap-1.5"><MapPin size={12} /> {e.location}</div>}
                <div>🎟️ {e.tickets_count} kishi ro'yxatdan o'tdi</div>
              </div>
              {e.mine ? (
                <div className="flex items-center gap-1.5 text-emerald-600 text-sm font-semibold"><Check size={16} /> Chiptangiz mavjud</div>
              ) : (
                <button onClick={() => buy(e.id)} disabled={busy === e.id} className="btn-gold w-full py-2 text-sm">
                  {busy === e.id ? 'Olinmoqda...' : "Chipta olish"}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
