// 角色 + 柴犬模型（低多邊形）
import * as THREE from 'three';

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

// look = {gender:'m'|'f', skin, shirt, hat}
export function buildAvatar(look = {}) {
  const skin = std(look.skin || SKINS[0]);
  const shirt = std(look.shirt || SHIRTS[1]);
  const pantsMat = std(look.gender === 'f' ? '#37474f' : '#263238');
  const hairMat = std(look.gender === 'f' ? '#4e2a12' : '#1b1b1b');
  const root = new THREE.Group();
  const body = new THREE.Group(); root.add(body);

  const torso = box(0.46, 0.55, 0.26, shirt); torso.position.y = 1.08; body.add(torso);
  const head = box(0.36, 0.36, 0.34, skin); head.position.y = 1.56; body.add(head);
  // 眼
  const eyeM = std('#111');
  [-0.08, 0.08].forEach(x => { const e = box(0.05, 0.06, 0.02, eyeM); e.position.set(x, 1.58, 0.175); body.add(e); });
  const mouth = box(0.1, 0.02, 0.02, std('#a33')); mouth.position.set(0, 1.48, 0.175); body.add(mouth);
  // 頭髮
  const hairTop = box(0.38, 0.08, 0.36, hairMat); hairTop.position.y = 1.76; body.add(hairTop);
  if (look.gender === 'f') {
    const back = box(0.38, 0.5, 0.08, hairMat); back.position.set(0, 1.48, -0.17); body.add(back);
    const skirt = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.34, 0.32, 12), shirt); skirt.position.y = 0.72; body.add(skirt);
  } else {
    const back = box(0.38, 0.18, 0.06, hairMat); back.position.set(0, 1.66, -0.16); body.add(back);
  }
  const hat = hatMesh(look.hat || 'gold'); hat.position.y = 1.76; body.add(hat);

  const limb = (w, h, mat, x, y) => {
    const pivot = new THREE.Group(); pivot.position.set(x, y, 0);
    const m = box(w, h, w, mat); m.position.y = -h / 2; pivot.add(m); body.add(pivot); return pivot;
  };
  const armL = limb(0.13, 0.52, shirt, -0.3, 1.33), armR = limb(0.13, 0.52, shirt, 0.3, 1.33);
  [armL, armR].forEach(a => { const h = box(0.12, 0.1, 0.12, skin); h.position.y = -0.56; a.add(h); });
  const legL = limb(0.17, 0.8, pantsMat, -0.12, 0.8), legR = limb(0.17, 0.8, pantsMat, 0.12, 0.8);
  [legL, legR].forEach(l => { const s = box(0.18, 0.08, 0.26, std('#222')); s.position.set(0, -0.78, 0.04); l.add(s); });

  // 手持道具位
  const hand = new THREE.Group(); hand.position.set(0, -0.6, 0.08); armR.add(hand);

  root.traverse(o => { if (o.isMesh) { o.castShadow = true; } });
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
