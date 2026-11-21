// 角色 + 柴犬模型（低多邊形）
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

export const SKINS = ['#ffe0c4', '#f1c27d', '#e0ac69', '#c68642', '#8d5524', '#5a3a22'];
export const SHIRTS = ['#e53935', '#1e88e5', '#43a047', '#fdd835', '#8e24aa', '#ff7043', '#212121', '#ffffff'];
export const HATS = [
  { id: 'gold', name: '黃金帽' }, { id: 'crown', name: '黃金皇冠' }, { id: 'cap', name: '鴨舌帽' },
  { id: 'beanie', name: '冷帽' }, { id: 'none', name: '無帽' },
];

const box = (w, h, d, mat) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
const std = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.7, ...extra });
export const goldMat = new THREE.MeshStandardMaterial({ color: '#ffc83d', metalness: 0.85, roughness: 0.25, emissive: '#6a4400', emissiveIntensity: 0.45 });

function hatMesh(id) {
  const g = new THREE.Group();
  if (id === 'gold') {
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.03, 24), goldMat);
    const top = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.21, 0.32, 24), goldMat); top.position.y = 0.16;
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.215, 0.215, 0.06, 24), std('#7a1010')); band.position.y = 0.05;
    g.add(brim, top, band);
  } else if (id === 'crown') {
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.12, 20, 1, true), goldMat); ring.material.side = THREE.DoubleSide; ring.position.y = 0.06;
    g.add(ring);
    for (let i = 0; i < 6; i++) {
      const s = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.14, 4), goldMat); const a = i / 6 * Math.PI * 2;
      s.position.set(Math.cos(a) * 0.2, 0.18, Math.sin(a) * 0.2); g.add(s);
      const gem = new THREE.Mesh(new THREE.SphereGeometry(0.025, 8, 6), std(i % 2 ? '#e0102a' : '#1060e0', { emissive: i % 2 ? '#600' : '#003', roughness: 0.2 }));
      gem.position.set(Math.cos(a) * 0.225, 0.06, Math.sin(a) * 0.225); g.add(gem);
    }
  } else if (id === 'cap') {
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), std('#1565c0')); g.add(dome);
    const peak = box(0.26, 0.025, 0.2, std('#0d47a1')); peak.position.set(0, 0.01, 0.2); g.add(peak);
  } else if (id === 'beanie') {
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.225, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), std('#c62828')); dome.scale.y = 1.2; g.add(dome);
    const pom = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), std('#fff')); pom.position.y = 0.27; g.add(pom);
  }
  return g;
}

// ---------- 共用幾何 / 材質（好多角色都用同一份，慳記憶體）----------
const GEO = new Map(), MATS = new Map();
const geo = (key, make) => { if (!GEO.has(key)) GEO.set(key, make()); return GEO.get(key); };
const mat = (color, extra) => { const k = color + (extra ? JSON.stringify(extra) : ''); if (!MATS.has(k)) MATS.set(k, std(color, extra)); return MATS.get(k); };
const rbox = (w, h, d, r) => geo(`rb${w},${h},${d},${r}`, () => new RoundedBoxGeometry(w, h, d, 2, r));
const shade = (hex, f) => '#' + new THREE.Color(hex).multiplyScalar(f).getHexString();
export const HAIRS = ['#1b1b1b', '#4e2a12', '#8d5524', '#d9a441', '#c0392b', '#7e57c2'];
export const PANTS = ['#2f3e5c', '#263238', '#5d4037', '#455a64', '#1565c0', '#ad1457'];

// 塊面：透明 canvas 畫眼（有反光）、眉、笑口、腮紅；按性別快取
const FACES = new Map();
function faceMat(gender) {
  if (FACES.has(gender)) return FACES.get(gender);
  const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
  const f = gender === 'f';
  g.fillStyle = 'rgba(255,120,130,0.35)';
  [[28, 84], [100, 84]].forEach(([x, y]) => { g.beginPath(); g.ellipse(x, y, 13, 8, 0, 0, 7); g.fill(); });
  [[42, 62], [86, 62]].forEach(([x, y]) => {
    g.fillStyle = '#1d1d2b'; g.beginPath(); g.ellipse(x, y, 9, f ? 12 : 11, 0, 0, 7); g.fill();
    g.fillStyle = '#3d6fd6'; g.beginPath(); g.ellipse(x, y + 3, 6, 7, 0, 0, 7); g.fill();
    g.fillStyle = '#fff'; g.beginPath(); g.arc(x - 3, y - 4, 3.6, 0, 7); g.fill(); g.beginPath(); g.arc(x + 3, y + 4, 1.6, 0, 7); g.fill();
    if (f) { g.strokeStyle = '#1d1d2b'; g.lineWidth = 2.5; g.beginPath(); g.moveTo(x - 9, y - 9); g.lineTo(x - 14, y - 13); g.moveTo(x + 9, y - 9); g.lineTo(x + 14, y - 13); g.stroke(); }
  });
  g.strokeStyle = f ? '#5a3a22' : '#2b1d14'; g.lineWidth = f ? 3 : 4.5; g.lineCap = 'round';
  [[42, 1], [86, -1]].forEach(([x, s]) => { g.beginPath(); g.moveTo(x - 10, 42 + s * 2); g.quadraticCurveTo(x, 35, x + 10, 42 - s * 2); g.stroke(); });
  g.strokeStyle = '#7a2a2a'; g.lineWidth = 4; g.beginPath(); g.arc(64, 84, 13, 0.2 * Math.PI, 0.8 * Math.PI); g.stroke();
  if (f) { g.fillStyle = 'rgba(220,60,90,0.5)'; g.beginPath(); g.arc(64, 93, 5, 0, Math.PI); g.fill(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.MeshStandardMaterial({ map: t, transparent: true, alphaTest: 0.05, roughness: 0.6 });
  FACES.set(gender, m); return m;
}

// look = {gender:'m'|'f', skin, shirt, hat, hair?, pants?}
export function buildAvatar(look = {}) {
  const f = look.gender === 'f';
  const skinC = look.skin || SKINS[0], shirtC = look.shirt || SHIRTS[1];
  const skin = mat(skinC), shirt = mat(shirtC, { roughness: 0.85 }), shirtDark = mat(shade(shirtC, 0.78), { roughness: 0.85 });
  const pantsMat = mat(look.pants || (f ? '#37474f' : '#2f3e5c'), { roughness: 0.9 });
  const hairMat = mat(look.hair || (f ? '#4e2a12' : '#1b1b1b'), { roughness: 0.6 });
  const white = mat('#f5f5f5'), shoeMat = mat(f ? '#c2185b' : '#263238', { roughness: 0.5 });
  const root = new THREE.Group();
  const body = new THREE.Group(); root.add(body);
  const add = (g, m, x, y, z, parent = body) => { const o = new THREE.Mesh(g, m); o.position.set(x, y, z); parent.add(o); return o; };

  // 身（圓角）+ 衫領 + 鈕 + 皮帶
  const tw = f ? 0.48 : 0.54;
  add(rbox(tw, 0.52, 0.29, 0.07), shirt, 0, 1.04, 0);
  add(rbox(tw + 0.02, 0.1, 0.31, 0.04), shirtDark, 0, 0.83, 0);
  add(geo('collarL', () => new THREE.BoxGeometry(0.13, 0.05, 0.02).rotateZ(-0.5)), white, -0.06, 1.27, 0.15);
  add(geo('collarR', () => new THREE.BoxGeometry(0.13, 0.05, 0.02).rotateZ(0.5)), white, 0.06, 1.27, 0.15);
  [1.16, 1.06, 0.96].forEach(y => add(geo('btn', () => new THREE.CylinderGeometry(0.014, 0.014, 0.01, 8).rotateX(Math.PI / 2)), white, 0, y, 0.148));
  if (!f) { add(rbox(tw + 0.01, 0.06, 0.3, 0.02), mat('#3e2723'), 0, 0.79, 0); add(geo('buckle', () => new THREE.BoxGeometry(0.07, 0.05, 0.02)), goldMat, 0, 0.79, 0.155); }
  // 頸 + 圓角大頭 + 塊面 + 耳仔
  add(geo('neck', () => new THREE.CylinderGeometry(0.08, 0.09, 0.08, 10)), skin, 0, 1.31, 0);
  add(rbox(0.44, 0.42, 0.4, 0.12), skin, 0, 1.53, 0);
  add(geo('face', () => new THREE.PlaneGeometry(0.36, 0.36)), faceMat(f ? 'f' : 'm'), 0, 1.51, 0.202);
  [-1, 1].forEach(s => add(geo('ear', () => new THREE.SphereGeometry(0.05, 8, 6)), skin, s * 0.225, 1.52, 0).scale.set(0.5, 1, 0.8));
  // 頭髮：男仔短髮有啲尖；女仔長髮 + 瀏海 + 馬尾 + 蝴蝶結
  add(rbox(0.47, 0.15, 0.43, 0.07), hairMat, 0, 1.7, -0.005);
  if (f) {
    add(rbox(0.48, 0.56, 0.12, 0.05), hairMat, 0, 1.44, -0.17);
    [-1, 1].forEach(s => add(rbox(0.07, 0.4, 0.3, 0.03), hairMat, s * 0.235, 1.5, -0.02));
    add(rbox(0.36, 0.08, 0.06, 0.03), hairMat, 0.02, 1.67, 0.19).rotation.z = -0.15;
    add(geo('tail', () => new THREE.CylinderGeometry(0.07, 0.03, 0.34, 8)), hairMat, 0, 1.42, -0.27).rotation.x = 0.3;
    add(geo('bow', () => new THREE.SphereGeometry(0.06, 8, 6)), mat('#ff4081'), 0, 1.6, -0.25).scale.set(1.6, 0.8, 0.8);
  } else {
    add(rbox(0.47, 0.26, 0.1, 0.04), hairMat, 0, 1.6, -0.17);
    [-1, 1].forEach(s => add(rbox(0.06, 0.16, 0.24, 0.03), hairMat, s * 0.23, 1.62, -0.06));
    for (let i = -2; i <= 2; i++) add(geo('spike', () => new THREE.ConeGeometry(0.06, 0.12, 5)), hairMat, i * 0.08, 1.71, 0.17).rotation.x = 1.1;
  }
  const hat = hatMesh(look.hat || 'gold'); hat.position.y = 1.74; hat.scale.setScalar(1.22); body.add(hat);

  // 手腳（關節喺膊頭 / 髖位）
  const pivot = (x, y) => { const p = new THREE.Group(); p.position.set(x, y, 0); body.add(p); return p; };
  const sx = tw / 2 + 0.08;
  const armL = pivot(-sx, 1.24), armR = pivot(sx, 1.24);
  [armL, armR].forEach(a => {
    add(rbox(0.15, 0.24, 0.15, 0.05), shirt, 0, -0.1, 0, a);
    add(rbox(0.13, 0.26, 0.13, 0.05), skin, 0, -0.33, 0, a);
    add(geo('handS', () => new THREE.SphereGeometry(0.075, 10, 8)), skin, 0, -0.5, 0.01, a);
  });
  const legL = pivot(-0.13, 0.8), legR = pivot(0.13, 0.8);
  [legL, legR].forEach(l => {
    add(rbox(0.19, 0.72, 0.2, 0.06), pantsMat, 0, -0.36, 0, l);
    add(rbox(0.2, 0.1, 0.3, 0.04), shoeMat, 0, -0.74, 0.04, l);
    add(rbox(0.21, 0.04, 0.31, 0.015), white, 0, -0.785, 0.04, l);
  });
  if (f) add(geo('skirt', () => new THREE.CylinderGeometry(0.24, 0.36, 0.34, 14)), pantsMat, 0, 0.72, 0);

  // 手持道具位
  const hand = new THREE.Group(); hand.position.set(0, -0.6, 0.08); armR.add(hand);

  root.traverse(o => { if (o.isMesh && !(o.material.map && o.material.transparent)) o.castShadow = true; });
  root.userData = { body, armL, armR, legL, legR, hand, phase: 0, held: null };
  return root;
}

// anim: 0 待機, 1 跑, 2 跌落
export function animateAvatar(av, anim, dt, speed = 1) {
  const u = av.userData;
  if (anim === 1) u.phase += dt * 12 * speed; else u.phase *= 0.85;
  const s = Math.sin(u.phase);
  if (anim === 2) {
    u.armL.rotation.x = -2.6 + Math.sin(performance.now() / 90) * 0.3; u.armR.rotation.x = -2.6 - Math.sin(performance.now() / 90) * 0.3;
    u.armL.rotation.z = 0.4; u.armR.rotation.z = -0.4;
    u.legL.rotation.x = 0.4; u.legR.rotation.x = -0.4; u.body.rotation.x = 0;
    return;
  }
  u.armL.rotation.z = 0; u.armR.rotation.z = 0;
  u.legL.rotation.x = s * 1.0; u.legR.rotation.x = -s * 1.0;
  u.armL.rotation.x = -s * 1.1; u.armR.rotation.x = u.held ? -1.2 : s * 1.1;
  u.body.rotation.x = anim === 1 ? 0.18 : 0;
  u.body.position.y = anim === 1 ? Math.abs(Math.cos(u.phase)) * 0.08 : 0;
}

// ---------- 道具模型 ----------
export function itemMesh(kind) {
  const g = new THREE.Group();
  if (kind === 'gold') {
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.1, 0.14), goldMat); g.add(b);
    const t = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.04, 0.09), goldMat); t.position.y = 0.07; g.add(t);
  } else if (kind === 'phone') {
    const b = box(0.09, 0.18, 0.012, std('#111', { roughness: 0.2 })); g.add(b);
    const s = box(0.08, 0.16, 0.002, new THREE.MeshBasicMaterial({ color: '#3fa9f5' })); s.position.z = 0.008; g.add(s);
  } else if (kind === 'router') {
    const b = box(0.28, 0.05, 0.18, std('#f4f4f4', { roughness: 0.3 })); g.add(b);
    [-0.1, 0, 0.1].forEach(x => { const a = box(0.015, 0.2, 0.015, std('#222')); a.position.set(x, 0.12, -0.08); g.add(a); });
    const led = box(0.2, 0.01, 0.01, new THREE.MeshBasicMaterial({ color: '#2f2' })); led.position.set(0, 0.0, 0.095); g.add(led);
  } else if (kind === 'ext') {
    const c = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.45, 14), std('#d50000', { roughness: 0.35 })); c.position.y = 0.225; g.add(c);
    const top = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 0.08, 8), std('#222')); top.position.y = 0.49; g.add(top);
    const hose = box(0.025, 0.025, 0.16, std('#111')); hose.position.set(0, 0.5, 0.08); g.add(hose);
  } else if (kind === 'hose') {
    // 消防喉：紅色喉管 + 銀色射嘴，沿住手臂向下（舉高手時就向前指）
    const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.6, 10), std('#c62828', { roughness: 0.6 })); tube.position.y = -0.1; g.add(tube);
    const noz = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.035, 0.22, 10), std('#b0bec5', { metalness: 0.8, roughness: 0.25 })); noz.position.y = -0.5; g.add(noz);
    const tail = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.045, 8, 16, Math.PI * 1.4), std('#c62828', { roughness: 0.6 })); tail.position.set(0, 0.3, 0.12); g.add(tail);
  }
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  return g;
}

// ---------- 柴犬 ----------
export function buildShiba() {
  const orange = std('#d9893b'), white = std('#f7efe3'), dark = std('#222');
  const g = new THREE.Group();
  const body = box(0.32, 0.3, 0.6, orange); body.position.y = 0.42; g.add(body);
  const chest = box(0.26, 0.22, 0.1, white); chest.position.set(0, 0.38, 0.29); g.add(chest);
  const head = box(0.3, 0.28, 0.28, orange); head.position.set(0, 0.68, 0.36); g.add(head);
  const snout = box(0.16, 0.12, 0.14, white); snout.position.set(0, 0.62, 0.55); g.add(snout);
  const nose = box(0.05, 0.04, 0.03, dark); nose.position.set(0, 0.66, 0.62); g.add(nose);
  [-0.07, 0.07].forEach(x => { const e = box(0.04, 0.04, 0.02, dark); e.position.set(x, 0.73, 0.5); g.add(e); });
  [-0.1, 0.1].forEach(x => { const ear = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.14, 4), orange); ear.position.set(x, 0.88, 0.34); ear.rotation.y = Math.PI / 4; g.add(ear); });
  const legs = [];
  [[-0.1, 0.2], [0.1, 0.2], [-0.1, -0.2], [0.1, -0.2]].forEach(([x, z]) => {
    const p = new THREE.Group(); p.position.set(x, 0.3, z);
    const l = box(0.08, 0.3, 0.08, orange); l.position.y = -0.15; p.add(l);
    const paw = box(0.09, 0.05, 0.1, white); paw.position.y = -0.28; p.add(paw);
    g.add(p); legs.push(p);
  });
  const tail = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.04, 6, 12), orange); tail.position.set(0, 0.66, -0.3); tail.rotation.y = Math.PI / 2; g.add(tail);
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  g.userData = { legs, tail, phase: 0 };
  return g;
}
export function animateShiba(d, moving, dt) {
  const u = d.userData;
  if (moving) u.phase += dt * 14; else u.phase *= 0.9;
  const s = Math.sin(u.phase);
  u.legs[0].rotation.x = s; u.legs[3].rotation.x = s; u.legs[1].rotation.x = -s; u.legs[2].rotation.x = -s;
  u.tail.rotation.z = Math.sin(performance.now() / 120) * 0.4;
}
