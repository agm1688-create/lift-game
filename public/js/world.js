// 靜態世界：廣場、公廁、寵物店、獸醫、酒店、機房、天空/太空
import * as THREE from 'three';
import * as T from './textures.js';
import { goldMat, itemMesh, buildShiba } from './avatar.js';
import { altOfFloor, ISS_FLOOR, MACHINE_ROOM_Y } from './alt.js';
import { nearRoute } from './vehicles.js';

export const LIFT_DEF = [
  { id: 0, name: '1號 客 Lift', x: -2.6, z: -12, w: 2.4, d: 2.4, h: 2.8, cargo: false },
  { id: 1, name: '2號 貨 Lift', x: 2.4, z: -12, w: 3.2, d: 3.0, h: 3.0, cargo: true },
];

const std = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.8, ...extra });

export function buildWorld(scene, api) {
  const colliders = [];   // {min:[x,y,z], max:[x,y,z]}
  const interactables = [];
  const updaters = [];
  const addCol = (x0, y0, z0, x1, y1, z1) => colliders.push({ min: [Math.min(x0, x1), Math.min(y0, y1), Math.min(z0, z1)], max: [Math.max(x0, x1), Math.max(y0, y1), Math.max(z0, z1)] });
  const mesh = (geo, mat, x, y, z, parent = scene) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; parent.add(m); return m; };
  // 實心盒（同時加碰撞）
  const solid = (x0, y0, z0, x1, y1, z1, mat, col = true) => {
    const m = mesh(new THREE.BoxGeometry(Math.abs(x1 - x0), Math.abs(y1 - y0), Math.abs(z1 - z0)), mat, (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
    if (col) addCol(x0, y0, z0, x1, y1, z1);
    return m;
  };
  const inter = (pos, r, label, act, show) => { const it = { pos: new THREE.Vector3(...pos), r, label, act, show }; interactables.push(it); return it; };

  // ---------- 燈光 ----------
  const hemi = new THREE.HemisphereLight('#cfe8ff', '#6a6250', 0.9); scene.add(hemi);
  const sun = new THREE.DirectionalLight('#fff3dd', 2.2);
  sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -30, right: 30, top: 30, bottom: -30, near: 1, far: 200 });
  sun.shadow.bias = -0.0005;
  scene.add(sun, sun.target);
  const SUN_DIR = new THREE.Vector3(0.45, 0.8, 0.35).normalize();

  // ---------- 地面（有電梯井窿） ----------
  const holes = LIFT_DEF.map(L => [L.x - L.w / 2 - 0.05, L.z - L.d / 2 - 0.05, L.x + L.w / 2 + 0.05, L.z + L.d / 2 + 0.05]);
  function rectsMinusHoles(x0, z0, x1, z1, hs) {
    const xs = [x0, x1]; hs.forEach(h => { if (h[0] > x0 && h[0] < x1) xs.push(h[0]); if (h[2] > x0 && h[2] < x1) xs.push(h[2]); });
    xs.sort((a, b) => a - b); const out = [];
    for (let i = 0; i < xs.length - 1; i++) {
      const a = xs[i], b = xs[i + 1], mx = (a + b) / 2;
      const zs = hs.filter(h => mx > h[0] && mx < h[2]).map(h => [h[1], h[3]]).sort((p, q) => p[0] - q[0]);
      let cz = z0;
      for (const [h0, h1] of zs) { if (h0 > cz) out.push([a, cz, b, h0]); cz = Math.max(cz, h1); }
      if (cz < z1) out.push([a, cz, b, z1]);
    }
    return out;
  }
  const plazaTex = T.tileTex(1, 1, '#d8d2c4', '#bdb5a3');
  const plazaMat = std('#fff', { map: plazaTex });
  function groundRect([x0, z0, x1, z1], mat, uvScale, y = 0) {
    const g = new THREE.PlaneGeometry(x1 - x0, z1 - z0); g.rotateX(-Math.PI / 2);
    const uv = g.attributes.uv, pos = g.attributes.position;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, (pos.getX(i) + (x0 + x1) / 2) / uvScale, (pos.getZ(i) + (z0 + z1) / 2) / uvScale);
    const m = new THREE.Mesh(g, mat); m.position.set((x0 + x1) / 2, y, (z0 + z1) / 2); m.receiveShadow = true; scene.add(m);
    addCol(x0, y - 0.3, z0, x1, y, z1);
    return m;
  }
  const P = 70; // 廣場半徑
  rectsMinusHoles(-P, -P, P, P, holes).forEach(r => groundRect(r, plazaMat, 4));
  const farGround = new THREE.Group(); scene.add(farGround);
  const grassMat = std('#fff', { map: T.grassTex(1) });
  const G = 5600;   // 大地圖 ±5000 米，再出少少
  [[-G, -G, G, -P], [-G, P, G, G], [-G, -P, -P, P], [P, -P, G, P]].forEach(r => farGround.add(groundRect(r, grassMat, 8, -0.02)));
  // 馬路
  const roadMat = std('#fff', { map: T.roadTex(1, 1) });
  const road1 = new THREE.Mesh(new THREE.PlaneGeometry(600, 12), roadMat); road1.rotation.x = -Math.PI / 2; road1.position.set(0, 0.01, P + 8); road1.material.map.repeat.set(50, 1); road1.receiveShadow = true; farGround.add(road1);

  // ---------- 電梯機房（地底） ----------
  const MR = { x0: -9, x1: 9, z0: -19, z1: -7, y0: MACHINE_ROOM_Y, y1: -0.3 };
  const mrWall = std('#8d939a', { map: T.metalTex(2, '#8d939a') });
  solid(MR.x0, MR.y0 - 0.3, MR.z0, MR.x1, MR.y0, MR.z1, std('#fff', { map: T.checkerPlateTex(6) }));
  solid(MR.x0 - 0.3, MR.y0, MR.z0, MR.x0, MR.y1, MR.z1, mrWall);
  solid(MR.x1, MR.y0, MR.z0, MR.x1 + 0.3, MR.y1, MR.z1, mrWall);
  solid(MR.x0, MR.y0, MR.z0 - 0.3, MR.x1, MR.y1, MR.z0, mrWall);
  solid(MR.x0, MR.y0, MR.z1, MR.x1, MR.y1, MR.z1 + 0.3, mrWall);
  const mrLight = new THREE.PointLight('#fff2cc', 40, 30, 1.5); mrLight.position.set(0, -1.5, -13); scene.add(mrLight);
  // 曳引機
  LIFT_DEF.forEach((L, i) => {
    const mx = L.x + (i === 0 ? -4.2 : 4.2) * 0 + (i === 0 ? -1 : 1) * 4.5;
    const baseY = MR.y0;
    solid(mx - 0.9, baseY, -16.5, mx + 0.9, baseY + 0.6, -14.5, std('#2e4a7a'));
    const motor = mesh(new THREE.CylinderGeometry(0.55, 0.55, 1.2, 20), std('#3d6fb6', { metalness: 0.5, roughness: 0.4 }), mx, baseY + 1.2, -15.5); motor.rotation.z = Math.PI / 2;
    const sheave = mesh(new THREE.CylinderGeometry(0.8, 0.8, 0.35, 28), std('#555', { metalness: 0.8, roughness: 0.3 }), mx + (i === 0 ? 0.8 : -0.8), baseY + 1.4, -15.5); sheave.rotation.z = Math.PI / 2;
    for (let k = 0; k < 4; k++) { const ring = mesh(new THREE.TorusGeometry(0.81, 0.025, 6, 30), goldMat, sheave.position.x - 0.12 + k * 0.08, baseY + 1.4, -15.5); ring.rotation.y = Math.PI / 2; }
    updaters.push(dt => { sheave.rotation.x += dt * api.liftSpeed(i) * 0.3; });
    // 控制櫃
    const cab = solid(mx - 0.6, baseY, -18.9, mx + 0.6, baseY + 2.2, -18.3, std('#c9ccd1', { metalness: 0.3 }));
    for (let k = 0; k < 6; k++) {
      const led = mesh(new THREE.SphereGeometry(0.04, 6, 4), new THREE.MeshBasicMaterial({ color: k % 3 === 0 ? '#f33' : '#3f3' }), mx - 0.4 + k * 0.16, baseY + 1.7, -18.28);
      updaters.push((dt, t) => { led.visible = Math.sin(t * 3 + k * 1.7) > -0.3; });
    }
    const lbl = new THREE.Mesh(new THREE.PlaneGeometry(1, 0.25), new THREE.MeshBasicMaterial({ map: T.signTex(i === 0 ? '1號 客Lift 控制櫃' : '2號 貨Lift 控制櫃', '#333', '#ff0', 512, 128, 'bold 48px sans-serif') }));
    lbl.position.set(mx, baseY + 2.0, -18.27); scene.add(lbl);
  });
  const mrSign = new THREE.Mesh(new THREE.PlaneGeometry(4, 1), new THREE.MeshBasicMaterial({ map: T.signTex('⚙ 電梯機房 MACHINE ROOM', '#b71c1c', '#fff', 1024, 256, 'bold 90px sans-serif') }));
  mrSign.position.set(0, MR.y0 + 4.5, MR.z0 + 0.32); scene.add(mrSign);
  // 爬梯返地面
  for (let k = 0; k < 12; k++) mesh(new THREE.BoxGeometry(0.8, 0.05, 0.05), std('#ffcc00', { metalness: 0.6 }), -7.5, MR.y0 + 0.4 + k * 0.55, -7.2);
  inter([-7.5, MR.y0 + 1, -7.6], 1.6, () => '🪜 爬梯返地面', () => api.teleport(-7.5, 0.05, -5));
  // 地面上機房入口（下樓梯）
  const hatch = mesh(new THREE.BoxGeometry(1.4, 0.1, 1.4), std('#ffcc00', { metalness: 0.5 }), -7.5, 0.05, -4.2);
  const hs = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 0.35), new THREE.MeshBasicMaterial({ map: T.signTex('機房入口 ↓', '#222', '#ffcc00', 512, 128, 'bold 60px sans-serif') }));
  hs.rotation.x = -Math.PI / 2; hs.position.set(-7.5, 0.11, -4.2); scene.add(hs);
  inter([-7.5, 0, -4.2], 1.4, () => '🪜 落去電梯機房', () => api.teleport(-7.5, MR.y0 + 0.05, -8.5));

  // ---------- 大堂：柱、消防鐘、滅火筒 ----------
  const pillarX = (LIFT_DEF[0].x + LIFT_DEF[0].w / 2 + LIFT_DEF[1].x - LIFT_DEF[1].w / 2) / 2;
  solid(pillarX - 0.25, 0, -10.2, pillarX + 0.25, 3.2, -9.7, std('#e8e2d4', { roughness: 0.4 }));
  const bell = new THREE.Group(); bell.position.set(pillarX, 1.9, -9.68); scene.add(bell);
  const bellMat = std('#d50000', { metalness: 0.4, roughness: 0.3, emissive: '#000' });
  const dome = new THREE.Mesh(new THREE.SphereGeometry(0.18, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), bellMat); dome.rotation.x = Math.PI / 2; bell.add(dome);
  const bellSign = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.12), new THREE.MeshBasicMaterial({ map: T.signTex('消防鐘 FIRE', '#d50000', '#fff', 256, 80, 'bold 34px sans-serif') }));
  bellSign.position.set(0, -0.3, 0.01); bell.add(bellSign);
  const alarmLight = new THREE.PointLight('#ff0000', 0, 15); alarmLight.position.set(pillarX, 2.6, -9.3); scene.add(alarmLight);
  let alarmUntil = 0;
  updaters.push((dt, t) => {
    const on = performance.now() < alarmUntil;
    const blink = on && Math.sin(t * 20) > 0;
    alarmLight.intensity = blink ? 25 : 0; bellMat.emissive.set(blink ? '#ff2000' : '#000');
    bell.position.x = pillarX + (on ? Math.sin(t * 80) * 0.01 : 0);
  });
  inter([pillarX, 1, -9.3], 1.6, () => '🔔 撳消防鐘', () => api.alarm());
  // 滅火筒（可拎）
  const extSpot = itemMesh('ext'); extSpot.position.set(pillarX, 0, -9.45); scene.add(extSpot);
  inter([pillarX, 0.5, -9.2], 1.3, () => '🧯 拎滅火筒', () => api.pickup('ext', extSpot), () => extSpot.visible);

  // ---------- 道具枱：手機、Router ----------
  const tbl = new THREE.Group(); tbl.position.set(-6, 0, -3); scene.add(tbl);
  const tw = std('#fff', { map: T.woodTex() });
  mesh(new THREE.BoxGeometry(1.6, 0.06, 0.8), tw, 0, 0.8, 0, tbl);
  [[-0.7, -0.32], [0.7, -0.32], [-0.7, 0.32], [0.7, 0.32]].forEach(([x, z]) => mesh(new THREE.BoxGeometry(0.06, 0.8, 0.06), tw, x, 0.4, z, tbl));
  addCol(-6.8, 0, -3.4, -5.2, 0.83, -2.6);
  const phone = itemMesh('phone'); phone.rotation.x = -Math.PI / 2; phone.position.set(-6.4, 0.84, -3); scene.add(phone);
  const router = itemMesh('router'); router.position.set(-5.6, 0.86, -3); scene.add(router);
  inter([-6.4, 0.8, -2.4], 1.2, () => '📱 拎手機', () => api.pickup('phone', phone), () => phone.visible);
  inter([-5.6, 0.8, -2.4], 1.2, () => '📶 拎 Router', () => api.pickup('router', router), () => router.visible);

  // ---------- 金條 ----------
  const goldSpots = [[5, 0, 4], [-10, 0, 8], [12, 0, -6], [-14, 0, -18], [0, 0, 21.5], [-2.5, 0, 20], [-24, 0, 6], [-24, 0, -10], [20, 0, 20], [-5, MACHINE_ROOM_Y, -12.5], [5, MACHINE_ROOM_Y, -9], [30, 0, -30], [8, 0, 12], [-30, 0, 30]];
  goldSpots.forEach(([x, y, z]) => {
    const g = itemMesh('gold'); g.position.set(x, y + 0.35, z); scene.add(g);
    updaters.push((dt, t) => { g.rotation.y += dt * 1.5; g.position.y = y + 0.35 + Math.sin(t * 2 + x) * 0.08; });
    inter([x, y, z], 1.2, () => '🥇 拎金條', () => { api.gold(); g.visible = false; setTimeout(() => g.visible = true, 30000); }, () => g.visible);
  });

  // ---------- 銀條（散落喺小鎮、機場、豪景花園附近；執完 30 秒後再出）----------
  const silverMat = new THREE.MeshStandardMaterial({ color: '#e3e8ee', metalness: 0.95, roughness: 0.18, envMapIntensity: 1.4 });
  const silverBar = () => { const s = new THREE.Group(); const b = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.1, 0.14), silverMat); s.add(b); const t = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.04, 0.09), silverMat); t.position.y = 0.07; s.add(t); s.scale.setScalar(1.6); return s; };
  const silverSpots = [[-6, 0, 2], [15, 0, 2], [-18, 0, -4], [24, 0, -14], [-8, 0, -24], [18, 0, 26], [-35, 0, 14], [40, 0, 10], [-45, 0, -30], [55, 0, -40], [-60, 0, 0], [60, 0, 25],
    [-120, 0, 10], [-200, 0, -20], [200, 0, -50], [350, 0, -100], [600, 0, -60], [900, 0, -140], [1200, 0, -60], [-60, 0, -180], [100, 0, -200],
    [-700, 0, 560], [-850, 0, 620], [-560, 0, 600], [-1000, 0, 520], [-420, 0, 700]];
  silverSpots.forEach(([x, y, z]) => {
    const g = silverBar(); g.position.set(x, y + 0.35, z); scene.add(g);
    updaters.push((dt, t) => { g.rotation.y += dt * 1.5; g.position.y = y + 0.35 + Math.sin(t * 2 + z) * 0.08; });
    inter([x, y, z], 1.2, () => '🥈 拎銀條', () => { api.silver(); g.visible = false; setTimeout(() => g.visible = true, 30000); }, () => g.visible);
  });
  [[45, 0, -5], [-50, 0, 40], [130, 0, 60], [-100, 0, -60], [700, 0, -100], [-650, 0, 650]].forEach(([x, y, z]) => {
    const g = itemMesh('gold'); g.position.set(x, y + 0.35, z); g.scale.setScalar(1.4); scene.add(g);
    updaters.push((dt, t) => { g.rotation.y += dt * 1.5; });
    inter([x, y, z], 1.2, () => '🥇 拎金條', () => { api.gold(); g.visible = false; setTimeout(() => g.visible = true, 30000); }, () => g.visible);
  });

  // ---------- 公廁 ----------
  const TZ0 = 16, TZ1 = 22, TX0 = -4, TX1 = 4, TH = 3.2;
  const tileW = std('#fff', { map: T.tileTex(3, 2, '#e6f0f3', '#c0d3d9') });
  const outW = std('#9fb4a8');
  solid(TX0, 0, TZ1, TX1, TH, TZ1 + 0.2, outW);                 // 後牆
  solid(TX0 - 0.2, 0, TZ0, TX0, TH, TZ1 + 0.2, outW);           // 左牆
  solid(TX1, 0, TZ0, TX1 + 0.2, TH, TZ1 + 0.2, outW);           // 右牆
  solid(TX0, 0, TZ0 - 0.2, -0.75, TH, TZ0, outW);               // 前牆左
  solid(0.75, 0, TZ0 - 0.2, TX1, TH, TZ0, outW);                // 前牆右
  solid(-0.75, 2.3, TZ0 - 0.2, 0.75, TH, TZ0, outW);            // 門頂
  solid(TX0 - 0.3, TH, TZ0 - 0.4, TX1 + 0.3, TH + 0.25, TZ1 + 0.4, std('#6b7d73')); // 屋頂
  groundRect([TX0, TZ0, TX1, TZ1], std('#fff', { map: T.tileTex(1, 1, '#cfd8dc', '#90a4ae') }), 2, 0.01);
  // 內牆瓷磚
  [[TX0 + 0.01, (TZ0 + TZ1) / 2, Math.PI / 2, TZ1 - TZ0], [TX1 - 0.01, (TZ0 + TZ1) / 2, -Math.PI / 2, TZ1 - TZ0]].forEach(([x, z, ry, w]) => {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(w, TH), tileW); p.position.set(x, TH / 2, z); p.rotation.y = ry; scene.add(p);
  });
  const backTile = new THREE.Mesh(new THREE.PlaneGeometry(TX1 - TX0, TH), tileW); backTile.position.set(0, TH / 2, TZ1 - 0.01); backTile.rotation.y = Math.PI; scene.add(backTile);
  const tSign = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.6), new THREE.MeshBasicMaterial({ map: T.signTex('🚹 公廁 TOILET 🚺', '#0d47a1', '#fff', 768, 192, 'bold 80px sans-serif') }));
  tSign.position.set(0, 2.75, TZ0 - 0.22); tSign.rotation.y = Math.PI; scene.add(tSign);
  // 廁格
  const stallM = std('#4f7a8a');
  for (let i = 0; i < 3; i++) {
    const x0 = 0.2 + i * 1.25;
    solid(x0, 0, TZ1 - 1.6, x0 + 0.05, 2.1, TZ1, stallM);
    const bowl = mesh(new THREE.CylinderGeometry(0.2, 0.15, 0.4, 14), std('#fff', { roughness: 0.2 }), x0 + 0.62, 0.2, TZ1 - 0.45);
    const tank = mesh(new THREE.BoxGeometry(0.45, 0.4, 0.18), std('#fff', { roughness: 0.2 }), x0 + 0.62, 0.65, TZ1 - 0.12);
  }
  solid(TX1 - 0.05, 0, TZ1 - 1.6, TX1, 2.1, TZ1, stallM);
  // 洗手盆 + 鏡
  for (let i = 0; i < 2; i++) {
    const z = 17.5 + i * 1.4;
    solid(TX0, 0.8, z - 0.35, TX0 + 0.55, 0.9, z + 0.35, std('#f5f5f5', { roughness: 0.2 }));
    mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.2, 8), std('#ccc', { metalness: 1, roughness: 0.2 }), TX0 + 0.12, 1.0, z);
  }
  const mirror = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.9), std('#bfd9e6', { metalness: 1, roughness: 0.05 }));
  mirror.position.set(TX0 + 0.02, 1.6, 18.2); mirror.rotation.y = Math.PI / 2; scene.add(mirror);
  // 廁所燈 + 燈掣
  const lamp = mesh(new THREE.BoxGeometry(1.2, 0.06, 0.25), new THREE.MeshBasicMaterial({ color: '#555' }), 0, TH - 0.05, 19);
  const tLight = new THREE.PointLight('#fff8e8', 0, 12, 1.2); tLight.position.set(0, TH - 0.4, 19); scene.add(tLight);
  const sw = new THREE.Group(); sw.position.set(1.2, 1.3, TZ0 + 0.02); scene.add(sw);
  mesh(new THREE.BoxGeometry(0.14, 0.2, 0.03), std('#f2f2f2'), 0, 0, 0, sw);
  const toggle = mesh(new THREE.BoxGeometry(0.05, 0.08, 0.04), std('#ff9800'), 0, 0, 0.02, sw);
  inter([1.2, 1, TZ0 + 0.6], 1.3, () => api.toiletLight() ? '💡 熄燈' : '💡 開燈', () => api.setToiletLight(!api.toiletLight()));
  function setToiletLight(on) {
    tLight.intensity = on ? 18 : 0; lamp.material.color.set(on ? '#fffbe6' : '#555'); toggle.position.y = on ? 0.03 : -0.03;
  }
  // 外牆 前方後圓 抽氣扇（喺右邊外牆）
  const fan = new THREE.Group(); fan.position.set(TX1 + 0.2, 2.35, 19); scene.add(fan);
  const fanMetal = std('#cfd4d8', { metalness: 0.6, roughness: 0.35 });
  const housing = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.35, 28), fanMetal); housing.rotation.z = Math.PI / 2; housing.position.x = 0.175; fan.add(housing);
  const plate = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.8, 0.8), fanMetal); plate.position.x = 0.38; fan.add(plate);
  const ringF = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.025, 8, 28), std('#888', { metalness: 0.8 })); ringF.rotation.y = Math.PI / 2; ringF.position.x = 0.42; fan.add(ringF);
  const hole = new THREE.Mesh(new THREE.CircleGeometry(0.3, 28), std('#222')); hole.rotation.y = Math.PI / 2; hole.position.x = 0.412; fan.add(hole);
  const blades = new THREE.Group(); blades.position.x = 0.43; fan.add(blades);
  for (let i = 0; i < 5; i++) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.26, 0.09), std('#e0e0e0', { metalness: 0.5 })); b.position.y = 0.14; const p = new THREE.Group(); p.rotation.x = i / 5 * Math.PI * 2; b.rotation.y = 0.4; p.add(b); blades.add(p); }
  mesh(new THREE.SphereGeometry(0.05, 10, 8), std('#999', { metalness: 0.8 }), 0, 0, 0, blades);
  for (let i = -3; i <= 3; i++) { const bar = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.012, 0.7), std('#aaa', { metalness: 0.7 })); bar.position.set(0.45, i * 0.1, 0); fan.add(bar); }
  updaters.push(dt => { blades.rotation.x += dt * 14; });

  // ---------- 寵物店 + 獸醫診所 ----------
  function shop(cx, cz, label, color, signColor) {
    const x0 = cx - 4, x1 = cx + 4, z0 = cz - 5, z1 = cz + 5, H = 3.6;
    const wm = std(color);
    solid(x0 - 0.2, 0, z0, x0, H, z1, wm);
    solid(x0, 0, z0 - 0.2, x1, H, z0, wm);
    solid(x0, 0, z1, x1, H, z1 + 0.2, wm);
    solid(x1, 0, z0, x1 + 0.2, H, cz - 1.2, wm);
    solid(x1, 0, cz + 1.2, x1 + 0.2, H, z1, wm);
    solid(x1, 2.6, cz - 1.2, x1 + 0.2, H, cz + 1.2, wm);
    solid(x0 - 0.4, H, z0 - 0.4, x1 + 0.6, H + 0.3, z1 + 0.4, std('#555'));
    groundRect([x0, z0, x1, z1], std('#fff', { map: T.woodTex(2) }), 3, 0.01);
    const s = new THREE.Mesh(new THREE.PlaneGeometry(5, 1), new THREE.MeshBasicMaterial({ map: T.signTex(label, signColor, '#fff', 1024, 200, 'bold 84px sans-serif') }));
    s.position.set(x1 + 0.22, 3.1, cz); s.rotation.y = Math.PI / 2; scene.add(s);
    const l = new THREE.PointLight('#fff4e0', 12, 14); l.position.set(cx, H - 0.5, cz); scene.add(l);
    return { x0, x1, z0, z1 };
  }
  const pet = shop(-24, 3, '🐶 寵物店 PET SHOP', '#f6d7a7', '#e65100');
  // 柴犬籠 + 展示柴犬
  solid(pet.x0 + 0.2, 0, 1, pet.x0 + 2.4, 0.7, 1.1, std('#bbb', { metalness: 0.6 }));
  solid(pet.x0 + 2.3, 0, 1, pet.x0 + 2.4, 0.7, 4.5, std('#bbb', { metalness: 0.6 }));
  const showDog = buildShiba(); showDog.position.set(pet.x0 + 1.2, 0, 3); showDog.rotation.y = Math.PI / 2; scene.add(showDog);
  updaters.push((dt, t) => { showDog.userData.tail.rotation.z = Math.sin(t * 8) * 0.5; });
  solid(pet.x1 - 3, 0, pet.z0 + 0.3, pet.x1 - 1, 1.0, pet.z0 + 1, std('#fff', { map: T.woodTex() }));
  inter([pet.x0 + 2.9, 0, 3], 1.8, () => api.hasDog() ? `🐾 寵物店（而家養緊${api.petName()}）` : '🐾 領養寵物（狗 / 貓 / 野獸）', () => api.toggleDog());

  const vet = shop(-24, -12, '🏥 獸醫診所 VET', '#e3f2fd', '#00897b');
  solid(-25, 0, -13, -23, 0.85, -11.8, std('#cfd8dc', { metalness: 0.6, roughness: 0.3 }));
  const cross = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: T.signTex('✚', '#fff', '#00a152', 256, 256, 'bold 220px sans-serif') }));
  cross.position.set(vet.x0 + 0.02, 2.2, -12); cross.rotation.y = Math.PI / 2; scene.add(cross);
  inter([-22.5, 0, -12.4], 1.8, () => '🩺 幫寵物睇醫生', () => api.vet());

  // ---------- 柏熙酒店：見 hotel.js（20 層，可以行樓梯 / 搭 Lift）----------
  // 表演湖 + 噴水池
  const lake = { cx: 55, cz: -72, w: 120, d: 44 };
  const water = new THREE.Mesh(new THREE.PlaneGeometry(lake.w, lake.d), std('#1a6fa0', { metalness: 0.6, roughness: 0.1, transparent: true, opacity: 0.9 }));
  water.rotation.x = -Math.PI / 2; water.position.set(lake.cx, 0.05, lake.cz); scene.add(water);
  const rim = std('#e9dcc0');
  solid(lake.cx - lake.w / 2 - 0.6, 0, lake.cz - lake.d / 2 - 0.6, lake.cx + lake.w / 2 + 0.6, 0.6, lake.cz - lake.d / 2, rim);
  solid(lake.cx - lake.w / 2 - 0.6, 0, lake.cz + lake.d / 2, lake.cx + lake.w / 2 + 0.6, 0.6, lake.cz + lake.d / 2 + 0.6, rim);
  solid(lake.cx - lake.w / 2 - 0.6, 0, lake.cz - lake.d / 2, lake.cx - lake.w / 2, 0.6, lake.cz + lake.d / 2, rim);
  solid(lake.cx + lake.w / 2, 0, lake.cz - lake.d / 2, lake.cx + lake.w / 2 + 0.6, 0.6, lake.cz + lake.d / 2, rim);
  const NJ = 14, PER = 70, fCount = NJ * PER;
  const fGeo = new THREE.BufferGeometry(); const fPos = new Float32Array(fCount * 3); fGeo.setAttribute('position', new THREE.BufferAttribute(fPos, 3));
  const fPts = new THREE.Points(fGeo, new THREE.PointsMaterial({ color: '#dff4ff', size: 0.6, transparent: true, opacity: 0.85, depthWrite: false }));
  fPts.frustumCulled = false; scene.add(fPts);
  updaters.push((dt, t) => {
    for (let j = 0; j < NJ; j++) {
      const jx = lake.cx - lake.w / 2 + 8 + j * ((lake.w - 16) / (NJ - 1)), jz = lake.cz;
      const hgt = 14 + 10 * Math.max(0, Math.sin(t * 0.9 + j * 0.6));
      for (let k = 0; k < PER; k++) {
        const u = ((t * 0.6 + k / PER) % 1);
        const sway = Math.sin(t * 0.7 + j) * 0.3;
        const i3 = (j * PER + k) * 3;
        fPos[i3] = jx + sway * u * 8 + Math.sin(k * 12.9) * 0.4 * u; fPos[i3 + 1] = 4 * hgt * u * (1 - u) + 0.1; fPos[i3 + 2] = jz + Math.cos(k * 7.1) * 0.4 * u;
      }
    }
    fGeo.attributes.position.needsUpdate = true;
  });
  // 金色纜車
  const cabMat = goldMat;
  const pathPt = (s) => new THREE.Vector3(lake.cx + Math.cos(s) * 66, 15, lake.cz + Math.sin(s) * 28);
  const cablePts = []; for (let i = 0; i <= 120; i++) cablePts.push(pathPt(i / 120 * Math.PI * 2));
  scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(cablePts), new THREE.LineBasicMaterial({ color: '#333' })));
  for (let i = 0; i < 8; i++) { const p = pathPt(i / 8 * Math.PI * 2); mesh(new THREE.CylinderGeometry(0.4, 0.6, 15.5, 8), std('#ddd'), p.x, 7.75, p.z); }
  const cabins = [];
  for (let i = 0; i < 12; i++) {
    const c = new THREE.Group(); scene.add(c);
    const body = new THREE.Mesh(new THREE.SphereGeometry(1.4, 16, 12), cabMat); body.scale.set(1, 0.85, 1); body.position.y = -3; c.add(body);
    const win = new THREE.Mesh(new THREE.SphereGeometry(1.42, 16, 6, 0, Math.PI * 2, Math.PI * 0.35, Math.PI * 0.2), std('#222', { roughness: 0.1 })); win.position.y = -3; win.scale.set(1, 0.85, 1); c.add(win);
    mesh(new THREE.CylinderGeometry(0.05, 0.05, 2, 6), std('#333'), 0, -1, 0, c);
    cabins.push(c);
  }
  updaters.push((dt, t) => cabins.forEach((c, i) => { const p = pathPt(t * 0.03 + i / cabins.length * Math.PI * 2); c.position.copy(p); }));

  // ---------- 樹、街燈 ----------
  const treeTrunk = std('#6d4c2f'), treeLeaf = std('#2e7d32');
  const treeSpots = [];
  for (let i = 0; i < 40; i++) { const a = i / 40 * Math.PI * 2; treeSpots.push([Math.cos(a) * (P + 20 + (i % 3) * 15), Math.sin(a) * (P + 20 + (i % 3) * 15)]); }
  [[15, 10], [-15, 14], [18, -20], [-12, -28], [25, 5], [-34, -24]].forEach(s => treeSpots.push(s));
  treeSpots.forEach(([x, z]) => {
    if (x > -30 && x < 140 && z < -40 && z > -160) return;
    if (x < -72 && z > -130 && z < 74) return;   // 遊樂場
    if (nearRoute(x, z, 6)) return;               // 露營車路線
    mesh(new THREE.CylinderGeometry(0.25, 0.35, 3, 8), treeTrunk, x, 1.5, z);
    mesh(new THREE.SphereGeometry(2, 10, 8), treeLeaf, x, 4.2, z);
    addCol(x - 0.35, 0, z - 0.35, x + 0.35, 3, z + 0.35);
  });
  [[-10, 0], [10, 0], [-10, -20], [10, -20], [8, 13]].forEach(([x, z]) => {
    mesh(new THREE.CylinderGeometry(0.08, 0.1, 5, 8), std('#333', { metalness: 0.6 }), x, 2.5, z);
    mesh(new THREE.SphereGeometry(0.3, 10, 8), new THREE.MeshBasicMaterial({ color: '#fff7d6' }), x, 5.1, z);
    addCol(x - 0.12, 0, z - 0.12, x + 0.12, 5, z + 0.12);
  });

  // ================= 天空 / 大氣層 / 太空 =================
  const R = 6371000;
  const earth = new THREE.Mesh(new THREE.SphereGeometry(R, 128, 64), std('#fff', { map: T.earthTex(), roughness: 0.9 }));
  earth.position.set(0, -R - 1.5, 0); earth.rotation.set(Math.PI / 2, 0, 0.4); scene.add(earth);
  const atmo = new THREE.Mesh(new THREE.SphereGeometry(R + 90000, 96, 48), new THREE.MeshBasicMaterial({ color: '#5fa8ff', transparent: true, opacity: 0.28, side: THREE.BackSide, depthWrite: false, fog: false }));
  atmo.position.copy(earth.position); scene.add(atmo);
  const glow = new THREE.Mesh(new THREE.SphereGeometry(R + 30000, 96, 48), new THREE.MeshBasicMaterial({ color: '#8fd0ff', transparent: true, opacity: 0.0, side: THREE.FrontSide, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
  glow.position.copy(earth.position); scene.add(glow);
  // 星星
  const sGeo = new THREE.BufferGeometry(); const sp = [];
  for (let i = 0; i < 3000; i++) { const v = new THREE.Vector3().randomDirection().multiplyScalar(5e6); sp.push(v.x, v.y, v.z); }
  sGeo.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
  const stars = new THREE.Points(sGeo, new THREE.PointsMaterial({ color: '#fff', size: 1.6, sizeAttenuation: false, transparent: true, opacity: 0, depthWrite: false, fog: false }));
  stars.frustumCulled = false; scene.add(stars);
  // 太陽
  const sunDisc = new THREE.Mesh(new THREE.SphereGeometry(40000, 16, 12), new THREE.MeshBasicMaterial({ color: '#fff8d0', fog: false }));
  scene.add(sunDisc);
  // 雲
  const cTex = T.cloudTex();
  const clouds = new THREE.Group(); scene.add(clouds);
  for (let i = 0; i < 40; i++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: cTex, transparent: true, opacity: 0.55 + Math.random() * 0.3, depthWrite: false, fog: false }));
    const r = 150 + Math.random() * 3500, a = Math.random() * Math.PI * 2;
    s.position.set(Math.cos(a) * r, 900 + Math.random() * 2200, Math.sin(a) * r);
    const sc = 250 + Math.random() * 500; s.scale.set(sc, sc * 0.6, 1); clouds.add(s);
  }
  // 飛機
  function airliner() {
    const g = new THREE.Group();
    const white = std('#f4f6f8', { roughness: 0.4 }), blue = std('#1d4f9c');
    const fus = new THREE.Mesh(new THREE.CylinderGeometry(2, 2, 38, 16), white); fus.rotation.x = Math.PI / 2; g.add(fus);
    const nose = new THREE.Mesh(new THREE.SphereGeometry(2, 16, 10), white); nose.position.z = 19; nose.scale.z = 1.8; g.add(nose);
    const tailc = new THREE.Mesh(new THREE.ConeGeometry(2, 8, 16), white); tailc.rotation.x = -Math.PI / 2; tailc.position.z = -23; g.add(tailc);
    const wing = new THREE.Mesh(new THREE.BoxGeometry(36, 0.5, 6), white); wing.position.z = 1; g.add(wing);
    const stab = new THREE.Mesh(new THREE.BoxGeometry(12, 0.4, 3), white); stab.position.z = -22; g.add(stab);
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.4, 8, 5), blue); fin.position.set(0, 4, -22); g.add(fin);
    const stripe = new THREE.Mesh(new THREE.CylinderGeometry(2.02, 2.02, 30, 16, 1, true, -0.4, 0.8), blue); stripe.rotation.x = Math.PI / 2; g.add(stripe);
    [-7, 7].forEach(x => { const e = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 4, 12), std('#999', { metalness: 0.7 })); e.rotation.x = Math.PI / 2; e.position.set(x, -1.2, 3); g.add(e); });
    const red = new THREE.Mesh(new THREE.SphereGeometry(0.6, 8, 6), new THREE.MeshBasicMaterial({ color: '#f00' })); red.position.set(-18, 0, 1); g.add(red);
    const grn = new THREE.Mesh(new THREE.SphereGeometry(0.6, 8, 6), new THREE.MeshBasicMaterial({ color: '#0f0' })); grn.position.set(18, 0, 1); g.add(grn);
    g.userData.lights = [red, grn];
    return g;
  }
  const planes = [600, 1500, 2800, 4500, 6500, 8500, 10500].map((alt, i) => {
    const p = airliner(); scene.add(p);
    return { m: p, alt, r: 140 + (i % 3) * 120, w: (i % 2 ? 1 : -1) * (0.18 - i * 0.012), a: i * 1.3 };
  });
  // 國際太空站
  const iss = new THREE.Group(); const ISS_Y = altOfFloor(ISS_FLOOR) + 4;
  iss.position.set(LIFT_DEF[0].x, ISS_Y, -12 - 75); scene.add(iss);
  const issMetal = std('#d9dde2', { metalness: 0.6, roughness: 0.4 });
  const truss = new THREE.Mesh(new THREE.BoxGeometry(108, 3, 3), issMetal); iss.add(truss);
  const solar = std('#fff', { map: T.solarTex(), metalness: 0.4, roughness: 0.3, side: THREE.DoubleSide });
  [-46, -32, 32, 46].forEach(x => [-1, 1].forEach(s => { const p = new THREE.Mesh(new THREE.BoxGeometry(11, 0.3, 34), solar); p.position.set(x, 0, s * 19); iss.add(p); }));
  for (let i = 0; i < 5; i++) { const m = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.2, 12, 16), issMetal); m.rotation.x = Math.PI / 2; m.position.set(-8 + i * 4, -4, 6 * (i % 2 ? 1 : -1)); iss.add(m); }
  const core = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.2, 40, 16), issMetal); core.rotation.x = Math.PI / 2; core.position.y = -4; iss.add(core);
  const rad = new THREE.Mesh(new THREE.BoxGeometry(4, 0.3, 18), std('#f5f5f5')); rad.position.set(-14, 0, 0); iss.add(rad);
  const issLbl = new THREE.Sprite(new THREE.SpriteMaterial({ map: T.signTex('🛰️ 國際太空站 ISS', '#000', '#fff', 512, 128, 'bold 56px sans-serif'), depthWrite: false, fog: false }));
  issLbl.scale.set(30, 7.5, 1); issLbl.position.y = 22; iss.add(issLbl);
  // 人造衛星
  const sats = [150000, 220000, 300000, 360000].map((y, i) => {
    const s = new THREE.Group(); const b = new THREE.Mesh(new THREE.BoxGeometry(3, 3, 4), goldMat); s.add(b);
    [-1, 1].forEach(k => { const p = new THREE.Mesh(new THREE.BoxGeometry(8, 0.2, 3), solar); p.position.x = k * 6; s.add(p); });
    scene.add(s); return { m: s, y, r: 60 + i * 25, a: i * 2 };
  });

  // 天空顏色
  const C = [[0, '#8ccaf2'], [3000, '#6fb0e8'], [12000, '#2c5f9e'], [30000, '#122a5c'], [60000, '#050b1e'], [100000, '#000000']]
    .map(([a, c]) => [a, new THREE.Color(c)]);
  const skyCol = new THREE.Color();
  function skyColor(a) {
    if (a <= C[0][0]) return skyCol.copy(C[0][1]);
    for (let i = 1; i < C.length; i++) if (a < C[i][0]) return skyCol.copy(C[i - 1][1]).lerp(C[i][1], (a - C[i - 1][0]) / (C[i][0] - C[i - 1][0]));
    return skyCol.copy(C[C.length - 1][1]);
  }
  scene.fog = new THREE.Fog('#8ccaf2', 100, 900);
  scene.background = new THREE.Color('#8ccaf2');
  const ss = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

  let toiletLightOn = false;
  function update(dt, t, player, camera, inToilet) {
    updaters.forEach(f => f(dt, t));
    const a = Math.max(0, camera.position.y);
    skyColor(a);
    scene.background.copy(skyCol);
    scene.fog.color.copy(skyCol);
    scene.fog.near = 150 + a * 1.5; scene.fog.far = a > 15000 ? 1e9 : 1200 + a * 25;
    stars.position.copy(camera.position);
    stars.material.opacity = ss(15000, 80000, a);
    atmo.material.opacity = 0.28 * (1 - ss(5000, 60000, a)) + 0.18 * ss(60000, 200000, a);
    glow.material.opacity = 0.35 * ss(40000, 150000, a);
    farGround.visible = a < 25000;
    clouds.visible = a < 60000;
    sunDisc.position.copy(camera.position).addScaledVector(SUN_DIR, 2e6);
    // 室內暗啲
    const dim = inToilet && !toiletLightOn ? 0.12 : (player.y < -1 ? 0.3 : 1);
    hemi.intensity = 0.9 * dim; sun.intensity = 2.2 * dim;
    sun.position.copy(player).addScaledVector(SUN_DIR, 80); sun.target.position.copy(player);
    planes.forEach(p => {
      p.a += p.w * dt;
      p.m.position.set(LIFT_DEF[0].x + Math.cos(p.a) * p.r, p.alt, -12 + Math.sin(p.a) * p.r);
      p.m.rotation.set(0, -p.a + (p.w > 0 ? 0 : Math.PI), (p.w > 0 ? 1 : -1) * 0.25);
      const blink = Math.sin(t * 6) > 0.6; p.m.userData.lights.forEach(l => l.visible = blink);
    });
    iss.rotation.y = t * 0.03;
    sats.forEach(s => { s.a += dt * 0.08; s.m.position.set(Math.cos(s.a) * s.r, s.y, -12 + Math.sin(s.a) * s.r); s.m.rotation.y = s.a; });
  }

  return {
    colliders, interactables, update, hemi, sun,
    setToiletLight(on) { toiletLightOn = on; setToiletLight(on); },
    toiletBounds: { x0: TX0, x1: TX1, z0: TZ0, z1: TZ1, y1: TH },
    alarm(sec = 5) { alarmUntil = performance.now() + sec * 1000; },
    pillarX,
  };
}
