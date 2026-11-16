// 機場 + 玩家可以揸嘅小型定翼機 / 直升機
// 規矩：飛機只可以喺公路或者機場升降（直升機另外可以喺停機坪，包括柏熙酒店天台）
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import * as TX from './textures.js';
import { AIRPORT, ARENA, TOWN, CHUNK, district } from './city.js';
import { IM, signMat, sign, plant } from './interiors.js';

const V3 = THREE.Vector3;
const std = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.6, ...extra });
const A = AIRPORT;
export const RUNWAY = { x0: 1960, x1: 3040, z0: -80, z1: -35 };
const PAVED = [RUNWAY, { x0: 1990, x1: 3010, z0: -20, z1: 10 }, { x0: 2080, x1: 2760, z0: 10, z1: 200 }, { x0: 2780, x1: 3020, z0: 10, z1: 190 }];
export const HELIPADS = [[2470, 150], [2560, 150], [55 - 16, -125 + 4, 80]];

// 呢個位置可唔可以升降？
export function canLand(x, z, heli = false, y = 0) {
  for (const p of HELIPADS) if (heli && Math.hypot(x - p[0], z - p[1]) < 9 && Math.abs(y - (p[2] || 0)) < 3) return true;
  if (y > 2) return false;
  for (const r of PAVED) if (x > r.x0 && x < r.x1 && z > r.z0 && z < r.z1) return true;
  // 原本小鎮嘅馬路
  if (Math.abs(z - 78) < 6.5 && Math.abs(x) < 300) return true;
  if (x > TOWN.x0 && x < TOWN.x1 && z > TOWN.z0 && z < TOWN.z1) return false;
  for (const r of [A, ARENA]) if (x > r.x0 && x < r.x1 && z > r.z0 && z < r.z1) return false;
  // 全地圖馬路網（每 200 米一條）
  const rx = ((x + 100) % CHUNK + CHUNK) % CHUNK, rz = ((z + 100) % CHUNK + CHUNK) % CHUNK;
  if (Math.min(rx, CHUNK - rx) < 6.5 || Math.min(rz, CHUNK - rz) < 6.5) return Math.abs(x) < 5000 && Math.abs(z) < 5000;
  // 市區 / 住宅區入面嘅十字街
  const i = Math.round(x / CHUNK), j = Math.round(z / CHUNK), t = district(i, j);
  if ((t === 'city' || t === 'res') && (Math.abs(x - i * CHUNK) < 6 || Math.abs(z - j * CHUNK) < 6)) return true;
  return false;
}

// ---------- 模型 ----------
export function buildPlane(color = '#e53935') {
  const g = new THREE.Group(), body = std('#f5f5f5', { metalness: 0.3 }), c = std(color, { metalness: 0.3 }), dark = std('#222');
  const add = (geo, m, x, y, z, rx = 0, ry = 0, rz = 0) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.rotation.set(rx, ry, rz); o.castShadow = true; g.add(o); return o; };
  add(new THREE.CapsuleGeometry(0.75, 5.2, 6, 12), body, 0, 1.5, 0, Math.PI / 2);
  add(new THREE.SphereGeometry(0.7, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#7fc8ff', transparent: true, opacity: 0.55 }), 0, 2.0, 1.0).scale.set(1, 0.8, 1.6);
  add(new THREE.BoxGeometry(10.5, 0.14, 1.6), c, 0, 2.15, 0.6);                                  // 機翼
  add(new THREE.BoxGeometry(3.6, 0.1, 0.9), c, 0, 1.7, -3.1);                                    // 水平尾翼
  add(new THREE.BoxGeometry(0.12, 1.5, 1.1), c, 0, 2.4, -3.2);                                   // 垂直尾翼
  add(new THREE.BoxGeometry(1.52, 0.16, 5), c, 0, 1.4, 0);                                       // 機身條紋
  const prop = new THREE.Group(); prop.position.set(0, 1.5, 3.45); g.add(prop);
  [0, Math.PI / 2].forEach(r => { const b = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.16, 0.06), dark); b.rotation.z = r; prop.add(b); });
  add(new THREE.ConeGeometry(0.28, 0.5, 10), c, 0, 1.5, 3.55, Math.PI / 2);
  [[-1.1, 0.4], [1.1, 0.4], [0, 2.6]].forEach(([x, z]) => { add(new THREE.CylinderGeometry(0.04, 0.04, 0.9, 6), dark, x, 0.75, z); add(new THREE.CylinderGeometry(0.28, 0.28, 0.16, 12), dark, x, 0.28, z, 0, 0, Math.PI / 2); });
  g.userData = { prop, seat: new V3(0, 1.15, 0.9), kind: 'plane' };
  return g;
}
export function buildHeli(color = '#1565c0') {
  const g = new THREE.Group(), c = std(color, { metalness: 0.35 }), dark = std('#222'), glass = new THREE.MeshStandardMaterial({ color: '#8fd3ff', transparent: true, opacity: 0.5 });
  const add = (geo, m, x, y, z, rx = 0, ry = 0, rz = 0) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.rotation.set(rx, ry, rz); o.castShadow = true; g.add(o); return o; };
  add(new THREE.SphereGeometry(1.2, 16, 12), c, 0, 1.6, 0).scale.set(1, 0.95, 1.35);
  add(new THREE.SphereGeometry(1.0, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2.2), glass, 0, 1.6, 0.75, Math.PI / 2.4).scale.set(1, 1, 0.9);
  add(new THREE.CylinderGeometry(0.15, 0.3, 4.5, 8), c, 0, 1.9, -3.2, Math.PI / 2);
  add(new THREE.BoxGeometry(0.1, 1.0, 0.6), c, 0, 2.3, -5.3);
  const tail = new THREE.Group(); tail.position.set(0.15, 2.3, -5.3); g.add(tail);
  [0, Math.PI / 2].forEach(r => { const b = new THREE.Mesh(new THREE.BoxGeometry(0.04, 1.1, 0.1), dark); b.rotation.x = r; tail.add(b); });
  add(new THREE.CylinderGeometry(0.1, 0.1, 0.5, 8), dark, 0, 2.85, 0);
  const rotor = new THREE.Group(); rotor.position.set(0, 3.1, 0); g.add(rotor);
  [0, Math.PI / 2].forEach(r => { const b = new THREE.Mesh(new THREE.BoxGeometry(9, 0.05, 0.3), dark); b.rotation.y = r; rotor.add(b); });
  [-0.8, 0.8].forEach(x => { add(new THREE.BoxGeometry(0.1, 0.1, 3.4), dark, x, 0.1, 0); add(new THREE.BoxGeometry(0.08, 0.6, 0.08), dark, x, 0.4, 0.8); add(new THREE.BoxGeometry(0.08, 0.6, 0.08), dark, x, 0.4, -0.8); });
  g.userData = { rotor, tail, seat: new V3(0, 0.95, 0.4), kind: 'heli' };
  return g;
}
function airliner(color) {
  const g = new THREE.Group(), w = std('#f5f5f5', { metalness: 0.3 }), c = std(color);
  const add = (geo, m, x, y, z, rx = 0, ry = 0, rz = 0) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.rotation.set(rx, ry, rz); g.add(o); return o; };
  add(new THREE.CapsuleGeometry(2.4, 34, 6, 14), w, 0, 4.5, 0, Math.PI / 2);
  add(new THREE.BoxGeometry(36, 0.5, 6), w, 0, 3.8, -1, 0, 0, 0);
  add(new THREE.BoxGeometry(12, 0.3, 3), w, 0, 5, -17);
  add(new THREE.BoxGeometry(0.4, 7, 5), c, 0, 8.5, -17.5);
  add(new THREE.BoxGeometry(4.9, 0.6, 30), c, 0, 4.0, 0);
  [-7, 7].forEach(x => add(new THREE.CylinderGeometry(1.1, 1.1, 4, 14), std('#b0bec5', { metalness: 0.6 }), x, 2.6, 1, Math.PI / 2));
  for (let z = -12; z < 14; z += 1.6) [-1, 1].forEach(s => add(new THREE.BoxGeometry(0.05, 0.5, 0.4), std('#263238'), s * 2.4, 5.6, z));
  [[0, 12], [-2.5, -1], [2.5, -1]].forEach(([x, z]) => add(new THREE.CylinderGeometry(0.5, 0.5, 0.5, 12), std('#222'), x, 0.5, z, 0, 0, Math.PI / 2));
  return g;
}

// ---------- 機場 ----------
export function buildAirport(scene, api) {
  const root = new THREE.Group(); scene.add(root);
  const cols = [], parts = new Map(), inter = [];
  const B = { cols, add(g, m) { if (!parts.has(m)) parts.set(m, []); parts.get(m).push(g); }, box(x0, y0, z0, x1, y1, z1, m, col = true) { const g = new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0); g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2); this.add(g, m); if (col) cols.push({ min: [x0, y0, z0], max: [x1, y1, z1] }); } };
  const concrete = std('#9ea3a8'), asphalt = std('#3c3f44'), white = std('#f0f0f0'), yellow = std('#ffd54f'), grass = std('#6fae5a');
  const pl = (x0, z0, x1, z1, y, m) => { const g = new THREE.PlaneGeometry(x1 - x0, z1 - z0); g.rotateX(-Math.PI / 2); g.translate((x0 + x1) / 2, y, (z0 + z1) / 2); B.add(g, m); };
  pl(A.x0, A.z0, A.x1, A.z1, 0.004, grass);
  pl(RUNWAY.x0, RUNWAY.z0, RUNWAY.x1, RUNWAY.z1, 0.02, asphalt);
  for (let x = RUNWAY.x0 + 60; x < RUNWAY.x1 - 60; x += 30) B.box(x, 0.021, -58, x + 15, 0.03, -57, white, false);
  [RUNWAY.x0 + 8, RUNWAY.x1 - 38].forEach(x => { for (let z = RUNWAY.z0 + 3; z < RUNWAY.z1 - 3; z += 3.5) B.box(x, 0.021, z, x + 30, 0.03, z + 1.8, white, false); });
  PAVED.slice(1).forEach(r => pl(r.x0, r.z0, r.x1, r.z1, 0.018, concrete));
  for (let x = 2000; x < 3000; x += 20) B.box(x, 0.019, -5.5, x + 10, 0.025, -4.5, yellow, false);
  // 跑道燈
  const lamp = new THREE.MeshBasicMaterial({ color: '#ffe082' });
  for (let x = RUNWAY.x0; x <= RUNWAY.x1; x += 30) [RUNWAY.z0 - 1, RUNWAY.z1 + 1].forEach(z => B.box(x - 0.2, 0, z - 0.2, x + 0.2, 0.4, z + 0.2, lamp, false));
  // 跑道號碼
  const n1 = new THREE.PlaneGeometry(20, 10); n1.rotateX(-Math.PI / 2); n1.rotateY(-Math.PI / 2); n1.translate(RUNWAY.x0 + 55, 0.031, -57.5); B.add(n1, signMat('09', '#3c3f44', '#fff', 'bold 100px sans-serif'));
  const n2 = new THREE.PlaneGeometry(20, 10); n2.rotateX(-Math.PI / 2); n2.rotateY(Math.PI / 2); n2.translate(RUNWAY.x1 - 55, 0.031, -57.5); B.add(n2, signMat('27', '#3c3f44', '#fff', 'bold 100px sans-serif'));

  // ===== 客運大樓（入面：check-in 櫃位、航班顯示屏、安檢、候機座位、免稅店、行李帶）=====
  const tx0 = 2150, tx1 = 2650, tz0 = 210, tz1 = 290, H = 18;
  const wall = std('#dfe4ea'), roofM = std('#90a4ae', { metalness: 0.4 });
  B.box(tx0, 0, tz1 - 0.5, tx0 + 245, 10, tz1, wall); B.box(tx0 + 255, 0, tz1 - 0.5, tx1, 10, tz1, wall); B.box(tx0 + 245, 4, tz1 - 0.5, tx0 + 255, 10, tz1, wall);   // 陸側（入口）
  B.box(tx0, 0, tz0, tx0 + 0.5, 10, tz1, wall); B.box(tx1 - 0.5, 0, tz0, tx1, 10, tz1, wall);
  B.box(tx0, 0, tz0, tx1, 10, tz0 + 0.3, IM.glass);                                             // 向停機坪：成幅玻璃
  for (let x = tx0; x <= tx1; x += 10) B.box(x - 0.2, 0, tz0, x + 0.2, 10, tz0 + 0.4, roofM, false);
  B.box(tx0 - 4, 10, tz0 - 6, tx1 + 4, 11, tz1 + 6, roofM);                                       // 大屋頂
  const ceil = new THREE.PlaneGeometry(tx1 - tx0, tz1 - tz0); ceil.rotateX(Math.PI / 2); ceil.translate((tx0 + tx1) / 2, 9.98, (tz0 + tz1) / 2); B.add(ceil, IM.ceiling);
  pl(tx0, tz0, tx1, tz1, 0.02, IM.marble);
  for (let x = tx0 + 10; x < tx1; x += 20) for (let z = tz0 + 10; z < tz1; z += 20) B.box(x - 0.6, 9.9, z - 0.6, x + 0.6, 9.95, z + 0.6, IM.light, false);
  sign(B, tx0 + 250, 13.5, tz1 + 6.1, 60, 5, signMat('✈ 國際機場 INTERNATIONAL AIRPORT', '#0d47a1'));
  sign(B, (tx0 + tx1) / 2, 8.5, tz0 - 0.1, 50, 3.4, signMat('✈ 國際機場', '#0d47a1'), '-z');
  // Check-in 櫃位（3 行）
  ['A', 'B', 'C'].forEach((L, k) => {
    const cx = tx0 + 120 + k * 60;
    for (let i = 0; i < 6; i++) { const x = cx - 15 + i * 6; B.box(x - 2.2, 0, 268, x + 2.2, 1.05, 269.2, IM.marble); B.box(x - 0.3, 1.05, 268.2, x + 0.3, 1.45, 268.25, IM.screen, false); B.box(x + 2.25, 0, 267, x + 3.2, 0.5, 269.5, IM.black); }
    B.box(cx - 18, 0, 270, cx + 18, 3.6, 270.6, std('#1565c0'));
    sign(B, cx, 3.0, 269.95, 10, 1.2, signMat(`Check-in ${L} 行`, '#0d47a1'), '-z');
    for (let i = 0; i < 5; i++) for (const z of [258, 262]) B.box(cx - 15 + i * 7 - 0.05, 0, z - 0.05, cx - 15 + i * 7 + 0.05, 1.0, z + 0.05, IM.steel, false);
  });
  // 航班顯示屏
  sign(B, tx0 + 60, 5.5, 270.5, 16, 6, signMat('出發 DEPARTURES  CX520 東京 09:30 準時｜NH860 大阪 10:15｜SQ877 新加坡 11:00 登機', '#0b1f3a', '#ffd54f', 'bold 22px monospace'), '-z');
  // 安檢
  for (let i = 0; i < 4; i++) { const x = tx0 + 330 + i * 8; B.box(x - 0.2, 0, 245, x + 0.2, 2.4, 247, IM.steel); B.box(x + 1.8, 0, 245, x + 2.2, 2.4, 247, IM.steel); B.box(x - 0.2, 2.2, 245, x + 2.2, 2.4, 247, IM.steel, false); B.box(x + 3, 0, 243, x + 4, 1.0, 249, IM.black); }
  sign(B, tx0 + 342, 4, 247.1, 14, 1.2, signMat('保安檢查 SECURITY', '#37474f'));
  // 候機座位
  for (let r = 0; r < 4; r++) for (let i = 0; i < 12; i++) { const x = tx0 + 20 + i * 1.6, z = 225 + r * 4; B.box(x - 0.7, 0, z - 0.3, x + 0.7, 0.45, z + 0.3, std('#1e88e5')); B.box(x - 0.7, 0.45, z + 0.2, x + 0.7, 0.9, z + 0.3, std('#1e88e5'), false); }
  sign(B, tx0 + 30, 4, tz0 + 0.4, 12, 1.4, signMat('登機閘口 GATE 1–3', '#ff6f00'), '+z');
  // 免稅店
  B.box(tx0 + 410, 0, 220, tx0 + 470, 4, 220.3, IM.glass, false);
  for (let i = 0; i < 6; i++) { const x = tx0 + 415 + i * 9; B.box(x, 0, 225, x + 1.2, 1.8, 240, IM.white); for (let k = 0; k < 20; k++) B.box(x - 0.05, 0.3 + (k % 4) * 0.4, 225.5 + Math.floor(k / 4) * 3, x + 1.25, 0.6 + (k % 4) * 0.4, 227 + Math.floor(k / 4) * 3, [IM.red, std('#fdd835'), std('#8e24aa'), IM.green][k % 4], false); }
  sign(B, tx0 + 440, 4.6, 220, 18, 1.6, signMat('免稅店 DUTY FREE', '#6a1b9a'), '-z');
  // 行李帶
  [tx0 + 200, tx0 + 230].forEach(x => { B.box(x, 0, 225, x + 4, 0.7, 250, IM.black); B.box(x + 0.4, 0.7, 225.4, x + 3.6, 0.75, 249.6, std('#555'), false); });
  sign(B, tx0 + 217, 3.5, 252, 14, 1.2, signMat('行李提取 BAGGAGE', '#37474f'));
  plant(B, tx0 + 250, 280, 1.6); plant(B, tx0 + 100, 280, 1.6); plant(B, tx0 + 400, 280, 1.6);
  // 登機橋
  for (let k = 0; k < 3; k++) { const x = tx0 + 120 + k * 120; B.box(x - 2, 4, 170, x + 2, 7.5, tz0, std('#b0bec5', { metalness: 0.4 })); B.box(x - 1, 0, 172, x + 1, 4, 174, std('#78909c')); }

  // ===== 控制塔（地下入得：雷達控制台）=====
  const ctx = 2760, ctz = 240;
  const tw = new THREE.CylinderGeometry(6, 7, 40, 20, 1, true); tw.translate(ctx, 20, ctz); B.add(tw, std('#eceff1', { side: THREE.DoubleSide }));
  for (let k = 0; k < 20; k++) { const a = k / 20 * Math.PI * 2; if (Math.abs(a - Math.PI / 2) < 0.3) continue; const x = ctx + Math.cos(a) * 6.5, z = ctz + Math.sin(a) * 6.5; cols.push({ min: [x - 1, 0, z - 1], max: [x + 1, 40, z + 1] }); }
  const cab = new THREE.CylinderGeometry(10, 8, 6, 20); cab.translate(ctx, 43, ctz); B.add(cab, new THREE.MeshStandardMaterial({ color: '#4fc3f7', transparent: true, opacity: 0.6 }));
  const cr = new THREE.CylinderGeometry(10.5, 10.5, 1, 20); cr.translate(ctx, 46.5, ctz); B.add(cr, std('#37474f'));
  const ce = new THREE.PlaneGeometry(12, 12); ce.rotateX(Math.PI / 2); ce.translate(ctx, 3.5, ctz); B.add(ce, IM.ceiling);
  for (let k = 0; k < 3; k++) { const a = -0.8 + k * 0.8; B.box(ctx + Math.cos(a) * 4 - 0.8, 0, ctz - Math.sin(a) * 4 - 0.4, ctx + Math.cos(a) * 4 + 0.8, 1.0, ctz - Math.sin(a) * 4 + 0.4, IM.dark); B.box(ctx + Math.cos(a) * 4 - 0.6, 1.0, ctz - Math.sin(a) * 4 - 0.1, ctx + Math.cos(a) * 4 + 0.6, 1.6, ctz - Math.sin(a) * 4, IM.screen, false); }
  sign(B, ctx, 5, ctz + 7.1, 10, 1.4, signMat('控制塔 CONTROL TOWER', '#263238'));
  // ===== 機庫（入面有飛機、工具枱）=====
  [[2840, 100], [2950, 100]].forEach(([hx, hz]) => {
    const hg = new THREE.CylinderGeometry(22, 22, 50, 24, 1, true, -Math.PI / 2, Math.PI); hg.rotateX(Math.PI / 2); hg.rotateZ(Math.PI / 2); hg.scale(1, 0.75, 1); hg.translate(hx, 0, hz + 15);
    B.add(hg, std('#b0bec5', { metalness: 0.5, side: THREE.DoubleSide }));
    cols.push({ min: [hx - 23, 0, hz - 10], max: [hx - 21, 16, hz + 40] }, { min: [hx + 21, 0, hz - 10], max: [hx + 23, 16, hz + 40] }, { min: [hx - 23, 0, hz + 39], max: [hx + 23, 16, hz + 41] });
    pl(hx - 21, hz - 10, hx + 21, hz + 40, 0.025, concrete);
    B.box(hx + 12, 0, hz + 30, hx + 19, 0.9, hz + 32, IM.wood); B.box(hx + 13, 0.9, hz + 30.5, hx + 14, 1.2, hz + 31, IM.red, false); B.box(hx + 16, 0.9, hz + 30.5, hx + 17.5, 1.1, hz + 31.5, IM.steel, false);
    for (let k = 0; k < 4; k++) B.box(hx - 18, 0, hz + 25 + k * 2.2, hx - 16.8, 1.2, hz + 26.2 + k * 2.2, std('#ff7043'));
    sign(B, hx, 14, hz - 10.2, 16, 2, signMat(`機庫 HANGAR ${hx > 2900 ? 2 : 1}`, '#37474f'), '-z');
  });
  // 管道燈 + 風向袋
  B.box(2100, 0, -100, 2100.3, 6, -99.7, IM.steel); const ws = new THREE.ConeGeometry(0.6, 3, 10, 1, true); ws.rotateZ(Math.PI / 2); ws.translate(2101.5, 5.8, -99.8); B.add(ws, std('#ff6f00', { side: THREE.DoubleSide }));
  for (const [m, list] of parts) { const mesh = new THREE.Mesh(mergeGeometries(list, false), m); mesh.receiveShadow = true; root.add(mesh); }

  // 泊住嘅客機
  [['#c62828', 2270], ['#1565c0', 2390], ['#2e7d32', 2510]].forEach(([c, x]) => { const p = airliner(c); p.position.set(x, 0, 150); p.rotation.y = Math.PI; root.add(p); cols.push({ min: [x - 3, 0, 130], max: [x + 3, 7, 170] }); });
  const hangarPlane = buildPlane('#ff9800'); hangarPlane.position.set(2840, 0, 125); root.add(hangarPlane);
  const hangarHeli = buildHeli('#c62828'); hangarHeli.position.set(2950, 0, 125); root.add(hangarHeli);

  // 玩家飛機位（撳就有自己一架）
  const spots = [];
  [['plane', 2200, 80, '#e53935'], ['plane', 2230, 80, '#fdd835'], ['plane', 2260, 80, '#43a047'], ['heli', 2470, 150, '#1565c0'], ['heli', 2560, 150, '#6a1b9a']].forEach(([kind, x, z, c]) => {
    const m = kind === 'plane' ? buildPlane(c) : buildHeli(c); m.position.set(x, 0, z); m.rotation.y = kind === 'plane' ? Math.PI : 0; root.add(m);
    if (kind === 'heli') { const h = new THREE.Mesh(new THREE.CircleGeometry(8, 30), signMat('H', '#2b2f36', '#ffd54f', 'bold 90px sans-serif')); h.rotation.x = -Math.PI / 2; h.position.set(x, 0.03, z); root.add(h); }
    spots.push({ kind, x, z, color: c, model: m });
    inter.push({ pos: new V3(x + (kind === 'plane' ? 4 : 3), 0, z), r: 4, label: () => kind === 'plane' ? '✈ 揸小型飛機' : '🚁 揸直升機', act: () => api.startFlight(kind, x, z, m.rotation.y, c) });
  });
  const sg = new THREE.Mesh(new THREE.PlaneGeometry(26, 3), signMat('✈ 自助租飛機：行埋去撳「揸」', '#0d47a1')); sg.position.set(2330, 4, 60); root.add(sg);

  function update(p) {
    const near = p.x > A.x0 - 1500 && p.x < A.x1 + 1500 && p.z > A.z0 - 1500 && p.z < A.z1 + 1500;
    root.visible = near || p.y > 300;
  }
  return { colliders: cols, interactables: inter, update, spawn: new V3(2400, 0.1, 300) };
}

// ======================================================================
// 飛行（簡化街機手感）
export class Flight {
  constructor(kind, x, z, yaw) {
    this.kind = kind; this.pos = new V3(x, 0, z); this.yaw = yaw; this.pitch = 0; this.roll = 0; this.speed = 0; this.vy = 0; this.throttle = 0;
    this.vel = new V3(); this.ground = true; this.spin = 0; this.groundY = 0;
  }
  // inp: { x, y (搖桿)、up、down、camYaw }；返回 'crash' / 'blocked' / null
  step(dt, inp, hit) {
    const p = this.pos;
    let ev = null;
    if (this.kind === 'plane') {
      this.throttle = Math.max(0, Math.min(1, this.throttle + ((inp.up ? 1 : 0) - (inp.down ? 1 : 0)) * 0.6 * dt));
      const target = this.throttle * 75;
      this.speed += Math.max(-6 * dt, Math.min(9 * dt, target - this.speed));
      if (this.ground) {
        this.speed *= this.throttle < 0.05 ? 1 - 0.8 * dt : 1;
        this.yaw -= inp.x * 0.8 * dt * Math.min(1, this.speed / 6);
        const pitchT = this.speed > 27 ? Math.max(0, -inp.y) * 0.35 : 0;
        this.pitch += (pitchT - this.pitch) * Math.min(1, dt * 3); this.roll *= 0.8;
      } else {
        const stall = this.speed < 22;
        const pitchT = stall ? -0.35 : -inp.y * 0.6;
        this.pitch += (pitchT - this.pitch) * Math.min(1, dt * 1.8);
        this.roll += (-inp.x * 0.75 - this.roll) * Math.min(1, dt * 2.5);
        this.yaw += this.roll * 0.9 * dt * Math.min(1, this.speed / 30);
      }
      const f = new V3(Math.sin(this.yaw), 0, Math.cos(this.yaw));
      this.vel.set(f.x * this.speed * Math.cos(this.pitch), this.speed * Math.sin(this.pitch) - (this.speed < 22 && !this.ground ? 8 : 0), f.z * this.speed * Math.cos(this.pitch));
      this.spin += (5 + this.throttle * 40) * dt;
    } else {
      // 直升機：搖桿 = 前後左右（跟鏡頭）、↑↓ = 升降
      const fx = -Math.sin(inp.camYaw), fz = -Math.cos(inp.camYaw), rx = Math.cos(inp.camYaw), rz = -Math.sin(inp.camYaw);
      const tx = (fx * inp.y + rx * inp.x) * 32, tz = (fz * inp.y + rz * inp.x) * 32, ty = ((inp.up ? 1 : 0) - (inp.down ? 1 : 0)) * 9;
      const k = Math.min(1, dt * 1.6);
      if (this.ground && ty <= 0) { this.vel.x *= 0.8; this.vel.z *= 0.8; this.vel.y = 0; }
      else { this.vel.x += (tx - this.vel.x) * k; this.vel.z += (tz - this.vel.z) * k; this.vel.y += (ty - this.vel.y) * Math.min(1, dt * 3); }
      const hs = Math.hypot(this.vel.x, this.vel.z);
      if (hs > 2) { let d = Math.atan2(this.vel.x, this.vel.z) - this.yaw; d = Math.atan2(Math.sin(d), Math.cos(d)); this.yaw += d * Math.min(1, dt * 2); }
      this.pitch = -Math.min(0.3, hs / 32 * 0.3); this.roll = 0;
      this.spin += (this.ground && ty <= 0 ? 8 : 30) * dt;
      this.speed = hs;
    }
    const next = p.clone().addScaledVector(this.vel, dt);
    // 撞嘢
    if (hit(next, this.ground)) {
      if (this.kind === 'plane' && (!this.ground || this.speed > 12)) return 'crash';
      this.vel.set(0, Math.max(0, this.vel.y), 0); this.speed = 0; return 'blocked';
    }
    // 地面 / 停機坪
    const floor = this.groundAt(next);
    if (next.y <= floor) {
      if (!this.ground) {
        const ok = canLand(next.x, next.z, this.kind === 'heli', floor);
        if (!ok) {
          if (this.kind === 'plane') return 'crash';
          next.y = floor + 2.5; this.vel.y = 0; ev = 'noland';
        } else if (this.kind === 'plane' && (this.vel.y < -9 || Math.abs(this.roll) > 0.5)) return 'crash';
        else { this.ground = true; next.y = floor; this.vel.y = 0; this.pitch = 0; this.roll = 0; }
      } else next.y = floor;
      if (this.ground && this.kind === 'plane' && this.speed > 0.5 && !canLand(next.x, next.z, false, floor)) { this.speed = 0; this.throttle = 0; return 'offroad'; }
    } else if (next.y > floor + 0.3) this.ground = false;
    if (next.y > 4000) { next.y = 4000; this.vel.y = Math.min(0, this.vel.y); }
    p.copy(next);
    return ev;
  }
  groundAt(p) {
    for (const h of HELIPADS) if (h[2] && Math.hypot(p.x - h[0], p.z - h[1]) < 9 && p.y > h[2] - 2) return h[2];
    return 0;
  }
}
