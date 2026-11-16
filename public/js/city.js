// 大地圖：10 公里 × 10 公里，用「分區載入」（chunk）——只建玩家附近嘅區，遠啲用簡化模型，再遠就唔建
// 每區 200 × 200 米，區同區之間有馬路；內容用固定隨機種子生成，所以所有玩家見到嘅城市一樣
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import * as TX from './textures.js';

export const CHUNK = 200, HALF_WORLD = 5000, NCH = 25;          // 區號 -24..24
export const TOWN = { x0: -300, x1: 300, z0: -300, z1: 100 };   // 原本小鎮（唔生成）
const NEAR = 1, FAR = 4, M = 94;                                 // 近區半徑、遠區半徑、區內可用半闊
const std = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.8, ...extra });

// ---------- 固定隨機 ----------
const hash = (i, j, s = 0) => { let h = (i * 374761393 + j * 668265263 + s * 982451653) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296; };
function vnoise(x, y, s) {
  const i = Math.floor(x), j = Math.floor(y), fx = x - i, fy = y - j, u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
  const a = hash(i, j, s), b = hash(i + 1, j, s), c = hash(i, j + 1, s), d = hash(i + 1, j + 1, s);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

const inTown = (i, j) => i * CHUNK + 100 > TOWN.x0 && i * CHUNK - 100 < TOWN.x1 && j * CHUNK + 100 > TOWN.z0 && j * CHUNK - 100 < TOWN.z1;
export const LANDMARKS = [
  { i: 6, j: -5, type: 'stadium', name: '🏟 大球場' },
  { i: -9, j: 7, type: 'lake', name: '🌊 大湖' },
  { i: 14, j: 12, type: 'lake', name: '🌊 東湖' },
  { i: -15, j: -14, type: 'lake', name: '🌊 西湖' },
];
const lmAt = (i, j) => LANDMARKS.find(l => l.i === i && l.j === j);
// 區域類型：市中心高樓 → 住宅 → 郊外森林 / 農田 / 湖
export function district(i, j) {
  if (Math.abs(i) > 24 || Math.abs(j) > 24) return 'none';
  if (inTown(i, j)) return 'town';
  const lm = lmAt(i, j); if (lm) return lm.type;
  const d = Math.hypot(i, j) * CHUNK, n = vnoise(i * 0.18, j * 0.18, 1), n2 = vnoise(i * 0.35 + 50, j * 0.35 - 20, 2);
  if (d < 1600) return n > 0.3 ? 'city' : n2 > 0.5 ? 'park' : 'res';
  if (d < 3200) return n > 0.62 ? 'city' : n > 0.3 ? 'res' : n2 > 0.55 ? 'park' : 'forest';
  if (n < 0.2) return 'lake';
  if (n > 0.6) return 'forest';
  return n2 > 0.45 ? 'farm' : n2 > 0.25 ? 'res' : 'forest';
}
export const DISTRICT_COLOR = { city: '#8a9bb0', res: '#e8c9a0', park: '#7cc47c', forest: '#2e7d32', farm: '#d4c26a', lake: '#4aa3df', stadium: '#e57373', town: '#ffd54f', none: '#335' };
export const DISTRICT_NAME = { city: '市中心', res: '住宅區', park: '公園', forest: '森林', farm: '農田', lake: '湖', stadium: '大球場', town: '小鎮', none: '' };

// ---------- 材質 ----------
function facadeTex(wall, win, frame, cellW = 64, cellH = 56, ww = 0.6, wh = 0.55) {
  return TX.canvasTex(cellW, cellH, (g, w, h) => {
    g.fillStyle = wall; g.fillRect(0, 0, w, h);
    g.fillStyle = win; g.fillRect(w * (1 - ww) / 2, h * (1 - wh) / 2, w * ww, h * wh);
    g.fillStyle = 'rgba(255,255,255,0.18)'; g.fillRect(w * (1 - ww) / 2, h * (1 - wh) / 2, w * ww * 0.35, h * wh);
    if (frame) { g.fillStyle = frame; g.fillRect(0, h - 4, w, 4); }
  });
}
const FAC = [
  { m: std('#fff', { map: facadeTex('#7d8fa3', '#2c5a85', '#5d6f83', 64, 56, 0.86, 0.8), metalness: 0.4, roughness: 0.35 }), c: '#4f6f90' },
  { m: std('#fff', { map: facadeTex('#d9c9a6', '#3b4a5a', '#b9a986', 64, 56, 0.5, 0.5) }), c: '#c7b48e' },
  { m: std('#fff', { map: facadeTex('#2f343c', '#5d7a99', '#1f242c', 64, 56, 0.9, 0.7), metalness: 0.5, roughness: 0.3 }), c: '#3d4652' },
  { m: std('#fff', { map: facadeTex('#ececec', '#4a6a8a', '#cfcfcf', 64, 56, 0.5, 0.55) }), c: '#d8dde2' },
  { m: std('#fff', { map: facadeTex('#b5653f', '#33404e', '#8d4a2e', 64, 56, 0.45, 0.55) }), c: '#a65c3a' },
];
const houseTex = facadeTex('#ffffff', '#5b7d9c', null, 64, 64, 0.42, 0.42);
const HOUSE = ['#fff4e0', '#ffe0e0', '#e0f0ff', '#e8ffe0', '#fff8c0'].map(c => std(c, { map: houseTex }));
const ROOF = ['#b23a2e', '#6d4c41', '#455a64', '#2e7d32', '#8d6e63'].map(c => std(c, { roughness: 0.7 }));
const MAT = {
  roof: std('#8a8f96'), pave: std('#fff', { map: TX.tileTex(1, 1, '#c9c6bf', '#a9a59c') }),
  trunk: std('#6d4c2f'), leaf: std('#3f8f3a'), pine: std('#1f5f2a'), water: std('#2a7fb8', { metalness: 0.5, roughness: 0.1 }), sand: std('#e6d3a3'),
  wood: std('#8d6e4f'), red: std('#b71c1c'), white: std('#f0f0f0'), steel: std('#9aa3aa', { metalness: 0.7, roughness: 0.35 }),
  wheat: std('#d9b44a'), crop: std('#5fa84a'), soil: std('#7a5a3a'), grassF: std('#4caf50'), glassAnt: std('#ff5252', { emissive: '#ff1744', emissiveIntensity: 1 }),
  road: std('#fff', { map: TX.roadTex(1, 1) }),
};
const LOD_MAT = new THREE.MeshLambertMaterial({ vertexColors: true });

// ---------- 幾何工具 ----------
// 盒，窗格貼圖按實際尺寸重複（每格 4 米闊 × 3.5 米高）
function boxGeo(x0, y0, z0, x1, y1, z1, uw = 4, uh = 3.5) {
  const w = x1 - x0, h = y1 - y0, d = z1 - z0, g = new THREE.BoxGeometry(w, h, d), uv = g.attributes.uv;
  const sc = [[d / uw, h / uh], [d / uw, h / uh], [w / 8, d / 8], [w / 8, d / 8], [w / uw, h / uh], [w / uw, h / uh]];
  for (let f = 0; f < 6; f++) for (let k = 0; k < 4; k++) { const i = f * 4 + k; uv.setXY(i, uv.getX(i) * sc[f][0], uv.getY(i) * sc[f][1]); }
  g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2); return g;
}
// 馬路：標線沿住條路嘅長邊
function roadGeo(x0, z0, x1, z1, y) {
  const along = (z1 - z0) > (x1 - x0), L = Math.max(x1 - x0, z1 - z0), g = new THREE.PlaneGeometry(x1 - x0, z1 - z0); g.rotateX(-Math.PI / 2);
  const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) { const u = uv.getX(i), v = uv.getY(i); if (along) uv.setXY(i, v * L / 12, u); else uv.setXY(i, u * L / 12, v); }
  g.translate((x0 + x1) / 2, y, (z0 + z1) / 2); return g;
}
function planeGeo(x0, z0, x1, z1, y, s = 4) {
  const g = new THREE.PlaneGeometry(x1 - x0, z1 - z0); g.rotateX(-Math.PI / 2);
  const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * (x1 - x0) / s, uv.getY(i) * (z1 - z0) / s);
  g.translate((x0 + x1) / 2, y, (z0 + z1) / 2); return g;
}
class Batch {
  constructor() { this.parts = new Map(); this.cols = []; }
  add(g, m) { if (!this.parts.has(m)) this.parts.set(m, []); this.parts.get(m).push(g); }
  box(x0, y0, z0, x1, y1, z1, m, col = true, uw, uh) { this.add(boxGeo(x0, y0, z0, x1, y1, z1, uw, uh), m); if (col) this.cols.push({ min: [x0, y0, z0], max: [x1, y1, z1] }); }
  build() {
    const g = new THREE.Group();
    for (const [m, list] of this.parts) { const mg = mergeGeometries(list, false); list.forEach(x => x.dispose()); const mesh = new THREE.Mesh(mg, m); mesh.receiveShadow = true; mesh.castShadow = false; g.add(mesh); }
    return g;
  }
}
function tree(B, x, z, s, pine) {
  const t = new THREE.CylinderGeometry(0.2 * s, 0.3 * s, 2.4 * s, 6); t.translate(x, 1.2 * s, z); B.add(t, MAT.trunk);
  if (pine) { [0, 1].forEach(k => { const c = new THREE.ConeGeometry((2.2 - k * 0.7) * s, 3.2 * s, 7); c.translate(x, (3.2 + k * 1.8) * s, z); B.add(c, MAT.pine); }); }
  else { const l = new THREE.IcosahedronGeometry(1.9 * s, 0); l.translate(x, 3.6 * s, z); B.add(l, MAT.leaf); }
  B.cols.push({ min: [x - 0.3 * s, 0, z - 0.3 * s], max: [x + 0.3 * s, 2.4 * s, z + 0.3 * s] });
}

// ---------- 每區嘅規劃（近 / 遠都用同一份，所以一樣）----------
function plan(i, j) {
  const t = district(i, j), R = rng(Math.floor(hash(i, j, 7) * 4294967296)), cx = i * CHUNK, cz = j * CHUNK;
  const P = { t, cx, cz, b: [], h: [], trees: [], R };
  const d = Math.hypot(cx, cz);
  const quads = [[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([qx, qz]) => [cx + (qx < 0 ? -M : 7), cz + (qz < 0 ? -M : 7), cx + (qx < 0 ? -7 : M), cz + (qz < 0 ? -7 : M)]);
  if (t === 'city') {
    const hmax = Math.max(30, 175 - d * 0.045);
    for (const [x0, z0, x1, z1] of quads) {
      const r = R();
      if (r < 0.1) { for (let k = 0; k < 7; k++) P.trees.push([x0 + 6 + R() * (x1 - x0 - 12), z0 + 6 + R() * (z1 - z0 - 12), 1 + R() * 0.4, false]); continue; }
      if (r < 0.45) {
        const m = 8 + R() * 10, h = hmax * (0.6 + R() * 0.6) * (R() < 0.08 ? 1.7 : 1), f = Math.floor(R() * FAC.length);
        P.b.push({ x0: x0 + m, z0: z0 + m, x1: x1 - m, z1: z1 - m, y0: 0, y1: h, f });
        if (R() < 0.45) { const s = (x1 - x0 - 2 * m) * 0.22; P.b.push({ x0: x0 + m + s, z0: z0 + m + s, x1: x1 - m - s, z1: z1 - m - s, y0: h, y1: h + h * 0.25, f, top: true }); }
      } else {
        const mx = (x0 + x1) / 2, mz = (z0 + z1) / 2;
        for (const [a0, b0, a1, b1] of [[x0, z0, mx, mz], [mx, z0, x1, mz], [x0, mz, mx, z1], [mx, mz, x1, z1]]) {
          if (R() < 0.15) { P.trees.push([(a0 + a1) / 2, (b0 + b1) / 2, 1.1, false]); continue; }
          const m = 3 + R() * 5; P.b.push({ x0: a0 + m, z0: b0 + m, x1: a1 - m, z1: b1 - m, y0: 0, y1: Math.max(12, hmax * (0.2 + R() * 0.55)), f: Math.floor(R() * FAC.length) });
        }
      }
    }
    for (let k = -80; k <= 80; k += 20) { P.trees.push([cx + 9.5, cz + k, 0.8, false]); P.trees.push([cx + k, cz + 9.5, 0.8, false]); }
  } else if (t === 'res') {
    for (const [x0, z0, x1, z1] of quads) {
      for (let a = 0; a < 2; a++) for (let b = 0; b < 2; b++) {
        const lx0 = x0 + a * (x1 - x0) / 2, lz0 = z0 + b * (z1 - z0) / 2, L = (x1 - x0) / 2;
        if (R() < 0.12) { P.b.push({ x0: lx0 + 6, z0: lz0 + 6, x1: lx0 + L - 6, z1: lz0 + L - 6, y0: 0, y1: 14 + R() * 16, f: 3 + Math.floor(R() * 2) }); continue; }
        const w = 8 + R() * 4, dd = 9 + R() * 4, hx = lx0 + 4 + R() * (L - w - 8), hz = lz0 + 4 + R() * (L - dd - 8);
        P.h.push({ x0: hx, z0: hz, x1: hx + w, z1: hz + dd, y1: 5 + R() * 3, wall: Math.floor(R() * HOUSE.length), roof: Math.floor(R() * ROOF.length) });
        if (R() < 0.8) P.trees.push([lx0 + 3 + R() * (L - 6), lz0 + 3 + R() * (L - 6), 0.8 + R() * 0.5, false]);
      }
    }
  } else if (t === 'park') {
    for (let k = 0; k < 45; k++) { const x = cx - M + 4 + R() * (2 * M - 8), z = cz - M + 4 + R() * (2 * M - 8); if (Math.hypot(x - cx, z - cz) > 34 && Math.abs(x - cx) > 4 && Math.abs(z - cz) > 4) P.trees.push([x, z, 1 + R() * 0.6, R() < 0.3]); }
  } else if (t === 'forest') {
    for (let k = 0; k < 130; k++) P.trees.push([cx - M + 3 + R() * (2 * M - 6), cz - M + 3 + R() * (2 * M - 6), 1 + R() * 0.9, R() < 0.75]);
  } else if (t === 'farm') {
    for (let k = 0; k < 14; k++) P.trees.push([cx - M + 2 + R() * 2 * M, cz + (R() < 0.5 ? -M + 2 : M - 2), 1, false]);
    P.barn = [cx + (R() - 0.5) * 100, cz + (R() - 0.5) * 100];
  } else if (t === 'lake') {
    P.rx = 70 + R() * 20; P.rz = 60 + R() * 25;
    for (let k = 0; k < 26; k++) { const a = R() * Math.PI * 2, r = 1.12 + R() * 0.25; P.trees.push([cx + Math.cos(a) * P.rx * r, cz + Math.sin(a) * P.rz * r, 1 + R() * 0.5, R() < 0.5]); }
  }
  return P;
}

// ---------- 近區：完整模型 + 碰撞 ----------
function buildNear(P) {
  const B = new Batch(), { cx, cz, t, R } = P;
  if (t === 'city') {
    B.add(planeGeo(cx - M - 0.5, cz - M - 0.5, cx + M + 0.5, cz + M + 0.5, 0.012, 3), MAT.pave);
    B.add(roadGeo(cx - 6, cz - M, cx + 6, cz + M, 0.02), MAT.road); B.add(roadGeo(cx - M, cz - 6, cx + M, cz + 6, 0.022), MAT.road);
  }
  if (t === 'res') { B.add(roadGeo(cx - 6, cz - M, cx + 6, cz + M, 0.02), MAT.road); B.add(roadGeo(cx - M, cz - 6, cx + M, cz + 6, 0.022), MAT.road); }
  for (const b of P.b) {
    B.box(b.x0, b.y0, b.z0, b.x1, b.y1, b.z1, FAC[b.f].m);
    B.box(b.x0 - 0.3, b.y1, b.z0 - 0.3, b.x1 + 0.3, b.y1 + 0.6, b.z1 + 0.3, MAT.roof, false);
    if (b.y1 > 40) { B.box((b.x0 + b.x1) / 2 - 3, b.y1 + 0.6, (b.z0 + b.z1) / 2 - 2, (b.x0 + b.x1) / 2 + 3, b.y1 + 3.6, (b.z0 + b.z1) / 2 + 2, MAT.roof, false); }
    if (b.y1 > 120) { const a = new THREE.CylinderGeometry(0.15, 0.3, 14, 6); a.translate((b.x0 + b.x1) / 2, b.y1 + 7, (b.z0 + b.z1) / 2); B.add(a, MAT.steel); const s = new THREE.SphereGeometry(0.5, 8, 6); s.translate((b.x0 + b.x1) / 2, b.y1 + 14.3, (b.z0 + b.z1) / 2); B.add(s, MAT.glassAnt); }
    if (!b.top) B.box((b.x0 + b.x1) / 2 - 2, 0, b.z1, (b.x0 + b.x1) / 2 + 2, 3, b.z1 + 0.15, MAT.steel, false);
  }
  for (const h of P.h) {
    B.box(h.x0, 0, h.z0, h.x1, h.y1, h.z1, HOUSE[h.wall], true, 3, 2.8);
    const w = h.x1 - h.x0, d = h.z1 - h.z0, r = Math.max(w, d) * 0.72, rh = 2.6 + w * 0.1;
    const roof = new THREE.ConeGeometry(r, rh, 4); roof.rotateY(Math.PI / 4); roof.scale(w * 1.12 / (r * Math.SQRT2), 1, d * 1.12 / (r * Math.SQRT2)); roof.translate((h.x0 + h.x1) / 2, h.y1 + rh / 2, (h.z0 + h.z1) / 2); B.add(roof, ROOF[h.roof]);
    B.box((h.x0 + h.x1) / 2 - 0.6, 0, h.z1, (h.x0 + h.x1) / 2 + 0.6, 2.1, h.z1 + 0.08, MAT.wood, false);
    // 圍欄
    B.box(h.x0 - 3, 0, h.z1 + 3, (h.x0 + h.x1) / 2 - 1, 0.8, h.z1 + 3.1, MAT.white); B.box((h.x0 + h.x1) / 2 + 1, 0, h.z1 + 3, h.x1 + 3, 0.8, h.z1 + 3.1, MAT.white);
  }
  for (const [x, z, s, pine] of P.trees) tree(B, x, z, s, pine);
  if (t === 'park') {
    B.add(planeGeo(cx - 3, cz - M, cx + 3, cz + M, 0.015, 3), MAT.sand); B.add(planeGeo(cx - M, cz - 3, cx + M, cz + 3, 0.016, 3), MAT.sand);
    const pond = new THREE.CircleGeometry(26, 32); pond.rotateX(-Math.PI / 2); pond.translate(cx + 0, 0.03, cz + 0); B.add(pond, MAT.water);
    const ring = new THREE.RingGeometry(26, 29, 32); ring.rotateX(-Math.PI / 2); ring.translate(cx, 0.025, cz); B.add(ring, MAT.sand);
    const f = new THREE.CylinderGeometry(2.5, 3, 1, 16); f.translate(cx, 0.5, cz); B.add(f, MAT.white);
    for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2, x = cx + Math.cos(a) * 31, z = cz + Math.sin(a) * 31; B.box(x - 0.9, 0, z - 0.3, x + 0.9, 0.45, z + 0.3, MAT.wood); }
  }
  if (t === 'farm') {
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([qx, qz], k) => {
      const x0 = cx + (qx < 0 ? -M : 4), x1 = cx + (qx < 0 ? -4 : M), z0 = cz + (qz < 0 ? -M : 4), z1 = cz + (qz < 0 ? -4 : M);
      const crops = [[MAT.wheat, MAT.soil], [MAT.crop, MAT.soil], [MAT.grassF, MAT.crop], [MAT.wheat, MAT.crop]][(k + Math.floor(hash(P.cx, P.cz, 3) * 4)) % 4];
      for (let s = 0; s < 10; s++) { const a = z0 + (z1 - z0) * s / 10; B.add(planeGeo(x0, a, x1, a + (z1 - z0) / 10, 0.015 + s * 0.0005, 6), crops[s % 2]); }
    });
    const [bx, bz] = P.barn;
    B.box(bx - 8, 0, bz - 6, bx + 8, 7, bz + 6, MAT.red, true, 16, 7);
    const gab = new THREE.CylinderGeometry(7.2, 7.2, 16.4, 3, 1); gab.rotateZ(Math.PI / 2); gab.rotateX(Math.PI / 6); gab.scale(1, 0.55, 1); gab.translate(bx, 9.5, bz); B.add(gab, MAT.white);
    const silo = new THREE.CylinderGeometry(3, 3, 14, 14); silo.translate(bx + 13, 7, bz); B.add(silo, MAT.steel); B.cols.push({ min: [bx + 10, 0, bz - 3], max: [bx + 16, 14, bz + 3] });
    const cap = new THREE.ConeGeometry(3.2, 3, 14); cap.translate(bx + 13, 15.5, bz); B.add(cap, MAT.red);
  }
  if (t === 'lake') {
    const w = new THREE.CircleGeometry(1, 40); w.rotateX(-Math.PI / 2); w.scale(P.rx, 1, P.rz); w.translate(cx, 0.04, cz); B.add(w, MAT.water);
    const s = new THREE.CircleGeometry(1, 40); s.rotateX(-Math.PI / 2); s.scale(P.rx + 6, 1, P.rz + 6); s.translate(cx, 0.03, cz); B.add(s, MAT.sand);
    B.box(cx + P.rx - 22, 0.05, cz - 1.5, cx + P.rx + 4, 0.45, cz + 1.5, MAT.wood);            // 碼頭
  }
  if (t === 'stadium') {
    const outer = new THREE.CylinderGeometry(78, 78, 22, 48, 1, true); outer.scale(1, 1, 0.75); outer.translate(cx, 11, cz); B.add(outer, MAT.white);
    const tiers = new THREE.CylinderGeometry(76, 50, 20, 48, 1, true); tiers.scale(1, 1, 0.75); tiers.translate(cx, 10, cz); B.add(tiers, std('#c62828', { side: THREE.DoubleSide }));
    B.add(planeGeo(cx - 45, cz - 30, cx + 45, cz + 30, 0.03, 8), MAT.grassF);
    B.box(cx - 0.2, 0.031, cz - 30, cx + 0.2, 0.04, cz + 30, MAT.white, false); B.box(cx - 45, 0.031, cz - 0.2, cx + 45, 0.04, cz + 0.2, MAT.white, false);
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => { B.box(cx + a * 70 - 0.6, 0, cz + b * 52 - 0.6, cx + a * 70 + 0.6, 40, cz + b * 52 + 0.6, MAT.steel); B.box(cx + a * 70 - 4, 40, cz + b * 52 - 1, cx + a * 70 + 4, 44, cz + b * 52 + 1, std('#fffde7', { emissive: '#fff59d', emissiveIntensity: 1 }), false); });
    // 入口隧道：南面
    for (let k = 0; k < 16; k++) { const a = k / 16 * Math.PI * 2; if (Math.abs(Math.sin(a) - 1) < 0.1) continue; const x = cx + Math.cos(a) * 78, z = cz + Math.sin(a) * 58; B.cols.push({ min: [x - 9, 0, z - 9], max: [x + 9, 22, z + 9] }); }
  }
  return B;
}

// ---------- 遠區：一個 Mesh、頂點顏色 ----------
const tmpC = new THREE.Color();
function coloredBox(x0, y0, z0, x1, y1, z1, color) {
  const g = new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0); g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
  g.deleteAttribute('uv'); tmpC.set(color); const n = g.attributes.position.count, c = new Float32Array(n * 3);
  for (let k = 0; k < n; k++) { const shade = g.attributes.normal.getY(k) > 0.5 ? 0.75 : 1; c[k * 3] = tmpC.r * shade; c[k * 3 + 1] = tmpC.g * shade; c[k * 3 + 2] = tmpC.b * shade; }
  g.setAttribute('color', new THREE.BufferAttribute(c, 3)); return g;
}
function buildFar(P) {
  const list = [];
  for (const b of P.b) list.push(coloredBox(b.x0, b.y0, b.z0, b.x1, b.y1, b.z1, FAC[b.f].c));
  for (const h of P.h) { list.push(coloredBox(h.x0, 0, h.z0, h.x1, h.y1, h.z1, '#f2e6d0')); list.push(coloredBox(h.x0, h.y1, h.z0, h.x1, h.y1 + 2.5, h.z1, ROOF[h.roof].color.getStyle())); }
  for (let k = 0; k < P.trees.length; k += 2) { const [x, z, s, pine] = P.trees[k]; list.push(coloredBox(x - 1.6 * s, 1.5 * s, z - 1.6 * s, x + 1.6 * s, 5.5 * s, z + 1.6 * s, pine ? '#1f5f2a' : '#3f8f3a')); }
  if (P.t === 'lake') list.push(coloredBox(P.cx - P.rx * 0.8, 0.02, P.cz - P.rz * 0.8, P.cx + P.rx * 0.8, 0.06, P.cz + P.rz * 0.8, '#2a7fb8'));
  if (P.t === 'stadium') list.push(coloredBox(P.cx - 75, 0, P.cz - 56, P.cx + 75, 22, P.cz + 56, '#e0e0e0'));
  if (P.t === 'farm') list.push(coloredBox(P.cx - M, 0.01, P.cz - M, P.cx + M, 0.03, P.cz + M, '#c9b65a'));
  if (!list.length) return null;
  const g = mergeGeometries(list, false); list.forEach(x => x.dispose());
  return new THREE.Mesh(g, LOD_MAT);
}

// ---------- 全地圖馬路（一次過建好，好平）----------
function buildRoads(scene) {
  const segs = [];
  const rd = MAT.road;
  const lines = []; for (let k = -24; k <= 25; k++) lines.push(k * CHUNK - 100);
  // 沿 z 方向（固定 x）
  const zParts = [], xParts = [];
  for (const x of lines) {
    const cut = x > TOWN.x0 && x < TOWN.x1 ? [[-HALF_WORLD, TOWN.z0], [TOWN.z1, HALF_WORLD]] : [[-HALF_WORLD, HALF_WORLD]];
    cut.forEach(([a, b]) => { const g = new THREE.PlaneGeometry(12, b - a); g.rotateX(-Math.PI / 2); const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getY(i) * (b - a) / 12, uv.getX(i)); g.translate(x, 0.01, (a + b) / 2); zParts.push(g); });
  }
  for (const z of lines) {
    const cut = z > TOWN.z0 && z < TOWN.z1 ? [[-HALF_WORLD, TOWN.x0], [TOWN.x1, HALF_WORLD]] : [[-HALF_WORLD, HALF_WORLD]];
    cut.forEach(([a, b]) => { const g = new THREE.PlaneGeometry(b - a, 12); g.rotateX(-Math.PI / 2); const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setX(i, uv.getX(i) * (b - a) / 12); g.translate((a + b) / 2, 0.011, z); xParts.push(g); });
  }
  const m1 = new THREE.Mesh(mergeGeometries(zParts), rd), m2 = new THREE.Mesh(mergeGeometries(xParts), rd);
  m1.receiveShadow = m2.receiveShadow = true; scene.add(m1, m2);
}

// ======================================================================
export function buildCity(scene, grid) {
  buildRoads(scene);
  // 世界邊界（隱形牆）
  const W = HALF_WORLD;
  grid.add([
    { min: [-W - 5, -10, -W - 5], max: [W + 5, 80, -W] }, { min: [-W - 5, -10, W], max: [W + 5, 80, W + 5] },
    { min: [-W - 5, -10, -W - 5], max: [-W, 80, W + 5] }, { min: [W, -10, -W - 5], max: [W + 5, 80, W + 5] },
  ]);
  const root = new THREE.Group(); scene.add(root);
  const chunks = new Map(), key = (i, j) => i * 1000 + j;
  let lastC = null, queue = [];
  const get = (i, j) => { const k = key(i, j); let c = chunks.get(k); if (!c) { c = { i, j, plan: null, near: null, far: null }; chunks.set(k, c); } return c; };
  const planOf = c => c.plan || (c.plan = plan(c.i, c.j));
  function dropNear(c) { if (!c.near) return; root.remove(c.near.g); c.near.g.traverse(o => o.geometry?.dispose()); grid.remove(c.near.cols); c.near = null; if (c.far) c.far.visible = true; }
  function dropFar(c) { if (!c.far) return; root.remove(c.far); c.far.geometry.dispose(); c.far = null; }
  function makeNear(c) {
    const B = buildNear(planOf(c)); const g = B.build(); root.add(g);
    c.near = { g, cols: B.cols }; grid.add(B.cols); if (c.far) c.far.visible = false;
  }
  function makeFar(c) { const m = buildFar(planOf(c)); c.far = m || false; if (m) { m.visible = !c.near; root.add(m); } }

  function update(p, budgetMs = 6) {
    const ci = Math.round(p.x / CHUNK), cj = Math.round(p.z / CHUNK);
    if (!lastC || lastC[0] !== ci || lastC[1] !== cj) {
      lastC = [ci, cj];
      // 卸載太遠嘅
      for (const c of chunks.values()) {
        const di = Math.max(Math.abs(c.i - ci), Math.abs(c.j - cj));
        if (di > NEAR + 1) dropNear(c);
        if (di > FAR + 1) { dropFar(c); chunks.delete(key(c.i, c.j)); }
      }
      // 排隊建
      queue = [];
      for (let di = -FAR; di <= FAR; di++) for (let dj = -FAR; dj <= FAR; dj++) {
        const i = ci + di, j = cj + dj, t = district(i, j); if (t === 'none' || t === 'town') continue;
        const ring = Math.max(Math.abs(di), Math.abs(dj)), c = get(i, j);
        if (ring <= NEAR && !c.near) queue.push({ c, near: true, d: ring - 10 });
        else if (c.far === null) queue.push({ c, near: false, d: Math.hypot(di, dj) });
      }
      queue.sort((a, b) => a.d - b.d);
    }
    const t0 = performance.now();
    while (queue.length && performance.now() - t0 < budgetMs) {
      const q = queue.shift();
      if (q.near) { if (!q.c.near) makeNear(q.c); } else if (q.c.far === null) makeFar(q.c);
    }
  }
  function loadAll(p) { lastC = null; update(p, 1e9); }
  return { update, loadAll, chunks };
}
