import express from 'express';
import { store, logAudit } from '../db.js';
import { authRequired, canMutate } from '../auth.js';

const r = express.Router();
r.use(authRequired);

r.get('/', (req, res) => {
  const mine = store.all('group_memberships').filter(m => m.user_name === req.user.name);
  res.json(mine);
});

r.post('/join', (req, res) => {
  const { group_name, code } = req.body || {};
  if (!group_name || !String(code || '').trim()) return res.status(400).json({ error: "Guruh va kodni kiriting" });
  // Avval o'quv guruhlari ("groups"), topilmasa foydalanuvchi yaratgan chat guruhlari ("chat_rooms") orasidan qidiriladi.
  const group = store.all('groups').find(g => g.name === group_name)
    || store.all('chat_rooms').find(r2 => r2.type === 'group' && r2.name === group_name);
  if (!group) return res.status(404).json({ error: 'Guruh topilmadi' });
  if (String(group.invite_code || '').trim().toLowerCase() !== String(code).trim().toLowerCase()) {
    return res.status(400).json({ error: "Kod noto'g'ri" });
  }
  const existing = store.all('group_memberships').find(m => m.group_name === group_name && m.user_name === req.user.name);
  if (existing) return res.json({ ok: true, already: true });
  const created = store.insert('group_memberships', {
    group_name, user_name: req.user.name, user_role: req.user.role, joined_at: new Date().toISOString(),
  });
  logAudit(req.user.name, 'join group', group_name);
  res.status(201).json({ ok: true, membership: created });
});

// Guruhdan chiqish/chiqarish — o'quvchi faqat o'zining a'zoligini o'chira oladi (guruhdan chiqish),
// boshqa birovning a'zoligini o'chirish esa faqat xodim/admin uchun (canMutate).
r.delete('/:id', (req, res) => {
  const row = store.get('group_memberships', req.params.id);
  if (!row) return res.status(404).json({ error: 'Topilmadi' });
  if (row.user_name !== req.user.name) return canMutate(req, res, doDelete);
  return doDelete();
  function doDelete() {
    store.remove('group_memberships', req.params.id);
    logAudit(req.user.name, 'leave group', row.group_name);
    res.json({ ok: true });
  }
});

export default r;
