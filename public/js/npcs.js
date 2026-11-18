// NPC：用伺服器時間 + 固定隨機種子計算位置，所有玩家見到嘅 NPC 都一樣
import * as THREE from 'three';
import { buildAvatar, animateAvatar, SKINS, SHIRTS, HATS } from './avatar.js';

const NPC_DEFS = [
  { name: '陳生', gender: 'm' }, { name: '李太', gender: 'f' }, { name: '黃伯', gender: 'm' },
  { name: '張小姐', gender: 'f' }, { name: '何仔', gender: 'm' }, { name: '林婆婆', gender: 'f' },
  { name: '周先生', gender: 'm' },
];
// 廣場上安全嘅散步點（避開公廁、電梯、枱）
const PLAZA = [[-12, 6], [12, 6], [-6, 1], [6, -3], [-15, -6], [15, -8], [2, 4], [-27, 12], [18, 14], [25, 2], [-10, -2], [10, 10]];
const WALK = 1.35; // 米/秒

function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

// 生成一個循環行程（一連串「行」同「停」）
function plan(R, spots) {
  const segs = []; let time = 0;
  const pick = a => a[Math.floor(R() * a.length)];
  const p0 = pick(PLAZA); let cur = p0.slice(); let prop = null;
  const go = (p) => { const d = Math.hypot(p[0] - cur[0], p[1] - cur[1]); if (d < 0.01) return; segs.push({ k: 'm', a: cur, b: p, t0: time, d: d / WALK, prop }); time += d / WALK; cur = p.slice(); };
  const stay = (dur, face, pose = 'stand', p2 = prop) => { segs.push({ k: 's', p: cur, t0: time, d: dur, face, pose, prop: p2 }); time += dur; };
  const shops = Object.values(spots);
  for (let a = 0; a < 7; a++) {
    if (R() < 0.35 || !shops.length) {
      // 喺廣場散步
      const n = 1 + Math.floor(R() * 3);
      for (let i = 0; i < n; i++) { go(pick(PLAZA)); stay(2 + R() * 5, R() * Math.PI * 2, R() < 0.3 ? 'phone' : 'stand'); }
      continue;
    }
    // 去一間舖
    const s = pick(shops);
    if (cur[0] < 0) { go([-4.9, 10]); go([-4.9, 31]); } else go([10, 25]);   // 西面行公廁同柏熙屋企中間條路 go(s.street); go(s.doorOut); go(s.doorIn);
    if (s.type === 'fast') {
      go([s.aisle, s.doorIn[1] + 0.4]); go(s.counter); stay(3 + R() * 3, 0, 'order');
      const seat = pick(s.seats); prop = 'food';
      go([s.aisle, seat.z]); go([seat.x, seat.z]); stay(15 + R() * 20, seat.face, 'sit');
      go([s.aisle, seat.z]); go([s.aisle, s.doorIn[1] + 0.4]); prop = null;
    } else if (s.type === 'bar') {
      const seat = pick(s.seats);
      go([seat.x, s.front]); go([seat.x, seat.z]); prop = 'bowl'; stay(15 + R() * 15, seat.face, 'stool');
      prop = null; go([seat.x, s.front]);
    } else if (s.type === 'chinese') {
      const seat = pick(s.seats);
      s.entry.forEach(p => go(p)); go([s.aisle, seat.z]); go([seat.x, seat.z]);
      prop = 'tea'; stay(25 + R() * 20, seat.face, 'sit'); prop = null;
      go([s.aisle, seat.z]); [...s.entry].reverse().forEach(p => go(p));
    } else if (s.type === 'market') {
      prop = 'basket';
      const gx = pick(s.gaps); go([gx, s.front]);
      const n = 2 + Math.floor(R() * 2);
      for (let i = 0; i < n; i++) {
        go([gx, pick(s.browseZ)]);
        const shelf = s.shelfX.reduce((b, x) => Math.abs(x - gx) < Math.abs(b - gx) ? x : b);
        stay(3 + R() * 4, shelf > gx ? Math.PI / 2 : -Math.PI / 2, 'shop');
      }
      go([gx, s.front]); go([s.checkout[0], s.front]); go(s.checkout); stay(4 + R() * 3, -Math.PI / 2, 'order');
      prop = 'bag';
    } else {
      const t = pick(s.tellers);
      go(s.hall); go(t); stay(5 + R() * 4, 0, 'order'); go(s.hall);
    }
    go(s.doorIn); go(s.doorOut); go(s.street);
    const next = pick(PLAZA);
    if (next[0] < 0) { go([-4.9, 31]); go([-4.9, 10]); } else go([10, 25]); go(next); stay(2 + R() * 3, R() * 6, 'stand'); prop = null;
  }
  go(p0);
  return { segs, L: time };
}

function propMesh(kind) {
  const g = new THREE.Group();
  const M = (geo, color, x, y, z) => { const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color, roughness: 0.6 })); m.position.set(x, y, z); g.add(m); return m; };
  if (kind === 'food') { M(new THREE.CylinderGeometry(0.07, 0.07, 0.03, 12), '#c8862e', 0, 0, 0); M(new THREE.CylinderGeometry(0.072, 0.072, 0.02, 12), '#5a2e0e', 0, 0.025, 0); M(new THREE.CylinderGeometry(0.07, 0.065, 0.03, 12), '#d99a40', 0, 0.05, 0); }
  else if (kind === 'bowl') { M(new THREE.CylinderGeometry(0.09, 0.05, 0.07, 14), '#f4f4f4', 0, 0, 0); M(new THREE.CylinderGeometry(0.085, 0.085, 0.01, 14), '#7a3e16', 0, 0.035, 0); }
  else if (kind === 'tea') { M(new THREE.CylinderGeometry(0.04, 0.035, 0.06, 12), '#f4f4f4', 0, 0, 0); }
  else if (kind === 'basket') { M(new THREE.BoxGeometry(0.32, 0.18, 0.22), '#e53935', 0, -0.12, 0); M(new THREE.BoxGeometry(0.02, 0.15, 0.02), '#333', 0, 0.02, 0); }
  else if (kind === 'bag') { M(new THREE.BoxGeometry(0.26, 0.3, 0.12), '#f5f5f5', 0, -0.18, 0); M(new THREE.TorusGeometry(0.06, 0.01, 6, 12), '#999', 0, 0.0, 0); }
  else if (kind === 'phone') { M(new THREE.BoxGeometry(0.07, 0.14, 0.01), '#111', 0, 0, 0.02); }
  return g;
}

function tag(name) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 64; const g = c.getContext('2d');
  g.fillStyle = 'rgba(40,40,40,.5)'; g.beginPath(); g.roundRect(30, 12, 196, 40, 18); g.fill();
  g.fillStyle = '#ddd'; g.font = '26px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(name, 128, 33);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthWrite: false })); s.scale.set(1.2, 0.3, 1); return s;
}

export function buildNPCs(scene, spots) {
  const npcs = NPC_DEFS.map((def, i) => {
    const R = rng(1234 + i * 777);
    const look = { gender: def.gender, skin: SKINS[Math.floor(R() * SKINS.length)], shirt: SHIRTS[Math.floor(R() * SHIRTS.length)], hat: HATS[2 + Math.floor(R() * 3)].id };
    const av = buildAvatar(look); scene.add(av);
    const t = tag(def.name); scene.add(t);
    const { segs, L } = plan(R, spots);
    return { def, av, tag: t, segs, L, off: R() * L, propKind: undefined, idx: 0 };
  });

  function setProp(n, kind, pose) {
    const key = kind + ':' + pose;
    if (n.propKind === key) return; n.propKind = key;
    const hand = n.av.userData.hand; hand.clear(); n.av.userData.held = null;
    if (!kind) return;
    // 坐低食嘢時食物喺手；攞籃 / 袋時手垂直
    const m = propMesh(kind); hand.add(m); n.av.userData.held = (kind === 'basket' || kind === 'bag') ? null : kind;
  }

  function update(dt, nowMs) {
    const T = nowMs / 1000;
    for (const n of npcs) {
      const t = (T + n.off) % n.L;
      // 搵目前嗰段（由上次位置開始搵，好快）
      let i = n.idx; const S = n.segs;
      if (!(S[i] && t >= S[i].t0 && t < S[i].t0 + S[i].d)) { i = 0; while (i < S.length - 1 && !(t < S[i].t0 + S[i].d)) i++; }
      n.idx = i; const s = S[i];
      const u = n.av.userData;
      let pose = 'walk';
      if (s.k === 'm') {
        const f = Math.min(1, (t - s.t0) / s.d);
        n.av.position.set(s.a[0] + (s.b[0] - s.a[0]) * f, 0, s.a[1] + (s.b[1] - s.a[1]) * f);
        const target = Math.atan2(s.b[0] - s.a[0], s.b[1] - s.a[1]);
        let df = target - n.av.rotation.y; df = Math.atan2(Math.sin(df), Math.cos(df));
        n.av.rotation.y += df * Math.min(1, dt * 10);
        animateAvatar(n.av, 1, dt, 0.5); u.body.rotation.x = 0.04;
      } else {
        pose = s.pose;
        n.av.position.set(s.p[0], 0, s.p[1]);
        let df = s.face - n.av.rotation.y; df = Math.atan2(Math.sin(df), Math.cos(df));
        n.av.rotation.y += df * Math.min(1, dt * 6);
        animateAvatar(n.av, 0, dt);
        const w = performance.now() / 1000;
        if (pose === 'sit' || pose === 'stool') {
          u.body.position.y = pose === 'sit' ? -0.36 : -0.08;
          u.legL.rotation.x = u.legR.rotation.x = pose === 'sit' ? -Math.PI / 2 : -1.1;
          u.armR.rotation.x = -1.5 + Math.sin(w * 2.5 + n.off) * 0.45; u.armL.rotation.x = -0.6;
        } else if (pose === 'shop') {
          u.armR.rotation.x = -1.3 + Math.sin(w * 1.5 + n.off) * 0.25;
        } else if (pose === 'order') {
          u.armR.rotation.x = -0.9 + Math.sin(w * 3) * 0.15;
        } else if (pose === 'phone') {
          u.armR.rotation.x = -2.3; u.armR.rotation.z = 0.3;
        }
      }
      setProp(n, pose === 'phone' ? 'phone' : s.prop, pose);
      n.tag.position.set(n.av.position.x, n.av.position.y + 2.05 + (pose === 'sit' ? -0.36 : 0), n.av.position.z);
    }
  }
  return { npcs, update };
}
