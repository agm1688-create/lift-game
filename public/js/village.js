// 豪景花園（香港青龍頭）— 按 OpenStreetMap 真實平面砌：每座樓嘅十字形外形、位置、層數、
// A–D 停車場（天台有球場 / 泳池 / 遊樂場）、商場、屯門公路（高架）、青山公路、海邊。
// 地勢簡化咗做平地（真實屋苑係由海邊沿山坡向上）。資料：© OpenStreetMap contributors（ODbL）
import * as THREE from 'three';
import { Batch, FAC, MAT, VILLAGE, tree } from './city.js';
import { IM, signMat, sign, shell, storeInterior, plant } from './interiors.js';
import { HKG } from './hkg_data.js';

const V3 = THREE.Vector3;
const std = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.8, ...extra });
const V = VILLAGE;
export const OX = (V.x0 + V.x1) / 2, OZ = (V.z0 + V.z1) / 2;   // 真實座標 (0,0) 擺喺呢度
const RX = (V.x1 - V.x0) / 2, RZ = (V.z1 - V.z0) / 2;

const toPts = flat => { const p = []; for (let i = 0; i < flat.length; i += 2) p.push([flat[i] + OX, flat[i + 1] + OZ]); return p; };
const bbox = p => { const xs = p.map(q => q[0]), zs = p.map(q => q[1]); return { x0: Math.min(...xs), z0: Math.min(...zs), x1: Math.max(...xs), z1: Math.max(...zs) }; };
const centroid = p => [p.reduce((s, q) => s + q[0], 0) / p.length, p.reduce((s, q) => s + q[1], 0) / p.length];
function inPoly(x, z, p) {
  let c = false;
  for (let i = 0, j = p.length - 1; i < p.length; j = i++) if ((p[i][1] > z) !== (p[j][1] > z) && x < (p[j][0] - p[i][0]) * (z - p[i][1]) / (p[j][1] - p[i][1]) + p[i][0]) c = !c;
  return c;
}

export function buildVillage(scene, api = {}) {
  const B = new Batch(), inter = [];
  const towerMats = ['#f6efe2', '#ffffff', '#e9eef4', '#f3e6cf'].map(c => std(c, { map: FAC[3].m.map }));
  const road = MAT.road, pave = MAT.pave, water = MAT.water, sand = MAT.sand, conc = std('#b0aca4'), roofM = std('#9e9e9e'), under = std('#d8d4cc');
  const blueC = std('#2f6db5'), redC = std('#c0392b'), pool = std('#4fc3f7', { roughness: 0.1, metalness: 0.2 }), play = std('#ffb74d'), garden = std('#6dab4f');

  // ---------- 幾何小工具 ----------
  // 多邊形外牆（每條邊一幅牆，法線向外）
  function walls(p, y0, y1, m, uw = 4, uh = 3.5) {
    const h = y1 - y0;
    for (let i = 0; i < p.length; i++) {
      const a = p[i], b = p[(i + 1) % p.length], dx = b[0] - a[0], dz = b[1] - a[1], len = Math.hypot(dx, dz);
      if (len < 0.05) continue;
      let nx = dz / len, nz = -dx / len;
      const mx = (a[0] + b[0]) / 2, mz = (a[1] + b[1]) / 2;
      if (inPoly(mx + nx * 0.2, mz + nz * 0.2, p)) { nx = -nx; nz = -nz; }
      const g = new THREE.PlaneGeometry(len, h), uv = g.attributes.uv;
      for (let k = 0; k < uv.count; k++) uv.setXY(k, uv.getX(k) * len / uw, uv.getY(k) * h / uh);
      g.rotateY(Math.atan2(nx, nz)); g.translate(mx, y0 + h / 2, mz); B.add(g, m);
    }
  }
  // 平頂 / 天花（down = 向下望見）
  function cap(p, y, m, down = false, s = 8) {
    const sh = new THREE.Shape(p.map(([x, z]) => new THREE.Vector2(x, down ? z : -z)));
    const g = new THREE.ShapeGeometry(sh), uv = g.attributes.uv;
    for (let k = 0; k < uv.count; k++) uv.setXY(k, uv.getX(k) / s, uv.getY(k) / s);
    g.rotateX(down ? Math.PI / 2 : -Math.PI / 2); g.translate(0, y, 0); B.add(g, m);
  }
  function seg(x0, z0, x1, z1, w, y, m = road) {
    const len = Math.hypot(x1 - x0, z1 - z0); if (len < 0.05) return;
    const g = new THREE.PlaneGeometry(len + (m === road ? w * 0.5 : 0), w); g.rotateX(-Math.PI / 2);
    const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setX(i, uv.getX(i) * len / 12);
    g.rotateY(-Math.atan2(z1 - z0, x1 - x0)); g.translate((x0 + x1) / 2, y, (z0 + z1) / 2); B.add(g, m);
  }
  const inRect = (x, z, m = 0) => x > V.x0 + m && x < V.x1 - m && z > V.z0 + m && z < V.z1 - m;
  const clampX = x => Math.max(V.x0, Math.min(V.x1, x)), clampZ = z => Math.max(V.z0, Math.min(V.z1, z));

  // ---------- 馬路資料 ----------
  const roads = HKG.r.map(([type, w, name, flat]) => ({ type, w, name, p: toPts(flat) }));
  const segs = [];   // 用嚟避開種樹
  // 一條路 → 「x 對應 z」嘅插值（青山公路 / 屯門公路）
  function lineOf(test) {
    const pts = roads.filter(test).flatMap(r => r.p).sort((a, b) => a[0] - b[0]);
    return x => {
      if (x <= pts[0][0]) return pts[0][1];
      for (let i = 1; i < pts.length; i++) if (x <= pts[i][0]) { const a = pts[i - 1], b = pts[i], t = (x - a[0]) / Math.max(0.01, b[0] - a[0]); return a[1] + (b[1] - a[1]) * t; }
      return pts[pts.length - 1][1];
    };
  }
  const cprZ = lineOf(r => r.type === 'primary' && r.name.includes('青山公路'));
  const tmrZ = lineOf(r => r.type === 'motorway');

  // ===== 地面 + 海 + 沙灘 + 海堤 =====
  const land = [[V.x0, V.z0], [V.x1, V.z0], [V.x1, V.z1], [V.x0, V.z1]];
  cap(land, 0.008, std('#8fbf6a'), false, 6);
  const shore = [];
  for (let x = V.x0; x <= V.x1 + 0.1; x += 10) shore.push([x, clampZ(cprZ(x) + 16)]);
  cap([...shore, [V.x1, V.z1], [V.x0, V.z1]], 0.05, water, false, 20);
  const beach = [];
  for (let x = V.x0; x <= V.x1 + 0.1; x += 10) beach.push([x, clampZ(cprZ(x) + 9)]);
  cap([...beach, ...shore.slice().reverse()], 0.04, sand, false, 4);
  for (let i = 1; i < beach.length; i++) { const a = beach[i - 1], b = beach[i]; seg(a[0], a[1] - 0.6, b[0], b[1] - 0.6, 1.2, 0.045, conc); }
  // 碼頭
  const pX = OX + 150, pZ = cprZ(pX) + 14;
  B.box(pX - 4, 0, pZ, pX + 4, 0.4, pZ + 70, IM.wood); B.box(pX - 8, 0.4, pZ + 58, pX + 8, 4.4, pZ + 70, std('#2e7d32'), false); B.box(pX - 8, 4.4, pZ + 56, pX + 8, 4.8, pZ + 72, std('#1b5e20'), false);
  sign(B, pX, 5.6, pZ + 71, 12, 1.6, signMat('青龍頭碼頭 PIER', '#1b5e20'));
  B.cols.push({ min: [pX - 5, 0, pZ], max: [pX - 4, 1.2, pZ + 70] }, { min: [pX + 4, 0, pZ], max: [pX + 5, 1.2, pZ + 70] });

  // ===== 馬路 =====
  const TMR_Y = 20;
  for (const r of roads) {
    const elevated = r.type === 'motorway', foot = r.w <= 2.5;
    for (let i = 1; i < r.p.length; i++) {
      const a = r.p[i - 1], b = r.p[i], mx = (a[0] + b[0]) / 2, mz = (a[1] + b[1]) / 2;
      if (!inRect(mx, mz)) continue;
      const ax = clampX(a[0]), az = clampZ(a[1]), bx = clampX(b[0]), bz = clampZ(b[1]);
      if (elevated) {
        seg(ax, az, bx, bz, r.w, TMR_Y + 0.02);
        const len = Math.hypot(bx - ax, bz - az), cg = new THREE.PlaneGeometry(len, r.w); cg.rotateX(Math.PI / 2); cg.rotateY(-Math.atan2(bz - az, bx - ax)); cg.translate(mx, TMR_Y - 0.6, mz); B.add(cg, conc);
      } else {
        seg(ax, az, bx, bz, r.w, foot ? 0.036 : 0.03 + (r.type === 'primary' ? 0.002 : 0), foot ? pave : road);
        if (!foot) segs.push([ax, az, bx, bz, r.w / 2 + 3]);
      }
    }
  }
  // 屯門公路高架：橋墩 + 欄杆 + 路牌
  for (let x = V.x0 + 10; x < V.x1; x += 35) {
    const z = tmrZ(x); if (!inRect(x, z)) continue;
    B.box(x - 1.6, 0, z - 1.6, x + 1.6, TMR_Y - 0.6, z + 1.6, conc);
    B.box(x - 6, TMR_Y - 2, z - 2, x + 6, TMR_Y - 0.6, z + 2, conc, false);
  }
  { const x = OX - 250, z = tmrZ(x); if (inRect(x, z)) sign(B, x, TMR_Y + 4, z + 11.2, 26, 2.4, signMat('屯門公路 TUEN MUN ROAD', '#2e7d32')); }
  // 巴士站（青山公路）
  [OX - 120, OX + 230].forEach(x => {
    const z = cprZ(x) - 11;
    B.box(x - 6, 0, z - 2, x + 6, 0.12, z + 3, conc, false); B.box(x - 6, 2.8, z - 2.5, x + 6, 3.0, z + 2, std('#455a64'), false);
    B.box(x - 6, 0, z - 2.5, x + 6, 2.8, z - 2.3, IM.glass); B.box(x - 4, 0, z - 1, x + 4, 0.45, z - 0.4, IM.wood);
    sign(B, x, 3.5, z + 2.1, 10, 1.1, signMat('🚌 青山公路－青龍頭段', '#1565c0'));
  });

  // ===== 建築 =====
  const blocks = HKG.b.map(([name, lv, kind, flat]) => { const p = toPts(flat); return { name, lv, kind, p, bb: bbox(p), c: centroid(p) }; });
  const zh = n => n.split(' ')[0];
  const carparks = [];
  let mi = 0;
  for (const b of blocks) {
    const { p, bb, c } = b, w = bb.x1 - bb.x0, d = bb.z1 - bb.z0;
    if (!inRect(c[0], c[1])) continue;
    if (b.kind === 'park') {
      // 多層停車場：地下開放，有柱、有車；天台有設施；有 Lift 上落
      const T = b.lv * 2.8;
      walls(p, 3.4, T, conc, 6, 2.8); cap(p, 3.4, under, true); cap(p, T, std('#a7a39b'), false, 4); cap(p, 0.03, std('#6d6d6d'), false, 4);
      B.cols.push({ min: [bb.x0, T - 0.4, bb.z0], max: [bb.x1, T, bb.z1] });
      p.forEach(([x, z], i) => { if (i % 2 === 0) B.box(x - 0.4, 0, z - 0.4, x + 0.4, 3.4, z + 0.4, conc); });
      const carCols = ['#c62828', '#1565c0', '#fafafa', '#212121', '#9e9e9e', '#fdd835'];
      let k = 0;
      for (let x = bb.x0 + 8; x < bb.x1 - 4; x += 12) for (let z = bb.z0 + 8; z < bb.z1 - 4; z += 14) {
        if (!inPoly(x, z, p)) continue;
        B.box(x - 0.4, 0, z - 0.4, x + 0.4, 3.4, z + 0.4, conc);
        if (k++ % 3 !== 1) { const cx = x + 3, cm = std(carCols[k % 6], { metalness: 0.5, roughness: 0.35 }); if (inPoly(cx, z, p)) { B.box(cx - 1, 0.3, z - 2.2, cx + 1, 1.2, z + 2.2, cm); B.box(cx - 0.9, 1.2, z - 1.2, cx + 0.9, 1.75, z + 1, IM.glass, false); } }
      }
      const lx = c[0], lz = c[1];
      B.box(lx - 1.6, 0, lz - 1.6, lx + 1.6, T + 3, lz - 1.4, std('#90a4ae'));
      sign(B, lx, 2.6, lz - 1.35, 4, 0.8, signMat(`🛗 ${zh(b.name)} 天台`, '#1565c0'), '-z');
      inter.push({ pos: new V3(lx, 0, lz - 3), r: 2.5, label: () => '🛗 搭 Lift 上天台', act: () => api.tp && api.tp(lx, T + 0.1, lz - 3) });
      inter.push({ pos: new V3(lx, T, lz - 3), r: 2.5, label: () => '🛗 搭 Lift 落地下', act: () => api.tp && api.tp(lx, 0.1, lz - 3) });
      sign(B, bb.x0 + w / 2, 4.6, bb.z1 + 0.2, 12, 1.4, signMat(`Ⓟ 豪景花園 ${zh(b.name)}`, '#1565c0'));
      carparks.push({ p, T });
      continue;
    }
    if (b.kind === 'small') {
      const H = Math.max(3.5, b.lv * 3.2);
      walls(p, 0, H, std('#e0d6c3', { map: FAC[1].m.map })); cap(p, H, roofM);
      B.cols.push({ min: [bb.x0, 0, bb.z0], max: [bb.x1, H, bb.z1] });
      continue;
    }
    // 住宅 / 商場：地下大堂入得，上面跟真實外形
    const GF = 4.5, H = GF + b.lv * 3, mat = b.kind === 'mall' ? std('#efe0c0', { map: FAC[1].m.map }) : towerMats[mi++ % towerMats.length];
    walls(p, GF, H, mat); cap(p, H, roofM); cap(p, GF, under, true);
    B.cols.push({ min: [bb.x0, GF, bb.z0], max: [bb.x1, H, bb.z1] });
    p.forEach(([x, z], i) => { if (i % 3 === 0) B.box(x - 0.35, 0, z - 0.35, x + 0.35, GF, z + 0.35, conc); });
    const hw = Math.max(4.5, Math.min(w, d) * (b.kind === 'mall' ? 0.38 : 0.27));
    const I = shell(B, c[0] - hw, c[1] - hw, c[0] + hw, c[1] + hw, GF, mat);
    if (b.kind === 'mall') storeInterior(B, I, 'diner', () => 0.5, '豪景花園商場・大八坊中菜館');
    else {
      storeInterior(B, I, 'apt', () => 0.3, `${zh(b.name)} 大堂`);
      const info = { name: zh(b.name), lv: Math.max(2, b.lv), back: [I.xm, 0, I.iz0 + 2.4] };
      inter.push({ pos: new V3(I.xm, 0, I.iz0 + 1.3), r: 2.4, label: () => `🛗 搭 Lift 上樓（${info.name}，1–${info.lv} 樓）`, act: () => api.aptLift && api.aptLift(info) });
    }
    sign(B, c[0], GF - 0.8, c[1] + hw + 0.42, Math.min(8, hw * 1.6), 1.0, signMat(zh(b.name), '#5d4037', '#ffe082'));
    B.box(c[0] - 3, H, c[1] - 3, c[0] + 3, H + 3.5, c[1] + 3, std('#bdbdbd'), false);
    if (b.lv >= 13) sign(B, c[0], H - 2, bb.z1 + 0.3, Math.min(14, w * 0.6), 2, signMat(zh(b.name), '#ffffff', '#5d4037', 'bold 60px serif'));
  }

  // ===== 泳池 / 球場 / 遊樂場 / 花園（喺停車場天台就擺上天台）=====
  for (const [kind, , flat] of HKG.f) {
    const p = toPts(flat), c = centroid(p);
    if (!inRect(c[0], c[1])) continue;
    const cp = carparks.find(k => inPoly(c[0], c[1], k.p)), y = (cp ? cp.T : 0) + 0.06;
    if (kind === 'swimming_pool') { cap(p, y, pool, false, 3); walls(p, y - 0.06, y + 0.25, IM.white, 2, 1); }
    else if (kind === 'pitch') { cap(p, y, cp && cp.T > 12 ? redC : blueC, false, 4); const bb = bbox(p); B.box(bb.x0 + 1, y, (bb.z0 + bb.z1) / 2 - 0.05, bb.x1 - 1, y + 1, (bb.z0 + bb.z1) / 2 + 0.05, IM.white, false); }
    else if (kind === 'playground') {
      cap(p, y, play, false, 3);
      const [x, z] = c;
      B.box(x - 4, y, z - 1, x - 3.6, y + 3, z - 0.6, redC); B.box(x - 4, y + 3, z - 1, x + 2, y + 3.3, z - 0.6, redC); B.box(x + 1.6, y, z - 1, x + 2, y + 3, z - 0.6, redC);
      const sl = new THREE.BoxGeometry(2, 0.2, 7); sl.rotateX(0.45); sl.translate(x + 6, y + 1.5, z + 2); B.add(sl, std('#fdd835'));
      B.box(x + 5, y, z - 2, x + 7, y + 3.2, z, blueC);
    } else { cap(p, y, garden, false, 4); const bb = bbox(p); for (let k = 0; k < 8; k++) plant(B, bb.x0 + 4 + (k * 37 % 100) / 100 * (bb.x1 - bb.x0 - 8), bb.z0 + 4 + (k * 61 % 100) / 100 * (bb.z1 - bb.z0 - 8), 1.4); }
  }

  // ===== 樹（避開樓、路、海）+ 山 =====
  let seed = 3; const R = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const nearRoad = (x, z) => segs.some(([ax, az, bx, bz, r]) => { const dx = bx - ax, dz = bz - az, L = dx * dx + dz * dz || 1, t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / L)); return Math.hypot(x - ax - dx * t, z - az - dz * t) < r; });
  const nearBlock = (x, z) => blocks.some(b => x > b.bb.x0 - 4 && x < b.bb.x1 + 4 && z > b.bb.z0 - 4 && z < b.bb.z1 + 4);
  for (let k = 0; k < 900; k++) {
    const x = V.x0 + 5 + R() * (V.x1 - V.x0 - 10), z = V.z0 + 5 + R() * (V.z1 - V.z0 - 10);
    if (z > cprZ(x) + 6 || Math.abs(z - tmrZ(x)) < 14 || nearBlock(x, z) || nearRoad(x, z)) continue;
    if (z > tmrZ(x) && R() < 0.55) continue;   // 屋苑入面疏啲
    tree(B, x, z, 0.9 + R() * 0.7, z < tmrZ(x) && R() < 0.4);
  }
  for (let k = 0; k < 9; k++) { const x = V.x0 + 40 + k * 95, z = Math.max(V.z0 + 40, tmrZ(x) - 90); const h = new THREE.SphereGeometry(70, 16, 10); h.scale(1.2, 0.5, 0.8); h.translate(x, -6, z); B.add(h, std('#3f7d35')); }
  const lampM = new THREE.MeshBasicMaterial({ color: '#fff7d6' });
  for (let x = V.x0 + 20; x < V.x1; x += 40) { const z = cprZ(x) - 9; B.box(x - 0.1, 0, z - 0.1, x + 0.1, 6, z + 0.1, IM.steel); B.box(x - 0.3, 6, z - 0.3, x + 0.3, 6.3, z + 0.3, lampM, false); }
  // 入口牌（商場前面、青山公路旁）
  const eX = OX + 30, eZ = cprZ(OX + 30) - 12;
  B.box(eX - 17, 0, eZ, eX - 13, 6, eZ + 1, std('#795548')); B.box(eX + 13, 0, eZ, eX + 17, 6, eZ + 1, std('#795548'));
  sign(B, eX, 7, eZ + 1.1, 34, 3, signMat('豪景花園 HONG KONG GARDEN', '#5d4037', '#ffe082', 'bold 56px serif'));

  const g = B.build(); g.traverse(o => { if (o.isMesh) o.castShadow = false; }); scene.add(g);
  function update(p) { g.visible = (p.x > V.x0 - 1500 && p.x < V.x1 + 1500 && p.z > V.z0 - 1500 && p.z < V.z1 + 1500) || p.y > 300; }
  const sea = [...shore, [V.x1, V.z1], [V.x0, V.z1]].flat();
  return { colliders: B.cols, interactables: inter, update, sea, center: new V3(eX, 0.1, eZ + 5) };
}
