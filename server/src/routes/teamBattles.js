// Jamoa janglari — ikkita GURUH (masalan "Ingliz tili A1" vs "Ingliz tili B1") fandan bellashadi.
// Xodim yaratadi va g'olib guruhni belgilaydi — g'olib guruhdagi HAR BIR o'quvchi coin oladi.
import express from 'express';
import { store, logAudit } from '../db.js';
import { authRequired } from '../auth.js';
import { notifyForStudent } from '../telegram.js';

const r = express.Router();
r.use(authRequired);

const today = () => new Date().toISOString().slice(0, 10);
const now = () => new Date().toISOString().slice(0, 19).replace('T', ' ');
const STAFF_ONLY = (role) => !['student', 'parent', 'guest'].includes(role);
const WIN_REWARD = 20;

r.get('/', (_req, res) => res.json(store.all('team_battles')));

r.post('/create', (req, res) => {
  if (!STAFF_ONLY(req.user.role)) return res.status(403).json({ error: "Bu amal uchun ruxsatingiz yo'q." });
  const { team_a, team_b, subject } = req.body || {};
  if (!team_a?.trim() || !team_b?.trim()) return res.status(400).json({ error: "Ikkala guruhni ham tanlang." });
  if (team_a.trim() === team_b.trim()) return res.status(400).json({ error: "Guruhlar bir xil bo'lmasin." });
  if (!subject?.trim()) return res.status(400).json({ error: "Fanni kiriting." });
  const row = store.insert('team_battles', {
    team_a: team_a.trim(), team_b: team_b.trim(), subject: subject.trim(),
    winner: '', date: today(), status: 'active', created_by: req.user.name,
  });
  logAudit(req.user.name, 'team battle create', `${team_a} vs ${team_b}`);
  res.status(201).json(row);
});

r.post('/:id/resolve', (req, res) => {
  if (!STAFF_ONLY(req.user.role)) return res.status(403).json({ error: "Bu amal uchun ruxsatingiz yo'q." });
  const row = store.get('team_battles', req.params.id);
  if (!row || row.status !== 'active') return res.status(404).json({ error: "Faol jang topilmadi." });
  const { winner } = req.body || {};
  if (![row.team_a, row.team_b].includes(winner)) return res.status(400).json({ error: "G'olib team_a yoki team_b bo'lishi kerak." });
  store.update('team_battles', row.id, { status: 'finished', winner });

  const winners = store.all('students').filter((s) => s.group_name === winner);
  for (const s of winners) {
    store.update('students', s.id, { coins: (Number(s.coins) || 0) + WIN_REWARD, points: (Number(s.points) || 0) + WIN_REWARD });
    store.insert('coin_log', { student: s.full_name, amount: WIN_REWARD, reason: `Jamoa jangi g'olibi: ${winner} (${row.subject})`, given_by: req.user.name, at: now() });
    notifyForStudent(s.id, `🏆 Tabriklaymiz! Sizning guruhingiz "${winner}" — "${row.subject}" fanidan jamoa jangida g'olib chiqdi va ${WIN_REWARD} coin yutdi!`).catch(() => {});
  }
  logAudit(req.user.name, 'team battle resolve', `#${row.id} → ${winner} (${winners.length} o'quvchi)`);
  res.json({ ...store.get('team_battles', row.id), rewarded: winners.length });
});

r.delete('/:id', (req, res) => {
  if (!STAFF_ONLY(req.user.role)) return res.status(403).json({ error: "Bu amal uchun ruxsatingiz yo'q." });
  store.remove('team_battles', req.params.id);
  res.json({ ok: true });
});

export default r;
