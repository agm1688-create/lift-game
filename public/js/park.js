// 超級遊樂園：雷霆過山車（雙迴環）、火箭直衝過山車（彈射 + 105 米高塔）、海盜船、
// 跳樓機、大擺錘、摩天輪、旋轉木馬、高空飛椅、彈弓。
// 所有機動遊戲用伺服器時間計，所以每個玩家見到嘅位置一樣；撳「搭」就會坐上座位。
import * as THREE from 'three';
import * as TX from './textures.js';

const V3 = THREE.Vector3;
const G = 9.81;
const std = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.55, ...extra });
const signMat = (text, bg, fg, w = 512, h = 128, font = 'bold 60px sans-serif') => new THREE.MeshBasicMaterial({ map: TX.signTex(text, bg, fg, w, h, font), side: THREE.DoubleSide });
const sstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const mkSeat = (parent, x, y, z, ry = 0) => { const s = new THREE.Object3D(); s.position.set(x, y, z); s.rotation.y = ry; parent.add(s); return s; };

export const PARK = { x0: -300, x1: -74, z0: -128, z1: 72, gate: [-76, 0] };

export function buildPark(scene, api) {
  const colliders = [], interactables = [], rides = [], updaters = [];
  const addCol = (x0, y0, z0, x1, y1, z1) => colliders.push({ min: [Math.min(x0, x1), Math.min(y0, y1), Math.min(z0, z1)], max: [Math.max(x0, x1), Math.max(y0, y1), Math.max(z0, z1)] });
  const mesh = (geo, mat, x, y, z, parent = scene) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); parent.add(m); return m; };
  const board = (name, x, z, exit) => ({ name, x, z, exit: exit || [x, z] });
  function addRide(r) {
    r.idx = rides.length; rides.push(r);
    interactables.push({ pos: new V3(r.board.x, 0, r.board.z), r: 3.2, label: () => `🎢 搭${r.name}`, act: () => api.boardRide(r.idx) });
    // 站牌
    const s = mesh(new THREE.PlaneGeometry(4.2, 1.1), signMat(r.name, r.color || '#c2185b', '#fff', 512, 128, 'bold 64px sans-serif'), r.board.x, 3.1, r.board.z);
    s.rotation.y = r.signRot ?? 0;
    mesh(new THREE.CylinderGeometry(0.08, 0.08, 2.6, 8), std('#555'), r.board.x, 1.3, r.board.z - 0.05 * Math.cos(s.rotation.y));
  }

  // ---------- 地面、圍欄、大門 ----------
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(PARK.x1 - PARK.x0, PARK.z1 - PARK.z0), std('#fff', { map: TX.tileTex((PARK.x1 - PARK.x0) / 3, (PARK.z1 - PARK.z0) / 3, '#e9c7a0', '#c79c70') }));
  ground.rotation.x = -Math.PI / 2; ground.position.set((PARK.x0 + PARK.x1) / 2, 0.006, (PARK.z0 + PARK.z1) / 2); ground.receiveShadow = true; scene.add(ground);
  const path = new THREE.Mesh(new THREE.PlaneGeometry(PARK.x1 - PARK.x0 + 4, 6), std('#d65a5a'));
  path.rotation.x = -Math.PI / 2; path.position.set((PARK.x0 + PARK.x1) / 2 + 2, 0.012, 0); scene.add(path);
  const fenceMat = std('#ffffff');
  const fence = (x0, z0, x1, z1) => { const l = Math.hypot(x1 - x0, z1 - z0); const m = mesh(new THREE.BoxGeometry(l, 1.1, 0.12), fenceMat, (x0 + x1) / 2, 0.55, (z0 + z1) / 2); m.rotation.y = -Math.atan2(z1 - z0, x1 - x0); addCol(x0 - 0.06, 0, z0 - 0.06, x1 + 0.06, 1.1, z1 + 0.06); };
  fence(PARK.x0, PARK.z0, PARK.x1, PARK.z0); fence(PARK.x0, PARK.z1, PARK.x1, PARK.z1); fence(PARK.x0, PARK.z0, PARK.x0, PARK.z1);
  fence(PARK.x1, PARK.z0, PARK.x1, -5); fence(PARK.x1, 5, PARK.x1, PARK.z1);
  // 大門拱
  const gx = PARK.x1;
  [-6, 6].forEach(z => { mesh(new THREE.CylinderGeometry(0.9, 1.1, 12, 16), std('#e53935'), gx, 6, z); addCol(gx - 1, 0, z - 1, gx + 1, 12, z + 1); mesh(new THREE.SphereGeometry(1.4, 16, 12), std('#ffd54f', { metalness: 0.5 }), gx, 12.8, z); });
  const arch = mesh(new THREE.TorusGeometry(6, 0.6, 10, 30, Math.PI), std('#ffd54f', { metalness: 0.4 }), gx, 11.5, 0); arch.rotation.y = Math.PI / 2;
  const gs = mesh(new THREE.PlaneGeometry(13, 2.6), signMat('🎢 超級遊樂園 SUPER PARK', '#6a1b9a', '#fff', 1024, 200, 'bold 90px sans-serif'), gx + 0.3, 9.4, 0); gs.rotation.y = Math.PI / 2;
  const gs2 = gs.clone(); gs2.position.x = gx - 0.3; gs2.rotation.y = -Math.PI / 2; scene.add(gs2);
  // 彩旗 + 燈泡柱
  for (let x = PARK.x1 - 10; x > PARK.x0; x -= 14) [-4, 4].forEach(z => {
    mesh(new THREE.CylinderGeometry(0.08, 0.1, 5, 6), std('#333'), x, 2.5, z);
    mesh(new THREE.SphereGeometry(0.3, 8, 6), new THREE.MeshBasicMaterial({ color: ['#ff5252', '#ffd740', '#69f0ae', '#40c4ff'][(Math.abs(x) + (z > 0 ? 1 : 0)) % 4] }), x, 5.1, z);
  });

  // ================= 過山車 =================
  function coaster(name, origin, pts, o) {
    const curve = new THREE.CatmullRomCurve3(pts.map(p => new V3(p[0] + origin[0], p[1], p[2] + origin[1])), true, 'centripetal');
    const L = curve.getLength(), n = Math.round(L / 0.5), step = L / n;
    const P = curve.getSpacedPoints(n); P.pop();
    const Tn = P.map((p, i) => P[(i + 1) % n].clone().sub(P[(i - 1 + n) % n]).normalize());
    // 旋轉最小化框架（迴環時會真係反轉）
    const U = new Array(n);
    U[0] = new V3(0, 1, 0).addScaledVector(Tn[0], -Tn[0].y).normalize();
    let closure = null;
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n, v1 = P[j].clone().sub(P[i]), c1 = v1.dot(v1);
      const rL = U[i].clone().addScaledVector(v1, -2 / c1 * v1.dot(U[i]));
      const tL = Tn[i].clone().addScaledVector(v1, -2 / c1 * v1.dot(Tn[i]));
      const v2 = Tn[j].clone().sub(tL), c2 = v2.dot(v2);
      const r1 = c2 < 1e-12 ? rL : rL.addScaledVector(v2, -2 / c2 * v2.dot(rL));
      if (j === 0) closure = r1.normalize(); else U[j] = r1.normalize();
    }
    const phi = Math.atan2(closure.clone().cross(U[0]).dot(Tn[0]), closure.dot(U[0]));
    for (let i = 0; i < n; i++) U[i].applyAxisAngle(Tn[i], phi * i / n);
    // 速度（能量守恆 + 拉鏈 / 彈射 / 煞車）
    let maxI = 0; P.forEach((p, i) => { if (p.y > P[maxI].y) maxI = i; });
    const v = new Float32Array(n + 1); v[0] = 2;
    let brakeV = 0;
    for (let i = 1; i <= n; i++) {
      const s = i * step, h0 = P[i - 1].y, h1 = P[i % n].y;
      if (s < o.stationLen) v[i] = Math.min(o.chainV || 6, v[i - 1] + 0.3);
      else if (o.chain && i <= maxI) v[i] = o.chainV;
      else if (o.launch && s < o.stationLen + o.launch.len) v[i] = Math.sqrt(v[i - 1] ** 2 + 2 * o.launch.a * step);
      else v[i] = Math.sqrt(Math.max(9, v[i - 1] ** 2 + 2 * G * (h0 - h1) - (o.fr ?? 0.25) * step));
      if (s > L - o.brakeLen) { if (!brakeV) brakeV = v[i - 1]; v[i] = Math.min(v[i], 2 + (brakeV - 2) * (L - s) / o.brakeLen); }
    }
    const S = Tn.map(() => new V3());
    // 彎位傾斜（按速度計：側向加速度愈大斜得愈多）
    const bank = U.map((u, i) => {
      if (u.y < 0.6) return u.clone();
      const a = Tn[(i + 8) % n], b = Tn[(i - 8 + n) % n];
      const d = a.clone().sub(b); d.y = 0; d.multiplyScalar(1 / (16 * step));
      const lat = d.multiplyScalar(Math.min(v[i] * v[i], 900) / G);
      if (lat.length() > 1.5) lat.setLength(1.5);
      const w = u.clone().add(lat); w.addScaledVector(Tn[i], -w.dot(Tn[i])); return w.normalize();
    });
    // 平滑
    for (let i = 0; i < n; i++) { const w = new V3(); for (let k = -6; k <= 6; k++) w.add(bank[(i + k + n) % n]); w.addScaledVector(Tn[i], -w.dot(Tn[i])); U[i] = w.normalize(); }
    S.forEach((sv, i) => sv.crossVectors(Tn[i], U[i]).normalize());
    const tArr = new Float32Array(n + 1);
    for (let i = 1; i <= n; i++) tArr[i] = tArr[i - 1] + step / Math.max(0.5, (v[i - 1] + v[i]) / 2);
    const runT = tArr[n], dwell = o.dwell ?? 8, cycle = runT + dwell;
    function sAt(t) {
      const tc = ((t % cycle) + cycle) % cycle;
      if (tc < dwell) return 0;
      const tau = tc - dwell; let lo = 0, hi = n;
      while (hi - lo > 1) { const m = (lo + hi) >> 1; if (tArr[m] <= tau) lo = m; else hi = m; }
      return (lo + (tau - tArr[lo]) / (tArr[hi] - tArr[lo])) * step;
    }
    const tmpT = new V3(), tmpU = new V3(), tmpS = new V3(), mat = new THREE.Matrix4();
    function frame(s, obj) {
      s = ((s % L) + L) % L; const f = s / step, i = Math.floor(f) % n, j = (i + 1) % n, a = f - Math.floor(f);
      obj.position.lerpVectors(P[i], P[j], a);
      tmpT.lerpVectors(Tn[i], Tn[j], a).normalize(); tmpU.lerpVectors(U[i], U[j], a); tmpU.addScaledVector(tmpT, -tmpU.dot(tmpT)).normalize();
      tmpS.crossVectors(tmpU, tmpT);
      mat.makeBasis(tmpS, tmpU, tmpT); obj.quaternion.setFromRotationMatrix(mat);
    }

    // 路軌
    const railMat = std(o.railColor, { metalness: 0.5, roughness: 0.35 }), spineMat = std(o.spineColor, { metalness: 0.4 });
    const sub = (fn) => { const pts2 = []; for (let i = 0; i < n; i += 2) pts2.push(fn(i)); return new THREE.CatmullRomCurve3(pts2, true); };
    const segs = Math.round(n / 2);
    [-0.55, 0.55].forEach(k => scene.add(new THREE.Mesh(new THREE.TubeGeometry(sub(i => P[i].clone().addScaledVector(S[i], k)), segs, 0.1, 6, true), railMat)));
    scene.add(new THREE.Mesh(new THREE.TubeGeometry(sub(i => P[i].clone().addScaledVector(U[i], -0.45)), segs, 0.24, 8, true), spineMat));
    const nt = Math.floor(n / 4), ties = new THREE.InstancedMesh(new THREE.BoxGeometry(1.3, 0.12, 0.22), spineMat, nt);
    const dummy = new THREE.Object3D();
    for (let k = 0; k < nt; k++) { frame(k * 4 * step, dummy); dummy.position.addScaledVector(dummy.up.clone().applyQuaternion(dummy.quaternion), -0.2); dummy.updateMatrix(); ties.setMatrixAt(k, dummy.matrix); }
    scene.add(ties);
    // 支柱
    const sup = [];
    for (let i = 0; i < n; i += 14) if (U[i].y > 0.5 && P[i].y > 2.5) sup.push(i);
    const cols = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.28, 0.35, 1, 8), std(o.supportColor || '#eceff1', { metalness: 0.3 }), sup.length);
    sup.forEach((i, k) => { const h = P[i].y - 0.6; dummy.position.set(P[i].x, h / 2, P[i].z); dummy.quaternion.identity(); dummy.scale.set(1, h, 1); dummy.updateMatrix(); cols.setMatrixAt(k, dummy.matrix); });
    dummy.scale.set(1, 1, 1); scene.add(cols);

    // 車卡
    const seats = [], cars = [];
    const bodyMat = std(o.carColor, { metalness: 0.3 }), seatMat = std('#222'), barMat = std('#ffd54f', { metalness: 0.6 });
    for (let k = 0; k < o.cars; k++) {
      const g = new THREE.Group(); scene.add(g);
      mesh(new THREE.BoxGeometry(1.9, 0.5, 2.3), bodyMat, 0, 0.45, 0, g);
      if (k === 0) mesh(new THREE.ConeGeometry(0.95, 1.2, 4, 1), bodyMat, 0, 0.45, 1.7, g).rotation.set(Math.PI / 2, Math.PI / 4, 0);
      [-0.5, 0.55].forEach(z => {
        mesh(new THREE.BoxGeometry(1.7, 0.75, 0.15), seatMat, 0, 0.95, z - 0.45, g);
        mesh(new THREE.BoxGeometry(1.6, 0.06, 0.06), barMat, 0, 1.15, z + 0.3, g);
        [-0.45, 0.45].forEach(x => seats.push(mkSeat(g, x, 0.25, z)));
      });
      [[-0.75, -0.8], [0.75, -0.8], [-0.75, 0.8], [0.75, 0.8]].forEach(([x, z]) => mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.2, 10), std('#555'), x, 0.05, z, g).rotation.z = Math.PI / 2);
      cars.push(g);
    }
    // 站台
    const st = new THREE.Object3D(); frame(-(o.cars * 2.6) / 2 + 1, st);
    const fw = new V3(0, 0, 1).applyQuaternion(st.quaternion); fw.y = 0; fw.normalize();
    const side = new V3(fw.z, 0, -fw.x);
    const pc = st.position.clone().addScaledVector(side, o.platformSide * 2.4); pc.y = 0;
    const plat = mesh(new THREE.BoxGeometry(3, 0.5, o.cars * 2.6 + 4), std('#90a4ae'), pc.x, 0.25, pc.z); plat.rotation.y = Math.atan2(fw.x, fw.z);
    const roof = mesh(new THREE.BoxGeometry(6, 0.3, o.cars * 2.6 + 5), std(o.carColor), st.position.x + side.x * o.platformSide * 1.2, 4.6, st.position.z + side.z * o.platformSide * 1.2); roof.rotation.y = plat.rotation.y;
    const bx = pc.clone().addScaledVector(side, o.platformSide * 2.5);
    const r = { name, color: o.carColor, board: board(name, bx.x, bx.z, [bx.x + side.x * o.platformSide * 2, bx.z + side.z * o.platformSide * 2]), seats, signRot: Math.atan2(side.x * o.platformSide, side.z * o.platformSide), thrill: true };
    r.update = t => { const s0 = sAt(t); cars.forEach((g, k) => frame(s0 - k * 2.6, g)); };
    r.info = `${Math.round(L)} 米長、最高 ${Math.round(P[maxI].y)} 米、最快 ${Math.round(Math.max(...v) * 3.6)} km/h`;
    addRide(r);
  }
  function loop(cx, z0, z1, R, dir, N = 12) {
    const out = [];
    for (let k = 0; k <= N; k++) { const th = k / N * Math.PI * 2; out.push([cx + dir * R * Math.sin(th), 2 + R * (1 - Math.cos(th)), z0 + (z1 - z0) * k / N]); }
    return out;
  }
  // 雷霆過山車：拉上 48 米、衝落、兩個 360° 迴環、駱駝峰
  coaster('雷霆過山車', [-205, -88], [
    [60, 2, 30], [40, 2, 30], [25, 3, 30], [0, 24, 30], [-22, 44, 30], [-30, 48, 30], [-38, 45, 30], [-50, 22, 29], [-60, 5, 26],
    ...loop(-74, 25, 20, 13, -1),
    [-92, 4, 18], [-104, 8, 9], [-107, 14, -5], [-98, 20, -17], [-82, 24, -24], [-64, 8, -27], [-48, 21, -29], [-32, 5, -30],
    ...loop(-14, -30, -25, 11, 1),
    [8, 4, -24], [28, 14, -20], [50, 10, -10], [64, 5, 6], [68, 3, 22],
  ], { stationLen: 18, chain: true, chainV: 4.5, brakeLen: 45, cars: 5, carColor: '#d32f2f', railColor: '#ff5252', spineColor: '#b71c1c', supportColor: '#e0e0e0', platformSide: 1, fr: 0.22 });
  // 火箭直衝過山車：2 秒內彈射到 190 km/h，衝上 105 米高塔再垂直衝落
  coaster('火箭直衝過山車', [-190, 47], [
    [85, 2, 8], [70, 2, 8], [50, 2, 8], [20, 2, 8], [0, 2, 8], [-12, 6, 8], [-20, 32, 8], [-22, 72, 8], [-25, 101, 8], [-30, 105, 8], [-35, 101, 8], [-38, 72, 8], [-40, 32, 8], [-48, 6, 8],
    [-62, 3, 8], [-78, 28, 8], [-94, 5, 8], [-104, 5, 2], [-106, 6, -3], [-98, 7, -8], [-72, 22, -8], [-48, 4, -8], [-22, 12, -8], [8, 3, -8], [40, 2, -8], [70, 2, -8], [86, 2, -8], [93, 2, 0],
  ], { stationLen: 16, launch: { len: 70, a: 20 }, chainV: 3, brakeLen: 70, cars: 4, carColor: '#1565c0', railColor: '#ffd600', spineColor: '#0d47a1', supportColor: '#cfd8dc', platformSide: 1, fr: 0.2, bank: 10, dwell: 7 });

  // ================= 海盜船 =================
  {
    const cx = -110, cz = -28, py = 17;
    const fr = std('#5d4037'), frame = std('#455a64', { metalness: 0.5 });
    [-1, 1].forEach(s => [-1, 1].forEach(e => { const leg = mesh(new THREE.CylinderGeometry(0.35, 0.45, 19, 10), frame, cx + e * 4.5, py / 2, cz + s * 4); leg.rotation.z = -e * 0.26; addCol(cx + e * 7.5 - 0.6, 0, cz + s * 4 - 0.6, cx + e * 7.5 + 0.6, 3, cz + s * 4 + 0.6); }));
    mesh(new THREE.CylinderGeometry(0.4, 0.4, 9, 12), frame, cx, py, cz).rotation.x = Math.PI / 2;
    const piv = new THREE.Group(); piv.position.set(cx, py, cz); scene.add(piv);
    [-1, 1].forEach(e => mesh(new THREE.BoxGeometry(0.25, 12, 0.25), frame, e * 2.5, -6, 0, piv).rotation.z = e * 0.4);
    const hull = new THREE.Group(); hull.position.y = -12.5; piv.add(hull);
    const hg = new THREE.CylinderGeometry(2.4, 2.4, 15, 20, 1, false, Math.PI / 2, Math.PI); hg.rotateZ(Math.PI / 2);
    const hm = mesh(hg, fr, 0, 0, 0, hull); hm.scale.set(1, 1, 1.2); hm.material.side = THREE.DoubleSide;
    mesh(new THREE.BoxGeometry(15, 0.2, 5.6), std('#8d6e63'), 0, 0, 0, hull);
    mesh(new THREE.ConeGeometry(1.2, 3, 4), fr, 8.6, 0.6, 0, hull).rotation.z = -Math.PI / 2;
    mesh(new THREE.ConeGeometry(1.2, 3, 4), fr, -8.6, 0.6, 0, hull).rotation.z = Math.PI / 2;
    const mast = mesh(new THREE.CylinderGeometry(0.15, 0.15, 6, 8), fr, 0, 3, 0, hull);
    mesh(new THREE.PlaneGeometry(4, 3), signMat('☠', '#111', '#fff', 256, 192, 'bold 150px sans-serif'), 0, 4, 0.2, hull);
    const seats = [];
    for (let i = -3; i <= 3; i++) { if (i === 0) continue; const x = i * 2; mesh(new THREE.BoxGeometry(0.5, 0.5, 4.4), std('#ffb300'), x + Math.sign(x) * 0.3, 0.35, 0, hull); [-1.4, -0.45, 0.45, 1.4].forEach(z => seats.push(mkSeat(hull, x, 0.1, z, x > 0 ? -Math.PI / 2 : Math.PI / 2))); }
    const r = { name: '海盜船', color: '#5d4037', board: board('海盜船', cx, cz + 9), seats, thrill: true, signRot: 0 };
    r.update = t => {
      const cyc = 70, tc = t % cyc;
      const A = 1.35 * (sstep(8, 30, tc) - sstep(50, 66, tc));
      piv.rotation.z = A * Math.sin(2 * Math.PI * t / 7.4);
    };
    r.info = '最高擺到 77°，差唔多企直';
    addRide(r);
  }

  // ================= 跳樓機 =================
  {
    const cx = -128, cz = 14, H = 110;
    mesh(new THREE.CylinderGeometry(1.4, 2, H, 16), std('#7e57c2', { metalness: 0.3 }), cx, H / 2, cz); addCol(cx - 2, 0, cz - 2, cx + 2, H, cz + 2);
    mesh(new THREE.ConeGeometry(2.2, 6, 16), std('#ffd54f', { metalness: 0.5 }), cx, H + 3, cz);
    for (let y = 10; y < H; y += 10) mesh(new THREE.TorusGeometry(1.6, 0.12, 6, 20), std('#fff'), cx, y, cz).rotation.x = Math.PI / 2;
    const ring = new THREE.Group(); ring.position.set(cx, 1.5, cz); scene.add(ring);
    mesh(new THREE.TorusGeometry(3.2, 0.5, 10, 28), std('#e91e63', { metalness: 0.4 }), 0, 0.6, 0, ring).rotation.x = Math.PI / 2;
    const seats = [];
    for (let k = 0; k < 12; k++) { const b = k / 12 * Math.PI * 2; const s = mkSeat(ring, Math.cos(b) * 3.4, 0, Math.sin(b) * 3.4, Math.PI / 2 - b); seats.push(s); mesh(new THREE.BoxGeometry(0.7, 1.3, 0.2), std('#212121'), 0, 0.9, -0.25, s); }
    const r = { name: '跳樓機', color: '#7e57c2', board: board('跳樓機', cx + 6, cz), seats, thrill: true, signRot: Math.PI / 2 };
    const top = 100, bot = 1.5, fallTo = 25, tf = Math.sqrt(2 * (top - fallTo) / G), vf = G * tf, dec = vf * vf / (2 * (fallTo - bot)), tb = vf / dec;
    r.update = t => {
      const tc = t % 45; let y;
      if (tc < 8) y = bot;
      else if (tc < 28) y = bot + (top - bot) * sstep(8, 28, tc);
      else if (tc < 33) y = top;
      else if (tc < 33 + tf) { const u = tc - 33; y = top - 0.5 * G * u * u; }
      else if (tc < 33 + tf + tb) { const u = tc - 33 - tf; y = fallTo - (vf * u - 0.5 * dec * u * u); }
      else y = bot;
      ring.position.y = y; ring.rotation.y = tc > 8 && tc < 28 ? (tc - 8) * 0.1 : (tc >= 28 ? 2 : 0);
    };
    r.info = '升上 100 米，再自由落體 75 米';
    addRide(r);
  }

  // ================= 大擺錘 =================
  {
    const cx = -158, cz = -28, py = 32, arm = 25;
    const fm = std('#00897b', { metalness: 0.4 });
    [-1, 1].forEach(s => [-1, 1].forEach(e => { const leg = mesh(new THREE.CylinderGeometry(0.5, 0.7, 34, 10), fm, cx + e * 4.5, py / 2, cz + s * 5); leg.rotation.x = s * 0.15; leg.rotation.z = -e * 0.25; addCol(cx + e * 8.6 - 0.8, 0, cz + s * 7.5 - 0.8, cx + e * 8.6 + 0.8, 3, cz + s * 7.5 + 0.8); }));
    mesh(new THREE.CylinderGeometry(0.6, 0.6, 3, 12), fm, cx, py, cz).rotation.z = Math.PI / 2;
    const piv = new THREE.Group(); piv.position.set(cx, py, cz); scene.add(piv);
    mesh(new THREE.BoxGeometry(0.9, arm, 0.9), std('#ffd54f', { metalness: 0.5 }), 0, -arm / 2, 0, piv);
    const disk = new THREE.Group(); disk.position.y = -arm; piv.add(disk);
    mesh(new THREE.CylinderGeometry(4.6, 4.6, 0.6, 32), std('#e53935', { metalness: 0.3 }), 0, 0, 0, disk);
    const seats = [];
    for (let k = 0; k < 24; k++) { const b = k / 24 * Math.PI * 2; const s = mkSeat(disk, Math.cos(b) * 4.2, 0.3, Math.sin(b) * 4.2, Math.PI / 2 - b); seats.push(s); mesh(new THREE.BoxGeometry(0.6, 1.2, 0.18), std('#212121'), 0, 0.85, -0.22, s); }
    const r = { name: '大擺錘', color: '#00897b', board: board('大擺錘', cx, cz + 11), seats, thrill: true, signRot: 0 };
    r.update = t => {
      const tc = t % 80, A = 2.0 * (sstep(8, 34, tc) - sstep(58, 74, tc));
      piv.rotation.x = A * Math.sin(2 * Math.PI * t / 9.6);
      disk.rotation.y = t * 0.9;
    };
    r.info = '擺到 115°，仲一路自轉';
    addRide(r);
  }

  // ================= 摩天輪 =================
  {
    const cx = -186, cz = 2, cy = 31, R = 26;
    const wm = std('#eeeeee', { metalness: 0.5 });
    [-1, 1].forEach(s => [-1, 1].forEach(e => { const leg = mesh(new THREE.CylinderGeometry(0.5, 0.7, 34, 10), wm, cx + e * 7, cy / 2, cz + s * 3); leg.rotation.z = -e * 0.42; addCol(cx + e * 14 - 0.8, 0, cz + s * 3 - 0.8, cx + e * 14 + 0.8, 3, cz + s * 3 + 0.8); }));
    const wheel = new THREE.Group(); wheel.position.set(cx, cy, cz); scene.add(wheel);
    [-1.2, 1.2].forEach(z => mesh(new THREE.TorusGeometry(R, 0.3, 8, 64), std('#e91e63'), 0, 0, z, wheel));
    for (let k = 0; k < 16; k++) { const sp = mesh(new THREE.BoxGeometry(0.15, R, 0.15), wm, 0, 0, 0, wheel); sp.rotation.z = k / 16 * Math.PI * 2; sp.position.set(-Math.sin(sp.rotation.z) * R / 2, Math.cos(sp.rotation.z) * R / 2, 0); }
    mesh(new THREE.CylinderGeometry(1.2, 1.2, 4, 16), std('#ffd54f', { metalness: 0.6 }), 0, 0, 0, wheel).rotation.x = Math.PI / 2;
    const cabs = [], seats = [];
    const cols = ['#ef5350', '#ffca28', '#66bb6a', '#42a5f5', '#ab47bc', '#ff7043', '#26c6da', '#ec407a'];
    for (let k = 0; k < 16; k++) {
      const c = new THREE.Group(); scene.add(c);
      mesh(new THREE.CylinderGeometry(1.3, 1.3, 2.2, 12, 1, true), new THREE.MeshStandardMaterial({ color: cols[k % 8], transparent: true, opacity: 0.55, side: THREE.DoubleSide }), 0, -1.6, 0, c);
      mesh(new THREE.CylinderGeometry(1.35, 1.35, 0.15, 12), std(cols[k % 8]), 0, -2.7, 0, c);
      mesh(new THREE.ConeGeometry(1.45, 0.7, 12), std(cols[k % 8]), 0, -0.2, 0, c);
      seats.push(mkSeat(c, 0, -2.85, 0.6, Math.PI), mkSeat(c, 0, -2.85, -0.6, 0));
      cabs.push({ c, a: k / 16 * Math.PI * 2 });
    }
    const r = { name: '摩天輪', color: '#e91e63', board: board('摩天輪', cx, cz + 7), seats, thrill: false, signRot: 0 };
    r.update = t => {
      const a0 = t * 2 * Math.PI / 160; wheel.rotation.z = a0;
      cabs.forEach(({ c, a }) => c.position.set(cx + Math.cos(a + a0) * R, cy + Math.sin(a + a0) * R, cz));
    };
    r.info = '最高 57 米，一圈約 2 分 40 秒';
    addRide(r);
  }

  // ================= 旋轉木馬 =================
  {
    const cx = -100, cz = 20;
    const base = new THREE.Group(); base.position.set(cx, 0, cz); scene.add(base);
    mesh(new THREE.CylinderGeometry(7.4, 7.6, 0.5, 40), std('#ffe082'), cx, 0.25, cz);
    addCol(cx - 1, 0, cz - 1, cx + 1, 5, cz + 1);
    mesh(new THREE.CylinderGeometry(0.8, 0.8, 5.5, 16), std('#ffd54f', { metalness: 0.6 }), 0, 3.2, 0, base);
    mesh(new THREE.ConeGeometry(8.2, 2.6, 24), std('#e91e63'), 0, 7, 0, base);
    mesh(new THREE.CylinderGeometry(8.2, 8.2, 0.8, 24, 1, true), std('#ffffff'), 0, 5.4, 0, base);
    const seats = [], horses = [];
    const horseMat = [std('#fafafa'), std('#ffcc80'), std('#90caf9'), std('#f48fb1')];
    [[5.6, 12], [3.6, 8]].forEach(([rr, cnt], ring) => {
      for (let k = 0; k < cnt; k++) {
        const b = k / cnt * Math.PI * 2 + ring * 0.3;
        const pole = mesh(new THREE.CylinderGeometry(0.05, 0.05, 5, 6), std('#ffd54f', { metalness: 0.7 }), Math.sin(b) * rr, 3, Math.cos(b) * rr, base);
        const h = new THREE.Group(); h.position.set(Math.sin(b) * rr, 1.2, Math.cos(b) * rr); h.rotation.y = b + Math.PI / 2; base.add(h);
        const hm = horseMat[(k + ring) % 4];
        mesh(new THREE.BoxGeometry(0.45, 0.55, 1.4), hm, 0, 0, 0, h);
        mesh(new THREE.BoxGeometry(0.3, 0.7, 0.35), hm, 0, 0.45, 0.65, h).rotation.x = -0.4;
        mesh(new THREE.BoxGeometry(0.28, 0.3, 0.5), hm, 0, 0.75, 0.9, h);
        [[-0.15, -0.5], [0.15, -0.5], [-0.15, 0.5], [0.15, 0.5]].forEach(([x, z]) => mesh(new THREE.BoxGeometry(0.1, 0.6, 0.1), hm, x, -0.5, z, h));
        mesh(new THREE.BoxGeometry(0.5, 0.08, 0.5), std('#c62828'), 0, 0.3, 0, h);
        seats.push(mkSeat(h, 0, -0.15, -0.05)); horses.push({ h, ph: k * 1.3 + ring });
      }
    });
    const r = { name: '旋轉木馬', color: '#ec407a', board: board('旋轉木馬', cx + 9, cz), seats, thrill: false, signRot: Math.PI / 2 };
    r.update = t => { base.rotation.y = t * 0.45; horses.forEach(({ h, ph }) => h.position.y = 1.25 + Math.sin(t * 2 + ph) * 0.35); };
    r.info = '慢慢轉，啱晒細路';
    addRide(r);
  }

  // ================= 高空飛椅 =================
  {
    const cx = -236, cz = 6, H = 75;
    mesh(new THREE.CylinderGeometry(1.1, 1.6, H, 16), std('#26a69a', { metalness: 0.4 }), cx, H / 2, cz); addCol(cx - 1.6, 0, cz - 1.6, cx + 1.6, H, cz + 1.6);
    const car = new THREE.Group(); car.position.set(cx, 8, cz); scene.add(car);
    mesh(new THREE.CylinderGeometry(7, 7, 0.8, 32), std('#ffca28', { metalness: 0.4 }), 0, 0, 0, car);
    mesh(new THREE.ConeGeometry(7.5, 2, 32), std('#ff7043'), 0, 1.4, 0, car);
    const seats = [], hangs = [];
    const chainMat = std('#bbb', { metalness: 0.8 });
    for (let k = 0; k < 16; k++) {
      const a = k / 16 * Math.PI * 2;
      const hg = new THREE.Group(); hg.rotation.order = 'YZX'; hg.position.set(Math.cos(a) * 6.5, -0.4, Math.sin(a) * 6.5); hg.rotation.y = -a; car.add(hg);
      mesh(new THREE.CylinderGeometry(0.02, 0.02, 6, 4), chainMat, -0.25, -3, 0, hg); mesh(new THREE.CylinderGeometry(0.02, 0.02, 6, 4), chainMat, 0.25, -3, 0, hg);
      mesh(new THREE.BoxGeometry(0.6, 0.12, 0.6), std('#1e88e5'), 0, -6, 0, hg); mesh(new THREE.BoxGeometry(0.6, 0.7, 0.1), std('#1e88e5'), 0, -5.7, -0.3, hg);
      seats.push(mkSeat(hg, 0, -6.45, 0)); hangs.push(hg);
    }
    const r = { name: '高空飛椅', color: '#26a69a', board: board('高空飛椅', cx + 9, cz + 4), seats, thrill: true, signRot: Math.PI / 2 };
    r.update = t => {
      const tc = t % 60, up = sstep(8, 20, tc) - sstep(45, 57, tc);
      car.position.y = 8 + 52 * up;
      const w = 1.25 * up;
      // 轉動角度 ≈ 1.25 × 有效旋轉時間（14–51 秒），純粹由時間計
      car.rotation.y = -1.25 * Math.min(37, Math.max(0, tc - 14));
      const phi = Math.atan(w * w * 9 / G);
      hangs.forEach(h => h.rotation.z = phi);
    };
    r.info = '升上 60 米再轉圈，飛出去好似雀仔';
    addRide(r);
  }

  // ================= 彈弓 =================
  {
    const cx = -268, cz = 6;
    const tm = std('#ff6f00', { metalness: 0.4 });
    [-11, 11].forEach(z => { const t = mesh(new THREE.CylinderGeometry(0.7, 1.1, 64, 12), tm, cx, 32, cz + z); t.rotation.x = z > 0 ? 0.08 : -0.08; addCol(cx - 1.2, 0, cz + z * 1.1 - 1.2, cx + 1.2, 64, cz + z * 1.1 + 1.2); mesh(new THREE.SphereGeometry(0.9, 12, 8), std('#fff'), cx, 64, cz + z * 0.82); });
    const ball = new THREE.Group(); ball.position.set(cx, 1.6, cz); scene.add(ball);
    mesh(new THREE.SphereGeometry(1.4, 20, 14), new THREE.MeshStandardMaterial({ color: '#80deea', transparent: true, opacity: 0.35, side: THREE.DoubleSide }), 0, 0, 0, ball);
    mesh(new THREE.TorusGeometry(1.4, 0.12, 8, 30), std('#ff6f00'), 0, 0, 0, ball);
    mesh(new THREE.BoxGeometry(1.6, 0.15, 0.8), std('#333'), 0, -0.6, 0, ball);
    const seats = [mkSeat(ball, -0.4, -0.95, 0), mkSeat(ball, 0.4, -0.95, 0)];
    const cableMat = new THREE.LineBasicMaterial({ color: '#222' });
    const cg = new THREE.BufferGeometry().setFromPoints([new V3(), new V3(), new V3()]); const cable = new THREE.Line(cg, cableMat); cable.frustumCulled = false; scene.add(cable);
    const r = { name: '彈弓', color: '#ff6f00', board: board('彈弓', cx + 6, cz), seats, thrill: true, signRot: Math.PI / 2 };
    r.update = t => {
      const tc = t % 32; let y, rot = 0;
      if (tc < 8) y = 1.6;
      else if (tc < 24) { const u = tc - 8; y = 38 - 36.4 * Math.exp(-0.25 * u) * Math.cos(1.6 * u); rot = 4 * (1 - Math.exp(-0.2 * u)) * Math.PI; }
      else { const u = Math.min(1, (tc - 24) / 6); const yEnd = 38 - 36.4 * Math.exp(-4) * Math.cos(25.6); y = yEnd + (1.6 - yEnd) * sstep(0, 1, u); rot = 4 * (1 - Math.exp(-3.2)) * Math.PI * (1 - u); }
      ball.position.y = y; ball.rotation.x = rot;
      const p = cg.attributes.position; p.setXYZ(0, cx, 64, cz - 9); p.setXYZ(1, cx, y + 1.4, cz); p.setXYZ(2, cx, 64, cz + 9); p.needsUpdate = true;
    };
    r.info = '一下彈上 60 米高，仲會翻跟斗';
    addRide(r);
  }

  function update(t) { for (const r of rides) r.update(t); }
  return { colliders, interactables, rides, update };
}
