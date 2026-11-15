// 背景音樂：3 首卡通風輕快小曲（WebAudio 即場合成，唔使音樂檔），好細聲
import { audioCtx } from './audio.js';

const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
const CH = {
  C: [48, 52, 55], G: [43, 47, 50], Am: [45, 48, 52], F: [41, 45, 48], Dm: [50, 53, 57], Bb: [46, 50, 53], Em: [52, 55, 59], D: [50, 54, 57], G4: [55, 59, 62], C4: [48, 52, 55],
};
// 每首 8 小節；旋律每格 = 八分音符（null 休止、0 延長）
export const TRACKS = [
  {
    name: '開心散步', bpm: 112, lead: 'triangle', style: 'oompah',
    chords: ['C', 'G', 'Am', 'F', 'C', 'G', 'F', 'G'],
    mel: [
      [72, null, 76, 79, 77, 76, 74, null], [74, null, 79, 83, 81, 79, 77, 74], [76, null, 72, 76, 81, 79, 76, null], [77, 76, 74, 72, 74, null, 72, null],
      [72, 74, 76, 79, 84, null, 79, 76], [79, 77, 76, 74, 71, null, 74, null], [77, null, 81, 77, 76, 74, 72, 74], [74, 76, 74, 71, 72, null, null, null],
    ],
  },
  {
    name: '糖果樂園', bpm: 132, lead: 'square', style: 'arp',
    chords: ['F', 'C', 'Dm', 'Bb', 'F', 'C', 'Bb', 'C'],
    mel: [
      [77, 81, 84, 81, 77, 81, 84, 89], [88, 84, 79, 84, 88, null, 86, 84], [86, 81, 77, 81, 86, 89, 86, 81], [82, 86, 89, 86, 82, null, 81, 79],
      [77, null, 77, 79, 81, null, 84, null], [79, null, 76, 79, 84, 83, 84, 86], [86, 84, 82, 81, 79, 77, 76, 77], [79, null, 72, null, 77, null, null, null],
    ],
  },
  {
    name: '悠閒小島', bpm: 100, lead: 'whistle', style: 'uke',
    chords: ['G4', 'Em', 'C4', 'D', 'G4', 'Em', 'C4', 'D'],
    mel: [
      [79, 0, 0, 81, 83, 0, 79, 0], [76, 0, 0, 0, 74, 76, 79, 0], [76, 0, 72, 0, 74, 76, 74, 72], [74, 0, 0, 0, null, 74, 76, 78],
      [79, 0, 83, 0, 86, 0, 83, 81], [79, 0, 76, 0, 79, 81, 83, 0], [84, 0, 83, 81, 79, 0, 76, 0], [78, 0, 74, 76, 79, 0, 0, null],
    ],
  },
];

let out = null, timer = null, cur = 0, step = 0, nextT = 0, noiseBuf = null;
const VOL = 0.07;

function note(ctx, f, t, dur, type, vol, opts = {}) {
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t);
  if (opts.vib) { const l = ctx.createOscillator(), lg = ctx.createGain(); l.frequency.value = 5.5; lg.gain.value = f * 0.012; l.connect(lg); lg.connect(o.frequency); l.start(t); l.stop(t + dur + 0.1); }
  if (opts.drop) o.frequency.exponentialRampToValueAtTime(opts.drop, t + dur);
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + (opts.att || 0.008));
  if (opts.sustain) { g.gain.setValueAtTime(vol, t + dur * 0.7); g.gain.linearRampToValueAtTime(0, t + dur); }
  else g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(out); o.start(t); o.stop(t + dur + 0.05);
}
function hat(ctx, t, vol) {
  if (!noiseBuf) { const n = ctx.sampleRate * 0.05; noiseBuf = ctx.createBuffer(1, n, ctx.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n); }
  const s = ctx.createBufferSource(); s.buffer = noiseBuf;
  const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 7000;
  const g = ctx.createGain(); g.gain.value = vol;
  s.connect(f); f.connect(g); g.connect(out); s.start(t);
}

// 一格 = 十六分音符
function schedule(ctx, tr, i, t) {
  const s16 = 60 / tr.bpm / 4, bar = Math.floor(i / 16) % 8, pos = i % 16;
  const ch = CH[tr.chords[bar]];
  // 旋律
  if (pos % 2 === 0) {
    const row = tr.mel[bar], k = pos / 2, m = row[k];
    if (m) {
      let len = 1; while (k + len < 8 && row[k + len] === 0) len++;
      const dur = len * 2 * s16;
      if (tr.lead === 'whistle') note(ctx, mtof(m), t, dur * 0.95, 'sine', 0.5, { vib: true, sustain: true, att: 0.04 });
      else note(ctx, mtof(m), t, Math.min(dur, 0.35), tr.lead, tr.lead === 'square' ? 0.18 : 0.45);
    }
  }
  // 伴奏
  if (tr.style === 'oompah') {
    if (pos === 0 || pos === 8) note(ctx, mtof(ch[0] - 12 + (pos === 8 ? 7 : 0)), t, 0.3, 'triangle', 0.55);
    if (pos === 4 || pos === 12) ch.forEach(m => note(ctx, mtof(m + 12), t, 0.12, 'triangle', 0.13));
    if (pos % 4 === 2) hat(ctx, t, 0.12);
  } else if (tr.style === 'arp') {
    if (pos % 2 === 0) note(ctx, mtof(ch[(pos / 2) % 3] + 24), t, 0.1, 'square', 0.07);
    if (pos === 0 || pos === 6 || pos === 8) note(ctx, mtof(ch[0] - 12), t, 0.22, 'triangle', 0.55);
    if (pos === 0 || pos === 8) note(ctx, 110, t, 0.15, 'sine', 0.5, { drop: 45 });
    if (pos === 4 || pos === 12) hat(ctx, t, 0.22);
    else if (pos % 2) hat(ctx, t, 0.06);
  } else {
    // 夏威夷小結他：掃弦
    if ([0, 3, 4, 7, 8, 11, 12, 14].includes(pos)) ch.forEach((m, j) => note(ctx, mtof(m + 12), t + j * 0.012, 0.25, 'triangle', 0.12));
    if (pos === 0 || pos === 8) note(ctx, mtof(ch[0] - 12), t, 0.4, 'sine', 0.6);
    if (pos % 4 === 2) hat(ctx, t, 0.05);
  }
}

function tick() {
  const ctx = audioCtx(); if (!ctx || !cur) return;
  const tr = TRACKS[cur - 1], s16 = 60 / tr.bpm / 4;
  if (nextT < ctx.currentTime) nextT = ctx.currentTime + 0.05;
  while (nextT < ctx.currentTime + 0.15) {
    // 搖擺節奏（悠閒小島）
    const sw = tr.style === 'uke' && step % 2 ? s16 * 0.3 : 0;
    schedule(ctx, tr, step, nextT + sw); step++; nextT += s16;
  }
}

export function playMusic(i) {
  const ctx = audioCtx(); cur = i; step = 0;
  if (!ctx) return;
  if (!out) { out = ctx.createGain(); out.gain.value = VOL; out.connect(ctx.destination); }
  nextT = ctx.currentTime + 0.1;
  if (!timer) timer = setInterval(tick, 40);
}
export const currentMusic = () => cur;
