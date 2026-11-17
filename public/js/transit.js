// 公共交通：的士、小巴、雙層巴士（原創簡化造型）
// 喺小鎮「交通總站」或者撳 🚕 叫車，揀地圖任何一個位置，車會沿住馬路網送你去
import * as THREE from 'three';
import * as TX from './textures.js';

const V3 = THREE.Vector3;
const std = (c, e = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.5, ...e });
const glassM = new THREE.MeshStandardMaterial({ color: '#9fd3ff', transparent: true, opacity: 0.35, roughness: 0.05, metalness: 0.2, depthWrite: false, side: THREE.DoubleSide });

export const TRANSIT = [
  { id: 'taxi', n: '的士', e: '🚕', speed: 32, fare: L => Math.round(27 + Math.max(0, L - 2000) / 200 * 1.9), desc: '最快、直送門口；起錶 $27' },
  { id: 'minibus', n: '小巴', e: '🚐', speed: 26, fare: () => 12, desc: '十六座位，車費 $12' },
  { id: 'bus', n: '雙層巴士', e: '🚌', speed: 22, fare: () => 9, desc: '可以坐上層睇風景，車費 $9' },
];
export const transitIndex = id => TRANSIT.findIndex(t => t.id === id);

function mk(g, geo, mat, x, y, z) { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; g.add(m); return m; }
function boxG(g, x0, y0, z0, x1, y1, z1, mat) { return mk(g, new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0), mat, (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2); }
function wheelsAt(g, list, r) {
  const ws = [];
  list.forEach(([x, z]) => { const w = new THREE.Group(); w.position.set(x, r, z); g.add(w); mk(w, new THREE.CylinderGeometry(r, r, 0.3, 16), std('#111'), 0, 0, 0).rotation.z = Math.PI / 2; mk(w, new THREE.CylinderGeometry(r * 0.5, r * 0.5, 0.32, 10), std('#cfd3d6', { metalness: 0.9 }), 0, 0, 0).rotation.z = Math.PI / 2; ws.push(w); });
  return ws;
}
function label(g, text, bg, fg, w, h, x, y, z, ry) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: TX.signTex(text, bg, fg, 512, Math.round(512 * h / w), `bold ${Math.round(300 * h / w)}px sans-serif`), side: THREE.DoubleSide }));
  m.position.set(x, y, z); m.rotation.y = ry; g.add(m); return m;
}

// 車頭向 +z；userData.seat = 乘客座位（本地座標，avatar 腳底位置）
export function buildTransitModel(id) {
  const g = new THREE.Group();
  let seat, wheels, len;
  if (id === 'taxi') {
    const red = std('#d32f2f', { metalness: 0.3 }), silver = std('#cfd3d6', { metalness: 0.6 });
    boxG(g, -0.9, 0.35, -2.2, 0.9, 1.0, 2.2, red);
    boxG(g, -0.85, 1.0, -1.1, 0.85, 1.55, 0.9, silver);
    boxG(g, -0.86, 1.05, -1.0, 0.86, 1.5, 0.8, glassM);
    boxG(g, -0.3, 1.55, -0.2, 0.3, 1.75, 0.1, std('#fff59d', { emissive: '#fff176', emissiveIntensity: 0.6 }));
    label(g, 'TAXI 的士', '#fff59d', '#b71c1c', 0.58, 0.18, 0, 1.65, 0.11, 0);
    [-1, 1].forEach(s => { mk(g, new THREE.BoxGeometry(0.3, 0.15, 0.04), std('#fffbe0', { emissive: '#fff6c0', emissiveIntensity: 1 }), s * 0.6, 0.75, 2.21); mk(g, new THREE.BoxGeometry(0.3, 0.15, 0.04), std('#ff1744', { emissive: '#ff1744', emissiveIntensity: 0.7 }), s * 0.6, 0.8, -2.21); });
    boxG(g, -0.6, 0.55, -0.9, 0.6, 0.62, 0.3, std('#5d4037'));
    seat = new V3(0.4, 0.45, -0.6); wheels = wheelsAt(g, [[-0.85, 1.4], [0.85, 1.4], [-0.85, -1.4], [0.85, -1.4]], 0.35); len = 4.4;
  } else if (id === 'minibus') {
    const cream = std('#f3ecd2'), green = std('#2e7d32');
    boxG(g, -1.05, 0.4, -3.0, 1.05, 1.4, 3.0, cream);
    boxG(g, -1.05, 1.4, -3.0, 1.05, 2.3, 2.6, cream);
    boxG(g, -1.06, 1.45, -2.8, 1.06, 2.05, 2.4, glassM);
    boxG(g, -1.05, 1.4, 2.6, 1.05, 2.0, 3.0, glassM);
    boxG(g, -1.06, 2.3, -3.0, 1.06, 2.5, 3.0, green);
    boxG(g, -1.07, 0.9, -3.0, 1.07, 1.05, 3.0, green);
    label(g, '小巴 MINIBUS', '#2e7d32', '#fff', 1.4, 0.3, 0, 2.15, 3.02, 0);
    for (let z = -2.4; z <= 1.6; z += 0.8) [-0.6, 0.6].forEach(x => { boxG(g, x - 0.3, 0.8, z - 0.25, x + 0.3, 1.2, z + 0.25, std('#5d4037')); boxG(g, x - 0.3, 1.2, z - 0.3, x + 0.3, 1.8, z - 0.22, std('#5d4037')); });
    seat = new V3(0.6, 0.85, -0.8); wheels = wheelsAt(g, [[-0.95, 2.0], [0.95, 2.0], [-0.95, -2.0], [0.95, -2.0]], 0.42); len = 6;
  } else {
    const red = std('#c62828'), cream = std('#f5f0e1'), dark = std('#263238');
    boxG(g, -1.25, 0.45, -5.5, 1.25, 2.2, 5.5, red);
    boxG(g, -1.25, 2.2, -5.5, 1.25, 4.3, 5.5, cream);
    boxG(g, -1.26, 1.3, -5.2, 1.26, 2.1, 5.0, glassM);
    boxG(g, -1.26, 2.9, -5.3, 1.26, 3.9, 5.3, glassM);
    boxG(g, -1.2, 1.2, 5.49, 1.2, 2.1, 5.51, glassM); boxG(g, -1.2, 2.9, 5.49, 1.2, 3.9, 5.51, glassM);
    boxG(g, -1.26, 4.3, -5.5, 1.26, 4.45, 5.5, dark);
    boxG(g, -1.25, 2.2, -5.5, 1.25, 2.45, 5.5, red);
    label(g, '🚌 雙層巴士　任你去', '#111', '#ffb300', 2.0, 0.35, 0, 4.05, 5.53, 0);
    label(g, '🚌 雙層巴士 DOUBLE DECKER', '#c62828', '#fff', 5, 0.4, -1.27, 2.5, 0, -Math.PI / 2);
    label(g, '🚌 雙層巴士 DOUBLE DECKER', '#c62828', '#fff', 5, 0.4, 1.27, 2.5, 0, Math.PI / 2);
    for (let z = -4.6; z <= 4.2; z += 0.9) [-0.7, 0.7].forEach(x => { boxG(g, x - 0.35, 2.75, z - 0.25, x + 0.35, 3.15, z + 0.25, std('#1565c0')); boxG(g, x - 0.35, 3.15, z - 0.3, x + 0.35, 3.75, z - 0.22, std('#1565c0')); });
    boxG(g, -1.2, 2.45, -5.4, 1.2, 2.55, 5.4, std('#9e9e9e'));
    seat = new V3(0.7, 2.75, 3.4); wheels = wheelsAt(g, [[-1.15, 3.6], [1.15, 3.6], [-1.15, -3.4], [1.15, -3.4]], 0.5); len = 11;
  }
  g.userData = { id, seat, wheels, len };
  return g;
}

// ===== 路線：沿 200 米一格嘅馬路網行 =====
const CH = 200, line = v => Math.round((v + 100) / CH) * CH - 100;
function snap(x, z) { const rx = line(x), rz = line(z); return Math.abs(x - rx) < Math.abs(z - rz) ? { x: rx, z, v: true } : { x, z: rz, v: false }; }
// 過海要經海底隧道（3 條）
const HB = { x0: 500, x1: 3900, zN: 2690, zS: 2910 }, TUN_X = [1100, 2100, 3300];
export function planRoute(from, to, town) {
  const sideF = from.z < 2800, sideT = to.z < 2800;
  const crosses = sideF !== sideT && ((from.x > HB.x0 - 120 && from.x < HB.x1 + 120) || (to.x > HB.x0 - 120 && to.x < HB.x1 + 120) || (Math.min(from.x, to.x) < HB.x0 && Math.max(from.x, to.x) > HB.x1));
  if (!crosses) return planRoute0(from, to, town);
  const mx = (from.x + to.x) / 2, tx = TUN_X.reduce((a, b) => Math.abs(b - mx) < Math.abs(a - mx) ? b : a);
  const a = { x: tx, z: sideF ? HB.zN : HB.zS }, b = { x: tx, z: sideF ? HB.zS : HB.zN };
  const R1 = planRoute0(from, a, town), R2 = planRoute0(b, to, town);
  const pts = R1.pts.concat(R2.pts);
  const cum = [0]; for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + pts[i].distanceTo(pts[i - 1]));
  return { pts, cum, L: cum[cum.length - 1], tunnel: [R1.L - 1, R1.L + Math.abs(HB.zS - HB.zN) + 1], tunnelX: tx };
}
function planRoute0(from, to, town) {
  const pts = [new V3(from.x, 0, from.z)];
  const push = (x, z) => { const l = pts[pts.length - 1]; if (Math.hypot(l.x - x, l.z - z) > 0.5) pts.push(new V3(x, 0, z)); };
  const inTown = p => p.x > town.x0 && p.x < town.x1 && p.z > town.z0 && p.z < town.z1;
  // 小鎮：先經露營車路（x = -65）出去南面大路（z = 100）
  let a;
  if (inTown(from)) { push(-65, from.z); push(-65, 100); a = { x: -65, z: 100, v: false }; }
  else { a = snap(from.x, from.z); push(a.x, a.z); }
  let b, tail = [];
  if (inTown(to)) { b = { x: -65, z: 100, v: false }; tail = [[-65, 40], [to.x, to.z]]; }
  else { b = snap(to.x, to.z); tail = [[to.x, to.z]]; }
  if (a.v) {   // 而家喺直路（x 固定）
    const zt = b.v ? line(b.z) : b.z;
    push(a.x, zt); if (b.v) { push(b.x, zt); push(b.x, b.z); } else push(b.x, zt);
  } else {
    const xt = b.v ? b.x : line(b.x);
    push(xt, a.z); if (b.v) push(xt, b.z); else { push(xt, b.z); push(b.x, b.z); }
  }
  tail.forEach(([x, z]) => push(x, z));
  const cum = [0]; for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + pts[i].distanceTo(pts[i - 1]));
  return { pts, cum, L: cum[cum.length - 1] };
}
export function routeAt(R, s, out) {
  const { pts, cum, L } = R; s = Math.max(0, Math.min(L, s));
  let i = 1; while (i < cum.length - 1 && cum[i] < s) i++;
  const a = (s - cum[i - 1]) / Math.max(1e-6, cum[i] - cum[i - 1]);
  out.lerpVectors(pts[i - 1], pts[i], a);
  return Math.atan2(pts[i].x - pts[i - 1].x, pts[i].z - pts[i - 1].z);
}

// ===== 小鎮交通總站（停住三架車，撳一下就揀目的地）=====
export const STAND = { x: -56, z0: 26 };
export function buildTransitStand(scene, api) {
  const inter = [], cols = [];
  TRANSIT.forEach((t, k) => {
    const m = buildTransitModel(t.id); const z = STAND.z0 + k * 13;
    m.position.set(STAND.x, 0, z); scene.add(m);
    const L = m.userData.len, hw = t.id === 'bus' ? 1.25 : t.id === 'minibus' ? 1.05 : 0.9;
    cols.push({ min: [STAND.x - hw, 0, z - L / 2], max: [STAND.x + hw, t.id === 'bus' ? 4.4 : 2.2, z + L / 2] });
    const s = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.6), new THREE.MeshBasicMaterial({ map: TX.signTex(`${t.e} ${t.n}站`, t.id === 'taxi' ? '#c62828' : t.id === 'minibus' ? '#2e7d32' : '#1565c0', '#fff', 512, 128, 'bold 60px sans-serif') }));
    s.position.set(STAND.x + 3.2, 2.6, z); s.rotation.y = Math.PI / 2; scene.add(s); const s2 = s.clone(); s2.rotation.y = -Math.PI / 2; s2.position.x -= 0.01; scene.add(s2);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.4, 8), std('#555')); pole.position.set(STAND.x + 3.2, 1.2, z - 0.01); scene.add(pole);
    inter.push({ pos: new V3(STAND.x + 2.4, 0, z), r: 2.6, label: () => `${t.e} 搭${t.n}（揀地圖任何位置）`, act: () => api.transitPick(t.id) });
  });
  return { interactables: inter, colliders: cols };
}
