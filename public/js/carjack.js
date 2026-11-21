// 打劫搶車：行路或者揸車去到馬路上行緊嘅車（私家車、的士、貨車、警車、消防車）旁邊 / 前面，撳「打劫」，
// 司機會舉高手落車走佬，架車就俾你揸。搶警車就會有警察揸警車追你，捉到要坐監（答啱 3 條數學 + 2 條英文先放）
import * as THREE from 'three';
import { buildCarOf } from './traffic.js';
import { buildFireTruck, buildPoliceCar } from './events.js';
import { buildTransitModel } from './transit.js';
import { buildAvatar, animateAvatar } from './avatar.js';

const V3 = THREE.Vector3;
const NAME = { sedan: '私家車', taxi: '的士', van: '客貨車', truck: '貨車', police: '警車', fire: '消防車', minibus: '小巴', bus: '雙層巴士' };

export function buildCarjack(scene, api, traffic, events) {
  let cur = null;            // 揸緊嘅搶來車 { kind, model, src, police }
  const parked = [];         // 落咗車之後泊喺路邊嘅車（一陣就會消失）
  const drivers = [];        // 落車走佬嘅司機
  let chase = null;          // 警察追緊你
  const statics = [];        // 泊喺站頭嘅的士 / 小巴 / 巴士（冇司機，直接揸走）
  function addStatic(o, kind, col) { statics.push({ o, kind, col, taken: false }); }
  // 車身大細（本地座標，車頭向 +z），計一次就記住
  const box = new THREE.Box3(), bsz = new V3();
  function sizeOf(o) {
    const u = o.userData; if (u._jL) return u;
    const r = o.rotation.y, px = o.position.x, pz = o.position.z; o.rotation.y = 0; o.position.x = o.position.z = 0; o.updateMatrixWorld(true);
    box.setFromObject(o).getSize(bsz); o.rotation.y = r; o.position.x = px; o.position.z = pz; o.updateMatrixWorld(true);
    u._jL = Math.max(3, bsz.z); u._jW = Math.max(1.6, bsz.x); return u;
  }

  // ---------- 搵前面 / 旁邊有冇行緊嘅車 ----------
  function candidates() {
    const out = [];
    for (const c of traffic.cars) if (c.alive && !c.knock && c.m.visible) out.push({ src: 'traffic', c, o: c.m, kind: c.kind || 'sedan' });
    if (events.truck.visible && !events.truck.userData.taken) out.push({ src: 'fire', o: events.truck, kind: 'fire' });
    if (events.pcar.visible && !events.pcar.userData.taken) out.push({ src: 'police', o: events.pcar, kind: 'police' });
    for (const st of statics) if (!st.taken && st.o.visible) out.push({ src: 'static', st, o: st.o, kind: st.kind });
    for (const pk of parked) out.push({ src: 'parked', pk, o: pk.model, kind: pk.kind });
    return out;
  }
  function find(p) {
    if (cur || chase?.caught) return null;
    let best = null, bd = 1e9;
    for (const k of candidates()) {
      const o = k.o, u = sizeOf(o), L = u._jL, W = u._jW, yaw = o.rotation.y;
      const fx = Math.sin(yaw), fz = Math.cos(yaw), rx = p.x - o.position.x, rz = p.z - o.position.z;
      const along = Math.abs(rx * fx + rz * fz), side = Math.abs(rx * fz - rz * fx);
      // 企喺車頭、車尾、兩邊 2.5 米之內都得（唔使企正司機位）
      if (along < L / 2 + 2.5 && side < W / 2 + 2.5 && Math.abs(p.y - o.position.y) < 2.5) {
        const d = Math.hypot(rx, rz); if (d < bd) { bd = d; best = k; }
      }
    }
    return best;
  }
  function interact(p) {
    const k = find(p); if (!k) return null;
    const n = NAME[k.kind] || '車';
    return { label: () => k.src === 'parked' ? `🚗 上返架${n}揸` : k.src === 'static' ? `🚗 揸走呢架${n}` : `🦹 打劫${n}（叫司機落車，搶佢架車）`, act: () => jack(k, p) };
  }

  // ---------- 搶車 ----------
  function jack(k, p) {
    const o = k.o, pos = o.position.clone(), yaw = o.rotation.y;
    let model;
    // 上返自己泊低咗嘅車
    if (k.src === 'parked') {
      parked.splice(parked.indexOf(k.pk), 1);
      cur = { kind: k.pk.kind, model: o, src: k.pk.src, police: k.pk.src === 'police', st: k.pk.st, t: 0 };
      api.teleport(pos.x, 0.05, pos.z); api.face(yaw); api.sfx.door();
      api.toast(`🚗 上返架${NAME[k.kind] || '車'}`); return;
    }
    if (k.src === 'static') {
      model = buildTransitModel(k.kind); o.visible = false; k.st.taken = true;
      if (k.st.col) { k.st.y1 = k.st.col.max[1]; k.st.col.max[1] = -100; }   // 收埋原本位置嘅碰撞箱
      model.position.copy(pos); model.position.y = 0; model.rotation.set(0, yaw, 0); scene.add(model);
      cur = { kind: k.kind, model, src: 'static', st: k.st, police: false, t: 0 };
      api.teleport(pos.x, 0.05, pos.z); api.face(yaw); api.sfx.door(); api.sfx.horn?.();
      api.toast(`🚗 你揸走咗架${NAME[k.kind] || '車'}！
撳「🚪 落車」就落；泊低 60 秒冇人揸就會自己返去站頭`, 4500);
      api.say(`You are driving the ${({ taxi: 'taxi', minibus: 'minibus', bus: 'double-decker bus' })[k.kind] || 'car'}. Drive carefully!`, `你揸緊${NAME[k.kind] || '車'}，小心揸呀！`, { force: true, now: true });
      return;
    }
    if (k.src === 'traffic') {
      const col = '#' + (o.children[0]?.material?.color?.getHexString() || 'eceff1');
      model = buildCarOf(k.kind, col); k.c.alive = false; k.c.m.visible = false;
    } else if (k.src === 'fire') { model = buildFireTruck(); events.steal(o); }
    else { model = buildPoliceCar(); events.steal(o); }
    model.position.copy(pos); model.position.y = 0; model.rotation.set(0, yaw, 0); scene.add(model);
    cur = { kind: k.kind, model, src: k.src, police: k.src === 'police', t: 0 };
    // 司機舉高手落車，之後走佬
    const d = buildAvatar({ gender: Math.random() < 0.5 ? 'm' : 'f', skin: '#e0ac69', shirt: k.src === 'police' ? '#1a237e' : k.src === 'fire' ? '#3e2723' : ['#e53935', '#43a047', '#1e88e5', '#fb8c00'][Math.floor(Math.random() * 4)], pants: '#263238', hair: '#1b1b1b', hat: k.src === 'police' ? 'cap' : k.src === 'fire' ? 'gold' : 'beanie' });
    const sx = Math.cos(yaw), sz = -Math.sin(yaw);   // 車身右手邊
    d.position.set(pos.x + sx * 2.2, 0, pos.z + sz * 2.2); d.rotation.y = Math.atan2(sx, sz); scene.add(d);
    drivers.push({ a: d, t: 0, vx: sx * 6, vz: sz * 6 });
    api.teleport(pos.x, 0.05, pos.z); api.face(yaw);
    api.sfx.door(); api.sfx.horn?.();
    if (k.src === 'police') {
      api.toast('🚓 你搶咗警車！\n🚨 其他警察即刻揸警車追你，俾佢捉到要坐監，\n要答啱 3 條數學題同 2 條英文題先放你出嚟！', 6000);
      api.say('Oh no! You took a police car. The police are coming to catch you!', '弊！你搶咗警車，警察嚟捉你喇！', { force: true, now: true });
      startChase();
    } else {
      api.toast(`🦹 打劫！司機舉高手落咗車走佬，你搶咗佢架${NAME[k.kind] || '車'}！\n撳「🚪 落車」就落`, 4500);
      api.say(k.src === 'fire' ? 'You took the fire engine! Use it carefully.' : 'Get out of the car, please! Now the car is yours.', k.src === 'fire' ? '你搶咗消防車！小心揸呀。' : '司機落咗車，架車俾你揸喇！', { force: true, now: true });
    }
  }
  // 落車：架車泊喺度，60 秒冇再上車就消失（消防車 / 警車還返俾事件系統，站頭車返返站頭）
  function leave(silent) {
    if (!cur) return;
    const c = cur; cur = null;
    parked.push({ model: c.model, t: 60, src: c.src, kind: c.kind, st: c.st });
    const yaw = c.model.rotation.y, sx = Math.cos(yaw), sz = -Math.sin(yaw);
    api.teleport(c.model.position.x + sx * 2.4, 0.05, c.model.position.z + sz * 2.4);
    if (!silent) { api.sfx.door(); api.toast(`🚪 落咗${NAME[c.kind] || '車'}`); }
  }
  function release(pk) {
    scene.remove(pk.model);
    if (pk.src === 'static' && pk.st) { pk.st.taken = false; pk.st.o.visible = true; if (pk.st.col) pk.st.col.max[1] = pk.st.y1; }
    else if (pk.src === 'fire') events.giveBack(events.truck); else if (pk.src === 'police') events.giveBack(events.pcar);
  }

  // ---------- 警察追捕 ----------
  const copCar = buildPoliceCar(); copCar.visible = false; scene.add(copCar);
  const copMan = buildAvatar({ gender: 'm', skin: '#e0ac69', hat: 'cap', shirt: '#1a237e', pants: '#1a237e', hair: '#1b1b1b' }); copMan.visible = false; scene.add(copMan);
  function placeBehind(p, face, dist) {
    copCar.position.set(p.x - Math.sin(face) * dist, 0, p.z - Math.cos(face) * dist);
    copCar.rotation.y = face;
  }
  function startChase() {
    const p = api.pos();
    chase = { t: 0, sirenT: 0, caught: 0, speed: 0 };
    placeBehind(p, api.faceOf(), 70); copCar.visible = true;
  }
  function stepChase(dt, p, playerSpeed) {
    const C = chase; C.t += dt;
    const flash = Math.floor(C.t * 6) % 2; copCar.userData.lights[0].emissiveIntensity = flash ? 3 : 0.2; copCar.userData.lights[1].emissiveIntensity = flash ? 0.2 : 3;
    C.sirenT -= dt; if (C.sirenT <= 0) { C.sirenT = 1.2; api.sfx.siren(); }
    if (C.caught) {
      animateAvatar(copMan, 0, dt); C.caught -= dt;
      if (C.caught <= 0) { const why = '🚓 搶警車俾警察捉到'; endChase(); api.arrested(why); }
      return;
    }
    const dx = p.x - copCar.position.x, dz = p.z - copCar.position.z, d = Math.hypot(dx, dz);
    // 走得太遠（傳送咗）：警察喺你後面再出現
    if (d > 400) { placeBehind(p, api.faceOf(), 80); return; }
    // 警車慢慢加速，總係快過玩家少少，一定追得到
    const want = Math.max(16, playerSpeed + 6) * (C.t < 3 ? 0.6 : 1);
    C.speed += Math.max(-20 * dt, Math.min(10 * dt, want - C.speed));
    const step = Math.min(d, C.speed * dt);
    copCar.position.x += dx / (d || 1) * step; copCar.position.z += dz / (d || 1) * step;
    let dy = Math.atan2(dx, dz) - copCar.rotation.y; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); copCar.rotation.y += dy * Math.min(1, dt * 5);
    copCar.userData.wheels.forEach(w => w.rotation.x += C.speed * dt / 0.36);
    if (C.t > 2 && Math.floor(C.t) !== Math.floor(C.t - dt) && Math.floor(C.t) % 8 === 0) api.say('Police! Stop the car!', '警察！停車！', { force: true, gap: 6000 });
    if (d < 3.6 && Math.abs(p.y) < 3) {
      // 捉到！
      C.caught = 2.2; leave(true);
      copMan.visible = true; copMan.position.set(copCar.position.x + 1.5, 0, copCar.position.z); copMan.rotation.y = Math.atan2(p.x - copMan.position.x, p.z - copMan.position.z);
      api.sfx.alarm?.(1); api.toast('👮 警察：舉高雙手！你因為搶警車被捕！', 3000);
      api.say('Police! Hands up! You are under arrest.', '警察！舉高雙手！你被捕喇！', { force: true, now: true });
    }
  }
  function endChase() { chase = null; copCar.visible = false; copMan.visible = false; }

  // ---------- 每格更新 ----------
  const lastP = new V3(); let spd = 0;
  function update(dt, p, P) {
    if (cur) {
      const m = cur.model; cur.t += dt;
      const moved = Math.hypot(p.x - m.position.x, p.z - m.position.z);
      spd = spd * 0.8 + (moved / Math.max(dt, 1e-3)) * 0.2;
      m.position.set(p.x, Math.max(0, p.y - 0.05), p.z);
      let dy = P.face - m.rotation.y; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); m.rotation.y += dy * Math.min(1, dt * 10);
      m.userData.wheels?.forEach(w => w.rotation.x += moved / 0.4);
      if (m.userData.lights && (cur.src === 'police' || cur.src === 'fire')) { const f = Math.floor(cur.t * 6) % 2; m.userData.lights[0].emissiveIntensity = f ? 3 : 0.2; m.userData.lights[1].emissiveIntensity = f ? 0.2 : 3; }
    } else spd = Math.hypot(p.x - lastP.x, p.z - lastP.z) / Math.max(dt, 1e-3);
    lastP.copy(p);
    for (let i = parked.length - 1; i >= 0; i--) { parked[i].t -= dt; if (parked[i].t <= 0) { release(parked[i]); parked.splice(i, 1); } }
    for (let i = drivers.length - 1; i >= 0; i--) {
      const D = drivers[i]; D.t += dt;
      if (D.t < 1.2) { animateAvatar(D.a, 0, dt); D.a.userData.armL.rotation.x = D.a.userData.armR.rotation.x = -2.9; }
      else { D.a.position.x += D.vx * dt; D.a.position.z += D.vz * dt; animateAvatar(D.a, 1, dt, 1.4); }
      if (D.t > 7) { scene.remove(D.a); drivers.splice(i, 1); }
    }
    if (chase) stepChase(dt, p, Math.min(spd, 40));
  }
  // 坐監 / 傳送走：即刻落車，唔再追
  function reset() { if (cur) leave(true); if (chase) endChase(); }
  return { interact, update, leave, reset, addStatic, driving: () => cur, kindName: () => cur ? NAME[cur.kind] : '', chasing: () => !!chase };
}
