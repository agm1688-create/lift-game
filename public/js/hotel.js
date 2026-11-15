// 柏熙酒店：20 層（行樓梯或者搭酒店 Lift 都上到）、大堂接待處、排隊 Check-in、
// 單人房 / 雙人房 / 總統套房、消防喉轆 + 滅火筒、天台
// 2–19 樓用同一個樓層模板（InstancedMesh），所以 20 層都唔會太食機
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import * as TX from './textures.js';
import { goldMat, buildAvatar, animateAvatar, SKINS, SHIRTS } from './avatar.js';
import { doorOpenness } from './lifts.js';

export const HOTEL = { x: 55, z: -125, floors: 20, fh: 4 };
const HX = HOTEL.x, HZ = HOTEL.z, FH = 4, NF = 20, CEIL = FH - 0.3;
export const hotelFloorY = f => (f - 1) * FH;
const CAR_Z0 = -9.8, CAR_Z1 = -6.6, CAR_HW = 1.4, CAR_H = 3.0, FRONT_Z = -6.4;
const ease = u => (1 - Math.cos(Math.PI * u)) / 2;
export function hotelFloorAt(L, T) {
  if (T <= L.t0) return L.from;
  if (T >= L.t0 + L.dur) return L.to;
  return L.from + (L.to - L.from) * ease((T - L.t0) / L.dur);
}
const isMov = (L, T) => T > L.t0 && T < L.t0 + L.dur;

const std = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.7, ...extra });
const basic = color => new THREE.MeshBasicMaterial({ color });
const signMat = (text, bg, fg, w = 512, h = 128, font) => new THREE.MeshBasicMaterial({ map: TX.signTex(text, bg, fg, w, h, font) });

// ---------- 材質 ----------
const M = {
  slab: std('#f3efe8', { emissive: '#8a847a', emissiveIntensity: 0.55 }),
  wall: std('#efe4d0'),
  wall2: std('#d9c7a6'),
  corr: std('#fff', { map: TX.canvasTex(128, 128, (g, w, h) => { g.fillStyle = '#7a1520'; g.fillRect(0, 0, w, h); g.strokeStyle = '#c9a03c'; g.lineWidth = 3; g.strokeRect(8, 8, w - 16, h - 16); g.beginPath(); g.moveTo(w / 2, 20); g.lineTo(w - 20, h / 2); g.lineTo(w / 2, h - 20); g.lineTo(20, h / 2); g.closePath(); g.stroke(); }) }),
  carpet: std('#fff', { map: TX.canvasTex(128, 128, (g, w, h) => { g.fillStyle = '#cbb894'; g.fillRect(0, 0, w, h); for (let i = 0; i < 300; i++) { g.fillStyle = `rgba(90,60,20,${Math.random() * 0.08})`; g.fillRect(Math.random() * w, Math.random() * h, 2, 2); } g.strokeStyle = 'rgba(140,100,40,.25)'; g.lineWidth = 2; g.strokeRect(0, 0, w, h); }) }),
  marble: std('#e6dccb', { roughness: 0.3, metalness: 0.05, map: TX.canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#f2ede4'; g.fillRect(0, 0, w, h); g.strokeStyle = 'rgba(150,130,100,.35)'; for (let i = 0; i < 14; i++) { g.lineWidth = Math.random() * 2; g.beginPath(); let x = Math.random() * w, y = 0; g.moveTo(x, y); while (y < h) { x += (Math.random() - .5) * 30; y += 20; g.lineTo(x, y); } g.stroke(); } g.strokeStyle = '#c8b27a'; g.lineWidth = 3; g.strokeRect(0, 0, w, h); }) }),
  tile: std('#fff', { map: TX.tileTex(1, 1, '#e8eef2', '#b8c4cc'), roughness: 0.3 }),
  stone: std('#b9b2a6'),
  wood: std('#fff', { map: TX.woodTex(1) }),
  dark: std('#4a3226', { roughness: 0.5 }),
  gold: goldMat,
  glass: new THREE.MeshStandardMaterial({ color: '#e8d28f', transparent: true, opacity: 0.22, metalness: 0.5, roughness: 0.05, depthWrite: false, side: THREE.DoubleSide }),
  linen: std('#fbfaf6'),
  blanket: std('#b8892e', { roughness: 0.9 }),
  blanket2: std('#2f4a6e', { roughness: 0.9 }),
  sofa: std('#7b5b45', { roughness: 0.95 }),
  cream: std('#e9dcc3', { roughness: 0.95 }),
  black: std('#151515', { roughness: 0.3 }),
  screen: new THREE.MeshStandardMaterial({ color: '#0d1b2a', emissive: '#16324f', emissiveIntensity: 0.6, roughness: 0.1 }),
  porcelain: std('#ffffff', { roughness: 0.15 }),
  water: std('#7fd3ff', { roughness: 0.05, metalness: 0.2, transparent: true, opacity: 0.75 }),
  red: std('#d32f2f', { roughness: 0.4 }),
  steel: std('#b8bec3', { metalness: 0.85, roughness: 0.3 }),
  mirror: std('#dfe7ec', { metalness: 1, roughness: 0.04 }),
  light: basic('#fff6dc'),
  plant: std('#2e7d32'),
  pot: std('#6d4c41'),
  rope: std('#9b1b1b'),
  ldoor: std('#d9b45a', { metalness: 0.8, roughness: 0.25 }),
  hose: signMat('消防喉轆 FIRE HOSE', '#c62828', '#fff', 256, 64, 'bold 26px sans-serif'),
  ext: signMat('滅火筒 EXTINGUISHER', '#c62828', '#fff', 256, 64, 'bold 22px sans-serif'),
  exit: signMat('出口 EXIT ➜', '#1b8a3a', '#fff', 256, 96, 'bold 44px sans-serif'),
  stairsSign: signMat('樓梯 STAIRS', '#1b5e20', '#fff', 256, 96, 'bold 40px sans-serif'),
};

// ---------- 合併幾何（每種材質一個 Mesh / InstancedMesh）----------
class Batch {
  constructor() { this.parts = new Map(); this.cols = []; }
  geo(g, mat) { if (!this.parts.has(mat)) this.parts.set(mat, []); this.parts.get(mat).push(g); }
  box(x0, y0, z0, x1, y1, z1, mat, col = true) {
    const a = Math.min(x0, x1), b = Math.max(x0, x1), c = Math.min(y0, y1), d = Math.max(y0, y1), e = Math.min(z0, z1), f = Math.max(z0, z1);
    if (b - a < 1e-3 || d - c < 1e-3 || f - e < 1e-3) return;
    const g = new THREE.BoxGeometry(b - a, d - c, f - e); g.translate((a + b) / 2, (c + d) / 2, (e + f) / 2);
    this.geo(g, mat); if (col) this.cols.push([a, c, e, b, d, f]);
  }
  plane(x0, z0, x1, z1, y, mat, s = 2) {
    const g = new THREE.PlaneGeometry(x1 - x0, z1 - z0); g.rotateX(-Math.PI / 2);
    const uv = g.attributes.uv, p = g.attributes.position;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, (p.getX(i) + (x0 + x1) / 2) / s, (p.getZ(i) + (z0 + z1) / 2) / s);
    g.translate((x0 + x1) / 2, y, (z0 + z1) / 2); this.geo(g, mat);
  }
  // 牆身貼圖（向 +z / -z / +x / -x 嘅平面）
  sign(x, y, z, w, h, mat, face) {
    const g = new THREE.PlaneGeometry(w, h); g.rotateY({ '+z': 0, '-z': Math.PI, '+x': Math.PI / 2, '-x': -Math.PI / 2 }[face]); g.translate(x, y, z); this.geo(g, mat);
  }
  cyl(x, y, z, r0, r1, h, mat, seg = 12, col = false) {
    const g = new THREE.CylinderGeometry(r0, r1, h, seg); g.translate(x, y + h / 2, z); this.geo(g, mat);
    if (col) this.cols.push([x - Math.max(r0, r1), y, z - Math.max(r0, r1), x + Math.max(r0, r1), y + h, z + Math.max(r0, r1)]);
  }
  sph(x, y, z, r, mat, sx = 1, sy = 1, sz = 1) { const g = new THREE.SphereGeometry(r, 12, 8); g.scale(sx, sy, sz); g.translate(x, y, z); this.geo(g, mat); }
  emit(parent, ys, colsOut) {
    const out = [];
    for (const [mat, list] of this.parts) {
      const merged = mergeGeometries(list, false); list.forEach(g => g.dispose());
      let m;
      if (ys.length === 1) { m = new THREE.Mesh(merged, mat); m.position.y = ys[0]; }
      else {
        m = new THREE.InstancedMesh(merged, mat, ys.length); const X = new THREE.Matrix4();
        ys.forEach((y, i) => m.setMatrixAt(i, X.makeTranslation(0, y, 0))); m.frustumCulled = false;
      }
      m.receiveShadow = true; if (mat === M.glass) m.renderOrder = 2; parent.add(m); out.push(m);
    }
    if (colsOut) for (const y of ys) for (const c of this.cols) colsOut.push({ min: [c[0] + HX, c[1] + y, c[2] + HZ], max: [c[3] + HX, c[4] + y, c[5] + HZ] });
    return out;
  }
}

function rectMinus(x0, z0, x1, z1, hs) {
  const xs = [x0, x1]; hs.forEach(h => { if (h[0] > x0 && h[0] < x1) xs.push(h[0]); if (h[2] > x0 && h[2] < x1) xs.push(h[2]); });
  xs.sort((a, b) => a - b); const out = [];
  for (let i = 0; i < xs.length - 1; i++) {
    const a = xs[i], b = xs[i + 1], mx = (a + b) / 2; if (b - a < 1e-3) continue;
    const zs = hs.filter(h => mx > h[0] && mx < h[2]).map(h => [h[1], h[3]]).sort((p, q) => p[0] - q[0]);
    let cz = z0;
    for (const [h0, h1] of zs) { if (h0 > cz) out.push([a, cz, b, h0]); cz = Math.max(cz, h1); }
    if (cz < z1) out.push([a, cz, b, z1]);
  }
  return out;
}
// 有門口嘅牆
function wallZ(B, z, x0, x1, ops, mat = M.wall, h = CEIL, t = 0.2) {
  let cur = x0;
  for (const [a, b, oh] of ops.slice().sort((p, q) => p[0] - q[0])) { B.box(cur, 0, z - t / 2, a, h, z + t / 2, mat); B.box(a, oh, z - t / 2, b, h, z + t / 2, mat); cur = b; }
  B.box(cur, 0, z - t / 2, x1, h, z + t / 2, mat);
}
function wallX(B, x, z0, z1, ops, mat = M.wall, h = CEIL, t = 0.2) {
  let cur = z0;
  for (const [a, b, oh] of ops.slice().sort((p, q) => p[0] - q[0])) { B.box(x - t / 2, 0, cur, x + t / 2, h, a, mat); B.box(x - t / 2, oh, a, x + t / 2, h, b, mat); cur = b; }
  B.box(x - t / 2, 0, cur, x + t / 2, h, z1, mat);
}

// ---------- 平面圖（本地座標：x -32..32、z -16..16；+z 向湖 / 廣場）----------
const STAIR = { x0: 6.2, m0: 9.4, m1: 9.6, x1: 12.8, zTop: -4.5, zLand: -10.5, zBack: -15.7 };
const STAIR_HOLE = [STAIR.x0, STAIR.zBack, STAIR.x1, STAIR.zTop];
const SHAFTS = [[-4.8, -10, -1.6, FRONT_Z], [1.6, -10, 4.8, FRONT_Z]];
const CARS = [{ id: 2, x: -3.2 }, { id: 3, x: 3.2 }];
// 客房：[x0, x1, side(+1 = 前面 / -1 = 後面), 類型]
const ROOMS = [
  [-31.8, -16, 1, 'double'], [-16, 0, 1, 'single'], [0, 16, 1, 'double'], [16, 31.8, 1, 'single'],
  [-31.8, -18.5, -1, 'single'], [-18.5, -6, -1, 'double'], [13, 31.8, -1, 'double'],
];
const doorOf = r => [r[0] + 1.2, r[0] + 2.4];

function slab(B, holes, y = 0) {
  rectMinus(-32, -16, 32, 16, holes).forEach(r => B.box(r[0], y - 0.3, r[1], r[2], y, r[3], M.slab));
}
// 外牆：玻璃幕牆 + 金色橫帶 + 金色直條（喺房入面望出去就係真實景色）
function facade(B, entrance = false) {
  const g = M.glass;
  if (entrance) { B.box(-31.9, 0, 15.9, -4, CEIL, 16, g); B.box(4, 0, 15.9, 31.9, CEIL, 16, g); B.box(-4, 3.1, 15.9, 4, CEIL, 16, g); }
  else B.box(-31.9, 0, 15.9, 31.9, CEIL, 16, g);
  B.box(-31.9, 0, -16, 31.9, CEIL, -15.9, g);
  B.box(-32, 0, -16, -31.9, CEIL, 16, g); B.box(31.9, 0, -16, 32, CEIL, 16, g);
  // 金色樓層帶
  B.box(-32.3, -0.45, 16, 32.3, 0.05, 16.3, M.gold, false); B.box(-32.3, -0.45, -16.3, 32.3, 0.05, -16, M.gold, false);
  B.box(-32.3, -0.45, -16, -32, 0.05, 16, M.gold, false); B.box(32, -0.45, -16, 32.3, 0.05, 16, M.gold, false);
  for (let x = -32; x <= 32; x += 4) { if (entrance && Math.abs(x) < 4) continue; B.box(x - 0.08, 0, 16, x + 0.08, FH - 0.45, 16.5, M.gold, false); B.box(x - 0.08, 0, -16.5, x + 0.08, FH - 0.45, -16, M.gold, false); }
  for (let z = -16; z <= 16; z += 4) { B.box(-32.5, 0, z - 0.08, -32, FH - 0.45, z + 0.08, M.gold, false); B.box(32, 0, z - 0.08, 32.5, FH - 0.45, z + 0.08, M.gold, false); }
}
function ceilingLights(B, pts) { pts.forEach(([x, z, w = 0.8, d = 0.8]) => B.box(x - w / 2, CEIL - 0.03, z - d / 2, x + w / 2, CEIL, z + d / 2, M.light, false)); }

// 消防喉轆（牆上紅色箱 + 喉轆）同滅火筒
function hoseReel(B, x, z, face) {
  const n = { '+z': [0, 1], '-z': [0, -1], '+x': [1, 0], '-x': [-1, 0] }[face];
  const along = n[0] ? [0, 1] : [1, 0];
  const cx = x + n[0] * 0.13, cz = z + n[1] * 0.13;
  B.box(cx - along[0] * 0.45 - Math.abs(n[0]) * 0.12, 0.9, cz - along[1] * 0.45 - Math.abs(n[1]) * 0.12, cx + along[0] * 0.45 + Math.abs(n[0]) * 0.12, 1.8, cz + along[1] * 0.45 + Math.abs(n[1]) * 0.12, M.red, false);
  const g = new THREE.TorusGeometry(0.28, 0.07, 6, 16); if (n[0]) g.rotateY(Math.PI / 2); g.translate(x + n[0] * 0.3, 1.35, z + n[1] * 0.3); B.geo(g, M.red);
  B.sign(x + n[0] * 0.27 + along[0] * 0, 2.05, z + n[1] * 0.27, 0.9, 0.22, M.hose, face);
}
function extinguisher(B, x, z, face = '+z') {
  B.cyl(x, 0.02, z, 0.11, 0.11, 0.55, M.red, 10);
  B.cyl(x, 0.57, z, 0.04, 0.06, 0.08, M.black, 8);
  B.box(x - 0.2, 0, z - 0.2, x + 0.2, 0.03, z + 0.2, M.black, false);
  const n = { '+z': [0, 1], '-z': [0, -1], '+x': [1, 0], '-x': [-1, 0] }[face];
  B.sign(x - n[0] * 0.12, 1.0, z - n[1] * 0.12, 0.6, 0.15, M.ext, face);
}
function plantPot(B, x, z, s = 1) { B.cyl(x, 0, z, 0.3 * s, 0.22 * s, 0.5 * s, M.pot, 10); B.sph(x, 0.5 * s + 0.45 * s, z, 0.5 * s, M.plant, 1, 1.3, 1); B.cols.push([x - 0.3 * s, 0, z - 0.3 * s, x + 0.3 * s, 1.2 * s, z + 0.3 * s]); }

// ---------- 樓梯（每層兩段，中間有平台；一路通到天台）----------
function stairCore(B, flights = true, frontWall = true) {
  const S = STAIR, r = FH / 12;
  if (flights) {
    for (let k = 1; k <= 6; k++) {
      const top = k * r;
      B.box(S.x0, top - 0.34, S.zTop - k, S.m0, top, S.zTop - k + 1, M.stone);
      const top2 = FH / 2 + k * r;
      B.box(S.m1, top2 - 0.34, S.zLand + k - 1, S.x1, top2, S.zLand + k, M.stone);
    }
    B.box(S.x0, FH / 2 - 0.3, S.zBack, S.x1, FH / 2, S.zLand, M.stone);           // 中間平台
    B.box(S.m0, 0, S.zLand, S.m1, CEIL, S.zTop, M.wall2);                          // 兩段樓梯中間嘅牆
    // 金色扶手
    B.box(S.x0, 0.9, S.zLand, S.x0 + 0.06, 0.96, S.zTop, M.gold, false);
    B.box(S.x1 - 0.06, FH / 2 + 0.9, S.zLand, S.x1, FH / 2 + 0.96, S.zTop, M.gold, false);
  }
  wallX(B, 13, -15.9, -2.1, [], M.wall2);
  if (frontWall) { wallZ(B, -2, 6.1, 13.1, [[7.2, 11.8, 2.5]], M.wall2); B.sign(9.5, 2.95, -1.88, 1.4, 0.5, M.exit, '+z'); B.sign(9.5, 2.95, -2.12, 1.4, 0.5, M.stairsSign, '-z'); }
  ceilingLights(B, [[9.5, -8, 1.2, 0.5]]);
  extinguisher(B, 12.4, -3.0, '-x');
}
// ---------- 電梯大堂 + 槽 ----------
function liftCore(B) {
  wallX(B, -6, -15.9, -2.1, [], M.wall2); wallX(B, 6, -15.9, -2.1, [], M.wall2);
  B.box(-5.9, 0, -10, -4.8, CEIL, FRONT_Z, M.wall2); B.box(-1.6, 0, -10, 1.6, CEIL, FRONT_Z, M.wall2); B.box(4.8, 0, -10, 5.9, CEIL, FRONT_Z, M.wall2);
  B.box(-5.9, 0, -10.2, 5.9, CEIL, -10, M.wall2);
  // 前牆（金色），有兩個 Lift 門口
  const ops = CARS.map(c => [c.x - 0.75, c.x + 0.75, 2.4]);
  let cur = -5.9;
  for (const [a, b, h] of ops) { B.box(cur, 0, FRONT_Z, a, CEIL, FRONT_Z + 0.2, M.wall2); B.box(a, h, FRONT_Z, b, CEIL, FRONT_Z + 0.2, M.wall2); cur = b; }
  B.box(cur, 0, FRONT_Z, 5.9, CEIL, FRONT_Z + 0.2, M.wall2);
  CARS.forEach(c => {
    B.box(c.x - 0.95, 0, FRONT_Z + 0.2, c.x - 0.75, 2.6, FRONT_Z + 0.26, M.gold, false);   // 門框
    B.box(c.x + 0.75, 0, FRONT_Z + 0.2, c.x + 0.95, 2.6, FRONT_Z + 0.26, M.gold, false);
    B.box(c.x - 0.95, 2.4, FRONT_Z + 0.2, c.x + 0.95, 2.6, FRONT_Z + 0.26, M.gold, false);
    const bx = c.x + Math.sign(c.x) * 1.25;                                                   // 叫 Lift 掣
    B.box(bx - 0.09, 1.0, FRONT_Z + 0.2, bx + 0.09, 1.35, FRONT_Z + 0.24, M.gold, false);
  });
  B.plane(-5.9, FRONT_Z + 0.2, 5.9, -1.9, 0.012, M.marble, 3);
  hoseReel(B, -5.9, -3.9, '+x'); extinguisher(B, -5.5, -2.6, '+x');
  hoseReel(B, 5.9, -3.9, '-x'); extinguisher(B, 5.5, -2.6, '-x');
  ceilingLights(B, [[0, -4.2, 2, 0.6]]);
}

// ---------- 客房 ----------
const beds = { tmpl: [], suite: [] };
function room(B, x0, x1, side, type) {
  const Z = v => side * (2.1 + v), D = 13.7, W = x1 - x0, xm = (x0 + x1) / 2;
  const bx = (a0, y0, v0, a1, y1, v1, mat, col = true) => B.box(x0 + a0, y0, Z(v0), x0 + a1, y1, Z(v1), mat, col);
  // 地氈
  B.plane(x0 + 0.1, Math.min(Z(0), Z(D)), x1 - 0.1, Math.max(Z(0), Z(D)), 0.012, M.carpet, 3);
  // 門（打開咗）
  bx(1.2, 0, 0.05, 1.25, 2.3, 1.1, M.wood, false);
  // 浴室
  wallX(B, x0 + 3.0, Math.min(Z(0), Z(4.6)), Math.max(Z(0), Z(4.6)), [], M.wall);
  wallX(B, x0 + 8.0, Math.min(Z(0), Z(4.6)), Math.max(Z(0), Z(4.6)), [], M.wall);
  wallZ(B, Z(4.6), x0 + 3.0, x0 + 8.0, [[x0 + 3.4, x0 + 4.5, 2.3]], M.wall);
  B.plane(x0 + 3.1, Math.min(Z(0), Z(4.5)), x0 + 7.9, Math.max(Z(0), Z(4.5)), 0.02, M.tile, 1);
  bx(5.6, 0, 0.1, 7.9, 0.6, 1.1, M.porcelain); bx(5.75, 0.45, 0.22, 7.75, 0.58, 0.98, M.water, false);       // 浴缸
  B.cyl(x0 + 3.55, 0, Z(0.5), 0.2, 0.17, 0.42, M.porcelain, 10, true); bx(3.35, 0.4, 0.12, 3.75, 0.8, 0.3, M.porcelain, false); // 馬桶
  bx(4.3, 0, 0.1, 5.4, 0.85, 0.6, M.marble); B.cyl(x0 + 4.85, 0.85, Z(0.35), 0.2, 0.15, 0.06, M.porcelain, 12);           // 洗手盆
  bx(4.3, 1.2, 0.02, 5.4, 2.1, 0.06, M.mirror, false);
  ceilingLights(B, [[x0 + 5.5, Z(2.3), 0.6, 0.6]]);
  // 衣櫃
  bx(0.15, 0, 1.6, 0.8, 2.4, 3.6, M.wood);
  // 床（床頭靠右邊牆）
  const bw = type === 'single' ? 1.1 : type === 'king' ? 2.3 : 1.9, bv = 8.3;
  bx(W - 2.3, 0, bv - bw / 2, W - 0.2, 0.45, bv + bw / 2, M.dark);
  bx(W - 2.25, 0.45, bv - bw / 2 + 0.05, W - 0.25, 0.68, bv + bw / 2 - 0.05, M.linen, false);
  bx(W - 1.6, 0.68, bv - bw / 2 + 0.02, W - 0.9 + 0.0, 0.73, bv + bw / 2 - 0.02, type === 'single' ? M.blanket2 : M.blanket, false);
  bx(W - 2.3, 0.6, bv - bw / 2 + 0.02, W - 1.6, 0.72, bv + bw / 2 - 0.02, M.linen, false);
  const npil = type === 'single' ? 1 : 2;
  for (let i = 0; i < npil; i++) { const pv = bv + (npil === 1 ? 0 : (i - 0.5) * bw * 0.5); B.sph(x0 + W - 0.55, 0.78, Z(pv), 0.32, M.linen, 0.6, 0.35, 1.2); }
  bx(W - 0.25, 0, bv - bw / 2 - 0.2, W - 0.1, 1.5, bv + bw / 2 + 0.2, M.cream);       // 床頭板
  [-1, 1].forEach(s => {
    const nv = bv + s * (bw / 2 + 0.45);
    bx(W - 0.7, 0, nv - 0.25, W - 0.2, 0.55, nv + 0.25, M.dark);
    B.cyl(x0 + W - 0.45, 0.55, Z(nv), 0.06, 0.08, 0.35, M.gold, 8); B.cyl(x0 + W - 0.45, 0.9, Z(nv), 0.13, 0.2, 0.25, M.cream, 12);
  });
  (type === 'tmplSuite' ? beds.suite : beds.tmpl).push([x0 + W - 1.3, Z(bv)]);
  // 電視
  bx(0.15, 0, bv - 1, 0.6, 0.55, bv + 1, M.dark);
  bx(0.18, 0.9, bv - 0.95, 0.24, 1.95, bv + 0.95, M.black, false); bx(0.24, 0.95, bv - 0.9, 0.25, 1.9, bv + 0.9, M.screen, false);
  // 窗邊：梳化、茶几、書枱、植物
  bx(W / 2 - 1.3, 0, D - 3.4, W / 2 + 1.3, 0.45, D - 2.6, M.sofa); bx(W / 2 - 1.3, 0.45, D - 3.4, W / 2 + 1.3, 0.95, D - 3.15, M.sofa, false);
  bx(W / 2 - 0.6, 0, D - 2.1, W / 2 + 0.6, 0.42, D - 1.4, M.wood);
  bx(0.4, 0, D - 1.3, 2.2, 0.75, D - 0.7, M.wood); bx(1.0, 0, D - 2.0, 1.5, 0.48, D - 1.5, M.sofa);
  plantPot(B, x0 + W - 0.6, Z(D - 0.6), 1);
  ceilingLights(B, [[xm, Z(8), 1.4, 1.4], [xm, Z(12), 0.9, 0.9]]);
}

// ---------- 走廊 ----------
function corridor(B, frontDoors, backDoors) {
  wallZ(B, 2, -31.8, 31.8, frontDoors.map(d => [d[0], d[1], 2.3]));
  // 後面：A、B 房 | Lift 大堂（開放）| 樓梯（自己有牆）| C 房
  wallZ(B, -2, -31.8, -6.1, backDoors.filter(d => d[0] < -6).map(d => [d[0], d[1], 2.3]));
  wallZ(B, -2, 13, 31.8, backDoors.filter(d => d[0] > 13).map(d => [d[0], d[1], 2.3]));
  B.plane(-31.8, -1.9, 31.8, 1.9, 0.012, M.corr, 2);
  ceilingLights(B, [-26, -18, -10, -2, 6, 14, 22, 29].map(x => [x, 0, 1.0, 0.5]));
  // 好多消防喉轆同滅火筒
  [-27, -13, 9, 24].forEach(x => { hoseReel(B, x, 1.9, '-z'); extinguisher(B, x + 1.0, 1.55, '-z'); });
  [-24, 20].forEach(x => { hoseReel(B, x, -1.9, '+z'); extinguisher(B, x + 1.0, -1.55, '+z'); });
  B.sign(-31.7, 2.9, 0, 1.4, 0.5, M.exit, '+x'); B.sign(31.7, 2.9, 0, 1.4, 0.5, M.exit, '-x');
}
function partitions(B) {
  [-16, 0, 16].forEach(x => wallX(B, x, 2.1, 15.9, []));
  wallX(B, -18.5, -15.9, -2.1, []);
}

// ======================================================================
export function buildHotel(scene, api) {
  const root = new THREE.Group(); root.position.set(HX, 0, HZ); scene.add(root);
  const colliders = [], interactables = [];
  const inter = (lx, y, lz, r, label, act, show) => { const it = { pos: new THREE.Vector3(lx + HX, y, lz + HZ), r, label, act, show }; interactables.push(it); return it; };

  // ===== 2–19 樓：標準客房層（一個模板，18 個 instance）=====
  const TPL = new Batch();
  slab(TPL, [STAIR_HOLE, ...SHAFTS]);
  facade(TPL); stairCore(TPL); liftCore(TPL);
  corridor(TPL, ROOMS.filter(r => r[2] > 0).map(doorOf), ROOMS.filter(r => r[2] < 0).map(doorOf));
  partitions(TPL);
  ROOMS.forEach(r => room(TPL, r[0], r[1], r[2], r[3]));
  TPL.emit(root, Array.from({ length: 18 }, (_, i) => hotelFloorY(i + 2)), colliders);

  // ===== 20 樓：總統套房 =====
  const S = new Batch();
  slab(S, [STAIR_HOLE, ...SHAFTS]); facade(S); stairCore(S); liftCore(S);
  corridor(S, [[-10, -7]], ROOMS.filter(r => r[2] < 0).map(doorOf));
  wallX(S, -18.5, -15.9, -2.1, []);
  ROOMS.filter(r => r[2] < 0).forEach(r => room(S, r[0], r[1], r[2], 'double'));
  presidential(S);
  S.emit(root, [hotelFloorY(20)], colliders);
  S.cols.length = 0;

  // ===== 天台 =====
  const R = new Batch();
  slab(R, [STAIR_HOLE]);
  R.box(-32.3, 0, 15.9, 32.3, 1.2, 16.3, M.gold); R.box(-32.3, 0, -16.3, 32.3, 1.2, -15.9, M.gold);
  R.box(-32.3, 0, -16.3, -31.9, 1.2, 16.3, M.gold); R.box(31.9, 0, -16.3, 32.3, 1.2, 16.3, M.gold);
  // 樓梯出口小屋
  R.box(6, 0, -15.9, 6.2, 3, -2, M.wall2); R.box(13, 0, -15.9, 13.2, 3, -2, M.wall2); R.box(6, 3, -15.9, 13.2, 3.2, -2, M.gold);
  R.box(6, 0, -2, 7.2, 3, -1.8, M.wall2); R.box(11.8, 0, -2, 13.2, 3, -1.8, M.wall2);
  // 停機坪
  const hp = new THREE.CircleGeometry(8, 40); hp.rotateX(-Math.PI / 2); hp.translate(-16, 0.02, 4); R.geo(hp, new THREE.MeshStandardMaterial({ color: '#2b2f36', roughness: 0.8 }));
  R.sign(-16, 0.03, 4, 6, 6, signMat('H', '#2b2f36', '#ffd54f', 256, 256, 'bold 220px sans-serif'), '+z');
  // 金冠
  for (let i = -7; i <= 7; i++) { R.box(i * 4.2 - 0.3, 1.2, 15.95, i * 4.2 + 0.3, 6 + (7 - Math.abs(i)) * 0.5, 16.25, M.gold, false); R.sph(i * 4.2, 6.8 + (7 - Math.abs(i)) * 0.5, 16.1, 0.7, M.gold); }
  R.box(-31, 7, 15.95, 31, 7.6, 16.25, M.gold, false);
  const roofItems = R.emit(root, [NF * FH], colliders);
  // 天台嘅樓梯門要可以行出去：門楣頂唔使碰撞（喺 3m 以上）
  // 大招牌（由廣場都見到）
  const bigSign = new THREE.Mesh(new THREE.PlaneGeometry(34, 6.5), signMat('柏 熙 酒 店', '#5a1a0e', '#ffd77a', 1024, 196, 'bold 150px serif'));
  bigSign.position.set(0, NF * FH + 10, 20.3); root.add(bigSign);
  const bigSign2 = bigSign.clone(); bigSign2.rotation.y = Math.PI; bigSign2.position.z = -16.4; root.add(bigSign2);
  palaceShell(root, colliders);

  // ===== 1 樓：大堂 =====
  const L = new Batch();
  rectMinus(-32, -16, 32, 16, SHAFTS).forEach(r => L.box(r[0], -0.3, r[1], r[2], 0.03, r[3], M.marble));
  facade(L, true); stairCore(L); liftCore(L);
  lobby(L, root, colliders, interactables, inter, api);
  L.emit(root, [0], colliders);

  // ===== 門口雨篷 + 紅地氈 =====
  const E = new Batch();
  E.box(-9, 4.3, 16.3, 9, 4.7, 23, M.gold, false);
  [[-8.4, 22.4], [8.4, 22.4]].forEach(([x, z]) => E.cyl(x, 0, z, 0.35, 0.35, 4.3, M.gold, 16, true));
  E.plane(-2.5, 16, 2.5, 30, 0.035, M.rope, 2);
  E.sign(0, 5.4, 23.05, 16, 1.5, signMat('柏 熙 酒 店   PAK HEI HOTEL', '#5a1a0e', '#ffd77a', 1024, 96, 'bold 64px serif'), '+z');
  E.emit(root, [0], colliders);

  // ===== 每層嘅樓層牌（只顯示附近幾層）=====
  const floorSigns = [];
  for (let f = 1; f <= NF; f++) {
    const y = hotelFloorY(f);
    const txt = f === 20 ? '20F 總統套房' : f === 1 ? '1F 大堂 LOBBY' : `${f}F 客房`;
    const s1 = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.6), signMat(txt, '#3a2a10', '#ffd77a', 512, 120, 'bold 56px sans-serif'));
    s1.position.set(0, y + 3.0, FRONT_Z + 0.22); root.add(s1);
    const s2 = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.6), signMat(`${f}F`, '#1b5e20', '#fff', 256, 96, 'bold 64px sans-serif'));
    s2.position.set(12.88, y + 2.0, -3.4); s2.rotation.y = -Math.PI / 2; root.add(s2);
    floorSigns.push([s1, s2]);
  }

  // ===== 酒店 Lift（2 部，1–20 樓，伺服器同步）=====
  const ldBatch = new Batch();
  CARS.forEach(c => { ldBatch.box(c.x - 0.75, 0, FRONT_Z + 0.04, c.x - 0.01, 2.4, FRONT_Z + 0.12, M.ldoor, false); ldBatch.box(c.x + 0.01, 0, FRONT_Z + 0.04, c.x + 0.75, 2.4, FRONT_Z + 0.12, M.ldoor, false); });
  const [landingDoors] = ldBatch.emit(root, Array.from({ length: NF }, (_, i) => hotelFloorY(i + 1)), null);
  let hiddenLD = -1;
  const X4 = new THREE.Matrix4();
  function hideLanding(f) {
    if (f === hiddenLD) return;
    if (hiddenLD > 0) landingDoors.setMatrixAt(hiddenLD - 1, X4.makeTranslation(0, hotelFloorY(hiddenLD), 0));
    landingDoors.setMatrixAt(f - 1, X4.makeScale(0, 0, 0)); landingDoors.instanceMatrix.needsUpdate = true; hiddenLD = f;
  }
  const cars = CARS.map(c => {
    const g = new THREE.Group(); g.position.set(c.x, 0, 0); root.add(g);
    const add = (geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); g.add(m); return m; };
    const zc = (CAR_Z0 + CAR_Z1) / 2, dz = CAR_Z1 - CAR_Z0;
    add(new THREE.BoxGeometry(CAR_HW * 2, 0.2, dz), M.marble, 0, -0.1, zc);
    add(new THREE.BoxGeometry(CAR_HW * 2, 0.15, dz), M.gold, 0, CAR_H + 0.07, zc);
    add(new THREE.BoxGeometry(CAR_HW * 2, CAR_H, 0.06), M.mirror, 0, CAR_H / 2, CAR_Z0 + 0.03);
    [-1, 1].forEach(s => add(new THREE.BoxGeometry(0.06, CAR_H, dz), M.ldoor, s * (CAR_HW - 0.03), CAR_H / 2, zc));
    add(new THREE.BoxGeometry(CAR_HW * 2 - 0.2, 0.04, 0.05), M.gold, 0, 0.95, CAR_Z0 + 0.12);
    add(new THREE.BoxGeometry(1.2, 0.03, 1.2), M.light, 0, CAR_H - 0.02, zc);
    add(new THREE.BoxGeometry(0.04, 0.6, 0.25), M.black, CAR_HW - 0.07, 1.25, CAR_Z1 - 0.35);
    // 車廂門（兩邊趟開）
    const dL = add(new THREE.BoxGeometry(0.72, 2.35, 0.05), M.steel, -0.36, 1.18, CAR_Z1 - 0.05);
    const dR = add(new THREE.BoxGeometry(0.72, 2.35, 0.05), M.steel, 0.36, 1.18, CAR_Z1 - 0.05);
    add(new THREE.BoxGeometry(CAR_HW * 2, CAR_H - 2.35, 0.08), M.gold, 0, 2.35 + (CAR_H - 2.35) / 2, CAR_Z1 - 0.05);
    // 呢層嘅外門（動畫）
    const lL = new THREE.Mesh(new THREE.BoxGeometry(0.74, 2.4, 0.08), M.ldoor); root.add(lL);
    const lR = new THREE.Mesh(new THREE.BoxGeometry(0.74, 2.4, 0.08), M.ldoor); root.add(lR);
    return { ...c, g, dL, dR, lL, lR, state: { from: 1, to: 1, t0: 0, dur: 0, doorStart: 0, doorEnd: 0 }, y: 0, prevY: 0, floor: 1, door: 0, moving: false, init: false };
  });
  const carById = id => cars.find(c => c.id === id);

  // 叫 Lift 掣（喺玩家目前嗰層）
  let pf = 1;
  cars.forEach(c => {
    const bx = c.x + Math.sign(c.x) * 1.25;
    c.callIt = inter(bx, 0, FRONT_Z + 0.9, 1.4, () => `🛎 叫酒店 Lift（${pf}F）`, () => {
      if (Math.round(c.floor) === pf && !c.moving) api.liftCmd(c.id, 'open'); else api.liftCmd(c.id, 'call', pf);
      api.sfx?.beep(); api.toast?.(`🛎 叫咗 Lift 落 ${pf} 樓，等等…`);
    });
  });

  // ===== 互動：Check-in、瞓覺 =====
  inter(-19, 0, 0.9, 2.2, () => '🛎 Check-in 入住', () => api.hotelCheckin());
  const sleepIt = inter(0, -999, 0, 2.6, () => '😴 瞓一覺', () => api.sleep(), () => sleepIt._ok);

  // ===== 大堂排隊 Check-in 嘅人 =====
  const lobbyPeople = [];
  function person(x, z, face, shirt, hat = 'none', bag = true) {
    const R = Math.random;
    const av = buildAvatar({ gender: R() < 0.5 ? 'm' : 'f', skin: SKINS[Math.floor(R() * SKINS.length)], shirt, hat });
    av.position.set(x, 0, z); av.rotation.y = face; root.add(av);
    if (bag) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.62, 0.25), std(['#263238', '#8d1c1c', '#1565c0', '#c0a060'][Math.floor(R() * 4)], { roughness: 0.4 })); b.position.set(x + 0.45, 0.33, z); root.add(b); lobbyPeople.push({ av, bag: b, ph: R() * 10 }); }
    else lobbyPeople.push({ av, ph: R() * 10 });
    return av;
  }
  [-25, -21, -17, -13].forEach(x => person(x, -1.45, 0, '#1a237e', 'none', false));          // 接待員
  [-25, -21, -17, -13].forEach(x => person(x, 0.65, Math.PI, SHIRTS[Math.floor(Math.random() * SHIRTS.length)]));  // 喺櫃位辦緊 check-in
  for (let i = 0; i < 9; i++) person(-19 + (i % 2 ? 0.15 : -0.15), 2.6 + i * 1.05, Math.PI, SHIRTS[(i * 3) % SHIRTS.length]);
  for (let i = 0; i < 5; i++) person(-21.6, 11.6 - i * 1.05, 0, SHIRTS[(i * 5 + 1) % SHIRTS.length]);
  person(19, -1.45, 0, '#3e2723', 'none', false);                                               // 禮賓部
  person(2.5, 13.8, Math.PI, '#5a1a0e', 'cap', false);                                            // 門僮

  // ===== 每幀更新 =====
  const inside = p => p.x > HX - 32.5 && p.x < HX + 32.5 && p.z > HZ - 16.5 && p.z < HZ + 16.5;
  function playerFloor(p) { return inside(p) ? Math.max(1, Math.min(NF, Math.round(p.y / FH) + 1)) : 1; }

  function setState(i, s) { const c = cars[i]; if (c) c.state = s; }

  function update(dt, T, player) {
    pf = playerFloor(player);
    const fy = hotelFloorY(pf);
    hideLanding(pf);
    for (const c of cars) {
      c.prevY = c.y;
      c.floor = hotelFloorAt(c.state, T); c.y = hotelFloorY(c.floor);
      if (!c.init) { c.prevY = c.y; c.init = true; }
      const mv = isMov(c.state, T);
      if (c.moving && !mv && Math.abs(player.y - c.y) < 6 && inside(player)) api.sfx?.ding();
      c.moving = mv;
      c.door = mv ? 0 : doorOpenness(c.state, T);
      c.g.position.y = c.y;
      c.dL.position.x = -0.36 - c.door * 0.7; c.dR.position.x = 0.36 + c.door * 0.7;
      const here = !mv && Math.round(c.floor) === pf ? c.door : 0;
      c.lL.position.set(c.x - 0.37 - here * 0.72, fy + 1.2, FRONT_Z + 0.08); c.lR.position.set(c.x + 0.37 + here * 0.72, fy + 1.2, FRONT_Z + 0.08);
      c.callIt.pos.y = fy;
    }
    // 樓層牌
    floorSigns.forEach(([a, b], i) => { const v = inside(player) && Math.abs(i + 1 - pf) <= 1; a.visible = b.visible = v; });
    // 搵最近嘅床
    sleepIt._ok = false;
    if (inside(player) && pf >= 2) {
      const list = pf === 20 ? beds.suite.concat(beds.tmpl.slice(4)) : beds.tmpl;
      let bd = 1e9, bb = null;
      for (const b of list) { const d = Math.hypot(b[0] + HX - player.x, b[1] + HZ - player.z); if (d < bd) { bd = d; bb = b; } }
      if (bb && bd < 2.6) { sleepIt.pos.set(bb[0] + HX, fy, bb[1] + HZ); sleepIt._ok = true; }
    }
    // 大堂啲人（近先郁，慳電）
    const near = Math.hypot(player.x - HX, player.z - HZ) < 90 && player.y < 10;
    const tt = performance.now() / 1000;
    lobbyPeople.forEach(p => {
      p.av.visible = near; if (p.bag) p.bag.visible = near;
      if (!near) return;
      animateAvatar(p.av, 0, dt);
      const u = p.av.userData; u.armR.rotation.x = Math.sin(tt * 0.7 + p.ph) * 0.15; u.body.rotation.y = Math.sin(tt * 0.3 + p.ph) * 0.25;
    });
  }

  // 動態碰撞：車廂地台（可以企住跟住升降）、車頂、車門、呢層嘅外門
  function dynamicColliders(player) {
    const out = [], fy = hotelFloorY(pf);
    for (const c of cars) {
      const x0 = HX + c.x - CAR_HW, x1 = HX + c.x + CAR_HW, z0 = HZ + CAR_Z0, z1 = HZ + CAR_Z1;
      out.push({ min: [x0, c.y - 0.25, z0], max: [x1, c.y, z1 + 0.22], mv: c });
      out.push({ min: [x0, c.y + CAR_H, z0], max: [x1, c.y + CAR_H + 0.15, z1], mv: c });
      if (c.door < 0.6) out.push({ min: [HX + c.x - 0.8, c.y, z1 - 0.1], max: [HX + c.x + 0.8, c.y + 2.4, z1] });
      const here = !c.moving && Math.round(c.floor) === pf && c.door > 0.6;
      if (!here) out.push({ min: [HX + c.x - 0.8, fy, HZ + FRONT_Z], max: [HX + c.x + 0.8, fy + 2.4, HZ + FRONT_Z + 0.22] });
    }
    return out;
  }
  function insideCar(p) {
    for (const c of cars) if (p.x > HX + c.x - CAR_HW && p.x < HX + c.x + CAR_HW && p.z > HZ + CAR_Z0 && p.z < HZ + CAR_Z1 && Math.abs(p.y - c.y) < 1.2) return c;
    return null;
  }

  return { colliders, interactables, update, dynamicColliders, insideCar, setState, cars, carById, playerFloor, inside, root };
}

// ---------- 總統套房（20 樓前面成排）----------
function presidential(B) {
  const D = 15.9;
  wallX(B, 0, 2.1, D, [[7.5, 9.5, 2.6]]);
  B.plane(-31.8, 2.1, -0.1, D - 0.1, 0.012, M.marble, 3);
  B.plane(0.1, 2.1, 31.8, D - 0.1, 0.012, M.carpet, 3);
  // 金色雙門
  B.box(-10, 0, 2.15, -9.95, 2.3, 3.2, M.gold, false); B.box(-7.05, 0, 2.15, -7, 2.3, 3.2, M.gold, false);
  B.sign(-8.5, 2.75, 1.88, 3.2, 0.5, signMat('總統套房 PRESIDENTIAL SUITE', '#3a2a10', '#ffd77a', 512, 80, 'bold 34px serif'), '-z');
  // 客廳：三角琴、梳化、大電視
  B.box(-28, 0, 10, -25.6, 1.0, 12.4, M.black); B.box(-27.8, 1.0, 10.2, -25.8, 1.05, 12.2, M.black, false); B.box(-26.2, 1.0, 10.1, -25.6, 1.9, 12.3, M.black, false);
  B.box(-28.3, 0.6, 9.6, -27.7, 0.9, 10, M.black, false);
  B.box(-20, 0, 9, -14, 0.45, 10, M.cream); B.box(-20, 0.45, 9, -14, 1.0, 9.3, M.cream, false);
  B.box(-20, 0, 5.5, -19, 0.45, 9, M.cream); B.box(-19.3, 0.45, 5.5, -19, 1.0, 9, M.cream, false);
  B.box(-17.8, 0, 6.2, -15.2, 0.42, 7.8, M.marble);
  B.box(-17.5, 0.9, 2.2, -14.5, 2.6, 2.32, M.black, false); B.box(-17.4, 1.0, 2.32, -14.6, 2.5, 2.34, M.screen, false);
  // 餐枱 8 人
  B.box(-9, 0, 8.5, -4, 0.76, 10.5, M.dark);
  for (let i = 0; i < 4; i++) { const x = -8.4 + i * 1.3; B.box(x - 0.25, 0, 7.6, x + 0.25, 0.48, 8.1, M.sofa); B.box(x - 0.25, 0, 10.9, x + 0.25, 0.48, 11.4, M.sofa); }
  B.sph(-6.5, 3.2, 9.5, 0.9, M.gold, 1, 0.5, 1); B.cyl(-6.5, 3.4, 9.5, 0.03, 0.03, 0.3, M.gold, 6);
  // 酒吧
  B.box(-3.5, 0, 12.5, -0.4, 1.1, 13.3, M.marble); B.box(-3.5, 1.1, 12.45, -0.4, 1.15, 13.35, M.gold, false);
  for (let i = 0; i < 3; i++) B.cyl(-3 + i * 1.1, 0, 11.9, 0.22, 0.18, 0.75, M.gold, 10, true);
  ceilingLights(B, [[-26, 8], [-17, 8], [-6.5, 6], [-2, 13]]);
  plantPot(B, -31, 15, 1.4); plantPot(B, -1, 15, 1.4);
  // 主人房：King size 床、按摩池
  room2King(B);
  // 套房都有消防設備
  hoseReel(B, -0.1, 4, '-x'); extinguisher(B, -0.6, 3, '-x');
}
function room2King(B) {
  const bv = 9, bw = 2.4, xr = 31.6;
  B.box(xr - 2.5, 0, bv - bw / 2, xr - 0.2, 0.5, bv + bw / 2, M.dark);
  B.box(xr - 2.45, 0.5, bv - bw / 2 + 0.05, xr - 0.25, 0.74, bv + bw / 2 - 0.05, M.linen, false);
  B.box(xr - 1.7, 0.74, bv - bw / 2 + 0.02, xr - 0.9, 0.8, bv + bw / 2 - 0.02, M.blanket, false);
  [-0.6, 0.6].forEach(o => B.sph(xr - 0.6, 0.85, bv + o, 0.34, M.linen, 0.6, 0.35, 1.2));
  B.box(xr - 0.25, 0, bv - 2, xr - 0.05, 2.2, bv + 2, M.gold);
  beds.suite.push([xr - 1.3, bv]);
  // 按摩池
  B.cyl(16, 0, 13, 1.6, 1.6, 0.6, M.marble, 24, true); B.cyl(16, 0.4, 13, 1.45, 1.45, 0.16, M.water, 24);
  // 衣帽間 + 梳妝枱
  B.box(2, 0, 2.3, 8, 2.4, 3.0, M.wood); B.box(10, 0, 2.3, 12, 0.8, 2.9, M.marble); B.box(10.2, 1.1, 2.15, 11.8, 2.2, 2.2, M.mirror, false);
  B.box(20, 0.9, 2.2, 23, 2.6, 2.32, M.black, false); B.box(20.1, 1.0, 2.32, 22.9, 2.5, 2.34, M.screen, false);
  ceilingLights(B, [[26, 9, 1.6, 1.6], [16, 13], [6, 6]]);
}

// ---------- 大堂 ----------
function lobby(B, root, colliders, interactables, inter, api) {
  // 接待處背牆 + 後面嘅牆
  wallZ(B, -2, -31.8, -6.1, [], M.wall2); wallZ(B, -2, 13, 31.8, [], M.wall2);
  B.box(-28, 0.4, -1.88, -10, 3.4, -1.85, M.gold, false);
  B.sign(-19, 2.6, -1.84, 12, 1.2, signMat('柏熙酒店  接待處 RECEPTION', '#3a2a10', '#ffd77a', 1024, 104, 'bold 64px serif'), '+z');
  // 接待櫃位（雲石 + 金邊）
  B.box(-27, 0, -0.9, -11, 1.1, -0.1, M.marble); B.box(-27.1, 1.1, -0.95, -10.9, 1.15, -0.05, M.gold, false);
  [-25, -21, -17, -13].forEach(x => { B.box(x - 0.3, 1.15, -0.8, x + 0.3, 1.55, -0.75, M.black, false); B.box(x - 0.28, 1.17, -0.75, x + 0.28, 1.53, -0.74, M.screen, false); });
  // 排隊欄
  for (let z = 2; z <= 12; z += 1.5) { [-18.2, -19.8, -20.8].forEach(x => B.cyl(x, 0, z, 0.05, 0.05, 1.0, M.gold, 8)); }
  [-18.2, -19.8, -20.8].forEach(x => { B.box(x - 0.025, 0.85, 2, x + 0.025, 0.9, 12.5, M.rope, false); B.cols.push([x - 0.05, 0, 2, x + 0.05, 1.0, 12.5]); });
  B.sign(-19, 1.6, 12.6, 1.6, 0.5, signMat('Check-in 排隊', '#3a2a10', '#ffd77a', 256, 80, 'bold 36px sans-serif'), '+z');
  // 禮賓部
  B.box(16, 0, -0.9, 22, 1.1, -0.1, M.marble); B.sign(19, 2.6, -1.84, 5, 0.7, signMat('禮賓部 CONCIERGE', '#3a2a10', '#ffd77a', 512, 72, 'bold 40px serif'), '+z');
  // 金色柱 + 水晶燈
  [[-10, 6], [10, 6], [-10, 12], [10, 12], [-26, 10], [26, 4]].forEach(([x, z]) => B.cyl(x, 0, z, 0.55, 0.55, CEIL, M.gold, 16, true));
  for (let i = 0; i < 3; i++) { const z = 4 + i * 4; B.sph(0, 3.1, z, 0.9, M.gold, 1, 0.45, 1); B.sph(0, 2.75, z, 0.55, M.light, 1, 0.6, 1); }
  // 大堂中間嘅花藝
  B.cyl(-4, 0, 8, 1.4, 1.6, 0.6, M.marble, 20, true); B.sph(-4, 1.2, 8, 1.1, std('#e91e63'), 1, 0.7, 1); B.sph(-4.4, 1.5, 7.6, 0.6, std('#ffeb3b'), 1, 0.7, 1);
  // 休息區梳化
  [[20, 8], [26, 10]].forEach(([x, z]) => { B.box(x - 1.5, 0, z - 0.4, x + 1.5, 0.45, z + 0.4, M.cream); B.box(x - 1.5, 0.45, z + 0.2, x + 1.5, 1.0, z + 0.4, M.cream, false); B.box(x - 0.6, 0, z - 1.6, x + 0.6, 0.4, z - 0.8, M.marble); });
  plantPot(B, -30.8, 14.8, 1.5); plantPot(B, 30.8, 14.8, 1.5); plantPot(B, -6.5, 14.8, 1.2); plantPot(B, 6.5, 14.8, 1.2);
  // 行李車
  [[5.5, 12.5], [7, 12.5]].forEach(([x, z]) => { B.box(x - 0.45, 0.2, z - 0.7, x + 0.45, 0.26, z + 0.7, M.gold); B.box(x - 0.03, 0.26, z - 0.7, x + 0.03, 1.9, z - 0.64, M.gold, false); B.box(x - 0.45, 1.85, z - 0.7, x + 0.45, 1.9, z + 0.7, M.gold, false); });
  // 好多消防喉轆同滅火筒
  [[-30, '+z'], [-8.5, '+z'], [15, '+z'], [29, '+z']].forEach(([x, f]) => { hoseReel(B, x, -1.9, f); extinguisher(B, x + 1.0, -1.5, f); });
  [[-10, 6.6], [10, 6.6], [-10, 12.6], [10, 12.6]].forEach(([x, z]) => extinguisher(B, x, z + 0.1, '+z'));
  hoseReel(B, -31.75, 6, '+x'); extinguisher(B, -31.3, 7.2, '+x');
  B.sign(-31.7, 2.9, 12, 1.4, 0.5, M.exit, '+x'); B.sign(0, 3.3, 15.85, 1.4, 0.5, M.exit, '-z');
  ceilingLights(B, [-26, -18, -10, 0, 10, 18, 26].flatMap(x => [[x, 3, 1, 1], [x, 10, 1, 1]]));
}

// 房號 → 門口位置（世界座標）
export function roomDoor(no) {
  const f = Math.floor(no / 100), k = no % 100 - 1;
  if (f === 20 && k === 0) return new THREE.Vector3(HX - 8.5, hotelFloorY(20), HZ + 1.2);
  const r = ROOMS[k]; if (!r) return null;
  return new THREE.Vector3(HX + r[0] + 1.8, hotelFloorY(f), HZ + r[2] * 1.2);
}
export const ROOM_TYPES = ROOMS.map(r => r[3]);

// ---------- 外型：參考澳門路氹嗰座金色宮殿式酒店 ----------
// 中間主樓前面加一幅向外微彎嘅金色玻璃幕牆（一直升到天台上面變成金冠），兩邊各有一翼向後斜，頂部有金色花飾
function palaceShell(root, colliders) {
  const R = 140, front = 19.8, half = Math.asin(33 / R), y0 = 4.8, y1 = NF * FH + 18;
  const skinTex = TX.canvasTex(128, 128, (g, w, h) => {
    g.clearRect(0, 0, w, h); g.fillStyle = 'rgba(214,170,80,0.28)'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#e8c068'; g.fillRect(0, 0, w, 10); g.fillRect(0, h / 2 - 3, w, 6); g.fillRect(0, 0, 8, h); g.fillRect(w / 2 - 2, 0, 4, h);
    g.fillStyle = 'rgba(255,230,160,0.5)'; g.fillRect(0, 10, w, 3);
  }, 18, (y1 - y0) / FH);
  const skinMat = new THREE.MeshStandardMaterial({ map: skinTex, transparent: true, metalness: 0.7, roughness: 0.25, emissive: '#3a2600', emissiveIntensity: 0.3, side: THREE.DoubleSide, depthWrite: false });
  const skin = new THREE.Mesh(new THREE.CylinderGeometry(R, R, y1 - y0, 40, 1, true, -half, half * 2), skinMat);
  skin.position.set(0, (y0 + y1) / 2, front - R); skin.renderOrder = 3; root.add(skin);
  // 頂冠 + 金花
  const crown = new THREE.Mesh(new THREE.CylinderGeometry(R + 0.3, R + 0.3, 3, 40, 1, true, -half, half * 2), goldMat); crown.position.set(0, y1 - 1.5, front - R); root.add(crown);
  const flowerGeo = new THREE.OctahedronGeometry(1.6);
  for (let i = -7; i <= 7; i++) {
    const a = i / 7 * half * 0.97, x = Math.sin(a) * R, z = front - R + Math.cos(a) * R;
    const f = new THREE.Mesh(flowerGeo, goldMat); f.position.set(x, y1 + 1.8 + (7 - Math.abs(i)) * 0.35, z); f.scale.set(1, 1.5, 1); root.add(f);
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.5, y1 - y0, 0.5), goldMat); fin.position.set(x, (y0 + y1) / 2, z + 0.3); root.add(fin);
  }
  // 兩翼（向後斜，金色窗格外牆）
  const wingTex = (rx, ry) => std('#fff', { map: TX.hotelFacadeTex(rx, ry), roughness: 0.45, metalness: 0.35 });
  const WL = 46, WD = 20, WH = 70;
  [-1, 1].forEach(s => {
    const g = new THREE.Group(); g.position.set(s * 36.5, 0, 5); g.rotation.y = s * 0.42; root.add(g);
    const b = new THREE.Mesh(new THREE.BoxGeometry(WL, WH, WD), wingTex(9, 16)); b.position.set(s * WL / 2, WH / 2, 0); g.add(b);
    const band = new THREE.Mesh(new THREE.BoxGeometry(WL + 1, 2.5, WD + 1), goldMat); band.position.set(s * WL / 2, WH + 1.25, 0); g.add(band);
    for (let i = 0; i <= 6; i++) {
      const fin = new THREE.Mesh(new THREE.BoxGeometry(1.0, WH, 0.8), goldMat); fin.position.set(s * (1 + i * 7.3), WH / 2, WD / 2 + 0.4); g.add(fin);
      const fl = new THREE.Mesh(flowerGeo, goldMat); fl.position.set(s * (1 + i * 7.3), WH + 4, WD / 2); fl.scale.set(0.8, 1.2, 0.8); g.add(fl);
    }
    // 碰撞：沿住翼分 4 段，每段用外接方盒
    const cs = Math.cos(g.rotation.y), sn = Math.sin(g.rotation.y);
    for (let j = 0; j < 4; j++) {
      const xs = [s * j * WL / 4, s * (j + 1) * WL / 4], pts = [];
      xs.forEach(lx => [-WD / 2, WD / 2].forEach(lz => pts.push([g.position.x + lx * cs + lz * sn, g.position.z - lx * sn + lz * cs])));
      const X = pts.map(p => p[0]), Z = pts.map(p => p[1]);
      colliders.push({ min: [Math.min(...X) + HX + (j ? 1.5 : 0) * s * 0, 0, Math.min(...Z) + HZ], max: [Math.max(...X) + HX, WH, Math.max(...Z) + HZ] });
    }
    // 主樓同翼之間嘅連接
    const fill = new THREE.Mesh(new THREE.BoxGeometry(9, WH, 26), wingTex(2, 16)); fill.position.set(s * 36.6, WH / 2, 1.5); root.add(fill);
    colliders.push({ min: [HX + Math.min(s * 32.1, s * 41.1), 0, HZ - 11.5], max: [HX + Math.max(s * 32.1, s * 41.1), WH, HZ + 14.5] });
  });
}
