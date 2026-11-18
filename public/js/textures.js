// 用 canvas 即場畫材質，唔使外部圖片
import * as THREE from 'three';

export function canvasTex(w, h, draw, repeatX = 1, repeatY = 1) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeatX, repeatY);
  t.anisotropy = 4;
  return t;
}

const rnd = (a, b) => a + Math.random() * (b - a);

export const tileTex = (rx, ry, base = '#d9d4c7', line = '#b9b2a2') => canvasTex(256, 256, (g, w, h) => {
  g.fillStyle = base; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 400; i++) { g.fillStyle = `rgba(0,0,0,${rnd(0, 0.04)})`; g.fillRect(rnd(0, w), rnd(0, h), 3, 3); }
  g.strokeStyle = line; g.lineWidth = 4;
  for (let i = 0; i <= 4; i++) { g.beginPath(); g.moveTo(i * 64, 0); g.lineTo(i * 64, h); g.stroke(); g.beginPath(); g.moveTo(0, i * 64); g.lineTo(w, i * 64); g.stroke(); }
}, rx, ry);

export const grassTex = (r) => canvasTex(256, 256, (g, w, h) => {
  g.fillStyle = '#5d8f3a'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 3000; i++) { g.fillStyle = `hsl(${rnd(80, 110)},45%,${rnd(25, 45)}%)`; g.fillRect(rnd(0, w), rnd(0, h), 2, 3); }
}, r, r);

export const roadTex = (rx, ry) => canvasTex(256, 256, (g, w, h) => {
  g.fillStyle = '#3a3b3f'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 2500; i++) { g.fillStyle = `rgba(255,255,255,${rnd(0, 0.06)})`; g.fillRect(rnd(0, w), rnd(0, h), 2, 2); }
  g.fillStyle = '#e8c34a'; g.fillRect(w / 2 - 4, 0, 8, h * 0.6);
}, rx, ry);

export const metalTex = (r = 1, base = '#9aa0a6') => canvasTex(256, 256, (g, w, h) => {
  g.fillStyle = base; g.fillRect(0, 0, w, h);
  for (let y = 0; y < h; y++) { g.fillStyle = `rgba(255,255,255,${rnd(0, 0.12)})`; g.fillRect(0, y, w, 1); }
}, r, r);

export const checkerPlateTex = (r = 2) => canvasTex(128, 128, (g, w, h) => {
  g.fillStyle = '#8b9096'; g.fillRect(0, 0, w, h);
  g.fillStyle = '#b5bac0';
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
    g.save(); g.translate(x * 16 + 8, y * 16 + 8); g.rotate(((x + y) % 2) ? 0.8 : -0.8); g.fillRect(-6, -1.5, 12, 3); g.restore();
  }
}, r, r);

export const hazardTex = () => canvasTex(256, 32, (g, w, h) => {
  g.fillStyle = '#f2c230'; g.fillRect(0, 0, w, h); g.fillStyle = '#111';
  for (let x = -h; x < w; x += 32) { g.beginPath(); g.moveTo(x, h); g.lineTo(x + 16, h); g.lineTo(x + 16 + h, 0); g.lineTo(x + h, 0); g.fill(); }
}, 4, 1);

// 酒店外牆：深紅銅色玻璃 + 金色菱形花格（參考澳門某著名金色酒店風格）
export const hotelFacadeTex = (rx, ry) => canvasTex(256, 256, (g, w, h) => {
  const grd = g.createLinearGradient(0, 0, 0, h);
  grd.addColorStop(0, '#6b2a1a'); grd.addColorStop(1, '#4a1a10');
  g.fillStyle = grd; g.fillRect(0, 0, w, h);
  // 窗燈
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
    g.fillStyle = Math.random() < 0.35 ? 'rgba(255,214,140,0.55)' : 'rgba(30,10,5,0.4)';
    g.fillRect(x * 32 + 8, y * 32 + 10, 16, 14);
  }
  // 金色菱形格
  g.strokeStyle = '#e8b85a'; g.lineWidth = 5;
  for (let i = -2; i <= 4; i++) {
    g.beginPath(); g.moveTo(i * 64, 0); g.lineTo(i * 64 + 128, h); g.stroke();
    g.beginPath(); g.moveTo(i * 64 + 128, 0); g.lineTo(i * 64, h); g.stroke();
  }
  g.fillStyle = '#ffd77a';
  for (let y = 0; y <= 4; y++) for (let x = 0; x <= 4; x++) { g.beginPath(); g.arc(x * 64, y * 64, 6, 0, 7); g.fill(); }
  g.strokeStyle = '#c9963c'; g.lineWidth = 2;
  for (let y = 0; y <= 8; y++) { g.beginPath(); g.moveTo(0, y * 32); g.lineTo(w, y * 32); g.stroke(); }
}, rx, ry);

export function signTex(text, bg = '#1d3b6e', fg = '#fff', w = 512, h = 128, font = 'bold 64px sans-serif') {
  return canvasTex(w, h, (g) => {
    g.fillStyle = bg; g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(255,255,255,0.6)'; g.lineWidth = 6; g.strokeRect(6, 6, w - 12, h - 12);
    g.fillStyle = fg; g.font = font; g.textAlign = 'center'; g.textBaseline = 'middle';
    const lines = text.split('\n');
    const mw = Math.max(...lines.map(l => g.measureText(l).width));   // 太長就縮細字，唔會切走
    if (mw > w - 28) { const m = font.match(/(\d+)px/); if (m) g.font = font.replace(m[0], Math.floor(+m[1] * (w - 28) / mw) + 'px'); }
    lines.forEach((l, i) => g.fillText(l, w / 2, h / 2 + (i - (lines.length - 1) / 2) * (h / lines.length) * 0.9));
  });
}

export const earthTex = () => canvasTex(2048, 1024, (g, w, h) => {
  g.fillStyle = '#1b4f8a'; g.fillRect(0, 0, w, h);
  // 隨機大陸
  for (let c = 0; c < 22; c++) {
    const cx = rnd(0, w), cy = rnd(h * 0.15, h * 0.85), r = rnd(40, 180);
    for (let i = 0; i < 60; i++) {
      const a = rnd(0, 7), d = rnd(0, r);
      g.fillStyle = `hsl(${rnd(70, 110)},${rnd(25, 45)}%,${rnd(25, 40)}%)`;
      g.beginPath(); g.ellipse(cx + Math.cos(a) * d, cy + Math.sin(a) * d * 0.7, rnd(20, 70), rnd(15, 50), rnd(0, 3), 0, 7); g.fill();
    }
  }
  g.fillStyle = '#eef4f8'; g.fillRect(0, 0, w, h * 0.06); g.fillRect(0, h * 0.94, w, h * 0.06);
  // 雲
  for (let i = 0; i < 500; i++) { g.fillStyle = `rgba(255,255,255,${rnd(0.15, 0.5)})`; g.beginPath(); g.ellipse(rnd(0, w), rnd(0, h), rnd(10, 60), rnd(4, 18), rnd(0, 3), 0, 7); g.fill(); }
});

export const cloudTex = () => {
  const t = canvasTex(256, 256, (g, w, h) => {
    for (let i = 0; i < 26; i++) {
      const x = rnd(60, 196), y = rnd(90, 166), r = rnd(30, 60);
      const grd = g.createRadialGradient(x, y, 0, x, y, r);
      grd.addColorStop(0, 'rgba(255,255,255,0.9)'); grd.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = grd; g.fillRect(0, 0, w, h);
    }
  });
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
};

export const solarTex = () => canvasTex(128, 256, (g, w, h) => {
  g.fillStyle = '#c99a2e'; g.fillRect(0, 0, w, h);
  g.fillStyle = '#1e2a5a';
  for (let y = 0; y < 16; y++) for (let x = 0; x < 8; x++) g.fillRect(x * 16 + 1, y * 16 + 1, 14, 14);
}, 1, 1);

export const woodTex = (r = 1) => canvasTex(256, 256, (g, w, h) => {
  g.fillStyle = '#9b6b3d'; g.fillRect(0, 0, w, h);
  for (let y = 0; y < h; y += 2) { g.fillStyle = `rgba(60,30,10,${rnd(0, 0.18)})`; g.fillRect(0, y, w, 2); }
}, r, r);
