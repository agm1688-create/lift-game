// WebSocket 連線 + WebRTC 語音（mesh）
export class Net {
  constructor(handlers) {
    this.h = handlers; this.id = null; this.offset = 0; this.queue = [];
    this.connect();
  }
  connect() {
    const url = (location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host;
    this.ws = new WebSocket(url);
    this.ws.onopen = () => { this.queue.forEach(m => this.ws.send(m)); this.queue = []; this.h.open?.(); this.pingLoop(); };
    this.ws.onmessage = e => {
      const m = JSON.parse(e.data);
      if (m.t === 'welcome') { this.id = m.id; this.offset = m.now - Date.now(); }
      if (m.t === 'pong') { const rtt = Date.now() - m.c; this.offset = m.now + rtt / 2 - Date.now(); }
      if (m.t === 'lifts') this.offset = this.offset * 0.9 + (m.now - Date.now()) * 0.1;
      this.h.message?.(m);
    };
    this.ws.onclose = () => { this.h.close?.(); };
  }
  pingLoop() { clearInterval(this._pi); this._pi = setInterval(() => this.send({ t: 'ping', c: Date.now() }), 5000); this.send({ t: 'ping', c: Date.now() }); }
  send(obj) { const s = JSON.stringify(obj); if (this.ws.readyState === 1) this.ws.send(s); else if (this.ws.readyState === 0) this.queue.push(s); }
  now() { return Date.now() + this.offset; }
}

const ICE = [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }];

export class Voice {
  constructor(net) { this.net = net; this.peers = new Map(); this.track = null; this.enabled = false; }
  get supported() { return typeof RTCPeerConnection !== 'undefined'; }
  peer(id) {
    if (this.peers.has(id)) return this.peers.get(id);
    const pc = new RTCPeerConnection({ iceServers: ICE });
    const tr = pc.addTransceiver('audio', { direction: 'sendrecv' });
    if (this.track) tr.sender.replaceTrack(this.track);
    const audio = new Audio(); audio.autoplay = true; audio.muted = !this.enabled;
    pc.ontrack = e => { audio.srcObject = e.streams[0] || new MediaStream([e.track]); if (this.enabled) audio.play().catch(() => { }); };
    pc.onicecandidate = e => { if (e.candidate) this.net.send({ t: 'rtc', to: id, data: { cand: e.candidate } }); };
    const p = { pc, sender: tr.sender, audio, pending: [], remoteSet: false };
    this.peers.set(id, p);
    return p;
  }
  async call(id) {
    if (!this.supported) return;
    const p = this.peer(id);
    const offer = await p.pc.createOffer(); await p.pc.setLocalDescription(offer);
    this.net.send({ t: 'rtc', to: id, data: { sdp: p.pc.localDescription } });
  }
  async onSignal(from, data) {
    if (!this.supported) return;
    const p = this.peer(from);
    try {
      if (data.sdp) {
        await p.pc.setRemoteDescription(data.sdp); p.remoteSet = true;
        for (const c of p.pending) await p.pc.addIceCandidate(c).catch(() => { });
        p.pending = [];
        if (data.sdp.type === 'offer') {
          const ans = await p.pc.createAnswer(); await p.pc.setLocalDescription(ans);
          this.net.send({ t: 'rtc', to: from, data: { sdp: p.pc.localDescription } });
        }
      } else if (data.cand) {
        if (p.remoteSet) await p.pc.addIceCandidate(data.cand).catch(() => { }); else p.pending.push(data.cand);
      }
    } catch (e) { console.warn('rtc', e); }
  }
  remove(id) { const p = this.peers.get(id); if (p) { p.pc.close(); p.audio.srcObject = null; this.peers.delete(id); } }
  async toggle() {
    if (!this.enabled) {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('呢個瀏覽器唔支援咪高峰（要 HTTPS 或 localhost）');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
      this.track = stream.getAudioTracks()[0];
      this.enabled = true;
      for (const p of this.peers.values()) { p.sender.replaceTrack(this.track); p.audio.muted = false; p.audio.play().catch(() => { }); }
    } else {
      this.enabled = false;
      this.track?.stop(); this.track = null;
      for (const p of this.peers.values()) { p.sender.replaceTrack(null); p.audio.muted = true; }
    }
    return this.enabled;
  }
}
