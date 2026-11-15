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
export const sfx = {
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
};
