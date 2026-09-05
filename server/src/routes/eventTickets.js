// Tadbir biletlari — "Tadbirlar markazi" (events) jadvalidagi tadbirlarga ro'yxatdan o'tish/chipta
// olish. Bir kishi bitta tadbirga faqat bitta chipta oladi (serverda tekshiriladi).
import express from 'express';
import { store, logAudit } from '../db.js';
import { authRequired } from '../auth.js';

const r = express.Router();
r.use(authRequired);

const now = () => new Date().toISOString().slice(0, 19).replace('T', ' ');
const STAFF_ONLY = (role) => !['student', 'parent', 'guest'].includes(role);

// Har bir tadbirga nechta chipta olinganini hisoblab, ro'yxatga qo'shib beradi.
r.get('/events', (req, res) => {
  const events = store.all('events');
  const tickets = store.all('event_tickets');
  const list = events.map((e) => {
    const evTickets = tickets.filter((t) => String(t.event_id) === String(e.id));
    return {
      ...e, tickets_count: evTickets.length,
      mine: evTickets.some((t) => t.buyer === req.user.name),
    };
  });
  res.json(list);
});

r.get('/mine', (req, res) => {
  res.json(store.where('event_tickets', (t) => t.buyer === req.user.name));
});

r.get('/:eventId/attendees', (req, res) => {
  if (!STAFF_ONLY(req.user.role)) return res.status(403).json({ error: "Bu bo'limga ruxsatingiz yo'q." });
  res.json(store.where('event_tickets', (t) => String(t.event_id) === req.params.eventId));
});

r.post('/buy', (req, res) => {
  const { event_id } = req.body || {};
  const event = store.get('events', event_id);
  if (!event) return res.status(404).json({ error: 'Tadbir topilmadi.' });
  const existing = store.where('event_tickets', (t) => String(t.event_id) === String(event_id) && t.buyer === req.user.name)[0];
  if (existing) return res.status(409).json({ error: "Siz bu tadbirga allaqachon chipta olgansiz." });
  const row = store.insert('event_tickets', {
    event_id: event.id, event_title: event.title, buyer: req.user.name, price: 0, date: now(), status: 'confirmed',
  });
  logAudit(req.user.name, 'event ticket', event.title);
  res.status(201).json(row);
});

r.delete('/:id', (req, res) => {
  const row = store.get('event_tickets', req.params.id);
  if (!row) return res.status(404).json({ error: 'Topilmadi' });
  if (row.buyer !== req.user.name && !STAFF_ONLY(req.user.role)) return res.status(403).json({ error: "Bu amal uchun ruxsatingiz yo'q." });
  store.remove('event_tickets', row.id);
  res.json({ ok: true });
});

export default r;
