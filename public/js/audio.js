// 合成音效（WebAudio），唔使音效檔
let ctx = null, master = null;
export function initAudio() {
  if (ctx) { ctx.resume(); return; }
  ctx = new (window.AudioContext || window.webkitAudioContext)();
  master = ctx.createGain(); master.gain.value = 0.5; master.connect(ctx.destination);
}
function tone(freq, dur, type = 'sine', vol = 0.3, when = 0, slideTo = null) {
  if (!ctx) return;
  const t = ctx.currentTime + when;
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.05);
}
function noise(dur, vol = 0.5, freq = 800) {
  if (!ctx) return;
  const n = ctx.sampleRate * dur, buf = ctx.createBuffer(1, n, ctx.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 2);
  const s = ctx.createBufferSource(); s.buffer = buf;
  const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = freq;
  const g = ctx.createGain(); g.gain.value = vol;
  s.connect(f); f.connect(g); g.connect(master); s.start();
}
// 消防鐘：模仿香港大廈常見嘅電鈴（銅鐘＋電動鐘錘每秒打約 19 下）
// 幾個唔成倍數嘅泛音 = 金屬鐘聲；每下打鐘有「噠」一聲；加少少失真令佢夠刺耳
let bellCurve = null;
function harsh() {
  if (!bellCurve) { bellCurve = new Float32Array(1024); for (let i = 0; i < 1024; i++) bellCurve[i] = Math.tanh(2.5 * (i / 511.5 - 1)); }
  const w = ctx.createWaveShaper(); w.curve = bellCurve; w.oversample = '2x'; return w;
}
function firebell(sec = 4, vol = 0.24) {
  if (!ctx) return;
  const t0 = ctx.currentTime + 0.02, period = 1 / 19, end = t0 + sec;
  const env = ctx.createGain(), sh = harsh(), hp = ctx.createBiquadFilter(), out = ctx.createGain();
  hp.type = 'highpass'; hp.frequency.value = 500;
  env.connect(sh); sh.connect(hp); hp.connect(out); out.connect(master);
  out.gain.setValueAtTime(vol, t0);
  // 鐘身泛音（Hz, 響度）
  for (const [f, a] of [[1180, 1], [2740, 0.7], [3390, 0.55], [4810, 0.4], [6400, 0.25]]) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.value = f * (1 + (Math.random() - 0.5) * 0.004); g.gain.value = a * 0.55;
    o.connect(g); g.connect(env); o.start(t0); o.stop(end + 0.8);
  }
  // 鐘錘撞鐘嘅「噠」聲
  const nb = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.5), ctx.sampleRate), nd = nb.getChannelData(0);
  for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
  const ns = ctx.createBufferSource(), bp = ctx.createBiquadFilter(), ng = ctx.createGain();
  ns.buffer = nb; ns.loop = true; bp.type = 'bandpass'; bp.frequency.value = 3500; bp.Q.value = 1.2;
  ns.connect(bp); bp.connect(ng); ng.connect(sh); ns.start(t0); ns.stop(end + 0.1);
  env.gain.setValueAtTime(0.0001, t0); ng.gain.setValueAtTime(0, t0);
  for (let k = 0, t = t0; t < end; k++, t = t0 + k * period) {
    const s = k ? t + (Math.random() - 0.5) * 0.004 : t; // 電鈴節奏唔會完全平均
    env.gain.setValueAtTime(0.35, s); env.gain.linearRampToValueAtTime(1, s + 0.002);
    env.gain.exponentialRampToValueAtTime(0.35, s + period * 0.92);
    ng.gain.setValueAtTime(0.5, s); ng.gain.exponentialRampToValueAtTime(0.001, s + 0.012);
  }
  // 停咗之後鐘聲慢慢散
  env.gain.setValueAtTime(0.6, end + 0.001); env.gain.exponentialRampToValueAtTime(0.0001, end + 0.7);
}
export const sfx = {
  firebell,
  ding() { tone(1046, 1.2, 'sine', 0.25); tone(784, 1.5, 'sine', 0.2, 0.35); },
  click() { tone(1400, 0.05, 'square', 0.08); },
  beep() { tone(880, 0.12, 'square', 0.1); },
  error() { tone(220, 0.3, 'sawtooth', 0.15); },
  pickup() { tone(880, 0.12, 'triangle', 0.2); tone(1320, 0.25, 'triangle', 0.2, 0.08); },
  door() { tone(180, 0.6, 'sine', 0.12, 0, 120); },
  alarm(sec = 4) { for (let i = 0; i < sec * 14; i++) tone(i % 2 ? 950 : 1050, 0.06, 'square', 0.12, i / 14); },
  boom() { noise(2.2, 1.2, 600); tone(70, 1.5, 'sine', 0.6, 0, 30); },
  spray() { noise(0.25, 0.15, 3000); },
  bark() { tone(600, 0.08, 'sawtooth', 0.15, 0, 380); tone(650, 0.1, 'sawtooth', 0.15, 0.15, 400); },
  whoosh() { noise(1.5, 0.3, 400); },
  siren() { tone(660, 0.55, 'triangle', 0.1, 0, 990); tone(990, 0.55, 'triangle', 0.1, 0.6, 660); },
  horn() { tone(392, 0.35, 'square', 0.08); tone(494, 0.35, 'square', 0.06); },
  jet() { noise(0.6, 0.35, 900); },
};
export const audioCtx = () => ctx;
