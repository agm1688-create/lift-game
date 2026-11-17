// 交通：每個路口都有交通燈（所有玩家同步），馬路上有車行（會停紅燈、會讓人）
// 揸電單車沖紅燈會俾 callback 知（扣錢 / 坐監喺 main.js 處理）
import * as THREE from 'three';
import { CHUNK, HALF_WORLD, EXCL, district } from './city.js';

const V3 = THREE.Vector3;
const LINE = k => k * CHUNK - 100;                       // 馬路中線
const lineOf = v => Math.round((v + 100) / CHUNK) * CHUNK - 100;
const std = (c, e = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.5, ...e });
export const inExcl = (x, z, pad = 0) => EXCL.some(r => x > r.x0 + pad && x < r.x1 - pad && z > r.z0 + pad && z < r.z1 - pad);
// 兩個路口之間有冇馬路（同 city.js 起路嘅規則一樣）
export function segOK(ax, az, bx, bz) {
  const mx = (ax + bx) / 2, mz = (az + bz) / 2;
  return Math.abs(mx) < HALF_WORLD - 60 && Math.abs(mz) < HALF_WORLD - 60 && !inExcl(mx, mz);
}
const hash = (i, j) => { let h = (i * 374761393 + j * 668265263) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296; };
// 交通燈週期：南北（沿 z）綠 11 秒 → 黃 2 秒 → 東西綠 11 秒 → 黃 2 秒
const CYCLE = 26;
export function lightAt(tMs, x, z) {
  const u = ((tMs / 1000 + hash(Math.round(x), Math.round(z)) * CYCLE) % CYCLE + CYCLE) % CYCLE;
  return { ns: u < 11 ? 'g' : u < 13 ? 'y' : 'r', ew: u >= 13 && u < 24 ? 'g' : u >= 24 ? 'y' : 'r' };
}
// 附近有交通燈嘅路口：主要馬路網（每 200 米）+ 市區 / 住宅區入面嘅十字街
export function junctionsNear(x, z, R) {
  const out = [];
  for (let gx = lineOf(x - R); gx <= x + R; gx += CHUNK) for (let gz = lineOf(z - R); gz <= z + R; gz += CHUNK) {
    if (gx < x - R || gz < z - R) continue;
    const arms = [segOK(gx, gz, gx + CHUNK, gz), segOK(gx, gz, gx - CHUNK, gz), segOK(gx, gz, gx, gz + CHUNK), segOK(gx, gz, gx, gz - CHUNK)];
    if (arms.filter(Boolean).length >= 3) out.push({ x: gx, z: gz, arms });
  }
  for (let i = Math.round((x - R) / CHUNK); i <= Math.round((x + R) / CHUNK); i++) for (let j = Math.round((z - R) / CHUNK); j <= Math.round((z + R) / CHUNK); j++) {
    const t = district(i, j); if (t !== 'city' && t !== 'res') continue;
    const cx = i * CHUNK, cz = j * CHUNK; if (Math.hypot(cx - x, cz - z) > R * 1.2) continue;
    out.push({ x: cx, z: cz, arms: [true, true, true, true], inner: true });
  }
  return out;
}

// ---------- 車款（原創簡化造型，車頭向 +z）----------
function carModel(kind, color) {
  const g = new THREE.Group(), add = (w, h, d, m, x, y, z) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z); o.castShadow = true; g.add(o); return o; };
  const body = std(color, { metalness: 0.4, roughness: 0.35 }), glass = std('#22313f', { metalness: 0.6, roughness: 0.15 }), black = std('#111');
  const head = std('#fffbe0', { emissive: '#fff6c0', emissiveIntensity: 1 }), tail = std('#ff1744', { emissive: '#ff1744', emissiveIntensity: 0.7 });
  let L = 4.4, W = 1.8, H = 1.5;
  if (kind === 'van') { L = 5; H = 2.2; add(W, 1.8, L, body, 0, 1.25, 0); add(W + 0.02, 0.6, 1.0, glass, 0, 1.75, L / 2 - 0.6); }
  else if (kind === 'truck') { L = 7.5; W = 2.3; H = 3.2; add(W, 1.9, 2.0, body, 0, 1.55, L / 2 - 1.0); add(W + 0.02, 0.7, 0.1, glass, 0, 2.0, L / 2 - 0.02); add(W, 2.6, 5.2, std('#eceff1'), 0, 1.95, -1.1); }
  else { add(W, 0.7, L, body, 0, 0.7, 0); add(W - 0.1, 0.6, L * 0.5, body, 0, 1.35, -0.2); add(W - 0.08, 0.5, L * 0.5 - 0.1, glass, 0, 1.35, -0.2); if (kind === 'taxi') add(0.6, 0.18, 0.25, std('#fff59d', { emissive: '#fff176', emissiveIntensity: 0.5 }), 0, 1.75, -0.2); }
  [-1, 1].forEach(s => { add(0.35, 0.18, 0.05, head, s * (W / 2 - 0.3), 0.75, L / 2 + 0.01); add(0.35, 0.16, 0.05, tail, s * (W / 2 - 0.3), 0.8, -L / 2 - 0.01); });
  const wheels = [];
  [[-1, 1], [1, 1], [-1, -1], [1, -1]].forEach(([sx, sz]) => { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.3, 12), black); w.rotation.z = Math.PI / 2; w.position.set(sx * (W / 2 - 0.05), 0.36, sz * (L / 2 - 0.9)); g.add(w); wheels.push(w); });
  g.userData = { L, W, H, wheels };
  return g;
}
const CAR_TYPES = [['sedan', '#eceff1'], ['sedan', '#263238'], ['sedan', '#1565c0'], ['sedan', '#9e9e9e'], ['sedan', '#b71c1c'], ['taxi', '#d32f2f'], ['taxi', '#2e7d32'], ['van', '#fafafa'], ['van', '#ffca28'], ['truck', '#1e88e5'], ['sedan', '#f5f5f5'], ['taxi', '#d32f2f']];
export function buildCar(k) { const [kind, c] = CAR_TYPES[k % CAR_TYPES.length]; return carModel(kind, c); }
export const buildCarOf = carModel;

// 方向：0 = +x、1 = +z、2 = -x、3 = -z；香港靠左行 → 車道喺行車方向嘅左手邊 3 米
const DIRS = [[1, 0], [0, 1], [-1, 0], [0, -1]];
export const laneOff = d => [DIRS[d][1] * 3, -DIRS[d][0] * 3];

export function buildTraffic(scene, api) {
  // ===== 交通燈（Instanced，只放玩家附近）=====
  const MAXH = 200;
  const poleM = std('#37474f', { metalness: 0.6 }), boxM = std('#1b1b1b');
  const poles = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.09, 0.11, 4.6, 8).translate(0, 2.3, 0), poleM, MAXH);
  const heads = new THREE.InstancedMesh(new THREE.BoxGeometry(0.55, 1.5, 0.34).translate(0, 4.2, 0), boxM, MAXH);
  const lamps = new THREE.InstancedMesh(new THREE.CircleGeometry(0.19, 14), new THREE.MeshBasicMaterial({ color: '#fff' }), MAXH * 3);
  [poles, heads, lamps].forEach(m => { m.count = 0; m.frustumCulled = false; scene.add(m); });
  for (let i = 0; i < MAXH * 3; i++) lamps.setColorAt(i, new THREE.Color('#222'));   // 一開始就要有 instanceColor，shader 先會用
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s1 = new V3(1, 1, 1), col = new THREE.Color();
  const LIT = { r: '#ff2b2b', y: '#ffc400', g: '#20e070' }, DIM = { r: '#3d1010', y: '#3d3010', g: '#0f3320' };
  let headList = [], lastCell = '';
  // 每個路口 4 支燈，喺路口角落向住駛近嘅車
  const CORNER = [
    { dx: -7.6, dz: -7.6, face: -Math.PI / 2, ax: 'ew' },   // 向東行（由西面嚟）
    { dx: 7.6, dz: 7.6, face: Math.PI / 2, ax: 'ew' },      // 向西行
    { dx: 7.6, dz: -7.6, face: Math.PI, ax: 'ns' },         // 向南行（由北面嚟）
    { dx: -7.6, dz: 7.6, face: 0, ax: 'ns' },               // 向北行
  ];
  function rebuildLights(p) {
    const J = junctionsNear(p.x, p.z, 330);
    headList = [];
    for (const j of J) CORNER.forEach((c, k) => { if (!j.arms[[1, 0, 3, 2][k]] && !j.inner) return; headList.push({ x: j.x + c.dx, z: j.z + c.dz, face: c.face, ax: c.ax, jx: j.x, jz: j.z }); });
    headList = headList.slice(0, MAXH);
    headList.forEach((h, i) => {
      q.setFromAxisAngle(new V3(0, 1, 0), h.face);
      m4.compose(new V3(h.x, 0, h.z), q, s1); poles.setMatrixAt(i, m4); heads.setMatrixAt(i, m4);
      for (let k = 0; k < 3; k++) {
        const off = new V3(0, 4.68 - k * 0.47, 0.175).applyQuaternion(q);
        m4.compose(new V3(h.x + off.x, off.y, h.z + off.z), q, s1); lamps.setMatrixAt(i * 3 + k, m4);
      }
    });
    poles.count = heads.count = headList.length; lamps.count = headList.length * 3;
    poles.instanceMatrix.needsUpdate = heads.instanceMatrix.needsUpdate = lamps.instanceMatrix.needsUpdate = true;
  }
  function paintLights(t) {
    headList.forEach((h, i) => {
      const st = lightAt(t, h.jx, h.jz)[h.ax];
      ['r', 'y', 'g'].forEach((c, k) => { lamps.setColorAt(i * 3 + k, col.set(st === c ? LIT[c] : DIM[c])); });
    });
    if (lamps.instanceColor) lamps.instanceColor.needsUpdate = true;
  }

  // ===== 車 =====
  const NCAR = api.isTouch ? 14 : 22;
  const cars = [];
  for (let k = 0; k < NCAR; k++) { const m = buildCar(k); m.visible = false; scene.add(m); cars.push({ m, alive: false, k }); }
  // 揀一段離玩家 120–380 米、唔喺禁區嘅馬路放車
  function spawn(c, p) {
    for (let tries = 0; tries < 30; tries++) {
      const ang = Math.random() * Math.PI * 2, r = 120 + Math.random() * 260;
      let x = p.x + Math.cos(ang) * r, z = p.z + Math.sin(ang) * r;
      const d = Math.floor(Math.random() * 4), alongX = d % 2 === 0;
      if (alongX) z = lineOf(z); else x = lineOf(x);
      const a0 = alongX ? lineOf(x - 100) : lineOf(z - 100);
      const ok = alongX ? segOK(a0, z, a0 + CHUNK, z) : segOK(x, a0, x, a0 + CHUNK);
      if (!ok || Math.abs(x) > HALF_WORLD - 100 || Math.abs(z) > HALF_WORLD - 100) continue;
      const [ox, oz] = laneOff(d);
      c.d = d; c.lx = x; c.lz = z; c.x = x + ox; c.z = z + oz; c.v = 10 + Math.random() * 4; c.vmax = 11 + Math.random() * 5; c.alive = true; c.m.visible = true; c.turned = null;
      return true;
    }
    c.alive = false; c.m.visible = false; return false;
  }
  function nodeAhead(c) {
    // 由車而家位置計，前面最近嘅馬路線
    const [dx, dz] = DIRS[c.d];
    if (dx) { let n = lineOf(c.x); if ((n - c.x) * dx <= 0.5) n += dx * CHUNK; return { x: n, z: c.lz }; }
    let n = lineOf(c.z); if ((n - c.z) * dz <= 0.5) n += dz * CHUNK; return { x: c.lx, z: n };
  }
  const tmp = new V3();
  let lightT = 0, playerHold = 0;
  function stepCar(c, dt, t, p) {
    const [dx, dz] = DIRS[c.d];
    // 車道中線（固定嗰條路）
    if (dx) c.lz = lineOf(c.z); else c.lx = lineOf(c.x);
    const n = nodeAhead(c);
    const dist = dx ? (n.x - c.x) * dx : (n.z - c.z) * dz;     // 去下個路口中心嘅距離
    let target = c.vmax;
    // 交通燈：停喺停車線（路口中心前 9.5 米）
    const L = lightAt(t, n.x, n.z)[dx ? 'ew' : 'ns'];
    const stopAt = dist - 9.5;
    if (L !== 'g' && stopAt > -0.5 && stopAt < 45 && !(L === 'y' && stopAt < 6)) target = Math.min(target, Math.max(0, stopAt * 0.6));
    // 前面有車
    for (const o of cars) {
      if (o === c || !o.alive || o.d !== c.d) continue;
      const along = (o.x - c.x) * dx + (o.z - c.z) * dz, side = Math.abs((o.x - c.x) * dz - (o.z - c.z) * dx);
      if (along > 0 && along < 16 && side < 1.5) target = Math.min(target, Math.max(0, (along - 8) * 0.8));
    }
    // 前面有玩家：讓人
    { const along = (p.x - c.x) * dx + (p.z - c.z) * dz, side = Math.abs((p.x - c.x) * dz - (p.z - c.z) * dx);
      if (along > 0 && along < 14 && side < 2.2 && Math.abs(p.y) < 3) { target = 0; if (along < 9) playerHold = 1; } }
    c.v += Math.max(-12 * dt, Math.min(4 * dt, target - c.v));
    if (c.v < 0) c.v = 0;
    let step = c.v * dt;
    // 去到路口中心：轉彎或者直行
    if (dist <= step && dist >= -0.01) {
      const opts = [];
      [0, 1, 2, 3].forEach(d => { if (d === (c.d + 2) % 4) return; const [ex, ez] = DIRS[d]; if (segOK(n.x, n.z, n.x + ex * CHUNK, n.z + ez * CHUNK)) opts.push(d); });
      const nd = opts.length ? (opts.includes(c.d) && Math.random() < 0.55 ? c.d : opts[Math.floor(Math.random() * opts.length)]) : (c.d + 2) % 4;
      c.d = nd; const [ox, oz] = laneOff(nd);
      if (DIRS[nd][0]) { c.z = n.z + oz; c.x = n.x + ox * 0; c.lz = n.z; c.x += DIRS[nd][0] * 0.6; }
      else { c.x = n.x + ox; c.z = n.z; c.lx = n.x; c.z += DIRS[nd][1] * 0.6; }
      step = 0;
    }
    c.x += DIRS[c.d][0] * step; c.z += DIRS[c.d][1] * step;
    // 車道修正
    const [ox, oz] = laneOff(c.d);
    if (DIRS[c.d][0]) c.z += (lineOf(c.z) + oz - c.z) * Math.min(1, dt * 4); else c.x += (lineOf(c.x) + ox - c.x) * Math.min(1, dt * 4);
    const yaw = Math.atan2(DIRS[c.d][0], DIRS[c.d][1]);
    let dy = yaw - c.m.rotation.y; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); c.m.rotation.y += dy * Math.min(1, dt * 8);
    c.m.position.set(c.x, 0, c.z);
    c.m.userData.wheels.forEach(w => w.rotation.x += c.v * dt / 0.36);
  }
  function colliders() {
    const out = [];
    for (const c of cars) {
      if (!c.alive) continue; const u = c.m.userData, along = DIRS[c.d][0] !== 0;
      const hx = (along ? u.L : u.W) / 2, hz = (along ? u.W : u.L) / 2;
      out.push({ min: [c.x - hx, 0, c.z - hz], max: [c.x + hx, u.H, c.z + hz] });
    }
    return out;
  }

  // ===== 沖紅燈偵測（只計揸電單車）=====
  let prevP = null, redCd = 0;
  function checkRed(p, t, riding) {
    redCd -= 1;
    if (!riding) { prevP = null; return null; }
    let hitJ = null;
    if (prevP) {
      for (const j of junctionsNear(p.x, p.z, 40)) {
        const inNow = Math.abs(p.x - j.x) < 6 && Math.abs(p.z - j.z) < 6, inPrev = Math.abs(prevP.x - j.x) < 6 && Math.abs(prevP.z - j.z) < 6;
        if (inNow && !inPrev) {
          const ax = Math.abs(prevP.x - j.x) >= 6 ? 'ew' : 'ns';
          if (lightAt(t, j.x, j.z)[ax] === 'r') hitJ = j;
        }
      }
    }
    prevP = { x: p.x, z: p.z };
    if (hitJ && redCd <= 0) { redCd = 300; return hitJ; }
    return null;
  }

  // ===== 每格更新 =====
  function update(dt, t, p, riding) {
    const inWorld = Math.abs(p.x) < HALF_WORLD && Math.abs(p.z) < HALF_WORLD && p.y < 60;
    const cell = Math.round(p.x / 100) + ',' + Math.round(p.z / 100);
    if (cell !== lastCell) { lastCell = cell; rebuildLights(p); }
    poles.visible = heads.visible = lamps.visible = inWorld;
    lightT -= dt; if (lightT <= 0) { lightT = 0.25; paintLights(t); }
    playerHold = 0;
    for (const c of cars) {
      if (!inWorld) { c.m.visible = false; c.alive = false; continue; }
      if (!c.alive || Math.hypot(c.x - p.x, c.z - p.z) > 430) { if (Math.random() < 0.2) spawn(c, p); continue; }
      stepCar(c, dt, t, p);
    }
    return { red: checkRed(p, t, riding && inWorld), honk: playerHold };
  }
  return { update, colliders, lightAt, cars };
}
