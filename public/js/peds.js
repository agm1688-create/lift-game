// 街上嘅路人：喺行人路行嚟行去。玩家出拳打佢，佢會跌低，起身之後好嬲，追住你打返轉頭
// 你要走！佢最多追 30 秒（或者你走得夠遠）就會放棄
import * as THREE from 'three';
import { buildAvatar, animateAvatar, SKINS, SHIRTS, HAIRS, PANTS } from './avatar.js';
import { CHUNK, HALF_WORLD, TOWN } from './city.js';
import { inExcl, segOK } from './traffic.js';

const V3 = THREE.Vector3;
const lineOf = v => Math.round((v + 100) / CHUNK) * CHUNK - 100;
const TOWN_SPOTS = [[-12, 6], [12, 6], [-6, 1], [6, -3], [-15, -6], [15, -8], [2, 4], [-18, 12], [18, 14], [25, 2], [-10, -2], [10, 10], [-25, 20], [28, 22], [0, 24]];
const SAY_HIT = [['Ouch! Hey, why did you hit me?', '哎呀！你做咩打我？'], ['Ow! That hurts! Come back here!', '好痛呀！你咪走！'], ['Hey! Stop that! You are so rude!', '喂！停手！你好冇禮貌！']];
const rand = (a, b) => a + Math.random() * (b - a);

function angryTex() {
  const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
  g.font = '52px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('💢', 32, 36);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

export function buildPeds(scene, api) {
  const N = api.isTouch ? 8 : 12, peds = [];
  const angryMat = new THREE.SpriteMaterial({ map: angryTex(), depthTest: false });
  for (let k = 0; k < N; k++) {
    const look = { gender: k % 2 ? 'f' : 'm', skin: SKINS[k % SKINS.length], hat: 'none', shirt: SHIRTS[(k * 3) % SHIRTS.length], hair: HAIRS[k % HAIRS.length], pants: PANTS[k % PANTS.length] };
    const av = buildAvatar(look); av.visible = false; scene.add(av);
    const mark = new THREE.Sprite(angryMat); mark.scale.set(0.7, 0.7, 1); mark.visible = false; scene.add(mark);
    peds.push({ av, mark, alive: false, st: 'walk', pos: new V3(), dir: new V3(1, 0, 0), t: 0, angryT: 0, hitCd: 0, vel: new V3(), goal: null });
  }
  const inTown = p => p.x > TOWN.x0 && p.x < TOWN.x1 && p.z > TOWN.z0 && p.z < TOWN.z1;
  function spawn(d, p) {
    let found = false;
    if (inTown(p) && Math.hypot(p.x, p.z - 8) < 90) {
      const s = TOWN_SPOTS[Math.floor(Math.random() * TOWN_SPOTS.length)];
      found = true; d.pos.set(s[0], 0, s[1]); d.goal = TOWN_SPOTS[Math.floor(Math.random() * TOWN_SPOTS.length)];
    } else {
      for (let n = 0; n < 15; n++) {
        const a = Math.random() * Math.PI * 2, r = rand(30, 110);
        let x = p.x + Math.cos(a) * r, z = p.z + Math.sin(a) * r;
        const alongX = Math.random() < 0.5;
        if (alongX) z = lineOf(z) + (Math.random() < 0.5 ? -8.5 : 8.5); else x = lineOf(x) + (Math.random() < 0.5 ? -8.5 : 8.5);
        if (inExcl(x, z, -10) || Math.abs(x) > HALF_WORLD - 100 || Math.abs(z) > HALF_WORLD - 100) continue;
        if (alongX ? !segOK(lineOf(x - 100), lineOf(z), lineOf(x - 100) + CHUNK, lineOf(z)) : !segOK(lineOf(x), lineOf(z - 100), lineOf(x), lineOf(z - 100) + CHUNK)) continue;
        found = true; d.pos.set(x, 0, z); d.dir.set(alongX ? (Math.random() < 0.5 ? 1 : -1) : 0, 0, alongX ? 0 : (Math.random() < 0.5 ? 1 : -1)); d.goal = null; d.walked = 0;
        break;
      }
    }
    if (!found) return;
    d.alive = true; d.st = 'walk'; d.av.visible = true; d.av.rotation.set(0, 0, 0); d.angryT = 0; d.mark.visible = false;
  }
  // 出拳：打前面 2.2 米內最近嗰個
  function nearest(p, face, maxD = 2.2) {
    let best = null, bd = maxD;
    for (const d of peds) {
      if (!d.alive || d.st === 'down') continue;
      const dx = d.pos.x - p.x, dz = d.pos.z - p.z, dist = Math.hypot(dx, dz);
      if (dist < bd && Math.abs(d.pos.y - p.y) < 2 && (dx * Math.sin(face) + dz * Math.cos(face)) / Math.max(0.01, dist) > 0.2) { bd = dist; best = d; }
    }
    return best;
  }
  function punch(p, face) {
    const d = nearest(p, face); if (!d) return false;
    const away = new V3(d.pos.x - p.x, 0, d.pos.z - p.z).normalize();
    d.st = 'down'; d.t = 2.4; /* 倒地 2 秒，再用 0.4 秒爬起身；追人一定行得慢過打人者 */ d.vel.copy(away).multiplyScalar(5); d.angryT = 30; d.hitCd = 1.5;
    d.av.rotation.set(0, Math.atan2(-away.x, -away.z), 0);
    const [en, zh] = SAY_HIT[Math.floor(Math.random() * SAY_HIT.length)];
    api.say(en, zh, { force: true, now: true });
    api.toast('👊 打中咗！個路人好嬲，佢起身會追住你打，快啲走！🏃', 3000);
    return true;
  }
  const tmp = new V3();
  function update(dt, p, hidden) {
    const off = hidden || Math.abs(p.x) > HALF_WORLD || p.y > 40;
    for (const d of peds) {
      if (off) { if (d.alive && d.st !== 'angry') { d.alive = false; d.av.visible = false; d.mark.visible = false; } if (!d.alive) continue; }
      if (!d.alive) { if (Math.random() < 0.05) spawn(d, p); continue; }
      const dist = Math.hypot(d.pos.x - p.x, d.pos.z - p.z);
      if (d.st !== 'angry' && dist > 170) { d.alive = false; d.av.visible = false; d.mark.visible = false; continue; }
      const u = d.av.userData;
      if (d.st === 'down') {
        d.t -= dt; d.pos.addScaledVector(d.vel, dt); d.vel.multiplyScalar(Math.max(0, 1 - dt * 4));
        animateAvatar(d.av, 0, dt); d.av.rotation.x = -Math.min(Math.PI / 2, (2.4 - d.t) * 6) * (d.t > 0.4 ? 1 : d.t / 0.4);
        if (d.t <= 0) { d.st = 'angry'; d.av.rotation.x = 0; api.say('Come back here! I will get you!', '你咪走！我捉到你就知死！', { force: true }); }
      } else if (d.st === 'angry') {
        d.angryT -= dt; d.hitCd -= dt;
        tmp.set(p.x - d.pos.x, 0, p.z - d.pos.z); const L = tmp.length();
        if (d.angryT <= 0 || L > 75) {
          d.st = 'walk'; d.mark.visible = false; d.goal = null; d.dir.set(-tmp.x / (L || 1), 0, -tmp.z / (L || 1)); d.walked = -40;
          api.say(d.angryT <= 0 ? 'Humph! Forget it. I am too tired.' : 'Phew, you got away this time!', d.angryT <= 0 ? '哼！算數，追到攰喇。' : '畀你走甩咗！', { force: true });
          api.toast('😮‍💨 個路人追唔到你，放棄咗', 2500);
          continue;
        }
        if (L > 1.1) { tmp.multiplyScalar(1 / L); d.pos.addScaledVector(tmp, Math.min(L - 1, (api.walkSpeed ? api.walkSpeed() * 0.75 : 5) * dt)); d.av.rotation.y = Math.atan2(tmp.x, tmp.z); animateAvatar(d.av, 1, dt, 1.5); }
        else {
          animateAvatar(d.av, 0, dt); u.armR.rotation.x = -1.6;
          if (d.hitCd <= 0 && Math.abs(p.y - d.pos.y) < 2) { d.hitCd = 1.3; api.hitPlayer(new V3(tmp.x / (L || 1), 0, tmp.z / (L || 1))); }
        }
        d.mark.visible = true; d.mark.position.set(d.pos.x, d.pos.y + 2.4 + Math.sin(performance.now() / 120) * 0.08, d.pos.z);
      } else {
        // 行路
        if (d.goal) {
          tmp.set(d.goal[0] - d.pos.x, 0, d.goal[1] - d.pos.z); const L = tmp.length();
          if (L < 0.5) { d.goal = TOWN_SPOTS[Math.floor(Math.random() * TOWN_SPOTS.length)]; }
          else { tmp.multiplyScalar(1 / L); d.dir.copy(tmp); }
        }
        d.pos.addScaledVector(d.dir, 1.4 * dt); d.walked = (d.walked || 0) + 1.4 * dt;
        if (!d.goal && d.walked > rand(50, 90)) { d.dir.negate(); d.walked = 0; }
        d.av.rotation.y = Math.atan2(d.dir.x, d.dir.z); animateAvatar(d.av, 1, dt, 0.5);
      }
      d.av.position.copy(d.pos);
    }
  }
  const angryCount = () => peds.filter(d => d.alive && d.st === 'angry').length;
  return { update, punch, nearest: (p, f) => nearest(p, f), angryCount, peds };
}
