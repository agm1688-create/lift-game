// 城市河：長方形河道圍住一個小島，觀光船圍一圈睇城市景點（摩天輪、城市塔、燈塔、天際線、寶塔、音樂噴泉…）
// 南岸碼頭買船飛，揀坐船頭 / 中間 / 船尾；船上導遊用英文介紹景點（有中文字幕）
import * as THREE from 'three';
import { Batch, FAC, MAT, tree, planeGeo } from './city.js';
import { IM, signMat, sign } from './interiors.js';
import * as TX from './textures.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const V3 = THREE.Vector3;
const std = (c, e = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.6, ...e });
// 河道：外邊 / 小島
const O = { x0: -840, x1: 240, z0: -840, z1: -360 }, I = { x0: -800, x1: 200, z0: -800, z1: -400 };
export const PIER = { x: -60, z: -350 };
export const SEATS = [
  { k: 'front', n: '船頭', price: 68, z: 5.6, d: '最正！前面無遮擋，風景一覽無遺', en: 'the front' },
  { k: 'mid', n: '中間', price: 58, z: 0.4, d: '有上蓋，唔怕曬唔怕雨', en: 'the middle' },
  { k: 'back', n: '船尾', price: 48, z: -5.4, d: '睇住條水尾，最平', en: 'the back' },
];
// 船行嘅路線（逆時針：碼頭 → 西 → 北 → 東 → 返碼頭），轉角圓角
function buildPath() {
  const C = { x0: -820, x1: 220, z0: -820, z1: -380 }, r = 20, pts = [];
  const arc = (cx, cz, a0, a1) => { for (let k = 0; k <= 8; k++) { const a = a0 + (a1 - a0) * k / 8; pts.push(new V3(cx + Math.cos(a) * r, 0, cz + Math.sin(a) * r)); } };
  pts.push(new V3(PIER.x, 0, C.z1));
  arc(C.x0 + r, C.z1 - r, Math.PI / 2, Math.PI);           // 西南角
  arc(C.x0 + r, C.z0 + r, Math.PI, Math.PI * 1.5);         // 西北角
  arc(C.x1 - r, C.z0 + r, -Math.PI / 2, 0);                // 東北角
  arc(C.x1 - r, C.z1 - r, 0, Math.PI / 2);                 // 東南角
  pts.push(new V3(PIER.x, 0, C.z1));
  const cum = [0]; for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + pts[i].distanceTo(pts[i - 1]));
  return { pts, cum, L: cum[cum.length - 1] };
}
export const PATH = buildPath();
export function pathAt(s, out) {
  const { pts, cum, L } = PATH; s = ((s % L) + L) % L;
  let i = 1; while (i < cum.length - 1 && cum[i] < s) i++;
  const a = (s - cum[i - 1]) / Math.max(1e-6, cum[i] - cum[i - 1]);
  out.lerpVectors(pts[i - 1], pts[i], a);
  return Math.atan2(pts[i].x - pts[i - 1].x, pts[i].z - pts[i - 1].z);
}

// 觀光船（原創造型，船頭向 +z）
export function buildBoat(color = '#1565c0') {
  const g = new THREE.Group(), white = std('#fafafa'), blue = std(color), wood = std('#a1887f'), dark = std('#37474f');
  const add = (geo, m, x, y, z) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = true; g.add(o); return o; };
  add(new THREE.BoxGeometry(4.4, 1.5, 13), white, 0, 0.15, -0.8);
  const bow = new THREE.CylinderGeometry(0.01, 2.2, 3.8, 3, 1); bow.rotateX(Math.PI / 2); bow.rotateZ(Math.PI); bow.scale(1, 0.68, 1); add(bow, white, 0, 0.25, 7.6).rotation.z = Math.PI / 2;
  add(new THREE.BoxGeometry(4.45, 0.35, 13), blue, 0, -0.2, -0.8);
  add(new THREE.BoxGeometry(4.2, 0.1, 14.5), wood, 0, 0.92, 0);
  // 欄杆
  [-2.15, 2.15].forEach(x => { add(new THREE.BoxGeometry(0.06, 0.06, 13.5), std('#b0bec5', { metalness: 0.8 }), x, 1.75, -0.4); for (let z = -6.8; z <= 6; z += 1.6) add(new THREE.BoxGeometry(0.05, 0.8, 0.05), std('#b0bec5', { metalness: 0.8 }), x, 1.35, z); });
  // 中間上蓋
  [[-2, -3], [2, -3], [-2, 3], [2, 3]].forEach(([x, z]) => add(new THREE.CylinderGeometry(0.07, 0.07, 2.1, 8), dark, x, 2.0, z));
  add(new THREE.BoxGeometry(4.5, 0.18, 6.6), blue, 0, 3.1, 0);
  // 長凳（三區）
  for (const z of [5.6, 0.4, -5.4]) for (const x of [-1.1, 1.1]) { add(new THREE.BoxGeometry(1.5, 0.12, 0.6), std('#ff8f00'), x, 1.38, z); add(new THREE.BoxGeometry(1.5, 0.5, 0.08), std('#ff8f00'), x, 1.65, z - 0.32); }
  // 船名
  const lab = new THREE.Mesh(new THREE.PlaneGeometry(5, 0.55), new THREE.MeshBasicMaterial({ map: TX.signTex('🚢 城市河觀光船 RIVER CRUISE', color, '#fff', 1024, 112, 'bold 64px sans-serif'), side: THREE.DoubleSide }));
  lab.position.set(2.24, 0.45, -0.8); lab.rotation.y = Math.PI / 2; g.add(lab); const l2 = lab.clone(); l2.position.x = -2.24; l2.rotation.y = -Math.PI / 2; g.add(l2);
  add(new THREE.CylinderGeometry(0.04, 0.04, 2.4, 6), dark, 0, 2.1, -6.9);
  const flag = add(new THREE.PlaneGeometry(1.0, 0.6), new THREE.MeshStandardMaterial({ color: '#e53935', side: THREE.DoubleSide }), 0.5, 3.0, -6.9); flag.rotation.y = Math.PI / 2;
  g.userData = { seats: SEATS.map(s => new V3(1.1, 1.0, s.z)) };
  return g;
}

export function buildRiver(scene, api) {
  const B = new Batch(), inter = [];
  const pave = std('#aaa497', { map: TX.tileTex(1, 1, '#d9d4c7', '#bfb8a6') }), lawn = std('#5fae4f');
  const water = new THREE.MeshStandardMaterial({ color: '#2a8bc8', metalness: 0.4, roughness: 0.12, transparent: true, opacity: 0.92 });
  const rail = std('#455a64', { metalness: 0.6 }), stone = std('#cfc6b4'), white = std('#f5f5f5');
  // ---- 地面：岸邊行人道、小島草地、河 ----
  B.add(planeGeo(-900, -900, 300, O.z0, 0.02, 4), pave); B.add(planeGeo(-900, O.z1, 300, -300, 0.02, 4), pave);
  B.add(planeGeo(-900, O.z0, O.x0, O.z1, 0.02, 4), pave); B.add(planeGeo(O.x1, O.z0, 300, O.z1, 0.02, 4), pave);
  B.add(planeGeo(I.x0, I.z0, I.x1, I.z1, 0.025, 6), lawn);
  // 河 = 4 條長方形（唔好蓋住個島）
  const wParts = [[O.x0, O.z0, O.x1, I.z0], [O.x0, I.z1, O.x1, O.z1], [O.x0, I.z0, I.x0, I.z1], [I.x1, I.z0, O.x1, I.z1]].map(([x0, z0, x1, z1]) => { const g2 = new THREE.PlaneGeometry(x1 - x0, z1 - z0); g2.rotateX(-Math.PI / 2); g2.translate((x0 + x1) / 2, 0.05, (z0 + z1) / 2); return g2; });
  const waterMesh = new THREE.Mesh(mergeGeometries(wParts), water); scene.add(waterMesh);
  // 河堤石邊
  const edge = (x0, z0, x1, z1) => B.box(x0, 0, z0, x1, 0.35, z1, stone, false);
  edge(O.x0 - 1, O.z0 - 1, O.x1 + 1, O.z0); edge(O.x0 - 1, O.z1, O.x1 + 1, O.z1 + 1); edge(O.x0 - 1, O.z0, O.x0, O.z1); edge(O.x1, O.z0, O.x1 + 1, O.z1);
  edge(I.x0, I.z0, I.x1, I.z0 + 1); edge(I.x0, I.z1 - 1, I.x1, I.z1); edge(I.x0, I.z0, I.x0 + 1, I.z1); edge(I.x1 - 1, I.z0, I.x1, I.z1);
  // ---- 欄杆（唔俾人跌落河），留位畀橋同碼頭 ----
  const BR = [-320, -280];          // 橋（x 範圍）
  const PR = [PIER.x - 16, PIER.x + 16];
  function railX(x0, x1, z, gaps) {
    let segs = [[x0, x1]];
    for (const [a, b] of gaps) segs = segs.flatMap(([p, q]) => [[p, Math.min(q, a)], [Math.max(p, b), q]].filter(([u, v]) => v - u > 0.5));
    segs.forEach(([a, b]) => { B.box(a, 0, z - 0.1, b, 1.1, z + 0.1, rail); for (let x = a; x < b; x += 2.5) B.box(x - 0.04, 0, z - 0.04, x + 0.04, 1.1, z + 0.04, rail, false); });
  }
  const railZ = (z0, z1, x) => B.box(x - 0.1, 0, z0, x + 0.1, 1.1, z1, rail);
  railX(O.x0, O.x1, O.z0 - 0.5, [BR]); railX(O.x0, O.x1, O.z1 + 0.5, [BR, PR]); railZ(O.z0, O.z1, O.x0 - 0.5); railZ(O.z0, O.z1, O.x1 + 0.5);
  railX(I.x0, I.x1, I.z0 + 0.5, [BR]); railX(I.x0, I.x1, I.z1 - 0.5, [BR]); railZ(I.z0, I.z1, I.x0 + 0.5); railZ(I.z0, I.z1, I.x1 - 0.5);
  // ---- 兩條行人橋（南岸 → 小島 → 北岸），中間高，船喺下面過 ----
  function bridge(zA, zB) {   // zA < zB：河嘅兩邊
    const x0 = BR[0], x1 = BR[1], top = 4.6, n = 12, st = 0.38, dep = 0.85;
    B.box(x0, top - 0.4, zA, x1, top, zB, stone);
    for (let k = 0; k < n; k++) {
      const y = (k + 1) * st;
      B.box(x0, 0, zA - (n - k) * dep, x1, Math.min(y, top), zA - (n - k - 1) * dep, stone);
      B.box(x0, 0, zB + (n - k - 1) * dep, x1, Math.min(y, top), zB + (n - k) * dep, stone);
    }
    [x0, x1].forEach(x => B.box(x - 0.15, top, zA - 2, x + 0.15, top + 1.1, zB + 2, rail));
    // 拱形裝飾
    const arch = new THREE.TorusGeometry((zB - zA) / 2, 0.6, 8, 30, Math.PI); arch.rotateY(Math.PI / 2); arch.scale(1, 0.16, 1); arch.translate((x0 + x1) / 2, top - 0.6, (zA + zB) / 2); B.add(arch, white);
  }
  bridge(O.z1 - 40, O.z1); bridge(O.z0, O.z0 + 40);
  // ---- 碼頭 + 售票處 ----
  B.box(PR[0], 0, O.z1 - 12, PR[1], 0.4, O.z1 + 0.5, std('#8d6e63'));
  B.box(PR[0], 0.4, O.z1 - 12, PR[0] + 0.2, 1.5, O.z1, rail); B.box(PR[1] - 0.2, 0.4, O.z1 - 12, PR[1], 1.5, O.z1, rail); B.box(PR[0], 0.4, O.z1 - 12.2, PR[1], 1.5, O.z1 - 12, rail);
  const tb = { x: PIER.x + 22, z: -342 };
  B.box(tb.x - 3, 0, tb.z - 2, tb.x + 3, 3, tb.z + 2, std('#0277bd')); B.box(tb.x - 3.4, 3, tb.z - 2.4, tb.x + 3.4, 3.4, tb.z + 2.4, std('#ffca28'));
  sign(B, tb.x, 3.9, tb.z - 2.45, 6, 0.8, signMat('🎫 觀光船售票處 TICKETS', '#0277bd', '#fff'), '-z');
  sign(B, PIER.x, 3.2, O.z1 + 2, 10, 1.2, signMat('🚢 城市河觀光船碼頭 RIVER CRUISE PIER', '#01579b', '#ffeb3b'), '+z');
  B.box(PIER.x - 0.1, 0, O.z1 + 1.9, PIER.x + 0.1, 2.6, O.z1 + 2.1, rail, false);
  inter.push({ pos: new V3(tb.x, 0, tb.z - 3), r: 3.5, label: () => '🎫 買船飛：坐觀光船遊城市河', act: () => api.boatTicket() });
  inter.push({ pos: new V3(PIER.x, 0, O.z1 - 4), r: 6, label: () => '🚢 上觀光船（要先買飛）', act: () => api.boatTicket() });

  // ---- 南岸：鐘樓、矮樓、街燈 ----
  const ct = { x: -200, z: -335 };
  B.box(ct.x - 4, 0, ct.z - 4, ct.x + 4, 38, ct.z + 4, std('#c9784b')); B.box(ct.x - 4.6, 38, ct.z - 4.6, ct.x + 4.6, 39, ct.z + 4.6, stone, false);
  B.box(ct.x - 3, 39, ct.z - 3, ct.x + 3, 46, ct.z + 3, std('#c9784b'), false);
  const cone = new THREE.ConeGeometry(3.6, 8, 4); cone.rotateY(Math.PI / 4); cone.translate(ct.x, 50, ct.z); B.add(cone, std('#455a64'));
  const clockTex = TX.canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#fffde7'; g.beginPath(); g.arc(w / 2, h / 2, w / 2 - 6, 0, 7); g.fill(); g.strokeStyle = '#3e2723'; g.lineWidth = 10; g.stroke(); g.lineWidth = 12; g.beginPath(); g.moveTo(w / 2, h / 2); g.lineTo(w / 2, 50); g.moveTo(w / 2, h / 2); g.lineTo(w / 2 + 60, h / 2 + 20); g.stroke(); for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2; g.fillStyle = '#3e2723'; g.fillRect(w / 2 + Math.sin(a) * 100 - 5, h / 2 - Math.cos(a) * 100 - 5, 10, 10); } });
  const clockM = new THREE.MeshBasicMaterial({ map: clockTex, transparent: true });
  [[0, -4.05, Math.PI], [0, 4.05, 0], [4.05, 0, Math.PI / 2], [-4.05, 0, -Math.PI / 2]].forEach(([dx, dz, ry]) => { const c = new THREE.Mesh(new THREE.CircleGeometry(2.6, 30), clockM); c.position.set(ct.x + dx, 33, ct.z + dz); c.rotation.y = ry; scene.add(c); });
  for (let x = -880; x < 290; x += 40) { if (Math.abs(x - ct.x) < 10 || Math.abs(x - tb.x) < 8) continue; B.box(x - 0.1, 0, -355 - 0.1, x + 0.1, 4.5, -355 + 0.1, rail, false); B.box(x - 0.35, 4.5, -355 - 0.35, x + 0.35, 4.8, -355 + 0.35, IM.light, false); }
  for (let x = -880; x < 290; x += 70) { if (Math.abs(x - ct.x) < 20 || Math.abs(x - tb.x) < 16 || Math.abs(x - PIER.x) < 20 || Math.abs(x + 300) < 20) continue; const h = 10 + ((x * 7) % 9); B.box(x - 12, 0, -325, x + 12, h, -306, FAC[(Math.abs(x) / 70 | 0) % 2 + 1].m, true); }
  // ---- 北岸：摩天大廈天際線 ----
  const sky = [];
  for (let x = -880, k = 0; x < 280; x += 58, k++) {
    if (Math.abs(x + 300) < 22) continue;
    const h = [120, 180, 95, 240, 150, 300, 130, 200, 110, 170, 260, 140, 90, 210, 160, 120, 190, 100, 230, 130][k % 20];
    const w = 18 + (k % 3) * 6;
    B.box(x - w / 2, 0, -893, x + w / 2, h, -893 + w * 0.9, FAC[[0, 2, 0, 3, 2][k % 5]].m);
    B.box(x - w / 2 - 0.3, h, -893 - 0.3, x + w / 2 + 0.3, h + 1, -893 + w * 0.9 + 0.3, MAT.roof, false);
    if (h >= 200) { const sp = new THREE.CylinderGeometry(0.3, 1.2, 30, 8); sp.translate(x, h + 15, -893 + w * 0.45); B.add(sp, MAT.steel); sky.push(new V3(x, h + 30, -893 + w * 0.45)); }
  }
  sign(B, -300, 9, -841.5, 18, 2, signMat('🏙 天際線 CITY SKYLINE', '#263238', '#fff'), '+z');
  // ---- 西岸：燈塔 ----
  const lh = { x: -872, z: -600 };
  for (let k = 0; k < 7; k++) { const c = new THREE.CylinderGeometry(4 - k * 0.35, 4.2 - k * 0.35, 5, 20); c.translate(lh.x, 2.5 + k * 5, lh.z); B.add(c, k % 2 ? std('#e53935') : white); }
  B.cols.push({ min: [lh.x - 4.2, 0, lh.z - 4.2], max: [lh.x + 4.2, 35, lh.z + 4.2] });
  const lamp = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 1.8, 2.6, 16), new THREE.MeshStandardMaterial({ color: '#fff59d', emissive: '#ffeb3b', emissiveIntensity: 1.5 })); lamp.position.set(lh.x, 36.3, lh.z); scene.add(lamp);
  const beam = new THREE.Mesh(new THREE.ConeGeometry(6, 70, 16, 1, true), new THREE.MeshBasicMaterial({ color: '#fff9c4', transparent: true, opacity: 0.18, depthWrite: false, side: THREE.DoubleSide })); beam.geometry.translate(0, -35, 0); beam.geometry.rotateZ(Math.PI / 2);
  const beamG = new THREE.Group(); beamG.position.set(lh.x, 36.3, lh.z); beamG.add(beam); scene.add(beamG);
  const roofC = new THREE.ConeGeometry(2.4, 3, 16); roofC.translate(lh.x, 39.1, lh.z); B.add(roofC, std('#263238'));
  // ---- 小島：摩天輪、城市塔、科學館、寶塔、樹 ----
  const fw = { x: -650, z: -600, r: 34, h: 40 };
  [-4.5, 4.5].forEach(dx => { [-1, 1].forEach(s => { const leg = new THREE.CylinderGeometry(0.6, 0.9, fw.h * 1.15, 8); leg.rotateX(-s * 0.42); leg.translate(fw.x + dx, fw.h / 2, fw.z + s * 8); B.add(leg, white); }); });
  const axle = new THREE.CylinderGeometry(1.2, 1.2, 10, 12); axle.rotateZ(Math.PI / 2); axle.translate(fw.x, fw.h, fw.z); B.add(axle, white);
  B.cols.push({ min: [fw.x - 5.5, 0, fw.z - 19], max: [fw.x + 5.5, 4, fw.z + 19] });
  const wheel = new THREE.Group(); wheel.position.set(fw.x, fw.h, fw.z); scene.add(wheel);
  const rimM = std('#eceff1', { metalness: 0.6 }), cabM = ['#e53935', '#fdd835', '#43a047', '#1e88e5', '#8e24aa', '#ff7043'].map(c => std(c));
  [-2.5, 2.5].forEach(x => { const rim = new THREE.Mesh(new THREE.TorusGeometry(fw.r, 0.5, 8, 64), rimM); rim.rotation.y = Math.PI / 2; rim.position.x = x; wheel.add(rim); });
  for (let k = 0; k < 16; k++) { const sp = new THREE.Mesh(new THREE.BoxGeometry(0.3, fw.r * 2, 0.3), rimM); sp.rotation.x = k / 16 * Math.PI; wheel.add(sp); }
  const cabins = [];
  for (let k = 0; k < 24; k++) { const a = k / 24 * Math.PI * 2, c = new THREE.Mesh(new THREE.BoxGeometry(3, 2.6, 2.6), cabM[k % cabM.length]); c.userData.a = a; wheel.add(c); cabins.push(c); }
  const tw = { x: -300, z: -600 };
  const shaft = new THREE.CylinderGeometry(3.2, 6, 180, 16); shaft.translate(tw.x, 90, tw.z); B.add(shaft, std('#eceff1'));
  B.cols.push({ min: [tw.x - 6, 0, tw.z - 6], max: [tw.x + 6, 180, tw.z + 6] });
  const pod = new THREE.SphereGeometry(13, 24, 16); pod.scale(1, 0.6, 1); pod.translate(tw.x, 142, tw.z); B.add(pod, std('#90caf9', { metalness: 0.7, roughness: 0.15 }));
  const ant = new THREE.CylinderGeometry(0.3, 1, 40, 8); ant.translate(tw.x, 200, tw.z); B.add(ant, MAT.steel);
  const towerTop = new THREE.Mesh(new THREE.SphereGeometry(1.2, 10, 8), new THREE.MeshBasicMaterial({ color: '#ff1744' })); towerTop.position.set(tw.x, 221, tw.z); scene.add(towerTop);
  sign(B, tw.x, 6, tw.z + 6.05, 9, 1.2, signMat('🗼 城市塔 CITY TOWER 180m', '#0d47a1', '#fff'), '+z');
  const dm = { x: -80, z: -650 };
  B.box(dm.x - 26, 0, dm.z - 26, dm.x + 26, 8, dm.z + 26, std('#eeeeee'));
  const dome = new THREE.SphereGeometry(24, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2); dome.translate(dm.x, 8, dm.z); B.add(dome, std('#b0bec5', { metalness: 0.6, roughness: 0.25 }));
  sign(B, dm.x, 6, dm.z + 26.1, 14, 1.4, signMat('🔭 科學館 SCIENCE MUSEUM', '#4a148c', '#fff'), '+z');
  const pg = { x: 100, z: -600 };
  for (let k = 0; k < 7; k++) { const w = 12 - k * 1.3, y = k * 5; B.box(pg.x - w / 2, y, pg.z - w / 2, pg.x + w / 2, y + 4, pg.z + w / 2, std('#b71c1c'), k === 0); const rf = new THREE.ConeGeometry(w * 0.85, 1.6, 4); rf.rotateY(Math.PI / 4); rf.translate(pg.x, y + 4.8, pg.z); B.add(rf, std('#1b5e20')); }
  const spire = new THREE.ConeGeometry(0.8, 6, 8); spire.translate(pg.x, 38, pg.z); B.add(spire, IM.gold);
  for (let k = 0; k < 80; k++) { const x = I.x0 + 12 + ((k * 137) % 976), z = I.z0 + 12 + ((k * 89) % 376); if ([fw, tw, dm, pg].some(l => Math.hypot(x - l.x, z - l.z) < 32) || Math.abs(x + 300) < 12) continue; tree(B, x, z, 1 + (k % 4) * 0.15, k % 5 === 0); }
  // ---- 東邊：音樂噴泉（喺河入面）----
  const ft = { x: O.x1 - 20, z: -600 };
  const jets = [];
  const jetM = new THREE.MeshBasicMaterial({ color: '#e1f5fe', transparent: true, opacity: 0.55, depthWrite: false });
  for (let k = 0; k < 24; k++) { const j = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.6, 1, 8), jetM); j.position.set(k % 2 ? O.x1 - 4 : I.x1 + 4, 0, -710 + (k >> 1) * 20); j.userData.k = k >> 1; scene.add(j); jets.push(j); }
  const g = B.build(); scene.add(g);

  // ---- 背景觀光船（一直圍住條河行，所有玩家見到一樣）----
  const bgBoat = buildBoat('#00897b'); scene.add(bgBoat);
  const LANDMARKS = [
    { p: new V3(ct.x, 0, ct.z), en: 'On your left is the old clock tower. It is more than one hundred years old.', zh: '左邊係舊鐘樓，有超過一百年歷史。' },
    { p: new V3(fw.x, 0, I.z1), en: 'Look to your right! That is the big Ferris wheel. It goes round and round slowly.', zh: '望右邊！嗰個係大摩天輪，會慢慢轉一圈又一圈。' },
    { p: new V3(-300, 0, O.z1 - 20), en: 'We are going under the bridge. Wave to the people on the bridge!', zh: '我哋而家喺橋底經過，同橋上面嘅人揮揮手！' },
    { p: new V3(O.x0, 0, -600), en: 'On your left is the lighthouse. It helps ships find their way at night.', zh: '左邊係燈塔，夜晚幫啲船搵路。' },
    { p: new V3(-560, 0, O.z0), en: 'Look at the tall buildings on your left. This is the city skyline!', zh: '睇下左邊啲高樓大廈，呢個就係城市天際線！' },
    { p: new V3(tw.x, 0, I.z0), en: 'On your right is the City Tower. It is one hundred and eighty metres tall.', zh: '右邊係城市塔，有一百八十米高。' },
    { p: new V3(pg.x, 0, I.z0), en: 'That is a pagoda. It has seven floors and a golden top.', zh: '嗰座係寶塔，有七層，頂部係金色。' },
    { p: new V3(ft.x, 0, -640), en: 'Look! The music fountain is dancing in the river.', zh: '睇吓！音樂噴泉喺河入面跳緊舞。' },
    { p: new V3(dm.x, 0, I.z1), en: 'On your right is the science museum. It has a big round dome.', zh: '右邊係科學館，有個大圓頂。' },
  ];

  // ---- 玩家坐船 ----
  let ride = null;
  const tmp = new V3(), tmpS = new V3();
  function startRide(seatIdx) {
    const m = buildBoat('#1565c0'); scene.add(m);
    ride = { m, seat: seatIdx, s: 0, t: 0, said: new Set(), speed: 0 };
    const y = pathAt(0, m.position); m.rotation.y = y;
    return ride;
  }
  function step(dt) {
    const R = ride; if (!R) return null;
    R.t += dt;
    const left = PATH.L - R.s;
    const vmax = 13, target = left < 60 ? Math.max(1.5, left * 0.2) : vmax;
    R.speed += Math.max(-3 * dt, Math.min(2 * dt, target - R.speed));
    R.s = Math.min(PATH.L, R.s + R.speed * dt);
    const yaw = pathAt(R.s, tmp); R.m.position.set(tmp.x, Math.sin(R.t * 1.3) * 0.08, tmp.z);
    let d = yaw - R.m.rotation.y; d = Math.atan2(Math.sin(d), Math.cos(d)); R.m.rotation.y += d * Math.min(1, dt * 2.5);
    R.m.rotation.z = Math.sin(R.t * 0.9) * 0.015;
    R.m.updateMatrixWorld(true);
    tmpS.copy(R.m.userData.seats[R.seat]).applyMatrix4(R.m.matrixWorld);
    // 導遊介紹景點
    LANDMARKS.forEach((L, i) => { if (!R.said.has(i) && Math.hypot(L.p.x - tmp.x, L.p.z - tmp.z) < 70) { R.said.add(i); api.say(L.en, L.zh, { force: true, gap: 0 }); } });
    return { pos: tmpS, yaw: R.m.rotation.y, done: R.s >= PATH.L - 0.5, frac: R.s / PATH.L };
  }
  function endRide() { if (!ride) return; scene.remove(ride.m); ride = null; }

  function update(dt, t, p) {
    const near = p.x > -2200 && p.x < 1600 && p.z > -2200 && p.z < 1000;
    g.visible = waterMesh.visible = wheel.visible = beamG.visible = bgBoat.visible = near || p.y > 200;
    if (!near) return;
    wheel.rotation.x = t / 1000 * 0.05;
    cabins.forEach(c => { c.rotation.x = -wheel.rotation.x; });
    beamG.rotation.y = t / 1000 * 1.2;
    const ts = t / 1000;
    jets.forEach(j => { const h = 4 + 10 * Math.abs(Math.sin(ts * 1.6 + j.userData.k * 0.7)); j.scale.y = h; j.position.y = h / 2; });
    // 背景船：同玩家隔開半個圈
    const s = (ts * 11) % PATH.L, yaw = pathAt(s, tmp); bgBoat.position.set(tmp.x, Math.sin(ts) * 0.08, tmp.z); bgBoat.rotation.y = yaw;
    towerTop.visible = Math.floor(ts * 2) % 2 === 0;
  }
  return { colliders: B.cols, interactables: inter, update, startRide, step, endRide, riding: () => !!ride, pier: new V3(PIER.x, 0.1, PIER.z + 4) };
}
