// 戰鬥機 / 直升機 / 超級戰鬥直升機嘅武器（純屬遊戲）：機炮子彈、掉炸彈、火箭（全部無限發）
// 炸彈 / 火箭炸中大廈 → 大廈起火 → 消防車趕嚟救（火同消防車數量有上限，費事手機卡）
import * as THREE from 'three';

const V3 = THREE.Vector3;

export function buildWeapons(scene, api) {
  // ---------- 子彈（曳光彈）----------
  const NB = 70, bullets = [];
  const bGeo = new THREE.BoxGeometry(0.12, 0.12, 2.2), bMat = new THREE.MeshBasicMaterial({ color: '#ffe082' });
  for (let i = 0; i < NB; i++) { const m = new THREE.Mesh(bGeo, bMat); m.visible = false; m.frustumCulled = false; scene.add(m); bullets.push({ m, vel: new V3(), life: 0 }); }
  // ---------- 炸彈 ----------
  const NBOMB = 14, bombs = [];
  const bombGeo = new THREE.CapsuleGeometry(0.32, 1.1, 4, 10); bombGeo.rotateX(Math.PI / 2);
  const bombMat = new THREE.MeshStandardMaterial({ color: '#37474f', metalness: 0.5, roughness: 0.4 });
  for (let i = 0; i < NBOMB; i++) { const m = new THREE.Mesh(bombGeo, bombMat); m.visible = false; scene.add(m); bombs.push({ m, vel: new V3(), life: 0 }); }
  // ---------- 火箭 ----------
  const NR = 16, rockets = [];
  const rGeo = new THREE.CylinderGeometry(0.1, 0.1, 1.4, 8); rGeo.rotateX(Math.PI / 2);
  const rMat = new THREE.MeshStandardMaterial({ color: '#eceff1', metalness: 0.4 }), rFlame = new THREE.MeshBasicMaterial({ color: '#ff9100' });
  for (let i = 0; i < NR; i++) {
    const m = new THREE.Mesh(rGeo, rMat); const f = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.8, 8), rFlame); f.rotation.x = -Math.PI / 2; f.position.z = -1.0; m.add(f);
    m.visible = false; scene.add(m); rockets.push({ m, vel: new V3(), life: 0 });
  }
  // ---------- 煙 / 火花粒子 ----------
  function particles(n, color, size, blending) {
    const geo = new THREE.BufferGeometry(), pos = new Float32Array(n * 3).fill(-1e5);
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const m = new THREE.Points(geo, new THREE.PointsMaterial({ color, size, transparent: true, opacity: 0.85, depthWrite: false, blending: blending || THREE.NormalBlending }));
    m.frustumCulled = false; scene.add(m);
    return { m, pos, vel: new Float32Array(n * 3), life: new Float32Array(n), n, i: 0 };
  }
  const trail = particles(260, '#cfd8dc', 1.6), spark = particles(260, '#ffb74d', 1.2, THREE.AdditiveBlending), fireball = particles(240, '#ff7a1a', 4.5, THREE.AdditiveBlending);
  trail.m.material.opacity = 0.5;
  function emit(P, x, y, z, vx, vy, vz, life) { const i = P.i++ % P.n; P.pos[i * 3] = x; P.pos[i * 3 + 1] = y; P.pos[i * 3 + 2] = z; P.vel[i * 3] = vx; P.vel[i * 3 + 1] = vy; P.vel[i * 3 + 2] = vz; P.life[i] = life; }
  function stepP(P, dt, grav) {
    let any = false;
    for (let i = 0; i < P.n; i++) {
      if (P.life[i] <= 0) { if (P.pos[i * 3 + 1] > -1e4) { P.pos[i * 3 + 1] = -1e5; any = true; } continue; }
      any = true; P.life[i] -= dt; P.vel[i * 3 + 1] -= grav * dt;
      P.pos[i * 3] += P.vel[i * 3] * dt; P.pos[i * 3 + 1] += P.vel[i * 3 + 1] * dt; P.pos[i * 3 + 2] += P.vel[i * 3 + 2] * dt;
    }
    if (any) P.m.geometry.attributes.position.needsUpdate = true;
  }
  const R = (a, b) => a + Math.random() * (b - a);

  // ---------- 爆炸 ----------
  const flashes = [];
  const flashGeo = new THREE.SphereGeometry(1, 14, 10);
  for (let i = 0; i < 8; i++) { const m = new THREE.Mesh(flashGeo, new THREE.MeshBasicMaterial({ color: '#ffcc80', transparent: true, opacity: 0, depthWrite: false })); m.visible = false; scene.add(m); flashes.push({ m, t: 0 }); }
  let flashI = 0, boomCd = 0;
  function explode(p, big = 1) {
    const f = flashes[flashI++ % flashes.length]; f.t = 0.55; f.big = big; f.m.position.copy(p); f.m.visible = true;
    for (let n = 0; n < 34 * big; n++) emit(fireball, p.x, p.y + 1, p.z, R(-9, 9) * big, R(3, 14) * big, R(-9, 9) * big, R(0.4, 0.9));
    for (let n = 0; n < 14; n++) emit(trail, p.x + R(-2, 2), p.y + 1, p.z + R(-2, 2), R(-2, 2), R(3, 7), R(-2, 2), R(1.5, 3));
    if (boomCd <= 0) { api.sfx.boom(); boomCd = 0.12; }
    api.shake?.(Math.min(1, 0.9 / Math.max(1, api.pos().distanceTo(p) / 60)));
    // 炸中大廈 → 起火
    const r = api.bombHit?.(p.x, p.z);
    if (r === 'fire') api.onFire?.();
    else if (r === 'full') api.onFull?.();
  }

  // ---------- 發射 ----------
  const tmpQ = new THREE.Quaternion(), tmpE = new THREE.Euler(), fwd = new V3(), tmp = new V3();
  // 飛機嘅方向（同模型一樣：rotation.set(-pitch, yaw, -roll, 'YXZ')）
  function frame(F) { tmpE.set(-F.pitch, F.yaw, -F.roll, 'YXZ'); tmpQ.setFromEuler(tmpE); fwd.set(0, 0, 1).applyQuaternion(tmpQ); return tmpQ; }
  const worldOf = (F, local) => tmp.copy(local).applyQuaternion(tmpQ).add(F.pos);
  let gunT = 0, bombT = 0, rocketT = 0, rocketSide = 1, bI = 0, bombI = 0, rI = 0;
  function fireGun(F) {
    frame(F);
    const muzzle = F.model.userData.gun || new V3(0, F.kind === 'fighter' ? 1.9 : 1.0, F.kind === 'fighter' ? 9.8 : 2.2);
    for (const side of F.kind === 'fighter' ? [-0.9, 0.9] : [0]) {
      const b = bullets[bI++ % NB];
      const o = worldOf(F, tmp.set(muzzle.x + side, muzzle.y, muzzle.z)).clone();
      b.m.position.copy(o); b.vel.copy(fwd).multiplyScalar(420).add(F.vel || tmp.set(0, 0, 0));
      b.vel.x += R(-6, 6); b.vel.y += R(-6, 6); b.vel.z += R(-6, 6);
      b.m.quaternion.copy(tmpQ); b.m.visible = true; b.life = 1.4;
      emit(spark, o.x, o.y, o.z, fwd.x * 8 + R(-2, 2), fwd.y * 8 + R(-2, 2), fwd.z * 8 + R(-2, 2), 0.1);
    }
    api.sfx.gun?.();
  }
  function dropBomb(F) {
    frame(F);
    const b = bombs[bombI++ % NBOMB];
    const o = worldOf(F, tmp.set((bombI % 2 ? -1 : 1) * 0.8, F.kind === 'fighter' ? 1.2 : 0.6, 0));
    b.m.position.copy(o); b.vel.copy(F.vel || tmp.set(0, 0, 0)); b.vel.y = Math.min(b.vel.y, 0) - 2;
    b.m.rotation.set(0, F.yaw, 0); b.m.visible = true; b.life = 30;
    api.sfx.whoosh?.();
  }
  function fireRocket(F) {
    frame(F);
    const pods = F.model.userData.pods || [new V3(-1.6, 1.4, 1.6), new V3(1.6, 1.4, 1.6)];
    rocketSide = -rocketSide; const pod = pods[rocketSide < 0 ? 0 : pods.length - 1];
    const r = rockets[rI++ % NR];
    const o = worldOf(F, pod);
    r.m.position.copy(o);
    // 直升機機頭向前低少少：火箭向前之餘再向下少少，方便打地面
    r.vel.copy(fwd).multiplyScalar(170); r.vel.y -= 14; r.vel.add(F.vel || tmp.set(0, 0, 0));
    r.m.quaternion.setFromUnitVectors(new V3(0, 0, 1), tmp.copy(r.vel).normalize()); r.m.visible = true; r.life = 6;
    api.sfx.jet?.();
  }

  // ---------- 每幀 ----------
  function update(dt, F, input) {
    boomCd -= dt;
    if (F) {
      gunT -= dt; bombT -= dt; rocketT -= dt;
      if (input.gun && gunT <= 0) { gunT = 0.09; fireGun(F); }
      if (input.bomb && bombT <= 0) { bombT = 0.45; dropBomb(F); }
      if (input.rocket && rocketT <= 0 && F.kind === 'apache') { rocketT = 0.22; fireRocket(F); }
    }
    for (const b of bullets) {
      if (b.life <= 0) continue;
      b.life -= dt; const p = b.m.position; p.addScaledVector(b.vel, dt);
      const c = p.y <= 0.05 ? true : api.hit(p);
      if (c || b.life <= 0) {
        if (c) for (let n = 0; n < 5; n++) emit(spark, p.x, Math.max(0.1, p.y), p.z, R(-4, 4), R(1, 6), R(-4, 4), 0.35);
        b.life = 0; b.m.visible = false;
      }
    }
    for (const b of bombs) {
      if (b.life <= 0) continue;
      b.life -= dt; b.vel.y -= 9.8 * dt; const p = b.m.position; p.addScaledVector(b.vel, dt);
      b.m.rotation.x = Math.min(1.4, b.m.rotation.x + dt * 0.8);   // 頭向下
      const c = api.hit(p);
      if (p.y <= 0.3 || c) { b.life = 0; b.m.visible = false; p.y = Math.max(0, c && c.max ? Math.min(p.y, c.max[1]) : 0); explode(p.clone(), 1.2); }
      else if (b.life <= 0) b.m.visible = false;
    }
    for (const r of rockets) {
      if (r.life <= 0) continue;
      r.life -= dt; r.vel.y -= 2 * dt; const p = r.m.position; p.addScaledVector(r.vel, dt);
      if (Math.random() < 0.8) emit(trail, p.x, p.y, p.z, R(-0.4, 0.4), R(0.2, 1), R(-0.4, 0.4), R(0.6, 1.2));
      const c = api.hit(p);
      if (p.y <= 0.3 || c) { r.life = 0; r.m.visible = false; p.y = Math.max(0, p.y); explode(p.clone(), 1); }
      else if (r.life <= 0) r.m.visible = false;
    }
    for (const f of flashes) {
      if (!f.m.visible) continue;
      f.t -= dt; const k = 1 - f.t / 0.55;
      f.m.scale.setScalar((2 + k * 9) * (f.big || 1)); f.m.material.opacity = Math.max(0, 0.9 * (1 - k));
      if (f.t <= 0) f.m.visible = false;
    }
    stepP(trail, dt, -0.6); stepP(spark, dt, 9.8); stepP(fireball, dt, -2);
  }
  const busy = () => bullets.some(b => b.life > 0) || bombs.some(b => b.life > 0) || rockets.some(r => r.life > 0);
  return { update, explode, busy };
}
