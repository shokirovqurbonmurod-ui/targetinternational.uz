// Mayda xarajatlar — xodim kichik xarajat uchun so'rov yuboradi, moliya/rahbariyat tasdiqlaydi
// yoki rad etadi. Tasdiqlansa avtomatik "expenses" jadvaliga yoziladi (moliya hisobotlariga tushsin).
import express from 'express';
import { store, logAudit } from '../db.js';
import { authRequired } from '../auth.js';
import { sendMessage } from '../botPoller.js';

const r = express.Router();
r.use(authRequired);

const today = () => new Date().toISOString().slice(0, 10);
const FINANCE_ROLES = ['founder', 'director', 'super_admin', 'branch_manager', 'admin', 'accountant', 'cashier'];

function notifyStaff(userName, text) {
  const link = store.where('telegram_links', (l) => l.user_name === userName)[0];
  if (link) sendMessage(link.chat_id, text).catch(() => {});
}

r.get('/', (req, res) => {
  const all = store.all('petty_cash');
  if (FINANCE_ROLES.includes(req.user.role)) return res.json(all);
  res.json(all.filter((p) => p.requester === req.user.name));
});

r.post('/', (req, res) => {
  const { amount, reason } = req.body || {};
  const amt = Number(amount) || 0;
  if (amt <= 0) return res.status(400).json({ error: "Miqdorni kiriting." });
  if (!reason?.trim()) return res.status(400).json({ error: "Sabab kiriting." });
  const row = store.insert('petty_cash', {
    title: reason.trim(), requester: req.user.name, amount: amt, reason: reason.trim(),
    status: 'pending', date: today(),
  });
  logAudit(req.user.name, 'petty cash request', `${amt} — ${reason}`);
  res.status(201).json(row);
});

r.post('/:id/approve', (req, res) => {
  if (!FINANCE_ROLES.includes(req.user.role)) return res.status(403).json({ error: "Bu amal uchun ruxsatingiz yo'q." });
  const row = store.get('petty_cash', req.params.id);
  if (!row || row.status !== 'pending') return res.status(404).json({ error: 'Faol so\'rov topilmadi.' });
  store.update('petty_cash', row.id, { status: 'approved', approved_by: req.user.name });
  store.insert('expenses', { title: `Mayda xarajat: ${row.reason}`, amount: row.amount, category: 'Mayda xarajatlar', date: today() });
  logAudit(req.user.name, 'petty cash approve', `${row.requester}: ${row.amount}`);
  notifyStaff(row.requester, `✅ Sizning mayda xarajat so'rovingiz (${row.amount.toLocaleString('en-US').replace(/,/g, ' ')} so'm — "${row.reason}") tasdiqlandi.`);
  res.json(store.get('petty_cash', row.id));
});

r.post('/:id/reject', (req, res) => {
  if (!FINANCE_ROLES.includes(req.user.role)) return res.status(403).json({ error: "Bu amal uchun ruxsatingiz yo'q." });
  const row = store.get('petty_cash', req.params.id);
  if (!row || row.status !== 'pending') return res.status(404).json({ error: 'Faol so\'rov topilmadi.' });
  store.update('petty_cash', row.id, { status: 'rejected', approved_by: req.user.name });
  logAudit(req.user.name, 'petty cash reject', `${row.requester}: ${row.amount}`);
  notifyStaff(row.requester, `❌ Sizning mayda xarajat so'rovingiz ("${row.reason}") rad etildi.`);
  res.json(store.get('petty_cash', row.id));
});

r.delete('/:id', (req, res) => {
  const row = store.get('petty_cash', req.params.id);
  if (!row) return res.status(404).json({ error: 'Topilmadi' });
  if (row.requester !== req.user.name && !FINANCE_ROLES.includes(req.user.role)) return res.status(403).json({ error: "Bu amal uchun ruxsatingiz yo'q." });
  store.remove('petty_cash', row.id);
  res.json({ ok: true });
});

export default r;
