// 城市突發事件（好似現實世界咁）：大廈火警 → 消防車趕到救火；街上有賊 → 警察追捕
// 玩家可以幫手：拎滅火筒噴火、或者自己追個賊（捉到有獎）
import * as THREE from 'three';
import { CHUNK, HALF_WORLD, TOWN } from './city.js';
import { buildAvatar, animateAvatar } from './avatar.js';
import { planRoute, routeAt } from './transit.js';
import { buildCarOf, segOK, inExcl, laneOff } from './traffic.js';

const V3 = THREE.Vector3;
const std = (c, e = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.5, ...e });
const lineOf = v => Math.round((v + 100) / CHUNK) * CHUNK - 100;
const DIRS = [[1, 0], [0, 1], [-1, 0], [0, -1]];
const rand = (a, b) => a + Math.random() * (b - a);

function lightBar(g, y, w = 1.1) {
  const red = new THREE.MeshStandardMaterial({ color: '#ff1744', emissive: '#ff1744', emissiveIntensity: 2 });
  const blue = new THREE.MeshStandardMaterial({ color: '#2979ff', emissive: '#2979ff', emissiveIntensity: 2 });
  const a = new THREE.Mesh(new THREE.BoxGeometry(w / 2, 0.18, 0.3), red); a.position.set(-w / 4, y, 0); g.add(a);
  const b = new THREE.Mesh(new THREE.BoxGeometry(w / 2, 0.18, 0.3), blue); b.position.set(w / 4, y, 0); g.add(b);
  return [red, blue];
}
export function buildFireTruck() {
  const g = new THREE.Group(), red = std('#c62828', { metalness: 0.3 }), white = std('#eeeeee'), chrome = std('#cfd8dc', { metalness: 0.9, roughness: 0.2 }), black = std('#111');
  const box = (w, h, d, m, x, y, z) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z); o.castShadow = true; g.add(o); return o; };
  box(2.4, 2.2, 2.4, red, 0, 1.7, 3.2); box(2.42, 0.8, 0.1, std('#22313f', { metalness: 0.5 }), 0, 2.2, 4.42);
  box(2.4, 2.0, 6.0, red, 0, 1.6, -1.2); box(2.42, 0.25, 6.0, white, 0, 1.2, -1.2);
  for (let k = 0; k < 3; k++) box(2.44, 1.2, 1.6, chrome, 0, 1.8, -3.4 + k * 1.9);
  const ladder = new THREE.Group(); ladder.position.set(0, 2.85, -3.5); g.add(ladder);
  [-0.4, 0.4].forEach(x => { const r = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 7.5), chrome); r.position.set(x, 0, 3.4); ladder.add(r); });
  for (let k = 0; k < 14; k++) { const r = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.05, 0.05), chrome); r.position.set(0, 0, k * 0.52); ladder.add(r); }
  const lights = lightBar(g, 2.9, 1.6); lights.forEach(m => m.userData = {}); g.children[g.children.length - 1].position.z = g.children[g.children.length - 2].position.z = 3.2;
  const wheels = [];
  [[-1.15, 3.0], [1.15, 3.0], [-1.15, -1.8], [1.15, -1.8], [-1.15, -3.2], [1.15, -3.2]].forEach(([x, z]) => { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.35, 14), black); w.rotation.z = Math.PI / 2; w.position.set(x, 0.5, z); g.add(w); wheels.push(w); });
  g.userData = { lights, wheels, ladder, L: 8.8 };
  return g;
}
export function buildPoliceCar() {
  const g = buildCarOf('sedan', '#f5f5f5');
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(1.82, 0.22, 4.0), std('#1565c0')); stripe.position.y = 0.85; g.add(stripe);
  g.userData.lights = lightBar(g, 1.72, 1.0);
  return g;
}

export function buildEvents(scene, api) {
  // ---------- 粒子：火、煙、水 ----------
  function particles(n, color, size, blending) {
    const geo = new THREE.BufferGeometry(), pos = new Float32Array(n * 3).fill(-1e5);
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const m = new THREE.Points(geo, new THREE.PointsMaterial({ color, size, transparent: true, opacity: 0.85, depthWrite: false, blending: blending || THREE.NormalBlending }));
    m.frustumCulled = false; scene.add(m);
    return { m, pos, vel: new Float32Array(n * 3), life: new Float32Array(n), n, i: 0 };
  }
  const flame = particles(320, '#ff7a1a', 2.6, THREE.AdditiveBlending), smoke = particles(220, '#5b5b5b', 5.5), water = particles(220, '#bfe6ff', 0.6);
  smoke.m.material.opacity = 0.5;
  function emit(P, x, y, z, vx, vy, vz, life) { const i = P.i++ % P.n; P.pos[i * 3] = x; P.pos[i * 3 + 1] = y; P.pos[i * 3 + 2] = z; P.vel[i * 3] = vx; P.vel[i * 3 + 1] = vy; P.vel[i * 3 + 2] = vz; P.life[i] = life; }
  function stepP(P, dt, grav) {
    for (let i = 0; i < P.n; i++) {
      if (P.life[i] <= 0) { P.pos[i * 3 + 1] = -1e5; continue; }
      P.life[i] -= dt; P.vel[i * 3 + 1] -= grav * dt;
      P.pos[i * 3] += P.vel[i * 3] * dt; P.pos[i * 3 + 1] += P.vel[i * 3 + 1] * dt; P.pos[i * 3 + 2] += P.vel[i * 3 + 2] * dt;
    }
    P.m.geometry.attributes.position.needsUpdate = true;
  }
  const fireLight = new THREE.PointLight('#ff6a1a', 0, 60); scene.add(fireLight);

  // ---------- 火警 ----------
  let fire = null, thief = null, fireT = rand(45, 70), thiefT = rand(25, 45);
  const truck = buildFireTruck(); truck.visible = false; scene.add(truck);
  const crew = [0, 1].map(() => { const a = buildAvatar({ gender: 'm', skin: '#e0ac69', hat: 'gold', shirt: '#3e2723', pants: '#3e2723', hair: '#1b1b1b' }); a.visible = false; scene.add(a); return a; });
  function pickBuilding(p) {
    const cands = [];
    for (const c of api.city.chunks.values()) {
      if (!c.near || !c.plan) continue;
      for (const b of c.plan.b) {
        if (b.top || b.y1 < 14) continue;
        const bx = (b.x0 + b.x1) / 2, bz = (b.z0 + b.z1) / 2, d = Math.hypot(bx - p.x, bz - p.z);
        if (d > 50 && d < 260) cands.push({ b, c: c.plan, bx, bz });
      }
    }
    return cands.length ? cands[Math.floor(Math.random() * cands.length)] : null;
  }
  function startFire(p) {
    const k = pickBuilding(p); if (!k) return false;
    const { b, c, bx, bz } = k;
    // 搵最近嘅馬路（區邊嘅大路或者區中間嘅十字街）
    const opts = [];
    [lineOf(b.x0), lineOf(b.x1), c.cx].forEach(L => opts.push({ v: true, L, d: Math.min(Math.abs(L - b.x0), Math.abs(L - b.x1)) }));
    [lineOf(b.z0), lineOf(b.z1), c.cz].forEach(L => opts.push({ v: false, L, d: Math.min(Math.abs(L - b.z0), Math.abs(L - b.z1)) }));
    opts.sort((a, b2) => a.d - b2.d); const r = opts[0];
    let face, stand;
    if (r.v) { const fx = r.L < bx ? b.x0 : b.x1, s = Math.sign(r.L - bx); face = new V3(fx + s * 0.3, Math.min(b.y1 - 3, 9 + Math.random() * 10), bz); stand = new V3(r.L - s * 1.5, 0, bz); }
    else { const fz = r.L < bz ? b.z0 : b.z1, s = Math.sign(r.L - bz); face = new V3(bx, Math.min(b.y1 - 3, 9 + Math.random() * 10), fz + s * 0.3); stand = new V3(bx, 0, r.L - s * 1.5); }
    const from = { x: stand.x + (Math.random() < 0.5 ? -1 : 1) * rand(250, 380), z: stand.z + (Math.random() < 0.5 ? -1 : 1) * rand(150, 300) };
    if (inExcl(from.x, from.z) || Math.abs(from.x) > HALF_WORLD - 150 || Math.abs(from.z) > HALF_WORLD - 150) { from.x = stand.x; from.z = stand.z + (stand.z > 0 ? -300 : 300); }
    const R = planRoute(from, { x: stand.x, z: stand.z }, TOWN);
    fire = { face, stand, R, s: 0, hp: 100, t: 0, helped: 0, arrived: false, spraying: false, sirenT: 0, w: r.v ? 0 : 1, dir: r.v ? Math.sign(r.L - bx) : Math.sign(r.L - bz) };
    truck.visible = true; truck.position.copy(R.pts[0]);
    api.toast('🔥 火警！附近有大廈著火，消防車趕緊嚟！\n可以拎滅火筒去幫手救火', 5000); api.sfx.alarm(2);
    api.say('Fire! Fire! A building is on fire. The fire engine is coming!', '火警！有大廈著火，消防車嚟緊！');
    return true;
  }
  function updateFire(dt, p) {
    const F = fire; F.t += dt;
    // 火 + 煙
    const k = Math.max(0.15, F.hp / 100);
    for (let n = 0; n < 9 * k; n++) emit(flame, F.face.x + rand(-2.5, 2.5) * (F.w ? 1 : 0.2), F.face.y + rand(-1, 1.5), F.face.z + rand(-2.5, 2.5) * (F.w ? 0.2 : 1), rand(-0.6, 0.6), rand(2, 5), rand(-0.6, 0.6), rand(0.5, 1.1));
    if (Math.random() < 0.7) emit(smoke, F.face.x + rand(-2, 2), F.face.y + 3, F.face.z + rand(-2, 2), rand(-0.5, 0.5) + 1.2, rand(4, 7), rand(-0.5, 0.5), rand(4, 8));
    fireLight.position.copy(F.face); fireLight.intensity = 60 * k * (0.8 + Math.random() * 0.4);
    // 消防車
    F.sirenT -= dt; if (F.sirenT <= 0 && Math.hypot(truck.position.x - p.x, truck.position.z - p.z) < 250) { F.sirenT = 1.2; api.sfx.siren(); }
    const flash = Math.floor(F.t * 6) % 2; truck.userData.lights[0].emissiveIntensity = flash ? 3 : 0.2; truck.userData.lights[1].emissiveIntensity = flash ? 0.2 : 3;
    if (!F.arrived) {
      F.s += 19 * dt;
      const yaw = routeAt(F.R, F.s, truck.position); truck.rotation.y = yaw;
      truck.userData.wheels.forEach(w => w.rotation.x += 19 * dt / 0.5);
      if (F.s >= F.R.L) {
        F.arrived = true; truck.position.copy(F.stand);
        crew.forEach((c, i) => { c.visible = true; c.position.set(F.stand.x + (F.w ? 0 : 3) + i * 1.2 * (F.w ? 1 : 0), 0, F.stand.z + (F.w ? 3 : 0) + i * 1.2 * (F.w ? 0 : 1)); c.rotation.y = Math.atan2(F.face.x - c.position.x, F.face.z - c.position.z); });
        api.toast('🚒 消防車到咗！消防員開始射水救火', 3500);
        api.say('The firefighters are here. They are spraying water on the fire.', '消防員到咗，佢哋用水喉射水救火。');
      }
    } else {
      // 射水
      crew.forEach(c => { animateAvatar(c, 0, dt); c.userData.armR.rotation.x = c.userData.armL.rotation.x = -1.5; });
      for (let n = 0; n < 5; n++) {
        const c = crew[n % 2], o = new V3(c.position.x, 1.4, c.position.z), to = F.face.clone().sub(o), T = 1.0;
        emit(water, o.x, o.y, o.z, to.x / T + rand(-0.6, 0.6), to.y / T + 9.8 * T / 2 * 1.0 + rand(-0.5, 0.5), to.z / T + rand(-0.6, 0.6), T);
      }
      F.hp -= 3.5 * dt;
    }
    // 玩家用滅火筒幫手
    if (api.spraying() && Math.hypot(p.x - F.face.x, p.z - F.face.z) < 18) { F.hp -= 9 * dt; F.helped += dt; }
    if (F.hp <= 0) {
      const helped = F.helped > 1.5;
      api.toast(helped ? '🎉 火救熄咗！消防隊長：多謝你幫手！獎你 $150' : '✅ 消防員救熄咗火，冇人受傷 👍', 4500);
      api.say(helped ? 'The fire is out. Thank you for your help! You are a hero!' : 'The fire is out. Nobody is hurt. Well done, firefighters!', helped ? '火救熄咗，多謝你幫手！你係英雄！' : '火救熄咗，冇人受傷。');
      if (helped) api.reward(150);
      endFire();
    } else if (Math.hypot(p.x - F.face.x, p.z - F.face.z) > 900 || F.t > 240) endFire();
  }
  function endFire() { fire = null; truck.visible = false; crew.forEach(c => c.visible = false); fireLight.intensity = 0; }

  // ---------- 賊 + 警察 ----------
  const thiefAv = buildAvatar({ gender: 'm', skin: '#d8a273', hat: 'beanie', shirt: '#212121', pants: '#263238', hair: '#111' });
  { const bag = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.4, 0.25), std('#8d6e63')); bag.position.set(0, -0.35, 0); thiefAv.userData.hand.add(bag); }
  const cop = buildAvatar({ gender: 'm', skin: '#e0ac69', hat: 'cap', shirt: '#1a237e', pants: '#1a237e', hair: '#1b1b1b' });
  const pcar = buildPoliceCar();
  [thiefAv, cop, pcar].forEach(o => { o.visible = false; scene.add(o); });
  // 沿住馬路網跑（記低轉角，警察 / 警車跟住同一條路線）
  function runner(x, z, d) { const [ox, oz] = laneOff(d).map(v => v * 1.6); const lx = DIRS[d][0] ? x : lineOf(x), lz = DIRS[d][0] ? lineOf(z) : z; return { x: lx + ox, z: lz + oz, d, pts: [new V3(lx + ox, 0, lz + oz)] }; }
  function runStep(R, dist) {
    const [dx, dz] = DIRS[R.d];
    let n = dx ? lineOf(R.x) : lineOf(R.z); const cur = dx ? R.x : R.z, dirS = dx || dz;
    if ((n - cur) * dirS <= 0.5) n += dirS * CHUNK;
    const left = Math.abs(n - cur) + 0;   // 到路口中心
    if (dist < left) { R.x += dx * dist; R.z += dz * dist; return; }
    // 轉彎
    const nx = dx ? n : lineOf(R.x), nz = dx ? lineOf(R.z) : n;
    const opts = [0, 1, 2, 3].filter(k => k !== (R.d + 2) % 4 && segOK(nx, nz, nx + DIRS[k][0] * CHUNK, nz + DIRS[k][1] * CHUNK));
    const nd = opts.length ? opts[Math.floor(Math.random() * opts.length)] : (R.d + 2) % 4;
    const [ox, oz] = laneOff(nd).map(v => v * 1.6);
    R.x = nx + (DIRS[nd][0] ? 0 : ox); R.z = nz + (DIRS[nd][0] ? oz : 0); R.d = nd;
    R.pts.push(new V3(R.x, 0, R.z));
    R.x += DIRS[nd][0] * 0.5; R.z += DIRS[nd][1] * 0.5;
  }
  // 跟住路線（pts + 賊而家位置）行
  function follow(F, pts, head, dist, out) {
    F.s += dist;
    const all = pts.concat([head]); let acc = 0;
    for (let i = 1; i < all.length; i++) {
      const L = all[i].distanceTo(all[i - 1]);
      if (acc + L >= F.s) { out.lerpVectors(all[i - 1], all[i], (F.s - acc) / Math.max(1e-6, L)); return Math.atan2(all[i].x - all[i - 1].x, all[i].z - all[i - 1].z); }
      acc += L;
    }
    out.copy(head); F.s = acc; return F.yaw || 0;
  }
  function startThief(p) {
    for (let tries = 0; tries < 20; tries++) {
      const d = Math.floor(Math.random() * 4), a = Math.random() * Math.PI * 2, r = rand(35, 70);
      const x = p.x + Math.cos(a) * r, z = p.z + Math.sin(a) * r;
      const R = runner(x, z, d);
      const a0 = DIRS[d][0] ? lineOf(R.x - 100) : lineOf(R.z - 100);
      if (!(DIRS[d][0] ? segOK(a0, lineOf(R.z), a0 + CHUNK, lineOf(R.z)) : segOK(lineOf(R.x), a0, lineOf(R.x), a0 + CHUNK))) continue;
      thief = { R, cop: { s: 0 }, car: { s: 0 }, t: 0, caught: 0, by: '', sirenT: 0, copStart: 16 };
      thief.cop.s = -thief.copStart; thief.car.s = -thief.copStart - 12;
      [thiefAv, cop, pcar].forEach(o => o.visible = true);
      thiefAv.position.set(R.x, 0, R.z); cop.position.copy(R.pts[0]); pcar.position.copy(R.pts[0]);
      api.toast('🦹 有賊搶咗手袋！警察追緊佢！\n你都可以追上去捉住個賊（行到佢身邊）', 5000);
      api.say('Stop, thief! The police officer is chasing the thief.', '捉賊呀！警察追緊個賊！');
      return true;
    }
    return false;
  }
  const tmp = new V3();
  function updateThief(dt, p) {
    const T = thief; T.t += dt;
    const flash = Math.floor(T.t * 6) % 2; pcar.userData.lights[0].emissiveIntensity = flash ? 3 : 0.2; pcar.userData.lights[1].emissiveIntensity = flash ? 0.2 : 3;
    T.sirenT -= dt; if (T.sirenT <= 0 && Math.hypot(pcar.position.x - p.x, pcar.position.z - p.z) < 200) { T.sirenT = 1.2; api.sfx.siren(); }
    if (!T.caught) {
      runStep(T.R, 6.4 * dt);
      thiefAv.position.set(T.R.x, 0, T.R.z); thiefAv.rotation.y = Math.atan2(DIRS[T.R.d][0], DIRS[T.R.d][1]);
      animateAvatar(thiefAv, 1, dt, 1.4);
      const head = new V3(T.R.x, 0, T.R.z);
      const cy = follow(T.cop, T.R.pts, head, 6.9 * dt, tmp); cop.position.copy(tmp); cop.rotation.y = cy;
      animateAvatar(cop, 1, dt, 1.4);
      const py = follow(T.car, T.R.pts, head, 6.9 * dt, tmp); pcar.position.copy(tmp); pcar.rotation.y = py;
      if (Math.hypot(p.x - T.R.x, p.z - T.R.z) < 2.3 && Math.abs(p.y) < 2) catchIt('player');
      else if (T.cop.s > 1 && cop.position.distanceTo(thiefAv.position) < 1.4) catchIt('police');
    } else {
      T.caught -= dt;
      const u = thiefAv.userData; animateAvatar(thiefAv, 0, dt); u.armL.rotation.x = u.armR.rotation.x = -2.9;
      animateAvatar(cop, 0, dt);
      if (T.caught <= 0) endThief();
    }
    if (T.t > 150 || Math.hypot(p.x - T.R.x, p.z - T.R.z) > 700) endThief();
  }
  function catchIt(by) {
    const T = thief; T.caught = 6; T.by = by;
    cop.position.set(T.R.x + 1, 0, T.R.z + 1); cop.rotation.y = Math.atan2(T.R.x - cop.position.x, T.R.z - cop.position.z);
    if (by === 'player') {
      api.toast('🎉 你捉住咗個賊！警察：多謝你！獎你 $200', 4500); api.reward(200); api.sfx.pickup();
      api.say('You caught the thief! Thank you very much. You are very brave!', '你捉住咗個賊！多謝你，你好勇敢！');
    } else {
      api.toast('👮 警察捉到個賊！手袋已經還返俾事主', 3500);
      api.say('The police caught the thief. Hands up!', '警察捉到個賊：舉高雙手！');
    }
  }
  function endThief() { thief = null; [thiefAv, cop, pcar].forEach(o => o.visible = false); }

  // 正常城市範圍先會有事件發生
  const okZone = p => Math.abs(p.x) < HALF_WORLD - 200 && Math.abs(p.z) < HALF_WORLD - 200 && p.y < 40 && !inExcl(p.x, p.z, -20);
  function update(dt, p, busy) {
    const ok = okZone(p) && !busy;
    if (fire) updateFire(dt, p); else if (ok) { fireT -= dt; if (fireT <= 0) { fireT = rand(150, 240); if (!startFire(p)) fireT = 20; } }
    if (thief) updateThief(dt, p); else if (ok) { thiefT -= dt; if (thiefT <= 0) { thiefT = rand(100, 170); if (!startThief(p)) thiefT = 15; } }
    stepP(flame, dt, -1); stepP(smoke, dt, -0.4); stepP(water, dt, 9.8);
  }
  return { update, startFire: () => startFire(api.pos()), startThief: () => startThief(api.pos()), state: () => ({ fire, thief }) };
}
