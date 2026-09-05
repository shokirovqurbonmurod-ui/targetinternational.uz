import { useEffect, useRef, useState, useCallback } from 'react';
import { api } from '../lib/api.js';

const ICE_SERVERS = [{ urls: 'stun:stun.l.google.com:19302' }];
const SIGNAL_MAX_AGE_MS = 25000; // shu vaqtdan eski offer/hangup/busy/decline e'tiborga olinmaydi

// 1:1 audio/video qo'ng'iroq — signalizatsiya (offer/answer/ICE) server orqali (REST polling,
// call_signals jadvali) uzatiladi, media esa ulanish o'rnatilgach to'g'ridan-to'g'ri P2P oqadi.
// IncomingCallBanner.jsx global darajada (qaysi sahifada bo'lishidan qat'iy nazar) yangi
// qo'ng'iroqdan xabardor qiladi; shu Chat sahifasiga o'tilgach, shu hook signalizatsiyani davom ettiradi.
function signalAgeMs(s) {
  // Server vaqti UTC (Z qirqilgan) — qayta 'Z' qo'shmasak brauzer mahalliy vaqt deb o'qib,
  // eski (masalan avvalgi tugagan qo'ng'iroqdan qolgan) signalni "yangi" deb hisoblab qo'yardi.
  return Date.now() - new Date((s.at || '').replace(' ', 'T') + 'Z').getTime();
}

export function useCall({ channel, peerName, myName, enabled }) {
  const [callState, setCallState] = useState('idle'); // idle | calling | ringing | active
  const [callKind, setCallKind] = useState('audio'); // audio | video
  const [incomingSignal, setIncomingSignal] = useState(null);
  const [callError, setCallError] = useState('');
  const [muted, setMuted] = useState(false);
  const [camOff, setCamOff] = useState(false);

  const pcRef = useRef(null);
  const localStreamRef = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const lastIdRef = useRef(0);
  const callStateRef = useRef('idle');
  const peerRef = useRef(peerName);
  // Qo'ng'iroq qabul qilinguncha (RTCPeerConnection hali yaratilmagan) kelgan ICE nomzodlarini
  // shu yerda saqlab turamiz — aks holda ular butunlay yo'qolib, ulanish hech qachon o'rnatilmasdi.
  const pendingIceRef = useRef([]);

  useEffect(() => { callStateRef.current = callState; }, [callState]);
  useEffect(() => { peerRef.current = peerName; }, [peerName]);
  // Suhbat almashtirilganda: ESKI (allaqachon tugagan) qo'ng'iroqqa oid signallarni "0"dan
  // boshlab qayta o'qib chiqmasligimiz kerak — aks holda ular holatni noto'g'ri o'zgartirib
  // qo'yishi mumkin edi. Shu kanaldagi ESKI (SIGNAL_MAX_AGE_MS'dan katta yoshli) signallarning
  // eng oxirgisidan boshlab kuzatishni davom ettiramiz — lekin YAQINDAGI signallar (masalan
  // kiruvchi qo'ng'iroq bannerida "Ochish" bosilib shu sahifaga hozirgina o'tilganda hali
  // javobsiz turgan taklif) o'tkazib yuborilmaydi, ular navbatdagi poll'da odatdagidek qayta ishlanadi.
  useEffect(() => {
    endCall();
    if (!channel) { lastIdRef.current = 0; return; }
    let cancelled = false;
    api.get(`/call_signals?channel=${encodeURIComponent(channel)}`).then((rows) => {
      if (cancelled) return;
      lastIdRef.current = (rows || [])
        .filter((r) => signalAgeMs(r) > SIGNAL_MAX_AGE_MS)
        .reduce((m, r) => Math.max(m, Number(r.id) || 0), 0);
    }).catch(() => { lastIdRef.current = 0; });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channel]);

  function sendSignal(to, type, payload) {
    return api.post('/call_signals', { channel, to, type, payload: payload ?? null }).catch(() => {});
  }

  function createPeerConnection(remoteName) {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    pc.onicecandidate = (e) => { if (e.candidate) sendSignal(remoteName, 'ice', e.candidate.toJSON()); };
    pc.ontrack = (e) => { if (remoteVideoRef.current) remoteVideoRef.current.srcObject = e.streams[0]; };
    pc.onconnectionstatechange = () => {
      if (['disconnected', 'failed', 'closed'].includes(pc.connectionState) && callStateRef.current !== 'idle') endCall();
    };
    pcRef.current = pc;
    return pc;
  }

  const endCall = useCallback((msg) => {
    if (peerRef.current && callStateRef.current !== 'idle') sendSignal(peerRef.current, 'hangup', null);
    pcRef.current?.close(); pcRef.current = null;
    localStreamRef.current?.getTracks().forEach((t) => t.stop()); localStreamRef.current = null;
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    setCallState('idle'); setIncomingSignal(null); setMuted(false); setCamOff(false);
    pendingIceRef.current = [];
    if (msg) setCallError(msg);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channel]);

  async function flushPendingIce() {
    const pc = pcRef.current;
    if (!pc || !pc.remoteDescription) return;
    const queued = pendingIceRef.current;
    pendingIceRef.current = [];
    for (const cand of queued) await pc.addIceCandidate(new RTCIceCandidate(cand)).catch(() => {});
  }

  async function handleSignal(s) {
    if (s.type === 'offer') {
      // Sahifa yangi ochilganda (masalan kiruvchi qo'ng'iroq bannerida "Ochish" bosilgach) shu
      // suhbatning BUTUN eski tarixi bitta partiyada kelishi mumkin — eski, allaqachon tugagan
      // qo'ng'iroqning taklifi qayta "jiringlab" ketmasligi uchun faqat yaqindagi offer qabul qilinadi.
      if (signalAgeMs(s) > SIGNAL_MAX_AGE_MS) return;
      if (callStateRef.current !== 'idle') { sendSignal(s.from, 'busy', null); return; }
      setIncomingSignal(s);
      setCallKind(s.payload?.kind || 'audio');
      setCallState('ringing');
    } else if (s.type === 'answer') {
      if (pcRef.current) await pcRef.current.setRemoteDescription(new RTCSessionDescription(s.payload));
      await flushPendingIce();
      setCallState('active');
    } else if (s.type === 'ice') {
      if (!s.payload) { /* no-op */ }
      else if (pcRef.current && pcRef.current.remoteDescription) await pcRef.current.addIceCandidate(new RTCIceCandidate(s.payload)).catch(() => {});
      else pendingIceRef.current.push(s.payload);
    } else if (s.type === 'hangup') {
      // Xuddi shu sababga ko'ra — eski hangup/busy/decline signali endigina o'rnatilgan YANGI
      // qo'ng'iroq holatini bekor qilib qo'ymasligi kerak.
      if (signalAgeMs(s) > SIGNAL_MAX_AGE_MS) return;
      endCall();
    } else if (s.type === 'busy') {
      if (signalAgeMs(s) > SIGNAL_MAX_AGE_MS) return;
      endCall("Foydalanuvchi hozir band.");
    } else if (s.type === 'decline') {
      if (signalAgeMs(s) > SIGNAL_MAX_AGE_MS) return;
      endCall("Qo'ng'iroq rad etildi.");
    }
  }

  useEffect(() => {
    if (!enabled || !channel) return;
    const iv = setInterval(async () => {
      const rows = await api.get(`/call_signals?channel=${encodeURIComponent(channel)}&after=${lastIdRef.current}`).catch(() => []);
      for (const s of rows) {
        lastIdRef.current = Math.max(lastIdRef.current, s.id);
        if (s.to === myName) await handleSignal(s);
      }
    }, 1500);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, channel, myName]);

  async function startCall(kind) {
    if (!peerName) return;
    setCallError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: kind === 'video' });
      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      const pc = createPeerConnection(peerName);
      stream.getTracks().forEach((t) => pc.addTrack(t, stream));
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      setCallKind(kind);
      setCallState('calling');
      await sendSignal(peerName, 'offer', { sdp: offer.sdp, type: offer.type, kind });
    } catch (e) {
      setCallError("Kamera/mikrofonga ruxsat berilmadi yoki xatolik: " + e.message);
      setCallState('idle');
    }
  }

  async function acceptCall() {
    if (!incomingSignal) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: callKind === 'video' });
      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      const pc = createPeerConnection(incomingSignal.from);
      stream.getTracks().forEach((t) => pc.addTrack(t, stream));
      await pc.setRemoteDescription(new RTCSessionDescription({ sdp: incomingSignal.payload.sdp, type: incomingSignal.payload.type }));
      await flushPendingIce();
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      await sendSignal(incomingSignal.from, 'answer', { sdp: answer.sdp, type: answer.type });
      setCallState('active');
      setIncomingSignal(null);
    } catch (e) {
      setCallError('Xatolik: ' + e.message);
      declineCall();
    }
  }

  function declineCall() {
    if (incomingSignal) sendSignal(incomingSignal.from, 'decline', null);
    setIncomingSignal(null);
    setCallState('idle');
  }

  function toggleMute() {
    const track = localStreamRef.current?.getAudioTracks()[0];
    if (track) { track.enabled = !track.enabled; setMuted(!track.enabled); }
  }
  function toggleCam() {
    const track = localStreamRef.current?.getVideoTracks()[0];
    if (track) { track.enabled = !track.enabled; setCamOff(!track.enabled); }
  }

  return {
    callState, callKind, incomingSignal, callError, muted, camOff,
    localVideoRef, remoteVideoRef,
    startCall, acceptCall, declineCall, endCall, toggleMute, toggleCam,
  };
}
