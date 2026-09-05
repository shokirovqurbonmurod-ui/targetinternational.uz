import express from 'express';
import { store, logAudit } from '../db.js';
import { authRequired } from '../auth.js';

const r = express.Router();
r.use(authRequired);

// Channels visible only to staff — students/parents cannot read or post here.
const STAFF_ONLY_CHANNELS = ["O'qituvchilar"];

r.get('/', (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 500, 2000);
  let rows = store.list('chat_messages', { q: req.query.q, limit });
  if (['student', 'parent'].includes(req.user.role)) {
    rows = rows.filter(m => !STAFF_ONLY_CHANNELS.includes(m.channel));
  }
  res.json(rows);
});

r.post('/', (req, res) => {
  const { channel, sender, sender_role, text, timestamp, media_url, media_type, media_name, reply_to, poll, forwarded_from } = req.body || {};
  if (STAFF_ONLY_CHANNELS.includes(channel) && ['student', 'parent'].includes(req.user.role)) {
    return res.status(403).json({ error: "Bu kanal faqat o'qituvchilar uchun" });
  }
  // reply_to — javob berilayotgan xabarning id'si; javob yozilganda asl xabar matni/muallifi ko'chirilib
  // saqlanadi, aks holda asl xabar keyinchalik o'chirilsa "javob berilgan" kontekst yo'qolib qolardi.
  let reply_snippet = null, reply_sender = null;
  if (reply_to) {
    const original = store.get('chat_messages', reply_to);
    if (original) { reply_snippet = (original.text || '').slice(0, 140); reply_sender = original.sender; }
  }
  // So'rovnoma — savol + variantlar (har biriga ovoz berganlar ro'yxati); mijoz faqat matnni yuboradi,
  // ovoz sonlari serverda hisoblanadi (pastga qarang, /:id/poll-vote).
  let pollField = null;
  if (poll && poll.question && Array.isArray(poll.options) && poll.options.length >= 2) {
    pollField = { question: String(poll.question).slice(0, 300), options: poll.options.slice(0, 8).map((o) => ({ text: String(o).slice(0, 120), votes: [] })) };
  }
  const created = store.insert('chat_messages', {
    channel, sender, sender_role, text, timestamp, media_url, media_type: pollField ? 'poll' : media_type, media_name,
    reply_to: reply_to || null, reply_snippet, reply_sender, pinned: false, reactions: [], poll: pollField, edited: false,
    forwarded_from: forwarded_from || null,
  });
  logAudit(req.user.name, 'create chat_messages', `#${created.id}`);
  res.status(201).json(created);
});

r.delete('/:id', (req, res) => {
  store.remove('chat_messages', req.params.id);
  logAudit(req.user.name, 'delete chat_messages', `#${req.params.id}`);
  res.json({ ok: true });
});

// Xabarni tahrirlash — faqat matn xabarlari, faqat o'zi yozgan (frontend cheklaydi, lekin server ham
// muallifini tekshiradi — boshqa birovning xabarini o'zgartirib bo'lmasin).
r.put('/:id/edit', (req, res) => {
  const msg = store.get('chat_messages', req.params.id);
  if (!msg) return res.status(404).json({ error: 'Topilmadi' });
  if (msg.sender !== req.user.name) return res.status(403).json({ error: "Faqat o'z xabaringizni tahrirlay olasiz." });
  const { text } = req.body || {};
  if (!text || !String(text).trim()) return res.status(400).json({ error: "Matn bo'sh bo'lmasin" });
  const updated = store.update('chat_messages', msg.id, { text: String(text).trim(), edited: true });
  logAudit(req.user.name, 'edit chat_messages', `#${msg.id}`);
  res.json(updated);
});

// So'rovnomaga ovoz berish — bitta tanlov (toggle: qayta bossa ovozi olib tashlanadi), boshqa
// variantga bossa avvalgi ovozi avtomatik ko'chadi.
r.post('/:id/poll-vote', (req, res) => {
  const msg = store.get('chat_messages', req.params.id);
  if (!msg || !msg.poll) return res.status(404).json({ error: 'Topilmadi' });
  const idx = Number(req.body?.option);
  if (!Number.isInteger(idx) || idx < 0 || idx >= msg.poll.options.length) return res.status(400).json({ error: "Variant noto'g'ri" });
  const poll = { question: msg.poll.question, options: msg.poll.options.map((o) => ({ ...o, votes: [...o.votes] })) };
  const alreadyOnThis = poll.options[idx].votes.includes(req.user.name);
  for (const o of poll.options) { const i = o.votes.indexOf(req.user.name); if (i !== -1) o.votes.splice(i, 1); }
  if (!alreadyOnThis) poll.options[idx].votes.push(req.user.name);
  const updated = store.update('chat_messages', msg.id, { poll });
  res.json(updated);
});

// Xabarni kanal tepasiga qadash/olib tashlash — kim ham bosishi mumkin (o'qituvchi/admin cheklovi
// frontendda kanal darajasida hal qilinadi, chunki bu yerda alohida "moderator" roli yo'q).
r.put('/:id/pin', (req, res) => {
  const msg = store.get('chat_messages', req.params.id);
  if (!msg) return res.status(404).json({ error: 'Topilmadi' });
  const updated = store.update('chat_messages', msg.id, { pinned: !msg.pinned });
  res.json(updated);
});

// Emoji reaksiya — bosilganda: shu foydalanuvchi shu emoji bilan allaqachon reaksiya bildirgan bo'lsa
// olib tashlanadi (toggle), aks holda qo'shiladi.
r.post('/:id/react', (req, res) => {
  const { emoji } = req.body || {};
  if (!emoji) return res.status(400).json({ error: 'emoji kerak' });
  const msg = store.get('chat_messages', req.params.id);
  if (!msg) return res.status(404).json({ error: 'Topilmadi' });
  const reactions = Array.isArray(msg.reactions) ? [...msg.reactions] : [];
  const existingIdx = reactions.findIndex((r2) => r2.emoji === emoji && r2.sender === req.user.name);
  if (existingIdx !== -1) reactions.splice(existingIdx, 1);
  else reactions.push({ emoji, sender: req.user.name });
  const updated = store.update('chat_messages', msg.id, { reactions });
  res.json(updated);
});

export default r;
