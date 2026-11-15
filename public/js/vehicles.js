// 交通工具：主角自己嘅電單車 + 圍住小鎮行嘅露營車（入面可以行嚟行去，好似 Roblox）
import * as THREE from 'three';
import * as TX from './textures.js';

const V3 = THREE.Vector3;
const std = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.55, ...extra });
const mesh = (geo, mat, x, y, z, parent) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); parent.add(m); return m; };

// ================= 電單車 =================
export function buildBike(color = '#e53935') {
  const g = new THREE.Group();
  const body = std(color, { metalness: 0.5, roughness: 0.3 }), black = std('#1a1a1a', { roughness: 0.6 }), chrome = std('#d0d4d8', { metalness: 0.95, roughness: 0.15 });
  const wheels = [];
  [0.75, -0.72].forEach(z => {
    const w = new THREE.Group(); w.position.set(0, 0.36, z); g.add(w);
    const tire = mesh(new THREE.TorusGeometry(0.29, 0.085, 10, 22), black, 0, 0, 0, w); tire.rotation.y = Math.PI / 2;
    const hub = mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.12, 12), chrome, 0, 0, 0, w); hub.rotation.z = Math.PI / 2;
    for (let k = 0; k < 3; k++) { const sp = mesh(new THREE.BoxGeometry(0.03, 0.5, 0.04), chrome, 0, 0, 0, w); sp.rotation.x = k * Math.PI / 3; }
    wheels.push(w);
  });
  mesh(new THREE.BoxGeometry(0.34, 0.32, 0.9), body, 0, 0.72, 0.05, g);                    // 油缸 + 車身
  mesh(new THREE.BoxGeometry(0.3, 0.12, 0.6), black, 0, 0.9, -0.3, g);                     // 座位
  mesh(new THREE.BoxGeometry(0.24, 0.28, 0.5), chrome, 0, 0.48, -0.05, g);                 // 引擎
  mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.7, 8), chrome, 0.16, 0.42, -0.55, g).rotation.x = 1.2;   // 死氣喉
  const fork = mesh(new THREE.BoxGeometry(0.06, 0.7, 0.06), chrome, 0, 0.7, 0.68, g); fork.rotation.x = -0.35;
  mesh(new THREE.BoxGeometry(0.7, 0.04, 0.04), chrome, 0, 1.05, 0.55, g);                  // 車頭把
  mesh(new THREE.CylinderGeometry(0.11, 0.09, 0.1, 12), std('#fffbe0', { emissive: '#fff6c0', emissiveIntensity: 1 }), 0, 0.88, 0.86, g).rotation.x = Math.PI / 2;
  mesh(new THREE.BoxGeometry(0.4, 0.06, 0.4), body, 0, 0.7, 0.78, g);                      // 前泥擋
  mesh(new THREE.BoxGeometry(0.36, 0.06, 0.45), body, 0, 0.78, -0.75, g);                  // 後泥擋
  mesh(new THREE.BoxGeometry(0.16, 0.06, 0.04), std('#ff1744', { emissive: '#ff1744', emissiveIntensity: 0.8 }), 0, 0.8, -0.98, g);
  g.userData.wheels = wheels;
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  return g;
}
// 揸電單車嘅坐姿
export function bikePose(av) {
  const u = av.userData;
  u.body.position.y = -0.22; u.body.rotation.x = 0.25;
  u.legL.rotation.x = u.legR.rotation.x = -1.25; u.legL.rotation.z = 0.15; u.legR.rotation.z = -0.15;
  u.armL.rotation.x = u.armR.rotation.x = -1.25; u.armL.rotation.z = u.armR.rotation.z = 0;
}

// ================= 露營車 =================
// 路線：由公園門口旁邊（-65, 20）出發，圍住廣場、商店街、湖同酒店行一圈，返嚟再休息 1 分鐘
const CORNERS = [[-65, 20], [-65, 80], [132, 80], [132, -168], [-65, -168]];
const CR = 16, SPEED = 9, ACC = 1.6, REST = 60;
function buildRoute() {
  const pts = [];
  const n = CORNERS.length;
  pts.push(new V3(CORNERS[0][0], 0, CORNERS[0][1]));
  for (let i = 1; i <= n; i++) {
    if (i === n) { pts.push(new V3(CORNERS[0][0], 0, CORNERS[0][1])); break; }
    const c = new V3(CORNERS[i][0], 0, CORNERS[i][1]), p = new V3(CORNERS[i - 1][0], 0, CORNERS[i - 1][1]), q = new V3(CORNERS[(i + 1) % n][0], 0, CORNERS[(i + 1) % n][1]);
    const a = c.clone().addScaledVector(p.clone().sub(c).normalize(), CR), b = c.clone().addScaledVector(q.clone().sub(c).normalize(), CR);
    for (let k = 0; k <= 10; k++) { const t = k / 10; pts.push(new V3().addScaledVector(a, (1 - t) ** 2).addScaledVector(c, 2 * t * (1 - t)).addScaledVector(b, t * t)); }
  }
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + pts[i].distanceTo(pts[i - 1]));
  return { pts, cum, L: cum[cum.length - 1] };
}
export const ROUTE = buildRoute();
// 俾 world.js 用：路線附近唔好種樹
export function nearRoute(x, z, d = 5) {
  const P = ROUTE.pts;
  for (let i = 1; i < P.length; i++) {
    const ax = P[i - 1].x, az = P[i - 1].z, bx = P[i].x - ax, bz = P[i].z - az, l2 = bx * bx + bz * bz;
    const t = l2 ? Math.max(0, Math.min(1, ((x - ax) * bx + (z - az) * bz) / l2)) : 0;
    if (Math.hypot(x - ax - bx * t, z - az - bz * t) < d) return true;
  }
  return false;
}
function routeAt(s, out) {
  const { pts, cum, L } = ROUTE; s = Math.max(0, Math.min(L, s));
  let lo = 0, hi = cum.length - 1;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (cum[m] <= s) lo = m; else hi = m; }
  const a = (s - cum[lo]) / Math.max(1e-6, cum[hi] - cum[lo]);
  out.lerpVectors(pts[lo], pts[hi], a);
  return Math.atan2(pts[hi].x - pts[lo].x, pts[hi].z - pts[lo].z);
}
const TA = SPEED / ACC, DRIVE = ROUTE.L / SPEED + TA, CYCLE = DRIVE + REST;
function sAtDrive(tau) {
  if (tau <= 0) return 0;
  if (tau < TA) return 0.5 * ACC * tau * tau;
  if (tau < DRIVE - TA) return 0.5 * ACC * TA * TA + SPEED * (tau - TA);
  if (tau < DRIVE) return ROUTE.L - 0.5 * ACC * (DRIVE - tau) ** 2;
  return ROUTE.L;
}

// 車廂本地座標：x -1.5..1.5、z -4.5..4.5（+z = 車頭），地台 y = 0.8
const FLOOR = 0.8, TOP = 3.2, HW = 1.5, HL = 4.5;
function camperCols() {
  const c = [], b = (x0, y0, z0, x1, y1, z1) => c.push({ min: [x0, y0, z0], max: [x1, y1, z1] });
  b(-HW, 0.4, -HL, HW, FLOOR, HL);                       // 地台
  b(-HW, FLOOR, -HL, -HW + 0.12, TOP, HL);                // 左牆
  b(HW - 0.12, FLOOR, -HL, HW, TOP, -1.6);                // 右牆（門口 z -1.6..-0.6）
  b(HW - 0.12, FLOOR, -0.6, HW, TOP, HL);
  b(HW - 0.12, FLOOR + 2.1, -1.6, HW, TOP, -0.6);
  b(-HW, FLOOR, HL - 0.12, HW, TOP, HL);                  // 車頭
  b(-HW, FLOOR, -HL, HW, TOP, -HL + 0.12);                // 車尾
  b(-HW, TOP, -HL, HW, TOP + 0.15, HL);                   // 車頂
  b(-HW, FLOOR, -HL, HW, FLOOR + 0.5, -2.7);              // 碌架床（可以跳上去）
  b(-1.38, FLOOR, 1.0, -0.55, FLOOR + 0.75, 2.2);         // 餐枱
  b(-1.38, FLOOR, 0.45, -0.55, FLOOR + 0.45, 0.9); b(-1.38, FLOOR, 2.3, -0.55, FLOOR + 0.45, 2.75);   // 卡位
  b(0.75, FLOOR, 0.2, HW, FLOOR + 0.9, 2.4);              // 廚房檯
  b(0.7, FLOOR, -2.65, HW, FLOOR + 1.9, -1.85);           // 雪櫃
  b(-1.3, FLOOR, 3.3, -0.4, FLOOR + 0.5, 3.9); b(0.4, FLOOR, 3.3, 1.3, FLOOR + 0.5, 3.9);   // 司機位 / 副駕
  return c;
}

function camperModel(color, name) {
  const g = new THREE.Group();
  const white = std('#f7f7f2'), stripe = std(color), dark = std('#2b2b2b'), glass = new THREE.MeshStandardMaterial({ color: '#9fd3ff', transparent: true, opacity: 0.3, roughness: 0.05, depthWrite: false, side: THREE.DoubleSide });
  const wood = std('#fff', { map: TX.woodTex(1) }), cushion = std('#4e7ec8'), chrome = std('#cfd3d6', { metalness: 0.9, roughness: 0.2 });
  const box = (x0, y0, z0, x1, y1, z1, mat) => mesh(new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0), mat, (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2, g);
  // 底盤 + 車輪
  box(-HW, 0.35, -HL, HW, FLOOR, HL, dark);
  const wheels = [];
  [[-1.42, 3.0], [1.42, 3.0], [-1.42, -3.0], [1.42, -3.0]].forEach(([x, z]) => {
    const w = new THREE.Group(); w.position.set(x, 0.46, z); g.add(w);
    mesh(new THREE.CylinderGeometry(0.46, 0.46, 0.32, 18), std('#111'), 0, 0, 0, w).rotation.z = Math.PI / 2;
    mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.34, 12), chrome, 0, 0, 0, w).rotation.z = Math.PI / 2;
    wheels.push(w);
  });
  // 外殼（有窗）
  const wall = (side) => {
    const x0 = side < 0 ? -HW : HW - 0.12, x1 = x0 + 0.12;
    const doorGap = side > 0;
    const segs = doorGap ? [[-HL, -1.6], [-0.6, HL]] : [[-HL, HL]];
    segs.forEach(([z0, z1]) => { box(x0, FLOOR, z0, x1, 1.8, z1, white); box(x0, 2.6, z0, x1, TOP, z1, white); box(x0 - 0.01 * side, 1.15, z0, x1 + 0.01 * side, 1.4, z1, stripe); });
    // 窗
    segs.forEach(([z0, z1]) => { box(x0, 1.8, z0, x1, 2.6, z1, glass); for (let z = z0; z <= z1; z += 2.2) box(x0 - 0.02, 1.8, z - 0.06, x1 + 0.02, 2.6, z + 0.06, white); });
    if (doorGap) { box(x0, FLOOR + 2.1, -1.6, x1, TOP, -0.6, white); const d = box(x1, FLOOR, -1.6, x1 + 0.05, FLOOR + 2.05, -0.6, white); d.position.x += 0.5; d.position.z -= 0.5; d.rotation.y = -1.2; }
  };
  wall(-1); wall(1);
  box(-HW, FLOOR, -HL, HW, TOP, -HL + 0.12, white); box(-0.9, 1.8, -HL - 0.01, 0.9, 2.5, -HL + 0.13, glass);
  box(-HW, FLOOR, HL - 0.12, HW, 1.6, HL, white); box(-HW, 1.6, HL - 0.12, HW, TOP, HL, glass);   // 擋風玻璃
  box(-HW, TOP, -HL, HW, TOP + 0.15, HL, white);
  box(-HW, TOP + 0.15, HL - 1.6, HW, TOP + 0.5, HL, stripe);                                      // 車頭頂
  box(-0.5, TOP + 0.15, -1, 0.5, TOP + 0.55, 0.2, std('#ddd'));                                    // 冷氣機
  // 車頭（引擎蓋 + 燈）
  box(-HW, 0.35, HL, HW, 1.5, HL + 1.0, white); box(-HW, 1.5, HL, HW, 1.6, HL + 1.0, stripe);
  [-1, 1].forEach(s => mesh(new THREE.BoxGeometry(0.4, 0.22, 0.05), std('#fffbe0', { emissive: '#fff6c0', emissiveIntensity: 1 }), s * 1.0, 1.1, HL + 1.03, g));
  box(-1.2, 0.5, HL + 0.95, 1.2, 0.85, HL + 1.08, chrome);
  [-1, 1].forEach(s => mesh(new THREE.BoxGeometry(0.3, 0.18, 0.05), std('#ff1744', { emissive: '#ff1744', emissiveIntensity: 0.7 }), s * 1.15, 1.2, -HL - 0.03, g));
  // 車尾梯 + 側邊遮陽篷
  for (let y = 1.0; y < TOP; y += 0.4) box(0.9, y, -HL - 0.15, 1.3, y + 0.04, -HL - 0.1, chrome);
  box(HW + 0.05, 2.75, 0.2, HW + 1.7, 2.8, 3.8, std('#ffb74d'));
  // 門口梯級
  box(HW, 0.35, -1.6, HW + 0.5, 0.45, -0.6, chrome);
  // 車身名
  const nm = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 0.5), new THREE.MeshBasicMaterial({ map: TX.signTex(name, color, '#fff', 512, 76, 'bold 44px sans-serif') }));
  nm.position.set(-HW - 0.02, 2.95, 0); nm.rotation.y = -Math.PI / 2; g.add(nm);
  const nm2 = nm.clone(); nm2.position.x = HW + 0.02; nm2.position.z = 2; nm2.rotation.y = Math.PI / 2; g.add(nm2);
  // ===== 車廂入面 =====
  box(-HW + 0.12, FLOOR, -HL + 0.12, HW - 0.12, FLOOR + 0.01, HL - 0.12, wood);
  box(-HW, FLOOR, -HL, HW, FLOOR + 0.35, -2.7, wood); box(-HW + 0.15, FLOOR + 0.35, -HL + 0.15, HW - 0.15, FLOOR + 0.55, -2.75, std('#f5f5f5'));
  box(-HW + 0.15, FLOOR + 0.55, -HL + 0.15, HW - 0.15, FLOOR + 0.6, -3.5, cushion);
  mesh(new THREE.SphereGeometry(0.28, 10, 8), std('#fff'), -0.6, FLOOR + 0.68, -4.1, g).scale.set(1.3, 0.5, 0.8);
  mesh(new THREE.SphereGeometry(0.28, 10, 8), std('#fff'), 0.6, FLOOR + 0.68, -4.1, g).scale.set(1.3, 0.5, 0.8);
  box(-1.38, FLOOR + 0.7, 1.0, -0.55, FLOOR + 0.75, 2.2, wood); box(-1.0, FLOOR, 1.5, -0.9, FLOOR + 0.7, 1.7, chrome);
  box(-1.38, FLOOR, 0.45, -0.55, FLOOR + 0.45, 0.9, cushion); box(-1.38, FLOOR, 2.3, -0.55, FLOOR + 0.45, 2.75, cushion);
  box(-1.38, FLOOR + 0.45, 0.45, -0.55, FLOOR + 1.0, 0.55, cushion); box(-1.38, FLOOR + 0.45, 2.65, -0.55, FLOOR + 1.0, 2.75, cushion);
  box(0.75, FLOOR, 0.2, HW - 0.12, FLOOR + 0.9, 2.4, wood); box(0.75, FLOOR + 0.9, 0.2, HW - 0.12, FLOOR + 0.94, 2.4, std('#eeeeee'));
  mesh(new THREE.CylinderGeometry(0.18, 0.15, 0.05, 14), chrome, 1.1, FLOOR + 0.95, 0.8, g);
  [1.5, 2.0].forEach(z => mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.03, 14), std('#222'), 1.1, FLOOR + 0.96, z, g));
  box(0.7, FLOOR, -2.65, HW - 0.12, FLOOR + 1.9, -1.85, std('#e0e0e0')); box(0.68, FLOOR + 1.1, -2.6, 0.7, FLOOR + 1.5, -2.5, chrome);
  box(-HW + 0.13, 1.9, -1.6, -HW + 0.17, 2.5, -0.6, std('#0d1b2a', { emissive: '#16324f', emissiveIntensity: 0.7 }));   // 電視
  box(-1.3, FLOOR, 3.3, -0.4, FLOOR + 0.5, 3.9, std('#555')); box(0.4, FLOOR, 3.3, 1.3, FLOOR + 0.5, 3.9, std('#555'));
  box(-1.3, FLOOR + 0.5, 3.3, -0.4, FLOOR + 1.3, 3.4, std('#555')); box(0.4, FLOOR + 0.5, 3.3, 1.3, FLOOR + 1.3, 3.4, std('#555'));
  box(-HW + 0.12, FLOOR + 0.6, 4.0, HW - 0.12, FLOOR + 0.95, 4.38, std('#333'));
  const wheel = mesh(new THREE.TorusGeometry(0.2, 0.03, 6, 16), std('#111'), -0.85, FLOOR + 1.1, 4.0, g); wheel.rotation.x = -0.5;
  box(-0.4, TOP - 0.03, -1, 0.4, TOP, 1, new THREE.MeshBasicMaterial({ color: '#fff6dc' }));
  g.traverse(o => { if (o.isMesh && o.material !== glass) o.castShadow = true; });
  return { g, wheels };
}

export function buildCampers(scene, api) {
  const cols = camperCols();
  const list = [['#2e7d32', '🚐 露營車 1 號'], ['#ef6c00', '🚐 露營車 2 號']].map(([color, name], k) => {
    const { g, wheels } = camperModel(color, name); scene.add(g);
    const c = { k, g, wheels, name, cols, off: k * CYCLE / 2, pos: new V3(), yaw: 0, prevYaw: 0, moving: false, s: 0 };
    c.toWorld = (l, out = new V3()) => { const cs = Math.cos(c.yaw), sn = Math.sin(c.yaw); return out.set(c.pos.x + l.x * cs + l.z * sn, c.pos.y + l.y, c.pos.z - l.x * sn + l.z * cs); };
    c.toLocal = (w, out = new V3()) => { const dx = w.x - c.pos.x, dz = w.z - c.pos.z, cs = Math.cos(c.yaw), sn = Math.sin(c.yaw); return out.set(dx * cs - dz * sn, w.y - c.pos.y, dx * sn + dz * cs); };
    c.rotL = (v, out = new V3()) => { const cs = Math.cos(c.yaw), sn = Math.sin(c.yaw); return out.set(v.x * cs - v.z * sn, v.y, v.x * sn + v.z * cs); };
    c.inter = { pos: new V3(), r: 2.4, label: () => `🚐 上${name.slice(3)}`, act: () => api.enterCamper(k) };
    return c;
  });
  // 中途停站時路邊嘅營地
  const camp = new THREE.Group(); scene.add(camp);
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(4, 1), new THREE.MeshBasicMaterial({ map: TX.signTex('🏕 露營車站', '#2e7d32', '#fff', 512, 128, 'bold 64px sans-serif'), side: THREE.DoubleSide }));
  sign.position.set(-59, 3, 14); sign.rotation.y = -Math.PI / 2; camp.add(sign);
  mesh(new THREE.CylinderGeometry(0.08, 0.08, 2.6, 8), std('#555'), -59, 1.3, 14.05, camp);

  const tmp = new V3();
  function update(T) {
    const t = T / 1000;
    for (const c of list) {
      const tc = (((t + c.off) % CYCLE) + CYCLE) % CYCLE;
      const s = tc < REST ? 0 : sAtDrive(tc - REST);
      c.prevYaw = c.yaw;
      const yaw = routeAt(s, c.pos);
      c.yaw = yaw; if (!c.init) { c.prevYaw = yaw; c.init = true; }
      c.moving = tc >= REST; c.s = s; c.restLeft = tc < REST ? REST - tc : 0;
      c.g.position.copy(c.pos); c.g.rotation.y = yaw;
      c.wheels.forEach(w => w.rotation.x = s / 0.46);
      c.toWorld(tmp.set(HW + 1.0, 0, -1.1), c.inter.pos);
    }
  }
  return { list, update, interactables: list.map(c => c.inter), cycle: CYCLE, drive: DRIVE };
}
