// Foydalanuvchi yaratgan chat guruhlarida ("chat_rooms", type='group') egasi (yaratuvchi) boshqa
// a'zoni "admin" qilib tayinlashi mumkin — shu guruh doirasida xabar o'chirish/a'zo boshqarish
// huquqini beradi, lekin butun tizim bo'yicha admin qilib qo'ymaydi.
import express from 'express';
import { store, logAudit } from '../db.js';
import { authRequired } from '../auth.js';
import { isAdmin } from '../roles.js';

const r = express.Router();
r.use(authRequired);

function canManage(room, user) {
  return room.created_by === user.name || isAdmin(user.role);
}

r.post('/:id/admins', (req, res) => {
  const room = store.get('chat_rooms', req.params.id);
  if (!room) return res.status(404).json({ error: 'Topilmadi' });
  if (!canManage(room, req.user)) return res.status(403).json({ error: "Faqat guruh egasi yoki administrator admin tayinlashi mumkin." });
  const { user_name } = req.body || {};
  if (!user_name) return res.status(400).json({ error: 'Foydalanuvchi tanlanmagan' });
  const admins = Array.isArray(room.admins) ? [...room.admins] : [];
  if (!admins.includes(user_name)) admins.push(user_name);
  const updated = store.update('chat_rooms', room.id, { admins });
  logAudit(req.user.name, 'grant chat room admin', `${room.name}: ${user_name}`);
  res.json(updated);
});

r.delete('/:id/admins/:userName', (req, res) => {
  const room = store.get('chat_rooms', req.params.id);
  if (!room) return res.status(404).json({ error: 'Topilmadi' });
  if (!canManage(room, req.user)) return res.status(403).json({ error: "Faqat guruh egasi yoki administrator admin huquqini bekor qila oladi." });
  const admins = (Array.isArray(room.admins) ? room.admins : []).filter((n) => n !== decodeURIComponent(req.params.userName));
  const updated = store.update('chat_rooms', room.id, { admins });
  logAudit(req.user.name, 'revoke chat room admin', `${room.name}: ${req.params.userName}`);
  res.json(updated);
});

export default r;
