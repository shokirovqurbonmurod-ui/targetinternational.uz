import { useEffect, useRef, useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ArrowUp, Hash, Users, User, Search, Plus, Smile, Paperclip, Image, UserPlus, X, Lock, KeyRound, Mic, Video as VideoIcon, Trash2, Download, FileText, Reply, Pin, SmilePlus, ChevronDown, ChevronUp, Crown, Copy, Bot, Phone, Pencil, Check, BarChart3, Bookmark, BellOff, PinOff, Forward, Flag, Info, FileDown, ShieldAlert } from 'lucide-react';
import { api } from '../lib/api.js';
import { Spinner, Modal } from '../components/ui.jsx';
import { useAuth } from '../auth/AuthContext.jsx';
import { useCall } from '../hooks/useCall.js';
import CallOverlay from '../components/CallOverlay.jsx';
import { useGroupCall } from '../hooks/useGroupCall.js';
import GroupCallPanel from '../components/GroupCallPanel.jsx';

const TABS = [
  { key: 'channels', icon: Hash, label: 'Kanallar' },
  { key: 'groups', icon: Users, label: 'Guruhlar' },
  { key: 'private', icon: User, label: 'Shaxsiy' },
];

// "O'qituvchilar" kanaliga faqat xodimlar kira oladi — server ham shu qoidani bajaradi.
const STAFF_ONLY_CHANNELS = ["O'qituvchilar"];

const DEF_CHANNELS = [
  { key: 'Umumiy', icon: '🌐' },
  { key: "O'qituvchilar", icon: '👨‍🏫', staffOnly: true },
  { key: 'Marketing', icon: '📣' },
  { key: 'IELTS', icon: '📝' },
  { key: 'IT / Olimpiada', icon: '💻' },
  { key: 'Matematika', icon: '📐' },
  { key: 'Koreys tili', icon: '🇰🇷' },
];

const EMOJIS = ['😊','👍','❤️','🔥','👏','💪','✅','⭐','🎉','😂','🙏','💯','📚','✍️','🏆','💡','🎓','👋','😍','🤔',
  '😁','🥳','😢','😮','🤝','👌','💥','🌟','🎊','🚀','☕','🍀','🎁','📌','⏰','💤','😴','🤗','😎','👑'];
const QUICK_REACTIONS = ['👍','❤️','😂','🔥','😮','🙏'];
const ROOM_ICONS = ['#️⃣','👥','📚','🎓','💬','🎯','🎨','⚽','🎵','🔬','🌟','🏆','🎮','💻','🇺🇸','🇰🇷','📝','🧮'];

const BOT_NAME = 'Target International School AI';
const PREMIUM_PLANS = [
  { key: '1m', label: '1 oy', coins: 300 },
  { key: '3m', label: '3 oy', coins: 800, save: "11% chegirma" },
  { key: '6m', label: '6 oy', coins: 1500, save: "17% chegirma", popular: true },
  { key: '12m', label: '1 yil', coins: 2700, save: "25% chegirma" },
];

function genInviteCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

const COLORS = ['from-blue-500 to-blue-700','from-emerald-500 to-emerald-700','from-violet-500 to-violet-700','from-amber-500 to-amber-700','from-rose-500 to-rose-700','from-cyan-500 to-cyan-700'];

function avatarColor(name) {
  let h = 0;
  for (let i = 0; i < (name||'').length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return COLORS[Math.abs(h) % COLORS.length];
}

function timeAgo(ts) {
  if (!ts) return '';
  // Server vaqti UTC (Z qirqilgan) — qayta 'Z' qo'shmasak brauzer mahalliy vaqt deb o'qib,
  // soat noto'g'ri farq beradi (masalan hozirgina yozilgan xabar "necha soat oldin" ko'rinardi).
  const d = new Date(ts.replace(' ', 'T') + 'Z');
  const now = new Date();
  const diff = Math.floor((now - d) / 1000);
  if (diff < 60) return 'hozirgina';
  if (diff < 3600) return Math.floor(diff/60) + ' daq oldin';
  if (diff < 86400) return Math.floor(diff/3600) + ' soat oldin';
  return ts.slice(5, 16);
}

const URL_PATTERN = /(https?:\/\/[^\s]+)/g;

// Oddiy matn bo'lagi ichidagi http(s):// havolalarni bosiladigan qilib chizadi.
function linkify(text, keyPrefix) {
  if (!text.includes('http://') && !text.includes('https://')) return text;
  const parts = [];
  let last = 0, m;
  const pattern = new RegExp(URL_PATTERN);
  while ((m = pattern.exec(text))) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    const url = m[1].replace(/[.,!?)\]]+$/, ''); // gap oxiridagi tinish belgilarni havolaga qo'shmaslik
    const trail = m[1].slice(url.length);
    parts.push(<a key={`${keyPrefix}-${m.index}`} href={url} target="_blank" rel="noreferrer" className="underline decoration-1 underline-offset-2 hover:opacity-80" onClick={(e) => e.stopPropagation()}>{url}</a>);
    if (trail) parts.push(trail);
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

// Matn ichidagi "@Ism Familiya" ko'rinishidagi mentionlarni va http(s):// havolalarni topib,
// alohida stil bilan chizadi — mentionlar eng uzun ismlardan boshlab qidiriladi (aks holda
// "@Ali Vali" ichidagi "@Ali" qismi noto'g'ri mos kelib qolardi).
function renderWithMentions(text, allUsers, myName) {
  if (!text) return text;
  const names = [...allUsers.map(u => u.full_name), myName, 'barcha'].filter(Boolean)
    .filter((n, i, arr) => arr.indexOf(n) === i).sort((a, b) => b.length - a.length);
  if (!names.length) return linkify(text, 'lnk');
  const pattern = new RegExp('@(' + names.map(n => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') + ')(?!\\w)', 'g');
  const parts = [];
  let last = 0, m;
  while ((m = pattern.exec(text))) {
    if (m.index > last) parts.push(linkify(text.slice(last, m.index), `lnk-${last}`));
    const isMe = m[1] === myName;
    const isAll = m[1] === 'barcha';
    parts.push(<span key={m.index} className={`font-bold ${isMe || isAll ? 'text-amber-700 bg-amber-100 rounded px-0.5' : 'text-[#0A84FF]'}`}>@{m[1]}</span>);
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(linkify(text.slice(last), `lnk-${last}`));
  return parts;
}

export default function GroupChat() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [messages, setMessages] = useState(null);
  const [allUsers, setAllUsers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [memberships, setMemberships] = useState([]);
  const [tab, setTab] = useState('channels');
  const [channel, setChannel] = useState('Umumiy');
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [searchQ, setSearchQ] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [memberSearch, setMemberSearch] = useState('');
  const [channelMembers, setChannelMembers] = useState({});
  const [chatRooms, setChatRooms] = useState([]);
  const [joinCode, setJoinCode] = useState('');
  const [joinErr, setJoinErr] = useState('');
  const [joining, setJoining] = useState(false);
  const [showCode, setShowCode] = useState(false);
  const [botTyping, setBotTyping] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const [reactionPickerFor, setReactionPickerFor] = useState(null);
  const [whoReacted, setWhoReacted] = useState(null); // { msgId, emoji }
  const [pinnedOpen, setPinnedOpen] = useState(false);
  const [recorder, setRecorder] = useState(null); // { kind: 'audio'|'video', seconds }
  const [newIcon, setNewIcon] = useState(ROOM_ICONS[0]);
  const [customEmojis, setCustomEmojis] = useState([]);
  const [newEmojiInput, setNewEmojiInput] = useState('');
  const [premiumMembers, setPremiumMembers] = useState([]);
  const [showPremium, setShowPremium] = useState(false);
  const [buyingPremium, setBuyingPremium] = useState(false);
  const [premiumErr, setPremiumErr] = useState('');
  const [promoCode, setPromoCode] = useState('');
  const [people, setPeople] = useState([]);
  const [chatBots, setChatBots] = useState([]);
  const [showAddBot, setShowAddBot] = useState(false);
  const [newBotName, setNewBotName] = useState('');
  const [newBotIcon, setNewBotIcon] = useState('🤖');
  const [newBotPersona, setNewBotPersona] = useState('');
  const [readState, setReadState] = useState([]);
  const [pinRows, setPinRows] = useState([]);
  const [muteRows, setMuteRows] = useState([]);
  const [savedMessages, setSavedMessages] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [searchInChannel, setSearchInChannel] = useState('');
  const [showPollForm, setShowPollForm] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '']);
  const [typingRows, setTypingRows] = useState([]);
  const [presenceRows, setPresenceRows] = useState([]);
  const [forwarding, setForwarding] = useState(null); // message being forwarded
  const [forwardTarget, setForwardTarget] = useState('');
  const [showGroupInfo, setShowGroupInfo] = useState(false);
  const [descDraft, setDescDraft] = useState('');
  const [reportingMsg, setReportingMsg] = useState(null);
  const [reportReason, setReportReason] = useState('');
  const [showReports, setShowReports] = useState(false);
  const [allReports, setAllReports] = useState([]);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const videoRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const streamRef = useRef(null);
  const timerRef = useRef(null);

  const isAdmin = ['founder','director','super_admin','branch_manager','admin','academic_manager','head_teacher'].includes(user.role);
  const isStaff = !['student', 'parent', 'guest'].includes(user.role);
  const myStudentRole = user.role === 'student';

  async function load() {
    const [msgs, users, gr, mem, rooms, emojis, premium, people, bots, reads, pins, mutes, saved, presence] = await Promise.all([
      api.get('/chat_messages').catch(() => []),
      api.get('/staff').catch(() => []),
      api.get('/groups').catch(() => []),
      api.get('/group_memberships').catch(() => []),
      api.get('/chat_rooms').catch(() => []),
      api.get('/chat_custom_emojis').catch(() => []),
      api.get('/chat_premium').catch(() => []),
      api.get('/people').catch(() => []),
      api.get('/chat_bots').catch(() => []),
      api.get('/chat_read_state').catch(() => []),
      api.get('/chat_pins').catch(() => []),
      api.get('/chat_mutes').catch(() => []),
      api.get('/chat_saved').catch(() => []),
      api.get('/user_presence').catch(() => []),
    ]);
    setMessages(msgs || []);
    setAllUsers(users || []);
    setGroups(gr || []);
    setMemberships((mem || []).map(m => m.group_name));
    setChatRooms(rooms || []);
    setCustomEmojis(emojis || []);
    setPremiumMembers(premium || []);
    setPeople(people || []);
    setChatBots(bots || []);
    setReadState((reads || []).filter((r) => r.user_name === user.full_name));
    setPinRows((pins || []).filter((p) => p.user_name === user.full_name));
    setMuteRows((mutes || []).filter((m) => m.user_name === user.full_name));
    setSavedMessages((saved || []).filter((s) => s.user_name === user.full_name));
    setPresenceRows(presence || []);
  }

  const nowStr = () => new Date().toISOString().slice(0, 19).replace('T', ' ');
  const isPremium = (name) => premiumMembers.some(p => p.student === name && p.expires_at > nowStr());
  const allEmojis = useMemo(() => [...EMOJIS, ...customEmojis.map(e => e.emoji).filter(Boolean)], [customEmojis]);
  const personByName = useMemo(() => {
    const map = {};
    for (const p of people) map[p.full_name] = p;
    return map;
  }, [people]);
  const avatarUrlFor = (name) => personByName[name]?.avatar_url || '';
  const bioFor = (name) => personByName[name]?.bio || '';

  useEffect(() => { load(); const iv = setInterval(load, 4000); return () => clearInterval(iv); }, []);
  useEffect(() => { setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100); }, [messages, channel]);
  useEffect(() => { setJoinCode(''); setJoinErr(''); setShowCode(false); }, [channel]);

  // Kanal almashtirilganda: eski kanaldagi yozib tugatilmagan xabarni qoralama sifatida saqlab qo'yamiz,
  // yangi kanalning avval saqlangan qoralamasini esa matn maydoniga yuklaymiz (Telegramdagi kabi).
  const prevChannelRef = useRef(channel);
  useEffect(() => {
    const prevChannel = prevChannelRef.current;
    if (prevChannel !== channel) {
      try {
        if (text) localStorage.setItem(`chat_draft_${prevChannel}`, text);
        else localStorage.removeItem(`chat_draft_${prevChannel}`);
      } catch { /* ignore */ }
      try { setText(localStorage.getItem(`chat_draft_${channel}`) || ''); } catch { setText(''); }
      prevChannelRef.current = channel;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channel]);

  // "Link olish" orqali kelingan taklif havolasini (?g=guruh&code=kod) avtomatik qo'llash.
  useEffect(() => {
    if (messages === null) return; // hali yuklanmagan
    const g = searchParams.get('g');
    const code = searchParams.get('code');
    if (!g || !code) return;
    setSearchParams({}, { replace: true });
    setTab('groups');
    setChannel(g);
    if (!memberships.includes(g)) {
      api.post('/group_memberships/join', { group_name: g, code })
        .then(() => setMemberships((m) => [...new Set([...m, g])]))
        .catch((e) => setJoinErr(e.message));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages]);

  // Kiruvchi qo'ng'iroq bannerida "Ochish" bosilganda (?dm=Ism) shu shaxsiy suhbatga o'tkazadi.
  useEffect(() => {
    const dm = searchParams.get('dm');
    if (!dm) return;
    setSearchParams({}, { replace: true });
    setTab('private');
    setChannel(`DM:${[user.full_name, dm].sort().join(':')}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const visibleChannels = useMemo(() =>
    DEF_CHANNELS.filter(c => !c.staffOnly || isStaff), [isStaff]);

  const groupItems = useMemo(() => groups.map(g => ({
    key: g.name, icon: '👥', teacher: g.teacher, id: g.id,
  })), [groups]);

  const botKey = useMemo(() => `DM:${[user.full_name, BOT_NAME].sort().join(':')}`, [user.full_name]);

  // Asosiy Target International School AI + admin qo'shgan qo'shimcha botlar — barchasi "Shaxsiy" bo'limida DM sifatida chiqadi.
  const botEntries = useMemo(() => {
    const defaultBot = { key: botKey, icon: '🤖', label: BOT_NAME, role: 'AI yordamchi', isBot: true, persona: null, botId: null };
    const extra = chatBots.map((b) => ({
      key: `DM:${[user.full_name, b.name].sort().join(':')}`, icon: b.icon || '🤖', label: b.name,
      role: 'AI bot', isBot: true, persona: b.persona, botId: b.id,
    }));
    return [defaultBot, ...extra];
  }, [chatBots, botKey, user.full_name]);

  const customChannels = useMemo(() => chatRooms.filter(r => r.type === 'channel').map(r => ({ key: r.name, icon: r.icon || '#️⃣', roomId: r.id, inviteCode: r.invite_code, createdBy: r.created_by })), [chatRooms]);
  const customGroups = useMemo(() => chatRooms.filter(r => r.type === 'group').map(r => ({ key: r.name, icon: r.icon || '👥', roomId: r.id, inviteCode: r.invite_code, createdBy: r.created_by })), [chatRooms]);

  const SAVED_KEY = `SAVED:${user.full_name}`;
  const isPinnedChat = (key) => pinRows.some((p) => p.channel === key);

  const items = useMemo(() => {
    if (tab === 'channels') return [...visibleChannels, ...customChannels];
    if (tab === 'groups') return [...groupItems, ...customGroups];
    const humans = allUsers.filter(u2 => u2.full_name !== user.full_name)
      .map(u2 => ({ key: `DM:${[user.full_name, u2.full_name].sort().join(':')}`, icon: '👤', label: u2.full_name, role: u2.role_label, avatarUrl: u2.avatar_url }));
    const savedEntry = { key: SAVED_KEY, icon: '🔖', label: 'Saqlangan xabarlar', role: 'Shaxsiy arxiv', isSavedView: true };
    return [savedEntry, ...botEntries, ...humans];
  }, [tab, allUsers, customChannels, customGroups, user, visibleChannels, groupItems, botEntries]);

  const activeBot = useMemo(() => botEntries.find((b) => b.key === channel), [botEntries, channel]);
  const isBotChannel = tab === 'private' && !!activeBot;
  const botIconByName = useMemo(() => {
    const map = {};
    for (const b of botEntries) map[b.label] = b.icon;
    return map;
  }, [botEntries]);

  const customGroupRoom = useMemo(() => chatRooms.find(r => r.type === 'group' && r.name === channel), [chatRooms, channel]);
  const isLocked = tab === 'groups' && !isStaff && !isAdmin && !memberships.includes(channel)
    && customGroupRoom?.created_by !== user.full_name
    && (groups.some(g => g.name === channel) || !!customGroupRoom);
  const currentInviteCode = groups.find(g => g.name === channel)?.invite_code || customGroupRoom?.invite_code;

  // Guruh egasi (yaratuvchi) yoki u tayinlagan "guruh admin"i — shu guruh doirasida xabar
  // o'chirish/a'zolarni boshqarish huquqiga ega, lekin butun tizim admini emas.
  const isRoomOwner = !!customGroupRoom && customGroupRoom.created_by === user.full_name;
  const isRoomAdmin = isRoomOwner || (Array.isArray(customGroupRoom?.admins) && customGroupRoom.admins.includes(user.full_name));
  const canModerate = isAdmin || isRoomAdmin;

  async function toggleRoomAdmin(name) {
    if (!customGroupRoom) return;
    const currentlyAdmin = Array.isArray(customGroupRoom.admins) && customGroupRoom.admins.includes(name);
    try {
      if (currentlyAdmin) await api.del(`/chat_rooms/${customGroupRoom.id}/admins/${encodeURIComponent(name)}`);
      else await api.post(`/chat_rooms/${customGroupRoom.id}/admins`, { user_name: name });
      await load();
    } catch (e) { alert(e.message); }
  }

  async function joinGroup() {
    setJoinErr(''); setJoining(true);
    try {
      await api.post('/group_memberships/join', { group_name: channel, code: joinCode });
      setMemberships(m => [...new Set([...m, channel])]);
      setJoinCode('');
    } catch (e) { setJoinErr(e.message); }
    setJoining(false);
  }

  const filteredItems = (searchQ.trim()
    ? items.filter(it => (it.label || it.key).toLowerCase().includes(searchQ.toLowerCase()))
    : items
  ).slice().sort((a, b) => (isPinnedChat(b.key) ? 1 : 0) - (isPinnedChat(a.key) ? 1 : 0));

  const filtered = useMemo(() => {
    if (channel === SAVED_KEY) {
      const ids = new Set(savedMessages.map((s) => String(s.message_id)));
      return (messages || []).filter((m) => ids.has(String(m.id))).sort((a, b) => (a.id || 0) - (b.id || 0));
    }
    return (messages || [])
      .filter(m => {
        if (tab === 'private' && channel.startsWith('DM:')) {
          const names = channel.replace('DM:', '').split(':');
          const mNames = (m.channel || '').replace('DM:', '').split(':');
          return names.every(n => mNames.includes(n));
        }
        return m.channel === channel;
      })
      .sort((a, b) => (a.id || 0) - (b.id || 0));
  }, [messages, channel, tab, savedMessages, SAVED_KEY]);

  const pinnedInChannel = useMemo(() => filtered.filter(m => m.pinned), [filtered]);
  const visibleMessages = useMemo(() => {
    if (!searchInChannel.trim()) return filtered;
    const q = searchInChannel.trim().toLowerCase();
    return filtered.filter((m) => (m.text || '').toLowerCase().includes(q) || (m.media_name || '').toLowerCase().includes(q));
  }, [filtered, searchInChannel]);

  // Kanal a'zolari
  const members = useMemo(() => {
    const senders = [...new Set(filtered.map(m => m.sender))];
    return allUsers.filter(u => senders.includes(u.full_name) || u.full_name === user.full_name);
  }, [filtered, allUsers, user]);

  async function send(extraText) {
    const msg = extraText || text.trim();
    if (!msg || sending) return;
    setSending(true);
    const bot = activeBot;
    try {
      await api.post('/chat_messages', {
        channel, sender: user.full_name, sender_role: user.role,
        text: msg,
        timestamp: new Date().toISOString().slice(0, 16).replace('T', ' '),
        reply_to: replyingTo?.id || undefined,
      });
      setText('');
      setShowEmoji(false);
      setReplyingTo(null);
      await load();
      if (bot) {
        setBotTyping(true);
        const history = (messages || [])
          .filter((m) => m.channel === bot.key)
          .slice(-12)
          .map((m) => ({ role: m.sender === bot.label ? 'assistant' : 'user', text: m.text }));
        let reply = '';
        try {
          await api.aiChatStream({ message: msg, history, session: `chat-bot-${bot.botId || 'default'}-${user.full_name}`, persona: bot.persona || undefined }, (full) => { reply = full; });
        } catch (e) { reply = "Kechirasiz, hozir javob bera olmadim. Birozdan so'ng qayta urinib ko'ring."; }
        await api.post('/chat_messages', {
          channel: bot.key, sender: bot.label, sender_role: 'bot',
          text: reply || '...',
          timestamp: new Date().toISOString().slice(0, 16).replace('T', ' '),
        }).catch(() => {});
        setBotTyping(false);
        await load();
      }
    } catch (e) { console.error(e); }
    setSending(false);
    inputRef.current?.focus();
  }

  function addEmoji(e) { setText(prev => prev + e); }

  async function togglePin(m) {
    await api.put(`/chat_messages/${m.id}/pin`, {}).catch(() => {});
    await load();
  }

  function startEdit(m) { setEditingId(m.id); setEditText(m.text || ''); }
  function cancelEdit() { setEditingId(null); setEditText(''); }
  async function saveEdit(m) {
    if (!editText.trim()) return;
    try {
      await api.put(`/chat_messages/${m.id}/edit`, { text: editText.trim() });
      setEditingId(null); setEditText('');
      await load();
    } catch (e) { alert(e.message); }
  }

  async function votePoll(m, optionIdx) {
    await api.post(`/chat_messages/${m.id}/poll-vote`, { option: optionIdx }).catch((e) => alert(e.message));
    await load();
  }

  async function submitPoll() {
    const q = pollQuestion.trim();
    const opts = pollOptions.map((o) => o.trim()).filter(Boolean);
    if (!q || opts.length < 2) return;
    try {
      await api.post('/chat_messages', {
        channel, sender: user.full_name, sender_role: user.role, text: '',
        timestamp: new Date().toISOString().slice(0, 16).replace('T', ' '),
        poll: { question: q, options: opts },
      });
      setShowPollForm(false); setPollQuestion(''); setPollOptions(['', '']);
      await load();
    } catch (e) { alert(e.message); }
  }

  const myPremiumActive = isPremium(user.full_name);

  async function buyPremium(planKey) {
    setPremiumErr(''); setBuyingPremium(planKey);
    try {
      await api.post('/chat-premium/buy', { plan: planKey, promo_code: promoCode.trim() || undefined });
      setPromoCode('');
      await load();
    } catch (e) { setPremiumErr(e.message); }
    setBuyingPremium(false);
  }

  async function deleteMessage(m) {
    if (!confirm("Xabarni o'chirmoqchimisiz?")) return;
    await api.del(`/chat_messages/${m.id}`).catch(() => {});
    if (m.media_url) {
      const filename = m.media_url.split('/').pop();
      await api.del(`/uploads/${filename}`).catch(() => {});
    }
    await load();
  }

  async function toggleReaction(m, emoji) {
    setReactionPickerFor(null);
    await api.post(`/chat_messages/${m.id}/react`, { emoji }).catch(() => {});
    await load();
  }

  function reactionGroups(m) {
    const list = Array.isArray(m.reactions) ? m.reactions : [];
    const byEmoji = {};
    for (const r of list) (byEmoji[r.emoji] ||= []).push(r.sender);
    return Object.entries(byEmoji);
  }

  // "@" dan keyingi bo'shliqsiz so'zga qarab (masalan "@Diyor") mos keladigan foydalanuvchilarni
  // taklif qiladi — tanlanganda to'liq ism qo'yiladi.
  const mentionQuery = useMemo(() => {
    const m = text.match(/@(\S{0,20})$/);
    return m ? m[1] : null;
  }, [text]);
  const mentionSuggestions = useMemo(() => {
    if (mentionQuery === null) return [];
    const q = mentionQuery.toLowerCase();
    const people = allUsers.filter(u => u.full_name.toLowerCase().split(' ').some(w => w.startsWith(q))).slice(0, 5);
    const inGroupChat = tab !== 'private';
    if (inGroupChat && 'barcha'.startsWith(q) && q.length > 0) {
      return [{ id: '__all__', full_name: 'barcha' }, ...people].slice(0, 5);
    }
    return people;
  }, [mentionQuery, allUsers, tab]);

  function pickMention(u) {
    setText(prev => prev.replace(/@(\S{0,20})$/, `@${u.full_name} `));
    inputRef.current?.focus();
  }

  const fileRef = useRef(null);
  const imgRef = useRef(null);

  async function sendMedia(media_url, media_type, media_name, caption = '') {
    await api.post('/chat_messages', {
      channel, sender: user.full_name, sender_role: user.role,
      text: caption, media_url, media_type, media_name,
      timestamp: new Date().toISOString().slice(0, 16).replace('T', ' '),
    });
    await load();
  }

  async function handleFile(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploadingMedia(true);
    try {
      const res = await api.upload(file);
      await sendMedia(res.url, 'file', res.name);
    } catch (err) { alert(err.message); }
    setUploadingMedia(false);
  }

  async function handleImage(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploadingMedia(true);
    try {
      const res = await api.upload(file);
      await sendMedia(res.url, 'image', res.name);
    } catch (err) { alert(err.message); }
    setUploadingMedia(false);
  }

  // ── Ovozli / video xabar yozib olish ──
  async function startRecording(kind) {
    try {
      const constraints = kind === 'video' ? { video: true, audio: true } : { audio: true };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      chunksRef.current = [];
      if (kind === 'video' && videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
      const mr = new MediaRecorder(stream);
      mr.ondataavailable = (ev) => { if (ev.data.size > 0) chunksRef.current.push(ev.data); };
      mr.start();
      mediaRecorderRef.current = mr;
      setRecorder({ kind, seconds: 0 });
      // Video xabarlar Telegramdek maksimum 2 daqiqa bilan cheklangan — vaqt tugaganda avtomatik yuboriladi.
      timerRef.current = setInterval(() => setRecorder((r) => {
        if (!r) return r;
        const next = r.seconds + 1;
        if (kind === 'video' && next >= 120) { setTimeout(() => finishRecording(), 0); return r; }
        return { ...r, seconds: next };
      }), 1000);
    } catch (err) {
      alert("Mikrofon/kameraga ruxsat berilmadi: " + err.message);
    }
  }

  function stopStream() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    clearInterval(timerRef.current);
  }

  function cancelRecording() {
    mediaRecorderRef.current?.stop();
    stopStream();
    setRecorder(null);
    chunksRef.current = [];
  }

  async function finishRecording() {
    const kind = recorder?.kind;
    const mr = mediaRecorderRef.current;
    if (!mr) return;
    const blobPromise = new Promise((resolve) => { mr.onstop = () => resolve(new Blob(chunksRef.current, { type: mr.mimeType })); });
    mr.stop();
    stopStream();
    setRecorder(null);
    const blob = await blobPromise;
    const ext = kind === 'video' ? 'webm' : 'webm';
    const file = new File([blob], `${kind === 'video' ? 'video' : 'ovozli'}-xabar-${Date.now()}.${ext}`, { type: blob.type || (kind === 'video' ? 'video/webm' : 'audio/webm') });
    setUploadingMedia(true);
    try {
      const res = await api.upload(file);
      await sendMedia(res.url, kind === 'video' ? 'video' : 'audio', res.name);
    } catch (err) { alert(err.message); }
    setUploadingMedia(false);
  }

  function addMember(userName) {
    setChannelMembers(prev => ({
      ...prev,
      [channel]: [...new Set([...(prev[channel] || []), userName])],
    }));
  }

  function removeMember(userName) {
    setChannelMembers(prev => ({
      ...prev,
      [channel]: (prev[channel] || []).filter(n => n !== userName),
    }));
  }

  const currentMembers = channelMembers[channel] || [];
  const availableUsers = allUsers.filter(u => 
    !currentMembers.includes(u.full_name) && 
    u.full_name !== user.full_name &&
    (!memberSearch.trim() || u.full_name.toLowerCase().includes(memberSearch.toLowerCase()))
  );

  async function deleteItem(it) {
    if (!confirm('Rostdan o\'chirmoqchimisiz?')) return;
    await api.del(`/chat_rooms/${it.roomId}`).catch(() => {});
    if (channel === it.key) setChannel(tab === 'channels' ? 'Umumiy' : groupItems[0]?.key || '');
    await load();
  }

  async function addNew() {
    if (!newName.trim()) return;
    try {
      await api.post('/chat_rooms', {
        type: tab === 'channels' ? 'channel' : 'group',
        name: newName.trim(),
        icon: newIcon,
        created_by: user.full_name,
        date: new Date().toISOString().slice(0, 10),
        invite_code: genInviteCode(),
      });
      setChannel(newName.trim());
      setShowNew(false); setNewName(''); setNewIcon(ROOM_ICONS[0]);
      await load();
    } catch (e) { alert(e.message); }
  }

  const displayChannel = channel === SAVED_KEY
    ? 'Saqlangan xabarlar'
    : tab === 'private'
      ? channel.replace('DM:', '').split(':').find(n => n !== user.full_name) || channel
      : channel;

  // Qo'ng'iroq faqat shaxsiy (bot bo'lmagan) suhbatlarda mumkin.
  const callPeerName = (tab === 'private' && !isBotChannel && channel.startsWith('DM:')) ? displayChannel : null;
  const call = useCall({ channel, peerName: callPeerName, myName: user.full_name, enabled: !!callPeerName });
  const groupCallEnabled = (tab === 'channels' || tab === 'groups') && !isLocked;
  const groupCall = useGroupCall({ channel, myName: user.full_name, enabled: groupCallEnabled });

  const readStateFor = (ch) => readState.find((r) => r.channel === ch);
  const unreadCount = (ch) => {
    const lastId = Number(readStateFor(ch)?.last_read_id) || 0;
    return (messages || []).filter((m) => m.channel === ch && Number(m.id) > lastId && m.sender !== user.full_name).length;
  };
  const isMutedChat = (key) => muteRows.some((m) => m.channel === key);

  async function toggleChatPin(key) {
    const row = pinRows.find((p) => p.channel === key);
    if (row) await api.del(`/chat_pins/${row.id}`).catch(() => {});
    else await api.post('/chat_pins', { user_name: user.full_name, channel: key }).catch(() => {});
    await load();
  }

  async function toggleChatMute(key) {
    const row = muteRows.find((m) => m.channel === key);
    if (row) await api.del(`/chat_mutes/${row.id}`).catch(() => {});
    else await api.post('/chat_mutes', { user_name: user.full_name, channel: key }).catch(() => {});
    await load();
  }

  // Kanalni ochganda (yoki unga yangi xabar kelganda, hozir shu yerda o'tirganimizda) "o'qilgan" deb belgilaymiz.
  useEffect(() => {
    if (!messages || !channel) return;
    const maxId = Math.max(0, ...messages.filter((m) => m.channel === channel).map((m) => Number(m.id) || 0));
    if (maxId === 0) return;
    const existing = readStateFor(channel);
    if (existing && Number(existing.last_read_id) >= maxId) return;
    if (existing) api.put(`/chat_read_state/${existing.id}`, { last_read_id: maxId }).then(() => setReadState((rs) => rs.map((r) => r.id === existing.id ? { ...r, last_read_id: maxId } : r))).catch(() => {});
    else api.post('/chat_read_state', { user_name: user.full_name, channel, last_read_id: maxId }).then((row) => setReadState((rs) => [...rs, row])).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channel, messages]);

  const isSaved = (msgId) => savedMessages.some((s) => String(s.message_id) === String(msgId));
  async function toggleSaved(m) {
    const existing = savedMessages.find((s) => String(s.message_id) === String(m.id));
    if (existing) await api.del(`/chat_saved/${existing.id}`).catch(() => {});
    else await api.post('/chat_saved', { user_name: user.full_name, message_id: m.id, date: new Date().toISOString().slice(0, 10) }).catch(() => {});
    await load();
  }

  // Online/oxirgi faollik — har 20 soniyada "men shu yerdaman" signalini yuboradi;
  // boshqalar buni /user_presence orqali ko'radi ("hozir onlayn" yoki "N daqiqa oldin faol edi").
  const myPresenceIdRef = useRef(null);
  useEffect(() => {
    async function beat() {
      const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
      if (myPresenceIdRef.current) {
        api.put(`/user_presence/${myPresenceIdRef.current}`, { last_seen: now }).catch(() => {});
      } else {
        const mine = presenceRows.find((p) => p.user_name === user.full_name);
        if (mine) { myPresenceIdRef.current = mine.id; api.put(`/user_presence/${mine.id}`, { last_seen: now }).catch(() => {}); }
        else api.post('/user_presence', { user_name: user.full_name, last_seen: now }).then((row) => { myPresenceIdRef.current = row.id; }).catch(() => {});
      }
    }
    beat();
    const iv = setInterval(beat, 20000);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ONLINE_WINDOW_MS = 60000; // 1 daqiqa ichida signal kelgan bo'lsa — "onlayn"
  function presenceFor(name) { return presenceRows.find((p) => p.user_name === name); }
  function isOnline(name) {
    const p = presenceFor(name);
    if (!p?.last_seen) return false;
    return Date.now() - new Date(p.last_seen.replace(' ', 'T') + 'Z').getTime() < ONLINE_WINDOW_MS;
  }
  function lastSeenText(name) {
    const p = presenceFor(name);
    if (!p?.last_seen) return '';
    if (isOnline(name)) return 'onlayn';
    return "oxirgi faollik: " + timeAgo(p.last_seen);
  }

  // Yozayotganlik belgisi — matn kiritilayotganda kanalga "men yozyapman" signali yuboriladi
  // (2s throttling bilan, o'sha kanaldagi mavjud yozuvi bo'lsa yangilanadi — yangi qator ochilavermaydi),
  // boshqalar buni tez (1.5s) poll orqali ko'radi va 4s dan eski bo'lsa yashiradi.
  // crudRouter'ning umumiy GET'i o'zboshimcha query-filtrlarni (masalan ?channel=) qo'llamaydi,
  // shuning uchun kanal bo'yicha filtrlash mijoz tomonida bajariladi.
  const lastTypingSentRef = useRef(0);
  const myTypingRowIdRef = useRef(null);
  function notifyTyping() {
    if (!channel || channel === SAVED_KEY || isBotChannel) return;
    const now = Date.now();
    if (now - lastTypingSentRef.current < 2000) return;
    lastTypingSentRef.current = now;
    const at = new Date().toISOString().slice(0, 19).replace('T', ' ');
    if (myTypingRowIdRef.current) {
      api.put(`/chat_typing/${myTypingRowIdRef.current}`, { user_name: user.full_name, channel, at }).catch(() => {});
    } else {
      api.post('/chat_typing', { user_name: user.full_name, channel, at }).then((row) => { myTypingRowIdRef.current = row.id; }).catch(() => {});
    }
  }
  useEffect(() => { myTypingRowIdRef.current = null; }, [channel]);
  useEffect(() => {
    if (!channel || channel === SAVED_KEY || isBotChannel) { setTypingRows([]); return; }
    const iv = setInterval(async () => {
      const rows = await api.get('/chat_typing').catch(() => []);
      setTypingRows((rows || []).filter((t) => t.channel === channel));
    }, 1500);
    return () => clearInterval(iv);
  }, [channel, isBotChannel]);
  const typingUsers = useMemo(() => {
    const cutoff = Date.now() - 4000;
    return typingRows.filter((t) => t.user_name !== user.full_name && new Date(t.at.replace(' ', 'T') + 'Z').getTime() > cutoff).map((t) => t.user_name);
  }, [typingRows, user.full_name]);

  const forwardDestinations = useMemo(() => {
    const humans = allUsers.filter((u2) => u2.full_name !== user.full_name)
      .map((u2) => ({ key: `DM:${[user.full_name, u2.full_name].sort().join(':')}`, label: u2.full_name, group: 'Shaxsiy' }));
    return [
      ...visibleChannels.map((c) => ({ key: c.key, label: c.key, group: 'Kanallar' })),
      ...customChannels.map((c) => ({ key: c.key, label: c.key, group: 'Kanallar' })),
      ...groupItems.map((g) => ({ key: g.key, label: g.key, group: 'Guruhlar' })),
      ...customGroups.map((g) => ({ key: g.key, label: g.key, group: 'Guruhlar' })),
      ...humans,
    ];
  }, [visibleChannels, customChannels, groupItems, customGroups, allUsers, user.full_name]);

  function startForward(m) { setForwarding(m); setForwardTarget(''); }
  async function submitForward() {
    if (!forwarding || !forwardTarget) return;
    try {
      await api.post('/chat_messages', {
        channel: forwardTarget, sender: user.full_name, sender_role: user.role,
        text: forwarding.text || '', media_url: forwarding.media_url, media_type: forwarding.media_type, media_name: forwarding.media_name,
        timestamp: new Date().toISOString().slice(0, 16).replace('T', ' '),
        forwarded_from: forwarding.sender,
      });
      setForwarding(null); setForwardTarget('');
      await load();
    } catch (e) { alert(e.message); }
  }

  function startReport(m) { setReportingMsg(m); setReportReason(''); }
  async function submitReport() {
    if (!reportingMsg || !reportReason.trim()) return;
    try {
      await api.post('/chat_reports', {
        message_id: reportingMsg.id, reported_by: user.full_name, reason: reportReason.trim(),
        message_snippet: (reportingMsg.text || reportingMsg.media_name || 'media').slice(0, 140),
        message_sender: reportingMsg.sender, channel: reportingMsg.channel,
        date: new Date().toISOString().slice(0, 10), status: 'new',
      });
      setReportingMsg(null); setReportReason('');
      alert("Shikoyat yuborildi. Rahmat!");
    } catch (e) { alert(e.message); }
  }

  async function openReportsPanel() {
    setShowReports(true);
    const rows = await api.get('/chat_reports').catch(() => []);
    setAllReports((rows || []).sort((a, b) => (b.id || 0) - (a.id || 0)));
  }
  async function resolveReport(r) {
    await api.put(`/chat_reports/${r.id}`, { status: 'resolved' }).catch(() => {});
    setAllReports((rows) => rows.map((x) => x.id === r.id ? { ...x, status: 'resolved' } : x));
  }

  async function exportChat() {
    const lines = filtered.map((m) => `[${m.timestamp}] ${m.sender}: ${m.text || (m.media_name ? `[${m.media_type}: ${m.media_name}]` : '[media]')}`);
    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${displayChannel.replace(/[^\w\s-]/g, '')}-chat.txt`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  async function saveGroupDescription() {
    if (!customGroupRoom) return;
    await api.put(`/chat_rooms/${customGroupRoom.id}`, { description: descDraft.trim() }).catch((e) => alert(e.message));
    await load();
    setShowGroupInfo(false);
  }


  if (messages === null) return <Spinner />;

  return (
    <div className="card overflow-hidden" style={{ height: 'calc(100vh - 130px)' }}>
      <div className="flex h-full">
        {/* Chap panel */}
        <div className="w-64 shrink-0 border-r border-navy-100 bg-navy-50/30 flex flex-col">
          <div className="flex border-b border-navy-100">
            {TABS.map(t => (
              <button key={t.key} onClick={() => { setTab(t.key); setSearchQ(''); }}
                className={`flex-1 flex items-center justify-center gap-1 py-2.5 text-[11px] font-bold transition ${
                  tab === t.key ? 'text-gold-600 border-b-2 border-gold bg-white' : 'text-navy-400 hover:text-navy-600'}`}>
                <t.icon size={13} /> {t.label}
              </button>
            ))}
          </div>

          <div className="px-2 py-1.5 border-b border-navy-100">
            <div className="relative">
              <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-navy-300" />
              <input className="input !py-1 !pl-7 text-xs" placeholder="Qidirish..." value={searchQ} onChange={e => setSearchQ(e.target.value)} />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-1.5 space-y-0.5">
            {filteredItems.map(it => {
              const on = channel === it.key;
              const locked = tab === 'groups' && !isStaff && !isAdmin && !memberships.includes(it.key);
              const unread = it.isSavedView ? 0 : unreadCount(it.key);
              const pinned = isPinnedChat(it.key);
              const muted = isMutedChat(it.key);
              return (
                <div key={it.key} role="button" tabIndex={0} onClick={() => setChannel(it.key)}
                  onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setChannel(it.key)}
                  className={`group w-full flex items-center gap-2.5 rounded-2xl px-2.5 py-2 text-left transition cursor-pointer ${
                    on ? 'bg-[#E9E9EB]' : 'hover:bg-navy-100/50'}`}>
                  <div className="relative shrink-0">
                    {it.avatarUrl ? (
                      <img src={api.fileUrl(it.avatarUrl)} alt={it.label} className="w-10 h-10 rounded-full object-cover shadow-sm" />
                    ) : (
                      <span className="grid place-items-center w-10 h-10 rounded-full bg-white shadow-sm text-lg">{it.icon}</span>
                    )}
                    {tab === 'private' && !it.isBot && !it.isSavedView && isOnline(it.label || it.key) && (
                      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-semibold text-[#1c1c1e] truncate flex items-center gap-1">
                      {pinned && <Pin size={9} className="text-gold-500 shrink-0" />}
                      {it.label || it.key}
                    </div>
                    {it.role && <div className="text-[10px] text-navy-400 truncate">{it.role}</div>}
                    {it.teacher && <div className="text-[10px] text-navy-400 truncate">{it.teacher}</div>}
                  </div>
                  {locked && <Lock size={12} className="text-navy-300 shrink-0" />}
                  {muted && <BellOff size={11} className="text-navy-300 shrink-0" />}
                  {!muted && unread > 0 && (
                    <span className="grid place-items-center min-w-[18px] h-[18px] px-1 rounded-full bg-[#0A84FF] text-white text-[9px] font-bold shrink-0">{unread}</span>
                  )}
                  {!it.isSavedView && (
                    <button onClick={(e) => { e.stopPropagation(); toggleChatPin(it.key); }}
                      className={`shrink-0 ${pinned ? 'text-gold-500' : 'opacity-0 group-hover:opacity-100 text-navy-300 hover:text-gold-600'}`} title={pinned ? "Qadashni bekor qilish" : "Yuqoriga qadash"}>
                      {pinned ? <PinOff size={12} /> : <Pin size={12} />}
                    </button>
                  )}
                  {(isAdmin || it.createdBy === user.full_name) && it.roomId && (
                    <button onClick={(e) => { e.stopPropagation(); deleteItem(it); }}
                      className="opacity-0 group-hover:opacity-100 text-navy-300 hover:text-red-500 shrink-0" title="O'chirish">
                      <X size={12} />
                    </button>
                  )}
                  {isAdmin && it.botId && (
                    <button onClick={async (e) => {
                      e.stopPropagation();
                      if (!confirm("Botni o'chirmoqchimisiz?")) return;
                      await api.del(`/chat_bots/${it.botId}`).catch(() => {});
                      await load();
                    }} className="opacity-0 group-hover:opacity-100 text-navy-300 hover:text-red-500 shrink-0" title="Botni o'chirish">
                      <X size={12} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {tab !== 'private' && (
            <div className="p-1.5 border-t border-navy-100">
              {showNew ? (
                <div className="p-1.5">
                  <div className="flex flex-wrap gap-1 mb-1.5 p-1.5 bg-navy-50 rounded-xl">
                    {ROOM_ICONS.map(ic => (
                      <button key={ic} onClick={() => setNewIcon(ic)}
                        className={`grid place-items-center w-6 h-6 rounded-lg text-sm transition ${newIcon === ic ? 'bg-gold/20 ring-1 ring-gold' : 'hover:bg-white'}`}>
                        {ic}
                      </button>
                    ))}
                  </div>
                  <input className="input !py-1 text-xs mb-1.5" placeholder="Nom..." autoFocus
                    value={newName} onChange={e => setNewName(e.target.value)} onKeyDown={e => e.key === 'Enter' && addNew()} />
                  <div className="flex gap-1">
                    <button onClick={() => setShowNew(false)} className="btn-ghost flex-1 text-[10px] !py-1">Bekor</button>
                    <button onClick={addNew} className="btn-gold flex-1 text-[10px] !py-1">Yaratish</button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setShowNew(true)}
                  className="w-full flex items-center justify-center gap-1 rounded-lg border border-dashed border-navy-200 px-2 py-1.5 text-[10px] text-navy-500 hover:border-gold hover:text-gold-600 transition">
                  <Plus size={12} /> Yangi {tab === 'channels' ? 'kanal' : 'guruh'}
                </button>
              )}
            </div>
          )}

          {tab === 'private' && isAdmin && (
            <div className="p-1.5 border-t border-navy-100">
              {showAddBot ? (
                <div className="p-1.5">
                  <div className="flex flex-wrap gap-1 mb-1.5 p-1.5 bg-navy-50 rounded-xl">
                    {['🤖','🧠','📖','✍️','🗣️','🎯','💡','🌟'].map(ic => (
                      <button key={ic} onClick={() => setNewBotIcon(ic)}
                        className={`grid place-items-center w-6 h-6 rounded-lg text-sm transition ${newBotIcon === ic ? 'bg-gold/20 ring-1 ring-gold' : 'hover:bg-white'}`}>
                        {ic}
                      </button>
                    ))}
                  </div>
                  <input className="input !py-1 text-xs mb-1.5" placeholder="Bot nomi..."
                    value={newBotName} onChange={e => setNewBotName(e.target.value)} />
                  <textarea className="input !py-1 text-xs mb-1.5 resize-none" rows={2} placeholder="Persona (masalan: Siz grammatikadan yordam beruvchi qat'iy o'qituvchisiz...)"
                    value={newBotPersona} onChange={e => setNewBotPersona(e.target.value)} />
                  <div className="flex gap-1">
                    <button onClick={() => setShowAddBot(false)} className="btn-ghost flex-1 text-[10px] !py-1">Bekor</button>
                    <button onClick={async () => {
                      if (!newBotName.trim()) return;
                      await api.post('/chat_bots', { name: newBotName.trim(), icon: newBotIcon, persona: newBotPersona.trim(), created_by: user.full_name, date: new Date().toISOString().slice(0, 10) }).catch((e) => alert(e.message));
                      setShowAddBot(false); setNewBotName(''); setNewBotPersona(''); setNewBotIcon('🤖');
                      await load();
                    }} className="btn-gold flex-1 text-[10px] !py-1">Yaratish</button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setShowAddBot(true)}
                  className="w-full flex items-center justify-center gap-1 rounded-lg border border-dashed border-navy-200 px-2 py-1.5 text-[10px] text-navy-500 hover:border-gold hover:text-gold-600 transition">
                  <Plus size={12} /> Yangi bot
                </button>
              )}
            </div>
          )}
        </div>

        {/* Chat */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="px-4 py-2.5 border-b border-navy-100 flex items-center gap-3 bg-white/50">
            <div className="flex-1 min-w-0">
              <div className="font-bold text-navy-800 truncate">{displayChannel}</div>
              {tab === 'private' && !isBotChannel && channel !== SAVED_KEY ? (
                <div className={`text-[10px] truncate ${isOnline(displayChannel) ? 'text-emerald-600 font-semibold' : 'text-navy-400'}`}>
                  {lastSeenText(displayChannel) || bioFor(displayChannel) || ' '}
                </div>
              ) : customGroupRoom?.description ? (
                <div className="text-[10px] text-navy-400 truncate">{customGroupRoom.description}</div>
              ) : (
                <div className="text-[10px] text-navy-400">{filtered.length} xabar · {members.length} a'zo</div>
              )}
            </div>
            {tab === 'groups' && (isStaff || customGroupRoom?.created_by === user.full_name) && (groups.some(g => g.name === channel) || customGroupRoom) && (
              showCode ? (
                <button onClick={() => { navigator.clipboard?.writeText(currentInviteCode || ''); setShowCode(false); }}
                  className="chip bg-gold/10 text-gold-700 hover:bg-gold/20 transition shrink-0" title="Nusxalash">
                  <Copy size={11} className="inline -mt-0.5 mr-1" /> {currentInviteCode || '—'}
                </button>
              ) : (
                <button onClick={() => setShowCode(true)} className="chip bg-gold/10 text-gold-700 hover:bg-gold/20 transition shrink-0" title="Taklif kodi">
                  <KeyRound size={11} className="inline -mt-0.5 mr-1" /> Kodni ko'rsatish
                </button>
              )
            )}
            {customGroupRoom && (isRoomAdmin || isAdmin) && (
              <button onClick={() => { setDescDraft(customGroupRoom.description || ''); setShowGroupInfo(true); }} className="grid place-items-center w-8 h-8 rounded-lg hover:bg-navy-50 text-navy-400 transition shrink-0" title="Guruh haqida">
                <Info size={16} />
              </button>
            )}
            {channel !== SAVED_KEY && filtered.length > 0 && (
              <button onClick={exportChat} className="grid place-items-center w-8 h-8 rounded-lg hover:bg-navy-50 text-navy-400 transition shrink-0" title="Suhbatni yuklab olish">
                <FileDown size={16} />
              </button>
            )}
            {isAdmin && (
              <button onClick={openReportsPanel} className="grid place-items-center w-8 h-8 rounded-lg hover:bg-navy-50 text-navy-400 transition shrink-0" title="Shikoyatlar">
                <ShieldAlert size={16} />
              </button>
            )}
            {channel !== SAVED_KEY && (
              <button onClick={() => { setShowSearch(!showSearch); setSearchInChannel(''); }} className={`grid place-items-center w-8 h-8 rounded-lg transition shrink-0 ${showSearch ? 'bg-navy-100 text-navy-700' : 'hover:bg-navy-50 text-navy-400'}`} title="Xabarlarni qidirish">
                <Search size={16} />
              </button>
            )}
            {channel !== SAVED_KEY && (
              <button onClick={() => toggleChatMute(channel)} className={`grid place-items-center w-8 h-8 rounded-lg transition shrink-0 ${isMutedChat(channel) ? 'bg-navy-100 text-navy-600' : 'hover:bg-navy-50 text-navy-400'}`} title={isMutedChat(channel) ? "Ovozsizni bekor qilish" : "Ovozsiz qilish"}>
                <BellOff size={16} />
              </button>
            )}
            <button onClick={() => setShowPremium(true)} className="chip bg-gradient-to-r from-amber-400/20 to-yellow-300/20 text-amber-700 hover:from-amber-400/30 hover:to-yellow-300/30 transition shrink-0" title="Chat Premium">
              <Crown size={11} className="inline -mt-0.5 mr-1" /> Premium
            </button>
            {pinnedInChannel.length > 0 && (
              <button onClick={() => setPinnedOpen(!pinnedOpen)} className="chip bg-navy-50 text-navy-600 hover:bg-navy-100 transition shrink-0" title="Qadalgan xabarlar">
                <Pin size={11} className="inline -mt-0.5 mr-1" />
                {pinnedInChannel.length} ta {pinnedOpen ? <ChevronUp size={11} className="inline -mt-0.5" /> : <ChevronDown size={11} className="inline -mt-0.5" />}
              </button>
            )}
            {callPeerName && (
              <>
                <button onClick={() => call.startCall('audio')} disabled={call.callState !== 'idle'} className="grid place-items-center w-8 h-8 rounded-lg hover:bg-navy-50 text-navy-400 transition disabled:opacity-30" title="Ovozli qo'ng'iroq">
                  <Phone size={16} />
                </button>
                <button onClick={() => call.startCall('video')} disabled={call.callState !== 'idle'} className="grid place-items-center w-8 h-8 rounded-lg hover:bg-navy-50 text-navy-400 transition disabled:opacity-30" title="Video qo'ng'iroq">
                  <VideoIcon size={16} />
                </button>
              </>
            )}
            {groupCallEnabled && !groupCall.inCall && (groupCall.remoteCount > 0 || isAdmin || isRoomAdmin) && (
              <button onClick={() => groupCall.join('audio')} className="chip bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition shrink-0" title={groupCall.remoteCount > 0 ? "Qo'shilish" : "Guruh audio/video chatni boshlash (faqat admin)"}>
                <Phone size={11} className="inline -mt-0.5 mr-1" />
                {groupCall.remoteCount > 0 ? `Qo'shilish (${groupCall.remoteCount})` : 'Video chat'}
              </button>
            )}
            <button onClick={() => setShowMembers(!showMembers)} className="grid place-items-center w-8 h-8 rounded-lg hover:bg-navy-50 text-navy-400 transition" title="A'zolar">
              <UserPlus size={16} />
            </button>
            {isAdmin && <span className="chip bg-gold/10 text-gold-700 text-[9px]">Moderator</span>}
            {!isAdmin && isRoomOwner && <span className="chip bg-gold/10 text-gold-700 text-[9px]"><Crown size={9} className="inline -mt-0.5 mr-0.5" />Egasi</span>}
            {!isAdmin && !isRoomOwner && isRoomAdmin && <span className="chip bg-navy-50 text-navy-600 text-[9px]"><Crown size={9} className="inline -mt-0.5 mr-0.5" />Admin</span>}
          </div>

          {groupCallEnabled && <GroupCallPanel call={groupCall} myName={user.full_name} />}

          {showSearch && (
            <div className="px-4 py-2 border-b border-navy-100 bg-navy-50/40">
              <div className="relative">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-300" />
                <input autoFocus className="input !py-1.5 !pl-8 text-xs w-full" placeholder="Shu suhbatdan qidirish..."
                  value={searchInChannel} onChange={(e) => setSearchInChannel(e.target.value)} />
              </div>
              {searchInChannel.trim() && (
                <div className="text-[10px] text-navy-400 mt-1 px-1">{visibleMessages.length} ta natija topildi</div>
              )}
            </div>
          )}

          {pinnedOpen && pinnedInChannel.length > 0 && (
            <div className="border-b border-navy-100 bg-amber-50/60 max-h-32 overflow-y-auto">
              {pinnedInChannel.map(m => (
                <div key={m.id} className="flex items-center gap-2 px-4 py-1.5 text-xs border-b border-amber-100/70 last:border-0">
                  <Pin size={11} className="text-amber-500 shrink-0" />
                  <span className="font-semibold text-navy-700 shrink-0">{m.sender}:</span>
                  <span className="text-navy-500 truncate flex-1">{m.text || (m.media_name || 'media')}</span>
                  <button onClick={() => togglePin(m)} className="text-navy-300 hover:text-red-500 shrink-0" title="Qadashni bekor qilish"><X size={11} /></button>
                </div>
              ))}
            </div>
          )}

          {isLocked ? (
            <div className="flex-1 grid place-items-center p-6">
              <div className="max-w-sm w-full text-center animate-fade">
                <div className="grid place-items-center w-16 h-16 rounded-3xl bg-gradient-to-br from-gold-400/15 to-gold-100/5 text-gold-500 mb-4 mx-auto shadow-sm">
                  <Lock size={28} />
                </div>
                <h3 className="font-display text-xl text-navy-800 mb-1">"{channel}" guruhi yopiq</h3>
                <p className="text-sm text-navy-400 mb-5">Ushbu guruh chatiga kirish uchun o'qituvchingizdan taklif kodini so'rang va shu yerga kiriting.</p>
                <div className="flex gap-2">
                  <input className="input !py-2.5 text-center tracking-wider font-mono" placeholder="Taklif kodi..." value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && joinGroup()} />
                  <button onClick={joinGroup} disabled={!joinCode.trim() || joining} className="btn-gold shrink-0">
                    <KeyRound size={16} /> Kirish
                  </button>
                </div>
                {joinErr && <div className="mt-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">{joinErr}</div>}
              </div>
            </div>
          ) : (
          <div className="flex flex-1 overflow-hidden">
            {/* Xabarlar */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1 bg-white">
              {visibleMessages.length === 0 ? (
                <div className="text-center text-navy-400 text-sm py-20">{searchInChannel.trim() ? 'Hech narsa topilmadi' : "Hali xabar yo'q"}</div>
              ) : visibleMessages.map((m, i) => {
                const isMe = m.sender === user.full_name;
                const isBot = m.sender in botIconByName;
                const mediaType = m.media_type;
                const prev = visibleMessages[i - 1];
                const next = visibleMessages[i + 1];
                const sameAsPrev = prev && prev.sender === m.sender;
                const sameAsNext = next && next.sender === m.sender;
                const showHeader = !sameAsPrev; // ism/vaqt faqat ketma-ket guruhning birinchi xabarida
                const mentionsMe = m.text && (m.text.includes(`@${user.full_name}`) || (tab !== 'private' && m.text.includes('@barcha')));
                const groups = reactionGroups(m);
                return (
                  <div key={m.id} className={`group flex gap-2 ${isMe ? 'flex-row-reverse' : ''} ${showHeader ? 'mt-3' : ''} animate-fade`}>
                    <div className="w-7 shrink-0">
                      {!sameAsNext && (
                        avatarUrlFor(m.sender) && !isBot ? (
                          <img src={api.fileUrl(avatarUrlFor(m.sender))} alt={m.sender} className="w-7 h-7 rounded-full object-cover" />
                        ) : (
                          <div className={`grid place-items-center w-7 h-7 rounded-full bg-gradient-to-br ${isBot ? 'from-violet-500 to-violet-700' : avatarColor(m.sender)} text-white text-[9px] font-bold`}>
                            {isBot ? (botIconByName[m.sender] || '🤖') : m.sender?.[0]?.toUpperCase()}
                          </div>
                        )
                      )}
                    </div>
                    <div className={`max-w-[70%] relative ${isMe ? 'text-right' : ''}`}>
                      {showHeader && (
                        <div className={`flex items-center gap-1.5 mb-0.5 px-1 ${isMe ? 'flex-row-reverse' : ''}`}>
                          <span className="text-[11px] font-semibold text-navy-600">{isMe ? 'Siz' : m.sender}</span>
                          {isPremium(m.sender) && <Crown size={10} className="text-amber-500" title="Chat Premium" />}
                          <span className="text-[9px] text-navy-300">{timeAgo(m.timestamp)}</span>
                          {m.pinned && <Pin size={9} className="text-amber-500" />}
                        </div>
                      )}

                      {/* Hover harakat paneli — Javob / Qadash / Reaksiya / Saqlash / Tahrirlash / O'chirish */}
                      <div className={`absolute top-0 ${isMe ? 'left-0 -translate-x-full pr-1' : 'right-0 translate-x-full pl-1'} opacity-0 group-hover:opacity-100 transition flex items-center gap-0.5 bg-white shadow-sm border border-navy-100 rounded-full px-1 py-0.5 z-10`}>
                        {channel !== SAVED_KEY && (
                          <button onClick={() => setReplyingTo({ id: m.id, sender: m.sender, text: m.text || m.media_name || 'media' })} className="p-1 rounded-full hover:bg-navy-50 text-navy-400" title="Javob berish"><Reply size={12} /></button>
                        )}
                        {channel !== SAVED_KEY && (
                          <button onClick={() => togglePin(m)} className={`p-1 rounded-full hover:bg-navy-50 ${m.pinned ? 'text-amber-500' : 'text-navy-400'}`} title={m.pinned ? 'Qadashni bekor qilish' : 'Qadash'}><Pin size={12} /></button>
                        )}
                        {channel !== SAVED_KEY && (
                          <button onClick={() => setReactionPickerFor(reactionPickerFor === m.id ? null : m.id)} className="p-1 rounded-full hover:bg-navy-50 text-navy-400" title="Reaksiya"><SmilePlus size={12} /></button>
                        )}
                        <button onClick={() => toggleSaved(m)} className={`p-1 rounded-full hover:bg-navy-50 ${isSaved(m.id) ? 'text-gold-600' : 'text-navy-400'}`} title={isSaved(m.id) ? "Saqlanganlardan olib tashlash" : 'Saqlash'}><Bookmark size={12} fill={isSaved(m.id) ? 'currentColor' : 'none'} /></button>
                        <button onClick={() => startForward(m)} className="p-1 rounded-full hover:bg-navy-50 text-navy-400" title="Boshqa suhbatga yuborish"><Forward size={12} /></button>
                        {isMe && !m.media_type && !m.poll && channel !== SAVED_KEY && (
                          <button onClick={() => startEdit(m)} className="p-1 rounded-full hover:bg-navy-50 text-navy-400" title="Tahrirlash"><Pencil size={12} /></button>
                        )}
                        {!isMe && !isBot && (
                          <button onClick={() => startReport(m)} className="p-1 rounded-full hover:bg-red-50 text-navy-400 hover:text-red-500" title="Shikoyat qilish"><Flag size={12} /></button>
                        )}
                        {(isMe || canModerate) && channel !== SAVED_KEY && (
                          <button onClick={() => deleteMessage(m)} className="p-1 rounded-full hover:bg-red-50 text-navy-400 hover:text-red-500" title="O'chirish"><Trash2 size={12} /></button>
                        )}
                      </div>
                      {reactionPickerFor === m.id && (
                        <div className={`absolute top-6 ${isMe ? 'right-0' : 'left-0'} flex gap-0.5 bg-white shadow-md border border-navy-100 rounded-full px-1.5 py-1 z-20`}>
                          {QUICK_REACTIONS.map(e => (
                            <button key={e} onClick={() => toggleReaction(m, e)} className="text-base hover:scale-125 transition">{e}</button>
                          ))}
                        </div>
                      )}

                      {m.forwarded_from && (
                        <div className={`text-[10px] text-navy-400 flex items-center gap-1 mb-0.5 px-1 ${isMe ? 'justify-end' : ''}`}>
                          <Forward size={10} /> {m.forwarded_from} dan yuborilgan
                        </div>
                      )}
                      {m.reply_to && (
                        <div className={`text-[11px] text-navy-400 border-l-2 border-navy-200 pl-1.5 mb-0.5 truncate max-w-[220px] ${isMe ? 'ml-auto' : ''}`}>
                          <span className="font-semibold text-navy-500">{m.reply_sender}:</span> {m.reply_snippet}
                        </div>
                      )}

                      {m.poll ? (
                        <div className={`inline-block px-3.5 py-3 min-w-[220px] ${isMe ? 'bg-[#0A84FF] text-white' : 'bg-[#E9E9EB] text-[#1c1c1e]'}`} style={{ borderRadius: 18 }}>
                          <div className="flex items-center gap-1.5 font-semibold text-[13px] mb-2"><BarChart3 size={14} /> {m.poll.question}</div>
                          <div className="space-y-1.5">
                            {(() => {
                              const totalVotes = m.poll.options.reduce((s, o) => s + o.votes.length, 0);
                              return m.poll.options.map((opt, idx) => {
                                const pct = totalVotes > 0 ? Math.round((opt.votes.length / totalVotes) * 100) : 0;
                                const votedByMe = opt.votes.includes(user.full_name);
                                return (
                                  <button key={idx} onClick={() => votePoll(m, idx)}
                                    className={`relative w-full text-left rounded-lg overflow-hidden text-[12px] px-2.5 py-1.5 border ${isMe ? 'border-white/30' : 'border-navy-200'}`}>
                                    <div className={`absolute inset-y-0 left-0 ${isMe ? 'bg-white/20' : 'bg-gold/20'}`} style={{ width: `${pct}%` }} />
                                    <div className="relative flex items-center justify-between gap-2">
                                      <span className={`flex items-center gap-1 ${votedByMe ? 'font-bold' : ''}`}>{votedByMe && <Check size={11} />} {opt.text}</span>
                                      <span className="shrink-0 opacity-70">{pct}% ({opt.votes.length})</span>
                                    </div>
                                  </button>
                                );
                              });
                            })()}
                          </div>
                          <div className={`text-[10px] mt-1.5 ${isMe ? 'text-white/70' : 'text-navy-400'}`}>{m.poll.options.reduce((s, o) => s + o.votes.length, 0)} ovoz</div>
                        </div>
                      ) : mediaType === 'image' ? (
                        <a href={api.fileUrl(m.media_url)} target="_blank" rel="noreferrer" className="inline-block overflow-hidden shadow-sm" style={{ borderRadius: 14 }}>
                          <img src={api.fileUrl(m.media_url)} alt={m.media_name || 'rasm'} className="max-w-[220px] max-h-[280px] object-cover block" />
                        </a>
                      ) : mediaType === 'audio' ? (
                        <div className={`inline-flex items-center gap-2 px-3 py-2.5 ${isMe ? 'bg-[#0A84FF]' : 'bg-[#E9E9EB]'}`} style={{ borderRadius: 18 }}>
                          <Mic size={15} className={isMe ? 'text-white' : 'text-navy-500'} />
                          <audio controls src={api.fileUrl(m.media_url)} className="h-8" style={{ maxWidth: 200 }} />
                        </div>
                      ) : mediaType === 'video' ? (
                        <video controls src={api.fileUrl(m.media_url)} className="max-w-[240px] max-h-[280px] shadow-sm" style={{ borderRadius: 14 }} />
                      ) : mediaType === 'file' ? (
                        <a href={api.fileUrl(m.media_url)} target="_blank" rel="noreferrer"
                          className={`inline-flex items-center gap-2 px-3.5 py-2.5 ${isMe ? 'bg-[#0A84FF] text-white' : 'bg-[#E9E9EB] text-[#1c1c1e]'}`} style={{ borderRadius: 18 }}>
                          <FileText size={16} className="shrink-0" />
                          <span className="text-[13px] font-medium truncate max-w-[150px]">{m.media_name || 'Fayl'}</span>
                          <Download size={13} className="shrink-0 opacity-70" />
                        </a>
                      ) : editingId === m.id ? (
                        <div className="inline-flex items-center gap-1.5 bg-white border border-navy-200 rounded-2xl px-2 py-1.5" style={{ minWidth: 200 }}>
                          <input autoFocus className="flex-1 text-[14px] outline-none bg-transparent" value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(m); if (e.key === 'Escape') cancelEdit(); }} />
                          <button onClick={() => saveEdit(m)} className="text-emerald-600 hover:text-emerald-700 shrink-0"><Check size={15} /></button>
                          <button onClick={cancelEdit} className="text-navy-300 hover:text-red-500 shrink-0"><X size={15} /></button>
                        </div>
                      ) : (
                        <div className={`inline-block px-3.5 py-2 text-[14px] leading-snug ${
                          isBot ? 'bg-violet-50 text-violet-900 border border-violet-100' :
                          isMe ? 'bg-[#0A84FF] text-white' :
                          mentionsMe ? 'bg-amber-50 text-[#1c1c1e] border border-amber-200' :
                          'bg-[#E9E9EB] text-[#1c1c1e]'
                        }`}
                          style={{
                            borderRadius: 18,
                            borderBottomRightRadius: isMe && !sameAsNext ? 4 : 18,
                            borderTopRightRadius: isMe && sameAsPrev ? 4 : 18,
                            borderBottomLeftRadius: !isMe && !sameAsNext ? 4 : 18,
                            borderTopLeftRadius: !isMe && sameAsPrev ? 4 : 18,
                          }}
                        >{renderWithMentions(m.text, allUsers, user.full_name)}
                          {m.edited && <span className={`text-[10px] ml-1.5 ${isMe ? 'text-white/60' : 'text-navy-400'}`}>(tahrirlangan)</span>}
                        </div>
                      )}

                      {groups.length > 0 && (
                        <div className={`flex flex-wrap gap-1 mt-1 relative ${isMe ? 'justify-end' : ''}`}>
                          {groups.map(([emoji, senders]) => (
                            <div key={emoji} className="relative">
                              <button onClick={() => toggleReaction(m, emoji)}
                                onMouseEnter={() => setWhoReacted({ msgId: m.id, emoji })}
                                onMouseLeave={() => setWhoReacted((w) => (w?.msgId === m.id && w?.emoji === emoji ? null : w))}
                                className={`flex items-center gap-0.5 text-[11px] rounded-full px-1.5 py-0.5 border transition ${
                                  senders.includes(user.full_name) ? 'bg-gold/10 border-gold/40' : 'bg-navy-50 border-navy-100 hover:bg-navy-100'
                                }`}>
                                <span>{emoji}</span><span className="text-navy-500 font-semibold">{senders.length}</span>
                              </button>
                              {whoReacted?.msgId === m.id && whoReacted?.emoji === emoji && (
                                <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 z-30 bg-navy-800 text-white text-[11px] rounded-lg px-2.5 py-1.5 whitespace-nowrap shadow-lg">
                                  {senders.join(', ')}
                                  <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-navy-800" />
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              {botTyping && isBotChannel && (
                <div className="flex gap-2 mt-3 animate-fade">
                  <div className="grid place-items-center w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-violet-700 text-white text-[9px] font-bold shrink-0">{activeBot?.icon || '🤖'}</div>
                  <div className="inline-block px-4 py-3 bg-[#E9E9EB]" style={{ borderRadius: 18, borderBottomLeftRadius: 4 }}>
                    <div className="flex gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-navy-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-navy-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-navy-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
              {typingUsers.length > 0 && (
                <div className="flex items-center gap-2 mt-2 px-1 animate-fade">
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-navy-300 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-navy-300 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-navy-300 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                  <span className="text-[11px] text-navy-400">{typingUsers.slice(0, 2).join(', ')} yozmoqda...</span>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* A'zolar paneli */}
            {showMembers && (
              <div className="w-56 border-l border-navy-100 bg-navy-50/20 flex flex-col">
                {/* Tab: A'zolar / Qo'shish */}
                <div className="flex border-b border-navy-100">
                  <button onClick={() => setShowAddMember(false)}
                    className={`flex-1 py-2 text-[10px] font-bold ${!showAddMember ? 'text-gold-600 border-b-2 border-gold' : 'text-navy-400'}`}>
                    A'zolar
                  </button>
                  {canModerate && (
                    <button onClick={() => setShowAddMember(true)}
                      className={`flex-1 py-2 text-[10px] font-bold ${showAddMember ? 'text-gold-600 border-b-2 border-gold' : 'text-navy-400'}`}>
                      + Qo'shish
                    </button>
                  )}
                </div>

                {!showAddMember ? (
                  <div className="flex-1 overflow-y-auto p-2">
                    {/* Qo'shilgan a'zolar */}
                    {currentMembers.length > 0 && (
                      <div className="mb-2">
                        <div className="text-[9px] font-bold text-gold-600 px-2 py-0.5">Qo'shilganlar ({currentMembers.length})</div>
                        {currentMembers.map(name => {
                          const u = allUsers.find(x => x.full_name === name);
                          return (
                            <div key={name} className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-navy-100/50 group">
                              <div className={`w-5 h-5 rounded grid place-items-center bg-gradient-to-br ${avatarColor(name)} text-white text-[7px] font-bold`}>{name[0]}</div>
                              <div className="flex-1 min-w-0">
                                <div className="text-[10px] font-semibold text-navy-700 truncate">{name}</div>
                                <div className="text-[8px] text-navy-400">{u?.role_label || ''}</div>
                              </div>
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                              {canModerate && (
                                <button onClick={() => removeMember(name)} className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600" title="Chiqarish">
                                  <X size={10} />
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                    {/* Faol yozganlar */}
                    <div className="text-[9px] font-bold text-navy-500 px-2 py-0.5">Faol ({members.length})</div>
                    {members.map(m => {
                      const isThisAdmin = Array.isArray(customGroupRoom?.admins) && customGroupRoom.admins.includes(m.full_name);
                      const isThisOwner = customGroupRoom?.created_by === m.full_name;
                      return (
                        <div key={m.id} className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-navy-100/50 group">
                          <div className={`w-5 h-5 rounded grid place-items-center bg-gradient-to-br ${avatarColor(m.full_name)} text-white text-[7px] font-bold`}>{m.full_name[0]}</div>
                          <div className="min-w-0 flex-1">
                            <div className="text-[10px] font-semibold text-navy-700 truncate flex items-center gap-1">
                              {m.full_name}
                              {isThisOwner && <Crown size={9} className="text-gold-500 shrink-0" title="Guruh egasi" />}
                              {!isThisOwner && isThisAdmin && (
                                <Crown size={9} className="text-navy-400 shrink-0" title="Guruh admini" />
                              )}
                            </div>
                            <div className="text-[8px] text-navy-400">{m.role_label}</div>
                          </div>
                          {isRoomOwner && !isThisOwner && customGroupRoom && (
                            <button onClick={() => toggleRoomAdmin(m.full_name)}
                              className={`opacity-0 group-hover:opacity-100 shrink-0 ${isThisAdmin ? 'text-gold-600 hover:text-navy-400' : 'text-navy-300 hover:text-gold-600'}`}
                              title={isThisAdmin ? "Admin huquqini bekor qilish" : "Admin qilish"}>
                              <Crown size={11} />
                            </button>
                          )}
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex-1 overflow-y-auto p-2">
                    <input className="input !py-1 text-xs mb-2" placeholder="Ism qidirish..."
                      value={memberSearch} onChange={e => setMemberSearch(e.target.value)} />
                    <div className="space-y-0.5">
                      {availableUsers.map(u => (
                        <div key={u.id} className="flex items-center gap-1.5 px-2 py-1.5 rounded hover:bg-emerald-50 cursor-pointer transition"
                          onClick={() => addMember(u.full_name)}>
                          <div className={`w-5 h-5 rounded grid place-items-center bg-gradient-to-br ${avatarColor(u.full_name)} text-white text-[7px] font-bold`}>{u.full_name[0]}</div>
                          <div className="flex-1 min-w-0">
                            <div className="text-[10px] font-semibold text-navy-700 truncate">{u.full_name}</div>
                            <div className="text-[8px] text-navy-400">{u.role_label}</div>
                          </div>
                          <Plus size={12} className="text-emerald-500 shrink-0" />
                        </div>
                      ))}
                      {availableUsers.length === 0 && (
                        <div className="text-center text-[10px] text-navy-400 py-4">Hamma qo'shilgan</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          )}

          {/* Input */}
          {!isLocked && channel !== SAVED_KEY && (
          <div className="px-3 py-2.5 border-t border-navy-100 bg-white/90 backdrop-blur">
            {replyingTo && (
              <div className="flex items-center gap-2 mb-2 px-2.5 py-1.5 bg-navy-50 rounded-xl border-l-2 border-gold">
                <Reply size={13} className="text-navy-400 shrink-0" />
                <div className="flex-1 min-w-0 text-xs">
                  <span className="font-semibold text-navy-600">{replyingTo.sender}:</span>{' '}
                  <span className="text-navy-400 truncate">{replyingTo.text}</span>
                </div>
                <button onClick={() => setReplyingTo(null)} className="text-navy-300 hover:text-red-500 shrink-0"><X size={13} /></button>
              </div>
            )}

            {mentionSuggestions.length > 0 && !recorder && (
              <div className="flex flex-wrap gap-1 mb-2 p-1.5 bg-navy-50 rounded-xl">
                {mentionSuggestions.map(u => (
                  <button key={u.id} onClick={() => pickMention(u)}
                    className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white border border-navy-100 hover:border-gold text-xs transition">
                    <span className={`w-4 h-4 rounded-full grid place-items-center bg-gradient-to-br ${avatarColor(u.full_name)} text-white text-[7px] font-bold`}>{u.full_name[0]}</span>
                    {u.full_name}
                  </button>
                ))}
              </div>
            )}

            {showEmoji && !recorder && (
              <div className="mb-2 p-2 bg-navy-50 rounded-2xl">
                <div className="flex flex-wrap gap-1">
                  {allEmojis.map((e, i) => (
                    <button key={e + i} onClick={() => addEmoji(e)} className="text-xl hover:scale-125 transition">{e}</button>
                  ))}
                </div>
                {isAdmin && (
                  <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-navy-200/60">
                    <input value={newEmojiInput} onChange={(e) => setNewEmojiInput(e.target.value)}
                      placeholder="Yangi emoji qo'shish..." maxLength={8}
                      className="input !py-1 text-xs flex-1" />
                    <button onClick={async () => {
                      const emoji = newEmojiInput.trim();
                      if (!emoji) return;
                      await api.post('/chat_custom_emojis', { emoji, added_by: user.full_name, date: new Date().toISOString().slice(0, 10) }).catch((e2) => alert(e2.message));
                      setNewEmojiInput(''); await load();
                    }} className="btn-gold !py-1 !px-2.5 text-[10px] shrink-0">
                      <Plus size={12} className="inline -mt-0.5" /> Qo'shish
                    </button>
                  </div>
                )}
              </div>
            )}

            {recorder ? (
              <div className="flex items-center gap-3">
                {recorder.kind === 'video' && (
                  <video ref={videoRef} muted className="w-20 h-14 rounded-xl object-cover bg-navy-900 shrink-0" />
                )}
                <div className="flex items-center gap-2 flex-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse shrink-0" />
                  <span className="text-sm font-semibold text-navy-700 tabular-nums">
                    {String(Math.floor(recorder.seconds / 60)).padStart(2, '0')}:{String(recorder.seconds % 60).padStart(2, '0')}
                  </span>
                  <span className="text-xs text-navy-400">{recorder.kind === 'video' ? 'Video yozilmoqda...' : 'Ovoz yozilmoqda...'}</span>
                </div>
                <button onClick={cancelRecording} className="grid place-items-center w-9 h-9 rounded-full hover:bg-red-50 text-red-500 transition shrink-0" title="Bekor qilish">
                  <Trash2 size={17} />
                </button>
                <button onClick={finishRecording} className="grid place-items-center w-9 h-9 rounded-full bg-[#0A84FF] text-white shadow-sm shrink-0" title="Yuborish">
                  <ArrowUp size={17} strokeWidth={2.5} />
                </button>
              </div>
            ) : uploadingMedia ? (
              <div className="flex items-center justify-center gap-2 py-2 text-sm text-navy-400">
                <div className="w-4 h-4 border-2 border-navy-300 border-t-[#0A84FF] rounded-full animate-spin" /> Yuborilmoqda...
              </div>
            ) : (
              <div className="flex gap-1 items-center">
                <button onClick={() => setShowEmoji(!showEmoji)} className="grid place-items-center w-8 h-8 rounded-full hover:bg-navy-50 text-navy-400 transition shrink-0" title="Emoji">
                  <Smile size={19} />
                </button>
                <input ref={fileRef} type="file" className="hidden" onChange={handleFile} />
                <button onClick={() => fileRef.current?.click()} className="grid place-items-center w-8 h-8 rounded-full hover:bg-navy-50 text-navy-400 transition shrink-0" title="Fayl yuklash">
                  <Paperclip size={18} />
                </button>
                <input ref={imgRef} type="file" accept="image/*" className="hidden" onChange={handleImage} />
                <button onClick={() => imgRef.current?.click()} className="grid place-items-center w-8 h-8 rounded-full hover:bg-navy-50 text-navy-400 transition shrink-0" title="Rasm yuklash">
                  <Image size={18} />
                </button>
                {!isBotChannel && (
                  <button onClick={() => setShowPollForm(true)} className="grid place-items-center w-8 h-8 rounded-full hover:bg-navy-50 text-navy-400 transition shrink-0" title="So'rovnoma yaratish">
                    <BarChart3 size={18} />
                  </button>
                )}
                <input ref={inputRef}
                  className="flex-1 !rounded-full border border-navy-200 bg-[#F2F2F7] px-4 py-2 text-[14px] outline-none focus:border-[#0A84FF] focus:bg-white transition"
                  placeholder="Xabar..."
                  value={text} onChange={e => { setText(e.target.value); notifyTyping(); }}
                  onKeyDown={e => {
                    if (e.key !== 'Enter' || e.shiftKey) return;
                    e.preventDefault();
                    if (mentionSuggestions.length > 0) pickMention(mentionSuggestions[0]);
                    else send();
                  }} />
                {text.trim() ? (
                  <button onClick={() => send()} disabled={sending}
                    className="grid place-items-center w-8 h-8 rounded-full bg-[#0A84FF] text-white shadow-sm transition disabled:opacity-30 shrink-0">
                    <ArrowUp size={17} strokeWidth={2.5} />
                  </button>
                ) : (
                  <>
                    <button onClick={() => startRecording('video')} className="grid place-items-center w-8 h-8 rounded-full hover:bg-navy-50 text-navy-400 transition shrink-0" title="Video xabar">
                      <VideoIcon size={18} />
                    </button>
                    <button onClick={() => startRecording('audio')} className="grid place-items-center w-8 h-8 rounded-full hover:bg-navy-50 text-navy-400 transition shrink-0" title="Ovozli xabar">
                      <Mic size={18} />
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
          )}
        </div>
      </div>

      <Modal open={showPremium} title="Chat Premium" onClose={() => setShowPremium(false)}>
        <div className="text-center">
          <div className="grid place-items-center w-16 h-16 rounded-3xl bg-gradient-to-br from-amber-400/20 to-yellow-300/10 text-amber-500 mb-4 mx-auto shadow-sm">
            <Crown size={30} />
          </div>
          <h3 className="font-display text-lg text-navy-800 mb-1">Telegram Premiumga o'xshash imkoniyatlar</h3>
          <p className="text-sm text-navy-400 mb-5">Chatda alohida ajralib turing — tarifni tanlang.</p>
          <ul className="text-left text-sm text-navy-600 space-y-1.5 mb-5 bg-navy-50/60 rounded-2xl p-3.5">
            <li className="flex items-center gap-2"><Crown size={13} className="text-amber-500 shrink-0" /> Ism yonida oltin 👑 belgi — hamma ko'radi</li>
            <li className="flex items-center gap-2"><Smile size={13} className="text-amber-500 shrink-0" /> Emoji reaksiyalarda alohida ajralib turish</li>
            <li className="flex items-center gap-2"><Paperclip size={13} className="text-amber-500 shrink-0" /> Kattaroq fayl/media yuklash ustuvorligi</li>
            <li className="flex items-center gap-2"><Bot size={13} className="text-amber-500 shrink-0" /> Target International School AI bilan cheklovsiz muloqot</li>
          </ul>
          {!myStudentRole ? (
            <p className="text-xs text-navy-400">Chat Premium faqat o'quvchi hisoblari uchun mavjud.</p>
          ) : myPremiumActive ? (
            <div className="text-sm font-bold text-emerald-600 bg-emerald-50 rounded-xl py-2.5">✅ Sizda Chat Premium faol</div>
          ) : (
            <>
              <div className="mb-3">
                <label className="label">Promo kod (bo'lsa)</label>
                <input className="input !py-2 text-sm uppercase" placeholder="Masalan: ISO2026" value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value.toUpperCase())} />
                {promoCode.trim() && <p className="text-[10px] text-emerald-600 mt-1">✅ Promo kod to'g'ri bo'lsa, tarif bepul beriladi.</p>}
              </div>
              <div className="grid grid-cols-2 gap-2">
                {PREMIUM_PLANS.map((plan) => (
                  <button key={plan.key} onClick={() => buyPremium(plan.key)} disabled={!!buyingPremium}
                    className={`relative rounded-2xl border p-3 text-left transition disabled:opacity-40 ${
                      plan.popular ? 'border-gold bg-gold/5 hover:bg-gold/10' : 'border-navy-100 hover:border-gold/50 hover:bg-navy-50/60'
                    }`}>
                    {plan.popular && <span className="absolute -top-2 right-2 chip bg-gold text-white text-[8px] !px-1.5 !py-0.5">Mashhur</span>}
                    <div className="text-sm font-bold text-navy-800">{plan.label}</div>
                    <div className="text-xs text-gold-600 font-bold mt-0.5">{promoCode.trim() ? 'BEPUL (promo)' : `${plan.coins} 🪙`}</div>
                    {plan.save && <div className="text-[10px] text-emerald-600 font-semibold mt-0.5">{plan.save}</div>}
                    {buyingPremium === plan.key && <div className="text-[10px] text-navy-400 mt-1">Sotib olinmoqda...</div>}
                  </button>
                ))}
              </div>
              {premiumErr && <div className="mt-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">{premiumErr}</div>}
            </>
          )}
        </div>
      </Modal>

      <Modal open={showPollForm} title="So'rovnoma yaratish" onClose={() => { setShowPollForm(false); setPollQuestion(''); setPollOptions(['', '']); }}
        footer={<>
          <button className="btn-ghost" onClick={() => { setShowPollForm(false); setPollQuestion(''); setPollOptions(['', '']); }}>Bekor qilish</button>
          <button className="btn-gold" onClick={submitPoll} disabled={!pollQuestion.trim() || pollOptions.filter((o) => o.trim()).length < 2}>Yuborish</button>
        </>}>
        <label className="label">Savol</label>
        <input className="input !py-2.5 mb-4" placeholder="Masalan: Qaysi kun qulay?" value={pollQuestion} onChange={(e) => setPollQuestion(e.target.value)} />
        <label className="label">Variantlar</label>
        <div className="space-y-2">
          {pollOptions.map((opt, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <input className="input !py-2 flex-1" placeholder={`Variant ${idx + 1}`} value={opt}
                onChange={(e) => setPollOptions((prev) => prev.map((o, i) => i === idx ? e.target.value : o))} />
              {pollOptions.length > 2 && (
                <button onClick={() => setPollOptions((prev) => prev.filter((_, i) => i !== idx))} className="text-navy-300 hover:text-red-500 shrink-0"><X size={15} /></button>
              )}
            </div>
          ))}
        </div>
        {pollOptions.length < 8 && (
          <button onClick={() => setPollOptions((prev) => [...prev, ''])} className="mt-2 text-xs font-bold text-gold-600 hover:text-gold-700 flex items-center gap-1">
            <Plus size={13} /> Variant qo'shish
          </button>
        )}
      </Modal>

      <Modal open={!!forwarding} title="Boshqa suhbatga yuborish" onClose={() => setForwarding(null)}
        footer={<>
          <button className="btn-ghost" onClick={() => setForwarding(null)}>Bekor qilish</button>
          <button className="btn-gold" onClick={submitForward} disabled={!forwardTarget}>Yuborish</button>
        </>}>
        {forwarding && (
          <div className="mb-4 p-3 rounded-xl bg-navy-50 text-sm text-navy-600 border-l-2 border-gold">
            <span className="font-semibold text-navy-700">{forwarding.sender}:</span> {forwarding.text || forwarding.media_name || 'media'}
          </div>
        )}
        <label className="label">Qayerga yuborish</label>
        <select className="input !py-2.5" value={forwardTarget} onChange={(e) => setForwardTarget(e.target.value)}>
          <option value="">Tanlang...</option>
          {['Kanallar', 'Guruhlar', 'Shaxsiy'].map((grp) => (
            <optgroup key={grp} label={grp}>
              {forwardDestinations.filter((d) => d.group === grp).map((d) => (
                <option key={d.key} value={d.key}>{d.label}</option>
              ))}
            </optgroup>
          ))}
        </select>
      </Modal>

      <Modal open={!!reportingMsg} title="Xabar bo'yicha shikoyat" onClose={() => setReportingMsg(null)}
        footer={<>
          <button className="btn-ghost" onClick={() => setReportingMsg(null)}>Bekor qilish</button>
          <button className="btn-gold" onClick={submitReport} disabled={!reportReason.trim()}>Yuborish</button>
        </>}>
        {reportingMsg && (
          <div className="mb-4 p-3 rounded-xl bg-navy-50 text-sm text-navy-600 border-l-2 border-red-300">
            <span className="font-semibold text-navy-700">{reportingMsg.sender}:</span> {reportingMsg.text || reportingMsg.media_name || 'media'}
          </div>
        )}
        <label className="label">Sababi</label>
        <textarea className="input !py-2.5 w-full resize-none" rows={3} placeholder="Nima uchun shikoyat qilyapsiz?"
          value={reportReason} onChange={(e) => setReportReason(e.target.value)} />
      </Modal>

      <Modal open={showGroupInfo} title="Guruh haqida" onClose={() => setShowGroupInfo(false)}
        footer={<>
          <button className="btn-ghost" onClick={() => setShowGroupInfo(false)}>Bekor qilish</button>
          <button className="btn-gold" onClick={saveGroupDescription}>Saqlash</button>
        </>}>
        <label className="label">Tavsif</label>
        <textarea className="input !py-2.5 w-full resize-none" rows={3} maxLength={300} placeholder="Guruh haqida qisqacha..."
          value={descDraft} onChange={(e) => setDescDraft(e.target.value)} />
      </Modal>

      <Modal open={showReports} title="Xabar shikoyatlari" onClose={() => setShowReports(false)}>
        {allReports.length === 0 ? (
          <p className="text-sm text-navy-400 text-center py-6">Hozircha shikoyatlar yo'q.</p>
        ) : (
          <div className="space-y-2 max-h-[60vh] overflow-y-auto">
            {allReports.map((r) => (
              <div key={r.id} className={`p-3 rounded-xl border ${r.status === 'resolved' ? 'bg-navy-50/50 border-navy-100' : 'bg-red-50/50 border-red-100'}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-navy-700">{r.message_sender} → {r.channel}</span>
                  <span className={`chip text-[9px] ${r.status === 'resolved' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>{r.status === 'resolved' ? 'Hal qilindi' : 'Yangi'}</span>
                </div>
                <p className="text-xs text-navy-500 mb-1 truncate">"{r.message_snippet}"</p>
                <p className="text-xs text-navy-600 mb-2"><span className="font-semibold">{r.reported_by}:</span> {r.reason}</p>
                {r.status !== 'resolved' && (
                  <button onClick={() => resolveReport(r)} className="text-[11px] font-bold text-emerald-600 hover:text-emerald-700">Hal qilindi deb belgilash</button>
                )}
              </div>
            ))}
          </div>
        )}
      </Modal>

      {callPeerName && <CallOverlay call={call} peerName={callPeerName} />}
    </div>
  );
}
