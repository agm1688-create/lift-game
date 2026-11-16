// 打怪獸場：喺機甲基地變身做巨型機甲，同原創巨型怪獸打交（怪獸由伺服器控制，所有玩家打同一隻）
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { ARENA } from './city.js';
import { IM, signMat, sign } from './interiors.js';

const V3 = THREE.Vector3;
const std = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.6, ...extra });
export const STAGE = { x0: -2050, x1: -1400, z0: -450, z1: 250 };
export const KAIJU = [
  { name: '雷鱗巨獸', color: '#4b5d43', glow: '#ff5722' },
  { name: '刀鉗海怪', color: '#6a3d7a', glow: '#76ff03' },
  { name: '雙翼骨龍', color: '#5d4037', glow: '#40c4ff' },
];
export const inStage = p => p.x > STAGE.x0 && p.x < STAGE.x1 && p.z > STAGE.z0 && p.z < STAGE.z1;

// ---------- 機甲（原創：鋼鐵守護者）----------
export function buildMech() {
  const g = new THREE.Group(), S = 16;               // 大約 28 米高
  const armor = std('#cfd8dc', { metalness: 0.75, roughness: 0.3 }), blue = std('#1565c0', { metalness: 0.6, roughness: 0.35 }), dark = std('#263238', { metalness: 0.6 }), glow = new THREE.MeshStandardMaterial({ color: '#80d8ff', emissive: '#40c4ff', emissiveIntensity: 2 }), gold = std('#ffc107', { metalness: 0.8, roughness: 0.25 });
  const add = (p, geo, m, x, y, z) => { const o = new THREE.Mesh(geo, m); o.position.set(x * S / 16, y * S / 16, z * S / 16); o.scale.setScalar(S / 16); o.castShadow = true; p.add(o); return o; };
  const body = new THREE.Group(); g.add(body);
  add(body, new THREE.BoxGeometry(7, 6, 4), armor, 0, 19, 0);
  add(body, new THREE.BoxGeometry(5, 3, 3.2), blue, 0, 15, 0);
  add(body, new THREE.CylinderGeometry(1.1, 1.1, 0.6, 16), glow, 0, 19.5, 2.1).rotation.x = Math.PI / 2;
  add(body, new THREE.BoxGeometry(3, 2.6, 3), blue, 0, 23.3, 0);
  const head = new THREE.Group(); head.position.set(0, 24.6 * S / 16, 0); body.add(head);
  add(head, new THREE.BoxGeometry(2.4, 2.2, 2.6), armor, 0, 0.6, 0); add(head, new THREE.BoxGeometry(2.0, 0.5, 0.2), glow, 0, 0.8, 1.32); add(head, new THREE.BoxGeometry(0.3, 1.4, 0.3), gold, 0, 2.2, 0);
  add(body, new THREE.BoxGeometry(2.5, 6, 2), dark, 0, 19, -2.8);                               // 背囊
  [-0.9, 0.9].forEach(x => add(body, new THREE.CylinderGeometry(0.6, 0.8, 1, 12), glow, x, 15.7, -3));
  const limbs = {};
  [-1, 1].forEach(s => {
    const arm = new THREE.Group(); arm.position.set(s * 4.6 * S / 16, 21 * S / 16, 0); body.add(arm);
    add(arm, new THREE.BoxGeometry(3.2, 2.6, 3.4), blue, s * 0.4, 0.4, 0);                         // 膊頭甲
    add(arm, new THREE.BoxGeometry(1.8, 5, 1.8), armor, 0, -3, 0);
    add(arm, new THREE.BoxGeometry(2.2, 4, 2.2), blue, 0, -7.2, 0);
    add(arm, new THREE.BoxGeometry(2.4, 2.2, 2.4), dark, 0, -10.2, 0);                             // 拳頭
    limbs[s < 0 ? 'armL' : 'armR'] = arm;
    const leg = new THREE.Group(); leg.position.set(s * 1.9 * S / 16, 13.5 * S / 16, 0); g.add(leg);
    add(leg, new THREE.BoxGeometry(2.6, 6, 2.6), armor, 0, -3, 0);
    add(leg, new THREE.BoxGeometry(2.9, 6, 3), blue, 0, -9, 0.2);
    add(leg, new THREE.BoxGeometry(3.2, 1.5, 4.6), dark, 0, -12.8, 0.6);
    limbs[s < 0 ? 'legL' : 'legR'] = leg;
  });
  g.userData = { body, head, ...limbs, phase: 0, height: 26 * S / 16 };
  return g;
}
export function animateMech(m, moving, dt, punchT, beamT) {
  const u = m.userData;
  u.phase = moving ? u.phase + dt * 5 : u.phase * 0.9;
  const s = Math.sin(u.phase);
  u.legL.rotation.x = s * 0.5; u.legR.rotation.x = -s * 0.5;
  u.armL.rotation.x = -s * 0.35; u.armR.rotation.x = s * 0.35;
  u.body.position.y = moving ? Math.abs(Math.cos(u.phase)) * 0.4 : 0;
  if (punchT > 0) { const k = Math.sin(Math.min(1, punchT / 0.5) * Math.PI); u.armR.rotation.x = -1.6 * k; u.body.rotation.y = -0.3 * k; } else u.body.rotation.y = 0;
  if (beamT > 0) { u.armL.rotation.x = u.armR.rotation.x = -1.3; }
}

// ---------- 原創巨型怪獸 ----------
export function buildKaiju(type) {
  const k = KAIJU[type], g = new THREE.Group(), skin = std(k.color, { roughness: 0.85 }), belly = std('#9e9d7a', { roughness: 0.9 }), glow = new THREE.MeshStandardMaterial({ color: k.glow, emissive: k.glow, emissiveIntensity: 1.6 }), horn = std('#e0d6c0');
  const add = (p, geo, m, x, y, z, rx = 0, ry = 0, rz = 0) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.rotation.set(rx, ry, rz); o.castShadow = true; p.add(o); return o; };
  const body = new THREE.Group(); g.add(body);
  const head = new THREE.Group(); const jaw = new THREE.Group(); const legs = []; const tail = []; const extra = {};
  if (type === 0) {
    // 雷鱗巨獸：企直嘅爬蟲，背上有發光鱗片、頭上有角
    add(body, new THREE.SphereGeometry(9, 16, 12), skin, 0, 26, 0).scale.set(1, 1.5, 0.9);
    add(body, new THREE.SphereGeometry(7, 14, 10), belly, 0, 24, 3.5).scale.set(0.9, 1.4, 0.6);
    head.position.set(0, 42, 4); body.add(head);
    add(head, new THREE.BoxGeometry(7, 6, 9), skin, 0, 0, 2); add(head, new THREE.ConeGeometry(1, 5, 8), horn, -2.5, 4.5, 0, -0.4); add(head, new THREE.ConeGeometry(1, 5, 8), horn, 2.5, 4.5, 0, -0.4);
    [-2, 2].forEach(x => add(head, new THREE.SphereGeometry(0.8, 8, 6), glow, x, 1.2, 6.4));
    jaw.position.set(0, -2.5, 3); head.add(jaw); add(jaw, new THREE.BoxGeometry(6, 1.6, 7), skin, 0, 0, 1.5);
    for (let i = 0; i < 7; i++) add(body, new THREE.ConeGeometry(1.6 - i * 0.12, 5, 5), glow, 0, 38 - i * 4, -7.5 + i * 0.3, -0.5);
    [-1, 1].forEach(s => { const a = new THREE.Group(); a.position.set(s * 8, 31, 3); body.add(a); add(a, new THREE.BoxGeometry(2.5, 9, 2.5), skin, 0, -4, 1, 0.6); add(a, new THREE.ConeGeometry(0.8, 2.5, 6), horn, 0, -9, 4.5, 2.2); extra[s < 0 ? 'armL' : 'armR'] = a; });
  } else if (type === 1) {
    // 刀鉗海怪：好闊嘅殼，兩隻巨鉗
    add(body, new THREE.SphereGeometry(13, 18, 10), skin, 0, 18, 0).scale.set(1.3, 0.6, 1);
    for (let i = 0; i < 9; i++) add(body, new THREE.ConeGeometry(1.4, 4, 6), glow, -12 + i * 3, 25, -2 + (i % 2) * 3);
    head.position.set(0, 22, 11); body.add(head);
    add(head, new THREE.SphereGeometry(4, 12, 8), skin, 0, 0, 0); [-2, 2].forEach(x => { add(head, new THREE.CylinderGeometry(0.4, 0.4, 4, 6), skin, x, 3, 0); add(head, new THREE.SphereGeometry(1, 8, 6), glow, x, 5.2, 0); });
    jaw.position.set(0, -2, 2); head.add(jaw); add(jaw, new THREE.BoxGeometry(4, 1, 3), belly, 0, 0, 1);
    [-1, 1].forEach(s => {
      const a = new THREE.Group(); a.position.set(s * 13, 20, 8); body.add(a);
      add(a, new THREE.BoxGeometry(3, 3, 12), skin, 0, 0, 5, 0, -s * 0.3); const c1 = add(a, new THREE.BoxGeometry(5, 3, 9), skin, s * 3, 1.5, 13); const c2 = add(a, new THREE.BoxGeometry(4, 2, 8), belly, s * 3, -1.5, 13);
      extra[s < 0 ? 'armL' : 'armR'] = a;
    });
  } else {
    // 雙翼骨龍：四足 + 一對巨翼
    add(body, new THREE.SphereGeometry(10, 16, 12), skin, 0, 22, 0).scale.set(0.9, 0.8, 1.5);
    head.position.set(0, 30, 16); body.add(head);
    add(head, new THREE.ConeGeometry(3.5, 10, 8), skin, 0, 0, 3, Math.PI / 2); [-1.5, 1.5].forEach(x => add(head, new THREE.SphereGeometry(0.7, 8, 6), glow, x, 1.2, 2));
    add(head, new THREE.ConeGeometry(0.8, 6, 6), horn, 0, 3, -2, -0.9);
    jaw.position.set(0, -2, 3); head.add(jaw); add(jaw, new THREE.ConeGeometry(2.4, 8, 8), belly, 0, 0, 2, Math.PI / 2);
    [-1, 1].forEach(s => {
      const w = new THREE.Group(); w.position.set(s * 6, 28, 0); body.add(w);
      const wg = new THREE.BufferGeometry(); wg.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 4, s * 30, 6, -6, s * 24, -4, -12, 0, 0, -6], 3)); wg.setIndex([0, 1, 2, 0, 2, 3]); wg.computeVertexNormals();
      add(w, wg, new THREE.MeshStandardMaterial({ color: k.color, side: THREE.DoubleSide, roughness: 0.8 }), 0, 0, 0);
      add(w, new THREE.CylinderGeometry(0.4, 0.4, 30, 6), horn, s * 15, 3, -1, 0, 0, Math.PI / 2 - s * 0.2);
      extra[s < 0 ? 'wingL' : 'wingR'] = w;
    });
  }
  // 腳 + 尾
  const legPos = type === 2 ? [[-6, 8], [6, 8], [-6, -8], [6, -8]] : type === 1 ? [[-12, 6], [12, 6], [-12, -6], [12, -6], [-8, 0], [8, 0]] : [[-5, 0], [5, 0]];
  legPos.forEach(([x, z]) => { const l = new THREE.Group(); l.position.set(x, type === 0 ? 16 : 14, z); g.add(l); add(l, new THREE.CylinderGeometry(type === 0 ? 3.2 : 1.6, type === 0 ? 2.6 : 1.2, type === 0 ? 16 : 14, 10), skin, 0, type === 0 ? -8 : -7, 0, type === 1 ? 0.3 * Math.sign(x) : 0); legs.push(l); });
  let parent = body, tz = type === 2 ? -14 : -8;
  for (let i = 0; i < 8; i++) { const seg = new THREE.Group(); seg.position.set(0, i === 0 ? (type === 0 ? 18 : 20) : -0.3, i === 0 ? tz : -4.2); parent.add(seg); add(seg, new THREE.SphereGeometry(Math.max(1, 4.2 - i * 0.45), 10, 8), skin, 0, 0, -2).scale.set(1, 0.9, 1.4); if (type === 0 && i < 6) add(seg, new THREE.ConeGeometry(0.9, 3, 5), glow, 0, 3, -2, -0.6); tail.push(seg); parent = seg; }
  if (type === 1) tail.forEach(t => t.visible = false);
  g.userData = { body, head, jaw, legs, tail, ...extra, type, height: type === 1 ? 32 : 50 };
  return g;
}

function animateKaiju(k, st, t, dt) {
  const u = k.userData, el = Math.max(0, t - st.t0 / 1000);
  const walk = st.s === 'walk';
  u.legs.forEach((l, i) => l.rotation.x = walk ? Math.sin(t * 2.2 + i * Math.PI) * 0.35 : 0);
  u.tail.forEach((s, i) => { s.rotation.y = Math.sin(t * 1.2 - i * 0.5) * 0.12 + (st.s === 'swipe' ? Math.sin(Math.min(1, el / 1.4) * Math.PI) * 0.35 : 0); });
  u.body.position.y = walk ? Math.abs(Math.sin(t * 2.2)) * 0.8 : 0;
  u.head.rotation.x = st.s === 'roar' ? -0.5 : st.s === 'beam' ? -0.15 : Math.sin(t * 0.8) * 0.05;
  u.jaw.rotation.x = st.s === 'roar' || st.s === 'beam' ? 0.5 : 0.05 + Math.sin(t * 3) * 0.03;
  if (u.armL) { const sw = st.s === 'swipe' ? Math.sin(Math.min(1, el / 1.2) * Math.PI) : 0; u.armL.rotation.x = -sw * 1.2; u.armR.rotation.x = -sw * 1.2 + Math.sin(t) * 0.05; }
  if (u.wingL) { const f = Math.sin(t * (st.s === 'swipe' ? 6 : 1.5)) * (st.s === 'swipe' ? 0.6 : 0.15); u.wingL.rotation.z = f; u.wingR.rotation.z = -f; }
  k.rotation.z = 0;
  if (st.s === 'dead') { const f = Math.min(1, el / 2.5); k.rotation.z = f * 1.45; k.position.y = -f * 6; }
  else k.position.y = 0;
}

export function buildArena(scene, api) {
  const root = new THREE.Group(); scene.add(root);
  const cols = [], parts = new Map(), inter = [];
  const B = { cols, add(g, m) { if (!parts.has(m)) parts.set(m, []); parts.get(m).push(g); }, box(x0, y0, z0, x1, y1, z1, m, col = true) { const g = new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0); g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2); this.add(g, m); if (col) cols.push({ min: [x0, y0, z0], max: [x1, y1, z1] }); } };
  const S = STAGE, wallM = std('#5f6368'), ground = std('#6d6a62', { roughness: 1 }), rubble = std('#8a8580'), burnt = std('#3a3a3a');
  const pl = (x0, z0, x1, z1, y, m) => { const g = new THREE.PlaneGeometry(x1 - x0, z1 - z0); g.rotateX(-Math.PI / 2); g.translate((x0 + x1) / 2, y, (z0 + z1) / 2); B.add(g, m); };
  pl(ARENA.x0, ARENA.z0, ARENA.x1, ARENA.z1, 0.005, std('#7c8a6a'));
  pl(S.x0, S.z0, S.x1, S.z1, 0.01, ground);
  // 圍牆（東面有大閘，機甲行得出入）
  const WH = 34, t = 4;
  B.box(S.x0 - t, 0, S.z0 - t, S.x1 + t, WH, S.z0, wallM); B.box(S.x0 - t, 0, S.z1, S.x1 + t, WH, S.z1 + t, wallM); B.box(S.x0 - t, 0, S.z0, S.x0, WH, S.z1, wallM);
  B.box(S.x1, 0, S.z0, S.x1 + t, WH, -130, wallM); B.box(S.x1, 0, -70, S.x1 + t, WH, S.z1, wallM); B.box(S.x1, WH - 2, -130, S.x1 + t, WH, -70, std('#ffc107'), false);
  for (let x = S.x0; x < S.x1; x += 40) [S.z0 - t, S.z1 + t].forEach(z => B.box(x, WH, z - 1, x + 20, WH + 3, z + 1, std('#ffc107'), false));
  sign(B, S.x1 + t + 0.1, WH - 6, -100, 50, 6, signMat('⚔ 怪獸決戰場 KAIJU ARENA', '#b71c1c'), '+x');
  // 頹垣敗瓦（裝飾，冇碰撞）
  let seed = 7; const R = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let k = 0; k < 40; k++) {
    const x = S.x0 + 30 + R() * (S.x1 - S.x0 - 60), z = S.z0 + 30 + R() * (S.z1 - S.z0 - 60);
    if (Math.hypot(x - (S.x0 + S.x1) / 2, z + 100) < 90) continue;
    const w = 10 + R() * 16, d = 10 + R() * 16, h = 5 + R() * 13;
    B.box(x, 0, z, x + w, h, z + d, R() < 0.5 ? burnt : rubble, false);
    for (let j = 0; j < 4; j++) B.box(x + R() * w, h, z + R() * d, x + R() * w + 3, h + 2 + R() * 6, z + R() * d + 3, rubble, false);
    for (let j = 0; j < 6; j++) { const rx = x + w + R() * 15, rz = z + R() * d; B.box(rx, 0, rz, rx + 2 + R() * 4, 1 + R() * 2, rz + 2 + R() * 4, rubble, false); }
  }
  // 火（發光）
  const fire = new THREE.MeshStandardMaterial({ color: '#ff6d00', emissive: '#ff3d00', emissiveIntensity: 2 });
  for (let k = 0; k < 18; k++) { const g = new THREE.ConeGeometry(2 + R() * 2, 5 + R() * 6, 6); g.translate(S.x0 + 40 + R() * (S.x1 - S.x0 - 80), 3, S.z0 + 40 + R() * (S.z1 - S.z0 - 80)); B.add(g, fire); }
  // 海灣
  const bay = new THREE.CircleGeometry(90, 30); bay.rotateX(-Math.PI / 2); bay.translate(S.x0 + 120, 0.03, S.z0 + 130); B.add(bay, std('#1e5a7a', { metalness: 0.4, roughness: 0.15 }));

  // ===== 機甲基地（入得：巨型機甲 + 控制台）=====
  const bx0 = -1392, bx1 = -1320, bz0 = -150, bz1 = -50, BH = 36, bw = std('#455a64', { metalness: 0.4 });
  B.box(bx0, 0, bz0, bx1, BH, bz0 + 1, bw); B.box(bx0, 0, bz1 - 1, bx1, BH, bz1, bw); B.box(bx1 - 1, 0, bz0, bx1, BH, bz1, bw);
  B.box(bx0, 0, bz0, bx0 + 1, BH, -110, bw); B.box(bx0, 0, -90, bx0 + 1, BH, bz1, bw); B.box(bx0, 6, -110, bx0 + 1, BH, -90, bw);
  B.box(bx0, BH, bz0, bx1, BH + 1, bz1, bw);
  const bc = new THREE.PlaneGeometry(bx1 - bx0, bz1 - bz0); bc.rotateX(Math.PI / 2); bc.translate((bx0 + bx1) / 2, BH - 0.02, (bz0 + bz1) / 2); B.add(bc, IM.ceiling);
  pl(bx0, bz0, bx1, bz1, 0.02, std('#90a4ae'));
  for (let x = bx0 + 8; x < bx1; x += 12) for (let z = bz0 + 10; z < bz1; z += 20) B.box(x - 1, BH - 0.1, z - 1, x + 1, BH - 0.05, z + 1, IM.light, false);
  for (let k = 0; k < 4; k++) { const z = bz0 + 15 + k * 6; B.box(bx0 + 8, 0, z, bx0 + 11, 1.0, z + 3, IM.dark); B.box(bx0 + 8.2, 1.0, z + 0.3, bx0 + 8.3, 2.0, z + 2.7, IM.screen, false); }
  sign(B, bx0 - 0.1, 9, -100, 30, 3.5, signMat('🤖 機甲基地 MECH BASE', '#0d47a1'), '-x');
  sign(B, bx1 - 1.1, 20, -100, 30, 3, signMat('入去撳「變身機甲」，再行出西面大閘去打怪獸！', '#263238', '#fff', 'bold 30px sans-serif'), '-x');
  for (const [m, list] of parts) { const mesh = new THREE.Mesh(mergeGeometries(list, false), m); mesh.receiveShadow = true; root.add(mesh); }
  const statue = buildMech(); statue.position.set(-1345, 0, -100); statue.rotation.y = -Math.PI / 2; root.add(statue);
  inter.push({ pos: new V3(-1365, 0, -100), r: 6, label: () => '🤖 變身機甲', act: () => api.toMech() });

  // ===== 怪獸（伺服器狀態）=====
  const kaijus = [0, 1, 2].map(t => { const k = buildKaiju(t); k.visible = false; root.add(k); return k; });
  const beamGeo = new THREE.CylinderGeometry(1.4, 1.4, 1, 10, 1, true); beamGeo.translate(0, 0.5, 0); beamGeo.rotateX(Math.PI / 2);
  const mBeam = new THREE.Mesh(beamGeo, new THREE.MeshBasicMaterial({ color: '#ff9100', transparent: true, opacity: 0.8 })); mBeam.visible = false; root.add(mBeam);
  const pBeam = new THREE.Mesh(beamGeo, new THREE.MeshBasicMaterial({ color: '#80d8ff', transparent: true, opacity: 0.85 })); pBeam.visible = false; root.add(pBeam);
  const mon = { st: null, pos: new V3(-1725, 0, -100), r: 0 };
  const tmp = new V3();
  function setMonster(st) { mon.st = st; }
  function update(dt, T, p, targetPos) {
    const near = Math.abs(p.x - (ARENA.x0 + ARENA.x1) / 2) < 1600 && Math.abs(p.z - (ARENA.z0 + ARENA.z1) / 2) < 1600;
    root.visible = near || p.y > 300;
    const st = mon.st; if (!st || !root.visible) return;
    kaijus.forEach((k, i) => k.visible = i === st.ty);
    const k = kaijus[st.ty];
    tmp.set(st.x, 0, st.z); if (mon.pos.distanceTo(tmp) > 60) mon.pos.copy(tmp); else mon.pos.lerp(tmp, Math.min(1, dt * 4));
    let df = st.r - mon.r; df = Math.atan2(Math.sin(df), Math.cos(df)); mon.r += df * Math.min(1, dt * 4);
    k.position.x = mon.pos.x; k.position.z = mon.pos.z; k.rotation.y = mon.r;
    animateKaiju(k, st, T / 1000, dt);
    // 怪獸光線
    const el = T / 1000 - st.t0 / 1000;
    mBeam.material.color.set(KAIJU[st.ty].glow);
    if (st.s === 'beam' && el > 0.9 && el < 2.3 && targetPos) {
      k.userData.head.getWorldPosition(tmp);
      const to = targetPos.clone().add(new V3(0, 15, 0)), len = tmp.distanceTo(to);
      mBeam.visible = true; mBeam.position.copy(tmp); mBeam.lookAt(to); mBeam.scale.set(1 + Math.sin(T / 30) * 0.3, 1 + Math.sin(T / 30) * 0.3, len);
    } else mBeam.visible = false;
  }
  function fireBeam(from, to, on) {
    pBeam.visible = on; if (!on) return;
    pBeam.position.copy(from); pBeam.lookAt(to); pBeam.scale.set(0.8, 0.8, from.distanceTo(to));
  }
  return { colliders: cols, interactables: inter, update, setMonster, mon, fireBeam, gate: new V3(-1425, 0.1, -100), base: new V3(-1380, 0.1, -100) };
}
