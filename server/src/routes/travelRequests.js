// Xizmat safari — xodim ish safari uchun so'rov yuboradi, rahbariyat tasdiqlaydi/rad etadi,
// natija haqida so'rov egasiga Telegram orqali xabar boradi.
import express from 'express';
import { store, logAudit } from '../db.js';
import { authRequired } from '../auth.js';
import { sendMessage } from '../botPoller.js';

const r = express.Router();
r.use(authRequired);

const today = () => new Date().toISOString().slice(0, 10);
const MGMT_ROLES = ['founder', 'director', 'super_admin', 'branch_manager', 'admin', 'hr', 'academic_manager'];

function notifyStaff(userName, text) {
  const link = store.where('telegram_links', (l) => l.user_name === userName)[0];
  if (link) sendMessage(link.chat_id, text).catch(() => {});
}

r.get('/', (req, res) => {
  const all = store.all('travel_requests');
  if (MGMT_ROLES.includes(req.user.role)) return res.json(all);
  res.json(all.filter((t) => t.staff === req.user.name));
});

r.post('/', (req, res) => {
  const { destination, purpose, start_date, end_date } = req.body || {};
  if (!destination?.trim()) return res.status(400).json({ error: 'Manzilni kiriting.' });
  if (!start_date || !end_date) return res.status(400).json({ error: 'Sanalarni kiriting.' });
  if (end_date < start_date) return res.status(400).json({ error: "Tugash sanasi boshlanish sanasidan oldin bo'lolmaydi." });
  const row = store.insert('travel_requests', {
    staff: req.user.name, destination: destination.trim(), purpose: (purpose || '').trim(),
    date: today(), start_date, end_date, status: 'pending',
  });
  logAudit(req.user.name, 'travel request', destination.trim());
  res.status(201).json(row);
});

r.post('/:id/approve', (req, res) => {
  if (!MGMT_ROLES.includes(req.user.role)) return res.status(403).json({ error: "Bu amal uchun ruxsatingiz yo'q." });
  const row = store.get('travel_requests', req.params.id);
  if (!row || row.status !== 'pending') return res.status(404).json({ error: "Faol so'rov topilmadi." });
  store.update('travel_requests', row.id, { status: 'approved', approved_by: req.user.name });
  logAudit(req.user.name, 'travel approve', `${row.staff} → ${row.destination}`);
  notifyStaff(row.staff, `✅ Sizning "${row.destination}" (${row.start_date} — ${row.end_date}) xizmat safari so'rovingiz tasdiqlandi.`);
  res.json(store.get('travel_requests', row.id));
});

r.post('/:id/reject', (req, res) => {
  if (!MGMT_ROLES.includes(req.user.role)) return res.status(403).json({ error: "Bu amal uchun ruxsatingiz yo'q." });
  const row = store.get('travel_requests', req.params.id);
  if (!row || row.status !== 'pending') return res.status(404).json({ error: "Faol so'rov topilmadi." });
  store.update('travel_requests', row.id, { status: 'rejected', approved_by: req.user.name });
  logAudit(req.user.name, 'travel reject', `${row.staff} → ${row.destination}`);
  notifyStaff(row.staff, `❌ Sizning "${row.destination}" xizmat safari so'rovingiz rad etildi.`);
  res.json(store.get('travel_requests', row.id));
});

r.delete('/:id', (req, res) => {
  const row = store.get('travel_requests', req.params.id);
  if (!row) return res.status(404).json({ error: 'Topilmadi' });
  if (row.staff !== req.user.name && !MGMT_ROLES.includes(req.user.role)) return res.status(403).json({ error: "Bu amal uchun ruxsatingiz yo'q." });
  store.remove('travel_requests', row.id);
  res.json({ ok: true });
});

export default r;
