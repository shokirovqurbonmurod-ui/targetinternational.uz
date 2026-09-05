// Shaxsiy kundalik — "shaxsiy" bo'lgani uchun har bir foydalanuvchi FAQAT o'z yozuvlarini
// ko'radi/tahrirlaydi; boshqa birovning kundaligi (hatto admin bo'lsa ham) bu yerdan ko'rinmaydi.
import express from 'express';
import { store } from '../db.js';
import { authRequired } from '../auth.js';

const r = express.Router();
r.use(authRequired);

const today = () => new Date().toISOString().slice(0, 10);

r.get('/', (req, res) => {
  const mine = store.where('diary', (d) => d.student === req.user.name).sort((a, b) => (b.entry_date || '').localeCompare(a.entry_date || '') || b.id - a.id);
  res.json(mine);
});

r.post('/', (req, res) => {
  const { title, content, mood, entry_date } = req.body || {};
  if (!content?.trim()) return res.status(400).json({ error: 'Matn kiriting.' });
  const row = store.insert('diary', {
    student: req.user.name, title: (title || '').trim(), content: content.trim(),
    mood: mood || '', entry_date: entry_date || today(),
  });
  res.status(201).json(row);
});

r.put('/:id', (req, res) => {
  const row = store.get('diary', req.params.id);
  if (!row || row.student !== req.user.name) return res.status(404).json({ error: 'Topilmadi' });
  const { title, content, mood } = req.body || {};
  const patch = {};
  if (title !== undefined) patch.title = title.trim();
  if (content !== undefined) patch.content = content.trim();
  if (mood !== undefined) patch.mood = mood;
  const updated = store.update('diary', row.id, patch);
  res.json(updated);
});

r.delete('/:id', (req, res) => {
  const row = store.get('diary', req.params.id);
  if (!row || row.student !== req.user.name) return res.status(404).json({ error: 'Topilmadi' });
  store.remove('diary', row.id);
  res.json({ ok: true });
});

export default r;
