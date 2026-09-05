// Marketplace — o'quvchilar o'z buyumlarini (masalan kitob, kanselyariya) coinlarga sotadi.
// Xarid qilinganda coin sotuvchiga o'tadi va e'lon "sotilgan" deb belgilanadi.
import express from 'express';
import { store, logAudit } from '../db.js';
import { authRequired } from '../auth.js';
import { notifyForStudent } from '../telegram.js';

const r = express.Router();
r.use(authRequired);

const today = () => new Date().toISOString().slice(0, 10);
const now = () => new Date().toISOString().slice(0, 19).replace('T', ' ');
const STAFF_ONLY = (role) => !['student', 'parent', 'guest'].includes(role);

function myStudent(req) {
  if (req.user.role !== 'student') return null;
  return store.all('students').find((s) => s.full_name === req.user.name) || null;
}

r.get('/', (_req, res) => res.json(store.all('marketplace')));

r.post('/', (req, res) => {
  const me = myStudent(req);
  if (!me) return res.status(403).json({ error: "Bu buyruq faqat o'quvchi hisobi uchun ishlaydi." });
  const { item_name, price, description } = req.body || {};
  const p = Number(price) || 0;
  if (!item_name?.trim()) return res.status(400).json({ error: "Mahsulot nomini kiriting." });
  if (p <= 0) return res.status(400).json({ error: "Narx 0 dan katta bo'lsin." });
  const row = store.insert('marketplace', {
    item_name: item_name.trim(), seller: me.full_name, seller_id: me.id,
    price: p, description: (description || '').slice(0, 300), status: 'active', date: today(),
  });
  logAudit(me.full_name, 'marketplace list', item_name.trim());
  res.status(201).json(row);
});

r.post('/:id/buy', (req, res) => {
  const buyer = myStudent(req);
  if (!buyer) return res.status(403).json({ error: "Bu buyruq faqat o'quvchi hisobi uchun ishlaydi." });
  const item = store.get('marketplace', req.params.id);
  if (!item || item.status !== 'active') return res.status(404).json({ error: "Mahsulot topilmadi yoki allaqachon sotilgan." });
  if (item.seller === buyer.full_name) return res.status(400).json({ error: "O'z mahsulotingizni sotib ololmaysiz." });
  const price = Number(item.price) || 0;
  if ((Number(buyer.coins) || 0) < price) return res.status(400).json({ error: "Coin yetarli emas." });

  const seller = store.get('students', item.seller_id) || store.all('students').find((s) => s.full_name === item.seller);
  store.update('students', buyer.id, { coins: (Number(buyer.coins) || 0) - price });
  if (seller) {
    store.update('students', seller.id, { coins: (Number(seller.coins) || 0) + price });
    store.insert('coin_log', { student: seller.full_name, amount: price, reason: `Marketplace: "${item.item_name}" sotildi`, given_by: 'system', at: now() });
    notifyForStudent(seller.id, `🛍️ "${item.item_name}" mahsulotingiz ${buyer.full_name} tomonidan ${price} coinga sotib olindi!`).catch(() => {});
  }
  store.insert('coin_log', { student: buyer.full_name, amount: -price, reason: `Marketplace: "${item.item_name}" sotib olindi`, given_by: 'system', at: now() });
  const updated = store.update('marketplace', item.id, { status: 'sold', buyer: buyer.full_name });
  logAudit(buyer.full_name, 'marketplace buy', item.item_name);
  res.json(updated);
});

r.delete('/:id', (req, res) => {
  const item = store.get('marketplace', req.params.id);
  if (!item) return res.status(404).json({ error: 'Topilmadi' });
  if (item.seller !== req.user.name && !STAFF_ONLY(req.user.role)) return res.status(403).json({ error: "Bu amal uchun ruxsatingiz yo'q." });
  store.remove('marketplace', item.id);
  res.json({ ok: true });
});

export default r;
