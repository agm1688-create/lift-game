// 大廈 / 屋 / 學校室內：所有見到嘅建築物地下都入得去，入面有現實世界會見到嘅嘢
// 用 city.js 嘅 Batch（box / add），全部合併成少量 Mesh，唔會太食機
import * as THREE from 'three';
import * as TX from './textures.js';

const std = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.7, ...extra });
export const IM = {
  marble: std('#fff', { map: TX.tileTex(1, 1, '#ece6da', '#cfc6b4'), roughness: 0.3 }),
  wood: std('#fff', { map: TX.woodTex(1) }), dark: std('#4a3226', { roughness: 0.5 }), white: std('#f6f6f4'), black: std('#161616', { roughness: 0.35 }),
  steel: std('#c3c9ce', { metalness: 0.85, roughness: 0.3 }), gold: std('#d9b45a', { metalness: 0.8, roughness: 0.3 }),
  glass: new THREE.MeshStandardMaterial({ color: '#a8d8ff', transparent: true, opacity: 0.28, roughness: 0.05, metalness: 0.2, depthWrite: false, side: THREE.DoubleSide }),
  light: new THREE.MeshBasicMaterial({ color: '#fff7e0' }), ceiling: std('#f2f2f0', { emissive: '#777', emissiveIntensity: 0.4 }),
  screen: new THREE.MeshStandardMaterial({ color: '#0d1b2a', emissive: '#1d4f86', emissiveIntensity: 0.8 }),
  sofa: std('#6d5848', { roughness: 0.95 }), sofa2: std('#3f5f8a', { roughness: 0.95 }), red: std('#c62828'), green: std('#2e7d32'), plant: std('#2f8a3a'), pot: std('#6d4c41'),
  linen: std('#fbfaf6'), blanket: std('#d18b47', { roughness: 0.9 }), porcelain: std('#ffffff', { roughness: 0.15 }), tile: std('#fff', { map: TX.tileTex(1, 1, '#e8eef2', '#b8c4cc') }),
  carpet: std('#8c7a68', { roughness: 1 }), rubber: std('#2b2b2b', { roughness: 0.9 }), board: std('#1f3d2b', { roughness: 0.9 }), cork: std('#b8895a'),
  hay: std('#d9b75a', { roughness: 1 }), cow: std('#f5f5f5'), cowSpot: std('#222'), tractor: std('#2e7d32', { metalness: 0.3 }),
  locker: std('#5a7fa8', { metalness: 0.4 }), mat: std('#3a6ea5', { roughness: 1 }),
};
const PROD = ['#e53935', '#fdd835', '#43a047', '#1e88e5', '#fb8c00', '#8e24aa', '#ffffff', '#6d4c41'].map(c => std(c, { roughness: 0.6 }));
const signCache = new Map();
export function signMat(text, bg = '#1d3b6e', fg = '#fff', font = 'bold 54px sans-serif') {
  const k = text + bg + fg; if (!signCache.has(k)) signCache.set(k, new THREE.MeshBasicMaterial({ map: TX.signTex(text, bg, fg, 512, 128, font), side: THREE.DoubleSide }));
  return signCache.get(k);
}
// 平面招牌：face = 面向 +z / -z / +x / -x
export function sign(B, x, y, z, w, h, mat, face = '+z') {
  const g = new THREE.PlaneGeometry(w, h); g.rotateY({ '+z': 0, '-z': Math.PI, '+x': Math.PI / 2, '-x': -Math.PI / 2 }[face]); g.translate(x, y, z); B.add(g, mat);
}
const cyl = (B, x, y, z, r0, r1, h, m, seg = 10, col = false) => { const g = new THREE.CylinderGeometry(r0, r1, h, seg); g.translate(x, y + h / 2, z); B.add(g, m); if (col) B.cols.push({ min: [x - r1, y, z - r1], max: [x + r1, y + h, z + r1] }); };
const sph = (B, x, y, z, r, m, sx = 1, sy = 1, sz = 1) => { const g = new THREE.SphereGeometry(r, 10, 8); g.scale(sx, sy, sz); g.translate(x, y, z); B.add(g, m); };
const plane = (B, x0, z0, x1, z1, y, m) => { const g = new THREE.PlaneGeometry(x1 - x0, z1 - z0); g.rotateX(-Math.PI / 2); const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * (x1 - x0) / 3, uv.getY(i) * (z1 - z0) / 3); g.translate((x0 + x1) / 2, y, (z0 + z1) / 2); B.add(g, m); };
const ceilPlane = (B, x0, z0, x1, z1, y, m) => { const g = new THREE.PlaneGeometry(x1 - x0, z1 - z0); g.rotateX(Math.PI / 2); g.translate((x0 + x1) / 2, y, (z0 + z1) / 2); B.add(g, m); };
export function plant(B, x, z, s = 1) { cyl(B, x, 0, z, 0.3 * s, 0.22 * s, 0.5 * s, IM.pot, 8, true); sph(B, x, 0.5 * s + 0.5 * s, z, 0.5 * s, IM.plant, 1, 1.4, 1); }
function lights(B, x0, z0, x1, z1, y, step = 6) { for (let x = x0 + step / 2; x < x1; x += step) for (let z = z0 + step / 2; z < z1; z += step) B.box(x - 0.6, y - 0.04, z - 0.6, x + 0.6, y, z + 0.6, IM.light, false); }
function chair(B, x, z, face, m = IM.dark) { B.box(x - 0.22, 0.42, z - 0.22, x + 0.22, 0.47, z + 0.22, m, false); const bz = z - face * 0.2; B.box(x - 0.22, 0.47, bz - 0.03, x + 0.22, 0.95, bz + 0.03, m, false); [[-0.2, -0.2], [0.2, -0.2], [-0.2, 0.2], [0.2, 0.2]].forEach(([a, b]) => B.box(x + a - 0.02, 0, z + b - 0.02, x + a + 0.02, 0.42, z + b + 0.02, IM.steel, false)); }
function table(B, x, z, w, d, h = 0.75, m = IM.wood) { B.box(x - w / 2, h - 0.05, z - d / 2, x + w / 2, h, z + d / 2, m); [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => B.box(x + a * (w / 2 - 0.06) - 0.03, 0, z + b * (d / 2 - 0.06) - 0.03, x + a * (w / 2 - 0.06) + 0.03, h - 0.05, z + b * (d / 2 - 0.06) + 0.03, IM.steel, false)); }
function sofa(B, x, z, w, face, m = IM.sofa) { const d = 0.9; B.box(x - w / 2, 0, z - d / 2, x + w / 2, 0.45, z + d / 2, m); const bz = z - face * (d / 2 - 0.12); B.box(x - w / 2, 0.45, bz - 0.12, x + w / 2, 0.95, bz + 0.12, m, false); }
function liftDoors(B, x0, x1, z, face, n) {
  const step = (x1 - x0) / n;
  for (let k = 0; k < n; k++) {
    const cx = x0 + step * (k + 0.5);
    B.box(cx - 0.95, 0, z, cx + 0.95, 2.7, z + face * 0.05, IM.gold, false);
    B.box(cx - 0.8, 0, z + face * 0.05, cx + 0.8, 2.5, z + face * 0.08, IM.steel, false);
    B.box(cx + 1.05, 1.1, z, cx + 1.2, 1.4, z + face * 0.06, IM.gold, false);
    B.box(cx - 0.3, 2.75, z, cx + 0.3, 2.95, z + face * 0.06, IM.screen, false);
  }
}
function shelfUnit(B, x0, z0, x1, z1, h = 1.8) {
  B.box(x0, 0, z0, x1, h, z1, IM.white);
  const along = (x1 - x0) > (z1 - z0), L = along ? x1 - x0 : z1 - z0, n = Math.max(1, Math.floor(L / 0.35));
  for (let lv = 0; lv < 4; lv++) {
    const y = 0.25 + lv * 0.42;
    for (let k = 0; k < n; k++) {
      const p = PROD[(k * 7 + lv * 3) % PROD.length], a = (along ? x0 : z0) + (k + 0.5) * L / n, hh = 0.18 + ((k * 13 + lv) % 4) * 0.04;
      [-1, 1].forEach(sd => {
        const c = along ? (z0 + z1) / 2 + sd * ((z1 - z0) / 2 + 0.06) : (x0 + x1) / 2 + sd * ((x1 - x0) / 2 + 0.06);
        if (along) B.box(a - 0.13, y, c - 0.07, a + 0.13, y + hh, c + 0.07, p, false); else B.box(c - 0.07, y, a - 0.13, c + 0.07, y + hh, a + 0.13, p, false);
      });
    }
  }
}
function counter(B, x0, z0, x1, z1, h = 1.05, top = IM.marble) { B.box(x0, 0, z0, x1, h - 0.05, z1, IM.dark); B.box(x0 - 0.03, h - 0.05, z0 - 0.03, x1 + 0.03, h, z1 + 0.03, top, false); }

// ---------- 大廈地下：外殼（有玻璃舖面 + 門口）----------
export function shell(B, x0, z0, x1, z1, gf, wallMat, glassFront = true) {
  const t = 0.35, xm = (x0 + x1) / 2;
  B.box(x0, 0, z0, x0 + t, gf, z1, wallMat); B.box(x1 - t, 0, z0, x1, gf, z1, wallMat); B.box(x0, 0, z0, x1, gf, z0 + t, wallMat);
  // 前面：門口 3 米闊；兩邊玻璃
  B.box(x0, 0, z1 - t, xm - 1.5, 0.35, z1, wallMat); B.box(xm + 1.5, 0, z1 - t, x1, 0.35, z1, wallMat);
  B.box(x0, 3.3, z1 - t, x1, gf, z1, wallMat);
  if (glassFront) { B.box(x0 + t, 0.35, z1 - 0.12, xm - 1.6, 3.3, z1 - 0.05, IM.glass); B.box(xm + 1.6, 0.35, z1 - 0.12, x1 - t, 3.3, z1 - 0.05, IM.glass); B.cols.push({ min: [x0, 0, z1 - t], max: [xm - 1.5, 3.3, z1] }, { min: [xm + 1.5, 0, z1 - t], max: [x1, 3.3, z1] }); }
  else { B.box(x0, 0.35, z1 - t, xm - 1.5, 3.3, z1, wallMat); B.box(xm + 1.5, 0.35, z1 - t, x1, 3.3, z1, wallMat); }
  [xm - 1.6, xm + 1.5].forEach(x => B.box(x, 0, z1 - t, x + 0.1, 3.3, z1 + 0.05, IM.steel, false));
  ceilPlane(B, x0 + t, z0 + t, x1 - t, z1 - t, gf - 0.02, IM.ceiling);
  return { ix0: x0 + t + 0.05, iz0: z0 + t + 0.05, ix1: x1 - t - 0.05, iz1: z1 - t - 0.05, xm, gf };
}

// ---------- 前方後圓抽氣扇（每幢樓入面都有，行近可以睇零件學英文）----------
export const FAN_SPOTS = [];
const FANM = { body: std('#dfe3e6', { metalness: 0.3 }), frame: std('#f7f7f5'), blade: std('#8fa3b0', { metalness: 0.4 }), dark: std('#37474f') };
function fanGeos(face) {
  const ry = { '+z': 0, '-z': Math.PI, '+x': Math.PI / 2, '-x': -Math.PI / 2 }[face], out = [];
  const g = (geo, m, x, y, z, rz = 0, rx = 0) => { if (rx) geo.rotateX(rx); if (rz) geo.rotateZ(rz); geo.translate(x, y, z); geo.rotateY(ry); out.push([geo, m]); };
  g(new THREE.CylinderGeometry(0.27, 0.27, 0.24, 20), FANM.body, 0, 0, 0.12, 0, Math.PI / 2);          // 後面圓形摩打殼
  [[0, 0.3, 0.66, 0.06], [0, -0.3, 0.66, 0.06], [0.3, 0, 0.06, 0.66], [-0.3, 0, 0.06, 0.66]].forEach(([x, y, w, h]) => g(new THREE.BoxGeometry(w, h, 0.05), FANM.frame, x, y, 0.27));   // 前面方框
  for (let k = -2; k <= 2; k++) g(new THREE.BoxGeometry(0.58, 0.015, 0.012), FANM.frame, 0, k * 0.11, 0.29);   // 防護網
  for (let k = 0; k < 3; k++) g(new THREE.BoxGeometry(0.09, 0.46, 0.012), FANM.blade, 0, 0, 0.24, k * Math.PI * 2 / 3);   // 扇葉
  g(new THREE.CylinderGeometry(0.06, 0.06, 0.05, 12), FANM.dark, 0, 0, 0.25, 0, Math.PI / 2);          // 中軸
  g(new THREE.BoxGeometry(0.012, 0.5, 0.012), FANM.dark, 0.28, -0.55, 0.27);                             // 拉掣繩
  return out;
}
const FACE_N = { '+z': [0, 1], '-z': [0, -1], '+x': [1, 0], '-x': [-1, 0] };
export function fanModel() { const g = new THREE.Group(); for (const [geo, m] of fanGeos('+z')) g.add(new THREE.Mesh(geo, m)); return g; }
// 用 Batch 砌（合併）
export function exhaustFan(B, x, y, z, face = '+z', floorY = 0) {
  for (const [geo, m] of fanGeos(face)) { geo.translate(x, y, z); B.add(geo, m); }
  const n = FACE_N[face]; FAN_SPOTS.push({ x: x + n[0] * 1.4, y: floorY, z: z + n[1] * 1.4 });
}
// 單獨一個 Mesh（俾唔用 Batch 嘅地方）
export function exhaustFanMesh(x, y, z, face = '+z', floorY = 0) {
  const grp = new THREE.Group();
  for (const [geo, m] of fanGeos(face)) grp.add(new THREE.Mesh(geo, m));
  grp.position.set(x, y, z);
  const n = FACE_N[face]; FAN_SPOTS.push({ x: x + n[0] * 1.4, y: floorY, z: z + n[1] * 1.4 });
  return grp;
}

// ---------- 各種舖 / 大堂 ----------
const KIND_SIGN = {
  office: ['辦公大樓 OFFICE', '#263238'], shop: ['便利店 24小時', '#e65100'], cafe: ['咖啡室 CAFÉ', '#5d4037'], gym: ['健身中心 GYM', '#212121'],
  clinic: ['✚ 診所 CLINIC', '#00897b'], bank: ['銀行 BANK', '#0b4f8a'], books: ['書店 BOOKS', '#6a1b9a'], apt: ['住宅大堂', '#37474f'], diner: ['茶餐廳', '#b71c1c'], market: ['超級市場', '#2e7d32'],
};
export function pickKind(w, d, res, R) {
  if (res) return 'apt';
  if (w * d > 1500) return R() < 0.7 ? 'office' : 'market';
  return ['shop', 'cafe', 'gym', 'clinic', 'bank', 'books', 'diner', 'office'][Math.floor(R() * 8)];
}
export function storeInterior(B, I, kind, R, signText) {
  const { ix0, iz0, ix1, iz1, xm, gf } = I, W = ix1 - ix0, D = iz1 - iz0;
  plane(B, ix0, iz0, ix1, iz1, 0.02, kind === 'gym' ? IM.rubber : kind === 'books' || kind === 'cafe' ? IM.wood : IM.marble);
  lights(B, ix0, iz0, ix1, iz1, gf - 0.02, W > 30 ? 8 : 4);
  const [txt0, col] = KIND_SIGN[kind], txt = signText || txt0;
  sign(B, xm, 3.9, iz1 + 0.42, Math.min(W - 1, 8), 1.2, signMat(txt, col));                  // 門口招牌
  sign(B, xm, 2.6, iz0 + 0.02, Math.min(W - 2, 6), 0.9, signMat(txt, col), '+z');           // 入面背牆
  plant(B, ix0 + 0.6, iz1 - 0.8); plant(B, ix1 - 0.6, iz1 - 0.8);
  exhaustFan(B, ix1 - 1.6, Math.min(gf - 0.9, 3.1), iz0 + 0.02, '+z');
  if (W > 28) for (let x = ix0 + 12; x < ix1 - 6; x += 12) for (let z = iz0 + 12; z < iz1 - 8; z += 12) if (Math.abs(x - xm) > 3) cyl(B, x, 0, z, 0.45, 0.45, gf, IM.white, 12, true);
  const front = iz1 - 3.5;
  if (kind === 'office' || kind === 'apt') {
    counter(B, ix0 + 1.5, front - 2.5, Math.min(ix0 + 6, xm - 2.5), front - 1.5);
    B.box(ix0 + 2.5, 1.05, front - 2.4, ix0 + 3.1, 1.45, front - 2.35, IM.screen, false);
    liftDoors(B, Math.max(ix0 + 1, xm - Math.min(W / 2 - 1, 7)), Math.min(ix1 - 1, xm + Math.min(W / 2 - 1, 7)), iz0, 1, Math.max(2, Math.min(4, Math.floor(W / 5))));
    sofa(B, ix1 - 3, front - 1, 2.4, 1, IM.sofa2); table(B, ix1 - 3, front - 2.4, 1.2, 0.7, 0.42, IM.black);
    if (kind === 'office') for (let x = xm - 3; x <= xm + 3; x += 1.5) { if (Math.abs(x - xm) < 0.8) continue; B.box(x - 0.15, 0, iz0 + D * 0.45 - 0.4, x + 0.15, 1.0, iz0 + D * 0.45 + 0.4, IM.steel); }
    else { for (let k = 0; k < Math.min(10, Math.floor(W / 0.5) - 4); k++) B.box(ix0 + 0.5 + (k % 5) * 0.42, 0.8 + Math.floor(k / 5) * 0.32, iz0 + D * 0.5, ix0 + 0.88 + (k % 5) * 0.42, 1.08 + Math.floor(k / 5) * 0.32, iz0 + D * 0.5 + 0.05, IM.steel, false); B.box(ix0, 0, iz0 + D * 0.5 - 0.3, ix0 + 0.3, 2, iz0 + D * 0.5 + 0.4, IM.cork); }
  } else if (kind === 'shop' || kind === 'market') {
    for (let x = ix0 + 2; x < ix1 - 2.2; x += 3.2) shelfUnit(B, x, iz0 + 3, x + 1.0, front - 2);
    B.box(ix0 + 0.4, 0, iz0 + 0.3, ix1 - 0.4, 2.1, iz0 + 1.0, IM.white); B.box(ix0 + 0.5, 0.2, iz0 + 1.0, ix1 - 0.5, 2.0, iz0 + 1.03, IM.glass, false);
    for (let x = ix0 + 1; x < ix1 - 0.5; x += 0.5) B.box(x, 0.4 + (x % 3) * 0.2, iz0 + 0.5, x + 0.3, 0.7 + (x % 3) * 0.2, iz0 + 0.9, PROD[Math.floor(x) % PROD.length], false);
    counter(B, ix0 + 1, front - 0.2, ix0 + 4, front + 0.6); B.box(ix0 + 2, 1.05, front - 0.1, ix0 + 2.6, 1.35, front + 0.3, IM.black, false);
  } else if (kind === 'cafe' || kind === 'diner') {
    counter(B, ix0 + 1, iz0 + 1, ix1 - 1, iz0 + 2);
    B.box(ix0 + 2, 1.05, iz0 + 1.1, ix0 + 2.6, 1.6, iz0 + 1.6, IM.steel, false); B.box(ix0 + 3.2, 1.05, iz0 + 1.2, ix0 + 4.6, 1.5, iz0 + 1.9, IM.glass, false);
    sign(B, xm, 2.4, iz0 + 0.03, Math.min(W - 2, 4), 1.2, signMat(kind === 'cafe' ? '咖啡 $38｜朱古力 $42｜蛋糕 $45' : '奶茶 $22｜菠蘿油 $18｜常餐 $48', '#2b2b2b', '#fff', 'bold 30px sans-serif'), '+z');
    for (let x = ix0 + 1.5; x < ix1 - 1; x += 2.6) for (let z = iz0 + 4; z < front; z += 2.6) {
      if (Math.abs(x - xm) < 1.2) continue;
      if (kind === 'cafe') { cyl(B, x, 0, z, 0.45, 0.45, 0.04, IM.wood); cyl(B, x, 0, z, 0.04, 0.2, 0.72, IM.steel); B.cols.push({ min: [x - 0.45, 0, z - 0.45], max: [x + 0.45, 0.76, z + 0.45] }); chair(B, x - 0.75, z, 0, IM.wood); chair(B, x + 0.75, z, 0, IM.wood); }
      else { table(B, x, z, 1.0, 1.0, 0.75, IM.marble); [[-0.7, 0], [0.7, 0], [0, -0.7], [0, 0.7]].forEach(([a, b]) => cyl(B, x + a, 0, z + b, 0.18, 0.18, 0.45, IM.red, 10)); }
    }
  } else if (kind === 'gym') {
    for (let x = ix0 + 1.2; x < ix1 - 1; x += 1.6) { B.box(x - 0.4, 0, front - 1.0, x + 0.4, 0.2, front + 0.8, IM.black); B.box(x - 0.35, 0.2, front + 0.6, x + 0.35, 1.4, front + 0.75, IM.steel, false); B.box(x - 0.25, 1.2, front + 0.55, x + 0.25, 1.45, front + 0.6, IM.screen, false); }
    B.box(ix0 + 0.05, 0.3, iz0 + 1, ix0 + 0.1, 2.4, iz1 - 4, std('#dfe7ec', { metalness: 1, roughness: 0.04 }), false);
    for (let z = iz0 + 2; z < front - 3; z += 2.5) { B.box(xm - 0.3, 0, z - 0.9, xm + 0.3, 0.45, z + 0.9, IM.black); B.box(xm - 1.2, 1.1, z + 0.8, xm + 1.2, 1.15, z + 0.85, IM.steel, false); }
    B.box(ix1 - 1.4, 0, iz0 + 1, ix1 - 0.6, 1.0, iz0 + 5, IM.steel); for (let k = 0; k < 8; k++) cyl(B, ix1 - 1.0, 1.0, iz0 + 1.3 + k * 0.45, 0.1, 0.1, 0.12, IM.black, 8);
    cyl(B, xm + 3, 0, iz0 + 3, 0.3, 0.3, 1.6, IM.red, 10, true); B.box(xm + 2.95, 1.6, iz0 + 2.95, xm + 3.05, gf, iz0 + 3.05, IM.steel, false);
  } else if (kind === 'clinic') {
    counter(B, ix0 + 1, front - 2, xm - 1.5, front - 1.2);
    for (let r = 0; r < 2; r++) for (let x = xm + 1; x < ix1 - 0.6; x += 0.6) chair(B, x, front - 1 - r * 1.5, -1, IM.sofa2);
    const pz = iz0 + Math.min(5, D * 0.45);
    B.box(ix0, 0, pz, xm - 0.6, 2.6, pz + 0.12, IM.white); B.box(xm + 0.6, 0, pz, ix1, 2.6, pz + 0.12, IM.white);
    B.box(ix0 + 1, 0, iz0 + 1, ix0 + 3, 0.7, iz0 + 1.8, IM.linen); B.box(ix0 + 1, 0.7, iz0 + 1, ix0 + 3, 0.75, iz0 + 1.8, std('#90caf9'), false);
    table(B, ix1 - 2, iz0 + 2, 1.4, 0.7); B.box(ix1 - 2.2, 0.75, iz0 + 1.7, ix1 - 1.8, 1.1, iz0 + 1.75, IM.screen, false);
  } else if (kind === 'bank') {
    const cz = iz0 + Math.max(3, D * 0.35);
    counter(B, ix0 + 0.5, cz - 0.4, ix1 - 0.5, cz + 0.4); B.box(ix0 + 0.5, 1.05, cz - 0.05, ix1 - 0.5, 2.3, cz + 0.05, IM.glass, false);
    for (let x = ix0 + 2; x < ix1 - 1; x += 2.5) B.box(x - 0.3, 1.05, cz + 0.2, x + 0.3, 1.4, cz + 0.25, IM.screen, false);
    B.box(ix1 - 1.2, 0, front, ix1 - 0.4, 1.7, front + 0.7, IM.steel); B.box(ix1 - 1.15, 1.0, front + 0.71, ix1 - 0.45, 1.4, front + 0.72, IM.screen, false);
    for (let x = ix0 + 1.5; x < xm - 1; x += 0.6) chair(B, x, front, -1, IM.sofa2);
  } else if (kind === 'books') {
    B.box(ix0 + 0.1, 0, iz0 + 1, ix0 + 0.7, 2.4, iz1 - 4, IM.wood); B.box(ix1 - 0.7, 0, iz0 + 1, ix1 - 0.1, 2.4, iz1 - 4, IM.wood);
    for (let z = iz0 + 1.2; z < iz1 - 4; z += 0.4) for (let lv = 0; lv < 5; lv++) { const p = PROD[(Math.floor(z * 5) + lv) % PROD.length]; B.box(ix0 + 0.7, 0.15 + lv * 0.45, z, ix0 + 0.73, 0.5 + lv * 0.45, z + 0.3, p, false); B.box(ix1 - 0.73, 0.15 + lv * 0.45, z, ix1 - 0.7, 0.5 + lv * 0.45, z + 0.3, p, false); }
    for (let z = iz0 + 3; z < front - 1; z += 4) { table(B, xm, z, 2.2, 1.2, 0.8, IM.wood); for (let k = 0; k < 8; k++) B.box(xm - 1 + k * 0.26, 0.8, z - 0.3, xm - 0.8 + k * 0.26, 0.86, z + 0.1, PROD[k % PROD.length], false); }
    counter(B, ix0 + 1, front + 0.2, ix0 + 3.5, front + 1);
  }
}

// ---------- 屋：客廳、廚房、睡房、廁所 ----------
export function houseInterior(B, h, wallMat) {
  const { x0, z0, x1, z1, y1 } = h, t = 0.25, xm = (x0 + x1) / 2, W = x1 - x0, D = z1 - z0;
  B.box(x0, 0, z0, x0 + t, y1, z1, wallMat, true, 3, 2.8); B.box(x1 - t, 0, z0, x1, y1, z1, wallMat, true, 3, 2.8); B.box(x0, 0, z0, x1, y1, z0 + t, wallMat, true, 3, 2.8);
  B.box(x0, 0, z1 - t, xm - 0.6, y1, z1, wallMat, true, 3, 2.8); B.box(xm + 0.6, 0, z1 - t, x1, y1, z1, wallMat, true, 3, 2.8); B.box(xm - 0.6, 2.2, z1 - t, xm + 0.6, y1, z1, wallMat, true, 3, 2.8);
  B.box(xm + 0.6, 0, z1 - 0.05, xm + 0.65, 2.15, z1 + 0.9, IM.wood, false);                      // 打開咗嘅門
  ceilPlane(B, x0 + t, z0 + t, x1 - t, z1 - t, y1 - 0.01, IM.ceiling);
  plane(B, x0 + t, z0 + t, x1 - t, z1 - t, 0.02, IM.wood);
  const mz = z0 + D * 0.45;                                                                        // 間隔：後面睡房 + 廁所，前面客廳 + 廚房
  B.box(x0 + t, 0, mz - 0.08, xm - 0.6, y1, mz + 0.08, IM.white); B.box(xm + 0.6, 0, mz - 0.08, x1 - t, y1, mz + 0.08, IM.white);
  const bx = x0 + W * 0.62;
  B.box(bx - 0.08, 0, z0 + t, bx + 0.08, y1, mz - 1.2, IM.white);
  // 睡房
  B.box(x0 + 0.4, 0, z0 + 0.4, x0 + 2.3, 0.45, z0 + 2.5, IM.dark); B.box(x0 + 0.45, 0.45, z0 + 0.45, x0 + 2.25, 0.62, z0 + 2.45, IM.linen, false); B.box(x0 + 0.45, 0.62, z0 + 1.2, x0 + 2.25, 0.66, z0 + 2.45, IM.blanket, false);
  sph(B, x0 + 1.35, 0.7, z0 + 0.7, 0.3, IM.linen, 1.6, 0.4, 0.8);
  B.box(bx - 1.3, 0, z0 + 0.35, bx - 0.2, 2.0, z0 + 0.9, IM.wood);
  // 廁所
  cyl(B, bx + 0.6, 0, z0 + 0.6, 0.2, 0.17, 0.42, IM.porcelain, 10, true); B.box(bx + 0.4, 0.4, z0 + 0.3, bx + 0.8, 0.8, z0 + 0.42, IM.porcelain, false);
  B.box(x1 - 1.2, 0, z0 + 0.35, x1 - 0.35, 0.85, z0 + 0.9, IM.marble); cyl(B, x1 - 0.78, 0.85, z0 + 0.62, 0.18, 0.14, 0.05, IM.porcelain);
  plane(B, bx + 0.1, z0 + t, x1 - t, mz - 0.1, 0.03, IM.tile);
  // 客廳
  sofa(B, x0 + 2.2, z1 - 1.3, 2.4, -1); table(B, x0 + 2.2, z1 - 2.6, 1.1, 0.6, 0.4, IM.wood);
  B.box(x0 + 1.2, 0, mz + 0.2, x0 + 3.2, 0.5, mz + 0.6, IM.dark); B.box(x0 + 1.4, 0.8, mz + 0.35, x0 + 3.0, 1.75, mz + 0.4, IM.black, false); B.box(x0 + 1.45, 0.85, mz + 0.4, x0 + 2.95, 1.7, mz + 0.41, IM.screen, false);
  // 廚房
  B.box(x1 - 0.9, 0, mz + 0.2, x1 - 0.3, 0.9, z1 - 1.0, IM.wood); B.box(x1 - 0.92, 0.9, mz + 0.2, x1 - 0.28, 0.94, z1 - 1.0, IM.marble, false);
  [0.8, 1.4].forEach(o => cyl(B, x1 - 0.6, 0.94, mz + o, 0.13, 0.13, 0.03, IM.black));
  B.box(x1 - 0.95, 0, mz + 0.2 - 0.01, x1 - 0.3, 1.9, mz + 0.85 - 0.6, std('#e0e0e0'));
  table(B, xm + 0.6, z1 - 2.3, 1.0, 1.0); chair(B, xm + 0.6, z1 - 1.55, -1); chair(B, xm + 0.6, z1 - 3.05, 1);
  B.box(x0 + 0.6, y1 - 0.06, z1 - 3, x0 + 1.4, y1 - 0.01, z1 - 2.2, IM.light, false);
  exhaustFan(B, x1 - t - 0.02, 2.2, z1 - 1.5, '-x');
}

// ---------- 穀倉 ----------
export function barnInterior(B, bx, bz, red) {
  B.box(bx - 8, 0, bz - 6, bx - 7.7, 7, bz + 6, red, true, 16, 7); B.box(bx + 7.7, 0, bz - 6, bx + 8, 7, bz + 6, red, true, 16, 7); B.box(bx - 8, 0, bz - 6, bx + 8, 7, bz - 5.7, red, true, 16, 7);
  B.box(bx - 8, 0, bz + 5.7, bx - 2.5, 7, bz + 6, red, true, 16, 7); B.box(bx + 2.5, 0, bz + 5.7, bx + 8, 7, bz + 6, red, true, 16, 7); B.box(bx - 2.5, 4.5, bz + 5.7, bx + 2.5, 7, bz + 6, red, true, 16, 7);
  ceilPlane(B, bx - 7.7, bz - 5.7, bx + 7.7, bz + 5.7, 6.99, IM.wood);
  for (let k = 0; k < 6; k++) B.box(bx - 7.5 + (k % 3) * 1.3, Math.floor(k / 3) * 0.9, bz - 5.5, bx - 6.3 + (k % 3) * 1.3, 0.9 + Math.floor(k / 3) * 0.9, bz - 4.2, IM.hay);
  // 拖拉機
  B.box(bx + 2, 0.5, bz - 4, bx + 4, 1.6, bz - 1, IM.tractor); B.box(bx + 2.3, 1.6, bz - 2.2, bx + 3.7, 2.8, bz - 1.1, IM.glass, false);
  [[2, -3.5, 0.7], [4, -3.5, 0.7], [2, -1.4, 0.45], [4, -1.4, 0.45]].forEach(([x, z, r]) => { const g = new THREE.CylinderGeometry(r, r, 0.3, 14); g.rotateZ(Math.PI / 2); g.translate(bx + x, r, bz + z); B.add(g, IM.black); });
  // 牛
  [[-3, 1.5], [-1, 3]].forEach(([x, z]) => { B.box(bx + x - 0.4, 0.7, bz + z - 0.9, bx + x + 0.4, 1.4, bz + z + 0.9, IM.cow); B.box(bx + x - 0.2, 1.1, bz + z + 0.9, bx + x + 0.2, 1.5, bz + z + 1.3, IM.cow, false); B.box(bx + x - 0.41, 0.9, bz + z - 0.3, bx + x + 0.41, 1.2, bz + z + 0.2, IM.cowSpot, false); [[-0.3, -0.7], [0.3, -0.7], [-0.3, 0.7], [0.3, 0.7]].forEach(([a, b]) => B.box(bx + x + a - 0.07, 0, bz + z + b - 0.07, bx + x + a + 0.07, 0.7, bz + z + b + 0.07, IM.cow, false)); });
  for (let z = -2; z <= 4; z += 3) B.box(bx - 5, 0, bz + z, bx + 0.5, 1.1, bz + z + 0.1, IM.wood);
  exhaustFan(B, bx + 5, 4.2, bz - 5.68, '+z');
}

// ---------- 學校 ----------
export function school(B, cx, cz, name) {
  // 主樓（3 層；地下全部行得入：走廊 + 課室 + 圖書館）
  const x0 = cx - 72, x1 = cx + 72, z0 = cz - 88, z1 = cz - 60, gf = 4, H = 13;
  const wall = std('#f3e9d2'), trim = std('#c0392b');
  B.box(x0, gf, z0, x1, H, z1, wall, true, 4, 3.5);
  exhaustFan(B, x0 + 4, 3.1, z0 + 0.4, '+z');
  for (let y = gf; y < H; y += 3) B.box(x0 - 0.1, y, z1, x1 + 0.1, y + 0.3, z1 + 0.1, trim, false);
  for (let x = x0 + 2; x < x1 - 1; x += 4) for (let y = gf + 0.8; y < H - 1; y += 3) B.box(x, y, z1 + 0.01, x + 2.4, y + 1.4, z1 + 0.04, IM.glass, false);
  B.box(x0 - 0.5, H, z0 - 0.5, x1 + 0.5, H + 0.5, z1 + 0.5, std('#9e9e9e'), false);
  // 地下外牆
  B.box(x0, 0, z0, x0 + 0.3, gf, z1, wall); B.box(x1 - 0.3, 0, z0, x1, gf, z1, wall); B.box(x0, 0, z0, x1, gf, z0 + 0.3, wall);
  const cw = 0.3, corrZ = z1 - 3.2;
  // 前面：開放走廊（柱）
  for (let x = x0; x <= x1; x += 8) B.box(x - 0.25, 0, z1 - 0.5, x + 0.25, gf, z1, wall);
  ceilPlane(B, x0 + 0.3, z0 + 0.3, x1 - 0.3, z1, gf - 0.02, IM.ceiling);
  plane(B, x0, corrZ, x1, z1, 0.02, IM.tile);
  const rooms = Math.floor((x1 - x0) / 14);
  for (let r = 0; r < rooms; r++) {
    const rx0 = x0 + r * 14, rx1 = rx0 + 14, rm = (rx0 + rx1) / 2;
    if (r > 0) B.box(rx0 - cw / 2, 0, z0 + 0.3, rx0 + cw / 2, gf, corrZ, wall);
    B.box(rx0, 0, corrZ - cw, rx0 + 9, gf, corrZ, wall); B.box(rx0 + 10.4, 0, corrZ - cw, rx1, gf, corrZ, wall); B.box(rx0 + 9, 2.3, corrZ - cw, rx0 + 10.4, gf, corrZ, wall);
    plane(B, rx0 + 0.2, z0 + 0.3, rx1 - 0.2, corrZ - 0.3, 0.02, IM.wood);
    lights(B, rx0, z0 + 0.3, rx1, corrZ, gf - 0.02, 4.5);
    const lib = r === rooms - 1;
    if (lib) {
      sign(B, rx0 + 5, 2.9, corrZ + 0.02, 3, 0.6, signMat('圖書館 LIBRARY', '#6a1b9a'));
      for (let k = 0; k < 4; k++) shelfUnit(B, rx0 + 1.5 + k * 3, z0 + 2, rx0 + 2.3 + k * 3, z0 + 12, 2.0);
      table(B, rm, corrZ - 5, 4, 1.4); for (let k = 0; k < 4; k++) chair(B, rm - 1.5 + k, corrZ - 4, -1, IM.wood);
    } else {
      sign(B, rx0 + 5, 2.9, corrZ + 0.02, 2.6, 0.6, signMat(`${Math.floor(r / 3) + 1}${'ABC'[r % 3]} 班`, '#1565c0'));
      // 黑板 + 老師枱
      B.box(rm - 4, 1.0, z0 + 0.3, rm + 4, 2.6, z0 + 0.36, IM.board, false);
      sign(B, rm, 1.8, z0 + 0.37, 7.6, 1.5, signMat(['今日功課：中文 P.25｜數學 3.4', '2 + 3 × 4 = 14', 'Today: Unit 5 My Family', '常識：水循環 ☁️→🌧→🌊'][r % 4], '#1f3d2b', '#f5f5f5', 'bold 34px sans-serif'), '+z');
      table(B, rm + 3.5, z0 + 2, 1.6, 0.8, 0.78, IM.wood);
      for (let row = 0; row < 5; row++) for (let c = 0; c < 6; c++) {
        const x = rx0 + 2 + c * 2, z = z0 + 4 + row * 1.9; if (z > corrZ - 1.6) continue;
        table(B, x, z, 0.7, 0.5, 0.72, IM.wood); chair(B, x, z + 0.55, -1, std('#1e88e5'));
      }
      cyl(B, rm, 3.1, z0 + 0.32, 0.3, 0.3, 0.05, IM.white);
      for (let x = rx0 + 1; x < rx1 - 1; x += 0.8) B.box(x, 0, corrZ - 0.75, x + 0.75, 1.8, corrZ - cw, IM.locker, false);
    }
  }
  // 校門 + 校名
  B.box(cx - 10, 0, cz + 92, cx - 7, 4, cz + 95, trim); B.box(cx + 7, 0, cz + 92, cx + 10, 4, cz + 95, trim);
  B.box(cx - 10, 4, cz + 92.8, cx + 10, 5.2, cz + 94.2, trim, false);
  sign(B, cx, 4.6, cz + 94.25, 17, 1.0, signMat(name, '#c0392b', '#fff', 'bold 60px serif'));
  sign(B, cx, 9.5, z1 + 0.15, 30, 2.4, signMat(name, '#c0392b', '#fff', 'bold 60px serif'));
  // 籃球場
  plane(B, cx - 64, cz - 50, cx - 14, cz - 22, 0.03, std('#c75b39'));
  B.box(cx - 39.1, 0.031, cz - 50, cx - 38.9, 0.04, cz - 22, IM.white, false);
  [cx - 63, cx - 15].forEach((x, k) => { B.box(x - 0.15, 0, cz - 36.15, x + 0.15, 3.3, cz - 35.85, IM.steel); B.box(x - 0.05 + (k ? -0.5 : 0.5) - 0.05, 2.9, cz - 37, x + (k ? -0.5 : 0.5) + 0.05, 3.9, cz - 35, IM.white, false); });
  // 跑道 + 足球場
  const tr = new THREE.RingGeometry(26, 32, 40); tr.rotateX(-Math.PI / 2); tr.scale(1.6, 1, 1); tr.translate(cx + 35, 0.025, cz + 30); B.add(tr, std('#c0392b'));
  const fld = new THREE.CircleGeometry(26, 40); fld.rotateX(-Math.PI / 2); fld.scale(1.6, 1, 1); fld.translate(cx + 35, 0.026, cz + 30); B.add(fld, std('#4caf50'));
  // 旗杆
  cyl(B, cx - 20, 0, cz + 5, 0.08, 0.1, 12, IM.steel, 8, true); B.box(cx - 19.9, 10, cz + 4.99, cx - 17.6, 11.5, cz + 5.01, IM.red, false);
  // 有蓋操場
  B.box(cx - 60, 4.5, cz - 15, cx - 20, 4.8, cz + 0, std('#607d8b'), false); for (const x of [cx - 59, cx - 40, cx - 21]) for (const z of [cz - 14, cz - 1]) B.box(x - 0.2, 0, z - 0.2, x + 0.2, 4.5, z + 0.2, std('#607d8b'));
  for (let k = 0; k < 3; k++) { B.box(cx - 55 + k * 12, 0, cz - 8, cx - 51 + k * 12, 0.45, cz - 7.5, IM.wood); }
}
