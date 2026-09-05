// 1v1 Challenge — o'quvchi boshqa o'quvchini fanga chaqiradi, qarshi tomon qabul qiladi/rad etadi,
// natijada g'olibni o'qituvchi/xodim belgilaydi (masalan sinfda savol-javob orqali) va g'olib coin oladi.
import express from 'express';
import { store, logAudit } from '../db.js';
import { authRequired } from '../auth.js';
import { notifyForStudent } from '../telegram.js';

const r = express.Router();
r.use(authRequired);

const today = () => new Date().toISOString().slice(0, 10);
const now = () => new Date().toISOString().slice(0, 19).replace('T', ' ');
const STAFF_ONLY = (role) => !['student', 'parent', 'guest'].includes(role);
const WIN_REWARD = 40;

function myStudent(req) {
  if (req.user.role !== 'student') return null;
  return store.all('students').find((s) => s.full_name === req.user.name) || null;
}

r.get('/', (req, res) => {
  const all = store.all('challenges_1v1');
  const mine = myStudent(req);
  if (mine) return res.json(all.filter((c) => c.challenger === mine.full_name || c.opponent === mine.full_name));
  res.json(all);
});

r.post('/create', (req, res) => {
  const me = myStudent(req);
  if (!me) return res.status(403).json({ error: "Bu buyruq faqat o'quvchi hisobi uchun ishlaydi." });
  const { opponent_id, subject } = req.body || {};
  const opponent = store.get('students', opponent_id);
  if (!opponent) return res.status(404).json({ error: "Raqib topilmadi." });
  if (opponent.full_name === me.full_name) return res.status(400).json({ error: "O'zingizni chaqira olmaysiz." });
  if (!subject?.trim()) return res.status(400).json({ error: "Fanni kiriting." });
  const row = store.insert('challenges_1v1', {
    challenger: me.full_name, opponent: opponent.full_name, subject: subject.trim(),
    winner: '', date: today(), status: 'pending',
  });
  logAudit(me.full_name, '1v1 challenge', `${me.full_name} vs ${opponent.full_name} (${subject})`);
  notifyForStudent(opponent.id, `⚔️ ${me.full_name} sizni "${subject}" fanidan 1v1 challenge'ga chaqirdi! Qabul qilasizmi?`).catch(() => {});
  res.status(201).json(row);
});

r.post('/:id/accept', (req, res) => {
  const me = myStudent(req);
  const row = store.get('challenges_1v1', req.params.id);
  if (!row || row.status !== 'pending') return res.status(404).json({ error: "Faol taklif topilmadi." });
  if (!me || row.opponent !== me.full_name) return res.status(403).json({ error: "Bu taklif sizga tegishli emas." });
  store.update('challenges_1v1', row.id, { status: 'active' });
  logAudit(me.full_name, '1v1 accept', `#${row.id}`);
  res.json(store.get('challenges_1v1', row.id));
});

r.post('/:id/decline', (req, res) => {
  const me = myStudent(req);
  const row = store.get('challenges_1v1', req.params.id);
  if (!row || row.status !== 'pending') return res.status(404).json({ error: "Faol taklif topilmadi." });
  if (!me || row.opponent !== me.full_name) return res.status(403).json({ error: "Bu taklif sizga tegishli emas." });
  store.update('challenges_1v1', row.id, { status: 'declined' });
  res.json(store.get('challenges_1v1', row.id));
});

// Faqat xodim (masalan sinfda kuzatgan o'qituvchi) g'olibni belgilaydi — coin shu yerda beriladi.
r.post('/:id/resolve', (req, res) => {
  if (!STAFF_ONLY(req.user.role)) return res.status(403).json({ error: "Bu amal uchun ruxsatingiz yo'q." });
  const row = store.get('challenges_1v1', req.params.id);
  if (!row || row.status !== 'active') return res.status(404).json({ error: "Faol challenge topilmadi." });
  const { winner } = req.body || {};
  if (![row.challenger, row.opponent].includes(winner)) return res.status(400).json({ error: "G'olib challenger yoki opponent bo'lishi kerak." });
  store.update('challenges_1v1', row.id, { status: 'finished', winner });
  const winnerStudent = store.all('students').find((s) => s.full_name === winner);
  if (winnerStudent) {
    store.update('students', winnerStudent.id, {
      coins: (Number(winnerStudent.coins) || 0) + WIN_REWARD,
      points: (Number(winnerStudent.points) || 0) + WIN_REWARD,
    });
    store.insert('coin_log', { student: winner, amount: WIN_REWARD, reason: `1v1 Challenge g'olibi (${row.subject})`, given_by: req.user.name, at: now() });
    notifyForStudent(winnerStudent.id, `🏆 Tabriklaymiz! Siz "${row.subject}" fanidan 1v1 Challenge'da g'olib bo'ldingiz va ${WIN_REWARD} coin yutdingiz!`).catch(() => {});
  }
  logAudit(req.user.name, '1v1 resolve', `#${row.id} → ${winner}`);
  res.json(store.get('challenges_1v1', row.id));
});

r.delete('/:id', (req, res) => {
  if (!STAFF_ONLY(req.user.role)) return res.status(403).json({ error: "Bu amal uchun ruxsatingiz yo'q." });
  store.remove('challenges_1v1', req.params.id);
  logAudit(req.user.name, '1v1 delete', `#${req.params.id}`);
  res.json({ ok: true });
});

export default r;
